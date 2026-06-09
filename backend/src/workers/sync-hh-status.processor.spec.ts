import { Test, TestingModule } from '@nestjs/testing';
import { SyncHhStatusProcessor } from './sync-hh-status.processor';
import { PrismaService } from '../prisma/prisma.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';

describe('SyncHhStatusProcessor', () => {
  let processor: SyncHhStatusProcessor;
  let db: any;
  let hhNeg: any;

  const mockJob = {} as any;

  beforeEach(async () => {
    db = {
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      job: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      candidate: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cand-new' }),
      },
    };

    hhNeg = {
      getEmployerNegotiationState: jest.fn().mockResolvedValue(null),
      getVacancyResponses: jest.fn().mockResolvedValue({ items: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncHhStatusProcessor,
        { provide: PrismaService, useValue: db },
        { provide: HhClientService, useValue: { getResume: jest.fn() } },
        { provide: HhNegotiationsService, useValue: hhNeg },
      ],
    }).compile();

    processor = module.get(SyncHhStatusProcessor);
  });

  it('does nothing when no employer applications or jobs', async () => {
    await processor.handle(mockJob);

    expect(hhNeg.getEmployerNegotiationState).not.toHaveBeenCalled();
    expect(hhNeg.getVacancyResponses).not.toHaveBeenCalled();
  });

  describe('syncEmployerNegotiations', () => {
    const makeApp = (overrides: object = {}) => ({
      id: 'app-1',
      hhNegotiationId: 'neg-1',
      status: 'outreach_sent',
      ...overrides,
    });

    it('maps HH state "invitation" → status "screening_passed"', async () => {
      db.application.findMany.mockResolvedValue([makeApp()]);
      hhNeg.getEmployerNegotiationState.mockResolvedValue('invitation');

      await processor.handle(mockJob);

      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'screening_passed' }),
        }),
      );
    });

    it('maps HH state "discard" → status "rejected"', async () => {
      db.application.findMany.mockResolvedValue([makeApp()]);
      hhNeg.getEmployerNegotiationState.mockResolvedValue('discard');

      await processor.handle(mockJob);

      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'rejected' }),
        }),
      );
    });

    it('does not update when status already matches', async () => {
      db.application.findMany.mockResolvedValue([
        makeApp({ status: 'screening_passed' }),
      ]);
      hhNeg.getEmployerNegotiationState.mockResolvedValue('invitation');

      await processor.handle(mockJob);

      expect(db.application.update).not.toHaveBeenCalled();
    });

    it('marks rejected on 404', async () => {
      db.application.findMany.mockResolvedValue([makeApp()]);
      hhNeg.getEmployerNegotiationState.mockRejectedValue(
        Object.assign(new Error('Not Found'), { response: { status: 404 } }),
      );

      await processor.handle(mockJob);

      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'rejected' }),
        }),
      );
    });
  });
});
