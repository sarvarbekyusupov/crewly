import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { S3Service } from '../integrations/storage/s3.service';
import { QUEUES } from './queue-names';

interface GenerateDossierPayload {
  screeningId: string;
}

@Processor(QUEUES.GENERATE_DOSSIER)
export class GenerateDossierProcessor {
  private readonly logger = new Logger(GenerateDossierProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly llm: PromptRunnerService,
    private readonly s3: S3Service,
  ) {}

  @Process()
  async handle(job: Job<GenerateDossierPayload>) {
    const { screeningId } = job.data;

    const screening = await this.db.screening.findUnique({
      where: { id: screeningId },
      include: {
        application: {
          include: {
            job: { select: { id: true, title: true, companyId: true } },
            candidate: true,
          },
        },
      },
    });

    if (!screening)
      throw new NonRetryableError(`Screening ${screeningId} not found`);

    const { output } = await this.llm.run(
      'generate_dossier',
      'v1',
      'dossier',
      [
        {
          role: 'user',
          content: `Generate a professional candidate dossier for a hiring manager.

Job: ${screening.application.job.title}
Candidate: ${screening.application.candidate.fullName}
Experience: ${screening.application.candidate.yearsExperience} years
Skills: ${screening.application.candidate.skills.join(', ')}

Screening Assessment:
${JSON.stringify(screening.aiAssessment, null, 2)}

Write a structured 3-section report:
1. Candidate Overview (background, key strengths)
2. Technical Assessment (skills depth, experience relevance)
3. Recommendation (hire/maybe/reject with reasoning)`,
        },
      ],
      { maxTokens: 2000 },
      {
        related_entity_type: 'screening',
        related_entity_id: screeningId,
        company_id: screening.application.job.companyId,
        job_id: screening.application.job.id,
      },
    );

    // Upload dossier text to S3
    const s3Key = `dossiers/${screening.applicationId}/${screeningId}.txt`;
    const dossierUrl = await this.s3.upload(
      s3Key,
      output,
      'text/plain; charset=utf-8',
    );

    // Merge dossierUrl into existing aiAssessment JSON
    const existingAssessment =
      (screening.aiAssessment as Record<string, unknown>) ?? {};
    await this.db.screening.update({
      where: { id: screeningId },
      data: {
        aiAssessment: { ...existingAssessment, dossierUrl: dossierUrl || null },
      },
    });

    // Update application as delivered
    await this.db.application.update({
      where: { id: screening.applicationId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    this.logger.log(
      { screeningId, applicationId: screening.applicationId, dossierUrl },
      'Dossier generated',
    );
    return { dossier: output, dossierUrl };
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(
      { screeningId: job.data.screeningId, error: err.message },
      'generate-dossier failed',
    );
    if (err instanceof NonRetryableError) {
      job.discard().catch(() => {});
      return;
    }
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await this.db.screening
        .update({
          where: { id: job.data.screeningId },
          data: { status: 'failed' },
        })
        .catch(() => null);
    }
  }
}
