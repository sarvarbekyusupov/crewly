import { Test, TestingModule } from '@nestjs/testing';
import { SendOutreachProcessor } from './send-outreach.processor';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { EmailService } from '../integrations/email/email.service';
import { EskizService } from '../integrations/sms/eskiz.service';
import { OutreachAgent } from '../modules/agents/outreach.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';
import { NonRetryableError } from './errors';

const HH_APP = {
  id: 'app-1',
  status: 'matched',
  candidateId: 'c1',
  matchReasons: {},
  candidate: {
    id: 'c1',
    telegramUserId: null,
    email: null,
    externalId: 'ext-resume-42',
    fullName: 'Carol',
    currentPosition: 'Engineer',
    currentCompany: 'OldCo',
    skills: ['Java'],
    socialProof: null,
  },
  job: {
    id: 'j1',
    title: 'Java Dev',
    companyId: 'co1',
    requiredSkills: ['Java'],
    hhVacancyId: 'vac-777',
  },
};

const makeJob = (data: object) =>
  ({ data, opts: { attempts: 3 }, attemptsMade: 0 }) as any;

describe('SendOutreachProcessor', () => {
  let processor: SendOutreachProcessor;
  let db: any;
  let telegram: { sendMessage: jest.Mock };
  let email: { send: jest.Mock };
  let eskiz: { sendSms: jest.Mock };
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
    eskiz = { sendSms: jest.fn().mockResolvedValue(true) };
    agent = {
      generatePersonalizedMessage: jest
        .fn()
        .mockResolvedValue('Hello candidate!'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendOutreachProcessor,
        { provide: PrismaService, useValue: db },
        { provide: TelegramBotService, useValue: telegram },
        { provide: EmailService, useValue: email },
        { provide: EskizService, useValue: eskiz },
        { provide: OutreachAgent, useValue: agent },
        {
          provide: HhClientService,
          useValue: {
            getPotentialResumes: jest.fn(),
            checkSuitableResume: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: HhNegotiationsService,
          useValue: { inviteCandidate: jest.fn().mockResolvedValue('neg-001') },
        },
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

  it('sends via SMS when candidate has no Telegram or Email but has phone number', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        id: 'c1',
        telegramUserId: null,
        email: null,
        phone: '998901234567',
        fullName: 'Alice',
        currentPosition: 'Dev',
        skills: [],
      },
      job: { id: 'j1', title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });

    await processor.handle(makeJob({ applicationId }));

    expect(eskiz.sendSms).toHaveBeenCalledWith(
      '998901234567',
      expect.any(String),
    );
  });

  it('returns early when conversation already exists (P2002 unique constraint)', async () => {
    db.application.findUnique.mockResolvedValue({
      id: applicationId,
      status: 'matched',
      candidateId: 'c1',
      candidate: {
        id: 'c1',
        telegramUserId: '123',
        email: null,
        fullName: 'A',
        currentPosition: null,
        skills: [],
      },
      job: { id: 'j1', title: 'Dev', companyId: 'co1', requiredSkills: [] },
    });

    const p2002Error = new Error('Unique constraint failed') as any;
    p2002Error.code = 'P2002';
    db.conversation.create.mockRejectedValueOnce(p2002Error);

    await processor.handle(makeJob({ applicationId }));
    expect(db.conversation.create).toHaveBeenCalled();
  });

  describe('HH invite path', () => {
    it('invites candidate via HH when externalId and hhVacancyId are set', async () => {
      db.application.findUnique.mockResolvedValue(HH_APP);

      const module = await Test.createTestingModule({
        providers: [
          SendOutreachProcessor,
          { provide: PrismaService, useValue: db },
          { provide: TelegramBotService, useValue: telegram },
          { provide: EmailService, useValue: email },
          {
            provide: EskizService,
            useValue: { sendSms: jest.fn().mockResolvedValue(true) },
          },
          { provide: OutreachAgent, useValue: agent },
          {
            provide: HhClientService,
            useValue: {
              checkSuitableResume: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: HhNegotiationsService,
            useValue: {
              inviteCandidate: jest.fn().mockResolvedValue('neg-hh-1'),
            },
          },
        ],
      }).compile();

      const proc = module.get(SendOutreachProcessor);
      const hhNegotiations = module.get(HhNegotiationsService);

      await proc.handle(makeJob({ applicationId }));

      expect(hhNegotiations.inviteCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          vacancyId: 'vac-777',
          resumeId: 'ext-resume-42',
        }),
      );
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hhNegotiationId: 'neg-hh-1' }),
        }),
      );
    });

    it('skips invite when checkSuitableResume returns false', async () => {
      db.application.findUnique.mockResolvedValue(HH_APP);

      const module = await Test.createTestingModule({
        providers: [
          SendOutreachProcessor,
          { provide: PrismaService, useValue: db },
          { provide: TelegramBotService, useValue: telegram },
          { provide: EmailService, useValue: email },
          {
            provide: EskizService,
            useValue: { sendSms: jest.fn().mockResolvedValue(true) },
          },
          { provide: OutreachAgent, useValue: agent },
          {
            provide: HhClientService,
            useValue: {
              checkSuitableResume: jest.fn().mockResolvedValue(false),
            },
          },
          {
            provide: HhNegotiationsService,
            useValue: { inviteCandidate: jest.fn() },
          },
        ],
      }).compile();

      const proc = module.get(SendOutreachProcessor);
      const hhNeg = module.get(HhNegotiationsService);

      await proc.handle(makeJob({ applicationId }));

      expect(hhNeg.inviteCandidate).not.toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    it('discards job for NonRetryableError', () => {
      const job = {
        data: { applicationId },
        opts: { attempts: 3 },
        attemptsMade: 1,
        discard: jest.fn().mockReturnValue(Promise.resolve()),
      } as any;

      processor.onFailed(job, new NonRetryableError('bad'));

      expect(job.discard).toHaveBeenCalled();
    });

    it('marks no_contact when max attempts exceeded', async () => {
      const job = {
        data: { applicationId },
        opts: { attempts: 3 },
        attemptsMade: 3,
        discard: jest.fn(),
      } as any;

      await processor.onFailed(job, new Error('network'));

      expect(db.outreachAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ applicationId, status: 'sent' }),
          data: { status: 'failed' },
        }),
      );
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'no_contact' },
        }),
      );
    });
  });
});
