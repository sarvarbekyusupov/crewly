import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { stripLlmJson } from './utils';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { QUEUES } from './queue-names';
import { LLM_JOB_OPTIONS } from './queue-options';

interface ParseCandidatePayload {
  candidateId: string;
}

@Processor(QUEUES.PARSE_CANDIDATE)
export class ParseCandidateProcessor {
  private readonly logger = new Logger(ParseCandidateProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: MatchmakerAgent,
    private readonly sourcingAgent: SourcingAgent,
    @InjectQueue(QUEUES.EMBED_CANDIDATE) private readonly embedQueue: Queue,
  ) {}

  @Process()
  async handle(job: Job<ParseCandidatePayload>) {
    const { candidateId } = job.data;

    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NonRetryableError(`Candidate ${candidateId} not found`);
    }
    if (!candidate.rawResumeText) {
      this.logger.warn(
        { candidateId },
        'No raw resume text — skipping parse, will embed with available fields',
      );
      await this.embedQueue.add({ candidateId }, LLM_JOB_OPTIONS);
      return;
    }

    let parsed: any;
    try {
      parsed = await this.agent.parseResume(candidate.rawResumeText, candidateId);
    } catch (err) {
      this.logger.warn({ candidateId, error: err.message }, 'Failed to parse resume');
      parsed = {};
    }

    const skills = (parsed.skills ?? []).map((s: any) =>
      typeof s === 'string' ? s : s.name,
    );

    // Deep Web Sourcing enrichment
    let socialProof: any = null;
    try {
      socialProof = await this.sourcingAgent.enrichCandidateProfile(
        parsed.full_name || candidate.fullName || '',
        parsed.positions?.[0]?.company,
        skills,
      );
    } catch (err: any) {
      this.logger.warn({ candidateId, error: err.message }, 'Social proof enrichment failed');
    }

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        parsedResume: parsed,
        socialProof: socialProof || undefined,
        skills,
        yearsExperience: parsed.total_years ? parsed.total_years : undefined,
        currentPosition: parsed.positions?.[0]?.title,
        currentCompany: parsed.positions?.[0]?.company,
        expectedSalaryUzs: parsed.preferred_salary_uzs
          ? BigInt(parsed.preferred_salary_uzs)
          : undefined,
        preferredWorkMode: parsed.preferred_work_mode ?? undefined,
        city: parsed.city ?? undefined,
        languages: parsed.languages ?? undefined,
        fullNameNormalized: (parsed.full_name ?? candidate.fullName ?? '')
          .toLowerCase()
          .trim(),
      },
    });

    await this.embedQueue.add({ candidateId }, LLM_JOB_OPTIONS);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { candidateId: job.data.candidateId, error: err.message },
      'parse-candidate failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
