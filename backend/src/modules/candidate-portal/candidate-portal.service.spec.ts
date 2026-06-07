import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { CandidatePortalService } from './candidate-portal.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { QUEUES } from '../../workers/queue-names';

describe('CandidatePortalService', () => {
  let service: CandidatePortalService;
  let db: any;

  const candidateId = 'cand-1';

  beforeEach(async () => {
    db = {
      candidate: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      discoveredJob: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      seekerApplication: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      application: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatePortalService,
        { provide: PrismaService, useValue: db },
        { provide: ConversationsService, useValue: {} },
        {
          provide: getQueueToken(QUEUES.PARSE_CANDIDATE),
          useValue: { add: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: S3Service,
          useValue: {
            upload: jest
              .fn()
              .mockResolvedValue('https://s3.example.com/cv.pdf'),
            getSignedUrl: jest
              .fn()
              .mockResolvedValue('https://s3.example.com/signed'),
          },
        },
      ],
    }).compile();

    service = module.get(CandidatePortalService);
  });

  // ─── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('throws NotFoundException when candidate not found', async () => {
      db.candidate.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when candidate is deleted', async () => {
      db.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        deletedAt: new Date(),
      });
      await expect(service.getProfile(candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns candidate profile with id and email', async () => {
      db.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        email: 'c@example.com',
        rawResumeText: 'raw text',
        parsedResume: { skills: [] },
        deletedAt: null,
      });
      const result = await service.getProfile(candidateId);
      expect(result.id).toBe(candidateId);
      expect(result.email).toBe('c@example.com');
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('updates and returns safe candidate', async () => {
      db.candidate.update.mockResolvedValue({
        id: candidateId,
        fullName: 'Alice',
        rawResumeText: 'raw',
        parsedResume: {},
      });
      const result = await service.updateProfile(candidateId, {
        fullName: 'Alice',
      });
      expect(result.fullName).toBe('Alice');
      expect(result).not.toHaveProperty('rawResumeText');
    });
  });

  // ─── uploadCv ─────────────────────────────────────────────────────────────

  describe('uploadCv()', () => {
    it('uploads file and returns signed URL', async () => {
      db.candidate.update.mockResolvedValue({});
      const result = await service.uploadCv(
        candidateId,
        Buffer.from('pdf content'),
        'resume.pdf',
        'application/pdf',
      );
      expect(result.uploaded).toBe(true);
      expect(result.url).toContain('s3.example.com');
      expect(result.parsing).toBeDefined();
    });
  });

  // ─── getDiscoveredJobs ────────────────────────────────────────────────────

  describe('getDiscoveredJobs()', () => {
    const makeDbJob = (overrides: object = {}) => ({
      id: 'dj-1',
      source: 'hh.ru',
      sourceUrl: 'https://hh.ru/vacancy/1',
      title: 'Engineer',
      company: 'Acme',
      location: 'Tashkent',
      skills: ['JavaScript', 'React'],
      salaryMinUzs: null,
      salaryMaxUzs: null,
      employmentType: 'full_time',
      workMode: 'remote',
      postedAt: null,
      discoveredAt: new Date(),
      seekerJobMatches: [],
      seekerApplications: [],
      ...overrides,
    });

    beforeEach(() => {
      db.candidate.findUnique.mockResolvedValue({
        skills: ['JavaScript', 'React'],
        blacklistedCompanies: [],
        minMatchScore: 0,
      });
    });

    it('uses in-memory sort when sortBy=score', async () => {
      const jobs = [
        makeDbJob({
          id: 'dj-1',
          seekerJobMatches: [
            { score: 70, explanation: '', strengths: [], gaps: [] },
          ],
        }),
        makeDbJob({
          id: 'dj-2',
          seekerJobMatches: [
            { score: 90, explanation: '', strengths: [], gaps: [] },
          ],
        }),
      ];
      db.discoveredJob.findMany.mockResolvedValue(jobs);
      db.discoveredJob.count.mockResolvedValue(2);

      const result = await service.getDiscoveredJobs(candidateId, {
        sortBy: 'score',
      });

      expect(result.data[0].aiScore).toBe(90);
      expect(result.data[1].aiScore).toBe(70);
    });

    it('uses DB orderBy when sortBy=recent', async () => {
      db.discoveredJob.findMany.mockResolvedValue([makeDbJob()]);
      db.discoveredJob.count.mockResolvedValue(1);

      await service.getDiscoveredJobs(candidateId, { sortBy: 'recent' });

      expect(db.discoveredJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { discoveredAt: 'desc' },
        }),
      );
    });

    it('filters out blacklisted company', async () => {
      db.candidate.findUnique.mockResolvedValue({
        skills: ['JavaScript'],
        blacklistedCompanies: ['Acme'],
        minMatchScore: 0,
      });
      db.discoveredJob.findMany.mockResolvedValue([
        makeDbJob({ company: 'Acme' }),
      ]);
      db.discoveredJob.count.mockResolvedValue(1);

      const result = await service.getDiscoveredJobs(candidateId);

      expect(result.data).toHaveLength(0);
    });

    it('displayScore prefers aiScore over skillMatch', async () => {
      const job = makeDbJob({
        skills: ['Go'],
        seekerJobMatches: [
          { score: 95, explanation: 'AI score', strengths: [], gaps: [] },
        ],
      });
      db.discoveredJob.findMany.mockResolvedValue([job]);
      db.discoveredJob.count.mockResolvedValue(1);

      const result = await service.getDiscoveredJobs(candidateId);

      expect(result.data[0].displayScore).toBe(95);
      expect(result.data[0].aiScore).toBe(95);
    });

    it('displayScore falls back to skillMatch when no aiScore', async () => {
      const job = makeDbJob({
        skills: ['JavaScript', 'React'],
        seekerJobMatches: [],
      });
      db.candidate.findUnique.mockResolvedValue({
        skills: ['JavaScript'],
        blacklistedCompanies: [],
        minMatchScore: 0,
      });
      db.discoveredJob.findMany.mockResolvedValue([job]);
      db.discoveredJob.count.mockResolvedValue(1);

      const result = await service.getDiscoveredJobs(candidateId);

      expect(result.data[0].skillMatch).toBe(50);
      expect(result.data[0].displayScore).toBe(50);
    });

    it('skillMatch is null when job has no required skills', async () => {
      const job = makeDbJob({ skills: [], seekerJobMatches: [] });
      db.discoveredJob.findMany.mockResolvedValue([job]);
      db.discoveredJob.count.mockResolvedValue(1);

      const result = await service.getDiscoveredJobs(candidateId);

      expect(result.data[0].skillMatch).toBeNull();
    });

    it('filters out jobs below minScore threshold', async () => {
      const job = makeDbJob({ skills: ['Go', 'Rust'], seekerJobMatches: [] });
      db.candidate.findUnique.mockResolvedValue({
        skills: [],
        blacklistedCompanies: [],
        minMatchScore: 50,
      });
      db.discoveredJob.findMany.mockResolvedValue([job]);
      db.discoveredJob.count.mockResolvedValue(1);

      const result = await service.getDiscoveredJobs(candidateId, {
        minScore: 50,
      });

      expect(result.data).toHaveLength(0);
    });
  });

  // ─── queueApplication ────────────────────────────────────────────────────

  describe('queueApplication()', () => {
    it('throws NotFoundException when discovered job not found', async () => {
      db.discoveredJob.findUnique.mockResolvedValue(null);

      await expect(
        service.queueApplication(candidateId, 'dj-missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate application', async () => {
      db.discoveredJob.findUnique.mockResolvedValue({
        id: 'dj-1',
        source: 'hh.ru',
      });
      db.seekerApplication.findUnique.mockResolvedValue({ id: 'sa-existing' });

      await expect(
        service.queueApplication(candidateId, 'dj-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('returns id and status queued on success', async () => {
      const job = { id: 'dj-1', source: 'linkedin' };
      db.discoveredJob.findUnique.mockResolvedValue(job);
      db.seekerApplication.findUnique.mockResolvedValue(null);
      db.seekerApplication.create.mockResolvedValue({
        id: 'sa-new',
        status: 'queued',
      });

      const result = await service.queueApplication(candidateId, 'dj-1');

      expect(result).toEqual({ id: 'sa-new', status: 'queued' });
      expect(db.seekerApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'linkedin',
            status: 'queued',
          }),
        }),
      );
    });
  });

  // ─── updatePreferences ───────────────────────────────────────────────────

  describe('updatePreferences()', () => {
    it('only includes provided fields in update', async () => {
      db.candidate.update.mockResolvedValue({});

      await service.updatePreferences(candidateId, {
        maxApplicationsPerDay: 3,
      });

      const data = (db.candidate.update as jest.Mock).mock.calls[0][0].data;
      expect(data).toHaveProperty('maxApplicationsPerDay', 3);
      expect(data).not.toHaveProperty('minMatchScore');
      expect(data).not.toHaveProperty('blacklistedCompanies');
    });

    it('passes null values through to clear fields', async () => {
      db.candidate.update.mockResolvedValue({});

      await service.updatePreferences(candidateId, {
        minMatchScore: null,
        preferredWorkMode: null,
      });

      const data = (db.candidate.update as jest.Mock).mock.calls[0][0].data;
      expect(data).toHaveProperty('minMatchScore', null);
      expect(data).toHaveProperty('preferredWorkMode', null);
    });
  });

  // ─── getDiscoveredJobs search filter ─────────────────────────────────────

  describe('getDiscoveredJobs() search filter', () => {
    beforeEach(() => {
      db.candidate.findUnique.mockResolvedValue({
        skills: [],
        blacklistedCompanies: [],
        minMatchScore: 0,
      });
      db.discoveredJob.findMany.mockResolvedValue([]);
      db.discoveredJob.count.mockResolvedValue(0);
    });

    it('applies search filter to query', async () => {
      await service.getDiscoveredJobs(candidateId, { search: 'engineer' });
      const call = db.discoveredJob.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });
  });

  // ─── getSeekerApplications ────────────────────────────────────────────────

  describe('getSeekerApplications()', () => {
    it('returns seeker applications with job info', async () => {
      db.seekerApplication.findMany.mockResolvedValue([
        { id: 'sa-1', status: 'queued', discoveredJob: {} },
      ]);
      const result = await service.getSeekerApplications(candidateId);
      expect(result).toHaveLength(1);
      expect(db.seekerApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { candidateId } }),
      );
    });
  });

  // ─── updateSeekerApplicationStatus ───────────────────────────────────────

  describe('updateSeekerApplicationStatus()', () => {
    it('throws NotFoundException when application not found', async () => {
      db.seekerApplication.findFirst.mockResolvedValue(null);
      await expect(
        service.updateSeekerApplicationStatus(
          candidateId,
          'sa-missing',
          'applied',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates status on found application', async () => {
      db.seekerApplication.findFirst.mockResolvedValue({
        id: 'sa-1',
        candidateId,
      });
      db.seekerApplication.update.mockResolvedValue({
        id: 'sa-1',
        status: 'applied',
      });
      const result = await service.updateSeekerApplicationStatus(
        candidateId,
        'sa-1',
        'applied',
      );
      expect(result.status).toBe('applied');
    });
  });

  // ─── getApplications ──────────────────────────────────────────────────────

  describe('getApplications()', () => {
    it('returns applications for candidate', async () => {
      db.application.findMany.mockResolvedValue([
        { id: 'app-1', status: 'pending', job: {} },
      ]);
      const result = await service.getApplications(candidateId);
      expect(result).toHaveLength(1);
      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { candidateId } }),
      );
    });
  });
});
