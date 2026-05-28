import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CandidatesService } from '../candidates/candidates.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ConsentService } from '../consent/consent.service';
import { Public } from '../../common/decorators/public.decorator';
import { StaffOnly } from '../../common/decorators/staff-only.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { QUEUES } from '../../workers/queue-names';
import { INGEST_JOB_OPTIONS } from '../../workers/queue-options';

const TriggerDiscoverJobsSchema = z.object({
  source: z.enum(['hh.ru', 'linkedin']),
  query: z.string().optional(),
  location: z.string().optional(),
  maxPages: z.number().int().min(1).max(20).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Pre-hashed dummy password used to keep timing constant when staff email not found
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysaltdummysa$dummyhashvaluetopreventtimingattacks00000';

const TriggerIngestSchema = z.object({
  source: z.enum(['hh.ru', 'linkedin']),
  specialization: z.string().optional(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  text: z.string().optional(),
  maxPages: z.number().int().min(1).max(20).optional(),
});

@Controller('api/v1/staff')
@StaffOnly()
@Public()
export class StaffAuthController {
  constructor(
    private readonly db: PrismaService,
    private readonly candidatesService: CandidatesService,
    private readonly invoicesService: InvoicesService,
    private readonly consentService: ConsentService,
    @InjectQueue(QUEUES.INGEST_CANDIDATES) private readonly ingestQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER_JOBS)
    private readonly discoverJobsQueue: Queue,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema))
    dto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const staff = await this.db.staff.findUnique({
      where: { email: dto.email },
    });
    const hashToVerify = staff?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2
      .verify(hashToVerify, dto.password)
      .catch(() => false);
    if (!staff || !valid)
      throw new UnauthorizedException('Invalid credentials');

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.db.staffSession.create({
      data: {
        staffId: staff.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    res.cookie('staff_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return { staff: { id: staff.id, email: staff.email, role: staff.role } };
  }

  @Get('me')
  @UseGuards(StaffGuard)
  async me(@Req() req: Request) {
    const staff = (req as any).staff;
    return { id: staff.id, email: staff.email, role: staff.role };
  }

  @Get('dashboard')
  @UseGuards(StaffGuard)
  async dashboard() {
    const [
      totalCompanies,
      totalCandidates,
      totalJobs,
      totalApplications,
      llmCostToday,
    ] = await Promise.all([
      this.db.company.count({ where: { deletedAt: null } }),
      this.db.candidate.count({ where: { deletedAt: null } }),
      this.db.job.count({ where: { deletedAt: null, status: 'active' } }),
      this.db.application.count({
        where: { status: { in: ['outreach_sent', 'screening', 'delivered'] } },
      }),
      this.db.llmCall.aggregate({
        _sum: { costUsd: true },
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      totalCompanies,
      totalCandidates,
      activeJobs: totalJobs,
      activeApplications: totalApplications,
      llmCostTodayUsd: llmCostToday._sum.costUsd ?? 0,
    };
  }

  @Get('companies')
  @UseGuards(StaffGuard)
  async companies(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const skip = (p - 1) * l;
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.db.company.findMany({
        where,
        include: { _count: { select: { users: true, jobs: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      this.db.company.count({ where }),
    ]);
    return { data, total, page: p, limit: l };
  }

  @Get('llm-costs')
  @UseGuards(StaffGuard)
  async llmCosts() {
    return this.db.llmCall.groupBy({
      by: ['purpose', 'model'],
      _sum: { costUsd: true, totalTokens: true },
      _count: true,
      orderBy: { _sum: { costUsd: 'desc' } },
    });
  }

  @Get('candidates')
  @UseGuards(StaffGuard)
  async candidates(
    @Query('dnc') dnc?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.candidatesService.findAllForStaff({
      doNotContact: dnc === 'true' ? true : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('candidates/:id/dnc')
  @UseGuards(StaffGuard)
  async markDnc(@Param('id') id: string) {
    await this.candidatesService.markDoNotContact(id);
    return { ok: true };
  }

  @Post('ingestion-runs')
  @UseGuards(StaffGuard)
  async triggerIngestion(
    @Body(new ZodValidationPipe(TriggerIngestSchema))
    dto: z.infer<typeof TriggerIngestSchema>,
  ) {
    const job = await this.ingestQueue.add(
      {
        source: dto.source,
        specialization: dto.specialization,
        keywords: dto.keywords,
        location: dto.location,
        text: dto.text,
        maxPages: dto.maxPages,
      },
      INGEST_JOB_OPTIONS,
    );
    return { jobId: job.id, queued: true };
  }

  @Get('ingestion-runs')
  @UseGuards(StaffGuard)
  async ingestionRuns() {
    return this.db.ingestionRun.findMany({
      include: { source: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  @Post('job-discovery-runs')
  @UseGuards(StaffGuard)
  async triggerJobDiscovery(
    @Body(new ZodValidationPipe(TriggerDiscoverJobsSchema))
    dto: z.infer<typeof TriggerDiscoverJobsSchema>,
  ) {
    const job = await this.discoverJobsQueue.add(
      {
        source: dto.source,
        query: dto.query,
        location: dto.location,
        maxPages: dto.maxPages,
      },
      INGEST_JOB_OPTIONS,
    );
    return { jobId: job.id, queued: true };
  }

  @Get('job-discovery-runs')
  @UseGuards(StaffGuard)
  async jobDiscoveryRuns() {
    return this.db.jobDiscoveryRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  @Get('invoices')
  @UseGuards(StaffGuard)
  async invoices(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.findAllForStaff(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('consent')
  @UseGuards(StaffGuard)
  async consent(
    @Query('candidateId') candidateId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.consentService.findAllForStaff(candidateId, p, l);
  }

  @Get('audit')
  @UseGuards(StaffGuard)
  async auditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const skip = (p - 1) * l;
    
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      this.db.auditLog.count(),
    ]);

    return {
      data: data.map(d => ({ ...d, id: d.id.toString() })),
      total,
      page: p,
      limit: l,
    };
  }

  @Post('logout')
  @UseGuards(StaffGuard)
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['staff_session'];
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.db.staffSession.deleteMany({ where: { tokenHash } });
    }
    res.clearCookie('staff_session');
    return { ok: true };
  }
}
