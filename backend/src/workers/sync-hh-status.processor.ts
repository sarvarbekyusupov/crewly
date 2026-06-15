import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';
import { HhApplicantService } from '../integrations/hh/hh-applicant.service';
import { HhOAuthService } from '../integrations/hh/hh-oauth.service';
import { HhCandidateService } from '../integrations/hh/hh-candidate.service';
import {
  HH_EMPLOYER_STATE_MAP,
  HH_CANDIDATE_STATE_MAP,
} from '../integrations/hh/hh.constants';
import { HhApplicantNegotiation } from '../integrations/hh/hh.types';
import { withRetry, runConcurrentCapped } from '../common/utils/async.utils';
import { QUEUES } from './queue-names';

const BATCH = 200;

@Injectable()
@Processor(QUEUES.SYNC_HH_STATUS)
export class SyncHhStatusProcessor {
  private readonly logger = new Logger(SyncHhStatusProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hhNegotiations: HhNegotiationsService,
    private readonly hhApplicant: HhApplicantService,
    private readonly hhOAuth: HhOAuthService,
    private readonly hhCandidate: HhCandidateService,
  ) {}

  @Process()
  async handle(_job: Job) {
    await this.syncEmployerNegotiations();
    await this.syncInboundResponses();
    await this.syncCandidateNegotiations();
  }

  private async syncEmployerNegotiations() {
    let cursor: string | undefined;
    let totalUpdated = 0;

    while (true) {
      const applications = await this.db.application.findMany({
        where: {
          hhNegotiationId: { not: null },
          status: { notIn: ['rejected', 'hired'] },
        },
        take: BATCH,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { id: 'asc' },
      });

      if (!applications.length) break;

      let updated = 0;
      await runConcurrentCapped(applications, 5, async (app) => {
        try {
          const hhState = await withRetry(() =>
            this.hhNegotiations.getEmployerNegotiationState(
              app.hhNegotiationId!,
            ),
          );
          const newStatus = hhState
            ? HH_EMPLOYER_STATE_MAP[hhState]
            : undefined;
          if (newStatus && newStatus !== app.status) {
            await this.db.application.update({
              where: { id: app.id },
              data: { status: newStatus },
            });
            updated++;
          }
        } catch (err: any) {
          const httpStatus = err?.response?.status;
          if (httpStatus === 404) {
            await this.db.application.update({
              where: { id: app.id },
              data: { status: 'rejected' },
            });
          } else {
            this.logger.error(
              { appId: app.id, err: err.message },
              'Employer HH negotiation sync error',
            );
          }
        }
      });

      totalUpdated += updated;
      cursor = applications[applications.length - 1].id;
      if (applications.length < BATCH) break;
    }

    this.logger.log(
      { updated: totalUpdated },
      'HH employer negotiation sync complete',
    );
  }

