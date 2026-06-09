import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CandidateAuthGuard } from '../candidate-auth/guards/candidate-auth.guard';
import { CurrentCandidate } from '../../common/decorators/current-candidate.decorator';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { QUEUES } from '../../workers/queue-names';
import {
  LLM_JOB_OPTIONS,
  INGEST_JOB_OPTIONS,
} from '../../workers/queue-options';

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
  hhResumeId: z.string().max(100).nullable().optional(),
});

type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

@Controller('api/v1/candidate-portal')
@UseGuards(CandidateAuthGuard)
@Public()
@SkipThrottle({ auth: true })
export class CandidatePortalController {
  constructor(
    private readonly portalService: CandidatePortalService,
    private readonly hhSuggests: HhSuggestsService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.SCORE_SEEKER_JOBS) private readonly scoreQueue: Queue,
    @InjectQueue(QUEUES.AUTO_APPLY) private readonly autoApplyQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER_JOBS)
    private readonly discoverJobsQueue: Queue,
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
    if (!file) return { error: 'No file provided' };
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
    await this.discoverJobsQueue.add(
      { source: 'hh.ru', candidateId: candidate.id, maxPages: 3 },
      INGEST_JOB_OPTIONS,
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

  // ── HH Suggests (no auth required) ────────────────────────────────────────

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
}
