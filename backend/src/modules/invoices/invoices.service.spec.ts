import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let db: any;
  let email: { send: jest.Mock };

  const companyId = 'company-1';
  const invoiceId = 'invoice-1';

  beforeEach(async () => {
    db = {
      invoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
        update: jest.fn(),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { totalUzs: BigInt(0) } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    email = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: db },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  describe('findAll', () => {
    it('returns paginated invoices with pending total', async () => {
      db.invoice.findMany.mockResolvedValue([{ id: invoiceId }]);
      db.invoice.count.mockResolvedValue(1);
      db.invoice.aggregate.mockResolvedValue({
        _sum: { totalUzs: BigInt(500_000) },
      });

      const result = await service.findAll(companyId);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pendingTotal).toBe(BigInt(500_000));
    });

    it('filters by status when provided', async () => {
      db.invoice.findMany.mockResolvedValue([]);
      db.invoice.count.mockResolvedValue(0);

      await service.findAll(companyId, 'issued');

      expect(db.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'issued' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns invoice when found', async () => {
      const invoice = { id: invoiceId, companyId, placement: {} };
      db.invoice.findUnique.mockResolvedValue(invoice);

      const result = await service.findOne(companyId, invoiceId);
      expect(result).toEqual(invoice);
    });

    it('throws NotFoundException when invoice not found', async () => {
      db.invoice.findUnique.mockResolvedValue(null);
      await expect(service.findOne(companyId, invoiceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when invoice belongs to another company', async () => {
      db.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        companyId: 'other-company',
      });
      await expect(service.findOne(companyId, invoiceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markPaid', () => {
    it('throws ForbiddenException for viewer role', async () => {
      await expect(
        service.markPaid(companyId, invoiceId, 'viewer', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for hiring_manager role', async () => {
      await expect(
        service.markPaid(companyId, invoiceId, 'hiring_manager', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when invoice not found', async () => {
      db.invoice.updateMany.mockResolvedValue({ count: 0 });
      db.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.markPaid(companyId, invoiceId, 'owner', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when invoice already paid', async () => {
      db.invoice.updateMany.mockResolvedValue({ count: 0 });
      db.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        companyId,
        status: 'paid',
      });
      await expect(
        service.markPaid(companyId, invoiceId, 'owner', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('concurrent markPaid — second call throws BadRequestException', async () => {
      // First call succeeds (updateMany returns count: 1)
      // Second call fails because status already changed (updateMany returns count: 0)
      db.invoice.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      db.invoice.findUniqueOrThrow.mockResolvedValue({
        id: invoiceId,
        companyId,
        status: 'paid',
        invoiceNumber: 'INV-001',
      });
      db.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        companyId,
        status: 'paid',
      });

      await service.markPaid(companyId, invoiceId, 'owner', {});
      await expect(
        service.markPaid(companyId, invoiceId, 'owner', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks invoice as paid for owner', async () => {
      const paid = {
        id: invoiceId,
        companyId,
        status: 'paid',
        invoiceNumber: 'INV-001',
      };
      db.invoice.updateMany.mockResolvedValue({ count: 1 });
      db.invoice.findUniqueOrThrow.mockResolvedValue(paid);

      const result = await service.markPaid(companyId, invoiceId, 'owner', {
        paymentReference: 'REF-123',
      });

      expect(db.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: invoiceId,
            companyId,
            status: expect.objectContaining({ notIn: ['paid', 'cancelled'] }),
          }),
          data: expect.objectContaining({
            status: 'paid',
            paymentReference: 'REF-123',
          }),
        }),
      );
      expect(result.status).toBe('paid');
    });

    it('marks invoice as paid for admin', async () => {
      const paid = {
        id: invoiceId,
        companyId,
        status: 'paid',
        invoiceNumber: 'INV-002',
      };
      db.invoice.updateMany.mockResolvedValue({ count: 1 });
      db.invoice.findUniqueOrThrow.mockResolvedValue(paid);

      await service.markPaid(companyId, invoiceId, 'admin', {});
      expect(db.invoice.updateMany).toHaveBeenCalled();
    });
  });

  describe('markOverdue', () => {
    it('throws NotFoundException when invoice not found', async () => {
      db.invoice.findUnique.mockResolvedValue(null);
      await expect(service.markOverdue(companyId, invoiceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates invoice status to overdue', async () => {
      db.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        companyId,
        status: 'issued',
      });
      db.invoice.update.mockResolvedValue({ id: invoiceId, status: 'overdue' });

      await service.markOverdue(companyId, invoiceId);
      expect(db.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'overdue' } }),
      );
    });
  });
});
