import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymeWebhookService,
  PaymeError,
  PaymeState,
} from './payme-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../../modules/invoices/invoices.service';

describe('PaymeWebhookService', () => {
  let service: PaymeWebhookService;
  let db: any;

  const invoiceId = 'inv-1';
  const txId = 'payme-tx-1';

  beforeEach(async () => {
    db = {
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymeTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymeWebhookService,
        { provide: PrismaService, useValue: db },
        { provide: InvoicesService, useValue: {} },
      ],
    }).compile();

    service = module.get(PaymeWebhookService);
  });

  describe('handleRpc — method dispatch', () => {
    it('returns error for unknown method', async () => {
      const res = await service.handleRpc({ method: 'Unknown', params: {}, id: 1 });
      expect(res.error?.code).toBe(-32601);
    });
  });

  describe('CheckPerformTransaction', () => {
    it('returns OrderNotFound when account is missing', async () => {
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        params: { amount: 10000, account: null },
        id: 1,
      });
      expect(res.error?.code).toBe(PaymeError.OrderNotFound);
    });

    it('returns OrderNotFound when account.invoice_id is missing', async () => {
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        params: { amount: 10000, account: {} },
        id: 1,
      });
      expect(res.error?.code).toBe(PaymeError.OrderNotFound);
    });

    it('returns OrderNotFound when invoice does not exist', async () => {
      db.invoice.findUnique.mockResolvedValue(null);
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        params: { amount: 10000, account: { invoice_id: invoiceId } },
        id: 1,
      });
      expect(res.error?.code).toBe(PaymeError.OrderNotFound);
    });

    it('returns CanNotPerformTransaction when already paid', async () => {
      db.invoice.findUnique.mockResolvedValue({ id: invoiceId, status: 'paid', totalUzs: BigInt(100) });
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        params: { amount: 10000, account: { invoice_id: invoiceId } },
        id: 1,
      });
      expect(res.error?.code).toBe(PaymeError.CanNotPerformTransaction);
    });

    it('returns InvalidAmount when amount does not match', async () => {
      db.invoice.findUnique.mockResolvedValue({ id: invoiceId, status: 'issued', totalUzs: BigInt(100) });
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        // 100 * 100 = 10000, but we send 9999
        params: { amount: 9999, account: { invoice_id: invoiceId } },
        id: 1,
      });
      expect(res.error?.code).toBe(PaymeError.InvalidAmount);
    });

    it('returns allow: true for valid invoice and amount', async () => {
      db.invoice.findUnique.mockResolvedValue({ id: invoiceId, status: 'issued', totalUzs: BigInt(100) });
      const res = await service.handleRpc({
        method: 'CheckPerformTransaction',
        params: { amount: 10000, account: { invoice_id: invoiceId } },
        id: 1,
      });
      expect((res.result as any)?.allow).toBe(true);
    });
  });

  describe('CreateTransaction', () => {
    it('returns OrderNotFound when account is null', async () => {
      const res = await service.handleRpc({
        method: 'CreateTransaction',
        params: { id: txId, time: 1000, amount: 10000, account: null },
        id: 2,
      });
      expect(res.error?.code).toBe(PaymeError.OrderNotFound);
    });

    it('returns existing pending transaction idempotently', async () => {
      db.paymeTransaction.findUnique.mockResolvedValue({
        id: txId,
        state: PaymeState.Pending,
        createTime: BigInt(1000),
      });
      const res = await service.handleRpc({
        method: 'CreateTransaction',
        params: { id: txId, time: 1000, amount: 10000, account: { invoice_id: invoiceId } },
        id: 2,
      });
      expect((res.result as any)?.transaction).toBe(txId);
      expect((res.result as any)?.state).toBe(PaymeState.Pending);
    });
  });

  describe('CheckTransaction', () => {
    it('returns TransactionNotFound for unknown id', async () => {
      db.paymeTransaction.findUnique.mockResolvedValue(null);
      const res = await service.handleRpc({
        method: 'CheckTransaction',
        params: { id: 'unknown' },
        id: 3,
      });
      expect(res.error?.code).toBe(PaymeError.TransactionNotFound);
    });
  });
});
