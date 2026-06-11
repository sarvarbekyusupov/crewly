import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HhModule } from '../integrations/hh/hh.module';
import { LinkedInModule } from '../integrations/linkedin/linkedin.module';
import { EmailModule } from '../integrations/email/email.module';
import { LlmModule } from '../integrations/llm/llm.module';
import { AgentsModule } from '../modules/agents/agents.module';
import { CronService } from '../common/cron.service';
import { AdapterIngestService } from '../integrations/adapters/adapter-ingest.service';
import { JobDiscoveryService } from '../integrations/adapters/job-discovery.service';
import { DiscoverJobsProcessor } from './discover-jobs.processor';
import { ScoreSeekerJobsProcessor } from './score-seeker-jobs.processor';
import { AutoApplyProcessor } from './auto-apply.processor';
import { ApplyModule } from '../integrations/apply/apply.module';
import { QUEUES } from './queue-names';
import { ParseJobProcessor } from './parse-job.processor';
import { ParseCandidateProcessor } from './parse-candidate.processor';
import { EmbedCandidateProcessor } from './embed-candidate.processor';
import { MatchCandidatesProcessor } from './match-candidates.processor';
import { SendOutreachProcessor } from './send-outreach.processor';
import { AdvanceScreeningProcessor } from './advance-screening.processor';
import { GenerateDossierProcessor } from './generate-dossier.processor';
import { CleanupProcessor } from './cleanup.processor';
import { IngestCandidatesProcessor } from './ingest-candidates.processor';
import { SyncHhStatusProcessor } from './sync-hh-status.processor';
import { EnrichJobProcessor } from './enrich-job.processor';

const allQueues = Object.values(QUEUES).map((name) =>
  BullModule.registerQueue({ name }),
);

@Module({
  imports: [
    ...allQueues,
    HhModule,
    LinkedInModule,
    EmailModule,
    LlmModule,
    AgentsModule,
    ApplyModule,
  ],
  providers: [
    CronService,
    AdapterIngestService,
    JobDiscoveryService,
    DiscoverJobsProcessor,
    ScoreSeekerJobsProcessor,
    AutoApplyProcessor,
    SyncHhStatusProcessor,
    ParseJobProcessor,
    ParseCandidateProcessor,
    EmbedCandidateProcessor,
    MatchCandidatesProcessor,
    SendOutreachProcessor,
    AdvanceScreeningProcessor,
    GenerateDossierProcessor,
    CleanupProcessor,
    IngestCandidatesProcessor,
    EnrichJobProcessor,
  ],
})
export class WorkersModule {}
