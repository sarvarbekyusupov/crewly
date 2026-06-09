import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningAgent } from '../modules/agents/screening.agent';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { EmailService } from '../integrations/email/email.service';
import { QUEUES } from './queue-names';
import { LLM_JOB_OPTIONS } from './queue-options';

interface AdvanceScreeningPayload {
  screeningId: string;
}

@Processor(QUEUES.ADVANCE_SCREENING)
export class AdvanceScreeningProcessor {
  private readonly logger = new Logger(AdvanceScreeningProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: ScreeningAgent,
    private readonly telegram: TelegramBotService,
    private readonly emitter: EventEmitter2,
    private readonly email: EmailService,
    @InjectQueue(QUEUES.GENERATE_DOSSIER) private readonly dossierQueue: Queue,
  ) {}

  @Process()
  async handle(job: Job<AdvanceScreeningPayload>) {
    const { screeningId } = job.data;

    const screening = await this.db.screening.findUnique({
      where: { id: screeningId },
      include: {
        application: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                companyId: true,
                createdByUserId: true,
              },
            },
            candidate: true,
          },
        },
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    if (!screening || screening.status !== 'in_progress') return;

    if (screening.questionsAsked >= 8) {
      await this.db.screening.update({
        where: { id: screeningId },
        data: { status: 'failed', completedAt: new Date() },
      });
      return;
    }

    const messages = (screening.conversation?.messages ?? []).map((m) => ({
      role: m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    const parsed = await this.agent.advance(
      { title: screening.application.job.title },
      {
        fullName: screening.application.candidate.fullName ?? 'Unknown',
        skills: screening.application.candidate.skills,
        yearsExperience: Number(
          screening.application.candidate.yearsExperience ?? 0,
        ),
      },
      messages,
      screeningId,
    );

    if (parsed.action === 'complete' && parsed.assessment) {
      const recommendation: string =
        parsed.assessment?.recommendation ?? 'advance';
      const isReject = recommendation === 'reject';
      // 'maybe' → screened_pass but hiringManagerDecision stays null for manual review
      const appStatus = isReject ? 'screened_fail' : 'screened_pass';
      const needsReview = recommendation === 'maybe';

      await this.db.$transaction([
        this.db.screening.update({
          where: { id: screeningId },
          data: {
            status: 'completed',
            aiAssessment: parsed.assessment as any,
            completedAt: new Date(),
            fullTranscript: messages as any,
          },
        }),
        this.db.application.update({
          where: { id: screening.applicationId },
          data: {
            status: appStatus,
            screenedAt: new Date(),
            ...(needsReview && {
              hiringManagerNotes:
                '[AI: needs manual review — borderline candidate]',
            }),
          },
        }),
      ]);
      if (!isReject) {
        await this.dossierQueue.add({ screeningId }, LLM_JOB_OPTIONS);
      }
      this.emitter.emit('company.event', {
        type: 'screening_complete',
        companyId: screening.application.job.companyId,
        payload: { applicationId: screening.applicationId, passed: !isReject },
      });
      // Email fallback: notify job creator (most relevant person), fallback to company owner
      if (!isReject) {
        const job = screening.application.job as any;
        void (async () => {
          try {
            let u = await this.db.user.findFirst({
              where: {
                id: job.createdByUserId ?? undefined,
                companyId: job.companyId,
                deletedAt: null,
              },
              select: { email: true },
            });
            if (!u?.email) {
              u = await this.db.user.findFirst({
                where: {
                  companyId: job.companyId,
                  role: 'owner',
                  deletedAt: null,
                },
                select: { email: true },
              });
            }
            if (u?.email) {
              await this.email.sendCandidateDelivered(
                u.email,
                screening.application.job.title,
                screening.application.candidate.fullName ?? '',
              );
            }
          } catch (e: any) {
            this.logger.error(
              { err: e.message, screeningId, companyId: job.companyId },
              'sendCandidateDelivered failed',
            );
          }
        })();
      }
    } else if (parsed.message) {
      if (screening.conversationId) {
        await this.db.message.create({
          data: {
            conversationId: screening.conversationId,
            direction: 'outbound',
            sender: 'ai',
            content: parsed.message,
          },
        });

        this.emitter.emit('company.event', {
          type: 'new_message',
          companyId: screening.application.job.companyId,
          payload: { conversationId: screening.conversationId },
        });

        this.emitter.emit('candidate.event', {
          type: 'new_message',
          candidateId: screening.application.candidate.id,
          payload: {
            applicationId: screening.application.id,
            conversationId: screening.conversationId,
          },
        });

        const conv = screening.conversation;
        if (conv?.channel === 'telegram' && conv.channelThreadId) {
          await this.telegram.sendMessage(
            Number(conv.channelThreadId),
            parsed.message,
          );
        }
      }
      await this.db.screening.update({
        where: { id: screeningId },
        data: { questionsAsked: { increment: 1 } },
      });
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { screeningId: job.data.screeningId, error: err.message },
      'advance-screening failed',
    );
  }
}
