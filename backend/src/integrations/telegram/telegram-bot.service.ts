import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PDFParse } from 'pdf-parse';
import * as Sentry from '@sentry/nestjs';
import OpenAI, { toFile } from 'openai';
import { S3Service } from '../storage/s3.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';
import { TelegramChannelMonitorService } from './telegram-channel-monitor.service';

type OutgoingMessage = {
  text?: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: Array<{ text: string; callbackData: string }>;
};

// Keep bot instance outside class so it survives HMR in dev
let _bot: Bot | null = null;

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot;
  private readonly openai: OpenAI | null = null;
  private cachedBotUsername: string | null = null;

  // Injected by app.module after Conversations module is ready
  private onMessage?: (
    chatId: string,
    text: string,
    messageId: string,
  ) => Promise<void>;

  private onCallback?: (
    chatId: string,
    data: string,
    messageId: string,
  ) => Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly s3: S3Service,
    private readonly i18n: I18nService,
    private readonly channelMonitor: TelegramChannelMonitorService,
    private readonly jwt: JwtService,
    @InjectQueue(QUEUES.PARSE_CANDIDATE) private readonly parseQueue: Queue,
    @InjectQueue(QUEUES.ADVANCE_SCREENING)
    private readonly screeningQueue: Queue,
    @InjectQueue(QUEUES.AUTO_APPLY) private readonly autoApplyQueue: Queue,
  ) {
    const token = config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram disabled');
      return;
    }
    if (!_bot) _bot = new Bot(token);
    this.bot = _bot;

    const openaiKey = config.get<string>('OPENAI_API_KEY');
    this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
    if (!this.openai) {
      this.logger.warn(
        'OPENAI_API_KEY not set — voice/video transcriptions will fail',
      );
    }
  }

  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    if (!this.openai) {
      this.logger.warn('OPENAI_API_KEY not set — transcription skipped');
      throw new ServiceUnavailableException(
        'Transcription service not configured',
      );
    }

    try {
      const file = await toFile(buffer, filename);
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return response.text;
    } catch (err: any) {
      this.logger.error(
        { filename, error: err.message },
        'Whisper transcription failed',
      );
      throw err;
    }
  }

  private getLang(ctx: any): string {
    const code = ctx.from?.language_code?.toLowerCase();
    if (code === 'uz') return 'uz';
    if (code === 'en') return 'en';
    return 'ru'; // default
  }

  async getDashboardData(user: any) {
    const activeJobs = await this.db.job.count({
      where: { companyId: user.companyId, status: 'active', deletedAt: null },
    });

    const pendingCount = await this.db.application.count({
      where: {
        companyId: user.companyId,
        status: { in: ['matched', 'queued_outreach'] },
      },
    });

    const screeningCount = await this.db.application.count({
      where: {
        companyId: user.companyId,
        status: { in: ['screening', 'responded'] },
      },
    });

    const readyCount = await this.db.application.count({
      where: {
        companyId: user.companyId,
        status: { in: ['screened_pass', 'interview_scheduled'] },
      },
    });

    const text =
      `📊 *Панель управления My-HR*\nКомпания: *${user.company.name}*\n\n` +
      `💼 Активные вакансии: *${activeJobs}*\n` +
      `🎯 Кандидаты на согласовании (New): *${pendingCount}*\n` +
      `💬 В процессе AI-интервью: *${screeningCount}*\n` +
      `✅ Завершили интервью (Ready): *${readyCount}*\n\n` +
      `Выберите раздел ниже для управления:`;

    const keyboard = new InlineKeyboard()
      .text('📋 Новые кандидаты', JSON.stringify({ a: 'v_new', p: 0 }))
      .text('💬 На интервью', JSON.stringify({ a: 'v_scr', p: 0 }))
      .row()
      .webApp(
        '🖥️ Веб-панель (TMA)',
        `${this.config.get('PUBLIC_URL') || 'https://crewly.my-hr.ru'}/tma`,
      )
      .row()
      .text('🔄 Обновить', JSON.stringify({ a: 'dash' }));

    return { text, keyboard };
  }

  async onModuleInit() {
    if (!this.bot) return;

    this.bot.catch((err) => {
      this.logger.error(err, 'Telegram bot error');
      Sentry.captureException(err.error);
    });

    this.bot.command('start', async (ctx) => {
      const username = ctx.from?.username;
      const chatId = String(ctx.chat.id);
      const match = ctx.match; // Deep link payload e.g. "job_xxxxxx"
      const lang = this.getLang(ctx);

      if (username) {
        const user = await this.db.user.findFirst({
          where: { telegramUsername: username, deletedAt: null },
        });
        if (user) {
          await this.db.user.update({
            where: { id: user.id },
            data: { telegramChatId: chatId },
          });
          const welcomeMsg = this.i18n.t('bot.welcome_manager', {
            lang,
            args: { fullName: user.fullName },
          });
          await ctx.reply(welcomeMsg);
          return;
        }
      }

      // HR Telegram account link via JWT deep-link
      if (match && match.startsWith('link_')) {
        const code = match.slice(5);
        const secret = this.config.get<string>('JWT_ACCESS_SECRET');
        try {
          const payload = secret
            ? this.jwt.verify<{ sub: string; type: string }>(code, { secret })
            : null;
          if (payload?.type === 'tg_link') {
            await this.db.user.update({
              where: { id: payload.sub },
              data: { telegramChatId: chatId },
            });
            await ctx.reply(
              '✅ Telegram успешно привязан к вашему аккаунту My-HR!',
            );
          } else {
            await ctx.reply(
              '❌ Недействительная или устаревшая ссылка. Попробуйте снова.',
            );
          }
        } catch {
          await ctx.reply(
            '❌ Ссылка устарела (15 мин). Сгенерируйте новую в настройках.',
          );
        }
        return;
      }

      // Check if candidate deep-linked to a job
      if (match && match.startsWith('job_')) {
        const jobId = match.slice(4);
        try {
          const job = await this.db.job.findUnique({
            where: { id: jobId, deletedAt: null },
            include: { company: true },
          });
          if (job) {
            await this.setPendingJob(chatId, jobId);
            const deepLinkMsg = this.i18n.t('bot.deep_link_welcome', {
              lang,
              args: { title: job.title, companyName: job.company.name },
            });
            await ctx.reply(deepLinkMsg, { parse_mode: 'Markdown' });
            return;
          }
        } catch (err) {
          this.logger.error(
            { jobId, err },
            'Failed to look up deep-linked job',
          );
        }
      }

      // Default start: list active jobs if any
      try {
        const activeJobs = await this.db.job.findMany({
          where: { status: 'active', deletedAt: null },
          include: { company: true },
          take: 5,
        });

        if (activeJobs.length > 0) {
          const keyboard = new InlineKeyboard();
          activeJobs.forEach((job) => {
            keyboard
              .text(
                `${job.title} (${job.company.name})`,
                JSON.stringify({ a: 'sel_job', i: job.id }),
              )
              .row();
          });

          const welcomeJobsMsg = this.i18n.t('bot.default_welcome_jobs', {
            lang,
          });
          await ctx.reply(welcomeJobsMsg, { reply_markup: keyboard });
          return;
        }
      } catch (err) {
        this.logger.error(err, 'Failed to fetch active jobs for /start');
      }

      const welcomeNoJobsMsg = this.i18n.t('bot.default_welcome_no_jobs', {
        lang,
      });
      await ctx.reply(welcomeNoJobsMsg);
    });

    // Manager dashboard commands
    this.bot.command(['dashboard', 'pipeline'], async (ctx) => {
      const chatId = String(ctx.chat.id);
      const lang = this.getLang(ctx);
      const user = await this.db.user.findFirst({
        where: { telegramChatId: chatId, deletedAt: null },
        include: { company: true },
      });

      if (!user) {
        const accessDeniedMsg = this.i18n.t('bot.manager_access_denied', {
          lang,
        });
        await ctx.reply(accessDeniedMsg);
        return;
      }

      const { text, keyboard } = await this.getDashboardData(user);
      await ctx.reply(text, { reply_markup: keyboard, parse_mode: 'Markdown' });
    });

    // App Detail listener
    this.bot.hears(/^\/app_(.+)$/, async (ctx) => {
      const chatId = String(ctx.chat.id);
      const appId = ctx.match[1];
      const lang = this.getLang(ctx);

      const user = await this.db.user.findFirst({
        where: { telegramChatId: chatId, deletedAt: null },
      });

      if (!user) {
        await ctx.reply(this.i18n.t('bot.access_denied', { lang }));
        return;
      }

      try {
        const app = await this.db.application.findFirst({
          where: { id: appId, companyId: user.companyId },
          include: { candidate: true, job: true },
        });

        if (!app) {
          await ctx.reply(this.i18n.t('bot.app_not_found', { lang }));
          return;
        }

        const cand = app.candidate;
        const expStr = cand.yearsExperience
          ? this.i18n.t('bot.years_format', {
              lang,
              args: { count: cand.yearsExperience },
            })
          : this.i18n.t('bot.not_specified', { lang });

        let details = this.i18n.t('bot.candidate_card', {
          lang,
          args: {
            fullName:
              cand.fullName || this.i18n.t('bot.not_specified', { lang }),
            jobTitle: app.job.title,
            status: app.status,
            experience: expStr,
            city: cand.city || this.i18n.t('bot.not_specified', { lang }),
          },
        });

        if (app.matchScore) {
          details += this.i18n.t('bot.ai_match', {
            lang,
            args: { score: app.matchScore },
          });
        }

        if (app.matchRecommendation) {
          details += this.i18n.t('bot.ai_recommendation', {
            lang,
            args: { recommendation: app.matchRecommendation },
          });
        }

        const keyboard = new InlineKeyboard();

        if (['matched', 'queued_outreach'].includes(app.status)) {
          keyboard
            .text(
              this.i18n.t('bot.approve_btn', { lang }),
              JSON.stringify({ a: 'app_scr', i: app.id }),
            )
            .row();
          keyboard
            .text(
              this.i18n.t('bot.reject_btn', { lang }),
              JSON.stringify({ a: 'rej_app', i: app.id }),
            )
            .row();
        }

        keyboard.text(
          this.i18n.t('bot.menu_btn', { lang }),
          JSON.stringify({ a: 'dash' }),
        );

        await ctx.reply(details, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      } catch (err: any) {
        this.logger.error(
          { appId, error: err.message },
          'Failed to fetch candidate details',
        );
        await ctx.reply(this.i18n.t('bot.error_loading_app', { lang }));
      }
    });

    this.bot.on('callback_query:data', async (ctx) => {
      const chatId = String(ctx.chat?.id);
      const data = ctx.callbackQuery.data;
      const messageId = String(ctx.update.callback_query.message?.message_id);
      const lang = this.getLang(ctx);

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        // Delegate to setCallbackHandler if it's not JSON (e.g. for legacy strings)
        if (this.onCallback) {
          await this.onCallback(chatId, data, messageId).catch((err) => {
            this.logger.error(err, 'Failed to handle Telegram legacy callback');
          });
        }
        await ctx.answerCallbackQuery();
        return;
      }

      const action = parsed.a;

      // Handle job selection callbacks directly
      if (action === 'sel_job') {
        const jobId = parsed.i;
        try {
          const job = await this.db.job.findUnique({
            where: { id: jobId },
            include: { company: true },
          });
          if (job) {
            await this.setPendingJob(chatId, jobId);
            const selectedMsg = this.i18n.t('bot.selected_job', {
              lang,
              args: { title: job.title, companyName: job.company.name },
            });
            await ctx.editMessageText(selectedMsg, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          this.logger.error(
            { jobId, err },
            'Failed to select job from callback',
          );
        }
        await ctx.answerCallbackQuery();
        return;
      }

      // One-tap apply from job alert (discovered job)
      if (action === 'tg_apply') {
        const discoveredJobId = parsed.i;
        const candidate = await this.db.candidate.findFirst({
          where: { telegramUserId: BigInt(chatId), deletedAt: null },
          select: { id: true, rawResumeText: true },
        });

        if (!candidate) {
          await ctx.answerCallbackQuery(
            'Профиль не найден. Сначала отправьте резюме.',
          );
          return;
        }

        const existing = await this.db.seekerApplication.findUnique({
          where: {
            candidateId_discoveredJobId: {
              candidateId: candidate.id,
              discoveredJobId,
            },
          },
          select: { id: true, status: true },
        });

        if (existing) {
          await ctx.answerCallbackQuery('Вы уже откликнулись на эту вакансию!');
          return;
        }

        if (!candidate.rawResumeText) {
          await ctx.answerCallbackQuery();
          await ctx.reply(
            lang === 'en'
              ? 'Please send your CV (PDF) first — then you can apply in one tap!'
              : 'Сначала отправьте резюме (PDF), чтобы откликнуться одним нажатием!',
          );
          await this.setPendingJob(chatId, `discovered:${discoveredJobId}`);
          return;
        }

        const newSeekerApp = await this.db.seekerApplication.create({
          data: {
            candidateId: candidate.id,
            discoveredJobId,
            source: 'telegram_alert',
            status: 'queued',
          },
        });

        await this.autoApplyQueue.add(
          { seekerApplicationId: newSeekerApp.id },
          LLM_JOB_OPTIONS,
        );

        await ctx.answerCallbackQuery('✅ Отклик отправлен!');
        await ctx.editMessageReplyMarkup({
          reply_markup: new InlineKeyboard(),
        });
        return;
      }

      // Channel management (HR only)
      if (action === 'rm_ch' || action === 'act_ch') {
        const hrUser = await this.db.user.findFirst({
          where: { telegramChatId: chatId, deletedAt: null },
        });
        if (!hrUser) {
          await ctx.answerCallbackQuery('Доступ запрещен.');
          return;
        }
        await this.db.telegramChannel.update({
          where: { id: parsed.i },
          data: { isActive: action === 'act_ch' },
        });
        await ctx.answerCallbackQuery(
          action === 'act_ch' ? '✅ Канал включён' : '❌ Канал отключён',
        );
        await ctx.deleteMessage().catch(() => {});
        return;
      }

      // Handle back to dashboard callback
      if (action === 'dash') {
        const user = await this.db.user.findFirst({
          where: { telegramChatId: chatId, deletedAt: null },
          include: { company: true },
        });
        if (!user) {
          await ctx.answerCallbackQuery('Доступ запрещен');
          return;
        }
        const { text, keyboard } = await this.getDashboardData(user);
        await ctx.editMessageText(text, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
        await ctx.answerCallbackQuery();
        return;
      }

      // Handle view matched / screening lists with pagination
      if (action === 'v_new' || action === 'v_scr') {
        const page = parsed.p;

        const user = await this.db.user.findFirst({
          where: { telegramChatId: chatId, deletedAt: null },
        });
        if (!user) {
          await ctx.answerCallbackQuery('Доступ запрещен');
          return;
        }

        const statusFilter =
          action === 'v_new'
            ? ['matched', 'queued_outreach']
            : ['screening', 'responded'];
        const total = await this.db.application.count({
          where: { companyId: user.companyId, status: { in: statusFilter } },
        });

        const apps = await this.db.application.findMany({
          where: { companyId: user.companyId, status: { in: statusFilter } },
          include: { candidate: true, job: true },
          orderBy: { matchedAt: 'desc' },
          skip: page * 5,
          take: 5,
        });

        let msgText =
          action === 'v_new'
            ? `📋 *Кандидаты на согласовании* (Стр. ${page + 1} из ${Math.ceil(total / 5) || 1})\n\n`
            : `💬 *Кандидаты на интервью* (Стр. ${page + 1} из ${Math.ceil(total / 5) || 1})\n\n`;

        if (apps.length === 0) {
          msgText += 'Нет кандидатов в этом разделе.';
        } else {
          apps.forEach((app, idx) => {
            const num = page * 5 + idx + 1;
            const score = app.matchScore
              ? `(Совпадение: ${app.matchScore}%)`
              : '';
            msgText += `${num}. *${app.candidate.fullName || 'Без имени'}*\n   Вакансия: ${app.job.title} ${score}\n   Подробнее: /app_${app.id}\n\n`;
          });
        }

        const keyboard = new InlineKeyboard();
        if (page > 0) {
          keyboard.text('◀️ Назад', JSON.stringify({ a: action, p: page - 1 }));
        }
        if ((page + 1) * 5 < total) {
          keyboard.text(
            'Вперед ▶️',
            JSON.stringify({ a: action, p: page + 1 }),
          );
        }
        keyboard.row().text('🏠 В меню', JSON.stringify({ a: 'dash' }));

        await ctx.editMessageText(msgText, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
        await ctx.answerCallbackQuery();
        return;
      }

      if (this.onCallback) {
        await this.onCallback(chatId, data, messageId).catch((err) => {
          this.logger.error(err, 'Failed to handle Telegram callback');
        });
      }
      await ctx.answerCallbackQuery();
    });

    // Handle PDF resume uploads
    this.bot.on('message:document', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const doc = ctx.message.document;
      const fileName = doc.file_name ?? '';
      const mimeType = doc.mime_type ?? '';
      const lang = this.getLang(ctx);

      if (
        mimeType !== 'application/pdf' &&
        !fileName.toLowerCase().endsWith('.pdf')
      ) {
        await ctx.reply(this.i18n.t('bot.pdf_only', { lang }));
        return;
      }

      const statusMsg = await ctx.reply(
        this.i18n.t('bot.got_resume', { lang }),
      );

      try {
        const file = await ctx.api.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${this.config.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;

        const response = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);

        // Extract text using pdf-parse
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        const rawText = parsed.text;

        if (!rawText || rawText.trim().length < 50) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            this.i18n.t('bot.pdf_parse_failed', { lang }),
          );
          return;
        }

        // S3 upload if configured
        let s3Url: string | null = null;
        try {
          const key = `candidate-cvs/telegram-${chatId}/${Date.now()}.pdf`;
          s3Url = await this.s3.upload(key, buffer, 'application/pdf');
        } catch (s3Err: any) {
          this.logger.warn(
            { chatId, error: s3Err.message },
            'Failed to upload telegram CV to S3',
          );
        }

        // Look up or create candidate
        let candidate = await this.db.candidate.findFirst({
          where: {
            OR: [
              { telegramUserId: BigInt(chatId) },
              ...(ctx.from?.username
                ? [{ telegramUsername: ctx.from.username }]
                : []),
            ],
          },
        });

        if (candidate) {
          candidate = await this.db.candidate.update({
            where: { id: candidate.id },
            data: {
              telegramUserId: BigInt(chatId),
              telegramUsername: ctx.from?.username ?? null,
              rawResumeText: rawText,
              resumeFileUrl: s3Url || candidate.resumeFileUrl,
              parsedResume: Prisma.DbNull,
            },
          });
        } else {
          candidate = await this.db.candidate.create({
            data: {
              telegramUserId: BigInt(chatId),
              telegramUsername: ctx.from?.username ?? null,
              rawResumeText: rawText,
              resumeFileUrl: s3Url,
              parsedResume: Prisma.DbNull,
            },
          });
        }

        // Resolve Job ID
        let jobId = await this.getPendingJob(chatId);

        // Handle one-tap apply flow: candidate had no resume, sent PDF after prompt
        if (jobId?.startsWith('discovered:')) {
          const discoveredJobId = jobId.slice('discovered:'.length);
          await this.clearPendingJob(chatId);
          await this.parseQueue.add(
            { candidateId: candidate.id },
            LLM_JOB_OPTIONS,
          );
          const existingSeekerApp = await this.db.seekerApplication.findUnique({
            where: {
              candidateId_discoveredJobId: {
                candidateId: candidate.id,
                discoveredJobId,
              },
            },
            select: { id: true },
          });
          if (!existingSeekerApp) {
            await this.db.seekerApplication.create({
              data: {
                candidateId: candidate.id,
                discoveredJobId,
                source: 'telegram_alert',
                status: 'queued',
              },
            });
          }
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            lang === 'en'
              ? '✅ CV received! Your application has been submitted.'
              : '✅ Резюме получено! Отклик отправлен.',
          );
          return;
        }

        if (!jobId) {
          const latestJob = await this.db.job.findFirst({
            where: { status: 'active', deletedAt: null },
            orderBy: { createdAt: 'desc' },
          });
          if (latestJob) {
            jobId = latestJob.id;
          }
        }

        if (!jobId) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            this.i18n.t('bot.no_active_jobs_resume', { lang }),
          );
          await this.parseQueue.add(
            { candidateId: candidate.id },
            LLM_JOB_OPTIONS,
          );
          return;
        }

        const job = await this.db.job.findUnique({
          where: { id: jobId },
          include: { company: true },
        });

        if (!job) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            this.i18n.t('bot.job_link_failed', { lang }),
          );
          return;
        }

        // Check duplicate application
        const existingApp = await this.db.application.findUnique({
          where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
        });

        if (existingApp) {
          const duplicateMsg = this.i18n.t('bot.duplicate_application', {
            lang,
            args: { title: job.title, companyName: job.company.name },
          });
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            duplicateMsg,
            { parse_mode: 'Markdown' },
          );
          return;
        }

        // Create new Application
        const application = await this.db.application.create({
          data: {
            jobId,
            candidateId: candidate.id,
            companyId: job.companyId,
            status: 'screening',
          },
        });

        // Trigger parse & matching
        await this.parseQueue.add(
          { candidateId: candidate.id },
          LLM_JOB_OPTIONS,
        );

        // Create conversation
        const conversation = await this.db.conversation.create({
          data: {
            applicationId: application.id,
            candidateId: candidate.id,
            channel: 'telegram',
            channelThreadId: chatId,
            state: 'in_progress',
            language: lang,
          },
        });

        // Create screening — store TG message ID for DB-backed progress tracking
        await this.db.screening.create({
          data: {
            applicationId: application.id,
            conversationId: conversation.id,
            promptVersion: 'v1',
            language: lang,
            status: 'in_progress',
            telegramStatusMessageId: String(statusMsg.message_id),
          },
        });

        await this.clearPendingJob(chatId);
      } catch (err: any) {
        this.logger.error(
          { chatId, error: err.message },
          'Failed to process resume upload',
        );
        await ctx.api.editMessageText(
          chatId,
          statusMsg.message_id,
          this.i18n.t('bot.processing_resume_failed', { lang }),
        );
      }
    });

    // Handle Voice Notes
    this.bot.on('message:voice', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const voice = ctx.message.voice;
      const messageId = String(ctx.message.message_id);
      const lang = this.getLang(ctx);

      // Verify active conversation
      const activeConv = await this.db.conversation.findFirst({
        where: {
          channel: 'telegram',
          channelThreadId: chatId,
          state: { not: 'completed' },
        },
      });

      if (!activeConv) {
        await ctx.reply(
          this.i18n.t('bot.voice_video_no_conversation', { lang }),
        );
        return;
      }

      const statusMsg = await ctx.reply(
        this.i18n.t('bot.recognizing_voice', { lang }),
      );

      try {
        const file = await ctx.api.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${this.config.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;

        const response = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);

        const transcription = await this.transcribeAudio(buffer, 'voice.ogg');

        if (!transcription || transcription.trim().length === 0) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            this.i18n.t('bot.voice_parsing_failed', { lang }),
          );
          return;
        }

        await ctx.api
          .deleteMessage(chatId, statusMsg.message_id)
          .catch(() => {});

        const prefixedText = `🎤 [Голосовое сообщение]: ${transcription}`;

        if (this.onMessage) {
          await this.onMessage(chatId, prefixedText, messageId).catch((err) => {
            this.logger.error(err, 'Failed to handle Telegram voice message');
          });
        }
      } catch (err: any) {
        this.logger.error(
          { chatId, error: err.message },
          'Failed to process voice note',
        );
        await ctx.api.editMessageText(
          chatId,
          statusMsg.message_id,
          this.i18n.t('bot.voice_error', { lang }),
        );
      }
    });

    // Handle Video Notes (Circles)
    this.bot.on('message:video_note', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const videoNote = ctx.message.video_note;
      const messageId = String(ctx.message.message_id);
      const lang = this.getLang(ctx);

      // Verify active conversation
      const activeConv = await this.db.conversation.findFirst({
        where: {
          channel: 'telegram',
          channelThreadId: chatId,
          state: { not: 'completed' },
        },
      });

      if (!activeConv) {
        await ctx.reply(
          this.i18n.t('bot.voice_video_no_conversation', { lang }),
        );
        return;
      }

      const statusMsg = await ctx.reply(
        this.i18n.t('bot.recognizing_video', { lang }),
      );

      try {
        const file = await ctx.api.getFile(videoNote.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${this.config.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;

        const response = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);

        const transcription = await this.transcribeAudio(buffer, 'video.mp4');

        if (!transcription || transcription.trim().length === 0) {
          await ctx.api.editMessageText(
            chatId,
            statusMsg.message_id,
            this.i18n.t('bot.video_parsing_failed', { lang }),
          );
          return;
        }

        await ctx.api
          .deleteMessage(chatId, statusMsg.message_id)
          .catch(() => {});

        const prefixedText = `📹 [Видео-кружок]: ${transcription}`;

        if (this.onMessage) {
          await this.onMessage(chatId, prefixedText, messageId).catch((err) => {
            this.logger.error(
              err,
              'Failed to handle Telegram video note message',
            );
          });
        }
      } catch (err: any) {
        this.logger.error(
          { chatId, error: err.message },
          'Failed to process video note',
        );
        await ctx.api.editMessageText(
          chatId,
          statusMsg.message_id,
          this.i18n.t('bot.video_error', { lang }),
        );
      }
    });

    // Channel post monitoring — extract jobs from joined job channels
    this.bot.on('channel_post:text', async (ctx) => {
      const channelId = BigInt(ctx.chat.id);
      const messageId = ctx.channelPost.message_id;
      const text = ctx.channelPost.text ?? '';

      const monitored = await this.channelMonitor
        .isMonitoredChannel(channelId)
        .catch(() => false);
      if (!monitored) return;

      await this.channelMonitor
        .processChannelPost(channelId, messageId, text)
        .catch((err) => {
          this.logger.error(
            { channelId: channelId.toString(), messageId, error: err.message },
            'Channel job extraction failed',
          );
        });
    });

    // Auto-register/deregister channels when bot is added/removed
    this.bot.on('my_chat_member', async (ctx) => {
      const chat = ctx.chat;
      if (chat.type !== 'channel') return;

      const channelId = BigInt(chat.id);
      const newStatus = ctx.update.my_chat_member.new_chat_member.status;
      const isActive = ['administrator', 'member'].includes(newStatus);

      await this.db.telegramChannel
        .upsert({
          where: { channelId },
          create: {
            channelId,
            channelName: 'title' in chat ? (chat as any).title : undefined,
            isActive,
          },
          update: {
            isActive,
            channelName: 'title' in chat ? (chat as any).title : undefined,
          },
        })
        .catch((err) => {
          this.logger.error(
            { channelId: channelId.toString(), error: err.message },
            'Failed to upsert telegram channel',
          );
        });

      this.logger.log(
        { channelId: channelId.toString(), isActive },
        `Bot ${isActive ? 'joined' : 'left'} channel`,
      );
    });

    // HR: /listchannels — manage monitored channels
    this.bot.command('listchannels', async (ctx) => {
      const chatId = String(ctx.chat.id);

      const user = await this.db.user.findFirst({
        where: { telegramChatId: chatId, deletedAt: null },
      });
      if (!user) {
        await ctx.reply('Доступ запрещен.');
        return;
      }

      const channels = await this.db.telegramChannel.findMany({
        orderBy: { addedAt: 'desc' },
      });

      if (!channels.length) {
        await ctx.reply(
          '📡 Нет подключённых каналов.\n\nДобавьте бота как администратора в любой Telegram-канал с вакансиями — он автоматически начнёт мониторинг.',
        );
        return;
      }

      const keyboard = new InlineKeyboard();
      let text = '📡 *Мониторируемые каналы:*\n\n';

      channels.forEach((ch, i) => {
        const status = ch.isActive ? '🟢' : '🔴';
        const name = ch.channelName ?? `ID: ${ch.channelId}`;
        text += `${i + 1}. ${status} ${name}\n`;
        keyboard
          .text(
            ch.isActive ? `❌ Отключить: ${name}` : `✅ Включить: ${name}`,
            JSON.stringify({ a: ch.isActive ? 'rm_ch' : 'act_ch', i: ch.id }),
          )
          .row();
      });

      await ctx.reply(text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    });

    // Candidate: /subscribe — enable job alerts
    this.bot.command('subscribe', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const lang = this.getLang(ctx);

      const candidate = await this.db.candidate.findFirst({
        where: { telegramUserId: BigInt(chatId), deletedAt: null },
      });

      if (!candidate) {
        await ctx.reply(
          lang === 'uz'
            ? 'Avval rezyumengizni yuboring. Biz sizni topamiz!'
            : lang === 'en'
              ? 'Please send your CV first so we can match you to jobs.'
              : 'Сначала отправьте резюме — тогда мы начнём подбирать вам вакансии.',
        );
        return;
      }

      await this.db.candidate.update({
        where: { id: candidate.id },
        data: { minMatchScore: candidate.minMatchScore ?? 65 },
      });

      await ctx.reply(
        lang === 'uz'
          ? `✅ Ish o'rinlari bo'yicha xabarnomalar yoqildi! Siz ${candidate.minMatchScore ?? 65}% va undan yuqori mos keladigan ish o'rinlari haqida xabar olasiz.\n\nBekor qilish: /unsubscribe`
          : lang === 'en'
            ? `✅ Job alerts enabled! You'll be notified of matches scoring ${candidate.minMatchScore ?? 65}%+.\n\nTo disable: /unsubscribe`
            : `✅ Уведомления о вакансиях включены! Вы будете получать подборки с совпадением ${candidate.minMatchScore ?? 65}%+.\n\nОтключить: /unsubscribe`,
      );
    });

    // Candidate: /unsubscribe — disable job alerts
    this.bot.command('unsubscribe', async (ctx) => {
      const chatId = String(ctx.chat.id);

      await this.db.candidate.updateMany({
        where: { telegramUserId: BigInt(chatId), deletedAt: null },
        data: { minMatchScore: null },
      });

      await ctx.reply(
        '🔕 Уведомления о вакансиях отключены. /subscribe — чтобы включить снова.',
      );
    });

    // Candidate: /mymatches — show top scored job matches
    this.bot.command('mymatches', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const lang = this.getLang(ctx);

      const candidate = await this.db.candidate.findFirst({
        where: { telegramUserId: BigInt(chatId), deletedAt: null },
        select: { id: true },
      });

      if (!candidate) {
        await ctx.reply(
          lang === 'en'
            ? 'No profile found. Send your CV to get started.'
            : 'Профиль не найден. Отправьте резюме для начала.',
        );
        return;
      }

      const matches = await this.db.seekerJobMatch.findMany({
        where: { candidateId: candidate.id, score: { gte: 50 } },
        include: { discoveredJob: true },
        orderBy: { score: 'desc' },
        take: 5,
      });

      if (!matches.length) {
        await ctx.reply(
          lang === 'en'
            ? 'No job matches yet. Check back soon!'
            : 'Пока нет подходящих вакансий. Загляните позже!',
        );
        return;
      }

      const keyboard = new InlineKeyboard();
      let text =
        lang === 'en'
          ? `🎯 *Your top job matches:*\n\n`
          : `🎯 *Ваши лучшие совпадения:*\n\n`;

      matches.forEach((m, i) => {
        const j = m.discoveredJob;
        text += `${i + 1}. *${j.title}* — ${j.company}\n   📍 ${j.location ?? '—'}  |  Совпадение: *${m.score}%*\n\n`;
        keyboard
          .text(
            `${i + 1}. Откликнуться`,
            JSON.stringify({ a: 'tg_apply', i: j.id }),
          )
          .row();
      });

      await ctx.reply(text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    });

    // Candidate: /myapps — show application statuses
    this.bot.command('myapps', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const lang = this.getLang(ctx);

      const candidate = await this.db.candidate.findFirst({
        where: { telegramUserId: BigInt(chatId), deletedAt: null },
        select: { id: true },
      });

      if (!candidate) {
        await ctx.reply('Профиль не найден. Отправьте резюме для начала.');
        return;
      }

      const apps = await this.db.application.findMany({
        where: { candidateId: candidate.id },
        include: {
          job: { select: { title: true, company: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });

      if (!apps.length) {
        await ctx.reply(
          lang === 'en'
            ? 'No applications yet. Send your CV to apply!'
            : 'Откликов пока нет. Отправьте резюме, чтобы откликнуться!',
        );
        return;
      }

      const statusLabel: Record<string, string> = {
        screening: '💬 AI-интервью',
        responded: '💬 AI-интервью',
        matched: '✅ На согласовании',
        queued_outreach: '📨 Отправка предложения',
        screened_pass: '🟢 Прошёл интервью',
        interview_scheduled: '📅 Интервью назначено',
        rejected_by_client: '❌ Отказ',
        rejected_by_ai: '❌ Не подошёл',
        hired: '🎉 Нанят!',
      };

      let text =
        lang === 'en'
          ? `📋 *Your applications:*\n\n`
          : `📋 *Ваши отклики:*\n\n`;

      apps.forEach((a, i) => {
        const label = statusLabel[a.status] ?? a.status;
        text += `${i + 1}. *${a.job.title}* — ${a.job.company.name}\n   ${label}\n\n`;
      });

      await ctx.reply(text, { parse_mode: 'Markdown' });
    });

    this.bot.on('message:text', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const text = ctx.message.text;
      const messageId = String(ctx.message.message_id);

      if (this.onMessage) {
        await this.onMessage(chatId, text, messageId).catch((err) => {
          this.logger.error(err, 'Failed to handle Telegram message');
        });
      }
    });

    if (this.config.get('NODE_ENV') === 'production') {
      const webhookUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL');
      const webhookSecret =
        this.config.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '';
      if (webhookUrl) {
        await this.bot.api.setWebhook(webhookUrl, {
          secret_token: webhookSecret,
        });
        this.logger.log(`Telegram webhook auto-set to ${webhookUrl}`);
      } else {
        this.logger.warn(
          'TELEGRAM_WEBHOOK_URL not set — webhook not configured in production',
        );
      }
    } else {
      // Dev: long polling
      this.bot.start({ drop_pending_updates: true }).catch((err) => {
        this.logger.error(err, 'Telegram polling error');
      });
      this.logger.log('Telegram bot started in polling mode');
    }
  }

  @OnEvent('candidate.event')
  async handleCandidateEvent(event: {
    candidateId: string;
    type: string;
    payload: any;
  }) {
    if (event.type !== 'resume_parse_progress') return;

    // DB-backed lookup — survives restarts
    const screening = await this.db.screening.findFirst({
      where: {
        telegramStatusMessageId: { not: null },
        status: 'in_progress',
        application: { candidateId: event.candidateId },
      },
      select: {
        id: true,
        applicationId: true,
        telegramStatusMessageId: true,
        application: {
          select: {
            id: true,
            job: {
              select: { title: true, company: { select: { name: true } } },
            },
            conversations: {
              where: { channel: 'telegram' },
              select: { channelThreadId: true, language: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!screening) return;

    const conv = screening.application.conversations[0];
    if (!conv?.channelThreadId) return;

    const chatId = conv.channelThreadId;
    const messageId = Number(screening.telegramStatusMessageId);
    const lang = conv.language ?? 'ru';
    const jobTitle = screening.application.job.title;
    const companyName = screening.application.job.company.name;
    const status = event.payload.status;

    try {
      if (status === 'parsing') {
        const text =
          this.i18n.t('bot.parsing_resume_text', { lang }) ??
          'Разбираю текст вашего резюме... 📖';
        await this.editMessage(chatId, messageId, text);
      } else if (status === 'embedding') {
        const text =
          this.i18n.t('bot.matching_resume_text', { lang }) ??
          'Анализирую навыки и соответствие вакансии... 🎯';
        await this.editMessage(chatId, messageId, text);
      } else if (status === 'embedding_done') {
        const finalMsg =
          this.i18n.t('bot.application_created', {
            lang,
            args: { title: jobTitle, companyName },
          }) ??
          `Отлично! Резюме принято на вакансию *${jobTitle}* (${companyName}).\n\nСейчас наш AI-рекрутер начнет собеседование прямо здесь. Пожалуйста, ответьте на его первое сообщение! 👇`;

        const publicUrl =
          this.config.get('PUBLIC_URL') || 'https://crewly.my-hr.ru';
        const keyboard = new InlineKeyboard().webApp(
          this.i18n.t('bot.web_chat_btn', { lang }) ?? '🖥️ Веб-чат (TMA)',
          `${publicUrl}/candidate/chat/${screening.applicationId}`,
        );

        if (this.bot) {
          await this.bot.api.editMessageText(
            Number(chatId),
            messageId,
            finalMsg,
            { reply_markup: keyboard, parse_mode: 'Markdown' },
          );
        }

        await this.screeningQueue.add(
          { screeningId: screening.id },
          { ...LLM_JOB_OPTIONS, jobId: `screening-${screening.id}` },
        );

        // Clear so we don't re-process on future events
        await this.db.screening.update({
          where: { id: screening.id },
          data: { telegramStatusMessageId: null },
        });
      }
    } catch (err: any) {
      this.logger.error(
        { candidateId: event.candidateId, status, error: err.message },
        'Failed to report parse progress to Telegram',
      );
    }
  }

  setMessageHandler(
    handler: (chatId: string, text: string, messageId: string) => Promise<void>,
  ) {
    this.onMessage = handler;
  }

  setCallbackHandler(
    handler: (chatId: string, data: string, messageId: string) => Promise<void>,
  ) {
    this.onCallback = handler;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    opts?: OutgoingMessage,
  ) {
    if (!this.bot)
      throw new ServiceUnavailableException('Telegram bot not configured');

    let reply_markup: InlineKeyboard | undefined;
    if (opts?.buttons?.length) {
      reply_markup = new InlineKeyboard();
      opts.buttons.forEach((b) => {
        reply_markup!.text(b.text, b.callbackData);
      });
    }

    await this.bot.api.sendMessage(Number(chatId), text, {
      parse_mode: opts?.parseMode,
      reply_markup,
    });
  }

  async editMessage(
    chatId: number | string,
    messageId: number | string,
    text: string,
  ) {
    if (!this.bot) return;
    await this.bot.api.editMessageText(Number(chatId), Number(messageId), text);
  }

  async setWebhook(url: string, secret: string) {
    if (!this.bot) return;
    await this.bot.api.setWebhook(url, { secret_token: secret });
    this.logger.log(`Telegram webhook set to ${url}`);
  }

  async handleUpdate(update: any) {
    if (!this.bot) return;
    await this.bot.handleUpdate(update);
  }

  async getBotUsername(): Promise<string | null> {
    if (!this.bot) return null;
    if (!this.cachedBotUsername) {
      const me = await this.bot.api.getMe();
      this.cachedBotUsername = me.username ?? null;
    }
    return this.cachedBotUsername;
  }

  private async setPendingJob(chatId: string, jobId: string): Promise<void> {
    await this.db.telegramPendingJob.upsert({
      where: { chatId },
      create: { chatId, jobId },
      update: { jobId },
    });
  }

  private async getPendingJob(chatId: string): Promise<string | null> {
    const row = await this.db.telegramPendingJob.findUnique({
      where: { chatId },
      select: { jobId: true },
    });
    return row?.jobId ?? null;
  }

  private async clearPendingJob(chatId: string): Promise<void> {
    await this.db.telegramPendingJob
      .delete({ where: { chatId } })
      .catch(() => {});
  }
}
