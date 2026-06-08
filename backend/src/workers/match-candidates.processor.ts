import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchmakerAgent,
  MatchmakerResult,
} from '../modules/agents/matchmaker.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { QUEUES } from './queue-names';

interface MatchCandidatesPayload {
  jobId: string;
}

@Processor(QUEUES.MATCH_CANDIDATES)
export class MatchCandidatesProcessor {
  private readonly logger = new Logger(MatchCandidatesProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: MatchmakerAgent,
    private readonly emitter: EventEmitter2,
    private readonly hhClient: HhClientService,
  ) {}

  @Process('match')
  async handle(job: Job<MatchCandidatesPayload>) {
    const { jobId } = job.data;

    const dbJob = await this.db.job.findUnique({ where: { id: jobId } });
    if (!dbJob) throw new NonRetryableError(`Job ${jobId} not found`);

    if (!(dbJob as any).embedding) {
      this.logger.warn(
        { jobId },
        'Job has no embedding yet — skipping match, will retry',
      );
      throw new Error('Job embedding not ready');
    }

    // HH potential_resumes pre-filter — boost candidates HH already finds relevant
    let hhExtras: Array<{ id: string; similarity: number }> = [];
    const hhVacancyId = (dbJob as any).hhVacancyId as string | null;
    if (hhVacancyId) {
      try {
        const potentialResumes =
          await this.hhClient.getPotentialResumes(hhVacancyId);
        if (potentialResumes.length) {
          const resumeIds = potentialResumes.map((r) => r.id);
          const matched = await this.db.candidate.findMany({
            where: {
              externalId: { in: resumeIds },
              doNotContact: false,
              deletedAt: null,
            },
            select: { id: true },
          });
          hhExtras = matched.map((c) => ({ id: c.id, similarity: 0.5 }));
          this.logger.log(
            { jobId, count: hhExtras.length },
            'HH potential_resumes pre-filter',
          );
        }
      } catch (err: any) {
        this.logger.warn(
          { jobId, err: err.message },
          'potential_resumes fetch skipped',
        );
      }
    }

    // Vector similarity search — top 50 candidates using HNSW-indexed query
    const vectorCandidates: Array<{ id: string; similarity: number }> =
      await this.db.$queryRaw`
        SELECT id, 1 - (embedding <=> (SELECT embedding FROM jobs WHERE id = ${jobId}::uuid)) AS similarity
        FROM candidates
        WHERE embedding IS NOT NULL
          AND do_not_contact = false
          AND consent_status != 'withdrawn'
          AND deleted_at IS NULL
        ORDER BY embedding <=> (SELECT embedding FROM jobs WHERE id = ${jobId}::uuid)
        LIMIT 50`;

    const vectorIds = new Set(vectorCandidates.map((c) => c.id));
    const candidates = [
      ...vectorCandidates,
      ...hhExtras.filter((c) => !vectorIds.has(c.id)),
    ];

    if (candidates.length === 0) {
      this.logger.warn({ jobId }, 'No candidates found for matching');
      return;
    }

    // LLM re-rank top 50
    const candidateDetails = await this.db.candidate.findMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      select: {
        id: true,
        fullName: true,
        skills: true,
        yearsExperience: true,
        currentPosition: true,
      },
    });

    const targetCount = (dbJob as any).targetCandidatesCount ?? 10;

    let ranked: MatchmakerResult[];
    try {
      ranked = await this.agent.rankCandidates(
        {
          title: dbJob.title,
          requiredSkills: dbJob.requiredSkills,
          minExperienceYears: dbJob.minExperienceYears ?? undefined,
          hiringManagerFeedbackContext: (dbJob as any)
            .hiringManagerFeedbackContext,
        },
        candidateDetails.map((c) => ({
          ...c,
          fullName: c.fullName ?? 'Unknown',
          currentPosition: c.currentPosition ?? 'N/A',
          yearsExperience: Number(c.yearsExperience ?? 0),
        })),
        targetCount,
      );
    } catch (err) {
      this.logger.error(
        { jobId, error: err.message },
        'MatchmakerAgent failed',
      );
      // Fallback: use top N by vector similarity
      ranked = candidates.slice(0, targetCount).map((c) => ({
        id: c.id,
        score: Math.round(c.similarity * 100),
        strengths: [],
        gaps: [],
        notes: 'Vector match only (Agent failed)',
        recommendation: 'possible fit',
      }));
    }

    // Prepare database upsert queries for matching candidates
    const upsertQueries = ranked.map((ranked_candidate) => {
      const sim =
        candidates.find((c) => c.id === ranked_candidate.id)?.similarity ?? 0;
      const matchReasons = {
        strengths: ranked_candidate.strengths ?? [],
        gaps: ranked_candidate.gaps ?? [],
        notes: ranked_candidate.notes ?? '',
      };
      return this.db.application.upsert({
        where: {
          jobId_candidateId: { jobId, candidateId: ranked_candidate.id },
        },
        create: {
          jobId,
          candidateId: ranked_candidate.id,
          companyId: dbJob.companyId,
          matchScore: ranked_candidate.score,
          vectorSimilarity: sim,
          rerankScore: ranked_candidate.score,
          matchReasons,
          matchRecommendation: ranked_candidate.recommendation,
          status: 'matched',
        },
        update: {
          matchScore: ranked_candidate.score,
          vectorSimilarity: sim,
          rerankScore: ranked_candidate.score,
          matchReasons,
          matchRecommendation: ranked_candidate.recommendation,
        },
        select: { id: true, status: true },
      });
    });

    // Execute database transaction to guarantee full persistence first (prevents race conditions)
    const apps = await this.db.$transaction(upsertQueries);

    // Emit outreach and created events only after transaction commits successfully
    for (const app of apps) {
      this.emitter.emit('application.created', {
        applicationId: app.id,
        jobId,
        companyId: dbJob.companyId,
        status: app.status,
      });
    }

    this.emitter.emit('company.event', {
      type: 'new_matches',
      companyId: dbJob.companyId,
      payload: { jobId, count: ranked.length, jobTitle: dbJob.title },
    });

    this.logger.log({ jobId, count: ranked.length }, 'Matching complete');
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { jobId: job.data.jobId, error: err.message },
      'match-candidates failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
