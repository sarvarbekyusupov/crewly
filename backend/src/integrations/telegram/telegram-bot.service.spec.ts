import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('grammy', () => {
  const sendMessage = jest.fn().mockResolvedValue({});
  const setWebhook = jest.fn().mockResolvedValue({});
  const handleUpdate = jest.fn().mockResolvedValue({});
  const start = jest.fn().mockReturnValue(Promise.resolve());
  const command = jest.fn();
  const on = jest.fn();

  const Bot = jest.fn().mockImplementation(() => ({
    command,
    on,
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

describe('TelegramBotService', () => {
  let service: TelegramBotService;
  let configGet: jest.Mock;
  let db: any;

  beforeEach(async () => {
    // Reset bot singleton
    const grammy = require('grammy');
    grammy.__bot = null;

    configGet = jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    });

    db = { user: { findFirst: jest.fn(), update: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    service = module.get(TelegramBotService);
  });

  describe('onModuleInit', () => {
    it('registers command and message handlers in non-production', async () => {
      const { Bot } = require('grammy');
      const botInstance = Bot.mock.results[Bot.mock.results.length - 1]?.value;
      await service.onModuleInit();
      if (botInstance) {
        expect(botInstance.command).toHaveBeenCalledWith(
          'start',
          expect.any(Function),
        );
        expect(botInstance.on).toHaveBeenCalledWith(
          'message:text',
          expect.any(Function),
        );
        expect(botInstance.start).toHaveBeenCalled();
      }
    });

    it('sets webhook in production', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
        if (key === 'NODE_ENV') return 'production';
        if (key === 'TELEGRAM_WEBHOOK_URL')
          return 'https://prod.example.com/webhook';
        if (key === 'TELEGRAM_WEBHOOK_SECRET') return 'secret';
        return undefined;
      });
      const { __mockSetWebhook } = require('grammy');
      await service.onModuleInit();
      expect(__mockSetWebhook).toHaveBeenCalled();
    });
  });

  it('setMessageHandler stores the handler', () => {
    const handler = jest.fn();
    service.setMessageHandler(handler);
    expect((service as any).onMessage).toBe(handler);
  });

  it('handleUpdate delegates to bot', async () => {
    const { __mockHandleUpdate } = require('grammy');
    await service.handleUpdate({ update_id: 1 });
    expect(__mockHandleUpdate).toHaveBeenCalledWith({ update_id: 1 });
  });

  it('sendMessage calls bot API', async () => {
    const { __mockSendMessage } = require('grammy');
    await service.sendMessage(42, 'Hello');
    expect(__mockSendMessage).toHaveBeenCalledWith(42, 'Hello', {
      parse_mode: undefined,
      reply_markup: undefined,
    });
  });

  it('setWebhook calls bot API', async () => {
    const { __mockSetWebhook } = require('grammy');
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
