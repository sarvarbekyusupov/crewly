import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { NonRetryableError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { SeekerAgent } from '../modules/agents/seeker.agent';
import { HhApplyService } from '../integrations/apply/hh-apply.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhTokenService } from '../integrations/hh/hh-token.service';
import { LinkedInApplyService } from '../integrations/apply/linkedin-apply.service';
import { QUEUES } from './queue-names';
import { ConfigService } from '@nestjs/config';

interface AutoApplyPayload {
  seekerApplicationId: string;
}

@Processor(QUEUES.AUTO_APPLY)
export class AutoApplyProcessor {
  private readonly logger = new Logger(AutoApplyProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly agent: SeekerAgent,
    private readonly hhApply: HhApplyService,
    private readonly hhClient: HhClientService,
    private readonly hhToken: HhTokenService,
    private readonly linkedinApply: LinkedInApplyService,
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
            hhResumeId: true,
            hhOauthToken: true,
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

    // Seeker Agent decision and drafting
    const agentResult = await this.agent.decideAndDraftApplication(
      {
        name: candidate.fullName ?? 'Applicant',
        skills: candidate.skills,
        experience: Number(candidate.yearsExperience ?? 0),
        settings: (candidate.agentSettings as any) || { auto_apply: true },
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
      // Leave status as queued — the job will be retried or picked up next day
      return;
    }

    // For HH.ru: validate vacancy before the LLM cover letter call (saves cost)
    if (seekerApp.source === 'hh.ru') {
      if (!candidate.hhOauthToken) {
        throw new NonRetryableError(
          `Candidate ${candidate.id} has no hhOauthToken — cannot apply to HH`,
        );
      }
      const urlMatch = discoveredJob.sourceUrl.match(/\/vacancy\/(\d+)/);
      if (!urlMatch) {
        throw new NonRetryableError(
          `Cannot extract vacancy ID from URL: ${discoveredJob.sourceUrl}`,
        );
      }
      const vacancyDetail = await this.hhClient.getVacancyDetail(urlMatch[1]);
      if (vacancyDetail.type.id === 'direct') {
        throw new NonRetryableError(
          `Vacancy ${urlMatch[1]} is a direct vacancy — HH API apply not supported`,
        );
      }
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
          candidate,
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
      await this.db.seekerApplication.update({
        where: { id: seekerApplicationId },
        data: { status: 'failed', error: err.message },
      });
      throw err;
    }
  }

  private async applyHh(
    seekerApplicationId: string,
    candidate: any,
    discoveredJob: any,
    coverLetter: string,
  ) {
    // Get a fresh token (auto-refreshes if near expiry)
    const hhOauthToken = await this.hhToken.getValidToken(candidate.id);

    // Resolve resume ID if not cached
    let hhResumeId = candidate.hhResumeId ?? undefined;
    if (!hhResumeId) {
      const resolved = await this.hhApply.getResumeId(hhOauthToken);
      hhResumeId = resolved ?? undefined;
      if (hhResumeId) {
        await this.db.candidate.update({
          where: { id: candidate.id },
          data: { hhResumeId },
        });
      }
    }
    if (!hhResumeId) {
      throw new NonRetryableError('Could not find HH resume for candidate');
    }

    // Vacancy ID was already extracted and validated in handle()
    const match = discoveredJob.sourceUrl.match(/\/vacancy\/(\d+)/);
    const vacancyId = match![1];

    const result = await this.hhApply.apply({
      vacancyId,
      hhOauthToken,
      hhResumeId,
      coverLetter,
    });

    await this.db.seekerApplication.update({
      where: { id: seekerApplicationId },
      data: {
        status: 'applied',
        hhNegotiationId: result.negotiationId,
        appliedAt: new Date(),
        error: null,
      },
    });

    this.logger.log(
      { seekerApplicationId, negotiationId: result.negotiationId },
      'HH application complete',
    );
  }

  private async applyLinkedIn(
    seekerApplicationId: string,
    candidate: any,
    discoveredJob: any,
    coverLetter: string,
  ) {
    const linkedinEmail = this.config.get<string>('LINKEDIN_EMAIL');
    const linkedinPassword = this.config.get<string>('LINKEDIN_PASSWORD');

    const result = await this.linkedinApply.apply({
      jobUrl: discoveredJob.sourceUrl,
      candidateName: candidate.fullName ?? '',
      email: candidate.email ?? '',
      phone: candidate.phone,
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

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { seekerApplicationId: job.data.seekerApplicationId, error: err.message },
      'auto-apply failed',
    );
    if (err instanceof NonRetryableError) job.discard().catch(() => {});
  }
}
