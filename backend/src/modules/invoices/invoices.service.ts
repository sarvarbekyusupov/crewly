import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';

interface MarkPaidDto {
  paymentReference?: string;
  notes?: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async findAll(companyId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { companyId, ...(status ? { status } : {}) };
    const include = {
      placement: {
        select: {
          id: true,
          candidate: { select: { id: true, fullName: true } },
          job: { select: { id: true, title: true } },
        },
      },
    };
    const pendingWhere = { companyId, status: { in: ['issued', 'overdue'] } };
    const [data, total, pendingAgg] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.db.invoice.count({ where }),
      this.db.invoice.aggregate({
        where: pendingWhere,
        _sum: { totalUzs: true },
      }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      pendingTotal: pendingAgg._sum.totalUzs ?? BigInt(0),
    };
  }

  async getPaymentLink(companyId: string, id: string) {
    const invoice = await this.db.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    const merchantId = this.config.get<string>('PAYME_MERCHANT_ID');
    if (!merchantId) {
      throw new BadRequestException('Payment gateway not configured');
    }

    // Payme amount is in tiyins (1 UZS = 100 tiyins)
    const amountInTiyins = Number(invoice.totalUzs) * 100;
    const checkoutData = `m=${merchantId};ac.invoice_id=${id};a=${amountInTiyins}`;
    const base64Data = Buffer.from(checkoutData).toString('base64');

    return {
      url: `https://checkout.paycom.uz/${base64Data}`,
    };
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: {
        placement: {
          select: {
            id: true,
            startDate: true,
            guaranteeExpiresAt: true,
            candidate: {
              select: { id: true, fullName: true, currentPosition: true },
            },
            job: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async markPaid(
    companyId: string,
    id: string,
    userRole: string,
    dto: MarkPaidDto,
  ) {
    if (!['owner', 'admin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only owner or admin can mark invoices as paid',
      );
    }

    const result = await this.db.invoice.updateMany({
      where: { id, companyId, status: { notIn: ['paid', 'cancelled'] } },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentReference: dto.paymentReference ?? null,
        notes: dto.notes ?? undefined,
      },
    });

    if (result.count === 0) {
      const invoice = await this.db.invoice.findUnique({ where: { id } });
      if (!invoice || invoice.companyId !== companyId) {
        throw new NotFoundException('Invoice not found');
      }
      throw new BadRequestException('Invoice already paid or cancelled');
    }

    const updated = await this.db.invoice.findUniqueOrThrow({ where: { id } });

    // Fire-and-forget: notify owner that payment is recorded
    this.db.user
      .findFirst({
        where: { companyId, role: 'owner' },
        select: { email: true },
      })
      .then((cu) => {
        if (cu?.email) {
          return this.email.send({
            to: cu.email,
            subject: `Оплата ${updated.invoiceNumber} получена`,
            html: `<p>Счёт <strong>${updated.invoiceNumber}</strong> отмечен как оплаченный.</p>${dto.paymentReference ? `<p>Реквизиты: ${dto.paymentReference}</p>` : ''}`,
          });
        }
      })
      .catch((e) =>
        this.logger.error({ err: e.message }, 'markPaid notification failed'),
      );

    return updated;
  }

  async markOverdue(companyId: string, id: string) {
    const invoice = await this.db.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Invoice not found');
    }

    return this.db.invoice.update({
      where: { id },
      data: { status: 'overdue' },
    });
  }

  // Staff-only: cross-company view
  async findAllForStaff(status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          placement: {
            select: {
              candidate: { select: { fullName: true } },
              job: { select: { title: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      this.db.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
