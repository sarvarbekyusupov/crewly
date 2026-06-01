import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { EmailService } from '../../integrations/email/email.service';
import { GoogleCalendarService } from '../../integrations/google-calendar/google-calendar.service';
import { DebriefAgent } from '../agents/debrief.agent';
import { QUEUES } from '../../workers/queue-names';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  let db: any;

  const companyA = 'company-a';
  const companyB = 'company-b';
  const applicationId = 'app-1';

  beforeEach(async () => {
    const tx = {
      placement: {
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'i1' }),
      },
      application: { update: jest.fn().mockResolvedValue({}) },
      job: { update: jest.fn().mockResolvedValue({}) },
    };

    db = {
      application: {
        findFirst: jest.fn().mockResolvedValue({
          id: applicationId,
          companyId: companyA,
          status: 'matched',
          candidateId: 'c1',
          jobId: 'job-1',
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: applicationId,
          companyId: companyA,
          status: 'matched',
          candidateId: 'c1',
          jobId: 'job-1',
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      candidate: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c1', fullName: 'Alice' }),
      },
      job: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          title: 'Dev',
          feePercentage: 12,
          feeBasis: 'annual',
        }),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: companyA,
          paymentTermsDays: 30,
          guaranteePeriodDays: 90,
        }),
      },
      placement: { findFirst: jest.fn().mockResolvedValue(null) },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'u1', email: 'u@ex.com' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((cb) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: db },
        {
          provide: S3Service,
          useValue: { isConfigured: () => false, getSignedUrl: jest.fn() },
        },
        { provide: EmailService, useValue: { sendInvoice: jest.fn() } },
        {
          provide: GoogleCalendarService,
          useValue: { scheduleEvent: jest.fn() },
        },
        {
          provide: DebriefAgent,
          useValue: { synthesizeFeedback: jest.fn() },
        },
        {
          provide: getQueueToken(QUEUES.SEND_OUTREACH),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  describe('findOne (tenant isolation)', () => {
    it('returns application when companyId matches', async () => {
      const app = {
        id: applicationId,
        companyId: companyA,
        status: 'matched',
        candidateId: 'c1',
        jobId: 'job-1',
      };
      (db.application.findFirst as jest.Mock).mockResolvedValue(app);

      const result = await service.findOne(companyA, applicationId);
      expect(result).toEqual(app);
    });

    it('throws when application belongs to another company', async () => {
      (db.application.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(companyB, applicationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hire', () => {
    const hirePayload = {
      agreedSalaryUzs: 10_000_000,
      startDate: '2026-06-01',
    };

    beforeEach(() => {
      (db.placement.findFirst as jest.Mock).mockResolvedValue(null);
      (db.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-1',
        feePercentage: 12,
        feeBasis: 'annual',
        title: 'Dev',
      });
      (db.application.findFirst as jest.Mock).mockResolvedValue({
        id: applicationId,
        companyId: companyA,
        status: 'interviewed',
        candidateId: 'c1',
        jobId: 'job-1',
      });
    });

    it('throws when already placed', async () => {
      (db.placement.findFirst as jest.Mock).mockResolvedValue({ id: 'p1' });
      await expect(
        service.hire(companyA, applicationId, hirePayload),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates placement and invoice', async () => {
      // For this test, findFirst MUST remain null (which is set in beforeEach)
      await service.hire(companyA, applicationId, hirePayload);
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe('makeOffer', () => {
    it('throws when not interviewed', async () => {
      (db.application.findFirst as jest.Mock).mockResolvedValue({
        id: applicationId,
        companyId: companyA,
        status: 'matched',
        candidateId: 'c1',
        jobId: 'job-1',
      });
      await expect(service.makeOffer(companyA, applicationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to offered', async () => {
      (db.application.findFirst as jest.Mock).mockResolvedValue({
        id: applicationId,
        companyId: companyA,
        status: 'interviewed',
        candidateId: 'c1',
        jobId: 'job-1',
      });
      await service.makeOffer(companyA, applicationId);
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'offered' } }),
      );
    });
  });

  describe('retryOutreach', () => {
    it('throws when application not found', async () => {
      (db.application.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.retryOutreach(companyA, applicationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest when not no_contact status', async () => {
      (db.application.findFirst as jest.Mock).mockResolvedValue({
        id: applicationId,
        companyId: companyA,
        status: 'matched',
        candidateId: 'c1',
        jobId: 'job-1',
      });
      await expect(
        service.retryOutreach(companyA, applicationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkReject', () => {
    it('rejects multiple applications', async () => {
      const ids = ['1', '2'];
      (db.application.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      await service.bulkReject(companyA, ids, 'Not interested');
      expect(db.application.updateMany).toHaveBeenCalled();
    });
  });

  describe('bulkApprove', () => {
    it('approves multiple matched applications', async () => {
      const ids = ['1', '2'];
      (db.application.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      await service.bulkApprove(companyA, ids);
      expect(db.application.updateMany).toHaveBeenCalled();
    });
  });
});
