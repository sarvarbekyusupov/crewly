import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Prisma, DiscoveredJob } from '@prisma/client';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { SeekerAgent } from '../modules/agents/seeker.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhApplicantService } from '../integrations/hh/hh-applicant.service';
import { HhOAuthService } from '../integrations/hh/hh-oauth.service';
import { LinkedInApplyService } from '../integrations/apply/linkedin-apply.service';
import { TelegramBotService } from '../integrations/telegram/telegram-bot.service';
import { QUEUES } from './queue-names';
import { ConfigService } from '@nestjs/config';

type AutoApplyCandidate = {
  id: string;
  fullName: string | null;
  currentPosition: string | null;
  skills: string[];
  yearsExperience: Prisma.Decimal | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  agentSettings: Prisma.JsonValue | null;
  socialProof: Prisma.JsonValue | null;
};

interface AutoApplyPayload {
  seekerApplicationId: string;
}

@Processor(QUEUES.AUTO_APPLY)
export class AutoApplyProcessor {
  private readonly logger = new Logger(AutoApplyProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: SeekerAgent,
    private readonly hhClient: HhClientService,
    private readonly hhApplicant: HhApplicantService,
    private readonly hhOAuth: HhOAuthService,
    private readonly linkedinApply: LinkedInApplyService,
    private readonly telegram: TelegramBotService,
    private readonly config: ConfigService,
  ) {}

