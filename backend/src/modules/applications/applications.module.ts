import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.SEND_OUTREACH }),
    SchedulingModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
