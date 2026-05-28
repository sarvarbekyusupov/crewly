import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SourcingController } from './sourcing.controller';
import { SourcingService } from './sourcing.service';
import { LinkedInModule } from '../../integrations/linkedin/linkedin.module';
import { AdapterIngestService } from '../../integrations/adapters/adapter-ingest.service';
import { StaffOrAdminGuard } from '../../common/guards/staff-or-admin.guard';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    LinkedInModule,
    BullModule.registerQueue({ name: QUEUES.PARSE_CANDIDATE }),
  ],
  controllers: [SourcingController],
  providers: [SourcingService, AdapterIngestService, StaffOrAdminGuard],
  exports: [SourcingService],
})
export class SourcingModule {}
