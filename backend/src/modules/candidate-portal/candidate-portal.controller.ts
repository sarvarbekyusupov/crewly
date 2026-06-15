import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CandidatePortalService } from './candidate-portal.service';
import { HhSuggestsService } from '../../integrations/hh/hh-suggests.service';
import { HhOAuthService } from '../../integrations/hh/hh-oauth.service';
import { HhResumeService } from '../../integrations/hh/hh-resume.service';
import type { HhResumeDetail } from '../../integrations/hh/hh.types';
import { HhApplicantService } from '../../integrations/hh/hh-applicant.service';
import { HhChatService } from '../../integrations/hh/hh-chat.service';
import { HhJobsAdapter } from '../../integrations/hh/hh-jobs.adapter';
import { LinkedInOAuthService } from '../../integrations/linkedin/linkedin-oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CandidateAuthGuard } from '../candidate-auth/guards/candidate-auth.guard';
import { CurrentCandidate } from '../../common/decorators/current-candidate.decorator';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

function rethrowHhError(err: any): never {
  const status: number | undefined = err?.response?.status;
  const hhMsg =
    err?.response?.data?.description ??
    err?.response?.data?.errors?.[0]?.value ??
    err.message;
  throw new BadGatewayException(`HH API ${status ?? '?'}: ${hhMsg}`);
}

const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  currentPosition: z.string().max(200).optional(),
  currentCompany: z.string().max(200).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  preferredWorkMode: z.string().optional(),
  willingToRelocate: z.boolean().optional(),
  hasTransport: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  yearsExperience: z.number().min(0).max(100).nullable().optional(),
  noticePeriodDays: z.number().int().min(0).max(365).nullable().optional(),
  telegramUsername: z.string().max(100).nullable().optional(),
  parsedResume: z.any().optional(),
});

const UpdatePreferencesSchema = z.object({
  minMatchScore: z.number().int().min(0).max(100).nullable().optional(),
  blacklistedCompanies: z.array(z.string().max(200)).optional(),
  maxApplicationsPerDay: z.number().int().min(1).max(50).optional(),
  preferredWorkMode: z.string().nullable().optional(),
  expectedSalaryUzs: z.number().nullable().optional(),
  // hhResumeId intentionally excluded — use POST hh/resume-url to change it with proper extraction
});

type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

@Controller('api/v1/candidate-portal')
@UseGuards(CandidateAuthGuard)
@Public()
@SkipThrottle({ auth: true })
export class CandidatePortalController {
  private readonly logger = new Logger(CandidatePortalController.name);

