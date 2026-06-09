import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { HhClientService } from './hh-client.service';

const HH_EMPLOYER_STATE_MAP: Record<string, string> = {
  consideration: 'outreach_sent',
  invitation: 'screening_passed',
  interview: 'interviewed',
  offer: 'offer_made',
  hired: 'hired',
  discard: 'rejected',
};

const HH_SEEKER_STATE_MAP: Record<string, string> = {
  response: 'applied',
  invitation: 'interview',
  discard: 'rejected',
  discard_after_interview: 'rejected',
  offer: 'offer',
};

export interface HhWebhookPayload {
  type: string;
  created_at: string;
  object_id?: string;
  vacancy?: { id: string };
  resume?: { id: string };
  negotiation?: { id: string };
  state?: { id: string; name: string };
}

const SUBSCRIBED_TYPES = ['NEW_NEGOTIATION', 'NEGOTIATION_STATE_CHANGE'];

@Injectable()
export class HhWebhookService implements OnModuleInit {
  private readonly logger = new Logger(HhWebhookService.name);
  private readonly baseUrl = 'https://api.hh.uz';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly hhClient: HhClientService,
  ) {}

  async onModuleInit() {
    const env = this.config.get<string>('NODE_ENV');
    if (env !== 'production') return;

    const publicUrl = this.config.get<string>('PUBLIC_URL');
    const secret = this.config.get<string>('HH_WEBHOOK_SECRET');
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');

    if (!publicUrl || !secret || !token) {
      this.logger.warn(
        'HH_WEBHOOK_SECRET or PUBLIC_URL not set — skipping webhook registration',
      );
      return;
    }

    const webhookUrl = `${publicUrl}/api/v1/webhooks/hh`;

    try {
      await this.ensureSubscription(webhookUrl, secret, token);
    } catch (err: any) {
      this.logger.error({ err: err.message }, 'HH webhook subscription failed');
    }
  }

  private get authHeaders() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const ua = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    return {
      Authorization: `Bearer ${token}`,
      'User-Agent': ua,
      'HH-User-Agent': ua,
      'Content-Type': 'application/json',
    };
  }

  private async ensureSubscription(
    webhookUrl: string,
    secret: string,
    _token: string,
  ): Promise<void> {
    const existing = await firstValueFrom(
      this.http.get<{ items: Array<{ id: string; url: string }> }>(
        `${this.baseUrl}/webhook/subscriptions`,
        { headers: this.authHeaders },
      ),
    );

    const alreadySubscribed = existing.data.items?.some(
      (s) => s.url === webhookUrl,
    );

    if (alreadySubscribed) {
      this.logger.log({ webhookUrl }, 'HH webhook subscription already active');
      return;
    }

    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/webhook/subscribe`,
        { url: webhookUrl, types: SUBSCRIBED_TYPES, secret },
        { headers: this.authHeaders },
      ),
    );

    this.logger.log(
      { webhookUrl, types: SUBSCRIBED_TYPES },
      'HH webhook registered',
    );
  }

  async handleEvent(payload: HhWebhookPayload): Promise<void> {
    switch (payload.type) {
      case 'NEW_NEGOTIATION':
        await this.handleNewNegotiation(payload);
        break;
      case 'NEGOTIATION_STATE_CHANGE':
        await this.handleStateChange(payload);
        break;
      default:
        this.logger.debug({ type: payload.type }, 'Unhandled HH webhook type');
    }
  }

  private async handleNewNegotiation(payload: HhWebhookPayload): Promise<void> {
    const negotiationId = payload.negotiation?.id ?? payload.object_id;
    const vacancyId = payload.vacancy?.id;
    const resumeId = payload.resume?.id;

    if (!negotiationId || !vacancyId || !resumeId) {
      this.logger.warn({ payload }, 'NEW_NEGOTIATION missing ids');
      return;
    }

    const existing = await this.db.application.findFirst({
      where: { hhNegotiationId: negotiationId },
      select: { id: true },
    });
    if (existing) return;

    const job = await this.db.job.findFirst({
      where: { hhVacancyId: vacancyId },
      select: { id: true, companyId: true },
    });
    if (!job) {
      this.logger.warn({ vacancyId }, 'No job found for HH vacancy');
      return;
    }

    let candidate = await this.db.candidate.findFirst({
      where: { externalId: resumeId },
      select: { id: true },
    });

    if (!candidate) {
      try {
        const resume = await this.hhClient.getResume(resumeId);
        const fullName =
          [resume.first_name, resume.last_name].filter(Boolean).join(' ') ||
          null;
        candidate = await this.db.candidate.create({
          data: {
            externalId: resumeId,
            fullName,
            currentPosition: resume.title,
            skills: resume.skill_set ?? [],
            yearsExperience: resume.total_experience
              ? Math.round(resume.total_experience.months / 12)
              : undefined,
          },
          select: { id: true },
        });
      } catch (err: any) {
        this.logger.warn(
          { resumeId, err: err.message },
          'Resume fetch failed — skipping NEW_NEGOTIATION',
        );
        return;
      }
    }

    await this.db.application.upsert({
      where: {
        jobId_candidateId: { jobId: job.id, candidateId: candidate.id },
      },
      create: {
        jobId: job.id,
        candidateId: candidate.id,
        companyId: job.companyId,
        status: 'applied',
        hhNegotiationId: negotiationId,
      },
      update: { hhNegotiationId: negotiationId },
      select: { id: true },
    });

    this.logger.log(
      { negotiationId, vacancyId, resumeId },
      'HH new application created via webhook',
    );
  }

  private async handleStateChange(payload: HhWebhookPayload): Promise<void> {
    const negotiationId = payload.negotiation?.id ?? payload.object_id;
    const stateId = payload.state?.id;

    if (!negotiationId || !stateId) {
      this.logger.warn({ payload }, 'NEGOTIATION_STATE_CHANGE missing ids');
      return;
    }

    // Try employer-side application first
    const employerApp = await this.db.application.findFirst({
      where: { hhNegotiationId: negotiationId },
      select: { id: true, status: true },
    });

    if (employerApp) {
      const newStatus = HH_EMPLOYER_STATE_MAP[stateId];
      if (newStatus && newStatus !== employerApp.status) {
        await this.db.application.update({
          where: { id: employerApp.id },
          data: { status: newStatus },
        });
        this.logger.log(
          { negotiationId, stateId, newStatus },
          'HH employer application status updated via webhook',
        );
      }
      return;
    }

    // Seeker-side application
    const seekerApp = await this.db.seekerApplication.findFirst({
      where: { hhNegotiationId: negotiationId },
      select: { id: true, status: true },
    });

    if (seekerApp) {
      const newStatus = HH_SEEKER_STATE_MAP[stateId];
      if (newStatus && newStatus !== seekerApp.status) {
        await this.db.seekerApplication.update({
          where: { id: seekerApp.id },
          data: { status: newStatus },
        });
        this.logger.log(
          { negotiationId, stateId, newStatus },
          'HH seeker application status updated via webhook',
        );
      }
    }
  }
}
