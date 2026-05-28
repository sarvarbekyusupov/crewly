import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CoordinatorAgent } from './coordinator.agent';
import { SourcingAgent } from './sourcing.agent';
import { SchedulingService } from '../scheduling/scheduling.service';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';
import {
  LLM_JOB_OPTIONS,
  INGEST_JOB_OPTIONS,
} from '../../workers/queue-options';

const DEFAULT_INTERVIEW_START_HOUR = 10;
const DEFAULT_INTERVIEW_DURATION_MINUTES = 60;
const DEFAULT_INTERVIEW_DAYS_AHEAD = 1;

@Injectable()
export class PipelineCoordinator implements OnModuleInit {
  private readonly logger = new Logger(PipelineCoordinator.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: CoordinatorAgent,
    private readonly sourcingAgent: SourcingAgent,
    private readonly schedulingSvc: SchedulingService,
    private readonly telegram: TelegramBotService,
    @InjectQueue(QUEUES.MATCH_CANDIDATES) private readonly matchQueue: Queue,
    @InjectQueue(QUEUES.ADVANCE_SCREENING)
    private readonly screeningQueue: Queue,
    @InjectQueue(QUEUES.INGEST_CANDIDATES) private readonly ingestQueue: Queue,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  onModuleInit() {
    this.telegram.setCallbackHandler(async (chatId, data, messageId) => {
      this.logger.log(`Telegram callback received: ${data} from ${chatId}`);
      
      const pipeIdx = data.indexOf('|');
      if (pipeIdx === -1) {
        this.logger.warn(`Malformed Telegram callback data (missing delimiter): "${data}"`);
        return;
      }
      const action = data.slice(0, pipeIdx);
      const applicationId = data.slice(pipeIdx + 1);
      
      if (action === 'approve_screening') {
        await this.outreachQueue.add('send', { applicationId }, LLM_JOB_OPTIONS);
        await this.telegram.editMessage(chatId, messageId, '✅ Одобрено: Кандидат отправлен на AI-интервью.');
      } else if (action === 'reject_app') {
        await this.db.application.update({
          where: { id: applicationId },
          data: { status: 'rejected_by_client', rejectionReason: 'Rejected via Telegram' },
        });
        await this.telegram.editMessage(chatId, messageId, '❌ Пропущено: Кандидат отклонен.');
      }
    });
  }

  @OnEvent('job.created')
  async handleJobCreated(payload: { jobId: string; companyId: string }) {
    this.logger.log(`Job created: ${payload.jobId} - Coordinator deciding...`);
    const decision = await this.agent.decideNextSteps({
      eventType: 'job.created',
      entityType: 'job',
      entityId: payload.jobId,
      currentStatus: 'draft',
    });

    this.logger.log(`Coordinator decision for job ${payload.jobId}: ${decision.action} (${decision.reason})`);

    if (decision.action === 'trigger_matching') {
      await this.matchQueue.add(
        'match',
        { jobId: payload.jobId },
        LLM_JOB_OPTIONS,
      );
    }
  }

  @OnEvent('job.activated')
  async handleJobActivated(payload: { jobId: string; companyId: string }) {
    this.logger.log(`Job activated: ${payload.jobId} - Sourcing Hunter drafting strategy...`);
    
    const job = await this.db.job.findUnique({
      where: { id: payload.jobId },
    });

    if (job) {
      try {
        const strategy = await this.sourcingAgent.draftSourcingStrategy({
          title: job.title,
          description: job.description,
          requiredSkills: job.requiredSkills,
        });

        await this.db.job.update({
          where: { id: payload.jobId },
          data: { sourcingStrategy: strategy as any },
        });

        this.logger.log(`Strategic Sourcing memo generated for job ${payload.jobId}`);
      } catch (err: any) {
        this.logger.error(`Failed to generate sourcing strategy: ${err.message}`);
      }
    }
  }

  @OnEvent('application.created')
  async handleApplicationCreated(payload: {
    applicationId: string;
    jobId: string;
    companyId: string;
    status: string;
  }) {
    if (payload.status !== 'matched') return;

    const app = await this.db.application.findUnique({
      where: { id: payload.applicationId },
      include: {
        candidate: true,
        job: { include: { createdBy: true } },
      },
    });

    if (!app) return;

    const decision = await this.agent.decideNextSteps(
      {
        eventType: 'application.created',
        entityType: 'application',
        entityId: payload.applicationId,
        currentStatus: payload.status,
      },
      {
        matchScore: app.matchScore,
        matchRecommendation: app.matchRecommendation,
        socialProof: (app.candidate as any).socialProof?.social_proof_summary,
        hiringManagerLearnings: (app.job as any).hiringManagerFeedbackContext,
      },
    );

    this.logger.log(`Coordinator decision for app ${payload.applicationId}: ${decision.action} (${decision.reason})`);

    if (decision.action === 'trigger_screening') {
      // FULL AUTONOMY: Agent decided this is a top candidate. Invite them directly.
      await this.outreachQueue.add('send', { applicationId: app.id }, LLM_JOB_OPTIONS);
      this.logger.log(`Autonomous outreach triggered for app ${app.id}`);
    } else if (decision.action === 'notify_human') {
      // HUMAN-IN-THE-LOOP: Agent wants manager approval.
      const creator = (app.job as any).createdBy;
      if (creator?.telegramChatId) {
        const message = `🎯 **Новый кандидат!**\n\n` +
          `**${(app as any).candidate.fullName}** на роль **${(app as any).job.title}**\n` +
          `**Совпадение:** ${app.matchScore}%\n\n` +
          `**Matchmaker говорит:**\n${(app.matchReasons as any)?.notes || 'Без комментариев'}\n\n` +
          `**Social Proof:**\n${((app as any).candidate.socialProof as any)?.social_proof_summary || 'Нет данных'}\n\n` +
          `**Координатор считает:** ${decision.reason}\n\n` +
          `Что делаем?`;

        await this.telegram.sendMessage(creator.telegramChatId, message, {
          parseMode: 'Markdown',
          buttons: [
            { text: '✅ Одобрить (AI Screen)', callbackData: `approve_screening|${app.id}` },
            { text: '❌ Пропустить', callbackData: `reject_app|${app.id}` },
          ],
        });
        
        this.logger.log(`Telegram Command Center alert sent to ${creator.fullName} for app ${app.id}`);
      }
    }
  }

  @OnEvent('company.event')
  async handleCompanyEvent(event: { type: string; companyId: string; payload: any }) {
    if (event.type === 'screening_complete' && event.payload.passed) {
      const { applicationId } = event.payload;
      this.logger.log(`Screening passed for ${applicationId} - Coordinator deciding...`);

      const decision = await this.agent.decideNextSteps({
        eventType: 'screening_complete',
        entityType: 'application',
        entityId: applicationId,
        currentStatus: 'screened_pass',
      });

      this.logger.log(`Coordinator decision for passed screening ${applicationId}: ${decision.action} (${decision.reason})`);

      if (decision.action === 'schedule_interview') {
        try {
          const app = await this.db.application.findUnique({
            where: { id: applicationId },
            include: { job: { include: { createdBy: true } } },
          });

          const hiringManagerId = (app?.job as any)?.createdBy?.id as string | undefined;

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

          this.logger.log(`Autonomous interview scheduled for application ${applicationId}`);
        } catch (err: any) {
          this.logger.error(`Autonomous scheduling failed for ${applicationId}: ${err.message}`);
        }
      }
    }
  }
}
