import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WebhooksController } from './webhooks.controller';
import { IdempotencyService } from '../common/services/idempotency.service';
import { ConversationsService } from '../modules/conversations/conversations.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymeWebhookService } from '../integrations/payme/payme-webhook.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let idempotency: { execute: jest.Mock };
  let configGet: jest.Mock;

  beforeEach(async () => {
    idempotency = {
      execute: jest.fn((_key, _ttl, fn) =>
        fn().then((value: unknown) => ({ cached: false, value })),
      ),
    };
    configGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: ConversationsService, useValue: {} },
        {
          provide: TelegramBotService,
          useValue: {
            setMessageHandler: jest.fn(),
            handleUpdate: jest.fn().mockResolvedValue(undefined),
            setWebhook: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: PaymeWebhookService, useValue: { handleRpc: jest.fn() } },
        { provide: IdempotencyService, useValue: idempotency },
        {
          provide: PrismaService,
          useValue: {
            outreachAttempt: { findFirst: jest.fn(), update: jest.fn() },
            application: { updateMany: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get(WebhooksController);
  });

  describe('handlePayment', () => {
    it('rejects when secret is not configured', async () => {
      configGet.mockReturnValue('');
      await expect(
        controller.handlePayment({ id: 'evt-1' }, 'sig'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects invalid signature', async () => {
      configGet.mockReturnValue('test-secret');
      const payload = { id: 'evt-1' };
      await expect(
        controller.handlePayment(payload, 'bad-signature'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('accepts valid signature and processes event', async () => {
      const secret = 'test-secret';
      configGet.mockReturnValue(secret);
      const payload = { id: 'evt-1', amount: 100 };
      const sig = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const result = await controller.handlePayment(payload, sig);
      expect(result).toEqual({ ok: true });
      expect(idempotency.execute).toHaveBeenCalledWith(
        'payment:evt-1',
        72,
        expect.any(Function),
      );
    });

    it('requires event id in payload', async () => {
      const secret = 'test-secret';
      configGet.mockReturnValue(secret);
      const payload = { amount: 100 };
      const sig = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      await expect(controller.handlePayment(payload, sig)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleTelegram', () => {
    it('requires update_id', async () => {
      configGet.mockReturnValue('');
      await expect(controller.handleTelegram({}, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('processes update when update_id present', async () => {
      configGet.mockReturnValue('');
      const result = await controller.handleTelegram({ update_id: 42 }, '');
      expect(result).toEqual({ ok: true });
      expect(idempotency.execute).toHaveBeenCalledWith(
        'telegram:42',
        48,
        expect.any(Function),
      );
    });

    it('rejects when secret header does not match configured secret', async () => {
      configGet.mockReturnValue('expected-secret');
      await expect(
        controller.handleTelegram({ update_id: 1 }, 'wrong-secret'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('passes when secret matches', async () => {
      configGet.mockReturnValue('my-secret');
      const result = await controller.handleTelegram(
        { update_id: 1 },
        'my-secret',
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('handleResend', () => {
    it('throws when missing type or email_id', async () => {
      configGet.mockReturnValue('');
      await expect(
        controller.handleResend({ type: 'email.opened' }, '', '', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes email.opened event', async () => {
      configGet.mockReturnValue('');
      const result = await controller.handleResend(
        { type: 'email.opened', data: { email_id: 'email-1' } },
        '',
        '',
        '',
      );
      expect(result).toEqual({ ok: true });
      expect(idempotency.execute).toHaveBeenCalledWith(
        'resend:email-1:email.opened',
        48,
        expect.any(Function),
      );
    });

    it('throws ForbiddenException when secret configured but svix headers missing', async () => {
      configGet.mockReturnValue('whsec_test-secret');
      await expect(
        controller.handleResend(
          { type: 'email.opened', data: { email_id: 'e-1' } },
          '',
          '',
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns ok when outreachAttempt not found', async () => {
      configGet.mockReturnValue('');
      const db = controller['db'] as any;
      db.outreachAttempt.findFirst.mockResolvedValue(null);

      const result = await controller.handleResend(
        { type: 'email.opened', data: { email_id: 'email-2' } },
        '',
        '',
        '',
      );
      expect(result).toEqual({ ok: true });
      expect(db.outreachAttempt.update).not.toHaveBeenCalled();
    });

    it('updates attempt and application on email.opened', async () => {
      configGet.mockReturnValue('');
      const db = controller['db'] as any;
      db.outreachAttempt.findFirst.mockResolvedValue({
        id: 'att-1',
        applicationId: 'app-1',
      });
      db.outreachAttempt.update.mockResolvedValue({});
      db.application.updateMany.mockResolvedValue({});

      await controller.handleResend(
        { type: 'email.opened', data: { email_id: 'email-3' } },
        '',
        '',
        '',
      );

      expect(db.outreachAttempt.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: { status: 'opened', openedAt: expect.any(Date) },
      });
      expect(db.application.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', status: 'outreach_sent' },
        data: { status: 'outreach_opened' },
      });
    });

    it('updates attempt and application on email.bounced', async () => {
      configGet.mockReturnValue('');
      const db = controller['db'] as any;
      db.outreachAttempt.findFirst.mockResolvedValue({
        id: 'att-2',
        applicationId: 'app-2',
      });
      db.outreachAttempt.update.mockResolvedValue({});
      db.application.updateMany.mockResolvedValue({});

      await controller.handleResend(
        { type: 'email.bounced', data: { email_id: 'email-4' } },
        '',
        '',
        '',
      );

      expect(db.outreachAttempt.update).toHaveBeenCalledWith({
        where: { id: 'att-2' },
        data: { status: 'rejected', errorCode: 'email.bounced' },
      });
      expect(db.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-2',
          status: { in: ['outreach_sent', 'outreach_opened'] },
        },
        data: { status: 'no_contact' },
      });
    });

    it('updates attempt and application on email.complained', async () => {
      configGet.mockReturnValue('');
      const db = controller['db'] as any;
      db.outreachAttempt.findFirst.mockResolvedValue({
        id: 'att-3',
        applicationId: 'app-3',
      });
      db.outreachAttempt.update.mockResolvedValue({});
      db.application.updateMany.mockResolvedValue({});

      await controller.handleResend(
        { type: 'email.complained', data: { email_id: 'email-5' } },
        '',
        '',
        '',
      );

      expect(db.outreachAttempt.update).toHaveBeenCalledWith({
        where: { id: 'att-3' },
        data: { status: 'rejected', errorCode: 'email.complained' },
      });
    });
  });
});
