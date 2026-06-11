import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { ConversationsService } from '../conversations/conversations.service';
import { HhJobsAdapter } from '../../integrations/hh/hh-jobs.adapter';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class CandidatePortalService {
  private readonly logger = new Logger(CandidatePortalService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly s3: S3Service,
    private readonly conv: ConversationsService,
    private readonly hhJobsAdapter: HhJobsAdapter,
    @InjectQueue(QUEUES.PARSE_CANDIDATE) private readonly parseQueue: Queue,
  ) {}

  async getMessages(candidateId: string, applicationId: string) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, candidateId },
    });
    if (!app) throw new NotFoundException('Application not found');

    const conv = await this.db.conversation.findFirst({
      where: { applicationId, candidateId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    });

    return conv?.messages || [];
  }

  async postMessage(
    candidateId: string,
    applicationId: string,
    content: string,
  ) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, candidateId },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.conv.handleWebMessage(applicationId, candidateId, content);
    return { success: true };
  }

  async getProfile(candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate || candidate.deletedAt) throw new NotFoundException();

    const safe = { ...candidate } as any;
    if (candidate.resumeFileUrl) {
      const key = this.s3.extractKey(candidate.resumeFileUrl as string);
      if (key) {
        try {
          safe.resumeFileUrl = await this.s3.getSignedUrl(key, 3600);
        } catch {
          // keep raw public URL if signing fails
        }
      }
    }
    return safe;
  }

  async updateProfile(
    candidateId: string,
    data: {
      fullName?: string;
      phone?: string;
      city?: string;
      country?: string;
      currentPosition?: string;
      currentCompany?: string;
      linkedinUrl?: string;
      githubUrl?: string;
      preferredWorkMode?: string;
      willingToRelocate?: boolean;
      skills?: string[];
      yearsExperience?: number | null;
      noticePeriodDays?: number | null;
      telegramUsername?: string | null;
      parsedResume?: any;
    },
  ) {
    const candidate = await this.db.candidate.update({
      where: { id: candidateId },
      data,
    });
    const { rawResumeText: _rawResumeText, ...safe } = candidate as any;
    return safe;
  }

  async triggerParseCv(candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate || !candidate.rawResumeText) {
      throw new NotFoundException('No raw resume text available to parse');
    }
    await this.db.candidate.update({
      where: { id: candidateId },
      data: { parsedResume: Prisma.DbNull },
    });
    await this.parseQueue.add({ candidateId }, LLM_JOB_OPTIONS);
    return { success: true };
  }

  async updatePreferences(
    candidateId: string,
    prefs: {
      minMatchScore?: number | null;
      blacklistedCompanies?: string[];
      maxApplicationsPerDay?: number;
      preferredWorkMode?: string | null;
      expectedSalaryUzs?: bigint | null;
      hhResumeId?: string | null;
    },
  ) {
    return this.db.candidate.update({
      where: { id: candidateId },
      data: {
        ...(prefs.minMatchScore !== undefined && {
          minMatchScore: prefs.minMatchScore,
        }),
        ...(prefs.blacklistedCompanies !== undefined && {
          blacklistedCompanies: prefs.blacklistedCompanies,
        }),
        ...(prefs.maxApplicationsPerDay !== undefined && {
          maxApplicationsPerDay: prefs.maxApplicationsPerDay,
        }),
        ...(prefs.preferredWorkMode !== undefined && {
          preferredWorkMode: prefs.preferredWorkMode,
        }),
        ...(prefs.expectedSalaryUzs !== undefined && {
          expectedSalaryUzs: prefs.expectedSalaryUzs,
        }),
        ...(prefs.hhResumeId !== undefined && { hhResumeId: prefs.hhResumeId }),
      },
      select: {
        minMatchScore: true,
        blacklistedCompanies: true,
        maxApplicationsPerDay: true,
        preferredWorkMode: true,
        expectedSalaryUzs: true,
        hhResumeId: true,
      },
    });
  }

  async uploadCv(
    candidateId: string,
    buffer: Buffer,
    originalname: string,
    mimetype: string,
  ) {
    const ext = originalname.split('.').pop() ?? 'bin';
    const key = `candidate-cvs/${candidateId}/${Date.now()}.${ext}`;
    const publicUrl = await this.s3.upload(key, buffer, mimetype);
    const signedUrl = publicUrl ? await this.s3.getSignedUrl(key, 3600) : '';

    let rawText = '';
    if (mimetype === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        rawText = parsed.text;
      } catch (err: any) {
        this.logger.warn(
          { candidateId, error: err.message },
          'Failed to parse PDF text',
        );
      }
    }

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        resumeFileUrl: publicUrl || null,
        ...(rawText
          ? { rawResumeText: rawText, parsedResume: Prisma.DbNull }
          : {}),
      },
    });

    if (rawText) {
      await this.parseQueue.add({ candidateId }, LLM_JOB_OPTIONS);
    }

    this.logger.log({ candidateId, key }, 'CV uploaded');
    return { url: signedUrl || publicUrl, uploaded: true, parsing: !!rawText };
  }

  async getDiscoveredJobs(
    candidateId: string,
    filters?: {
      search?: string;
      workMode?: string;
      minScore?: number;
      minSalary?: number;
      sortBy?: 'score' | 'recent';
      page?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: { skills: true, blacklistedCompanies: true, minMatchScore: true },
    });

    const minScore = filters?.minScore ?? candidate?.minMatchScore ?? 0;
    const blacklisted = (candidate?.blacklistedCompanies ?? []).map((c) =>
      c.toLowerCase(),
    );

    const where: any = { status: 'active' };

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.workMode) where.workMode = filters.workMode;
    if (filters?.minSalary)
      where.salaryMinUzs = { gte: BigInt(filters.minSalary) };

    const [allJobs, total] = await Promise.all([
      this.db.discoveredJob.findMany({
        where,
        select: {
          id: true,
          source: true,
          sourceUrl: true,
          title: true,
          company: true,
          location: true,
          skills: true,
          salaryMinUzs: true,
          salaryMaxUzs: true,
          employmentType: true,
          workMode: true,
          postedAt: true,
          discoveredAt: true,
          seekerJobMatches: {
            where: { candidateId },
            select: {
              score: true,
              explanation: true,
              strengths: true,
              gaps: true,
            },
            take: 1,
          },
          seekerApplications: {
            where: { candidateId },
            select: { id: true, status: true },
            take: 1,
          },
        },
        orderBy:
          filters?.sortBy === 'score' ? undefined : { discoveredAt: 'desc' },
        skip: filters?.sortBy === 'score' ? 0 : skip,
        // score sort requires in-memory sort because AI score lives in a joined relation;
        // cap at 500 to bound memory — proper fix needs a denormalized score column
        take: filters?.sortBy === 'score' ? 500 : limit,
      }),
      this.db.discoveredJob.count({ where }),
    ]);

    const candidateSkills = new Set(
      (candidate?.skills ?? []).map((s) => s.toLowerCase()),
    );

    let enriched = allJobs
      .filter((j) => !blacklisted.includes(j.company.toLowerCase()))
      .map((job) => {
        const match = job.seekerJobMatches[0];
        const matchingSkills = job.skills.filter((s) =>
          candidateSkills.has(s.toLowerCase()),
        );
        const skillMatch =
          job.skills.length > 0
            ? Math.round((matchingSkills.length / job.skills.length) * 100)
            : null;
        const aiScore = match?.score ?? null;
        const displayScore = aiScore ?? skillMatch;
        return {
          id: job.id,
          source: job.source,
          sourceUrl: job.sourceUrl,
          title: job.title,
          company: job.company,
          location: job.location,
          skills: job.skills,
          salaryMinUzs: job.salaryMinUzs,
          salaryMaxUzs: job.salaryMaxUzs,
          employmentType: job.employmentType,
          workMode: job.workMode,
          postedAt: job.postedAt,
          discoveredAt: job.discoveredAt,
          aiScore,
          skillMatch,
          displayScore,
          matchExplanation: match?.explanation ?? null,
          matchStrengths: match?.strengths ?? [],
          matchGaps: match?.gaps ?? [],
          application: job.seekerApplications[0] ?? null,
        };
      })
      .filter((j) => (j.displayScore ?? 0) >= minScore);

    if (filters?.sortBy === 'score') {
      enriched = enriched
        .sort((a, b) => (b.displayScore ?? 0) - (a.displayScore ?? 0))
        .slice(skip, skip + limit);
    }

    return { data: enriched, total, page, limit };
  }

  async queueApplication(
    candidateId: string,
    discoveredJobId: string,
  ): Promise<{ id: string; status: string }> {
    const job = await this.db.discoveredJob.findUnique({
      where: { id: discoveredJobId },
    });
    if (!job) throw new NotFoundException('Discovered job not found');

    const existing = await this.db.seekerApplication.findUnique({
      where: { candidateId_discoveredJobId: { candidateId, discoveredJobId } },
    });
    if (existing) throw new ConflictException('Already applied to this job');

    const seekerApp = await this.db.seekerApplication.create({
      data: {
        candidateId,
        discoveredJobId,
        source: job.source,
        status: 'queued',
      },
    });
    return { id: seekerApp.id, status: seekerApp.status };
  }

  async getSeekerApplications(candidateId: string) {
    return this.db.seekerApplication.findMany({
      where: { candidateId },
      include: {
        discoveredJob: {
          select: {
            id: true,
            title: true,
            company: true,
            description: true,
            location: true,
            sourceUrl: true,
            workMode: true,
            employmentType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSeekerApplicationStatus(
    candidateId: string,
    seekerApplicationId: string,
    status: string,
  ) {
    const app = await this.db.seekerApplication.findFirst({
      where: { id: seekerApplicationId, candidateId },
    });
    if (!app) throw new NotFoundException('Application not found');
    return this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: { status },
    });
  }

  async getApplications(candidateId: string) {
    return this.db.application.findMany({
      where: { candidateId },
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
    });
  }

  async getApplication(candidateId: string, applicationId: string) {
    return this.db.application.findFirst({
      where: { id: applicationId, candidateId },
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
    });
  }

  async discoverJobsForCandidate(
    candidateId: string,
    maxPages = 3,
  ): Promise<void> {
    const seeker = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: { currentPosition: true, city: true },
    });

    const query = seeker?.currentPosition ?? undefined;

    const run = await this.db.jobDiscoveryRun.create({
      data: {
        source: 'hh.uz',
        trigger: 'manual',
        query,
        status: 'running',
      },
    });

    let fetched = 0,
      created = 0,
      updated = 0;

    try {
      for (let page = 0; page < maxPages; page++) {
        let result: Awaited<ReturnType<HhJobsAdapter['fetchPage']>>;
        try {
          result = await this.hhJobsAdapter.fetchPage({ query, page });
        } catch (err: any) {
          this.logger.error({ page, error: err.message }, 'HH fetch failed');
          break;
        }

        for (const job of result.jobs) {
          fetched++;
          try {
            const existing = await this.db.discoveredJob.findUnique({
              where: { sourceUrl: job.sourceUrl },
              select: { id: true },
            });
            if (existing) {
              await this.db.discoveredJob.update({
                where: { sourceUrl: job.sourceUrl },
                data: {
                  title: job.title,
                  company: job.company,
                  status: 'active',
                  skills: job.skills,
                  rawPayload: job.rawPayload as any,
                },
              });
              updated++;
            } else {
              await this.db.discoveredJob.create({
                data: {
                  source: 'hh.uz',
                  externalId: job.externalId,
                  sourceUrl: job.sourceUrl,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  description: job.description,
                  skills: job.skills,
                  salaryMinUzs: job.salaryMinUzs,
                  salaryMaxUzs: job.salaryMaxUzs,
                  employmentType: job.employmentType,
                  workMode: job.workMode,
                  postedAt: job.postedAt,
                  rawPayload: job.rawPayload as any,
                },
              });
              created++;
            }
          } catch (err: any) {
            this.logger.warn(
              { sourceUrl: job.sourceUrl, error: err.message },
              'Failed to save job',
            );
          }
        }

        if (!result.hasMore) break;
      }

      await this.db.jobDiscoveryRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          jobsFetched: fetched,
          jobsNew: created,
          jobsUpdated: updated,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        { candidateId, fetched, created, updated },
        'Manual discovery complete',
      );
    } catch (err: any) {
      await this.db.jobDiscoveryRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: err.message, completedAt: new Date() },
      });
      throw err;
    }
  }
}
