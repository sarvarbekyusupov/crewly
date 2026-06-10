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
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { HhVacancyService } from '../../integrations/hh/hh-vacancy.service';
import { HhNegotiationsService } from '../../integrations/hh/hh-negotiations.service';
import { QUEUES } from '../../workers/queue-names';
import {
  LLM_JOB_OPTIONS,
  INGEST_JOB_OPTIONS,
} from '../../workers/queue-options';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hhVacancy: HhVacancyService,
    private readonly hhNegotiations: HhNegotiationsService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.PARSE_JOB) private readonly parseJobQueue: Queue,
    @InjectQueue(QUEUES.MATCH_CANDIDATES) private readonly matchQueue: Queue,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  async create(companyId: string, userId: string, dto: CreateJobDto) {
    const job = await this.db.job.create({
      data: {
        companyId,
        createdByUserId: userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        requiredSkills: dto.requiredSkills,
        niceToHaveSkills: dto.niceToHaveSkills,
        minExperienceYears: dto.minExperienceYears,
        maxExperienceYears: dto.maxExperienceYears,
        salaryMinUzs: dto.salaryMinUzs ? BigInt(dto.salaryMinUzs) : undefined,
        salaryMaxUzs: dto.salaryMaxUzs ? BigInt(dto.salaryMaxUzs) : undefined,
        salaryCurrency: dto.salaryCurrency,
        employmentType: dto.employmentType,
        workMode: dto.workMode,
        officeLocation: dto.officeLocation,
        feePercentage: dto.feePercentage,
        feeBasis: dto.feeBasis,
        targetCandidatesCount: dto.targetCandidatesCount,
      },
    });

    await this.parseJobQueue.add('parse', { jobId: job.id }, LLM_JOB_OPTIONS);
    this.emitter.emit('job.created', { jobId: job.id, companyId });

    return job;
  }

  async findAll(
    companyId: string,
    filters?: { status?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      deletedAt: null,
      ...(filters?.status && { status: filters.status }),
    };
    const [data, total] = await Promise.all([
      this.db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.job.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(companyId: string, id: string) {
    const job = await this.db.job.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(companyId: string, id: string, dto: UpdateJobDto) {
    await this.findOne(companyId, id);
    const updated = await this.db.job.update({
      where: { id },
      data: dto as any,
    });
    // Re-parse + re-match when JD content changes
    if (
      dto.description !== undefined ||
      (dto as any).requiredSkills !== undefined
    ) {
      await this.parseJobQueue.add('parse', { jobId: id }, LLM_JOB_OPTIONS);
    }
    // Sync to HH if published there
    if (updated.hhVacancyId) {
      this.hhVacancy
        .updateVacancy(updated.hhVacancyId, {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          requiredSkills: updated.requiredSkills,
          salaryMin: updated.salaryMinUzs,
          salaryMax: updated.salaryMaxUzs,
          salaryCurrency: updated.salaryCurrency,
          minExperienceYears: updated.minExperienceYears,
          employmentType: updated.employmentType,
          workMode: updated.workMode,
        })
        .catch((err) =>
          this.logger.warn(
            { hhVacancyId: updated.hhVacancyId, err: err.message },
            'HH sync failed on update',
          ),
        );
    }
    return updated;
  }

  async activate(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!['draft', 'paused'].includes(job.status)) {
      throw new BadRequestException(
        `Cannot activate a job with status '${job.status}'`,
      );
    }
    const updated = await this.db.job.update({
      where: { id },
      data: { status: 'active', openedAt: new Date() },
    });
    await this.matchQueue.add('match', { jobId: id }, LLM_JOB_OPTIONS);
    this.emitter.emit('job.activated', { jobId: id, companyId });
    return updated;
  }

  async sendOutreach(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (job.status !== 'active')
      throw new BadRequestException('Job must be active');
    const apps = await this.db.application.findMany({
      where: { jobId: id, companyId, status: 'matched' },
    });
    if (!apps.length)
      throw new BadRequestException('No matched candidates awaiting outreach');
    for (const app of apps) {
      await this.outreachQueue.add(
        'send',
        { applicationId: app.id },
        INGEST_JOB_OPTIONS,
      );
    }
    return { queued: apps.length };
  }

  async pause(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (job.status !== 'active') {
      throw new BadRequestException(
        `Cannot pause a job with status '${job.status}'`,
      );
    }
    return this.db.job.update({ where: { id }, data: { status: 'paused' } });
  }

  async close(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    const updated = await this.db.job.update({
      where: { id },
      data: { status: 'cancelled', closedAt: new Date() },
    });
    if (job.hhVacancyId) {
      this.hhVacancy
        .archiveVacancy(job.hhVacancyId)
        .catch((err) =>
          this.logger.warn(
            { hhVacancyId: job.hhVacancyId, err: err.message },
            'HH archive failed on close',
          ),
        );
    }
    return updated;
  }

  async softDelete(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    const terminalStatuses = ['hired', 'rejected_by_client', 'withdrew'];
    await this.db.application.updateMany({
      where: { jobId: id, companyId, status: { notIn: terminalStatuses } },
      data: { status: 'rejected_by_client' },
    });
    const deleted = await this.db.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    if (job.hhVacancyId) {
      this.hhVacancy
        .deleteVacancy(job.hhVacancyId)
        .catch((err) =>
          this.logger.warn(
            { hhVacancyId: job.hhVacancyId, err: err.message },
            'HH delete failed on soft-delete',
          ),
        );
    }
    return deleted;
  }

  /** Create + publish job on HH. Stores hhVacancyId on the Job. */
  async publishToHh(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (job.status === 'draft') {
      throw new BadRequestException('Activate the job before publishing to HH');
    }

    const hhVacancyId = await this.hhVacancy.createVacancy({
      id: job.id,
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills,
      salaryMin: job.salaryMinUzs,
      salaryMax: job.salaryMaxUzs,
      salaryCurrency: job.salaryCurrency,
      minExperienceYears: job.minExperienceYears,
      employmentType: job.employmentType,
      workMode: job.workMode,
    });

    await this.hhVacancy.publishVacancy(hhVacancyId);

    return this.db.job.update({
      where: { id },
      data: { hhVacancyId },
    });
  }

  /** Archive the vacancy on HH (does not change internal status). */
  async archiveOnHh(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!job.hhVacancyId) {
      throw new BadRequestException('Job is not published on HH');
    }
    await this.hhVacancy.archiveVacancy(job.hhVacancyId);
    return { ok: true, hhVacancyId: job.hhVacancyId };
  }

  /** Prolong the vacancy posting period on HH. */
  async prolongOnHh(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!job.hhVacancyId) {
      throw new BadRequestException('Job is not published on HH');
    }
    await this.hhVacancy.prolongVacancy(job.hhVacancyId);
    return { ok: true, hhVacancyId: job.hhVacancyId };
  }

  async getApplications(
    companyId: string,
    jobId: string,
    page = 1,
    limit = 20,
  ) {
    await this.findOne(companyId, jobId);
    const skip = (page - 1) * limit;
    const where = { jobId, companyId };
    const include = {
      candidate: {
        select: {
          id: true,
          fullName: true,
          currentPosition: true,
          currentCompany: true,
          yearsExperience: true,
          skills: true,
        },
      },
    };
    const [data, total] = await Promise.all([
      this.db.application.findMany({
        where,
        include,
        orderBy: { matchScore: 'desc' },
        skip,
        take: limit,
      }),
      this.db.application.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getHhViewers(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!job.hhVacancyId)
      throw new BadRequestException('Job not published on HH');
    return this.hhVacancy.getResumeViews(job.hhVacancyId);
  }

  async getHhStats(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!job.hhVacancyId)
      throw new BadRequestException('Job not published on HH');
    return this.hhVacancy.getVacancyStats(job.hhVacancyId);
  }

  async getHhNegotiations(companyId: string, id: string) {
    const job = await this.findOne(companyId, id);
    if (!job.hhVacancyId)
      throw new BadRequestException('Job not published on HH');
    return this.hhNegotiations.getVacancyResponses(job.hhVacancyId);
  }

  async moveHhNegotiation(
    companyId: string,
    jobId: string,
    negotiationId: string,
    collection: string,
    message?: string,
  ) {
    await this.findOne(companyId, jobId);
    await this.hhNegotiations.moveNegotiation(
      collection,
      negotiationId,
      message,
    );
    return { moved: true };
  }

  async listActiveHhVacancies() {
    return this.hhVacancy.listActiveVacancies();
  }

  async getStats(companyId: string, jobId: string) {
    const job = await this.findOne(companyId, jobId);
    const apps = await this.db.application.groupBy({
      by: ['status'],
      where: { jobId, companyId },
      _count: true,
    });
    const byStatus = apps.reduce(
      (acc, row) => ({ ...acc, [row.status]: row._count }),
      {} as Record<string, number>,
    );

    if (!job.hhVacancyId) return byStatus;

    const hhStats = await this.hhVacancy
      .getVacancyStats(job.hhVacancyId)
      .catch((err) => {
        this.logger.warn({ jobId, err: err.message }, 'HH stats fetch failed');
        return null;
      });

    return { ...byStatus, ...(hhStats && { hh: hhStats }) };
  }

  async findOnePublic(id: string) {
    const job = await this.db.job.findFirst({
      where: { id, status: 'active', deletedAt: null },
      include: {
        company: {
          select: {
            name: true,
            industry: true,
            size: true,
            website: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async findAllPublic() {
    return this.db.job.findMany({
      where: { status: 'active', deletedAt: null },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });
  }
}
