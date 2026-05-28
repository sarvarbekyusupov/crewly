import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { QUEUES } from './queue-names';

interface EmbedCandidatePayload {
  candidateId: string;
}

@Processor(QUEUES.EMBED_CANDIDATE)
export class EmbedCandidateProcessor {
  private readonly logger = new Logger(EmbedCandidateProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly llm: PromptRunnerService,
  ) {}

  @Process()
  async handle(job: Job<EmbedCandidatePayload>) {
    const { candidateId } = job.data;

    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate)
      throw new NonRetryableError(`Candidate ${candidateId} not found`);

    const text = [
      candidate.currentPosition,
      candidate.currentCompany,
      ...(candidate.skills ?? []),
      candidate.rawResumeText?.slice(0, 1000) ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const embedding = await this.llm.embed(text);

    await this.db.$executeRaw`
      UPDATE candidates
      SET embedding              = ${`[${embedding.join(',')}]`}::vector,
          embedding_model        = ${'text-embedding-3-small'},
          embedding_generated_at = NOW()
      WHERE id = ${candidateId}
    `;
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { candidateId: job.data.candidateId, error: err.message },
      'embed-candidate failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
