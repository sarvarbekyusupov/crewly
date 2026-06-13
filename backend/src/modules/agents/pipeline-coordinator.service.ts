import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SourcingAgent } from './sourcing.agent';
import { SchedulingService } from '../scheduling/scheduling.service';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

function escapeMd(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

const DEFAULT_INTERVIEW_START_HOUR = 10;
const DEFAULT_INTERVIEW_DURATION_MINUTES = 60;
const DEFAULT_INTERVIEW_DAYS_AHEAD = 1;

@Injectable()
export class PipelineCoordinator {
  private readonly logger = new Logger(PipelineCoordinator.name);

  constructor(
    private readonly db: PrismaService,
    private readonly sourcingAgent: SourcingAgent,
    private readonly schedulingSvc: SchedulingService,
    private readonly telegram: TelegramBotService,
    @InjectQueue(QUEUES.MATCH_CANDIDATES) private readonly matchQueue: Queue,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  @OnEvent('job.created')
  async handleJobCreated(payload: { jobId: string; companyId: string }) {
    try {
      await this.matchQueue.add(
        'match',
        { jobId: payload.jobId },
        LLM_JOB_OPTIONS,
      );
      this.logger.log({ jobId: payload.jobId }, 'Match queued on job.created');
    } catch (err: any) {
      this.logger.error(
        { jobId: payload.jobId, err: err.message },
        'handleJobCreated failed',
      );
    }
  }

  @OnEvent('job.activated')
  async handleJobActivated(payload: { jobId: string; companyId: string }) {
    try {
      this.logger.log(
        `Job activated: ${payload.jobId} - Sourcing Hunter drafting strategy...`,
      );

      const job = await this.db.job.findUnique({
        where: { id: payload.jobId },
      });

      if (job) {
        const strategy = await this.sourcingAgent.draftSourcingStrategy(
          {
            title: job.title,
            description: job.description,
            requiredSkills: job.requiredSkills,
          },
          payload.companyId,
        );

        await this.db.job.update({
          where: { id: payload.jobId },
          data: { sourcingStrategy: strategy as any },
        });

        this.logger.log(
          `Strategic Sourcing memo generated for job ${payload.jobId}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        { jobId: payload.jobId, err: err.message },
        'handleJobActivated failed',
      );
    }
  }

  @OnEvent('application.created')
  async handleApplicationCreated(payload: {
    applicationId: string;
    jobId: string;
    companyId: string;
    status: string;
  }) {
    try {
      if (payload.status !== 'matched') return;

      const app = await this.db.application.findUnique({
        where: { id: payload.applicationId },
        include: {
          candidate: true,
          job: { include: { createdBy: true } },
        },
      });

      if (!app) return;

      const score = Number(app.matchScore ?? 0);
      const recommendation = app.matchRecommendation as string | null;
      const autoRoute =
        recommendation === 'strong fit' ||
        (recommendation === 'good fit' && score >= 75) ||
        score >= 80;
      const notifyHuman =
        !autoRoute &&
        (recommendation === 'good fit' ||
          recommendation === 'possible fit' ||
          score >= 55);

      this.logger.log(
        `Coordinator routing app ${payload.applicationId}: score=${score} rec=${recommendation} → ${autoRoute ? 'outreach' : notifyHuman ? 'notify_human' : 'wait'}`,
      );

      if (autoRoute) {
        await this.outreachQueue.add(
          'send',
          { applicationId: app.id },
          LLM_JOB_OPTIONS,
        );
        this.logger.log(`Autonomous outreach triggered for app ${app.id}`);
      } else if (notifyHuman) {
        const creator = (app.job as any).createdBy;
        if (creator?.telegramChatId) {
          const message =
            `🎯 *New candidate match*\n\n` +
            `*${escapeMd((app as any).candidate.fullName)}* for *${escapeMd((app as any).job.title)}*\n` +
            `*Match score:* ${app.matchScore}%\n\n` +
            `*Matchmaker notes:*\n${escapeMd((app.matchReasons as any)?.notes) || 'No notes'}\n\n` +
            `*Social proof:*\n${escapeMd((app as any).candidate.socialProof?.social_proof_summary) || 'No data'}\n\n` +
            `*Routing:* Score ${score}% — needs review\n\n` +
            `What do we do?`;

          await this.telegram.sendMessage(creator.telegramChatId, message, {
            parseMode: 'Markdown',
            buttons: [
              {
                text: '✅ Approve (AI Screen)',
                callbackData: JSON.stringify({ a: 'app_scr', i: app.id }),
              },
              {
                text: '❌ Skip',
                callbackData: JSON.stringify({ a: 'rej_app', i: app.id }),
              },
            ],
          });

          this.logger.log(
            `Telegram Command Center alert sent to ${creator.fullName} for app ${app.id}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        { applicationId: payload.applicationId, err: err.message },
        'handleApplicationCreated failed',
      );
    }
  }

  @OnEvent('company.event')
  async handleCompanyEvent(event: {
    type: string;
    companyId: string;
    payload: any;
  }) {
    try {
      if (event.type === 'screening_complete' && event.payload.passed) {
        const { applicationId } = event.payload;
        this.logger.log(
          `Screening passed for ${applicationId} - scheduling interview`,
        );

        {
          const app = await this.db.application.findUnique({
            where: { id: applicationId },
            include: { job: { include: { createdBy: true } } },
          });

          const hiringManagerId = (app?.job as any)?.createdBy?.id as
            | string
            | undefined;

          const start = event.payload.preferredTime
            ? new Date(event.payload.preferredTime)
            : new Date();

          if (!event.payload.preferredTime) {
            start.setDate(start.getDate() + DEFAULT_INTERVIEW_DAYS_AHEAD);
            start.setHours(DEFAULT_INTERVIEW_START_HOUR, 0, 0, 0);
          }

          const end = new Date(start);
          end.setMinutes(end.getMinutes() + DEFAULT_INTERVIEW_DURATION_MINUTES);

          await this.schedulingSvc.scheduleInterview(
            event.companyId,
            applicationId,
            {
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              attendeeEmails: [],
              timeZone: 'Asia/Tashkent',
            },
            hiringManagerId,
          );

          this.logger.log(
            `Autonomous interview scheduled for application ${applicationId}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        { event, err: err.message },
        'handleCompanyEvent failed',
      );
    }
  }
}
