import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunnerService } from '../llm/prompt-runner.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

interface ExtractedJob {
  isJob: boolean;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  skills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  employmentType?: string;
  workMode?: string;
}

// Rough exchange rates (update periodically or pull from config)
const TO_UZS: Record<string, number> = {
  USD: 12_750,
  RUB: 140,
  UZS: 1,
};

@Injectable()
export class TelegramChannelMonitorService {
  private readonly logger = new Logger(TelegramChannelMonitorService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly llm: PromptRunnerService,
    @InjectQueue(QUEUES.SCORE_SEEKER_JOBS)
    private readonly scoreQueue: Queue,
  ) {}

  async isMonitoredChannel(channelId: bigint): Promise<boolean> {
    const ch = await this.db.telegramChannel.findUnique({
      where: { channelId },
      select: { isActive: true },
    });
    return !!ch?.isActive;
  }

  async processChannelPost(
    channelId: bigint,
    messageId: number,
    text: string,
  ): Promise<void> {
    if (!text || text.trim().length < 30) return;

    const sourceUrl = `tg://channel/${channelId}/${messageId}`;

    // Skip if already processed
    const existing = await this.db.discoveredJob.findUnique({
      where: { sourceUrl },
      select: { id: true },
    });
    if (existing) return;

    let extracted: ExtractedJob;
    try {
      extracted = await this.extractJobFromText(text);
    } catch (err: any) {
      this.logger.warn(
        { channelId: channelId.toString(), messageId, error: err.message },
        'LLM job extraction failed',
      );
      return;
    }

    if (!extracted.isJob || !extracted.title) return;

    const salaryMinUzs = this.toUzs(extracted.salaryMin, extracted.currency);
    const salaryMaxUzs = this.toUzs(extracted.salaryMax, extracted.currency);

    try {
      await this.db.discoveredJob.create({
        data: {
          source: 'telegram',
          sourceUrl,
          externalId: `${channelId}:${messageId}`,
          title: extracted.title,
          company: extracted.company ?? 'Unknown',
          location: extracted.location ?? null,
          description: extracted.description ?? text.slice(0, 2000),
          skills: extracted.skills ?? [],
          salaryMinUzs:
            salaryMinUzs != null ? BigInt(Math.round(salaryMinUzs)) : null,
          salaryMaxUzs:
            salaryMaxUzs != null ? BigInt(Math.round(salaryMaxUzs)) : null,
          employmentType: extracted.employmentType ?? null,
          workMode: extracted.workMode ?? null,
          postedAt: new Date(),
          rawPayload: {
            channelId: channelId.toString(),
            messageId,
            text: text.slice(0, 4000),
          },
        },
      });

      this.logger.log(
        { sourceUrl, title: extracted.title },
        'Saved telegram channel job post',
      );

      await this.triggerScoringForTelegramCandidates();
    } catch (err: any) {
      this.logger.error(
        { sourceUrl, error: err.message },
        'Failed to save telegram channel job',
      );
    }
  }

  private async extractJobFromText(text: string): Promise<ExtractedJob> {
    const result = await this.llm.run(
      'TelegramChannelMonitor:extractJob',
      '1.0',
      'extract_job_from_telegram_post',
      [
        {
          role: 'user',
          content: `Analyze this Telegram message. Determine if it's a job vacancy post. If yes, extract structured info.

Message:
"""
${text.slice(0, 3000)}
"""

Return JSON only:
{
  "isJob": true or false,
  "title": "string or null",
  "company": "string or null",
  "location": "city/country or null",
  "description": "brief summary or null",
  "skills": ["skill1", "skill2"],
  "salaryMin": number or null,
  "salaryMax": number or null,
  "currency": "UZS|USD|RUB or null",
  "employmentType": "full_time|part_time|contract|internship or null",
  "workMode": "office|remote|hybrid or null"
}`,
        },
      ],
      {
        system:
          'You are a job post classifier and extractor. Return only valid JSON, no prose.',
        responseFormat: { type: 'json_object' },
        maxTokens: 800,
        temperature: 0,
        skipAgentIdentity: true,
      },
    );

    try {
      return JSON.parse(result.output);
    } catch {
      return { isJob: false };
    }
  }

  private toUzs(amount: number | undefined, currency?: string): number | null {
    if (amount == null) return null;
    const rate = TO_UZS[currency?.toUpperCase() ?? 'UZS'] ?? 1;
    return amount * rate;
  }

  private async triggerScoringForTelegramCandidates(): Promise<void> {
    const candidates = await this.db.candidate.findMany({
      where: {
        telegramUserId: { not: null },
        deletedAt: null,
        doNotContact: false,
      },
      select: { id: true },
    });

    if (!candidates.length) return;

    for (const { id } of candidates) {
      await this.scoreQueue.add(
        { candidateId: id, limit: 10 },
        { ...LLM_JOB_OPTIONS, jobId: `score-tg-${id}-${Date.now()}` },
      );
    }

    this.logger.log(
      { count: candidates.length },
      'Queued telegram job scoring for active candidates',
    );
  }
}
