import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsController } from './jobs.controller';
import { PublicJobsController } from './public-jobs.controller';
import { JobsService } from './jobs.service';
import { HhModule } from '../../integrations/hh/hh.module';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    HhModule,
    BullModule.registerQueue({ name: QUEUES.PARSE_JOB }),
    BullModule.registerQueue({ name: QUEUES.MATCH_CANDIDATES }),
    BullModule.registerQueue({ name: QUEUES.SEND_OUTREACH }),
    BullModule.registerQueue({ name: QUEUES.SCORE_SEEKER_JOBS }),
  ],
  controllers: [JobsController, PublicJobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
