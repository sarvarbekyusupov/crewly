import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed, InjectQueue } from '@nestjs/bull';
import * as Sentry from '@sentry/nestjs';
import { Job, Queue } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { OutreachAgent } from '../modules/agents/outreach.agent';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { EmailService } from '../integrations/email/email.service';
import { EskizService } from '../integrations/sms/eskiz.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { QUEUES } from './queue-names';

interface SendOutreachPayload {
  applicationId: string;
}

@Processor(QUEUES.SEND_OUTREACH)
export class SendOutreachProcessor {
  private readonly logger = new Logger(SendOutreachProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: OutreachAgent,
    private readonly telegram: TelegramBotService,
    private readonly email: EmailService,
    private readonly eskiz: EskizService,
    private readonly hhNegotiations: HhNegotiationsService,
    private readonly hhClient: HhClientService,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  @Process('send')
  async handle(job: Job<SendOutreachPayload>) {
    const { applicationId } = job.data;

    const app = await this.db.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            telegramUserId: true,
            email: true,
            phone: true,
            currentPosition: true,
            currentCompany: true,
            skills: true,
            externalId: true,
            socialProof: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
            requiredSkills: true,
            hhVacancyId: true,
          },
        },
      },
    });

    if (!app)
      throw new NonRetryableError(`Application ${applicationId} not found`);
    if (!['matched', 'queued_outreach'].includes(app.status)) return;

    const hasTelegram = !!app.candidate.telegramUserId;
    const hasEmail = !!app.candidate.email;
    const hasHhInvite = !!app.candidate.externalId && !!app.job.hhVacancyId;
    const hasSms = !!app.candidate.phone;
    const channel = hasHhInvite
      ? 'hh'
      : hasTelegram
        ? 'telegram'
        : hasEmail
          ? 'email'
          : hasSms
            ? 'sms'
            : null;

    if (!channel) {
      this.logger.warn(
        { applicationId },
        'No contact channel available — marking as no_contact',
      );
      await this.db.application.update({
        where: { id: applicationId },
        data: { status: 'no_contact' },
      });
      return;
    }

    const existingAttempts = await this.db.outreachAttempt.count({
      where: { applicationId },
    });

    const channelThreadId =
      channel === 'telegram' && app.candidate.telegramUserId != null
        ? String(app.candidate.telegramUserId)
        : null;

    // Generate message BEFORE creating conversation so a LLM failure doesn't
    // leave an orphaned conversation that blocks all future retries via P2002.
    const message = await this.agent.generatePersonalizedMessage(
      {
        name: app.candidate.fullName ?? 'кандидат',
        currentPosition: app.candidate.currentPosition,
        skills: app.candidate.skills,
        socialProof: (app.candidate.socialProof ?? undefined) as
          | Record<string, unknown>
          | undefined,
      },
      {
        title: app.job.title,
        requiredSkills: app.job.requiredSkills,
      },
      (app.matchReasons ?? {}) as Record<string, unknown>,
      applicationId,
      app.job.companyId,
      app.job.id,
    );

    let conversation: Awaited<ReturnType<typeof this.db.conversation.create>>;
    try {
      conversation = await this.db.conversation.create({
        data: {
          applicationId,
          candidateId: app.candidate.id,
          channel,
          channelThreadId,
          state: 'initiated',
        },
      });
    } catch (err: any) {
      // P2002 = unique constraint violation → duplicate outreach already in flight
      if (err?.code === 'P2002') {
        this.logger.warn(
          { applicationId, channel },
          'Duplicate outreach detected — skipping',
        );
        return;
      }
      throw err;
    }

    await this.db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        sender: 'ai',
        content: message,
      },
    });

    let resendEmailId: string | null = null;

    if (channel === 'hh') {
      // Pre-check: skip invite if HH's algorithm says resume doesn't fit vacancy
      let suitable = true;
      try {
        suitable = await this.hhClient.checkSuitableResume(
          app.job.hhVacancyId!,
          app.candidate.externalId!,
        );
      } catch (err: any) {
        this.logger.warn(
          { applicationId, err: err.message },
          'checkSuitableResume failed — proceeding with invite',
        );
      }
      if (!suitable) {
        this.logger.warn(
          { applicationId, resumeId: app.candidate.externalId },
          'Resume not suitable per HH — skipping invite',
        );
        return;
      }
      const negotiationId = await this.hhNegotiations.inviteCandidate({
        vacancyId: app.job.hhVacancyId!,
        resumeId: app.candidate.externalId!,
        message,
      });
      await this.db.application.update({
        where: { id: applicationId },
        data: { hhNegotiationId: negotiationId },
      });
    } else if (channel === 'telegram') {
      await this.telegram.sendMessage(
        Number(app.candidate.telegramUserId),
        message,
      );
    } else if (channel === 'email' && app.candidate.email) {
      const safeMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
      resendEmailId = await this.email.send({
        to: app.candidate.email,
        subject: `Интересная вакансия: ${app.job.title}`,
        html: `<p>${safeMessage}</p>`,
      });
    } else if (channel === 'sms' && app.candidate.phone) {
      await this.eskiz.sendSms(app.candidate.phone, message);
    }

    await this.db.outreachAttempt.create({
      data: {
        applicationId,
        channel,
        attemptNumber: existingAttempts + 1,
        status: 'sent',
        resendEmailId,
      },
    });

    await this.db.application.update({
      where: { id: applicationId },
      data: { status: 'outreach_sent', outreachSentAt: new Date() },
    });

    this.logger.log({ applicationId, channel }, 'Outreach sent');

    if (channel === 'telegram' && app.candidate.phone) {
      await this.outreachQueue.add(
        'sms-fallback',
        { applicationId },
        { delay: 24 * 60 * 60 * 1000 }, // 24 hours delay
      );
    }
  }

  @Process('sms-fallback')
  async handleFallback(job: Job<SendOutreachPayload>) {
    const { applicationId } = job.data;
    const app = await this.db.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        job: true,
      },
    });

    if (!app || app.status !== 'outreach_sent') {
      // Candidate already responded or app status changed, skip fallback
      return;
    }

    const phone = app.candidate.phone;
    if (!phone) return;

    // Detect language preference or fall back to phone prefix
    const isUzbek = phone.startsWith('998') || phone.startsWith('+998');
    const smsMessage = isUzbek
      ? `Salom! Sizga "${app.job.title}" vakansiyasi taklif qilingan edi. Suhbatni boshlash: t.me/crewly_bot?start=job_${app.job.id}`
      : `Привет! Вам была предложена вакансия "${app.job.title}". Начать собеседование: t.me/crewly_bot?start=job_${app.job.id}`;

    this.logger.log(
      `Telegram outreach unread after 24h — sending Eskiz SMS fallback to ${phone}`,
    );
    await this.eskiz.sendSms(phone, smsMessage);

    // Save fallback outreach attempt
    await this.db.outreachAttempt.create({
      data: {
        applicationId,
        channel: 'sms',
        attemptNumber: 2,
        status: 'sent',
      },
    });
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(
      { applicationId: job.data.applicationId, error: err.message },
      'send-outreach failed',
    );
    Sentry.captureException(err, {
      extra: { applicationId: job.data.applicationId, jobId: job.id },
    });
    if (err instanceof NonRetryableError) {
      job.discard().catch(() => {});
      return;
    }
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await this.db.outreachAttempt
        .updateMany({
          where: { applicationId: job.data.applicationId, status: 'sent' },
          data: { status: 'failed' },
        })
        .catch(() => null);
      await this.db.application
        .update({
          where: { id: job.data.applicationId },
          data: { status: 'no_contact' },
        })
        .catch(() => null);
    }
  }
}
