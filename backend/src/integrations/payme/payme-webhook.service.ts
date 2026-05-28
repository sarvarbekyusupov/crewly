import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../../modules/invoices/invoices.service';

export enum PaymeError {
  InvalidAmount = -31001,
  TransactionNotFound = -31003,
  CanNotPerformTransaction = -31008,
  CanNotCancelTransaction = -31007,
  InternalError = -32400,
  OrderNotFound = -31050,
}

export enum PaymeState {
  Pending = 1,
  Paid = 2,
  Cancelled = -1,
  CancelledAfterPaid = -2,
}

@Injectable()
export class PaymeWebhookService {
  private readonly logger = new Logger(PaymeWebhookService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly invoices: InvoicesService,
  ) {}

  async handleRpc(body: any) {
    const { method, params, id } = body;

    try {
      switch (method) {
        case 'CheckPerformTransaction':
          return { result: await this.checkPerformTransaction(params), id };
        case 'CreateTransaction':
          return { result: await this.createTransaction(params), id };
        case 'PerformTransaction':
          return { result: await this.performTransaction(params), id };
        case 'CancelTransaction':
          return { result: await this.cancelTransaction(params), id };
        case 'CheckTransaction':
          return { result: await this.checkTransaction(params), id };
        default:
          return { error: { code: -32601, message: 'Method not found' }, id };
      }
    } catch (err: any) {
      this.logger.error(`Payme RPC error: ${err.message}`, err.stack);
      return {
        error: {
          code: typeof err.code === 'number' ? err.code : PaymeError.InternalError,
          message: err.message,
        },
        id,
      };
    }
  }

  private async checkPerformTransaction(params: any) {
    const { amount, account } = params;
    if (!account?.invoice_id) {
      throw { code: PaymeError.OrderNotFound, message: 'Missing account.invoice_id' };
    }
    const invoiceId = account.invoice_id as string;

    const invoice = await this.db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw { code: PaymeError.OrderNotFound, message: 'Invoice not found' };
    }

    if (invoice.status === 'paid') {
      throw { code: PaymeError.CanNotPerformTransaction, message: 'Already paid' };
    }

    if (BigInt(amount) !== invoice.totalUzs * BigInt(100)) {
      throw { code: PaymeError.InvalidAmount, message: 'Incorrect amount' };
    }

    return { allow: true };
  }

  private async createTransaction(params: any) {
    const { id, time, amount, account } = params;
    if (!account?.invoice_id) {
      throw { code: PaymeError.OrderNotFound, message: 'Missing account.invoice_id' };
    }
    const invoiceId = account.invoice_id as string;

    const existing = await this.db.paymeTransaction.findUnique({ where: { id } });
    if (existing) {
      if (existing.state !== PaymeState.Pending) {
        throw { code: PaymeError.CanNotPerformTransaction, message: 'Transaction state mismatch' };
      }
      return {
        create_time: Number(existing.createTime),
        transaction: existing.id,
        state: existing.state,
      };
    }

    // Check if invoice has other active transactions
    const other = await this.db.paymeTransaction.findFirst({
      where: { invoiceId, state: PaymeState.Pending },
    });
    if (other) {
      throw { code: PaymeError.CanNotPerformTransaction, message: 'Another transaction pending' };
    }

    await this.checkPerformTransaction(params);

    const createTime = Date.now();
    const tx = await this.db.paymeTransaction.create({
      data: {
        id,
        invoiceId,
        time: BigInt(time),
        amount: BigInt(amount),
        state: PaymeState.Pending,
        createTime: BigInt(createTime),
      },
    });

    return {
      create_time: createTime,
      transaction: tx.id,
      state: tx.state,
    };
  }

  private async performTransaction(params: any) {
    const { id } = params;

    const tx = await this.db.paymeTransaction.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!tx) {
      throw { code: PaymeError.TransactionNotFound, message: 'Transaction not found' };
    }

    if (tx.state === PaymeState.Paid) {
      return {
        transaction: tx.id,
        perform_time: Number(tx.performTime),
        state: tx.state,
      };
    }

    if (tx.state !== PaymeState.Pending) {
      throw { code: PaymeError.CanNotPerformTransaction, message: 'Transaction state mismatch' };
    }

    const performTime = Date.now();

    await this.db.$transaction([
      this.db.paymeTransaction.update({
        where: { id },
        data: {
          state: PaymeState.Paid,
          performTime: BigInt(performTime),
        },
      }),
      // We don't call markPaid directly to avoid circular dependency or role checks
      // but we can reuse the core logic
      this.db.invoice.update({
        where: { id: tx.invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentReference: `Payme:${id}`,
        },
      }),
    ]);

    return {
      transaction: tx.id,
      perform_time: performTime,
      state: PaymeState.Paid,
    };
  }

  private async cancelTransaction(params: any) {
    const { id, reason } = params;

    const tx = await this.db.paymeTransaction.findUnique({ where: { id } });
    if (!tx) {
      throw { code: PaymeError.TransactionNotFound, message: 'Transaction not found' };
    }

    if (tx.state === PaymeState.Cancelled || tx.state === PaymeState.CancelledAfterPaid) {
      return {
        transaction: tx.id,
        cancel_time: Number(tx.cancelTime),
        state: tx.state,
      };
    }

    if (tx.state === PaymeState.Paid) {
      // Logic for cancellation after payment (e.g. refund)
      // For now just mark as cancelled
    }

    const cancelTime = Date.now();
    const newState = tx.state === PaymeState.Paid ? PaymeState.CancelledAfterPaid : PaymeState.Cancelled;

    await this.db.$transaction([
      this.db.paymeTransaction.update({
        where: { id },
        data: {
          state: newState,
          cancelTime: BigInt(cancelTime),
          reason: Number(reason),
        },
      }),
      this.db.invoice.update({
        where: { id: tx.invoiceId },
        data: { status: newState === PaymeState.CancelledAfterPaid ? 'refunded' : 'issued' },
      }),
    ]);

    return {
      transaction: tx.id,
      cancel_time: cancelTime,
      state: newState,
    };
  }

  private async checkTransaction(params: any) {
    const { id } = params;
    const tx = await this.db.paymeTransaction.findUnique({ where: { id } });
    if (!tx) {
      throw { code: PaymeError.TransactionNotFound, message: 'Transaction not found' };
    }

    return {
      create_time: Number(tx.createTime),
      perform_time: Number(tx.performTime),
      cancel_time: Number(tx.cancelTime),
      transaction: tx.id,
      state: tx.state,
      reason: tx.reason,
    };
  }
}
