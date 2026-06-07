import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { QUEUES } from './queue-names';
import { LLM_JOB_OPTIONS } from './queue-options';
import { stripLlmJson } from './utils';

interface ParseJobPayload {
  jobId: string;
}

@Processor(QUEUES.PARSE_JOB)
export class ParseJobProcessor {
  private readonly logger = new Logger(ParseJobProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly llm: PromptRunnerService,
    private readonly agent: MatchmakerAgent,
    @InjectQueue(QUEUES.MATCH_CANDIDATES) private readonly matchQueue: Queue,
  ) {}

  @Process('parse')
  async handle(job: Job<ParseJobPayload>) {
    const { jobId } = job.data;

    const dbJob = await this.db.job.findUnique({ where: { id: jobId } });
    if (!dbJob) throw new NonRetryableError(`Job ${jobId} not found`);

    let parsed: any;
    try {
      parsed = await this.agent.parseJobDescription(
        dbJob.title,
        dbJob.description,
        jobId,
      );
    } catch (err: any) {
      this.logger.error(
        { jobId, error: err.message },
        'Failed to parse job description',
      );
      throw err;
    }

    // Generate embedding from requirements text
    const embeddingText = [
      dbJob.title,
      ...(parsed.required_skills ?? []),
      ...(parsed.tech_stack ?? []),
      dbJob.description,
    ].join(' ');

    const embedding = await this.llm.embed(embeddingText);

    const reqArr = `{${(parsed.required_skills ?? []).map((s: string) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    const niceArr = `{${(parsed.nice_to_have_skills ?? []).map((s: string) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    await this.db.$executeRaw`
      UPDATE jobs
      SET parsed_requirements    = ${JSON.stringify(parsed)}::jsonb,
          required_skills        = ${reqArr}::text[],
          nice_to_have_skills    = ${niceArr}::text[],
          min_experience_years   = ${parsed.min_experience_years ?? null},
          max_experience_years   = ${parsed.max_experience_years ?? null},
          embedding              = ${`[${embedding.join(',')}]`}::vector,
          embedding_model        = ${'text-embedding-3-small'},
          embedding_generated_at = NOW()
      WHERE id = ${jobId}
    `;

    // Re-run matching if job is already active (handles JD updates)
    if (dbJob.status === 'active') {
      await this.matchQueue.add('match', { jobId }, LLM_JOB_OPTIONS);
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { jobId: job.data.jobId, error: err.message },
      'parse-job failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
