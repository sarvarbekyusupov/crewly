import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { HhJobsAdapter } from '../integrations/hh/hh-jobs.adapter';
import { LinkedInJobsAdapter } from '../integrations/linkedin/linkedin-jobs.adapter';
import { JobDiscoveryService } from '../integrations/adapters/job-discovery.service';
import { JobSourceAdapter } from '../integrations/adapters/job-source.adapter';
import { QUEUES } from './queue-names';

interface DiscoverJobsPayload {
  candidateId?: string; // If provided, SourcingAgent will generate query for seeker
  source: 'hh.ru' | 'linkedin';
  query?: string;
  location?: string;
  maxPages?: number;
}

@Processor(QUEUES.DISCOVER_JOBS)
export class DiscoverJobsProcessor {
  private readonly logger = new Logger(DiscoverJobsProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: SourcingAgent,
    private readonly hhJobsAdapter: HhJobsAdapter,
    private readonly linkedinJobsAdapter: LinkedInJobsAdapter,
    private readonly jobDiscovery: JobDiscoveryService,
  ) {}

  private getAdapter(source: string): JobSourceAdapter {
    if (source === 'hh.ru') return this.hhJobsAdapter;
    if (source === 'linkedin') return this.linkedinJobsAdapter;
    throw new NonRetryableError(`Unknown source: ${source}`);
  }

  @Process()
  async handle(job: Job<DiscoverJobsPayload>) {
    const { candidateId, source, maxPages } = job.data;
    let { query, location } = job.data;
    const adapter = this.getAdapter(source);

    if (candidateId && !query) {
      const seeker = await this.db.candidate.findUnique({
        where: { id: candidateId },
        select: {
          currentPosition: true,
          skills: true,
          yearsExperience: true,
          city: true,
        },
      });
      if (seeker) {
        try {
          const agentQueries = await this.agent.generateJobSearchQueries({
            currentPosition: seeker.currentPosition ?? '',
            skills: seeker.skills,
            yearsExperience: Number(seeker.yearsExperience ?? 0),
          });
          query = agentQueries.query;
          location =
            location ?? agentQueries.location_hints ?? seeker.city ?? undefined;
        } catch (err: any) {
          this.logger.warn(
            { candidateId, error: err.message },
            'LLM query generation failed, falling back to profile data',
          );
          query = seeker.currentPosition ?? undefined;
          location = location ?? seeker.city ?? undefined;
        }
      }
    }

    const run = await this.db.jobDiscoveryRun.create({
      data: {
        source,
        trigger: (job.opts as any)?.repeat ? 'scheduled' : 'manual',
        query,
        location,
        status: 'running',
      },
    });

    try {
      await this.jobDiscovery.discover(
        run.id,
        adapter,
        { query, location },
        maxPages,
      );

      if (source === 'hh.ru') {
        await this.expandSimilarVacancies(run.id);
      }
    } catch (err: any) {
      await this.db.jobDiscoveryRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: err.message, completedAt: new Date() },
      });
      throw err;
    }
  }

  private async expandSimilarVacancies(runId: string) {
    const recent = await this.db.discoveredJob.findMany({
      where: { source: 'hh.ru', externalId: { not: null }, status: 'active' },
      select: { externalId: true },
      orderBy: { discoveredAt: 'desc' },
      take: 10,
    });

    if (!recent.length) return;

    const all: import('../integrations/adapters/job-source.adapter').NormalizedJob[] =
      [];
    for (const { externalId } of recent) {
      const similar = await this.hhJobsAdapter.getSimilarVacancies(externalId!);
      all.push(...similar);
    }

    if (all.length) {
      await this.jobDiscovery.upsertJobs(runId, 'hh.ru', all);
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { source: job.data.source, error: err.message },
      'discover-jobs failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
