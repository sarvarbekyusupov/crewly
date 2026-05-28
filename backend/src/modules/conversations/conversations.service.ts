import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramBotService } from '../../integrations/telegram/telegram-bot.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly telegram: TelegramBotService,
    private readonly emitter: EventEmitter2,
    @InjectQueue(QUEUES.ADVANCE_SCREENING)
    private readonly screeningQueue: Queue,
  ) {}

  async findAll(
    companyId: string,
    applicationId?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      application: { companyId },
      ...(applicationId ? { applicationId } : {}),
    };
    const [data, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          application: { select: { id: true, status: true, jobId: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.conversation.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(companyId: string, conversationId: string) {
    const conv = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        application: {
          select: { id: true, companyId: true, status: true, jobId: true },
        },
      },
    });
    if (!conv || (conv.application as any).companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }
    return conv;
  }

  async findByApplication(applicationId: string) {
    return this.db.conversation.findMany({
      where: { applicationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string) {
    const conv = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  // Called by Telegram webhook when candidate sends a message
  async handleIncomingMessage(opts: {
    channel: string;
    channelThreadId: string;
    content: string;
    channelMessageId?: string;
  }) {
    const conv = await this.db.conversation.findFirst({
      where: {
        channel: opts.channel,
        channelThreadId: opts.channelThreadId,
        state: { not: 'completed' },
      },
      include: { screenings: { where: { status: 'in_progress' }, take: 1 } },
    });

    if (!conv) return null;

    // Resolve companyId once for SSE events
    const application = await this.db.application.findUnique({
      where: { id: conv.applicationId },
      select: { companyId: true },
    });

    if (this.isWithdrawal(opts.content)) {
      const now = new Date();
      await this.db.conversation.update({
        where: { id: conv.id },
        data: { state: 'abandoned', lastMessageAt: now },
      });
      await this.db.application.update({
        where: { id: conv.applicationId },
        data: {
          status: 'withdrew',
          withdrawalReason: opts.content.slice(0, 500),
        },
      });
      await this.db.$transaction([
        this.db.candidate.update({
          where: { id: conv.candidateId },
          data: {
            doNotContact: true,
            consentStatus: 'withdrawn',
            consentWithdrawnAt: now,
          },
        }),
        this.db.consentRecord.create({
          data: {
            candidateId: conv.candidateId,
            action: 'withdrawn',
            basis: 'candidate_request',
          },
        }),
      ]);
      return conv;
    }

    await this.db.message.create({
      data: {
        conversationId: conv.id,
        direction: 'inbound',
        sender: 'candidate',
        content: opts.content,
        channelMessageId: opts.channelMessageId,
        delivered: true,
      },
    });

    await this.db.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date(), state: 'in_progress' },
    });

    if (application?.companyId) {
      this.emitter.emit('company.event', {
        type: 'new_message',
        companyId: application.companyId,
        payload: { conversationId: conv.id },
      });
    }

    // Update application status on first response + auto-start screening
    const app = await this.db.application.findUnique({
      where: { id: conv.applicationId },
    });
    if (app?.status === 'outreach_sent' || app?.status === 'outreach_opened') {
      await this.db.application.update({
        where: { id: conv.applicationId },
        data: { status: 'responded', respondedAt: new Date() },
      });

      // Mark the most recent outreach attempt as replied
      await this.db.outreachAttempt.updateMany({
        where: {
          applicationId: conv.applicationId,
          status: { in: ['sent', 'opened'] },
        },
        data: { status: 'replied', repliedAt: new Date() },
      });

      // Auto-create screening linked to this conversation so AI interview begins immediately
      if (!conv.screenings[0]) {
        const screening = await this.db.screening.create({
          data: {
            applicationId: conv.applicationId,
            conversationId: conv.id,
            promptVersion: 'v1',
            language: 'ru',
            status: 'in_progress',
          },
        });
        await this.db.application.update({
          where: { id: conv.applicationId },
          data: { status: 'screening' },
        });
        await this.screeningQueue.add(
          { screeningId: screening.id },
          { ...LLM_JOB_OPTIONS, jobId: `screening-${screening.id}` },
        );
        return conv;
      }
    }

    // Advance existing in-progress screening on subsequent messages
    const screening = conv.screenings[0];
    if (screening) {
      await this.screeningQueue.add(
        { screeningId: screening.id },
        { ...LLM_JOB_OPTIONS, jobId: `screening-${screening.id}` },
      );
    }

    return conv;
  }

  // Web interface inbound messages
  async handleWebMessage(applicationId: string, candidateId: string, content: string) {
    let conv: any = await this.db.conversation.findFirst({
      where: {
        applicationId,
        candidateId,
      },
      include: { screenings: { where: { status: 'in_progress' }, take: 1 } },
      orderBy: { startedAt: 'desc' }
    });

    if (!conv) {
      conv = await this.db.conversation.create({
        data: {
          applicationId,
          candidateId,
          channel: 'web',
          channelThreadId: `web-${candidateId}`,
          state: 'in_progress',
        },
        include: { screenings: { where: { status: 'in_progress' }, take: 1 } },
      });
    }

    if (conv.state === 'completed') {
      // Re-open conversation
      await this.db.conversation.update({
        where: { id: conv.id },
        data: { state: 'in_progress' }
      });
    }

    // Process logic similar to Telegram inbound message
    const application = await this.db.application.findUnique({
      where: { id: conv.applicationId },
      select: { companyId: true },
    });

    if (this.isWithdrawal(content)) {
      const now = new Date();
      await this.db.conversation.update({
        where: { id: conv.id },
        data: { state: 'abandoned', lastMessageAt: now },
      });
      await this.db.application.update({
        where: { id: conv.applicationId },
        data: {
          status: 'withdrew',
          withdrawalReason: content.slice(0, 500),
        },
      });
      await this.db.$transaction([
        this.db.candidate.update({
          where: { id: conv.candidateId },
          data: {
            doNotContact: true,
            consentStatus: 'withdrawn',
            consentWithdrawnAt: now,
          },
        }),
        this.db.consentRecord.create({
          data: {
            candidateId: conv.candidateId,
            action: 'withdrawn',
            basis: 'candidate_request',
          },
        }),
      ]);
      return conv;
    }

    await this.db.message.create({
      data: {
        conversationId: conv.id,
        direction: 'inbound',
        sender: 'candidate',
        content,
        delivered: true,
      },
    });

    await this.db.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date(), state: 'in_progress' },
    });

    if (application?.companyId) {
      this.emitter.emit('company.event', {
        type: 'new_message',
        companyId: application.companyId,
        payload: { conversationId: conv.id },
      });
    }

    // Update application status on first response + auto-start screening
    const app = await this.db.application.findUnique({
      where: { id: conv.applicationId },
    });
    
    if (app?.status === 'outreach_sent' || app?.status === 'outreach_opened' || app?.status === 'matched') {
      await this.db.application.update({
        where: { id: conv.applicationId },
        data: { status: 'responded', respondedAt: new Date() },
      });

      await this.db.outreachAttempt.updateMany({
        where: {
          applicationId: conv.applicationId,
          status: { in: ['sent', 'opened'] },
        },
        data: { status: 'replied', repliedAt: new Date() },
      });

      if (!conv.screenings || !conv.screenings[0]) {
        const screening = await this.db.screening.create({
          data: {
            applicationId: conv.applicationId,
            conversationId: conv.id,
            promptVersion: 'v1',
            language: 'ru',
            status: 'in_progress',
          },
        });
        await this.db.application.update({
          where: { id: conv.applicationId },
          data: { status: 'screening' },
        });
        await this.screeningQueue.add(
          { screeningId: screening.id },
          { ...LLM_JOB_OPTIONS, jobId: `screening-${screening.id}` },
        );
        return conv;
      }
    }

    const screening = conv.screenings?.[0];
    if (screening) {
      await this.screeningQueue.add(
        { screeningId: screening.id },
        { ...LLM_JOB_OPTIONS, jobId: `screening-${screening.id}` },
      );
    }

    return conv;
  }

  async sendRecruiterMessage(
    companyId: string,
    conversationId: string,
    content: string,
  ) {
    const conv = await this.findOne(companyId, conversationId);

    const message = await this.db.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        sender: 'recruiter',
        content,
      },
    });

    await this.db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    if (conv.channel === 'telegram' && conv.channelThreadId) {
      await this.telegram.sendMessage(Number(conv.channelThreadId), content);
    }

    return message;
  }

  // Check if candidate message is a withdrawal signal.
  // Deliberately specific to avoid false positives from common phrases like "не хочу".
  isWithdrawal(text: string): boolean {
    const strongSignals = [
      'не интересует вакансия',
      'не интересует позиция',
      'не интересует данная',
      'отказываюсь',
      'откажусь от',
      'удалите меня',
      'не беспокойте',
      'прошу удалить',
      'уберите меня',
      'отписаться',
      'отпишите меня',
    ];
    const lower = text.toLowerCase();
    if (strongSignals.some((s) => lower.includes(s))) return true;
    // Require "stop" as a standalone word (not inside another word)
    if (/\bstop\b/i.test(lower)) return true;
    // "не интересует" alone (without context) only counts if it's short — standalone decline
    if (lower.length < 40 && lower.includes('не интересует')) return true;
    if (lower.length < 40 && lower.includes('не интересно')) return true;
    return false;
  }
}
