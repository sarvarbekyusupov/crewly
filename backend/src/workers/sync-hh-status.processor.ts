import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';
import { QUEUES } from './queue-names';

// Employer-side: HH employer negotiation state → Application.status
const HH_EMPLOYER_STATE_MAP: Record<string, string> = {
  consideration: 'outreach_sent',
  invitation: 'screening_passed',
  interview: 'interviewed',
  offer: 'offer_made',
  hired: 'hired',
  discard: 'rejected',
};

@Processor(QUEUES.SYNC_HH_STATUS)
export class SyncHhStatusProcessor {
  private readonly logger = new Logger(SyncHhStatusProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hh: HhClientService,
    private readonly hhNegotiations: HhNegotiationsService,
  ) {}

  @Process()
  async handle(_job: Job) {
    await this.syncEmployerNegotiations();
    await this.syncInboundResponses();
  }

  private async syncEmployerNegotiations() {
    const applications = await this.db.application.findMany({
      where: {
        hhNegotiationId: { not: null },
        status: { notIn: ['rejected', 'hired'] },
      },
      take: 200,
    });

    if (!applications.length) return;

    let updated = 0;
    for (const app of applications) {
      try {
        const hhState = await this.hhNegotiations.getEmployerNegotiationState(
          app.hhNegotiationId!,
        );
        const newStatus = hhState ? HH_EMPLOYER_STATE_MAP[hhState] : undefined;
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
    }

    this.logger.log(
      { total: applications.length, updated },
      'HH employer negotiation sync complete',
    );
  }

  private async syncInboundResponses() {
    const jobs = await this.db.job.findMany({
      where: {
        hhVacancyId: { not: null },
        status: 'active',
        deletedAt: null,
      },
      select: { id: true, companyId: true, hhVacancyId: true },
      take: 50,
    });

    if (!jobs.length) return;

    let created = 0;
    for (const job of jobs) {
      try {
        const { items } = await this.hhNegotiations.getVacancyResponses(
          job.hhVacancyId!,
          { perPage: 100 },
        );

        for (const neg of items) {
          const exists = await this.db.application.findFirst({
            where: { hhNegotiationId: neg.id },
            select: { id: true },
          });
          if (exists) continue;

          let candidate = await this.db.candidate.findFirst({
            where: { externalId: neg.resume.id },
            select: { id: true },
          });

          if (!candidate) {
            try {
              const resume = await this.hh.getResume(neg.resume.id);
              const fullName =
                [resume.first_name, resume.last_name]
                  .filter(Boolean)
                  .join(' ') || null;
              candidate = await this.db.candidate.create({
                data: {
                  externalId: neg.resume.id,
                  fullName,
                  currentPosition: resume.title,
                  skills: resume.skill_set ?? [],
                  yearsExperience: resume.total_experience
                    ? Math.round(resume.total_experience.months / 12)
                    : undefined,
                },
                select: { id: true },
              });
            } catch (err: any) {
              this.logger.warn(
                { resumeId: neg.resume.id, err: err.message },
                'Resume fetch failed — skipping inbound response',
              );
              continue;
            }
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
            update: { hhNegotiationId: neg.id },
            select: { id: true },
          });
          created++;
        }
      } catch (err: any) {
        this.logger.warn(
          { jobId: job.id, err: err.message },
          'Inbound HH sync failed for job',
        );
      }
    }

    if (created) {
      this.logger.log({ created }, 'HH inbound applications synced');
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error({ error: err.message }, 'sync-hh-status job failed');
  }
}