  private async syncInboundResponses() {
    let cursor: string | undefined;
    let totalCreated = 0;

    while (true) {
      const jobs = await this.db.job.findMany({
        where: {
          hhVacancyId: { not: null },
          status: 'active',
          deletedAt: null,
        },
        select: { id: true, companyId: true, hhVacancyId: true },
        take: BATCH,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { id: 'asc' },
      });

      if (!jobs.length) break;

      let created = 0;
      await runConcurrentCapped(jobs, 3, async (job) => {
        try {
          // Fetch only the 'response' collection — new applicants land here.
          // Fetching all collections fans out to O(collections) HH calls per vacancy.
          const { items } = await this.hhNegotiations.getVacancyResponses(
            job.hhVacancyId!,
            { perPage: 100, collectionIds: ['response'] },
          );

          if (!items.length) return;

          // Batch-check which negotiation IDs already have applications
          const existingApps = await this.db.application.findMany({
            where: { hhNegotiationId: { in: items.map((n) => n.id) } },
            select: { hhNegotiationId: true },
          });
          const knownNegIds = new Set(
            existingApps.map((a) => a.hhNegotiationId!),
          );
          const newItems = items.filter((n) => !knownNegIds.has(n.id));
          if (!newItems.length) return;

          await runConcurrentCapped(newItems, 5, async (neg) => {
            let candidate: { id: string };
            try {
              candidate = await this.hhCandidate.findOrCreate(neg.resume.id);
            } catch (err: any) {
              this.logger.warn(
                { resumeId: neg.resume.id, err: err.message },
                'Resume fetch failed — skipping inbound response',
              );
              return;
            }

            await this.db.application.upsert({
              where: {
                jobId_candidateId: { jobId: job.id, candidateId: candidate.id },
              },
              create: {
                jobId: job.id,
                candidateId: candidate.id,
                companyId: job.companyId,
                status: 'applied',
                hhNegotiationId: neg.id,
              },
              update: {},
              select: { id: true },
            });
            created++;
          });
        } catch (err: any) {
          this.logger.warn(
            { jobId: job.id, err: err.message },
            'Inbound HH sync failed for job',
          );
        }
      });

      totalCreated += created;
      cursor = jobs[jobs.length - 1].id;
      if (jobs.length < BATCH) break;
    }

    if (totalCreated) {
      this.logger.log(
        { created: totalCreated },
        'HH inbound applications synced',
      );
    }
  }

  private async syncCandidateNegotiations() {
    const TERMINAL = new Set(['rejected', 'hired', 'skipped', 'failed']);
    let cursor: string | undefined;
    let totalUpdated = 0;

    while (true) {
      const apps = await this.db.seekerApplication.findMany({
        where: {
          source: 'hh.ru',
          hhNegotiationId: { not: null },
          status: { notIn: [...TERMINAL] },
        },
        select: {
          id: true,
          candidateId: true,
          hhNegotiationId: true,
          status: true,
        },
        take: BATCH,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { id: 'asc' },
      });

      if (!apps.length) break;

      // Group by candidateId to fetch token once per candidate
      const byCandidateId = new Map<string, typeof apps>();
      for (const app of apps) {
        const list = byCandidateId.get(app.candidateId) ?? [];
        list.push(app);
        byCandidateId.set(app.candidateId, list);
      }

      let updated = 0;
      const candidateEntries = Array.from(byCandidateId.entries());
      await runConcurrentCapped(
        candidateEntries,
        5,
        async ([candidateId, candidateApps]) => {
          let token: string;
          try {
            token = await this.hhOAuth.getCandidateToken(candidateId);
          } catch {
            return;
          }

          // Fetch all candidate negotiations, paginating until exhausted
          const negotiations: HhApplicantNegotiation[] = [];
          try {
            let page = 0;
            while (true) {
              const resp = await withRetry(() =>
                this.hhApplicant.getNegotiations(token, { per_page: 50, page }),
              );
              negotiations.push(...(resp.items ?? []));
              if (page >= (resp.pages ?? 1) - 1) break;
              page++;
            }
          } catch (err: any) {
            this.logger.warn(
              { candidateId, err: err.message },
              'HH negotiations fetch failed during candidate sync',
            );
            return;
          }

          const negById = new Map(negotiations.map((n) => [n.id, n]));

          for (const app of candidateApps) {
            const neg = negById.get(app.hhNegotiationId!);
            if (!neg) continue;
            const newStatus = HH_CANDIDATE_STATE_MAP[neg.state.id];
            if (!newStatus || newStatus === app.status) continue;
            try {
              await this.db.seekerApplication.update({
                where: { id: app.id },
                data: { status: newStatus },
              });
              updated++;
            } catch (err: any) {
              this.logger.warn(
                { appId: app.id, err: err.message },
                'Failed to update seeker application status',
              );
            }
          }
        },
      );

      totalUpdated += updated;
      cursor = apps[apps.length - 1].id;
      if (apps.length < BATCH) break;
    }

    if (totalUpdated) {
      this.logger.log(
        { updated: totalUpdated },
        'HH candidate negotiation sync complete',
      );
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error({ error: err.message }, 'sync-hh-status job failed');
  }
}
