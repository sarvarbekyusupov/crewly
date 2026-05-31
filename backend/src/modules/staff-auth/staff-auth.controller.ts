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
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CandidatesService } from '../candidates/candidates.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ConsentService } from '../consent/consent.service';
import { StaffService } from './staff.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { QUEUES } from '../../workers/queue-names';
import { INGEST_JOB_OPTIONS } from '../../workers/queue-options';

const COOKIE_NAME = 'staff_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

const TriggerIngestSchema = z.object({
  source: z.enum(['hh.ru', 'linkedin']),
  specialization: z.string().optional(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  text: z.string().optional(),
  maxPages: z.number().int().min(1).max(20).optional(),
});

@Controller('api/v1/staff')
@Public()
export class StaffAuthController {
  constructor(
    private readonly staffService: StaffService,
    private readonly candidatesService: CandidatesService,
    private readonly invoicesService: InvoicesService,
    private readonly consentService: ConsentService,
    @InjectQueue(QUEUES.INGEST_CANDIDATES) private readonly ingestQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER_JOBS) private readonly discoverJobsQueue: Queue,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema))
    dto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, staff } = await this.staffService.login(dto.email, dto.password);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TTL_MS,
    });

    return { staff };
  }

  @Get('me')
  @UseGuards(StaffGuard)
  @SkipThrottle({ auth: true })
  async me(@Req() req: Request) {
    const staff = (req as any).staff;
    return { id: staff.id, email: staff.email, role: staff.role };
  }

  @Get('dashboard')
  @UseGuards(StaffGuard)
  async dashboard() {
    return this.staffService.getDashboard();
  }

  @Get('companies')
  @UseGuards(StaffGuard)
  async companies(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.staffService.getCompanies(p, l);
  }

  @Get('llm-costs')
  @UseGuards(StaffGuard)
  async llmCosts() {
    return this.staffService.getLlmCosts();
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
    return this.staffService.getIngestionRuns();
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
    return this.staffService.getJobDiscoveryRuns();
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
    return this.staffService.getAuditLogs(p, l);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (!rawToken) throw new UnauthorizedException();

    const newToken = await this.staffService.refresh(rawToken);

    res.cookie(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TTL_MS,
    });

    return { ok: true };
  }

  @Post('logout')
  @UseGuards(StaffGuard)
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await this.staffService.logout(token);
    res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }

  @Post('logout-all')
  @UseGuards(StaffGuard)
  @HttpCode(200)
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const staff = (req as any).staff;
    await this.staffService.logoutAll(staff.id);
    res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }
}
