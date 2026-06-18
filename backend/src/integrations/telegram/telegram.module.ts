import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from '../../workers/queue-names';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramChannelMonitorService } from './telegram-channel-monitor.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.PARSE_CANDIDATE },
      { name: QUEUES.ADVANCE_SCREENING },
      { name: QUEUES.SCORE_SEEKER_JOBS },
      { name: QUEUES.AUTO_APPLY },
      { name: QUEUES.DISCOVER_JOBS },
    ),
  ],
  providers: [TelegramBotService, TelegramChannelMonitorService],
  exports: [TelegramBotService, TelegramChannelMonitorService],
})
export class TelegramModule {}
