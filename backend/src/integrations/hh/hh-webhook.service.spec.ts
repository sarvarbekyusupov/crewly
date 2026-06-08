import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HhWebhookService, HhWebhookPayload } from './hh-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HhClientService } from './hh-client.service';

describe('HhWebhookService', () => {
  let service: HhWebhookService;
  let db: any;
  let hhClient: any;

  const newNegPayload = (
    overrides: Partial<HhWebhookPayload> = {},
  ): HhWebhookPayload => ({
    type: 'NEW_NEGOTIATION',
    created_at: '2024-01-01T00:00:00+00:00',
    negotiation: { id: 'neg-1' },
    vacancy: { id: 'vac-1' },
    resume: { id: 'res-1' },
    ...overrides,
  });

  const statePayload = (
    overrides: Partial<HhWebhookPayload> = {},
  ): HhWebhookPayload => ({
    type: 'NEGOTIATION_STATE_CHANGE',
    created_at: '2024-01-01T00:00:00+00:00',
    negotiation: { id: 'neg-1' },
    state: { id: 'invitation', name: 'Приглашение' },
    ...overrides,
  });

  beforeEach(async () => {
    db = {
      application: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({ id: 'app-1' }),
      },
      seekerApplication: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      job: {
        findFirst: jest.fn(),
      },
      candidate: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    hhClient = {
      getResume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhWebhookService,
        { provide: PrismaService, useValue: db },
        { provide: HhClientService, useValue: hhClient },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(of({ data: { items: [] } })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'test',
                HH_USER_AGENT: 'crewly/1.0',
                HH_EMPLOYER_TOKEN: 'emp-token',
              };
              return map[key] ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get(HhWebhookService);
  });

  describe('handleEvent', () => {
    it('routes NEW_NEGOTIATION to handleNewNegotiation', async () => {
      db.application.findFirst.mockResolvedValue({ id: 'app-1' });
      await service.handleEvent(newNegPayload());
      expect(db.application.findFirst).toHaveBeenCalled();
    });

    it('routes NEGOTIATION_STATE_CHANGE to handleStateChange', async () => {
      db.application.findFirst.mockResolvedValue({
        id: 'app-1',
        status: 'applied',
      });
      await service.handleEvent(statePayload());
      expect(db.application.update).toHaveBeenCalled();
    });

    it('ignores unknown event types without throwing', async () => {
      await expect(
        service.handleEvent({ type: 'UNKNOWN_EVENT', created_at: '' }),
      ).resolves.not.toThrow();
    });
  });

  describe('handleNewNegotiation', () => {
    it('skips if negotiation already exists in db', async () => {
      db.application.findFirst.mockResolvedValue({ id: 'app-1' });

      await service.handleEvent(newNegPayload());

      expect(db.job.findFirst).not.toHaveBeenCalled();
    });

    it('skips if no matching job for vacancy', async () => {
      db.application.findFirst.mockResolvedValue(null);
      db.job.findFirst.mockResolvedValue(null);

      await service.handleEvent(newNegPayload());

      expect(db.candidate.findFirst).not.toHaveBeenCalled();
    });

    it('creates candidate when not found, then upserts application', async () => {
      db.application.findFirst.mockResolvedValue(null);
      db.job.findFirst.mockResolvedValue({ id: 'job-1', companyId: 'co-1' });
      db.candidate.findFirst.mockResolvedValue(null);
      hhClient.getResume.mockResolvedValue({
        first_name: 'Alice',
        last_name: 'Smith',
        title: 'Dev',
        skill_set: ['TypeScript'],
        total_experience: { months: 24 },
      });
      db.candidate.create.mockResolvedValue({ id: 'cand-new' });

      await service.handleEvent(newNegPayload());

      expect(db.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: 'res-1',
            fullName: 'Alice Smith',
          }),
        }),
      );
      expect(db.application.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            hhNegotiationId: 'neg-1',
            status: 'applied',
          }),
        }),
      );
    });

    it('reuses existing candidate, skips create', async () => {
      db.application.findFirst.mockResolvedValue(null);
      db.job.findFirst.mockResolvedValue({ id: 'job-1', companyId: 'co-1' });
      db.candidate.findFirst.mockResolvedValue({ id: 'cand-existing' });

      await service.handleEvent(newNegPayload());

      expect(hhClient.getResume).not.toHaveBeenCalled();
      expect(db.application.upsert).toHaveBeenCalled();
    });

    it('skips if resume fetch fails', async () => {
      db.application.findFirst.mockResolvedValue(null);
      db.job.findFirst.mockResolvedValue({ id: 'job-1', companyId: 'co-1' });
      db.candidate.findFirst.mockResolvedValue(null);
      hhClient.getResume.mockRejectedValue(new Error('403'));

      await service.handleEvent(newNegPayload());

      expect(db.application.upsert).not.toHaveBeenCalled();
    });

    it('skips when negotiationId missing from payload', async () => {
      await service.handleEvent(
        newNegPayload({ negotiation: undefined, object_id: undefined }),
      );
      expect(db.application.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('handleStateChange', () => {
    it('updates employer application status on known state', async () => {
      db.application.findFirst.mockResolvedValue({
        id: 'app-1',
        status: 'applied',
      });

      await service.handleEvent(
        statePayload({ state: { id: 'interview', name: 'Интервью' } }),
      );

      expect(db.application.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: { status: 'interviewed' },
      });
    });

    it('does not update employer app if status already matches', async () => {
      db.application.findFirst.mockResolvedValue({
        id: 'app-1',
        status: 'interviewed',
      });

      await service.handleEvent(
        statePayload({ state: { id: 'interview', name: 'Интервью' } }),
      );

      expect(db.application.update).not.toHaveBeenCalled();
    });

    it('falls through to seeker app when no employer app found', async () => {
      db.application.findFirst.mockResolvedValue(null);
      db.seekerApplication.findFirst.mockResolvedValue({
        id: 'sapp-1',
        status: 'applied',
      });

      await service.handleEvent(
        statePayload({ state: { id: 'invitation', name: 'Приглашение' } }),
      );

      expect(db.seekerApplication.update).toHaveBeenCalledWith({
        where: { id: 'sapp-1' },
        data: { status: 'interview' },
      });
    });

    it('skips update when state not in map', async () => {
      db.application.findFirst.mockResolvedValue({
        id: 'app-1',
        status: 'applied',
      });

      await service.handleEvent(
        statePayload({ state: { id: 'unknown_state', name: '?' } }),
      );

      expect(db.application.update).not.toHaveBeenCalled();
    });

    it('skips when negotiationId or stateId missing', async () => {
      await service.handleEvent(
        statePayload({ negotiation: undefined, object_id: undefined }),
      );
      expect(db.application.findFirst).not.toHaveBeenCalled();
    });
  });
});
