import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { StaffAuthController } from './staff-auth.controller';
import { StaffService } from './staff.service';
import { CandidatesModule } from '../candidates/candidates.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ConsentModule } from '../consent/consent.module';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    CandidatesModule,
    InvoicesModule,
    ConsentModule,
    BullModule.registerQueue({ name: QUEUES.INGEST_CANDIDATES }),
    BullModule.registerQueue({ name: QUEUES.DISCOVER_JOBS }),
  ],
  controllers: [StaffAuthController],
  providers: [StaffService],
})
export class StaffAuthModule {}
