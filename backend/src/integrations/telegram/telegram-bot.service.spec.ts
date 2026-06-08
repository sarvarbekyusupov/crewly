import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { TelegramBotService } from './telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { QUEUES } from '../../workers/queue-names';
import * as grammyMock from 'grammy';
import * as openaiMock from 'openai';

jest.mock('grammy', () => {
  const sendMessage = jest.fn().mockResolvedValue({});
  const setWebhook = jest.fn().mockResolvedValue({});
  const handleUpdate = jest.fn().mockResolvedValue({});
  const start = jest.fn().mockReturnValue(Promise.resolve());
  const command = jest.fn();
  const on = jest.fn();
  const hears = jest.fn();

  const Bot = jest.fn().mockImplementation(() => ({
    command,
    on,
    hears,
    start,
    handleUpdate,
    api: { sendMessage, setWebhook },
  }));

  return {
    Bot,
    __mockSendMessage: sendMessage,
    __mockSetWebhook: setWebhook,
    __mockHandleUpdate: handleUpdate,
  };
});

jest.mock('openai', () => {
  const create = jest.fn().mockResolvedValue({ text: 'mock transcription' });
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: { create },
    },
  }));
  return {
    __esModule: true,
    default: MockOpenAI,
    OpenAI: MockOpenAI,
    toFile: jest.fn().mockResolvedValue({}),
    __mockCreateTranscription: create,
  };
});

describe('TelegramBotService', () => {
  let service: TelegramBotService;
  let configGet: jest.Mock;
  let db: any;
  let s3: any;
  let parseQueue: any;
  let screeningQueue: any;

  beforeEach(async () => {
    // Reset bot singleton
    (grammyMock as any).__bot = null;

    configGet = jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
      if (key === 'OPENAI_API_KEY') return 'openai-key';
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    });

    db = {
      user: { findFirst: jest.fn(), update: jest.fn() },
      job: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      candidate: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      application: { findUnique: jest.fn(), create: jest.fn() },
      conversation: { create: jest.fn(), findFirst: jest.fn() },
      screening: { create: jest.fn() },
    };

    s3 = { upload: jest.fn() };
    parseQueue = { add: jest.fn() };
    screeningQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: PrismaService, useValue: db },
        { provide: S3Service, useValue: s3 },
        {
          provide: getQueueToken(QUEUES.PARSE_CANDIDATE),
          useValue: parseQueue,
        },
        {
          provide: getQueueToken(QUEUES.ADVANCE_SCREENING),
          useValue: screeningQueue,
        },
      ],
    }).compile();

    service = module.get(TelegramBotService);
  });

  describe('onModuleInit', () => {
    it('registers command and message handlers in non-production', async () => {
      const { Bot } = grammyMock as any;
      const botInstance = Bot.mock.results[Bot.mock.results.length - 1]?.value;
      await service.onModuleInit();
      if (botInstance) {
        expect(botInstance.command).toHaveBeenCalledWith(
          'start',
          expect.any(Function),
        );
        expect(botInstance.on).toHaveBeenCalledWith(
          'message:document',
          expect.any(Function),
        );
        expect(botInstance.hears).toHaveBeenCalledWith(
          /^\/app_(.+)$/,
          expect.any(Function),
        );
        expect(botInstance.start).toHaveBeenCalled();
      }
    });

    it('sets webhook in production', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
        if (key === 'OPENAI_API_KEY') return 'openai-key';
        if (key === 'NODE_ENV') return 'production';
        if (key === 'TELEGRAM_WEBHOOK_URL')
          return 'https://prod.example.com/webhook';
        if (key === 'TELEGRAM_WEBHOOK_SECRET') return 'secret';
        return undefined;
      });
      const { __mockSetWebhook } = grammyMock as any;
      await service.onModuleInit();
      expect(__mockSetWebhook).toHaveBeenCalled();
    });
  });

  describe('transcribeAudio', () => {
    it('calls OpenAI audio transcriptions create', async () => {
      const { __mockCreateTranscription } = openaiMock as any;
      const text = await service.transcribeAudio(
        Buffer.from('hello'),
        'voice.ogg',
      );
      expect(text).toBe('mock transcription');
      expect(__mockCreateTranscription).toHaveBeenCalled();
    });
  });

  it('setMessageHandler stores the handler', () => {
    const handler = jest.fn();
    service.setMessageHandler(handler);
    expect((service as any).onMessage).toBe(handler);
  });

  it('handleUpdate delegates to bot', async () => {
    const { __mockHandleUpdate } = grammyMock as any;
    await service.handleUpdate({ update_id: 1 });
    expect(__mockHandleUpdate).toHaveBeenCalledWith({ update_id: 1 });
  });

  it('sendMessage calls bot API', async () => {
    const { __mockSendMessage } = grammyMock as any;
    await service.sendMessage(42, 'Hello');
    expect(__mockSendMessage).toHaveBeenCalledWith(42, 'Hello', {
      parse_mode: undefined,
      reply_markup: undefined,
    });
  });

  it('setWebhook calls bot API', async () => {
    const { __mockSetWebhook } = grammyMock as any;
    await service.setWebhook('https://example.com/webhook', 'secret');
    expect(__mockSetWebhook).toHaveBeenCalledWith(
      'https://example.com/webhook',
      { secret_token: 'secret' },
    );
  });

  describe('when bot not configured', () => {
    beforeEach(async () => {
      configGet.mockImplementation((key: string) =>
        key === 'TELEGRAM_BOT_TOKEN' ? '' : undefined,
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramBotService,
          { provide: ConfigService, useValue: { get: configGet } },
          { provide: PrismaService, useValue: db },
          { provide: S3Service, useValue: s3 },
          {
            provide: getQueueToken(QUEUES.PARSE_CANDIDATE),
            useValue: parseQueue,
          },
          {
            provide: getQueueToken(QUEUES.ADVANCE_SCREENING),
            useValue: screeningQueue,
          },
        ],
      }).compile();

      service = module.get(TelegramBotService);
    });

    it('sendMessage throws ServiceUnavailableException', async () => {
      await expect(service.sendMessage(1, 'hi')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('handleUpdate is noop', async () => {
      await expect(service.handleUpdate({})).resolves.toBeUndefined();
    });

    it('setWebhook is noop', async () => {
      await expect(
        service.setWebhook('url', 'secret'),
      ).resolves.toBeUndefined();
    });
  });
});
