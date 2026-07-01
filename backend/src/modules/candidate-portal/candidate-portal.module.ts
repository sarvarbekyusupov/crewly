import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { CandidateAuthModule } from '../candidate-auth/candidate-auth.module';
import { HhModule } from '../../integrations/hh/hh.module';
import { LinkedInModule } from '../../integrations/linkedin/linkedin.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ApplyModule } from '../../integrations/apply/apply.module';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    CandidateAuthModule,
    HhModule,
    LinkedInModule,
    ConversationsModule,
    ApplyModule,
    BullModule.registerQueue({ name: QUEUES.SCORE_SEEKER_JOBS }),
    BullModule.registerQueue({ name: QUEUES.AUTO_APPLY }),
    BullModule.registerQueue({ name: QUEUES.PARSE_CANDIDATE }),
  ],
  controllers: [CandidatePortalController],
  providers: [CandidatePortalService],
})
export class CandidatePortalModule {}
