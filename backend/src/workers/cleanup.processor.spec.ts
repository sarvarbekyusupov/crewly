import { Test, TestingModule } from '@nestjs/testing';
import { CleanupProcessor } from './cleanup.processor';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email/email.service';

const makeJob = () => ({}) as any;

describe('CleanupProcessor', () => {
  let processor: CleanupProcessor;
  let db: any;
  let email: { sendGuaranteeExpired: jest.Mock; sendInvoice: jest.Mock };

  beforeEach(async () => {
    db = {
      idempotencyKey: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      staffSession: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      placement: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    email = {
      sendGuaranteeExpired: jest.fn().mockResolvedValue(undefined),
      sendInvoice: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupProcessor,
        { provide: PrismaService, useValue: db },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    processor = module.get(CleanupProcessor);
  });

  describe('expireIdempotencyKeys', () => {
    it('deletes expired idempotency keys', async () => {
      await processor.expireIdempotencyKeys(makeJob());
      expect(db.idempotencyKey.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ expiresAt: expect.any(Object) }),
        }),
      );
    });
  });

  describe('expireSessions', () => {
    it('deletes expired client and staff sessions', async () => {
      await processor.expireSessions(makeJob());
      expect(db.session.deleteMany).toHaveBeenCalled();
      expect(db.staffSession.deleteMany).toHaveBeenCalled();
    });
  });

  describe('checkGuaranteeExpiry', () => {
    it('returns early when no expired placements', async () => {
      db.placement.findMany.mockResolvedValue([]);
      await processor.checkGuaranteeExpiry(makeJob());
      expect(db.placement.updateMany).not.toHaveBeenCalled();
    });

    it('marks placements as not employed and sends emails', async () => {
      const placement = {
        id: 'pl-1',
        candidateId: 'c1',
        job: {
          title: 'Dev',
          company: {
            users: [{ email: 'owner@co.com' }],
          },
        },
        candidate: { fullName: 'Alice' },
      };
      db.placement.findMany.mockResolvedValue([placement]);
      db.placement.updateMany.mockResolvedValue({ count: 1 });

      await processor.checkGuaranteeExpiry(makeJob());

      expect(db.placement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { candidateStillEmployed: false },
        }),
      );
      expect(email.sendGuaranteeExpired).toHaveBeenCalledWith(
        'owner@co.com',
        'Alice',
        'Dev',
      );
    });
  });

  describe('markInvoicesOverdue', () => {
    it('marks overdue issued invoices', async () => {
      db.invoice.updateMany.mockResolvedValue({ count: 3 });
      await processor.markInvoicesOverdue(makeJob());

      expect(db.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'issued' }),
          data: { status: 'overdue' },
        }),
      );
    });
  });

  describe('sendInvoiceReminders', () => {
    it('sends reminders for invoices due soon', async () => {
      db.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          amountUzs: BigInt(1000000),
          dueDate: new Date(),
          company: { users: [{ email: 'owner@co.com' }] },
        },
      ]);

      await processor.sendInvoiceReminders(makeJob());

      expect(email.sendInvoice).toHaveBeenCalledWith(
        'owner@co.com',
        'INV-001',
        BigInt(1000000),
        expect.any(Date),
      );
    });

    it('skips invoices without owner email', async () => {
      db.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-002',
          amountUzs: BigInt(500000),
          dueDate: new Date(),
          company: { users: [] },
        },
      ]);

      await processor.sendInvoiceReminders(makeJob());
      expect(email.sendInvoice).not.toHaveBeenCalled();
    });
  });
});
