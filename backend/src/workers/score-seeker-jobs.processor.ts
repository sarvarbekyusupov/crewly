import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { QUEUES } from './queue-names';

interface ScoreSeekerJobsPayload {
  candidateId: string;
  limit?: number; // how many unscored jobs to process in this run
}

interface LlmMatchResult {
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
}

@Processor(QUEUES.SCORE_SEEKER_JOBS)
export class ScoreSeekerJobsProcessor {
  private readonly logger = new Logger(ScoreSeekerJobsProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: MatchmakerAgent,
    private readonly emitter: EventEmitter2,
  ) {}

  @Process()
  async handle(job: Job<ScoreSeekerJobsPayload>) {
    const { candidateId, limit = 20 } = job.data;

    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        fullName: true,
        currentPosition: true,
        skills: true,
        yearsExperience: true,
        city: true,
        preferredWorkMode: true,
        expectedSalaryUzs: true,
        minMatchScore: true,
        blacklistedCompanies: true,
      },
    });
    if (!candidate)
      throw new NonRetryableError(`Candidate ${candidateId} not found`);

    // Find discovered jobs not yet scored for this candidate
    const scoredIds = (
      await this.db.seekerJobMatch.findMany({
        where: { candidateId },
        select: { discoveredJobId: true },
      })
    ).map((m) => m.discoveredJobId);

    const blacklisted = (candidate.blacklistedCompanies ?? []).map((c) =>
      c.toLowerCase(),
    );

    const jobs = await this.db.discoveredJob.findMany({
      where: {
        id: {
          notIn: scoredIds.length
            ? scoredIds
            : ['00000000-0000-0000-0000-000000000000'],
        },
        status: 'active',
        ...(blacklisted.length && {
          NOT: { company: { in: blacklisted } },
        }),
      },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        description: true,
        skills: true,
        workMode: true,
        employmentType: true,
        salaryMinUzs: true,
        salaryMaxUzs: true,
      },
      orderBy: { discoveredAt: 'desc' },
      take: limit,
    });

    if (!jobs.length) {
      this.logger.log({ candidateId }, 'No unscored jobs to process');
      return;
    }

    this.emitter.emit('candidate.event', {
      candidateId,
      type: 'scoring_started',
      payload: { total: jobs.length },
    });

    // Score in batches of 5 to stay within token limits
    const batchSize = 5;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);

      let results: LlmMatchResult[];
      try {
        results = await this.agent.scoreSeekerJobs(
          {
            fullName: candidate.fullName ?? 'Unknown',
            currentPosition: candidate.currentPosition ?? 'Not specified',
            yearsExperience: Number(candidate.yearsExperience ?? 0),
            city: candidate.city ?? 'Not specified',
            preferredWorkMode: candidate.preferredWorkMode ?? 'any',
            skills: candidate.skills ?? [],
          },
          batch.map((j) => ({
            title: j.title,
            company: j.company,
            location: j.location ?? undefined,
            workMode: j.workMode ?? undefined,
            description: j.description ?? undefined,
            skills: j.skills,
          })),
          candidateId,
        );

        if (!Array.isArray(results) || results.length !== batch.length) {
          throw new Error(
            `Expected ${batch.length} results, got ${results?.length}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          { error: err.message },
          'MatchmakerAgent scoring failed — using skill-match fallback',
        );
        results = batch.map((j) =>
          this.skillMatchFallback(candidate.skills ?? [], j.skills),
        );
      }

      for (let k = 0; k < batch.length; k++) {
        const r = results[k];
        const score = Math.max(0, Math.min(100, Math.round(r.score ?? 0)));
        await this.db.seekerJobMatch.upsert({
          where: {
            candidateId_discoveredJobId: {
              candidateId,
              discoveredJobId: batch[k].id,
            },
          },
          create: {
            candidateId,
            discoveredJobId: batch[k].id,
            score,
            explanation: r.explanation,
            strengths: r.strengths ?? [],
            gaps: r.gaps ?? [],
          },
          update: {
            score,
            explanation: r.explanation,
            strengths: r.strengths ?? [],
            gaps: r.gaps ?? [],
            scoredAt: new Date(),
          },
        });
      }

      this.emitter.emit('candidate.event', {
        candidateId,
        type: 'scoring_batch',
        payload: {
          batchNum: Math.floor(i / batchSize) + 1,
          batchTotal: Math.ceil(jobs.length / batchSize),
          scored: batch.length,
        },
      });

      this.logger.log(
        { candidateId, batch: i / batchSize + 1, count: batch.length },
        'Batch scored',
      );
    }

    this.emitter.emit('candidate.event', {
      candidateId,
      type: 'scoring_complete',
      payload: { total: jobs.length },
    });

    this.logger.log(
      { candidateId, total: jobs.length },
      'Seeker job scoring complete',
    );
  }

  private skillMatchFallback(
    candidateSkills: string[],
    jobSkills: string[],
  ): LlmMatchResult {
    if (!jobSkills.length)
      return {
        score: 50,
        explanation: 'No required skills listed',
        strengths: [],
        gaps: [],
      };
    const lower = candidateSkills.map((s) => s.toLowerCase());
    const matching = jobSkills.filter((s) => lower.includes(s.toLowerCase()));
    const score = Math.round((matching.length / jobSkills.length) * 100);
    return {
      score,
      explanation: `Matches ${matching.length} of ${jobSkills.length} required skills`,
      strengths: matching.slice(0, 3),
      gaps: jobSkills
        .filter((s) => !lower.includes(s.toLowerCase()))
        .slice(0, 3),
    };
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { candidateId: job.data.candidateId, error: err.message },
      'score-seeker-jobs failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
