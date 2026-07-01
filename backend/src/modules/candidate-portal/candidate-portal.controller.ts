import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
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
import { HhApplicantService } from '../../integrations/hh/hh-applicant.service';
import { HhJobsAdapter } from '../../integrations/hh/hh-jobs.adapter';
import { LinkedInOAuthService } from '../../integrations/linkedin/linkedin-oauth.service';
import { CoverLetterService } from '../../integrations/apply/cover-letter.service';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CandidateAuthGuard } from '../candidate-auth/guards/candidate-auth.guard';
import { CurrentCandidate } from '../../common/decorators/current-candidate.decorator';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

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
    private readonly hhApplicant: HhApplicantService,
    private readonly hhJobs: HhJobsAdapter,
    private readonly linkedInOAuth: LinkedInOAuthService,
    private readonly coverLetter: CoverLetterService,
    private readonly llm: PromptRunnerService,
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
      telegramUserId:
        p.telegramUserId != null ? String(p.telegramUserId) : null,
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

  @Patch('seeker-applications/:id/cover-letter')
  @HttpCode(HttpStatus.OK)
  async saveCoverLetter(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        z.object({ coverLetter: z.string().min(1).max(10_000) }),
      ),
    )
    body: { coverLetter: string },
  ) {
    const app = await this.db.seekerApplication.findFirst({
      where: { id, candidateId: candidate.id },
    });
    if (!app) throw new BadRequestException('Application not found');
    await this.db.seekerApplication.update({
      where: { id },
      data: { coverLetter: body.coverLetter },
    });
    return { saved: true };
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

  // ── HH Vacancy Search ─────────────────────────────────────────────────────

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

  @Get('hh/me')
  async getHhMe(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhApplicant.getMe(token);
  }

  @Get('hh/vacancies/:id')
  async getHhVacancy(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') vacancyId: string,
  ) {
    const token = await this.hhOAuth.getCandidateToken(candidate.id);
    return this.hhApplicant.getVacancy(token, vacancyId);
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

  // ── HH Vacancy Batch Scoring ───────────────────────────────────────────────

  @Post('hh/vacancies/score')
  @HttpCode(HttpStatus.OK)
  async scoreHhVacancies(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z.object({
          vacancies: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                employer: z.object({ name: z.string() }),
                key_skills: z.array(z.object({ name: z.string() })).optional(),
                experience: z.object({ name: z.string() }).optional(),
                employment: z.object({ name: z.string() }).optional(),
                snippet: z
                  .object({ requirement: z.string().optional() })
                  .optional(),
              }),
            )
            .max(20),
        }),
      ),
    )
    body: {
      vacancies: Array<{
        id: string;
        name: string;
        employer: { name: string };
        key_skills?: { name: string }[];
        experience?: { name: string };
        employment?: { name: string };
        snippet?: { requirement?: string };
      }>;
    },
  ) {
    const c = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidate.id },
      select: {
        currentPosition: true,
        yearsExperience: true,
        skills: true,
        preferredWorkMode: true,
      },
    });

    const vacancyList = body.vacancies
      .map(
        (v, i) =>
          `${i + 1}. ID:${v.id} | "${v.name}" at ${v.employer.name}` +
          (v.experience ? ` | Exp: ${v.experience.name}` : '') +
          (v.key_skills?.length
            ? ` | Skills: ${v.key_skills.map((s) => s.name).join(', ')}`
            : '') +
          (v.snippet?.requirement
            ? ` | Req: ${v.snippet.requirement.replace(/<[^>]+>/g, '').slice(0, 120)}`
            : ''),
      )
      .join('\n');

    const prompt = `You are a job-match scorer. Rate each vacancy 0-100 for fit with this candidate.

Candidate:
- Current role: ${c.currentPosition ?? 'Not specified'}
- Years experience: ${c.yearsExperience ?? '?'}
- Skills: ${c.skills.slice(0, 15).join(', ')}
- Preferred work mode: ${c.preferredWorkMode ?? 'Any'}

Vacancies:
${vacancyList}

Return ONLY a JSON array, no markdown:
[{"vacancyId":"<id>","score":<0-100>,"reason":"<one short sentence>"},...]`;

    const { output } = await this.llm.run(
      'hh_vacancy_score',
      'v1',
      'hh_vacancy_score',
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 800,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      },
      { related_entity_type: 'candidate', related_entity_id: candidate.id },
    );

    try {
      const parsed = JSON.parse(output.trim());
      const scores = Array.isArray(parsed)
        ? parsed
        : (parsed.scores ?? parsed.results ?? []);
      return { scores };
    } catch {
      return { scores: [] };
    }
  }

  // ── AI Generation ──────────────────────────────────────────────────────────

  @Post('generate/cover-letter')
  @HttpCode(HttpStatus.OK)
  async generateCoverLetter(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z.object({
          jobTitle: z.string().min(1).max(200),
          company: z.string().min(1).max(200),
          jobDescription: z.string().max(4000).optional().default(''),
          jobSkills: z
            .array(z.string().max(100))
            .max(20)
            .optional()
            .default([]),
        }),
      ),
    )
    body: {
      jobTitle: string;
      company: string;
      jobDescription: string;
      jobSkills: string[];
    },
  ) {
    const c = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidate.id },
      select: {
        fullName: true,
        currentPosition: true,
        yearsExperience: true,
        city: true,
        skills: true,
      },
    });

    const text = await this.coverLetter.generate({
      candidateName: c.fullName ?? 'Candidate',
      currentPosition: c.currentPosition ?? undefined,
      skills: c.skills,
      yearsExperience: c.yearsExperience?.toString(),
      city: c.city ?? undefined,
      jobTitle: body.jobTitle,
      company: body.company,
      jobDescription: body.jobDescription,
      jobSkills: body.jobSkills,
      candidateId: candidate.id,
    });

    return { coverLetter: text };
  }

  @Post('generate/cv-summary')
  @HttpCode(HttpStatus.OK)
  async generateCvSummary(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z.object({
          jobTitle: z.string().min(1).max(200),
          company: z.string().min(1).max(200),
          jobDescription: z.string().max(4000).optional().default(''),
        }),
      ),
    )
    body: { jobTitle: string; company: string; jobDescription: string },
  ) {
    const c = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidate.id },
      select: {
        fullName: true,
        currentPosition: true,
        yearsExperience: true,
        skills: true,
        rawResumeText: true,
        parsedResume: true,
      },
    });

    const resumeContext = c.rawResumeText
      ? c.rawResumeText.slice(0, 1200)
      : c.parsedResume
        ? JSON.stringify(c.parsedResume).slice(0, 1200)
        : '';

    const prompt = `Write a 3-4 sentence professional CV summary tailored to the target job below.

Candidate profile:
- Name: ${c.fullName ?? 'Candidate'}
- Current role: ${c.currentPosition ?? 'Not specified'}
- Experience: ${c.yearsExperience ?? 'Not specified'} years
- Skills: ${c.skills.slice(0, 12).join(', ')}
${resumeContext ? `- Resume excerpt: ${resumeContext}` : ''}

Target job:
- Title: ${body.jobTitle}
- Company: ${body.company}
${body.jobDescription ? `- Description: ${body.jobDescription.slice(0, 800)}` : ''}

Rules:
- 3-4 sentences only, present tense
- Match keywords from the job description naturally
- Do NOT invent experience not in the profile
- Start with a strong professional identity statement`;

    const { output } = await this.llm.run(
      'cv_summary',
      'v1',
      'cv_summary',
      [{ role: 'user', content: prompt }],
      { maxTokens: 300, temperature: 0.5 },
      { related_entity_type: 'candidate', related_entity_id: candidate.id },
    );

    return { cvSummary: output.trim() };
  }

  // ── Interview Prep ─────────────────────────────────────────────────────────

  @Post('interview-prep')
  @HttpCode(HttpStatus.OK)
  async generateInterviewPrep(
    @CurrentCandidate() candidate: { id: string },
    @Body(
      new ZodValidationPipe(
        z
          .object({
            seekerApplicationId: z.string().uuid().optional(),
            discoveredJobId: z.string().uuid().optional(),
          })
          .refine((d) => d.seekerApplicationId || d.discoveredJobId, {
            message: 'Provide seekerApplicationId or discoveredJobId',
          }),
      ),
    )
    body: { seekerApplicationId?: string; discoveredJobId?: string },
  ) {
    let jobId = body.discoveredJobId;

    if (!jobId && body.seekerApplicationId) {
      const app = await this.db.seekerApplication.findFirst({
        where: { id: body.seekerApplicationId, candidateId: candidate.id },
        select: { discoveredJobId: true },
      });
      if (!app) throw new BadRequestException('Application not found');
      jobId = app.discoveredJobId;
    }

    const [c, job] = await Promise.all([
      this.db.candidate.findUniqueOrThrow({
        where: { id: candidate.id },
        select: {
          currentPosition: true,
          yearsExperience: true,
          skills: true,
        },
      }),
      this.db.discoveredJob.findUniqueOrThrow({
        where: { id: jobId },
        select: { title: true, company: true, description: true, skills: true },
      }),
    ]);

    const prompt = `You are an expert interview coach. Generate interview prep for this specific role.

Candidate:
- Current role: ${c.currentPosition ?? 'Not specified'}
- Experience: ${c.yearsExperience ?? '?'} years
- Skills: ${c.skills.slice(0, 12).join(', ')}

Target role:
- Title: ${job.title}
- Company: ${job.company}
- Required skills: ${job.skills.slice(0, 10).join(', ')}
${job.description ? `- Description: ${job.description.slice(0, 600)}` : ''}

Return a JSON object (no markdown) with this exact structure:
{
  "questions": [
    { "category": "Technical", "question": "...", "tip": "..." },
    { "category": "Technical", "question": "...", "tip": "..." },
    { "category": "Technical", "question": "...", "tip": "..." },
    { "category": "Behavioral", "question": "...", "tip": "..." },
    { "category": "Behavioral", "question": "...", "tip": "..." },
    { "category": "Behavioral", "question": "...", "tip": "..." },
    { "category": "Role-specific", "question": "...", "tip": "..." },
    { "category": "Role-specific", "question": "...", "tip": "..." },
    { "category": "Salary & Logistics", "question": "...", "tip": "..." }
  ],
  "companyResearch": "2-3 sentences on what to research about ${job.company}",
  "salaryNegotiationTip": "One specific sentence for this role"
}`;

    const { output } = await this.llm.run(
      'interview_prep',
      'v1',
      'interview_prep',
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 1200,
        temperature: 0.4,
        responseFormat: { type: 'json_object' },
      },
      { related_entity_type: 'candidate', related_entity_id: candidate.id },
    );

    try {
      return JSON.parse(output.trim());
    } catch {
      return { questions: [], companyResearch: '', salaryNegotiationTip: '' };
    }
  }

  @Get('tracker/summary')
  async getTrackerSummary(@CurrentCandidate() candidate: { id: string }) {
    const [seekerApps, inboundApps] = await Promise.all([
      this.db.seekerApplication.findMany({
        where: { candidateId: candidate.id },
        include: {
          discoveredJob: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              sourceUrl: true,
              workMode: true,
              employmentType: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.application.findMany({
        where: { candidateId: candidate.id },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              workMode: true,
              employmentType: true,
              officeLocation: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { matchedAt: 'desc' },
      }),
    ]);

    type TrackerItem = {
      id: string;
      type: 'seeker' | 'inbound';
      jobTitle: string;
      company: string;
      location: string | null;
      workMode: string | null;
      status: string;
      source: string;
      matchScore: number | string | null;
      applyUrl: string | null;
      coverLetter: string | null;
      seekerApplicationId: string | null;
      discoveredJobId: string | null;
      sourceUrl: string | null;
      applicationId: string | null;
      outreachSentAt: Date | null;
      respondedAt: Date | null;
      interviewScheduledAt: Date | null;
      rejectionReason: string | null;
      activityAt: Date;
      createdAt: Date;
    };

    const seekerItems: TrackerItem[] = seekerApps.map((a) => ({
      id: a.id,
      type: 'seeker',
      jobTitle: a.discoveredJob?.title ?? 'Unknown position',
      company: a.discoveredJob?.company ?? 'Unknown company',
      location: a.discoveredJob?.location ?? null,
      workMode: a.discoveredJob?.workMode ?? null,
      status: a.status,
      source: a.source ?? 'manual',
      matchScore: null,
      applyUrl: a.applyUrl ?? null,
      coverLetter: a.coverLetter ?? null,
      seekerApplicationId: a.id,
      discoveredJobId: a.discoveredJobId ?? null,
      sourceUrl: a.discoveredJob?.sourceUrl ?? null,
      applicationId: null,
      outreachSentAt: null,
      respondedAt: null,
      interviewScheduledAt: null,
      rejectionReason: null,
      activityAt: a.updatedAt,
      createdAt: a.createdAt,
    }));

    const inboundItems: TrackerItem[] = inboundApps.map((a) => ({
      id: a.id,
      type: 'inbound',
      jobTitle: a.job?.title ?? 'Unknown position',
      company: a.job?.company?.name ?? 'Unknown company',
      location: a.job?.officeLocation ?? null,
      workMode: a.job?.workMode ?? null,
      status: a.status,
      source: 'crewly',
      matchScore:
        a.matchScore != null ? parseFloat(a.matchScore.toString()) : null,
      applyUrl: null,
      coverLetter: null,
      seekerApplicationId: null,
      discoveredJobId: null,
      sourceUrl: null,
      applicationId: a.id,
      outreachSentAt: a.outreachSentAt ?? null,
      respondedAt: a.respondedAt ?? null,
      interviewScheduledAt: a.interviewScheduledAt ?? null,
      rejectionReason: a.rejectionReason ?? null,
      activityAt:
        a.outreachSentAt ??
        a.respondedAt ??
        a.interviewScheduledAt ??
        a.matchedAt ??
        a.createdAt,
      createdAt: a.matchedAt ?? a.createdAt,
    }));

    const items = [...seekerItems, ...inboundItems].sort(
      (a, b) => (b.activityAt?.getTime() ?? 0) - (a.activityAt?.getTime() ?? 0),
    );

    return { items, total: items.length };
  }
}
