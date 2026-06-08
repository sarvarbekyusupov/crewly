import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ScoreSeekerJobsProcessor } from './score-seeker-jobs.processor';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { NonRetryableError } from './errors';
import { QUEUES } from './queue-names';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ScoreSeekerJobsProcessor', () => {
  let processor: ScoreSeekerJobsProcessor;
  let db: any;
  let agent: { scoreSeekerJobs: jest.Mock };

  const candidateId = 'cand-1';

  const makeJob = (data: object) => ({ data }) as any;

  const baseCandidate = {
    id: candidateId,
    fullName: 'Alice',
    currentPosition: 'Dev',
    skills: ['JavaScript', 'React', 'Node.js'],
    yearsExperience: 3,
    city: 'Tashkent',
    preferredWorkMode: 'remote',
    expectedSalaryUzs: null,
    minMatchScore: 0,
    blacklistedCompanies: [],
  };

  const baseJob = {
    id: 'job-1',
    title: 'Frontend Engineer',
    company: 'Acme',
    location: 'Tashkent',
    description: 'Build things',
    skills: ['JavaScript', 'React'],
    workMode: 'remote',
    employmentType: 'full_time',
    salaryMinUzs: null,
    salaryMaxUzs: null,
  };

  beforeEach(async () => {
    db = {
      candidate: { findUnique: jest.fn() },
      seekerJobMatch: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      discoveredJob: { findMany: jest.fn() },
    };

    agent = { scoreSeekerJobs: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreSeekerJobsProcessor,
        { provide: PrismaService, useValue: db },
        { provide: MatchmakerAgent, useValue: agent },
        {
          provide: getQueueToken(QUEUES.SCORE_SEEKER_JOBS),
          useValue: { add: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    processor = module.get(ScoreSeekerJobsProcessor);
  });

  // ─── skillMatchFallback (private) tested via handle() fallback path ─────────

  describe('skillMatchFallback via fallback path', () => {
    it('returns score=50 for job with no required skills', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([{ ...baseJob, skills: [] }]);
      agent.scoreSeekerJobs.mockRejectedValue(new Error('LLM down'));

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            score: 50,
            strengths: [],
            gaps: [],
          }),
        }),
      );
    });

    it('returns score=100 when all skills match', async () => {
      const job = { ...baseJob, skills: ['JavaScript', 'React'] };
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([job]);
      agent.scoreSeekerJobs.mockRejectedValue(new Error('LLM down'));

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ score: 100 }),
        }),
      );
    });

    it('returns score=0 when candidate has no skills', async () => {
      db.candidate.findUnique.mockResolvedValue({
        ...baseCandidate,
        skills: [],
      });
      db.discoveredJob.findMany.mockResolvedValue([
        { ...baseJob, skills: ['Go', 'Rust'] },
      ]);
      agent.scoreSeekerJobs.mockRejectedValue(new Error('LLM down'));

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ score: 0 }),
        }),
      );
    });

    it('matches case-insensitively', async () => {
      db.candidate.findUnique.mockResolvedValue({
        ...baseCandidate,
        skills: ['react'],
      });
      db.discoveredJob.findMany.mockResolvedValue([
        { ...baseJob, skills: ['React'] },
      ]);
      agent.scoreSeekerJobs.mockRejectedValue(new Error('LLM down'));

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ score: 100 }),
        }),
      );
    });
  });

  describe('handle()', () => {
    it('throws NonRetryableError when candidate not found', async () => {
      db.candidate.findUnique.mockResolvedValue(null);

      await expect(
        processor.handle(makeJob({ candidateId, limit: 5 })),
      ).rejects.toThrow(NonRetryableError);
    });

    it('returns early when no unscored jobs', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([]);

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(agent.scoreSeekerJobs).not.toHaveBeenCalled();
      expect(db.seekerJobMatch.upsert).not.toHaveBeenCalled();
    });

    it('calls upsert with clamped score on LLM success', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([baseJob]);
      agent.scoreSeekerJobs.mockResolvedValue([
        { score: 85, explanation: 'Good match', strengths: ['JS'], gaps: [] },
      ]);

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            score: 85,
            explanation: 'Good match',
          }),
        }),
      );
    });

    it('clamps score >100 to 100', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([baseJob]);
      agent.scoreSeekerJobs.mockResolvedValue([
        { score: 150, explanation: 'Great', strengths: [], gaps: [] },
      ]);

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ score: 100 }),
        }),
      );
    });

    it('falls back to skillMatch when LLM returns wrong array length', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([baseJob]);
      agent.scoreSeekerJobs.mockResolvedValue([]); // 0 items instead of 1

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      // fallback score for ['JavaScript','React'] against candidate with all 3 skills → 100
      expect(db.seekerJobMatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ score: 100 }),
        }),
      );
    });

    it('falls back to skillMatch when LLM throws', async () => {
      db.candidate.findUnique.mockResolvedValue(baseCandidate);
      db.discoveredJob.findMany.mockResolvedValue([baseJob]);
      agent.scoreSeekerJobs.mockRejectedValue(new Error('timeout'));

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.seekerJobMatch.upsert).toHaveBeenCalled();
    });

    it('excludes blacklisted company jobs', async () => {
      db.candidate.findUnique.mockResolvedValue({
        ...baseCandidate,
        blacklistedCompanies: ['Acme'],
      });
      db.discoveredJob.findMany.mockResolvedValue([]);

      await processor.handle(makeJob({ candidateId, limit: 5 }));

      expect(db.discoveredJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { company: { in: ['acme'] } },
          }),
        }),
      );
    });
  });
});
