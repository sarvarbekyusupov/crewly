import { Logger } from '@nestjs/common';
import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email/email.service';
import { QUEUES } from './queue-names';

@Processor(QUEUES.CLEANUP)
export class CleanupProcessor {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Process('expire-idempotency-keys')
  async expireIdempotencyKeys(_job: Job) {
    const deleted = await this.db.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(
      { deleted: deleted.count },
      'Expired idempotency keys cleaned',
    );
  }

  @Process('expire-sessions')
  async expireSessions(_job: Job) {
    const [clientSessions, staffSessions] = await Promise.all([
      this.db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      this.db.staffSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);
    this.logger.log(
      { client: clientSessions.count, staff: staffSessions.count },
      'Expired sessions cleaned',
    );
  }

  @Process('check-guarantee-expiry')
  async checkGuaranteeExpiry(_job: Job) {
    const expiredPlacements = await this.db.placement.findMany({
      where: {
        guaranteeExpiresAt: { lt: new Date() },
        candidateStillEmployed: true,
        replacementRequired: false,
      },
      include: {
        job: {
          include: {
            company: {
              include: {
                users: {
                  where: { role: 'owner', deletedAt: null },
                  select: { email: true },
                  take: 1,
                },
              },
            },
          },
        },
        candidate: { select: { fullName: true } },
      },
    });

    if (expiredPlacements.length === 0) return;

    await this.db.placement.updateMany({
      where: { id: { in: expiredPlacements.map((p) => p.id) } },
      data: { candidateStillEmployed: false },
    });

    for (const placement of expiredPlacements) {
      const ownerEmail = placement.job.company?.users[0]?.email;
      if (ownerEmail) {
        await this.email
          .sendGuaranteeExpired(
            ownerEmail,
            placement.candidate.fullName ?? '',
            placement.job.title,
          )
          .catch((e) =>
            this.logger.error(
              { err: e.message },
              'sendGuaranteeExpired failed',
            ),
          );
      }
    }
    this.logger.log(
      { count: expiredPlacements.length },
      'Guarantee periods expired',
    );
  }

  @Process('mark-invoices-overdue')
  async markInvoicesOverdue(_job: Job) {
    const updated = await this.db.invoice.updateMany({
      where: {
        status: 'issued',
        dueDate: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });
    if (updated.count > 0) {
      this.logger.log({ count: updated.count }, 'Invoices marked overdue');
    }
  }

  @Process('send-invoice-reminders')
  async sendInvoiceReminders(_job: Job) {
    // Send only on 7-day mark and 1-day mark to avoid daily spam
    const dayStart = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const dayEnd = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    const dueSoon = await this.db.invoice.findMany({
      where: {
        status: 'issued',
        OR: [
          { dueDate: { gte: dayStart(7), lte: dayEnd(7) } },
          { dueDate: { gte: dayStart(1), lte: dayEnd(1) } },
        ],
      },
      include: {
        company: {
          include: {
            users: { where: { role: 'owner' }, select: { email: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const invoice of dueSoon) {
      const ownerEmail = (invoice.company as any).users[0]?.email;
      if (ownerEmail) {
        await this.email
          .sendInvoice(
            ownerEmail,
            invoice.invoiceNumber,
            invoice.amountUzs,
            invoice.dueDate,
          )
          .catch((e) =>
            this.logger.error(
              { err: e.message },
              'sendInvoice reminder failed',
            ),
          );
        sent++;
      }
    }
    this.logger.log({ count: sent }, 'Invoice reminders sent');
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      { jobName: job.name, error: err.message },
      'cleanup job failed',
    );
  }
}