  constructor(
    private readonly portalService: CandidatePortalService,
    private readonly hhSuggests: HhSuggestsService,
    private readonly hhOAuth: HhOAuthService,
    private readonly hhResume: HhResumeService,
    private readonly hhApplicant: HhApplicantService,
    private readonly hhChat: HhChatService,
    private readonly hhJobs: HhJobsAdapter,
    private readonly linkedInOAuth: LinkedInOAuthService,
    private readonly db: PrismaService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.SCORE_SEEKER_JOBS) private readonly scoreQueue: Queue,
    @InjectQueue(QUEUES.AUTO_APPLY) private readonly autoApplyQueue: Queue,
  ) {}

  @Sse('events')
  stream(
    @CurrentCandidate() candidate: { id: string },
  ): Observable<MessageEvent> {
    const keepalive$ = interval(30_000).pipe(
      map((): MessageEvent => ({ data: '' })),
    );

    const events$ = fromEvent(this.emitter, 'candidate.event').pipe(
      filter((event: any) => event?.candidateId === candidate.id),
      map(
        (event: any): MessageEvent => ({
          data: JSON.stringify({ type: event.type, payload: event.payload }),
        }),
      ),
    );

    return merge(events$, keepalive$);
  }

  @Get('profile')
  async getProfile(@CurrentCandidate() candidate: { id: string }) {
    return this.portalService.getProfile(candidate.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentCandidate() candidate: { id: string },
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    const result = await this.portalService.updateProfile(candidate.id, dto);
    // Re-score discovered jobs when skills change
    if (dto.skills !== undefined) {
      await this.scoreQueue
        .add({ candidateId: candidate.id, limit: 50 }, LLM_JOB_OPTIONS)
        .catch(() => {});
    }
    return result;
  }

  @Post('cv')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadCv(
    @CurrentCandidate() candidate: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.portalService.uploadCv(
      candidate.id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('cv/parse')
  @HttpCode(HttpStatus.OK)
  async parseCv(@CurrentCandidate() candidate: { id: string }) {
    return this.portalService.triggerParseCv(candidate.id);
  }

  @Get('preferences')
  async getPreferences(@CurrentCandidate() candidate: { id: string }) {
    return this.portalService.getProfile(candidate.id).then((p: any) => ({
      minMatchScore: p.minMatchScore,
      blacklistedCompanies: p.blacklistedCompanies ?? [],
      maxApplicationsPerDay: p.maxApplicationsPerDay ?? 5,
      preferredWorkMode: p.preferredWorkMode,
      expectedSalaryUzs:
        p.expectedSalaryUzs != null ? String(p.expectedSalaryUzs) : null,
      hhResumeId: p.hhResumeId,
      hhOauthTokenSet: !!p.hhOauthToken,
      linkedinOauthTokenSet: !!p.linkedinOauthToken,
      resumeFileUrl: p.resumeFileUrl,
    }));
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentCandidate() candidate: { id: string },
    @Body(new ZodValidationPipe(UpdatePreferencesSchema))
    dto: z.infer<typeof UpdatePreferencesSchema>,
  ) {
    return this.portalService.updatePreferences(candidate.id, {
      ...dto,
      expectedSalaryUzs:
        dto.expectedSalaryUzs != null
          ? BigInt(dto.expectedSalaryUzs)
          : dto.expectedSalaryUzs,
    });
  }

  @Get('applications')
  async getApplications(@CurrentCandidate() candidate: { id: string }) {
    return this.portalService.getApplications(candidate.id);
  }

  @Get('applications/:id')
  async getApplication(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') id: string,
  ) {
    return this.portalService.getApplication(candidate.id, id);
  }

  @Get('applications/:id/messages')
  async getMessages(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') id: string,
  ) {
    return this.portalService.getMessages(candidate.id, id);
  }

  @Post('applications/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async postMessage(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(z.object({ content: z.string().min(1).max(4000) })),
    )
    body: { content: string },
  ) {
    return this.portalService.postMessage(candidate.id, id, body.content);
  }

  // ── Job Discovery ──────────────────────────────────────────────────────────

  @Get('discovered-jobs')
  async getDiscoveredJobs(
    @CurrentCandidate() candidate: { id: string },
    @Query('search') search?: string,
    @Query('workMode') workMode?: string,
    @Query('minScore') minScore?: string,
    @Query('minSalary') minSalary?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
  ) {
    return this.portalService.getDiscoveredJobs(candidate.id, {
      search,
      workMode,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      minSalary: minSalary ? parseInt(minSalary, 10) : undefined,
      sortBy: sortBy === 'score' ? 'score' : 'recent',
      page: page ? parseInt(page, 10) : 1,
    });
  }

  @Post('discovered-jobs/score')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerScoring(@CurrentCandidate() candidate: { id: string }) {
    await this.scoreQueue.add(
      { candidateId: candidate.id, limit: 50 },
      LLM_JOB_OPTIONS,
    );
    return { queued: true };
  }

  @Post('discovered-jobs/discover')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerDiscover(@CurrentCandidate() candidate: { id: string }) {
    this.portalService
      .discoverJobsForCandidate(candidate.id, 3)
      .then(() =>
        this.scoreQueue.add(
          { candidateId: candidate.id, limit: 100 },
          LLM_JOB_OPTIONS,
        ),
      )
      .catch((err) =>
        this.logger.warn(
          { candidateId: candidate.id, error: err.message },
          'Manual discovery failed',
        ),
      );
    return { queued: true };
  }

  // ── Seeker Applications ───────────────────────────────────────────────────

  @Get('seeker-applications')
  async getSeekerApplications(@CurrentCandidate() candidate: { id: string }) {
    return this.portalService.getSeekerApplications(candidate.id);
  }

  @Post('seeker-applications')
  @HttpCode(HttpStatus.CREATED)
  async applyToJob(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(z.object({ discoveredJobId: z.string().uuid() })),
    )
    body: { discoveredJobId: string },
  ) {
    const seekerApp = await this.portalService.queueApplication(
      candidate.id,
      body.discoveredJobId,
    );
    await this.autoApplyQueue.add(
      { seekerApplicationId: seekerApp.id },
      LLM_JOB_OPTIONS,
    );
    return seekerApp;
  }

  @Patch('seeker-applications/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateApplicationStatus(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(z.object({ status: z.string().min(1).max(50) })),
    )
    body: { status: string },
  ) {
    return this.portalService.updateSeekerApplicationStatus(
      candidate.id,
      id,
      body.status,
    );
  }

  // ── HH OAuth ──────────────────────────────────────────────────────────────

  @Get('hh/oauth-url')
  getHhOAuthUrl(@CurrentCandidate() candidate: { id: string }) {
    const url = this.hhOAuth.getAuthorizationUrl(candidate.id);
    return { url };
  }

  @Post('hh/disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectHh(@CurrentCandidate() candidate: { id: string }) {
    await this.hhOAuth.disconnectHh(candidate.id);
    return { disconnected: true };
  }

  /**
   * Retry auto-detection of HH resume using the stored token.
   * Useful when the OAuth callback completed but /resumes/mine failed (403 or empty array).
   */
  @Post('hh/resume/detect')
  @HttpCode(HttpStatus.OK)
  async detectHhResume(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);

    let resumes: Awaited<ReturnType<typeof this.hhOAuth.getResumesForToken>>;
    try {
      resumes = await this.hhOAuth.getResumesForToken(token);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        throw new UnprocessableEntityException({
          code: 'resume_access_denied',
          message:
            'HH denied access to resume list (403). Use POST hh/resume-url to enter the URL manually.',
          details: err?.response?.data,
        });
      }
      rethrowHhError(err);
    }

    if (!resumes!.length) {
      return { found: false, message: 'No resumes found on HH account' };
    }

    const primary = [...resumes!].sort(
      (a, b) =>
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime(),
    )[0];

    await this.hhOAuth.saveResumeId(candidate.id, primary.id);
    return {
      found: true,
      resumeId: primary.id,
      title: primary.title,
      total: resumes!.length,
    };
  }

  /** Manually save an HH resume URL/ID when auto-detection was blocked (403 on /resumes/mine). */
  @Post('hh/resume-url')
  @HttpCode(HttpStatus.OK)
  async saveHhResumeUrl(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z.object({ resumeUrl: z.string().min(1).max(500) }),
      ),
    )
    body: { resumeUrl: string },
  ) {
    const { resumeUrl } = body;

    // Accept both a full URL (https://hh.uz/resume/abc123) and a bare ID
    const match = resumeUrl.match(/\/resume\/([a-zA-Z0-9]+)/);
    const resumeId = match ? match[1] : resumeUrl.trim();
    if (!resumeId)
      throw new BadRequestException('Could not extract resume ID from URL');

    await this.hhOAuth.saveResumeId(candidate.id, resumeId);
    return { ok: true, resumeId };
  }

  // ── HH Resume ─────────────────────────────────────────────────────────────

  @Get('hh/resume')
  async getHhResume(@CurrentCandidate() candidate: { id: string }) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId) return { error: 'No HH resume linked' };
    try {
      return await this.hhResume.getResume(token, cand.hhResumeId);
    } catch (err: any) {
      rethrowHhError(err);
    }
  }

  @Post('hh/resume/sync')
  @HttpCode(HttpStatus.OK)
  async syncHhResume(@CurrentCandidate() candidate: { id: string }) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId) return { error: 'No HH resume linked' };

    let resume!: HhResumeDetail;
    try {
      resume = await this.hhResume.getResume(token, cand.hhResumeId);
    } catch (err: any) {
      rethrowHhError(err);
    }

    const profileUpdates: Record<string, unknown> = {};
    if (resume.skill_set?.length) profileUpdates['skills'] = resume.skill_set;
    if (resume.title) profileUpdates['currentPosition'] = resume.title;
    if (resume.area?.name) profileUpdates['city'] = resume.area.name;
    if (resume.total_experience?.months != null) {
      profileUpdates['yearsExperience'] = Math.round(
        resume.total_experience.months / 12,
      );
    }
    const emailContact = resume.contact?.find((c) => c.type?.id === 'email');
    if (typeof emailContact?.value === 'string' && emailContact.value) {
      profileUpdates['email'] = emailContact.value;
    }
    const phoneContact = resume.contact?.find((c) => c.type?.id === 'cell');
    if (phoneContact?.value && typeof phoneContact.value !== 'string') {
      const formatted = (phoneContact.value as { formatted?: string })
        .formatted;
      if (formatted) profileUpdates['phone'] = formatted;
    }

    const dbUpdates: Record<string, unknown> = { ...profileUpdates };
    if (resume.salary?.currency === 'UZS' && resume.salary.amount != null) {
      dbUpdates['expectedSalaryUzs'] = BigInt(resume.salary.amount);
    }

    if (Object.keys(dbUpdates).length) {
      await this.db.candidate.update({
        where: { id: candidate.id },
        data: dbUpdates,
      });
    }

    return {
      synced: true,
      imported: Object.keys(dbUpdates),
    };
  }

  @Post('hh/resume/publish')
  @HttpCode(HttpStatus.OK)
  async publishHhResume(@CurrentCandidate() candidate: { id: string }) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId) return { error: 'No HH resume linked' };
    try {
      await this.hhResume.publishResume(token, cand.hhResumeId);
    } catch (err: any) {
      rethrowHhError(err);
    }
    return { published: true };
  }

  @Post('hh/resume/hide')
  @HttpCode(HttpStatus.OK)
  async hideHhResume(@CurrentCandidate() candidate: { id: string }) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId) return { error: 'No HH resume linked' };
    try {
      await this.hhResume.hideResume(token, cand.hhResumeId);
    } catch (err: any) {
      rethrowHhError(err);
    }
    return { hidden: true };
  }

  @Get('hh/resume/views')
  async getHhResumeViews(@CurrentCandidate() candidate: { id: string }) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId) return { items: [], found: 0 };
    try {
      return await this.hhResume.getResumeViews(token, cand.hhResumeId);
    } catch (err: any) {
      this.logger.warn(
        { status: err?.response?.status, data: err?.response?.data },
        'HH resume/views failed — returning empty',
      );
      return { items: [], found: 0 };
    }
  }

  // ── HH Negotiations + Vacancy Search ──────────────────────────────────────

  @Get('hh/negotiations')
  async getHhNegotiations(
    @CurrentCandidate() candidate: { id: string },
    @Query('page') page?: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhApplicant.getNegotiations(token, {
      page: page ? parseInt(page, 10) : 0,
    });
  }

  @Get('hh/vacancies')
  async searchHhVacancies(
    @Query('text') text?: string,
    @Query('area') area?: string,
    @Query('experience') experience?: string,
    @Query('salary') salary?: string,
    @Query('order_by') order_by?: string,
    @Query('page') page?: string,
    @Query('per_page') per_page?: string,
  ) {
    return this.hhApplicant.searchVacancies({
      text,
      area,
      experience: experience as any,
      salary: salary ? parseInt(salary, 10) : undefined,
      order_by: order_by as any,
      page: page ? parseInt(page, 10) : 0,
      per_page: per_page ? parseInt(per_page, 10) : 20,
    });
  }

  @Get('hh/vacancies/:id/similar')
  async getSimilarVacancies(@Param('id') id: string) {
    return this.hhJobs.getSimilarVacancies(id);
  }

  @Post('hh/vacancies/:id/apply')
  @HttpCode(HttpStatus.OK)
  async applyToHhVacancy(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') vacancyId: string,
    @Body(
      new ZodValidationPipe(
        z.object({ message: z.string().max(2000).optional() }),
      ),
    )
    body: { message?: string },
  ) {
    const [token, cand] = await Promise.all([
      this.hhOAuth.getCandidateToken(candidate.id),
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
    ]);
    if (!cand?.hhResumeId)
      return { error: 'No HH resume linked — connect HH account first' };
    const negotiationId = await this.hhApplicant.applyToVacancy(
      token,
      vacancyId,
      cand.hhResumeId,
      body.message,
    );
    // Link negotiation to seekerApplication so webhooks can update status later.
    // Best-effort — skip if the HH vacancy hasn't been scraped into DiscoveredJob yet.
    if (negotiationId) {
      const discovered = await this.db.discoveredJob.findFirst({
        where: { externalId: vacancyId, source: 'hh.ru' },
        select: { id: true, source: true },
      });
      if (discovered) {
        await this.db.seekerApplication.upsert({
          where: {
            candidateId_discoveredJobId: {
              candidateId: candidate.id,
              discoveredJobId: discovered.id,
            },
          },
          create: {
            candidateId: candidate.id,
            discoveredJobId: discovered.id,
            source: discovered.source,
            status: 'applied',
            hhNegotiationId: negotiationId,
            appliedAt: new Date(),
          },
          update: {
            hhNegotiationId: negotiationId,
            status: 'applied',
            appliedAt: new Date(),
          },
        });
      }
    }
    return { applied: true };
  }

  @Get('hh/me')
  async getHhMe(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhApplicant.getMe(token);
  }

  @Get('hh/negotiations/:id/messages')
  async getHhNegotiationMessages(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') negotiationId: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    const chatId = await this.hhChat.findChatIdByNegotiationId(
      token,
      negotiationId,
    );
    if (chatId) {
      return this.hhChat.getChatMessages(token, chatId);
    }
    return this.hhApplicant.getNegotiationMessages(token, negotiationId);
  }

  @Post('hh/negotiations/:id/messages')
  @HttpCode(HttpStatus.OK)
  async postHhNegotiationMessage(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') negotiationId: string,
    @Body(
      new ZodValidationPipe(z.object({ message: z.string().min(1).max(2000) })),
    )
    body: { message: string },
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    const chatId = await this.hhChat.findChatIdByNegotiationId(
      token,
      negotiationId,
    );
    if (chatId) {
      await this.hhChat.sendChatMessage(
        token,
        chatId,
        body.message,
        crypto.randomUUID(),
      );
    } else {
      await this.hhApplicant.postNegotiationMessage(
        token,
        negotiationId,
        body.message,
      );
    }
    return { sent: true };
  }

  @Get('hh/vacancies/:id')
  async getHhVacancy(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') vacancyId: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhApplicant.getVacancy(token, vacancyId);
  }

  @Get('hh/resume/similar-vacancies')
  async getHhSimilarVacancies(
    @CurrentCandidate() candidate: { id: string },
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const [cand, token] = await Promise.all([
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
      this.hhOAuth.getCandidateToken(candidate.id),
    ]);
    if (!cand?.hhResumeId) {
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'No HH resume linked',
      });
    }
    return this.hhApplicant.getSimilarVacancies(token, cand.hhResumeId, {
      page: page ? Number(page) : 0,
      per_page: perPage ? Number(perPage) : 20,
    });
  }

  @Delete('hh/negotiations/:id')
  @HttpCode(HttpStatus.OK)
  async withdrawHhNegotiation(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') negotiationId: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    await this.hhApplicant.deleteNegotiation(token, negotiationId);
    return { withdrawn: true };
  }

  @Put('hh/resume')
  @HttpCode(HttpStatus.OK)
  async updateHhResume(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z.object({
          title: z.string().max(200).optional(),
          skill_set: z.array(z.string().max(100)).max(30).optional(),
          skills: z.string().max(5000).optional(),
          salary: z
            .object({ amount: z.number().positive(), currency: z.string() })
            .optional(),
        }),
      ),
    )
    body: {
      title?: string;
      skill_set?: string[];
      skills?: string;
      salary?: { amount: number; currency: string };
    },
  ) {
    const [cand, token] = await Promise.all([
      this.db.candidate.findUnique({
        where: { id: candidate.id },
        select: { hhResumeId: true },
      }),
      this.hhOAuth.getCandidateToken(candidate.id),
    ]);
    if (!cand?.hhResumeId) {
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'No HH resume linked',
      });
    }
    await this.hhResume.updateResume(token, cand.hhResumeId, body);
    return { updated: true };
  }

  // ── HH Suggests ────────────────────────────────────────────────────────────

  @Get('hh/suggests/areas')
  suggestAreas(@Query('text') text: string) {
    return this.hhSuggests.areas(text ?? '');
  }

  @Get('hh/suggests/skills')
  suggestSkills(@Query('text') text: string) {
    return this.hhSuggests.skills(text ?? '');
  }

  @Get('hh/suggests/universities')
  suggestUniversities(@Query('text') text: string) {
    return this.hhSuggests.universities(text ?? '');
  }

  @Get('hh/suggests/positions')
  suggestPositions(@Query('text') text: string) {
    return this.hhSuggests.positions(text ?? '');
  }

  @Get('hh/suggests/area-leaves')
  suggestAreaLeaves(@Query('text') text: string) {
    return this.hhSuggests.areaLeaves(text ?? '');
  }

  @Get('hh/suggests/fields-of-study')
  suggestFieldsOfStudy(@Query('text') text: string) {
    return this.hhSuggests.fieldsOfStudy(text ?? '');
  }

  @Get('hh/suggests/professional-roles')
  suggestProfessionalRoles(@Query('text') text: string) {
    return this.hhSuggests.professionalRoles(text ?? '');
  }

  @Get('hh/suggests/vacancy-positions')
  suggestVacancyPositions(@Query('text') text: string) {
    return this.hhSuggests.vacancyPositions(text ?? '');
  }

  // ── HH Chats (new API, replaces deprecated /negotiations/{id}/messages) ───

  @Get('hh/chats')
  async listHhChats(
    @CurrentCandidate() candidate: { id: string },
    @Query('page') page?: string,
    @Query('filter_unread') filterUnread?: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhChat.listApplicantChats(token, {
      page: page ? Number(page) : 0,
      filter_unread: filterUnread === 'true',
    });
  }

  @Get('hh/chats/unread')
  async getHhChatsUnreadCount(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    const count = await this.hhChat.getUnreadCount(token);
    return { count };
  }

  @Get('hh/chats/:chatId/messages')
  async getHhChatMessages(
    @CurrentCandidate() candidate: { id: string },
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('order') order?: string,
    @Query('start_message_id') startMessageId?: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhChat.getChatMessages(token, chatId, {
      limit: limit ? Number(limit) : 50,
      order: order === 'next' ? 'next' : 'prev',
      ...(startMessageId && { start_message_id: startMessageId }),
    });
  }

  @Post('hh/chats/:chatId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendHhChatMessage(
    @CurrentCandidate() candidate: { id: string },
    @Param('chatId') chatId: string,
    @Body(
      new ZodValidationPipe(z.object({ text: z.string().min(1).max(4000) })),
    )
    body: { text: string },
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    const idempotencyKey = crypto.randomUUID();
    return this.hhChat.sendChatMessage(
      token,
      chatId,
      body.text,
      idempotencyKey,
    );
  }

  @Put('hh/chats/:chatId/messages/:messageId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markHhChatMessageRead(
    @CurrentCandidate() candidate: { id: string },
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    await this.hhChat.markMessageRead(token, chatId, messageId);
  }

  // ── Candidate Analytics ────────────────────────────────────────────────────

  @Get('analytics')
  async getCandidateAnalytics(@CurrentCandidate() candidate: { id: string }) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [byStatus, recentActivity, inboundCount, topSources] =
      await Promise.all([
        this.db.seekerApplication.groupBy({
          by: ['status'],
          where: { candidateId: candidate.id },
          _count: true,
        }),
        this.db.seekerApplication.findMany({
          where: {
            candidateId: candidate.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { createdAt: true, status: true, source: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.db.application.count({ where: { candidateId: candidate.id } }),
        this.db.seekerApplication.groupBy({
          by: ['source'],
          where: { candidateId: candidate.id },
          _count: true,
          orderBy: { _count: { source: 'desc' } },
          take: 5,
        }),
      ]);

    const statusMap = Object.fromEntries(
      byStatus.map((b) => [b.status, b._count]),
    );
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const applied = statusMap['applied'] ?? 0;
    const interviewed =
      (statusMap['interview'] ?? 0) + (statusMap['phone_interview'] ?? 0);
    const offers = statusMap['offer_made'] ?? 0;

    // Daily bucketed activity for last 30 days
    const dailyMap: Record<string, number> = {};
    for (const app of recentActivity) {
      const day = app.createdAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }

    return {
      total,
      applied,
      interviewed,
      offers,
      rejected: statusMap['rejected'] ?? 0,
      inboundCount,
      responseRate:
        total > 0 ? Math.round(((interviewed + offers) / total) * 100) : 0,
      byStatus: statusMap,
      bySources: Object.fromEntries(
        topSources.map((s) => [s.source, s._count]),
      ),
      dailyActivity: dailyMap,
    };
  }

  // ── LinkedIn OAuth ──────────────────────────────────────────────────────────

  @Get('linkedin/oauth-url')
  getLinkedInOAuthUrl(@CurrentCandidate() candidate: { id: string }) {
    const url = this.linkedInOAuth.getAuthorizationUrl(candidate.id);
    return { url };
  }

  @Post('linkedin/disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectLinkedIn(@CurrentCandidate() candidate: { id: string }) {
    await this.linkedInOAuth.disconnectLinkedIn(candidate.id);
    return { disconnected: true };
  }

  @Post('linkedin/sync')
  @HttpCode(HttpStatus.OK)
  async syncLinkedInProfile(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.linkedInOAuth.getCandidateToken(candidate.id);
    const userInfo = await this.linkedInOAuth.getUserInfo(token);

    const updates: Record<string, unknown> = {};
    const fullName =
      userInfo.given_name || userInfo.family_name
        ? [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ')
        : userInfo.name;

    if (fullName) updates['fullName'] = fullName;

    if (Object.keys(updates).length) {
      await this.db.candidate.update({
        where: { id: candidate.id },
        data: updates,
      });
    }

    return {
      synced: true,
      name: fullName ?? null,
      email: userInfo.email ?? null,
      picture: userInfo.picture ?? null,
    };
  }
}
