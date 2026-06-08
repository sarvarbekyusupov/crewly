import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CandidateSourceAdapter,
  AdapterSearchParams,
  NormalizedProfile,
} from './candidate-source.adapter';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class AdapterIngestService {
  private readonly logger = new Logger(AdapterIngestService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.PARSE_CANDIDATE) private readonly parseQueue: Queue,
  ) {}

  async saveSingleProfile(profile: NormalizedProfile, sourceName: string) {
    const source = await this.db.candidateSource.findUnique({
      where: { name: sourceName },
    });
    if (!source) throw new Error(`${sourceName} source not configured in DB`);

    // Dedup: sourceId+externalId → email → phone
    let existing = await this.db.candidate.findFirst({
      where: {
        sourceId: source.id,
        externalId: profile.externalId,
        deletedAt: null,
      },
    });

    if (!existing && profile.email) {
      existing = await this.db.candidate.findFirst({
        where: { email: profile.email, deletedAt: null },
      });
    }

    if (!existing && profile.phone) {
      existing = await this.db.candidate.findFirst({
        where: { phone: profile.phone, deletedAt: null },
      });
    }

    if (existing) {
      const candidate = await this.db.candidate.update({
        where: { id: existing.id },
        data: {
          rawResumeText: profile.rawText,
          email: profile.email ?? existing.email,
          phone: profile.phone ?? existing.phone,
          fullName: profile.fullName || existing.fullName,
          fullNameNormalized: (profile.fullName || (existing.fullName ?? ''))
            .toLowerCase()
            .trim(),
          city: profile.city ?? existing.city,
        },
      });
      await this.db.candidateRawPayload.create({
        data: {
          candidateId: existing.id,
          sourceId: source.id,
          payload: profile.rawPayload as any,
        },
      });
      await this.parseQueue.add({ candidateId: existing.id }, LLM_JOB_OPTIONS);
      return candidate;
    } else {
      const candidate = await this.db.candidate.create({
        data: {
          sourceId: source.id,
          externalId: profile.externalId,
          sourceUrl: profile.sourceUrl,
          fullName: profile.fullName,
          fullNameNormalized: profile.fullName.toLowerCase().trim(),
          email: profile.email,
          phone: profile.phone,
          rawResumeText: profile.rawText,
          country: 'UZ',
          city: profile.city,
          expectedSalaryUzs: profile.expectedSalaryUzs,
        },
      });
      await this.db.candidateRawPayload.create({
        data: {
          candidateId: candidate.id,
          sourceId: source.id,
          payload: profile.rawPayload as any,
        },
      });
      await this.parseQueue.add({ candidateId: candidate.id }, LLM_JOB_OPTIONS);
      return candidate;
    }
  }

  async ingest(
    runId: string,
    adapter: CandidateSourceAdapter,
    params: Omit<AdapterSearchParams, 'page'>,
    maxPages = 5,
  ) {
    let fetched = 0,
      created = 0;
    const updated = 0;
    let failed = 0;

    for (let page = 0; page < maxPages; page++) {
      let result: Awaited<ReturnType<CandidateSourceAdapter['fetchPage']>>;
      try {
        result = await adapter.fetchPage({ ...params, page });
      } catch (err: any) {
        this.logger.error(
          { page, source: adapter.sourceName, error: err.message },
          'fetchPage failed',
        );
        break;
      }

      // Process candidate profiles in parallel chunks of 10 to boost ingestion throughput
      const chunkSize = 10;
      for (let i = 0; i < result.profiles.length; i += chunkSize) {
        const chunk = result.profiles.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (profile) => {
            fetched++;
            try {
              await this.saveSingleProfile(profile, adapter.sourceName);
              created++; // inaccurate but okay for ingestionRun stats
            } catch (err: any) {
              this.logger.error(
                {
                  externalId: profile.externalId,
                  source: adapter.sourceName,
                  error: err.message,
                },
                'Failed to save candidate',
              );
              failed++;
            }
          }),
        );

        this.emitter.emit('staff.event', {
          type: 'ingestion.progress',
          payload: {
            runId,
            fetched,
            created,
            updated,
            failed,
            status: 'running',
          },
        });
      }

      if (!result.hasMore) break;
    }

    const finalStatus =
      failed > 0 && created + updated === 0 ? 'failed' : 'completed';

    await this.db.ingestionRun.update({
      where: { id: runId },
      data: {
        status: finalStatus,
        candidatesFetched: fetched,
        candidatesNew: created,
        candidatesUpdated: updated,
        candidatesFailed: failed,
        completedAt: new Date(),
      },
    });

    this.emitter.emit('staff.event', {
      type: 'ingestion.progress',
      payload: {
        runId,
        fetched,
        created,
        updated,
        failed,
        status: finalStatus,
      },
    });

    this.logger.log(
      { runId, source: adapter.sourceName, fetched, created, updated, failed },
      'Ingestion complete',
    );
    return { fetched, created, updated, failed };
  }
}
