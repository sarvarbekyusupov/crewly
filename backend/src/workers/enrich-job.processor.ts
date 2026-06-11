import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { HhJobsAdapter } from '../integrations/hh/hh-jobs.adapter';
import { QUEUES } from './queue-names';

interface EnrichJobPayload {
  discoveredJobId: string;
  externalId: string;
  source: string;
}

@Processor(QUEUES.ENRICH_JOB)
export class EnrichJobProcessor {
  private readonly logger = new Logger(EnrichJobProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hhJobsAdapter: HhJobsAdapter,
  ) {}

  @Process()
  async handle(job: Job<EnrichJobPayload>) {
    const { discoveredJobId, externalId, source } = job.data;

    if (source !== 'hh.ru' && source !== 'hh.uz') {
      throw new NonRetryableError(
        `Enrichment not supported for source: ${source}`,
      );
    }

    const skills = await this.hhJobsAdapter.fetchVacancySkills(externalId);
    if (!skills.length) return;

    await this.db.discoveredJob.update({
      where: { id: discoveredJobId },
      data: { skills },
    });

    this.logger.log(
      { discoveredJobId, externalId, skillCount: skills.length },
      'Job skills enriched',
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { discoveredJobId: job.data.discoveredJobId, error: err.message },
      'enrich-job failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