  @Process()
  async handle(job: Job<AutoApplyPayload>) {
    const { seekerApplicationId } = job.data;

    const seekerApp = await this.db.seekerApplication.findUnique({
      where: { id: seekerApplicationId },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            currentPosition: true,
            skills: true,
            yearsExperience: true,
            city: true,
            email: true,
            phone: true,
            agentSettings: true,
            socialProof: true,
          },
        },
        discoveredJob: true,
      },
    });

    if (!seekerApp)
      throw new NonRetryableError(
        `SeekerApplication ${seekerApplicationId} not found`,
      );
    if (seekerApp.status !== 'queued') {
      this.logger.warn(
        { seekerApplicationId, status: seekerApp.status },
        'Application not in queued state — skipping',
      );
      return;
    }

    const candidate = seekerApp.candidate;
    const discoveredJob = seekerApp.discoveredJob;

    // Fetch the match score manually
    const match = await this.db.seekerJobMatch.findUnique({
      where: {
        candidateId_discoveredJobId: {
          candidateId: candidate.id,
          discoveredJobId: discoveredJob.id,
        },
      },
    });

    // Telegram alert applies are explicit user actions — skip agent decision
    if (seekerApp.source === 'telegram_alert') {
      await this.applyTelegram(seekerApplicationId, candidate, discoveredJob);
      return;
    }

    // Seeker Agent decision and drafting
    const agentResult = await this.agent.decideAndDraftApplication(
      {
        name: candidate.fullName ?? 'Applicant',
        skills: candidate.skills,
        experience: Number(candidate.yearsExperience ?? 0),
        settings: (candidate.agentSettings as any) || { auto_apply: true },
        socialProof: candidate.socialProof as Record<string, unknown> | null,
      },
      {
        title: discoveredJob.title,
        company: discoveredJob.company,
        description: discoveredJob.description ?? '',
        matchScore: match?.score ?? 0,
      },
      candidate.id,
    );

    if (!agentResult.should_apply) {
      this.logger.log(
        { seekerApplicationId, reason: agentResult.reason },
        'Seeker Agent decided NOT to apply',
      );
      await this.db.seekerApplication.update({
        where: { id: seekerApplicationId },
        data: { status: 'skipped', error: agentResult.reason },
      });
      return;
    }

    const coverLetter = agentResult.cover_letter || '';

    // Enforce daily application limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.db.seekerApplication.count({
      where: {
        candidateId: candidate.id,
        status: 'applied',
        appliedAt: { gte: today },
      },
    });

    const maxPerDay =
      (
        await this.db.candidate.findUnique({
          where: { id: candidate.id },
          select: { maxApplicationsPerDay: true },
        })
      )?.maxApplicationsPerDay ?? 5;

    if (todayCount >= maxPerDay) {
      this.logger.log(
        { candidateId: candidate.id, todayCount, maxPerDay },
        'Daily limit reached — requeueing tomorrow',
      );
      return;
    }

    // Save cover letter
    await this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: { coverLetter },
    });

    try {
      if (seekerApp.source === 'hh.ru') {
        await this.applyHh(
          seekerApplicationId,
          candidate.id,
          discoveredJob,
          coverLetter,
        );
      } else if (seekerApp.source === 'linkedin') {
        await this.applyLinkedIn(
          seekerApplicationId,
          candidate,
          discoveredJob,
          coverLetter,
        );
      } else {
        throw new NonRetryableError(
          `Unknown apply source: ${seekerApp.source}`,
        );
      }
    } catch (err: any) {
      try {
        await this.db.seekerApplication.update({
          where: { id: seekerApplicationId },
          data: { status: 'failed', error: err.message },
        });
      } catch (dbErr: any) {
        this.logger.error(
          { seekerApplicationId, dbErr: dbErr.message },
          'Failed to mark seekerApplication as failed',
        );
      }
      throw err;
    }
  }

  private async applyHh(
    seekerApplicationId: string,
    candidateId: string,
    discoveredJob: DiscoveredJob,
    coverLetter: string,
  ) {
    const hhCand = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: { hhResumeId: true },
    });
    if (!hhCand?.hhResumeId) {
      throw new NonRetryableError(
        'Candidate has no HH resume linked — cannot auto-apply',
      );
    }
    if (!discoveredJob.externalId) {
      throw new NonRetryableError(
        'HH vacancy has no externalId — cannot apply',
      );
    }
    const token = await this.hhOAuth.getCandidateToken(candidateId);
    const negotiationId = await this.hhApplicant.applyToVacancy(
      token,
      discoveredJob.externalId,
      hhCand.hhResumeId,
      coverLetter || undefined,
    );
    await this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: {
        status: 'applied',
        appliedAt: new Date(),
        error: null,
        ...(negotiationId && { hhNegotiationId: negotiationId }),
      },
    });
    this.logger.log({ seekerApplicationId }, 'HH application complete');
  }

  private async applyLinkedIn(
    seekerApplicationId: string,
    candidate: AutoApplyCandidate,
    discoveredJob: DiscoveredJob,
    coverLetter: string,
  ) {
    const linkedinEmail = this.config.get<string>('LINKEDIN_EMAIL');
    const linkedinPassword = this.config.get<string>('LINKEDIN_PASSWORD');

    const result = await this.linkedinApply.apply({
      jobUrl: discoveredJob.sourceUrl,
      candidateName: candidate.fullName ?? '',
      email: candidate.email ?? '',
      phone: candidate.phone ?? undefined,
      coverLetter,
      linkedinEmail,
      linkedinPassword,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    await this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: {
        status: 'applied',
        appliedAt: new Date(),
        error: null,
      },
    });

    this.logger.log({ seekerApplicationId }, 'LinkedIn application complete');
  }

  private async applyTelegram(
    seekerApplicationId: string,
    candidate: AutoApplyCandidate,
    discoveredJob: DiscoveredJob,
  ) {
    await this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: { status: 'applied', appliedAt: new Date(), error: null },
    });

    const cand = await this.db.candidate.findUnique({
      where: { id: candidate.id },
      select: { telegramUserId: true },
    });

    if (cand?.telegramUserId) {
      const text =
        `✅ *Отклик принят!*\n\n` +
        `Вакансия: *${discoveredJob.title}* — ${discoveredJob.company}\n\n` +
        `Работодатель увидит ваш профиль. Ожидайте обратной связи 👍`;

      await this.telegram
        .sendMessage(cand.telegramUserId.toString(), text, {
          parseMode: 'Markdown',
        })
        .catch((err) => {
          this.logger.warn(
            { seekerApplicationId, error: err.message },
            'Failed to send telegram apply confirmation',
          );
        });
    }

    this.logger.log(
      { seekerApplicationId },
      'Telegram alert application applied',
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { seekerApplicationId: job.data.seekerApplicationId, error: err.message },
      'auto-apply failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
