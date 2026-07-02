import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

const MIN_ALERT_SCORE = 65;
const MAX_ALERTS_PER_BATCH = 3;

@Injectable()
export class TelegramPipelineHandler implements OnModuleInit {
  private readonly logger = new Logger(TelegramPipelineHandler.name);

  constructor(
    private readonly telegram: TelegramBotService,
    private readonly db: PrismaService,
    private readonly i18n: I18nService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.SEND_OUTREACH) private readonly outreachQueue: Queue,
  ) {}

  onModuleInit() {
    this.telegram.setCallbackHandler(async (chatId, data, messageId) => {
      this.logger.log(`Telegram callback: ${data} from ${chatId}`);

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        this.logger.warn(
          `Failed to parse Telegram callback data as JSON: "${data}"`,
        );
        return;
      }

      const action = parsed.a;
      const applicationId = parsed.i;

      if (action === 'app_scr') {
        await this.outreachQueue.add(
          'send',
          { applicationId },
          LLM_JOB_OPTIONS,
        );
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.i18n.t('bot.approved_for_screening', { lang: 'ru' }),
        );
      } else if (action === 'rej_app') {
        await this.db.application.update({
          where: { id: applicationId },
          data: {
            status: 'rejected_by_client',
            rejectionReason: 'Rejected via Telegram',
          },
        });
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.i18n.t('bot.rejected_candidate', { lang: 'ru' }),
        );
      }
    });
  }

  @OnEvent('candidate.notification')
  async handleCandidateNotification(event: {
    candidateId: string;
    applicationId: string;
    type: 'interview_scheduled' | 'offered' | 'rejected' | 'hired';
  }) {
    try {
      const app = await this.db.application.findUnique({
        where: { id: event.applicationId },
        include: {
          candidate: {
            select: { telegramUserId: true, telegramLanguageCode: true },
          },
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
      });

      if (!app?.candidate?.telegramUserId) return;

      const chatId = app.candidate.telegramUserId.toString();
      const lang = app.candidate.telegramLanguageCode ?? 'ru';
      const job = app.job.title;
      const company = app.job.company.name;

      let message: string;
      switch (event.type) {
        case 'interview_scheduled':
          message = this.i18n.t('bot.notify_interview', {
            lang,
            args: { job, company },
          });
          break;
        case 'offered':
          message = this.i18n.t('bot.notify_offer', {
            lang,
            args: { job, company },
          });
          break;
        case 'rejected':
          message = this.i18n.t('bot.notify_rejected', {
            lang,
            args: { job, company },
          });
          break;
        case 'hired':
          message = this.i18n.t('bot.notify_hired', {
            lang,
            args: { company },
          });
          break;
        default:
          return;
      }

      const publicUrl = this.config.get<string>('PUBLIC_URL') ?? '';
      const appUrl =
        event.type === 'interview_scheduled' || event.type === 'offered'
          ? `${publicUrl}/tma?to=/candidate/tracker`
          : `${publicUrl}/tma?to=/candidate/dashboard`;

      await this.telegram.sendMessage(chatId, message, {
        parseMode: 'Markdown',
        buttons: publicUrl
          ? [
              {
                text: this.i18n.t('bot.open_notification', { lang }),
                webApp: appUrl,
              },
            ]
          : [],
      });
    } catch (err: any) {
      this.logger.error(
        {
          applicationId: event.applicationId,
          type: event.type,
          error: err.message,
        },
        'Failed to send candidate Telegram notification',
      );
    }
  }

  @OnEvent('candidate.event')
  async handleScoringComplete(event: {
    candidateId: string;
    type: string;
    payload: any;
  }) {
    if (event.type !== 'scoring_complete') return;

    try {
      const candidate = await this.db.candidate.findUnique({
        where: { id: event.candidateId },
        select: {
          telegramUserId: true,
          minMatchScore: true,
          telegramLanguageCode: true,
        },
      });

      if (!candidate?.telegramUserId) return;

      const threshold = Math.max(
        candidate.minMatchScore ?? MIN_ALERT_SCORE,
        MIN_ALERT_SCORE,
      );

      // Find top unnotified matches above threshold
      const matches = await this.db.seekerJobMatch.findMany({
        where: {
          candidateId: event.candidateId,
          score: { gte: threshold },
          notifiedAt: null,
        },
        include: {
          discoveredJob: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              salaryMinUzs: true,
              salaryMaxUzs: true,
            },
          },
        },
        orderBy: { score: 'desc' },
        take: MAX_ALERTS_PER_BATCH,
      });

      if (!matches.length) return;

      const chatId = candidate.telegramUserId.toString();
      const lang = candidate.telegramLanguageCode ?? 'ru';
      let text = this.i18n.t('bot.new_matches_header', { lang });

      matches.forEach((m, i) => {
        const j = m.discoveredJob;
        const salaryStr = j.salaryMinUzs
          ? `  💰 ${Number(j.salaryMinUzs).toLocaleString()} UZS${j.salaryMaxUzs ? ` – ${Number(j.salaryMaxUzs).toLocaleString()}` : ''}`
          : '';
        text += `${i + 1}. *${j.title}*\n   🏢 ${j.company}${j.location ? `  📍 ${j.location}` : ''}${salaryStr}\n   ${m.score}%\n\n`;
      });

      text += this.i18n.t('bot.new_matches_footer', { lang });

      const publicUrl = this.config.get<string>('PUBLIC_URL') ?? '';
      await this.telegram.sendMessage(chatId, text, {
        parseMode: 'Markdown',
        buttons: [
          ...matches.map((m, i) => ({
            text: this.i18n.t('bot.match_apply_btn', {
              lang,
              args: { n: i + 1 },
            }),
            callbackData: JSON.stringify({
              a: 'tg_apply',
              i: m.discoveredJob.id,
            }),
          })),
          ...(publicUrl
            ? [
                {
                  text: this.i18n.t('bot.open_in_app', { lang }),
                  webApp: `${publicUrl}/tma?to=/candidate/jobs`,
                },
              ]
            : []),
        ],
      });

      // Mark as notified
      await this.db.seekerJobMatch.updateMany({
        where: { id: { in: matches.map((m) => m.id) } },
        data: { notifiedVia: 'telegram', notifiedAt: new Date() },
      });

      this.logger.log(
        { candidateId: event.candidateId, count: matches.length },
        'Sent job alerts to candidate',
      );
    } catch (err: any) {
      this.logger.error(
        { candidateId: event.candidateId, error: err.message },
        'Failed to send scoring_complete job alerts',
      );
    }
  }

  @OnEvent('job.activated')
  async handleJobActivated(event: { jobId: string; companyId: string }) {
    try {
      const channels = await this.db.telegramChannel.findMany({
        where: { isActive: true },
        select: { channelId: true },
      });
      if (!channels.length) return;

      const job = await this.db.job.findUnique({
        where: { id: event.jobId },
        include: { company: true },
      });
      if (!job) return;

      const botUsername = await this.telegram.getBotUsername();
      const publicUrl =
        this.config.get('PUBLIC_URL') || 'https://crewly.my-hr.ru';
      const applyLink = botUsername
        ? `https://t.me/${botUsername}?start=job_${job.id}`
        : `${publicUrl}/jobs/${job.id}`;

      const salary = job.salaryMinUzs
        ? `\n💰 ${Number(job.salaryMinUzs).toLocaleString()} ${job.salaryCurrency ?? 'UZS'}${job.salaryMaxUzs ? ` — ${Number(job.salaryMaxUzs).toLocaleString()}` : ''}`
        : '';
      const location = job.officeLocation ? `\n📍 ${job.officeLocation}` : '';
      const workMode = job.workMode ? `\n🏠 ${job.workMode}` : '';
      const empType = job.employmentType ? ` · ${job.employmentType}` : '';
      const skills = job.requiredSkills?.length
        ? `\n🔧 *Навыки:* ${job.requiredSkills.slice(0, 6).join(', ')}`
        : '';
      const desc = job.description
        ? `\n\n${job.description.slice(0, 280)}${job.description.length > 280 ? '…' : ''}`
        : '';

      const text =
        `🚀 *${job.title}*\n` +
        `🏢 ${job.company.name}` +
        location +
        salary +
        workMode +
        empType +
        skills +
        desc +
        `\n\n👇 [Откликнуться](${applyLink})`;

      for (const { channelId } of channels) {
        await this.telegram
          .sendMessage(channelId.toString(), text, { parseMode: 'Markdown' })
          .catch((err) => {
            this.logger.warn(
              { channelId: channelId.toString(), error: err.message },
              'Failed to post job to channel',
            );
          });
      }

      this.logger.log(
        { jobId: event.jobId, channels: channels.length },
        'Job posted to Telegram channels',
      );
    } catch (err: any) {
      this.logger.error(
        { jobId: event.jobId, error: err.message },
        'handleJobActivated failed',
      );
    }
  }
}
