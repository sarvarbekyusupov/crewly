import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { HhAdapter } from '../integrations/hh/hh.adapter';
import { LinkedInAdapter } from '../integrations/linkedin/linkedin-client.service';
import { AdapterIngestService } from '../integrations/adapters/adapter-ingest.service';
import { CandidateSourceAdapter } from '../integrations/adapters/candidate-source.adapter';
import { QUEUES } from './queue-names';

interface IngestPayload {
  source: 'hh.ru' | 'linkedin';
  specialization?: string;
  keywords?: string;
  location?: string;
  text?: string;
  maxPages?: number;
}

@Processor(QUEUES.INGEST_CANDIDATES)
export class IngestCandidatesProcessor {
  private readonly logger = new Logger(IngestCandidatesProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: SourcingAgent,
    private readonly hhAdapter: HhAdapter,
    private readonly linkedinAdapter: LinkedInAdapter,
    private readonly adapterIngest: AdapterIngestService,
  ) {}

  private getAdapter(source: string): CandidateSourceAdapter {
    if (source === 'hh.ru') return this.hhAdapter;
    if (source === 'linkedin') return this.linkedinAdapter;
    throw new NonRetryableError(`Unknown source: ${source}`);
  }

  @Process()
  async handle(job: Job<IngestPayload>) {
    const { source, specialization, keywords, location, text, maxPages } =
      job.data;

    const adapter = this.getAdapter(source);

    // If it's a manual or job-linked run without queries, SourcingAgent could help (Future expansion)
    // For now, we use the provided data

    const sourceRecord = await this.db.candidateSource.findUnique({
      where: { name: source },
    });
    if (!sourceRecord)
      throw new NonRetryableError(`Source ${source} not found in DB`);

    const run = await this.db.ingestionRun.create({
      data: {
        sourceId: sourceRecord.id,
        trigger: (job.opts as any)?.repeat ? 'scheduled' : 'manual',
        triggerMetadata: job.data as any,
        status: 'running',
      },
    });

    try {
      const query = source === 'linkedin' ? keywords : text;
      await this.adapterIngest.ingest(
        run.id,
        adapter,
        { query, specialization, location },
        maxPages,
      );
    } catch (err: any) {
      await this.db.ingestionRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: err.message, completedAt: new Date() },
      });
      throw err;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { source: job.data.source, error: err.message },
      'ingest-candidates failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
