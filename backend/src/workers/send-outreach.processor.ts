import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
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
    );

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
      resendEmailId = await this.email.send({
        to: app.candidate.email,
        subject: `Интересная вакансия: ${app.job.title}`,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
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
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(
      { applicationId: job.data.applicationId, error: err.message },
      'send-outreach failed',
    );
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
