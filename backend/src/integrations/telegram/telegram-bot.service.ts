import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';

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
  ) {
    const token = config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram disabled');
      return;
    }
    if (!_bot) _bot = new Bot(token);
    this.bot = _bot;
  }

  async onModuleInit() {
    if (!this.bot) return;

    this.bot.command('start', async (ctx) => {
      const username = ctx.from?.username;
      const chatId = String(ctx.chat.id);

      if (username) {
        const user = await this.db.user.findFirst({
          where: { telegramUsername: username, deletedAt: null },
        });
        if (user) {
          await this.db.user.update({
            where: { id: user.id },
            data: { telegramChatId: chatId },
          });
          await ctx.reply(
            `Привет, ${user.fullName}! Ваш аккаунт успешно привязан. Теперь вы будете получать уведомления о новых кандидатах здесь.`,
          );
          return;
        }
      }

      await ctx.reply(
        'Привет! Это AI-рекрутинговое агентство. Чем могу помочь? (Если вы нанимающий менеджер, убедитесь, что ваш username в Telegram совпадает с указанным в профиле My-HR)',
      );
    });

    this.bot.on('callback_query:data', async (ctx) => {
      const chatId = String(ctx.chat?.id);
      const data = ctx.callbackQuery.data;
      const messageId = String(ctx.update.callback_query.message?.message_id);

      if (this.onCallback) {
        await this.onCallback(chatId, data, messageId).catch((err) => {
          this.logger.error(err, 'Failed to handle Telegram callback');
        });
      }
      await ctx.answerCallbackQuery();
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
}
