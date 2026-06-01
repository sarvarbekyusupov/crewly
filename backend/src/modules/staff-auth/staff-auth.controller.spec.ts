import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { StaffAuthController } from './staff-auth.controller';
import { StaffService } from './staff.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CandidatesService } from '../candidates/candidates.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ConsentService } from '../consent/consent.service';
import { StaffGuard } from '../../common/guards/staff.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { QUEUES } from '../../workers/queue-names';
import * as argon2 from 'argon2';

describe('StaffAuthController', () => {
  let controller: StaffAuthController;
  let db: any;
  let candidatesService: {
    findAllForStaff: jest.Mock;
    markDoNotContact: jest.Mock;
  };
  let invoicesService: { findAllForStaff: jest.Mock };
  let consentService: { findAllForStaff: jest.Mock };
  let ingestQueue: { add: jest.Mock };
  let discoverJobsQueue: { add: jest.Mock };

  const mockRes = () => {
    const res: any = { cookie: jest.fn(), clearCookie: jest.fn() };
    return res;
  };

  beforeEach(async () => {
    db = {
      staff: { findUnique: jest.fn() },
      staffSession: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      company: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      candidate: { count: jest.fn().mockResolvedValue(0) },
      job: { count: jest.fn().mockResolvedValue(0) },
      application: { count: jest.fn().mockResolvedValue(0) },
      placement: { count: jest.fn().mockResolvedValue(0) },
      invoice: { count: jest.fn().mockResolvedValue(0) },
      llmCall: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { costUsd: null } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      ingestionRun: { findMany: jest.fn().mockResolvedValue([]) },
      jobDiscoveryRun: { findMany: jest.fn().mockResolvedValue([]) },
    };
    candidatesService = {
      findAllForStaff: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      markDoNotContact: jest.fn().mockResolvedValue(undefined),
    };
    invoicesService = {
      findAllForStaff: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    consentService = {
      findAllForStaff: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    ingestQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    discoverJobsQueue = { add: jest.fn().mockResolvedValue({ id: 'job-2' }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffAuthController],
      providers: [
        StaffService,
        { provide: PrismaService, useValue: db },
        { provide: CandidatesService, useValue: candidatesService },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: ConsentService, useValue: consentService },
        {
          provide: getQueueToken(QUEUES.INGEST_CANDIDATES),
          useValue: ingestQueue,
        },
        {
          provide: getQueueToken(QUEUES.DISCOVER_JOBS),
          useValue: discoverJobsQueue,
        },
      ],
    })
      .overrideGuard(StaffGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(StaffAuthController);
  });

  describe('login', () => {
    it('throws UnauthorizedException when staff not found', async () => {
      db.staff.findUnique.mockResolvedValue(null);
      await expect(
        controller.login({ email: 'x@x.com', password: 'wrong' }, mockRes()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password wrong', async () => {
      const hash = await argon2.hash('correct');
      db.staff.findUnique.mockResolvedValue({
        id: 's-1',
        email: 'a@b.com',
        role: 'admin',
        passwordHash: hash,
      });
      await expect(
        controller.login({ email: 'a@b.com', password: 'wrong' }, mockRes()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns staff info and sets cookie on valid credentials', async () => {
      const hash = await argon2.hash('secret');
      db.staff.findUnique.mockResolvedValue({
        id: 's-1',
        email: 'a@b.com',
        role: 'admin',
        passwordHash: hash,
      });

      const res = mockRes();
      const result = await controller.login(
        { email: 'a@b.com', password: 'secret' },
        res,
      );

      expect(result).toMatchObject({
        staff: { id: 's-1', email: 'a@b.com', role: 'admin' },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'staff_session',
        expect.any(String),
        expect.any(Object),
      );
      expect(db.staffSession.create).toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns staff from request', async () => {
      const req: any = {
        staff: { id: 's-1', email: 'a@b.com', role: 'admin' },
      };
      const result = await controller.me(req);
      expect(result).toEqual({ id: 's-1', email: 'a@b.com', role: 'admin' });
    });
  });

  describe('dashboard', () => {
    it('returns dashboard stats with zero LLM cost when null', async () => {
      const result = await controller.dashboard();
      expect(result).toMatchObject({
        totalCompanies: 0,
        totalCandidates: 0,
        activeJobs: 0,
        activeApplications: 0,
        llmCostTodayUsd: 0,
      });
    });
  });

  describe('companies', () => {
    it('returns paginated companies', async () => {
      db.company.findMany.mockResolvedValue([{ id: 'co-1' }]);
      db.company.count.mockResolvedValue(1);
      const result = await controller.companies('1', '10');
      expect(result).toMatchObject({ data: [{ id: 'co-1' }], total: 1 });
    });

    it('uses defaults when page/limit not provided', async () => {
      const result = await controller.companies();
      expect(result).toMatchObject({ page: 1, limit: 50 });
    });
  });

  describe('candidates', () => {
    it('delegates to candidatesService.findAllForStaff', async () => {
      await controller.candidates('true', '1', '25');
      expect(candidatesService.findAllForStaff).toHaveBeenCalledWith({
        doNotContact: true,
        page: 1,
        limit: 25,
      });
    });
  });

  describe('markDnc', () => {
    it('calls markDoNotContact and returns ok', async () => {
      const result = await controller.markDnc('cand-1');
      expect(candidatesService.markDoNotContact).toHaveBeenCalledWith('cand-1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('triggerIngestion', () => {
    it('enqueues ingestion job and returns jobId', async () => {
      const result = await controller.triggerIngestion({
        source: 'hh.ru',
        maxPages: 3,
      });
      expect(ingestQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ jobId: 'job-1', queued: true });
    });
  });

  describe('ingestionRuns', () => {
    it('returns ingestion runs', async () => {
      db.ingestionRun.findMany.mockResolvedValue([{ id: 'run-1' }]);
      const result = await controller.ingestionRuns();
      expect(result).toEqual([{ id: 'run-1' }]);
    });
  });

  describe('triggerJobDiscovery', () => {
    it('enqueues job discovery and returns jobId', async () => {
      const result = await controller.triggerJobDiscovery({
        source: 'linkedin',
        query: 'Node.js',
      });
      expect(discoverJobsQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ jobId: 'job-2', queued: true });
    });
  });

  describe('invoices', () => {
    it('delegates to invoicesService.findAllForStaff', async () => {
      await controller.invoices('issued', '2', '20');
      expect(invoicesService.findAllForStaff).toHaveBeenCalledWith(
        'issued',
        2,
        20,
      );
    });
  });

  describe('consent', () => {
    it('delegates to consentService.findAllForStaff', async () => {
      await controller.consent('cand-1');
      expect(consentService.findAllForStaff).toHaveBeenCalledWith(
        'cand-1',
        1,
        50,
      );
    });
  });

  describe('logout', () => {
    it('deletes session and clears cookie', async () => {
      const req: any = { cookies: { staff_session: 'abc' } };
      const res = mockRes();
      const result = await controller.logout(req, res);
      expect(db.staffSession.deleteMany).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('staff_session');
      expect(result).toEqual({ ok: true });
    });

    it('clears cookie even when no session cookie', async () => {
      const req: any = { cookies: {} };
      const res = mockRes();
      await controller.logout(req, res);
      expect(db.staffSession.deleteMany).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalled();
    });
  });
});
