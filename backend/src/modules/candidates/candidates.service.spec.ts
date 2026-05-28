import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let db: any;
  let s3: {
    upload: jest.Mock;
    getSignedUrl: jest.Mock;
    isConfigured: jest.Mock;
  };

  const companyId = 'company-1';
  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      candidate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      application: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      consentRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn((arr: unknown[]) => Promise.all(arr)),
    };
    s3 = {
      upload: jest.fn(),
      getSignedUrl: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: db },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get(CandidatesService);
  });

  describe('findAll', () => {
    it('returns paginated candidates for company', async () => {
      const candidates = [
        {
          id: candidateId,
          fullName: 'Alice',
          applications: [
            { id: 'app-1', status: 'matched', matchScore: 80, jobId: 'job-1' },
          ],
        },
      ];
      db.candidate.findMany.mockResolvedValue(candidates);
      db.candidate.count.mockResolvedValue(1);

      const result = await service.findAll(companyId);

      expect(result.total).toBe(1);
      expect(result.data[0].applicationId).toBe('app-1');
      expect(result.data[0].status).toBe('matched');
    });

    it('sorts by score when sortBy=score', async () => {
      const candidates = [
        {
          id: 'c1',
          applications: [
            { id: 'a1', status: 'matched', matchScore: 50, jobId: 'j1' },
          ],
        },
        {
          id: 'c2',
          applications: [
            { id: 'a2', status: 'matched', matchScore: 90, jobId: 'j2' },
          ],
        },
      ];
      db.candidate.findMany.mockResolvedValue(candidates);
      db.candidate.count.mockResolvedValue(2);

      const result = await service.findAll(companyId, { sortBy: 'score' });
      expect(result.data[0].matchScore).toBe(90);
    });

    it('picks highest-priority status when candidate has multiple applications', async () => {
      const candidates = [
        {
          id: candidateId,
          applications: [
            { id: 'a1', status: 'matched', matchScore: 70, jobId: 'j1' },
            { id: 'a2', status: 'hired', matchScore: 95, jobId: 'j2' },
          ],
        },
      ];
      db.candidate.findMany.mockResolvedValue(candidates);
      db.candidate.count.mockResolvedValue(1);

      const result = await service.findAll(companyId);
      expect(result.data[0].status).toBe('hired');
    });
  });

  describe('findOne', () => {
    it('returns candidate when in pipeline', async () => {
      const candidate = { id: candidateId, fullName: 'Alice', deletedAt: null };
      db.application.findFirst.mockResolvedValue({ candidate });

      const result = await service.findOne(companyId, candidateId);
      expect(result).toEqual(candidate);
    });

    it('throws NotFoundException when no application found', async () => {
      db.application.findFirst.mockResolvedValue(null);
      await expect(service.findOne(companyId, candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when candidate is soft-deleted', async () => {
      db.application.findFirst.mockResolvedValue({
        candidate: { id: candidateId, deletedAt: new Date() },
      });
      await expect(service.findOne(companyId, candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOutreachHistory', () => {
    it('flattens outreach attempts across jobs and sorts by sentAt desc', async () => {
      const earlier = new Date('2026-01-01').toISOString();
      const later = new Date('2026-02-01').toISOString();
      db.application.findMany.mockResolvedValue([
        {
          id: 'app-1',
          outreachAttempts: [{ id: 'oa-1', sentAt: earlier }],
          job: { id: 'job-1', title: 'Dev' },
        },
        {
          id: 'app-2',
          outreachAttempts: [{ id: 'oa-2', sentAt: later }],
          job: { id: 'job-2', title: 'QA' },
        },
      ]);

      const result = await service.getOutreachHistory(companyId, candidateId);
      expect(result[0].id).toBe('oa-2');
      expect(result[0].jobTitle).toBe('QA');
    });
  });

  describe('uploadResume', () => {
    it('throws NotFoundException when candidate not in pipeline', async () => {
      db.application.findFirst.mockResolvedValue(null);
      await expect(
        service.uploadResume(
          companyId,
          candidateId,
          Buffer.from(''),
          'cv.pdf',
          'application/pdf',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('uploads to S3 and returns signed URL', async () => {
      db.application.findFirst.mockResolvedValue({ id: 'app-1' });
      s3.upload.mockResolvedValue('https://s3.example.com/resumes/...');
      s3.getSignedUrl.mockResolvedValue('https://signed.url/cv.pdf');
      db.candidate.update.mockResolvedValue({});

      const result = await service.uploadResume(
        companyId,
        candidateId,
        Buffer.from('data'),
        'cv.pdf',
        'application/pdf',
      );

      expect(s3.upload).toHaveBeenCalled();
      expect(s3.getSignedUrl).toHaveBeenCalled();
      expect(result.url).toBe('https://signed.url/cv.pdf');
    });
  });

  describe('markDoNotContact', () => {
    it('throws NotFoundException when candidate not found', async () => {
      db.candidate.findUnique.mockResolvedValue(null);
      await expect(service.markDoNotContact(candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marks doNotContact and creates consent withdrawal record', async () => {
      db.candidate.findUnique.mockResolvedValue({ id: candidateId });
      db.candidate.update.mockResolvedValue({});
      db.consentRecord.create.mockResolvedValue({});
      db.$transaction.mockResolvedValue([{}, {}]);

      await service.markDoNotContact(candidateId);

      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});
