import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { JobSourceAdapter, JobSearchParams } from './job-source.adapter';
import { QUEUES } from '../../workers/queue-names';
import { ENRICH_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class JobDiscoveryService {
  private readonly logger = new Logger(JobDiscoveryService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.ENRICH_JOB) private readonly enrichQueue: Queue,
  ) {}

  async discover(
    runId: string,
    adapter: JobSourceAdapter,
    params: Omit<JobSearchParams, 'page'>,
    maxPages = 5,
  ) {
    let fetched = 0,
      created = 0,
      updated = 0;

    for (let page = 0; page < maxPages; page++) {
      let result: Awaited<ReturnType<JobSourceAdapter['fetchPage']>>;
      try {
        result = await adapter.fetchPage({ ...params, page });
      } catch (err: any) {
        this.logger.error(
          { page, source: adapter.sourceName, error: err.message },
          'fetchPage failed',
        );
        break;
      }

      for (const job of result.jobs) {
        fetched++;
        try {
          const existing = await this.db.discoveredJob.findUnique({
            where: { sourceUrl: job.sourceUrl },
            select: { id: true },
          });

          if (existing) {
            await this.db.discoveredJob.update({
              where: { sourceUrl: job.sourceUrl },
              data: {
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                skills: job.skills,
                salaryMinUzs: job.salaryMinUzs,
                salaryMaxUzs: job.salaryMaxUzs,
                employmentType: job.employmentType,
                workMode: job.workMode,
                postedAt: job.postedAt,
                rawPayload: job.rawPayload as any,
                status: 'active',
              },
            });
            updated++;
          } else {
            const created_ = await this.db.discoveredJob.create({
              data: {
                source: adapter.sourceName,
                externalId: job.externalId,
                sourceUrl: job.sourceUrl,
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                skills: job.skills,
                salaryMinUzs: job.salaryMinUzs,
                salaryMaxUzs: job.salaryMaxUzs,
                employmentType: job.employmentType,
                workMode: job.workMode,
                postedAt: job.postedAt,
                rawPayload: job.rawPayload as any,
              },
              select: { id: true },
            });
            if (job.externalId) {
              await this.enrichQueue.add(
                {
                  discoveredJobId: created_.id,
                  externalId: job.externalId,
                  source: adapter.sourceName,
                },
                { ...ENRICH_JOB_OPTIONS, jobId: `enrich-${job.externalId}` },
              );
            }
            created++;
          }
        } catch (err: any) {
          this.logger.error(
            {
              sourceUrl: job.sourceUrl,
              source: adapter.sourceName,
              error: err.message,
            },
            'Failed to save discovered job',
          );
        }

        this.emitter.emit('staff.event', {
          type: 'job_discovery.progress',
          payload: {
            runId,
            fetched,
            created,
            updated,
            status: 'running',
          },
        });
      }

      if (!result.hasMore) break;
    }

    await this.db.jobDiscoveryRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        jobsFetched: fetched,
        jobsNew: created,
        jobsUpdated: updated,
        completedAt: new Date(),
      },
    });

    this.emitter.emit('staff.event', {
      type: 'job_discovery.progress',
      payload: {
        runId,
        fetched,
        created,
        updated,
        status: 'completed',
      },
    });

    this.logger.log(
      { runId, source: adapter.sourceName, fetched, created, updated },
      'Job discovery complete',
    );
    return { fetched, created, updated };
  }

  async upsertJobs(
    runId: string,
    source: string,
    jobs: import('./job-source.adapter').NormalizedJob[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0,
      updated = 0;

    for (const job of jobs) {
      if (!job.sourceUrl) continue;
      try {
        const existing = await this.db.discoveredJob.findUnique({
          where: { sourceUrl: job.sourceUrl },
          select: { id: true },
        });

        if (existing) {
          await this.db.discoveredJob.update({
            where: { sourceUrl: job.sourceUrl },
            data: {
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              skills: job.skills,
              salaryMinUzs: job.salaryMinUzs,
              salaryMaxUzs: job.salaryMaxUzs,
              employmentType: job.employmentType,
              workMode: job.workMode,
              postedAt: job.postedAt,
              rawPayload: job.rawPayload as any,
              status: 'active',
            },
          });
          updated++;
        } else {
          const created_ = await this.db.discoveredJob.create({
            data: {
              source,
              externalId: job.externalId,
              sourceUrl: job.sourceUrl,
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              skills: job.skills,
              salaryMinUzs: job.salaryMinUzs,
              salaryMaxUzs: job.salaryMaxUzs,
              employmentType: job.employmentType,
              workMode: job.workMode,
              postedAt: job.postedAt,
              rawPayload: job.rawPayload as any,
            },
            select: { id: true },
          });
          if (job.externalId) {
            await this.enrichQueue.add(
              {
                discoveredJobId: created_.id,
                externalId: job.externalId,
                source,
              },
              { ...ENRICH_JOB_OPTIONS, jobId: `enrich-${job.externalId}` },
            );
          }
          created++;
        }
      } catch (err: any) {
        this.logger.error(
          { sourceUrl: job.sourceUrl, err: err.message },
          'Failed to upsert similar job',
        );
      }
    }

    this.logger.log(
      { runId, source, created, updated },
      'Similar jobs upserted',
    );
    return { created, updated };
  }
}
