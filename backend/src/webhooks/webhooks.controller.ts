import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  OnModuleInit,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { I18nService } from 'nestjs-i18n';
import { Public } from '../common/decorators/public.decorator';
import { IdempotencyService } from '../common/services/idempotency.service';
import { ConversationsService } from '../modules/conversations/conversations.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { PaymeWebhookService } from '../integrations/payme/payme-webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  HhWebhookService,
  HhWebhookPayload,
} from '../integrations/hh/hh-webhook.service';

@Controller('api/v1/webhooks')
export class WebhooksController implements OnModuleInit {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
    private readonly telegram: TelegramBotService,
    private readonly payme: PaymeWebhookService,
    private readonly idempotency: IdempotencyService,
    private readonly db: PrismaService,
    private readonly hhWebhook: HhWebhookService,
    private readonly i18n: I18nService,
  ) {}

  onModuleInit() {
    // Wire Telegram message handler to conversation service
    this.telegram.setMessageHandler(async (chatId, text, messageId) => {
      const conv = await this.conversations.handleIncomingMessage({
        channel: 'telegram',
        channelThreadId: chatId,
        content: text,
        channelMessageId: messageId,
      });

      if (!conv) {
        this.logger.debug({ chatId }, 'No active conversation for chat');
        return;
      }

      // Check for withdrawal
      if (this.conversations.isWithdrawal(text)) {
        await this.telegram.sendMessage(
          chatId,
          this.i18n.t('bot.withdrawal_confirmation', { lang: 'ru' }),
        );
      }
    });

    // In production, set webhook
    const env = this.config.get('NODE_ENV');
    if (env === 'production') {
      const publicUrl = this.config.get('PUBLIC_URL');
      const secret = this.config.get('TELEGRAM_WEBHOOK_SECRET') ?? '';
      this.telegram
        .setWebhook(`${publicUrl}/api/v1/webhooks/telegram`, secret)
        .catch((err) =>
          this.logger.error(err, 'Failed to set Telegram webhook'),
        );
    }
  }

  @Get('tma/pipeline')
  @Public()
  async getTmaPipeline(@Query('telegramId') telegramId: string) {
    if (!telegramId) {
      throw new BadRequestException('telegramId is required');
    }

    const user = await this.db.user.findFirst({
      where: { telegramChatId: telegramId, deletedAt: null },
      include: { company: true },
    });

    if (!user) {
      throw new ForbiddenException('Manager not registered or bound in My-HR');
    }

    const jobs = await this.db.job.findMany({
      where: { companyId: user.companyId, status: 'active', deletedAt: null },
      select: {
        id: true,
        title: true,
        applications: {
          select: {
            id: true,
            status: true,
            matchScore: true,
            matchRecommendation: true,
            candidate: {
              select: {
                id: true,
                fullName: true,
                yearsExperience: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return {
      manager: {
        fullName: user.fullName,
        companyName: user.company.name,
      },
      jobs,
    };
  }

  @Post('telegram')
  @Public()
  @HttpCode(200)
  async handleTelegram(
    @Body() update: { update_id?: number },
    @Headers('x-telegram-bot-api-secret-token') secret: string,
  ) {
    const expected = this.config.get('TELEGRAM_WEBHOOK_SECRET');
    if (expected) {
      const expectedBuf = Buffer.from(expected);
      const secretBuf = Buffer.from(secret ?? '');
      if (
        expectedBuf.length !== secretBuf.length ||
        !timingSafeEqual(expectedBuf, secretBuf)
      ) {
        throw new ForbiddenException();
      }
    }

    const updateId = update?.update_id;
    if (updateId == null) {
      throw new BadRequestException('Missing update_id');
    }

    const key = `telegram:${updateId}`;
    const { cached } = await this.idempotency.execute(key, 48, async () => {
      this.telegram.handleUpdate(update).catch((err) => {
        this.logger.error(err, 'Telegram webhook processing failed');
      });
      return { ok: true as const };
    });

    if (cached) {
      this.logger.debug({ updateId }, 'Duplicate Telegram webhook ignored');
    }

    return { ok: true };
  }

  @Post('payment')
  @Public()
  @HttpCode(200)
  async handlePayment(
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) {
      throw new ForbiddenException('Payment webhook is not configured');
    }

    const rawBody = JSON.stringify(payload);
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = (signature ?? '').replace(/^sha256=/, '');

    if (
      !provided ||
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const eventId =
      (typeof payload.id === 'string' && payload.id) ||
      (typeof payload.event_id === 'string' && payload.event_id) ||
      (typeof payload.invoice_id === 'string' && payload.invoice_id);

    if (!eventId) {
      throw new BadRequestException('Missing event id in payload');
    }

    const { cached } = await this.idempotency.execute(
      `payment:${eventId}`,
      72,
      async () => {
        this.logger.log({ eventId, payload }, 'Payment webhook processed');
        return { ok: true as const };
      },
    );

    if (cached) {
      this.logger.debug({ eventId }, 'Duplicate payment webhook ignored');
    }

    return { ok: true };
  }

  @Post('payme')
  @Public()
  @HttpCode(200)
  async handlePayme(
    @Body() payload: any,
    @Headers('authorization') auth: string,
  ) {
    const merchantKey = this.config.get<string>('PAYME_MERCHANT_KEY');
    if (!merchantKey) {
      throw new ForbiddenException('Payme not configured');
    }

    const expectedAuth = `Basic ${Buffer.from(`Paycom:${merchantKey}`).toString('base64')}`;
    const authBuf = Buffer.from(auth ?? '');
    const expectedBuf = Buffer.from(expectedAuth);
    const valid =
      authBuf.length === expectedBuf.length &&
      timingSafeEqual(authBuf, expectedBuf);
    if (!valid) {
      throw new ForbiddenException('Invalid credentials');
    }

    return this.payme.handleRpc(payload);
  }

  @Post('resend')
  @Public()
  @HttpCode(200)
  async handleResend(
    @Body() payload: Record<string, unknown>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (secret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new ForbiddenException('Missing Svix webhook headers');
      }

      // Svix signature verification: HMAC-SHA256 over "svix-id.svix-timestamp.rawBody"
      const rawBody = JSON.stringify(payload);
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
      const expected = createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');

      const provided = svixSignature
        .split(' ')
        .map((s) => s.replace(/^v1,/, ''));

      const isValid = provided.some((sig) => {
        if (sig.length !== expected.length) return false;
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      });

      if (!isValid)
        throw new ForbiddenException('Invalid Resend webhook signature');
    }

    const eventType = payload.type as string | undefined;
    const emailId = (payload.data as any)?.email_id as string | undefined;

    if (!eventType || !emailId) {
      throw new BadRequestException('Missing type or data.email_id');
    }

    await this.idempotency.execute(
      `resend:${emailId}:${eventType}`,
      48,
      async () => {
        const attempt = await this.db.outreachAttempt.findFirst({
          where: { resendEmailId: emailId },
          select: { id: true, applicationId: true },
        });

        if (!attempt) return { ok: true };

        if (eventType === 'email.opened') {
          await this.db.outreachAttempt.update({
            where: { id: attempt.id },
            data: { status: 'opened', openedAt: new Date() },
          });
          await this.db.application.updateMany({
            where: { id: attempt.applicationId, status: 'outreach_sent' },
            data: { status: 'outreach_opened' },
          });
          this.logger.log(
            { emailId, applicationId: attempt.applicationId },
            'Email opened',
          );
        } else if (
          eventType === 'email.bounced' ||
          eventType === 'email.complained'
        ) {
          await this.db.outreachAttempt.update({
            where: { id: attempt.id },
            data: { status: 'rejected', errorCode: eventType },
          });
          await this.db.application.updateMany({
            where: {
              id: attempt.applicationId,
              status: { in: ['outreach_sent', 'outreach_opened'] },
            },
            data: { status: 'no_contact' },
          });
          this.logger.log(
            { emailId, eventType, applicationId: attempt.applicationId },
            'Email bounced/complained',
          );
        }

        return { ok: true };
      },
    );

    return { ok: true };
  }

  @Post('hh')
  @Public()
  @HttpCode(200)
  async handleHh(
    @Body() payload: HhWebhookPayload,
    @Headers('authorization') auth: string,
  ) {
    const secret = this.config.get<string>('HH_WEBHOOK_SECRET');
    if (secret) {
      const expected = `Bearer ${secret}`;
      const authBuf = Buffer.from(auth ?? '');
      const expectedBuf = Buffer.from(expected);
      const valid =
        authBuf.length === expectedBuf.length &&
        timingSafeEqual(authBuf, expectedBuf);
      if (!valid) throw new ForbiddenException('Invalid HH webhook secret');
    }

    const eventId =
      payload.object_id ??
      payload.negotiation?.id ??
      `${payload.type}:${payload.created_at}`;

    await this.idempotency.execute(`hh:${eventId}`, 48, async () => {
      await this.hhWebhook.handleEvent(payload);
      return { ok: true as const };
    });

    return { ok: true };
  }
}
