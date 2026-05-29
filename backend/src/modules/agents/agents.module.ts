import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LlmModule } from '../../integrations/llm/llm.module';
import { SearchModule } from '../../integrations/search/search.module';
import { TelegramModule } from '../../integrations/telegram/telegram.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MatchmakerAgent } from './matchmaker.agent';
import { ScreeningAgent } from './screening.agent';
import { SourcingAgent } from './sourcing.agent';
import { OutreachAgent } from './outreach.agent';
import { DebriefAgent } from './debrief.agent';
import { SeekerAgent } from './seeker.agent';
import { CoordinatorAgent } from './coordinator.agent';
import { PipelineCoordinator } from './pipeline-coordinator.service';
import { TelegramPipelineHandler } from './telegram-pipeline-handler.service';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [
    LlmModule,
    SearchModule,
    TelegramModule,
    SchedulingModule,
    BullModule.registerQueue(
      { name: QUEUES.MATCH_CANDIDATES },
      { name: QUEUES.ADVANCE_SCREENING },
      { name: QUEUES.INGEST_CANDIDATES },
      { name: QUEUES.SEND_OUTREACH },
    ),
  ],
  providers: [
    MatchmakerAgent,
    ScreeningAgent,
    SourcingAgent,
    OutreachAgent,
    DebriefAgent,
    SeekerAgent,
    CoordinatorAgent,
    PipelineCoordinator,
    TelegramPipelineHandler,
  ],
  exports: [
    MatchmakerAgent,
    ScreeningAgent,
    SourcingAgent,
    OutreachAgent,
    DebriefAgent,
    SeekerAgent,
    CoordinatorAgent,
    PipelineCoordinator,
  ],
})
export class AgentsModule {}
