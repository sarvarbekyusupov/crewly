import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';
import { LLM_JOB_OPTIONS } from '../../workers/queue-options';

@Injectable()
export class ScreeningsService {
  constructor(
    private readonly db: PrismaService,
    @InjectQueue(QUEUES.ADVANCE_SCREENING)
    private readonly screeningQueue: Queue,
  ) {}

  async findByApplication(applicationId: string, companyId: string) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, companyId },
    });
    if (!app) throw new NotFoundException('Application not found');

    return this.db.screening.findMany({
      where: { applicationId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const screening = await this.db.screening.findUnique({
      where: { id },
      include: {
        application: { select: { companyId: true } },
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    if (!screening) throw new NotFoundException('Screening not found');
    if (companyId && (screening.application as any).companyId !== companyId) {
      throw new NotFoundException('Screening not found');
    }
    return screening;
  }

  async create(applicationId: string, companyId: string) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, companyId },
    });
    if (!app) throw new NotFoundException('Application not found');

    const conversation = await this.db.conversation.create({
      data: {
        applicationId,
        candidateId: app.candidateId,
        channel: 'internal',
        state: 'initiated',
      },
    });

    const screening = await this.db.screening.create({
      data: {
        applicationId,
        conversationId: conversation.id,
        promptVersion: 'v1',
        language: 'ru',
        status: 'in_progress',
      },
    });

    await this.db.application.update({
      where: { id: applicationId },
      data: { status: 'screening' },
    });

    await this.screeningQueue.add(
      { screeningId: screening.id },
      LLM_JOB_OPTIONS,
    );

    return screening;
  }

  async escalate(id: string, companyId: string, reason: string) {
    await this.findOne(id, companyId);
    return this.db.screening.update({
      where: { id },
      data: {
        status: 'escalated',
        escalatedAt: new Date(),
        escalationReason: reason,
      },
    });
  }
}
