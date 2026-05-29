import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
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
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  onModuleInit() {
    this.telegram.setCallbackHandler(async (chatId, data, messageId) => {
      this.logger.log(`Telegram callback: ${data} from ${chatId}`);

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
}
