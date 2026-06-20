import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { EmailService } from '../../integrations/email/email.service';
import { DebriefAgent } from '../agents/debrief.agent';
import { QUEUES } from '../../workers/queue-names';
import { INGEST_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly s3: S3Service,
    private readonly email: EmailService,
    private readonly debriefAgent: DebriefAgent,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  async findAll(
    companyId: string,
    filters?: {
      jobId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      ...(filters?.jobId && { jobId: filters.jobId }),
      ...(filters?.status && { status: filters.status }),
    };
    const include = {
      candidate: {
        select: {
          id: true,
          fullName: true,
          currentPosition: true,
          currentCompany: true,
          skills: true,
          yearsExperience: true,
        },
      },
      job: { select: { id: true, title: true } },
    };
    const [data, total] = await Promise.all([
      this.db.application.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: { matchScore: 'desc' },
      }),
      this.db.application.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(companyId: string, id: string) {
    const app = await this.db.application.findFirst({
      where: { id, companyId },
      include: {
        candidate: true,
        job: { select: { id: true, title: true, requiredSkills: true } },
        screenings: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    });
    if (!app) throw new NotFoundException('Application not found');

    // First 3 applicants (by matchScore rank) are free; beyond that require entitlement
    const rank = await this.db.application.count({
      where: {
        jobId: app.jobId,
        companyId,
        matchScore: { gt: app.matchScore ?? 0 },
      },
    });

    if (rank >= 3) {
      const entitlement = await this.db.companyEntitlement.findFirst({
        where: {
          companyId,
          type: 'applicant_contacts',
          AND: [
            { OR: [{ jobId: app.jobId }, { jobId: null }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
      });
      if (!entitlement) {
        return {
          ...app,
          contactsLocked: true,
          candidate: {
            ...app.candidate,
            phone: null,
            email: null,
            linkedinUrl: null,
            githubUrl: null,
            telegramUserId: null,
            telegramUsername: null,
          },
        };
      }
    }

    return app;
  }

  async update(
    companyId: string,
    id: string,
    data: { hiringManagerNotes?: string },
  ) {
    await this.findOne(companyId, id);
    return this.db.application.update({ where: { id }, data });
  }

  async approve(companyId: string, id: string, userId?: string) {
    const app = await this.findOne(companyId, id);
    const validStatuses = [
      'matched',
      'screened_pass',
      'responded',
      'screening',
    ];
    if (!validStatuses.includes(app.status)) {
      throw new BadRequestException(
        `Cannot approve application with status '${app.status}'`,
      );
    }
    const updated = await this.db.application.update({
      where: { id },
      data: {
        status: 'interview_scheduled',
        hiringManagerDecision: 'approve',
        interviewedAt: new Date(),
      },
    });
    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.approve',
            resourceType: 'application',
            resourceId: id,
            companyId,
          },
        })
        .catch((e) =>
          this.logger.warn(
            { err: e.message, applicationId: id, userId },
            'auditLog.create failed for application.approve',
          ),
        );
    }
    this.emitter.emit('candidate.notification', {
      candidateId: app.candidateId,
      applicationId: id,
      type: 'interview_scheduled',
    });
    return updated;
  }

  async reject(
    companyId: string,
    id: string,
    reason?: string,
    userId?: string,
  ) {
    const app = await this.findOne(companyId, id);
    if (app.status === 'hired') {
      throw new BadRequestException('Cannot reject a hired application');
    }
    const updated = await this.db.application.update({
      where: { id },
      data: {
        status: 'rejected_by_client',
        hiringManagerDecision: 'reject',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });
    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.reject',
            resourceType: 'application',
            resourceId: id,
            companyId,
            metadata: reason ? { reason } : undefined,
          },
        })
        .catch((e) =>
          this.logger.warn(
            { err: e.message, applicationId: id, userId },
            'auditLog.create failed for application.reject',
          ),
        );
    }
    this.emitter.emit('candidate.notification', {
      candidateId: app.candidateId,
      applicationId: id,
      type: 'rejected',
    });
    return updated;
  }

  async markInterviewed(companyId: string, id: string, userId?: string) {
    const app = await this.findOne(companyId, id);
    if (app.status !== 'interview_scheduled') {
      throw new BadRequestException('Application must be interview_scheduled');
    }
    const updated = await this.db.application.update({
      where: { id },
      data: { status: 'interviewed' },
    });
    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.interviewed',
            resourceType: 'application',
            resourceId: id,
            companyId,
          },
        })
        .catch(() => {});
    }
    return updated;
  }

  async makeOffer(companyId: string, id: string, userId?: string) {
    const app = await this.findOne(companyId, id);
    if (app.status !== 'interviewed') {
      throw new BadRequestException('Application must be interviewed first');
    }
    const updated = await this.db.application.update({
      where: { id },
      data: { status: 'offered' },
    });
    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.offered',
            resourceType: 'application',
            resourceId: id,
            companyId,
          },
        })
        .catch(() => {});
    }
    this.emitter.emit('candidate.notification', {
      candidateId: app.candidateId,
      applicationId: id,
      type: 'offered',
    });
    return updated;
  }

  async hire(
    companyId: string,
    id: string,
    hireData: {
      agreedSalaryUzs: number;
      startDate: string;
    },
    userId?: string,
  ) {
    const app = await this.findOne(companyId, id);
    if (
      !['interview_scheduled', 'interviewed', 'offered'].includes(app.status)
    ) {
      throw new BadRequestException(
        'Application must be at interview stage or later to hire',
      );
    }

    const existing = await this.db.placement.findFirst({
      where: { applicationId: id },
    });
    if (existing) {
      throw new BadRequestException('Candidate already placed for this job');
    }

    const [job, company] = await Promise.all([
      this.db.job.findUnique({ where: { id: app.jobId } }),
      this.db.company.findUnique({
        where: { id: companyId },
        select: { paymentTermsDays: true, guaranteePeriodDays: true },
      }),
    ]);
    if (!job) throw new NotFoundException('Job not found');

    const totalFeeUzs =
      job.feeBasis === 'annual'
        ? (BigInt(hireData.agreedSalaryUzs) *
            12n *
            BigInt(Math.round(Number(job.feePercentage) * 100))) /
          10000n
        : (BigInt(hireData.agreedSalaryUzs) *
            BigInt(Math.round(Number(job.feePercentage) * 100))) /
          10000n;

    const paymentTermsDays = company?.paymentTermsDays ?? 30;
    const guaranteePeriodDays = company?.guaranteePeriodDays ?? 90;

    const startDate = new Date(hireData.startDate);
    const guaranteeExpiresAt = new Date(startDate);
    guaranteeExpiresAt.setDate(
      guaranteeExpiresAt.getDate() + guaranteePeriodDays,
    );

    let placement!: Awaited<ReturnType<typeof this._runHireTransaction>>;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        placement = await this._runHireTransaction(
          id,
          app,
          job,
          hireData,
          companyId,
          totalFeeUzs,
          startDate,
          guaranteeExpiresAt,
          paymentTermsDays,
          guaranteePeriodDays,
        );
        break;
      } catch (err: any) {
        const isSerializationError = err?.code === 'P2034';
        const isUniqueViolation =
          err?.code === 'P2002' &&
          err?.meta?.target?.includes('invoice_number');
        if ((isSerializationError || isUniqueViolation) && attempt < 2)
          continue;
        throw err;
      }
    }

    // Fire-and-forget: send invoice email to company owner
    this.db.user
      .findFirst({
        where: { companyId, role: 'owner' },
        select: { email: true },
      })
      .then((cu) => {
        if (cu?.email) {
          return this.email.sendInvoice(
            cu.email,
            placement.invoiceNumber,
            placement.totalFeeUzs,
            placement.dueDate,
          );
        }
      })
      .catch(() => {});

    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.hire',
            resourceType: 'application',
            resourceId: id,
            companyId,
          },
        })
        .catch(() => {});
    }

    this.emitter.emit('candidate.notification', {
      candidateId: app.candidateId,
      applicationId: id,
      type: 'hired',
    });

    return placement.pl;
  }

  async getDossier(companyId: string, applicationId: string) {
    const app = await this.db.application.findUnique({
      where: { id: applicationId },
      select: { companyId: true },
    });
    if (!app || app.companyId !== companyId)
      throw new NotFoundException('Application not found');

    const screening = await this.db.screening.findFirst({
      where: { applicationId },
      orderBy: { startedAt: 'desc' },
      select: { aiAssessment: true },
    });

    const assessment = screening?.aiAssessment as Record<
      string,
      unknown
    > | null;
    const dossierUrl = assessment?.dossierUrl as string | undefined;

    if (!dossierUrl) throw new NotFoundException('Dossier not yet generated');

    // Extract S3 key from stored URL: endpoint/bucket/key
    const parts = dossierUrl.split('/');
    const key = parts.slice(3).join('/');
    const signedUrl = this.s3.isConfigured()
      ? await this.s3.getSignedUrl(key, 3600)
      : dossierUrl;

    return { url: signedUrl, expiresInSecs: 3600 };
  }

  private async _runHireTransaction(
    id: string,
    app: any,
    job: any,
    hireData: { agreedSalaryUzs: number; startDate: string },
    companyId: string,
    totalFeeUzs: bigint,
    startDate: Date,
    guaranteeExpiresAt: Date,
    paymentTermsDays: number,
    guaranteePeriodDays: number,
  ) {
    return this.db.$transaction(
      async (tx) => {
        const pl = await tx.placement.create({
          data: {
            applicationId: id,
            jobId: app.jobId,
            candidateId: app.candidateId,
            companyId,
            agreedSalaryUzs: BigInt(hireData.agreedSalaryUzs),
            feePercentage: job.feePercentage,
            feeBasis: job.feeBasis,
            totalFeeUzs,
            startDate,
            guaranteePeriodDays,
            guaranteeExpiresAt,
          },
        });

        const year = new Date().getFullYear();
        const lastInvoice = await tx.invoice.findFirst({
          where: { invoiceNumber: { startsWith: `INV-${year}-` } },
          orderBy: { invoiceNumber: 'desc' },
          select: { invoiceNumber: true },
        });
        const lastSeq = lastInvoice
          ? parseInt(lastInvoice.invoiceNumber.slice(`INV-${year}-`.length), 10)
          : 0;
        const invoiceNumber = `INV-${year}-${String(lastSeq + 1).padStart(6, '0')}`;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + paymentTermsDays);

        await tx.invoice.create({
          data: {
            invoiceNumber,
            companyId,
            placementId: pl.id,
            amountUzs: totalFeeUzs,
            totalUzs: totalFeeUzs,
            issuedDate: new Date(),
            dueDate,
            status: 'issued',
          },
        });

        await tx.application.update({
          where: { id },
          data: { status: 'hired', hiredAt: new Date() },
        });

        return { pl, invoiceNumber, dueDate, totalFeeUzs };
      },
      { isolationLevel: 'Serializable' as any },
    );
  }

  async bulkReject(
    companyId: string,
    ids: string[],
    reason?: string,
    userId?: string,
  ) {
    const result = await this.db.application.updateMany({
      where: {
        id: { in: ids },
        companyId,
        status: { notIn: ['hired', 'rejected_by_client', 'withdrew'] },
      },
      data: {
        status: 'rejected_by_client',
        hiringManagerDecision: 'reject',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });
    if (userId && result.count > 0) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.bulk_reject',
            resourceType: 'application',
            resourceId: ids[0],
            companyId,
            metadata: { ids, count: result.count, reason },
          },
        })
        .catch(() => {});
    }
    return result;
  }

  async retryOutreach(companyId: string, id: string) {
    const app = await this.findOne(companyId, id);
    if (app.status !== 'no_contact') {
      throw new BadRequestException(
        'Only no_contact applications can be retried',
      );
    }
    await this.db.application.update({
      where: { id },
      data: { status: 'matched' },
    });
    await this.outreachQueue.add(
      'send',
      { applicationId: id },
      INGEST_JOB_OPTIONS,
    );
    return { ok: true };
  }

  async submitInterviewDebrief(
    companyId: string,
    applicationId: string,
    rawFeedback: string,
    userId?: string,
  ) {
    const app = await this.db.application.findUnique({
      where: { id: applicationId, companyId },
      include: {
        job: true,
        candidate: { select: { fullName: true } },
      },
    });

    if (!app) throw new NotFoundException('Application not found');

    const updatedContext = await this.debriefAgent.synthesizeFeedback(
      app.job.title,
      (app.job as any).hiringManagerFeedbackContext,
      {
        candidateName: app.candidate.fullName ?? 'Candidate',
        rawFeedback,
        decision: app.status as any,
      },
      companyId,
      app.jobId,
    );

    await this.db.$transaction([
      this.db.job.update({
        where: { id: app.jobId },
        data: { hiringManagerFeedbackContext: updatedContext },
      }),
      this.db.application.update({
        where: { id: applicationId },
        data: { interviewDebriefedAt: new Date() },
      }),
    ]);

    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.interview_debriefed',
            resourceType: 'application',
            resourceId: applicationId,
            companyId,
          },
        })
        .catch(() => {});
    }

    return { ok: true, context: updatedContext };
  }

  async uploadAndAnalyzeTranscript(
    companyId: string,
    applicationId: string,
    transcript: string,
    userId?: string,
  ) {
    const app = await this.db.application.findUnique({
      where: { id: applicationId, companyId },
      include: {
        job: true,
        candidate: { select: { fullName: true, parsedResume: true } },
        screenings: { where: { status: 'completed' }, take: 1 },
      },
    });

    if (!app) throw new NotFoundException('Application not found');

    const analysis = await this.debriefAgent.analyzeTranscript(
      {
        name: app.candidate.fullName ?? 'Candidate',
        resumeSummary: (app.candidate.parsedResume as any)?.summary,
      },
      { title: app.job.title },
      app.screenings[0]?.aiAssessment,
      transcript,
      applicationId,
      companyId,
      app.jobId,
    );

    const updated = await this.db.application.update({
      where: { id: applicationId },
      data: {
        interviewTranscript: transcript,
        shadowAnalysis: analysis as any,
        status: 'interviewed', // Auto-move to interviewed status
        interviewedAt: new Date(),
      },
    });

    if (userId) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.transcript_analyzed',
            resourceType: 'application',
            resourceId: applicationId,
            companyId,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  async bulkApprove(companyId: string, ids: string[], userId?: string) {
    const result = await this.db.application.updateMany({
      where: {
        id: { in: ids },
        companyId,
        status: { in: ['matched', 'screened_pass', 'responded', 'screening'] },
      },
      data: {
        status: 'interview_scheduled',
        hiringManagerDecision: 'approve',
        interviewedAt: new Date(),
      },
    });
    if (userId && result.count > 0) {
      this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.bulk_approve',
            resourceType: 'application',
            resourceId: ids[0],
            companyId,
            metadata: { ids, count: result.count },
          },
        })
        .catch(() => {});
    }
    return result;
  }
}
