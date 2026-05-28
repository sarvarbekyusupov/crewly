import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { QUEUES } from '../../workers/queue-names';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let db: any;
  let telegram: { sendMessage: jest.Mock };
  let emitter: { emit: jest.Mock };
  let screeningQueue: { add: jest.Mock };

  beforeEach(async () => {
    db = {
      conversation: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      application: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      message: { create: jest.fn() },
      candidate: { update: jest.fn() },
      consentRecord: { create: jest.fn() },
      outreachAttempt: { updateMany: jest.fn() },
      screening: { create: jest.fn() },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    emitter = { emit: jest.fn() };
    screeningQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: db },
        { provide: TelegramBotService, useValue: telegram },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: getQueueToken(QUEUES.ADVANCE_SCREENING),
          useValue: screeningQueue,
        },
      ],
    }).compile();

    service = module.get(ConversationsService);
  });

  describe('findAll', () => {
    it('returns paginated conversations', async () => {
      const convs = [{ id: 'c-1' }];
      db.conversation.findMany.mockResolvedValue(convs);
      db.conversation.count.mockResolvedValue(1);

      const result = await service.findAll('co-1', undefined, 1, 20);
      expect(result).toEqual({ data: convs, total: 1, page: 1, limit: 20 });
    });

    it('filters by applicationId when provided', async () => {
      db.conversation.findMany.mockResolvedValue([]);
      await service.findAll('co-1', 'app-1');
      expect(db.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ applicationId: 'app-1' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns conversation when companyId matches', async () => {
      db.conversation.findUnique.mockResolvedValue({
        id: 'c-1',
        application: {
          id: 'a-1',
          companyId: 'co-1',
          status: 'screening',
          jobId: 'j-1',
        },
      });
      const result = await service.findOne('co-1', 'c-1');
      expect(result.id).toBe('c-1');
    });

    it('throws NotFoundException for wrong companyId', async () => {
      db.conversation.findUnique.mockResolvedValue({
        id: 'c-1',
        application: { companyId: 'co-other' },
      });
      await expect(service.findOne('co-1', 'c-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when not found', async () => {
      db.conversation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('co-1', 'c-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMessages', () => {
    it('returns conversation with messages', async () => {
      db.conversation.findUnique.mockResolvedValue({ id: 'c-1', messages: [] });
      await expect(service.getMessages('c-1')).resolves.toMatchObject({
        id: 'c-1',
      });
    });

    it('throws NotFoundException when conversation not found', async () => {
      db.conversation.findUnique.mockResolvedValue(null);
      await expect(service.getMessages('c-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isWithdrawal', () => {
    it('detects strong Russian withdrawal signal', () => {
      expect(service.isWithdrawal('Прошу удалите меня из базы')).toBe(true);
    });

    it('detects STOP word', () => {
      expect(service.isWithdrawal('stop')).toBe(true);
    });

    it('detects short "не интересует"', () => {
      expect(service.isWithdrawal('не интересует')).toBe(true);
    });

    it('returns false for normal message', () => {
      expect(
        service.isWithdrawal('Добрый день, расскажите подробнее о вакансии'),
      ).toBe(false);
    });
  });

  describe('handleIncomingMessage', () => {
    const opts = {
      channel: 'telegram',
      channelThreadId: '123',
      content: 'Привет',
    };

    it('returns null when no active conversation found', async () => {
      db.conversation.findFirst.mockResolvedValue(null);
      const result = await service.handleIncomingMessage(opts);
      expect(result).toBeNull();
    });

    it('handles withdrawal: marks abandoned + DNC', async () => {
      const conv = {
        id: 'c-1',
        applicationId: 'app-1',
        candidateId: 'cand-1',
        screenings: [],
      };
      db.conversation.findFirst.mockResolvedValue(conv);
      db.application.findUnique.mockResolvedValue({ companyId: 'co-1' });
      db.conversation.update.mockResolvedValue({});
      db.application.update.mockResolvedValue({});
      db.candidate.update.mockResolvedValue({});
      db.consentRecord.create.mockResolvedValue({});
      db.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.handleIncomingMessage({
        ...opts,
        content: 'stop',
      });
      expect(db.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'abandoned' }),
        }),
      );
      expect(result).toEqual(conv);
    });

    it('creates message + starts screening on first response', async () => {
      const conv = {
        id: 'c-1',
        applicationId: 'app-1',
        candidateId: 'cand-1',
        screenings: [],
      };
      db.conversation.findFirst.mockResolvedValue(conv);
      db.application.findUnique.mockResolvedValue({ companyId: 'co-1' });
      db.message.create.mockResolvedValue({});
      db.conversation.update.mockResolvedValue({});
      db.application.findUnique
        .mockResolvedValueOnce({ companyId: 'co-1' })
        .mockResolvedValueOnce({ status: 'outreach_sent' });
      db.application.update.mockResolvedValue({});
      db.outreachAttempt.updateMany.mockResolvedValue({});
      db.screening.create.mockResolvedValue({ id: 'scr-1' });

      await service.handleIncomingMessage(opts);

      expect(db.message.create).toHaveBeenCalled();
      expect(screeningQueue.add).toHaveBeenCalled();
    });

    it('advances existing in-progress screening', async () => {
      const conv = {
        id: 'c-1',
        applicationId: 'app-1',
        candidateId: 'cand-1',
        screenings: [{ id: 'scr-1', status: 'in_progress' }],
      };
      db.conversation.findFirst.mockResolvedValue(conv);
      db.application.findUnique.mockResolvedValue({ companyId: 'co-1' });
      db.message.create.mockResolvedValue({});
      db.conversation.update.mockResolvedValue({});
      db.application.findUnique
        .mockResolvedValueOnce({ companyId: 'co-1' })
        .mockResolvedValueOnce({ status: 'screening' });

      await service.handleIncomingMessage(opts);

      expect(screeningQueue.add).toHaveBeenCalledWith(
        { screeningId: 'scr-1' },
        expect.any(Object),
      );
    });
  });

  describe('sendRecruiterMessage', () => {
    it('sends Telegram message when channel is telegram', async () => {
      db.conversation.findUnique.mockResolvedValue({
        id: 'c-1',
        channel: 'telegram',
        channelThreadId: '42',
        application: { companyId: 'co-1' },
      });
      db.message.create.mockResolvedValue({ id: 'msg-1' });
      db.conversation.update.mockResolvedValue({});

      await service.sendRecruiterMessage('co-1', 'c-1', 'Hello candidate');

      expect(telegram.sendMessage).toHaveBeenCalledWith(42, 'Hello candidate');
    });

    it('skips Telegram when channel is not telegram', async () => {
      db.conversation.findUnique.mockResolvedValue({
        id: 'c-1',
        channel: 'email',
        channelThreadId: null,
        application: { companyId: 'co-1' },
      });
      db.message.create.mockResolvedValue({ id: 'msg-1' });
      db.conversation.update.mockResolvedValue({});

      await service.sendRecruiterMessage('co-1', 'c-1', 'Hi');
      expect(telegram.sendMessage).not.toHaveBeenCalled();
    });
  });
});
