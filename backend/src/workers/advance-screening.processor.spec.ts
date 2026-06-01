import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdvanceScreeningProcessor } from './advance-screening.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningAgent } from '../modules/agents/screening.agent';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { EmailService } from '../integrations/email/email.service';
import { QUEUES } from './queue-names';

const makeJob = (data: object) => ({ data }) as any;

function makeScreening(overrides: Partial<any> = {}) {
  return {
    id: 'screening-1',
    status: 'in_progress',
    applicationId: 'app-1',
    conversationId: 'conv-1',
    promptVersion: 'v1',
    questionsAsked: 0,
    application: {
      job: {
        id: 'job-1',
        title: 'Dev',
        companyId: 'co1',
        createdByUserId: 'u1',
      },
      candidate: {
        fullName: 'Alice',
        skills: ['TypeScript'],
        yearsExperience: 5,
      },
    },
    conversation: {
      id: 'conv-1',
      channel: 'internal',
      channelThreadId: null,
      messages: [],
    },
    ...overrides,
  };
}

describe('AdvanceScreeningProcessor', () => {
  let processor: AdvanceScreeningProcessor;
  let db: any;
  let agent: { advance: jest.Mock };
  let emitter: { emit: jest.Mock };
  let dossierQueue: { add: jest.Mock };

  beforeEach(async () => {
    db = {
      screening: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      application: { update: jest.fn().mockResolvedValue({}) },
      message: { create: jest.fn().mockResolvedValue({}) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    agent = { advance: jest.fn() };
    emitter = { emit: jest.fn() };
    dossierQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvanceScreeningProcessor,
        { provide: PrismaService, useValue: db },
        { provide: ScreeningAgent, useValue: agent },
        { provide: TelegramBotService, useValue: { sendMessage: jest.fn() } },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: EmailService,
          useValue: { sendCandidateDelivered: jest.fn() },
        },
        {
          provide: getQueueToken(QUEUES.GENERATE_DOSSIER),
          useValue: dossierQueue,
        },
      ],
    }).compile();

    processor = module.get(AdvanceScreeningProcessor);
  });

  it('returns early when screening not found', async () => {
    db.screening.findUnique.mockResolvedValue(null);
    await processor.handle(makeJob({ screeningId: 'screening-1' }));
    expect(agent.advance).not.toHaveBeenCalled();
  });

  it('returns early when screening is not in_progress', async () => {
    db.screening.findUnique.mockResolvedValue(
      makeScreening({ status: 'completed' }),
    );
    await processor.handle(makeJob({ screeningId: 'screening-1' }));
    expect(agent.advance).not.toHaveBeenCalled();
  });

  it('marks screening failed when questionsAsked >= 8', async () => {
    db.screening.findUnique.mockResolvedValue(
      makeScreening({ questionsAsked: 8 }),
    );

    await processor.handle(makeJob({ screeningId: 'screening-1' }));

    expect(db.screening.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(agent.advance).not.toHaveBeenCalled();
  });

  it('completes screening with passed recommendation and enqueues dossier', async () => {
    db.screening.findUnique.mockResolvedValue(makeScreening());
    agent.advance.mockResolvedValue({
      action: 'complete',
      assessment: {
        technical_score: 8,
        overall_score: 8,
        recommendation: 'advance',
        strengths: ['TypeScript'],
        concerns: [],
        summary: 'Good candidate',
      },
    });

    await processor.handle(makeJob({ screeningId: 'screening-1' }));

    expect(db.screening.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'screened_pass' }),
      }),
    );
    expect(dossierQueue.add).toHaveBeenCalledWith(
      { screeningId: 'screening-1' },
      expect.any(Object),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'company.event',
      expect.objectContaining({ type: 'screening_complete' }),
    );
  });

  it('rejects candidate when recommendation is reject', async () => {
    db.screening.findUnique.mockResolvedValue(makeScreening());
    agent.advance.mockResolvedValue({
      action: 'complete',
      assessment: { recommendation: 'reject', overall_score: 3 },
    });

    await processor.handle(makeJob({ screeningId: 'screening-1' }));

    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'screened_fail' }),
      }),
    );
    expect(dossierQueue.add).not.toHaveBeenCalled();
  });

  it('sends next question when action is continue', async () => {
    db.screening.findUnique.mockResolvedValue(makeScreening());
    agent.advance.mockResolvedValue({
      action: 'continue',
      message: 'What is your experience with Node.js?',
    });

    await processor.handle(makeJob({ screeningId: 'screening-1' }));

    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'What is your experience with Node.js?',
        }),
      }),
    );
    expect(db.screening.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { questionsAsked: { increment: 1 } } }),
    );
  });
});
