import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutoApplyProcessor } from './auto-apply.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SeekerAgent } from '../modules/agents/seeker.agent';
import { LinkedInApplyService } from '../integrations/apply/linkedin-apply.service';
import { ApplyKitService } from '../integrations/apply/apply-kit.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { NonRetryableError } from './errors';

// Minimal Bull Job stub
function makeJob(payload: { seekerApplicationId: string }): any {
  return {
    data: payload,
    discard: jest.fn().mockResolvedValue(undefined),
  };
}

// Factory for a seekerApplication with nested candidate and discoveredJob
function makeSeekerApp(source: string) {
  return {
    id: 'app-1',
    status: 'queued',
    source,
    coverLetter: null,
    candidate: {
      id: 'cand-1',
      fullName: 'Alice',
      currentPosition: 'Engineer',
      skills: ['TypeScript'],
      yearsExperience: { toString: () => '3' },
      city: 'Tashkent',
      email: 'alice@test.com',
      phone: '+998901234567',
      agentSettings: null,
      socialProof: null,
    },
    discoveredJob: {
      id: 'djob-1',
      source,
      externalId: 'EXT-1',
      sourceUrl: 'https://hh.uz/vacancy/EXT-1',
      title: 'Senior Dev',
      company: 'Acme Corp',
      description: 'Build things',
      skills: ['TypeScript'],
    },
  };
}

describe('AutoApplyProcessor', () => {
  let processor: AutoApplyProcessor;
  let mockDb: {
    seekerApplication: {
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    seekerJobMatch: { findUnique: jest.Mock };
    candidate: { findUnique: jest.Mock };
    job: { findUnique: jest.Mock };
    application: { create: jest.Mock };
  };
  let mockAgent: { decideAndDraftApplication: jest.Mock };
  let mockApplyKit: { build: jest.Mock };
  let mockLinkedIn: { apply: jest.Mock };
  let mockTelegram: { sendMessage: jest.Mock };
  let mockEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      seekerApplication: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      seekerJobMatch: {
        findUnique: jest.fn().mockResolvedValue({ score: 0.85 }),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue({
          maxApplicationsPerDay: 10,
          telegramUserId: null,
        }),
      },
      job: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'job-1', companyId: 'co-1' }),
      },
      application: {
        create: jest.fn().mockResolvedValue({ id: 'new-app-1' }),
      },
    };

    mockAgent = {
      decideAndDraftApplication: jest.fn().mockResolvedValue({
        should_apply: true,
        cover_letter: 'Sample cover letter',
        reason: '',
      }),
    };

    mockApplyKit = {
      build: jest.fn().mockResolvedValue({
        coverLetter: 'Cover',
        tailoredCvText: 'CV',
        applyUrl: 'https://hh.uz/vacancy/EXT-1',
        instructions: '1. Click open.',
      }),
    };

    mockLinkedIn = {
      apply: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    };
    mockTelegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    mockEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoApplyProcessor,
        { provide: PrismaService, useValue: mockDb },
        { provide: SeekerAgent, useValue: mockAgent },
        { provide: LinkedInApplyService, useValue: mockLinkedIn },
        { provide: ApplyKitService, useValue: mockApplyKit },
        { provide: TelegramBotService, useValue: mockTelegram },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile();

    processor = module.get(AutoApplyProcessor);
  });

  describe('routing by source', () => {
    it('routes hh.ru to buildAndNotifyKit (status → assisted_ready)', async () => {
      const seekerApp = makeSeekerApp('hh.ru');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      const spy = jest
        .spyOn(processor as any, 'buildAndNotifyKit')
        .mockResolvedValue(undefined);

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(spy).toHaveBeenCalledWith(
        'app-1',
        seekerApp.candidate,
        seekerApp.discoveredJob,
      );
    });

    it('routes telegram_channel to buildAndNotifyKit', async () => {
      const seekerApp = makeSeekerApp('telegram_channel');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      const spy = jest
        .spyOn(processor as any, 'buildAndNotifyKit')
        .mockResolvedValue(undefined);

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(spy).toHaveBeenCalled();
    });

    it('routes crewly to applyNative — creates Application record', async () => {
      const seekerApp = makeSeekerApp('crewly');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(mockDb.job.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'EXT-1' } }),
      );
      expect(mockDb.application.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateId: 'cand-1',
            companyId: 'co-1',
            status: 'matched',
          }),
        }),
      );
      expect(mockDb.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'applied',
            applyMethod: 'native',
          }),
        }),
      );
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'application.created',
        expect.objectContaining({ applicationId: 'new-app-1' }),
      );
    });

    it('routes linkedin to applyLinkedIn', async () => {
      const seekerApp = makeSeekerApp('linkedin');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      const spy = jest
        .spyOn(processor as any, 'applyLinkedIn')
        .mockResolvedValue(undefined);

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('agent decision', () => {
    it('sets status skipped when agent says should_apply: false', async () => {
      const seekerApp = makeSeekerApp('hh.ru');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);
      mockAgent.decideAndDraftApplication.mockResolvedValue({
        should_apply: false,
        cover_letter: '',
        reason: 'Score too low',
      });

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(mockDb.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            error: 'Score too low',
          }),
        }),
      );
    });

    it('skips already-processed applications (not in queued state)', async () => {
      const seekerApp = { ...makeSeekerApp('hh.ru'), status: 'applied' };
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      await processor.handle(makeJob({ seekerApplicationId: 'app-1' }));

      expect(mockAgent.decideAndDraftApplication).not.toHaveBeenCalled();
    });
  });

  describe('applyNative()', () => {
    it('throws NonRetryableError when discoveredJob has no externalId', async () => {
      const seekerApp = makeSeekerApp('crewly');
      seekerApp.discoveredJob.externalId = null as any;
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);

      await expect(
        processor.handle(makeJob({ seekerApplicationId: 'app-1' })),
      ).rejects.toThrow(NonRetryableError);
    });

    it('throws NonRetryableError when Job not found', async () => {
      const seekerApp = makeSeekerApp('crewly');
      mockDb.seekerApplication.findUnique.mockResolvedValue(seekerApp);
      mockDb.job.findUnique.mockResolvedValue(null);

      await expect(
        processor.handle(makeJob({ seekerApplicationId: 'app-1' })),
      ).rejects.toThrow(NonRetryableError);
    });
  });

  describe('buildAndNotifyKit()', () => {
    it('sets status assisted_ready on successful kit build', async () => {
      await (processor as any).buildAndNotifyKit(
        'app-1',
        { id: 'cand-1' },
        { id: 'djob-1', title: 'Dev', company: 'Corp' },
      );

      expect(mockApplyKit.build).toHaveBeenCalledWith('cand-1', 'djob-1');
      expect(mockDb.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'assisted_ready' }),
        }),
      );
    });

    it('sets status assisted_required when kit build fails', async () => {
      mockApplyKit.build.mockRejectedValue(new Error('LLM timeout'));

      await (processor as any).buildAndNotifyKit(
        'app-1',
        { id: 'cand-1' },
        { id: 'djob-1', title: 'Dev', company: 'Corp' },
      );

      expect(mockDb.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'assisted_required',
            error: 'LLM timeout',
          }),
        }),
      );
    });
  });
});
