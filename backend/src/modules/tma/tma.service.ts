import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES, JOB_NAMES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class TmaService {
  private readonly logger = new Logger(TmaService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.AUTO_APPLY) private readonly autoApplyQueue: Queue,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  validateInitData(initData: string): {
    valid: boolean;
    user?: any;
    authDate?: number;
  } {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not set');

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedHash, 'hex');
      const hashBuf = Buffer.from(hash, 'hex');
      if (
        expectedBuf.length !== hashBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, hashBuf)
      ) {
        return { valid: false };
      }
    } catch {
      return { valid: false };
    }

    const authDate = Number(params.get('auth_date') ?? 0);
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > 86400) return { valid: false };

    let user: any;
    try {
      user = JSON.parse(params.get('user') ?? '{}');
    } catch {
      return { valid: false };
    }

    return { valid: true, user, authDate };
  }

  async auth(
    initData: string,
  ): Promise<{ token: string; role: 'candidate' | 'hr'; profile: any }> {
    const { valid, user } = this.validateInitData(initData);
    if (!valid || !user?.id)
      throw new UnauthorizedException('Invalid Telegram initData');

    const telegramId = String(user.id);
    const secret = this.config.get<string>('JWT_CANDIDATE_SECRET');

    // Try HR first (User model with telegramChatId)
    const hrUser = await this.db.user.findFirst({
      where: { telegramChatId: telegramId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        telegramChatId: true,
      },
    });

    if (hrUser) {
      const token = this.jwt.sign(
        { sub: hrUser.id, type: 'tma_hr', telegramId },
        { secret, expiresIn: '7d' },
      );
      return {
        token,
        role: 'hr',
        profile: {
          id: hrUser.id,
          name: hrUser.fullName,
          email: hrUser.email,
          role: hrUser.role,
        },
      };
    }

    // Candidate: find or create by telegramUserId
    const tgIdBig = BigInt(telegramId);
    let candidate = await this.db.candidate.findFirst({
      where: { telegramUserId: tgIdBig, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        currentPosition: true,
        skills: true,
      },
    });

    if (!candidate) {
      const firstName = user.first_name ?? '';
      const lastName = user.last_name ?? '';
      candidate = await this.db.candidate.create({
        data: {
          telegramUserId: tgIdBig,
          telegramUsername: user.username ?? null,
          fullName: [firstName, lastName].filter(Boolean).join(' ') || null,
          consentStatus: 'implied',
          consentSource: 'telegram_tma',
          consentGivenAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          currentPosition: true,
          skills: true,
        },
      });
      this.logger.log(
        { candidateId: candidate.id, telegramId },
        'Created candidate via TMA',
      );
    }

    const token = this.jwt.sign(
      { sub: candidate.id, type: 'tma_candidate', telegramId },
      { secret, expiresIn: '7d' },
    );

    return {
      token,
      role: 'candidate',
      profile: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        currentPosition: candidate.currentPosition,
        skills: candidate.skills,
      },
    };
  }

  async getCandidateFeed(candidateId: string) {
    const [matches, recentApps] = await Promise.all([
      this.db.seekerJobMatch.findMany({
        where: { candidateId, score: { gte: 50 } },
        include: {
          discoveredJob: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              salaryMinUzs: true,
              salaryMaxUzs: true,
              workMode: true,
              description: true,
              sourceUrl: true,
              postedAt: true,
            },
          },
        },
        orderBy: { score: 'desc' },
        take: 20,
      }),
      this.db.seekerApplication.findMany({
        where: { candidateId },
        select: { discoveredJobId: true },
      }),
    ]);

    const appliedJobIds = new Set(recentApps.map((a) => a.discoveredJobId));

    return matches.map((m) => ({
      matchId: m.id,
      score: m.score,
      applied: appliedJobIds.has(m.discoveredJobId),
      job: {
        ...m.discoveredJob,
        salaryMinUzs: m.discoveredJob.salaryMinUzs
          ? Number(m.discoveredJob.salaryMinUzs)
          : null,
        salaryMaxUzs: m.discoveredJob.salaryMaxUzs
          ? Number(m.discoveredJob.salaryMaxUzs)
          : null,
      },
    }));
  }

  async getCandidateApplications(candidateId: string) {
    const apps = await this.db.seekerApplication.findMany({
      where: { candidateId },
      include: {
        discoveredJob: {
          select: { id: true, title: true, company: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return apps.map((a) => ({
      id: a.id,
      status: a.status,
      source: a.source,
      appliedAt: a.appliedAt,
      createdAt: a.createdAt,
      job: a.discoveredJob
        ? {
            id: a.discoveredJob.id,
            title: a.discoveredJob.title,
            company: a.discoveredJob.company,
            location: a.discoveredJob.location,
          }
        : null,
    }));
  }

  async getCandidateJobDetail(candidateId: string, jobId: string) {
    const [job, match, app] = await Promise.all([
      this.db.discoveredJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          workMode: true,
          description: true,
          salaryMinUzs: true,
          salaryMaxUzs: true,
          skills: true,
          sourceUrl: true,
          postedAt: true,
        },
      }),
      this.db.seekerJobMatch.findUnique({
        where: {
          candidateId_discoveredJobId: { candidateId, discoveredJobId: jobId },
        },
        select: { score: true, strengths: true, gaps: true, explanation: true },
      }),
      this.db.seekerApplication.findFirst({
        where: { candidateId, discoveredJobId: jobId },
        select: { id: true, status: true, appliedAt: true },
      }),
    ]);

    if (!job) throw new NotFoundException('Job not found');

    return {
      ...job,
      salaryMinUzs: job.salaryMinUzs ? Number(job.salaryMinUzs) : null,
      salaryMaxUzs: job.salaryMaxUzs ? Number(job.salaryMaxUzs) : null,
      match: match
        ? {
            score: match.score,
            reasons: {
              strengths: match.strengths,
              gaps: match.gaps,
              explanation: match.explanation,
            },
          }
        : null,
      application: app ?? null,
    };
  }

  async applyToDiscoveredJob(candidateId: string, jobId: string) {
    const job = await this.db.discoveredJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Job not found');

    const existing = await this.db.seekerApplication.findFirst({
      where: { candidateId, discoveredJobId: jobId },
    });
    if (existing)
      return { id: existing.id, status: existing.status, alreadyApplied: true };

    const app = await this.db.seekerApplication.create({
      data: {
        candidateId,
        discoveredJobId: jobId,
        source: 'telegram_tma',
        status: 'queued',
      },
    });

    await this.autoApplyQueue.add(
      { seekerApplicationId: app.id },
      LLM_JOB_OPTIONS,
    );

    return { id: app.id, status: app.status, alreadyApplied: false };
  }

  async getHrPipeline(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId)
      throw new ForbiddenException('No company linked to account');

    const applications = await this.db.application.findMany({
      where: {
        companyId: user.companyId,
        status: {
          in: [
            'matched',
            'outreach_sent',
            'responded',
            'screening',
            'in_review',
            'offered',
          ],
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            currentPosition: true,
            city: true,
            skills: true,
            qualityScore: true,
            resumeFileUrl: true,
          },
        },
        job: { select: { id: true, title: true } },
      },
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return applications.map((a) => ({
      id: a.id,
      status: a.status,
      matchScore: a.matchScore ? Number(a.matchScore) : null,
      createdAt: a.createdAt,
      job: { id: a.job.id, title: a.job.title },
      candidate: {
        ...a.candidate,
        qualityScore: a.candidate.qualityScore
          ? Number(a.candidate.qualityScore)
          : null,
      },
    }));
  }

  async approveApplication(appId: string, userId: string) {
    await this.assertHrOwnsApp(appId, userId);
    await this.outreachQueue.add(
      JOB_NAMES.SEND_OUTREACH,
      { applicationId: appId },
      LLM_JOB_OPTIONS,
    );
    return { queued: true };
  }

  async rejectApplication(appId: string, userId: string, reason?: string) {
    await this.assertHrOwnsApp(appId, userId);
    await this.db.application.update({
      where: { id: appId },
      data: {
        status: 'rejected_by_client',
        rejectionReason: reason ?? 'Rejected via Telegram',
        rejectedAt: new Date(),
      },
    });
    return { rejected: true };
  }

  async getCandidateProfileForHr(appId: string, userId: string) {
    await this.assertHrOwnsApp(appId, userId);
    const app = await this.db.application.findUnique({
      where: { id: appId },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            currentPosition: true,
            currentCompany: true,
            city: true,
            country: true,
            skills: true,
            yearsExperience: true,
            expectedSalaryUzs: true,
            preferredWorkMode: true,
            languages: true,
            qualityScore: true,
            resumeFileUrl: true,
            linkedinUrl: true,
            githubUrl: true,
          },
        },
        job: { select: { id: true, title: true } },
        screenings: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { id: true, status: true, aiAssessment: true },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');

    return {
      applicationId: app.id,
      status: app.status,
      matchScore: app.matchScore ? Number(app.matchScore) : null,
      job: app.job,
      screening: app.screenings[0]
        ? {
            id: app.screenings[0].id,
            status: app.screenings[0].status,
            score: (app.screenings[0].aiAssessment as any)?.score ?? null,
            summary: (app.screenings[0].aiAssessment as any)?.summary ?? null,
          }
        : null,
      candidate: {
        ...app.candidate,
        yearsExperience: app.candidate.yearsExperience
          ? Number(app.candidate.yearsExperience)
          : null,
        expectedSalaryUzs: app.candidate.expectedSalaryUzs
          ? Number(app.candidate.expectedSalaryUzs)
          : null,
        qualityScore: app.candidate.qualityScore
          ? Number(app.candidate.qualityScore)
          : null,
      },
    };
  }

  private async assertHrOwnsApp(appId: string, userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) throw new ForbiddenException('No company linked');

    const app = await this.db.application.findUnique({
      where: { id: appId },
      select: { companyId: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.companyId !== user.companyId)
      throw new ForbiddenException('Application not in your company');
  }
}
