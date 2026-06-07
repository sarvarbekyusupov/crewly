import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HhVacancyService } from '../../integrations/hh/hh-vacancy.service';
import { QUEUES } from '../../workers/queue-names';

describe('JobsService', () => {
  let service: JobsService;
  let db: any;
  let emitter: { emit: jest.Mock };
  let parseJobQueue: { add: jest.Mock };
  let matchQueue: { add: jest.Mock };
  let outreachQueue: { add: jest.Mock };

  const companyId = 'company-1';
  const jobId = 'job-1';

  beforeEach(async () => {
    db = {
      job: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      application: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    emitter = { emit: jest.fn() };
    parseJobQueue = { add: jest.fn().mockResolvedValue({}) };
    matchQueue = { add: jest.fn().mockResolvedValue({}) };
    outreachQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: db },
        { provide: HhVacancyService, useValue: { getVacancyStats: jest.fn() } },
        { provide: EventEmitter2, useValue: emitter },
        { provide: getQueueToken(QUEUES.PARSE_JOB), useValue: parseJobQueue },
        {
          provide: getQueueToken(QUEUES.MATCH_CANDIDATES),
          useValue: matchQueue,
        },
        {
          provide: getQueueToken(QUEUES.SEND_OUTREACH),
          useValue: outreachQueue,
        },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  describe('create', () => {
    it('creates job and enqueues parse-job task', async () => {
      const job = { id: jobId, companyId, title: 'Dev' };
      db.job.create.mockResolvedValue(job);

      const dto = {
        title: 'Dev',
        description: 'desc',
        priority: 'normal',
      } as any;
      const result = await service.create(companyId, 'user-1', dto);

      expect(db.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId, title: 'Dev' }),
        }),
      );
      expect(parseJobQueue.add).toHaveBeenCalledWith(
        'parse',
        { jobId },
        expect.any(Object),
      );
      expect(result).toEqual(job);
    });
  });

  describe('findAll', () => {
    it('returns paginated list without status filter', async () => {
      db.job.findMany.mockResolvedValue([{ id: jobId }]);
      db.job.count.mockResolvedValue(1);

      const result = await service.findAll(companyId);

      expect(db.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId, deletedAt: null }),
        }),
      );
      expect(result).toEqual({
        data: [{ id: jobId }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('applies status filter', async () => {
      db.job.findMany.mockResolvedValue([]);
      db.job.count.mockResolvedValue(0);

      await service.findAll(companyId, { status: 'active' });

      expect(db.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns job when found', async () => {
      const job = { id: jobId, companyId };
      db.job.findFirst.mockResolvedValue(job);

      const result = await service.findOne(companyId, jobId);
      expect(result).toEqual(job);
    });

    it('throws NotFoundException when job not found', async () => {
      db.job.findFirst.mockResolvedValue(null);
      await expect(service.findOne(companyId, jobId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates job without re-queuing parse when description unchanged', async () => {
      db.job.findFirst.mockResolvedValue({ id: jobId, companyId });
      db.job.update.mockResolvedValue({ id: jobId });

      await service.update(companyId, jobId, { title: 'New Title' });

      expect(db.job.update).toHaveBeenCalled();
      expect(parseJobQueue.add).not.toHaveBeenCalled();
    });

    it('re-enqueues parse-job when description changes', async () => {
      db.job.findFirst.mockResolvedValue({ id: jobId, companyId });
      db.job.update.mockResolvedValue({ id: jobId });

      await service.update(companyId, jobId, {
        description: 'new desc',
      });

      expect(parseJobQueue.add).toHaveBeenCalledWith(
        'parse',
        { jobId },
        expect.any(Object),
      );
    });
  });

  describe('activate', () => {
    it('activates draft job and enqueues match', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'draft',
      });
      db.job.update.mockResolvedValue({ id: jobId, status: 'active' });

      await service.activate(companyId, jobId);

      expect(db.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active' }),
        }),
      );
      expect(matchQueue.add).toHaveBeenCalledWith(
        'match',
        { jobId },
        expect.any(Object),
      );
    });

    it('activates paused job', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'paused',
      });
      db.job.update.mockResolvedValue({ id: jobId, status: 'active' });

      await service.activate(companyId, jobId);
      expect(matchQueue.add).toHaveBeenCalled();
    });

    it('throws BadRequestException if job is already active', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'active',
      });
      await expect(service.activate(companyId, jobId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if job is cancelled', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'cancelled',
      });
      await expect(service.activate(companyId, jobId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('pause', () => {
    it('pauses active job', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'active',
      });
      db.job.update.mockResolvedValue({ id: jobId, status: 'paused' });

      const result = await service.pause(companyId, jobId);
      expect(db.job.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'paused' } }),
      );
      expect(result).toEqual({ id: jobId, status: 'paused' });
    });

    it('throws BadRequestException if not active', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'draft',
      });
      await expect(service.pause(companyId, jobId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('close', () => {
    it('sets status to cancelled', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'active',
      });
      db.job.update.mockResolvedValue({ id: jobId, status: 'cancelled' });

      await service.close(companyId, jobId);

      expect(db.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('bulk-rejects non-terminal apps and soft-deletes job', async () => {
      db.job.findFirst.mockResolvedValue({ id: jobId, companyId });
      db.application.updateMany.mockResolvedValue({ count: 2 });
      db.job.update.mockResolvedValue({ id: jobId });

      await service.softDelete(companyId, jobId);

      expect(db.application.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ jobId, companyId }),
          data: { status: 'rejected_by_client' },
        }),
      );
      expect(db.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('sendOutreach', () => {
    it('enqueues outreach for all matched applications', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'active',
      });
      db.application.findMany.mockResolvedValue([
        { id: 'app-1' },
        { id: 'app-2' },
      ]);

      const result = await service.sendOutreach(companyId, jobId);

      expect(outreachQueue.add).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ queued: 2 });
    });

    it('throws BadRequestException if job is not active', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'paused',
      });
      await expect(service.sendOutreach(companyId, jobId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if no matched applications', async () => {
      db.job.findFirst.mockResolvedValue({
        id: jobId,
        companyId,
        status: 'active',
      });
      db.application.findMany.mockResolvedValue([]);
      await expect(service.sendOutreach(companyId, jobId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getApplications', () => {
    it('returns paginated applications for job', async () => {
      db.job.findFirst.mockResolvedValue({ id: jobId, companyId });
      db.application.findMany.mockResolvedValue([{ id: 'app-1' }]);
      db.application.count.mockResolvedValue(1);

      const result = await service.getApplications(companyId, jobId);
      expect(result).toEqual({
        data: [{ id: 'app-1' }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getStats', () => {
    it('groups application counts by status', async () => {
      db.job.findFirst.mockResolvedValue({ id: jobId, companyId });
      db.application.groupBy.mockResolvedValue([
        { status: 'matched', _count: 3 },
        { status: 'hired', _count: 1 },
      ]);

      const result = await service.getStats(companyId, jobId);
      expect(result).toEqual({ matched: 3, hired: 1 });
    });
  });

  describe('findOnePublic', () => {
    it('returns active job without companyId restriction', async () => {
      const job = { id: jobId, status: 'active', deletedAt: null, company: { name: 'Acme' } };
      db.job.findFirst.mockResolvedValue(job);

      const result = await service.findOnePublic(jobId);
      expect(db.job.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: jobId, status: 'active', deletedAt: null }),
        }),
      );
      expect(result).toEqual(job);
    });

    it('throws NotFoundException if active job not found', async () => {
      db.job.findFirst.mockResolvedValue(null);
      await expect(service.findOnePublic(jobId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllPublic', () => {
    it('returns all active non-deleted jobs', async () => {
      const jobs = [{ id: jobId, title: 'Dev' }];
      db.job.findMany.mockResolvedValue(jobs);

      const result = await service.findAllPublic();
      expect(db.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active', deletedAt: null }),
        }),
      );
      expect(result).toEqual(jobs);
    });
  });
});
