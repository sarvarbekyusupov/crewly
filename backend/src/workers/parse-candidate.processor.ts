import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { stripLlmJson } from './utils';
import { NonRetryableError } from './errors';

interface ParsedResume {
  skills?: (string | { name: string })[];
  full_name?: string;
  phone?: string;
  email?: string;
  positions?: { title?: string; company?: string }[];
  total_years?: number;
  preferred_salary_uzs?: string | number;
  preferred_work_mode?: string;
  city?: string;
  languages?: Prisma.JsonValue;
}
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
    private readonly emitter: EventEmitter2,
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

    this.emitter.emit('candidate.event', {
      candidateId,
      type: 'resume_parse_progress',
      payload: { status: 'parsing' },
    });

    let parsed: ParsedResume;
    try {
      parsed = await this.agent.parseResume(
        candidate.rawResumeText,
        candidateId,
      );
    } catch (err: any) {
      this.logger.error(
        { candidateId, error: err.message },
        'Failed to parse resume',
      );
      await this.db.candidate
        .update({
          where: { id: candidateId },
          data: {
            parsedResume: { error: true, message: err.message } as any,
          },
        })
        .catch((dbErr) => {
          this.logger.error(
            { candidateId, error: dbErr.message },
            'Failed to write parse error status to database',
          );
        });
      this.emitter.emit('candidate.event', {
        candidateId,
        type: 'resume_parse_progress',
        payload: { status: 'error' },
      });
      throw err;
    }

    const skills = (parsed.skills ?? []).map((s) =>
      typeof s === 'string' ? s : s.name,
    );

    // Deep Web Sourcing enrichment
    let socialProof: Record<string, unknown> | null = null;
    try {
      socialProof = await this.sourcingAgent.enrichCandidateProfile(
        parsed.full_name || candidate.fullName || '',
        parsed.positions?.[0]?.company,
        skills,
      );
    } catch (err: any) {
      this.logger.warn(
        { candidateId, error: err.message },
        'Social proof enrichment failed',
      );
    }

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        parsedResume: parsed as Prisma.InputJsonValue,
        socialProof: (socialProof as Prisma.InputJsonValue) || undefined,
        skills,
        fullName: parsed.full_name || undefined,
        phone: parsed.phone || undefined,
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

    this.emitter.emit('candidate.event', {
      candidateId,
      type: 'resume_parse_progress',
      payload: { status: 'done' },
    });

    await this.embedQueue.add({ candidateId }, LLM_JOB_OPTIONS);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { candidateId: job.data.candidateId, error: err.message },
      'parse-candidate failed',
    );
    this.emitter.emit('candidate.event', {
      candidateId: job.data.candidateId,
      type: 'resume_parse_progress',
      payload: { status: 'error' },
    });
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
