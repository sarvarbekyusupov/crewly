import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class TelegramPipelineHandler implements OnModuleInit {
  private readonly logger = new Logger(TelegramPipelineHandler.name);

  constructor(
    private readonly telegram: TelegramBotService,
    private readonly db: PrismaService,
    private readonly i18n: I18nService,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  onModuleInit() {
    this.telegram.setCallbackHandler(async (chatId, data, messageId) => {
      this.logger.log(`Telegram callback: ${data} from ${chatId}`);

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        this.logger.warn(
          `Failed to parse Telegram callback data as JSON: "${data}"`,
        );
        return;
      }

      const action = parsed.a;
      const applicationId = parsed.i;

      if (action === 'app_scr') {
        await this.outreachQueue.add(
          'send',
          { applicationId },
          LLM_JOB_OPTIONS,
        );
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.i18n.t('bot.approved_for_screening', { lang: 'ru' }),
        );
      } else if (action === 'rej_app') {
        await this.db.application.update({
          where: { id: applicationId },
          data: {
            status: 'rejected_by_client',
            rejectionReason: 'Rejected via Telegram',
          },
        });
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.i18n.t('bot.rejected_candidate', { lang: 'ru' }),
        );
      }
    });
  }

  @OnEvent('candidate.notification')
  async handleCandidateNotification(event: {
    candidateId: string;
    applicationId: string;
    type: 'interview_scheduled' | 'offered' | 'rejected' | 'hired';
  }) {
    try {
      const app = await this.db.application.findUnique({
        where: { id: event.applicationId },
        include: {
          candidate: { select: { telegramUserId: true } },
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
      });

      if (!app?.candidate?.telegramUserId) return;

      const chatId = app.candidate.telegramUserId.toString();
      const lang = 'ru';
      const job = app.job.title;
      const company = app.job.company.name;

      let message: string;
      switch (event.type) {
        case 'interview_scheduled':
          message = this.i18n.t('bot.notify_interview', {
            lang,
            args: { job, company },
          });
          break;
        case 'offered':
          message = this.i18n.t('bot.notify_offer', {
            lang,
            args: { job, company },
          });
          break;
        case 'rejected':
          message = this.i18n.t('bot.notify_rejected', {
            lang,
            args: { job, company },
          });
          break;
        case 'hired':
          message = this.i18n.t('bot.notify_hired', {
            lang,
            args: { company },
          });
          break;
        default:
          return;
      }

      await this.telegram.sendMessage(chatId, message, {
        parseMode: 'Markdown',
      });
    } catch (err: any) {
      this.logger.error(
        {
          applicationId: event.applicationId,
          type: event.type,
          error: err.message,
        },
        'Failed to send candidate Telegram notification',
      );
    }
  }
}
