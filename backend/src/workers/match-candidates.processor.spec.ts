import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MatchCandidatesProcessor } from './match-candidates.processor';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data }) as any;

describe('MatchCandidatesProcessor', () => {
  let processor: MatchCandidatesProcessor;
  let db: any;
  let agent: { rankCandidates: jest.Mock };
  let emitter: { emit: jest.Mock };
  let hhClient: { getPotentialResumes: jest.Mock };

  const jobId = 'job-1';

  beforeEach(async () => {
    const rawMock = jest.fn().mockResolvedValue([]);
    db = {
      job: { findUnique: jest.fn() },
      candidate: { findMany: jest.fn() },
      application: {
        upsert: jest.fn().mockResolvedValue({ id: 'app-1', status: 'matched' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: rawMock,
      $queryRawUnsafe: rawMock,
    };
    agent = { rankCandidates: jest.fn() };
    emitter = { emit: jest.fn() };
    hhClient = { getPotentialResumes: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchCandidatesProcessor,
        { provide: PrismaService, useValue: db },
        { provide: MatchmakerAgent, useValue: agent },
        { provide: EventEmitter2, useValue: emitter },
        { provide: HhClientService, useValue: hhClient },
      ],
    }).compile();

    processor = module.get(MatchCandidatesProcessor);
  });

  it('throws NonRetryableError when job not found', async () => {
    db.job.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ jobId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('throws when job has no embedding', async () => {
    db.job.findUnique.mockResolvedValue({
      id: jobId,
      embedding: null,
      companyId: 'c1',
    });
    await expect(processor.handle(makeJob({ jobId }))).rejects.toThrow(
      'Job embedding not ready',
    );
  });

  it('returns early when no candidates found', async () => {
    db.job.findUnique.mockResolvedValue({
      id: jobId,
      embedding: '[0.1,0.2]',
      companyId: 'c1',
      title: 'Dev',
      requiredSkills: [],
    });
    db.$queryRawUnsafe.mockResolvedValue([]);

    await processor.handle(makeJob({ jobId }));

    expect(agent.rankCandidates).not.toHaveBeenCalled();
    expect(db.application.upsert).not.toHaveBeenCalled();
  });

  it('creates applications for ranked candidates', async () => {
    const job = {
      id: jobId,
      embedding: '[0.1,0.2]',
      companyId: 'c1',
      title: 'Dev',
      requiredSkills: ['TypeScript'],
      targetCandidatesCount: 2,
      minExperienceYears: 3,
    };
    db.job.findUnique.mockResolvedValue(job);
    db.$queryRawUnsafe.mockResolvedValue([
      { id: 'c1', similarity: 0.9 },
      { id: 'c2', similarity: 0.8 },
    ]);
    db.candidate.findMany.mockResolvedValue([
      {
        id: 'c1',
        fullName: 'Alice',
        skills: ['TypeScript'],
        yearsExperience: 5,
        currentPosition: 'Dev',
      },
      {
        id: 'c2',
        fullName: 'Bob',
        skills: ['Java'],
        yearsExperience: 3,
        currentPosition: 'BE Dev',
      },
    ]);
    agent.rankCandidates.mockResolvedValue([
      {
        id: 'c1',
        score: 90,
        strengths: ['TypeScript'],
        gaps: [],
        recommendation: 'strong fit',
      },
      {
        id: 'c2',
        score: 75,
        strengths: [],
        gaps: ['TypeScript'],
        recommendation: 'good fit',
      },
    ]);

    await processor.handle(makeJob({ jobId }));

    expect(db.application.upsert).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenCalledWith(
      'company.event',
      expect.objectContaining({ type: 'new_matches' }),
    );
  });

  it('falls back to vector similarity when agent fails', async () => {
    const job = {
      id: jobId,
      embedding: '[0.1,0.2]',
      companyId: 'c1',
      title: 'Dev',
      requiredSkills: [],
      targetCandidatesCount: 1,
      minExperienceYears: 0,
    };
    db.job.findUnique.mockResolvedValue(job);
    db.$queryRawUnsafe.mockResolvedValue([{ id: 'c1', similarity: 0.85 }]);
    db.candidate.findMany.mockResolvedValue([
      {
        id: 'c1',
        fullName: 'Alice',
        skills: [],
        yearsExperience: 2,
        currentPosition: 'Dev',
      },
    ]);
    agent.rankCandidates.mockRejectedValue(new Error('LLM down'));

    await processor.handle(makeJob({ jobId }));

    expect(db.application.upsert).toHaveBeenCalledTimes(1);
  });
});
