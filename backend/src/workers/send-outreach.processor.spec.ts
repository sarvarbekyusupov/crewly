import { Test, TestingModule } from '@nestjs/testing';
import { SendOutreachProcessor } from './send-outreach.processor';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { EmailService } from '../integrations/email/email.service';
import { OutreachAgent } from '../modules/agents/outreach.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object) =>
  ({ data, opts: { attempts: 3 }, attemptsMade: 0 }) as any;

describe('SendOutreachProcessor', () => {
  let processor: SendOutreachProcessor;
  let db: any;
  let telegram: { sendMessage: jest.Mock };
  let email: { send: jest.Mock };
  let agent: { generatePersonalizedMessage: jest.Mock };

  const applicationId = 'app-1';

  beforeEach(async () => {
    db = {
      application: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      },
      message: { create: jest.fn().mockResolvedValue({}) },
      outreachAttempt: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
    };
    telegram = { sendMessage: jest.fn().mockResolvedValue({}) };
    email = { send: jest.fn().mockResolvedValue('resend-id-123') };
    agent = { generatePersonalizedMessage: jest.fn().mockResolvedValue('Hello candidate!') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendOutreachProcessor,
        { provide: PrismaService, useValue: db },
        { provide: TelegramBotService, useValue: telegram },
        { provide: EmailService, useValue: email },
        { provide: OutreachAgent, useValue: agent },
        { provide: HhClientService, useValue: { getPotentialResumes: jest.fn() } },
        { provide: HhNegotiationsService, useValue: { submitNegotiation: jest.fn() } },
      ],
    }).compile();

    processor = module.get(SendOutreachProcessor);
  });

  it('throws NonRetryableError when application not found', async () => {
    db.application.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ applicationId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('returns early when application is not in matched status', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'outreach_sent',
      candidateId: 'c1',
      candidate: {
        telegramUserId: null,
        email: 'a@test.com',
        fullName: 'Alice',
        currentPosition: 'Dev',
        skills: [],
      },
      job: { title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });

    await processor.handle(makeJob({ applicationId }));
    expect(db.conversation.create).not.toHaveBeenCalled();
  });

  it('marks no_contact when candidate has no contact channel', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        telegramUserId: null,
        email: null,
        fullName: 'Alice',
        currentPosition: 'Dev',
        skills: [],
      },
      job: { title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });

    await processor.handle(makeJob({ applicationId }));
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'no_contact' } }),
    );
  });

  it('sends via Telegram when candidate has telegramUserId', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        id: 'c1',
        telegramUserId: '123456',
        email: null,
        fullName: 'Alice',
        currentPosition: 'Dev',
        skills: ['TypeScript'],
      },
      job: {
        id: 'j1',
        title: 'Dev',
        companyId: 'co1',
        requiredSkills: ['TypeScript'],
      },
    });

    await processor.handle(makeJob({ applicationId }));

    expect(telegram.sendMessage).toHaveBeenCalledWith(
      123456,
      expect.any(String),
    );
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'outreach_sent' }),
      }),
    );
  });

  it('sends via email when candidate has no Telegram but has email', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        id: 'c1',
        telegramUserId: null,
        email: 'alice@test.com',
        fullName: 'Alice',
        currentPosition: 'Dev',
        skills: [],
      },
      job: { id: 'j1', title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });

    await processor.handle(makeJob({ applicationId }));

    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@test.com' }),
    );
  });

  it('returns early when conversation already exists', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        telegramUserId: '123',
        email: null,
        fullName: 'A',
        currentPosition: null,
        skills: [],
      },
      job: { title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });
    db.conversation.findFirst.mockResolvedValue({ id: 'existing-conv' });

    await processor.handle(makeJob({ applicationId }));
    expect(db.conversation.create).not.toHaveBeenCalled();
  });
});
