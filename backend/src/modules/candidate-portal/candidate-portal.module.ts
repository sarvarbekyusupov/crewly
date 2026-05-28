import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { HhOAuthController } from './hh-oauth.controller';
import { CandidateAuthModule } from '../candidate-auth/candidate-auth.module';
import { HhModule } from '../../integrations/hh/hh.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    CandidateAuthModule,
    HhModule,
    ConversationsModule,
    BullModule.registerQueue({ name: QUEUES.SCORE_SEEKER_JOBS }),
    BullModule.registerQueue({ name: QUEUES.AUTO_APPLY }),
    BullModule.registerQueue({ name: QUEUES.PARSE_CANDIDATE }),
  ],
  controllers: [CandidatePortalController, HhOAuthController],
  providers: [CandidatePortalService],
})
export class CandidatePortalModule {}
