import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from '../../workers/queue-names';
import { TelegramBotService } from './telegram-bot.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.PARSE_CANDIDATE },
      { name: QUEUES.ADVANCE_SCREENING },
    ),
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramModule {}
