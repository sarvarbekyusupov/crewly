import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.ADVANCE_SCREENING })],
  controllers: [ScreeningsController],
  providers: [ScreeningsService],
  exports: [ScreeningsService],
})
export class ScreeningsModule {}
