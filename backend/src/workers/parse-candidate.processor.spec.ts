import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ParseCandidateProcessor } from './parse-candidate.processor';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { QUEUES } from './queue-names';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data }) as any;

describe('ParseCandidateProcessor', () => {
  let processor: ParseCandidateProcessor;
  let db: any;
  let agent: { parseResume: jest.Mock };
  let sourcingAgent: { enrichCandidateProfile: jest.Mock };
  let embedQueue: { add: jest.Mock };

  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      candidate: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    agent = { parseResume: jest.fn() };
    sourcingAgent = { enrichCandidateProfile: jest.fn() };
    embedQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParseCandidateProcessor,
        { provide: PrismaService, useValue: db },
        { provide: MatchmakerAgent, useValue: agent },
        { provide: SourcingAgent, useValue: sourcingAgent },
        {
          provide: getQueueToken(QUEUES.EMBED_CANDIDATE),
          useValue: embedQueue,
        },
      ],
    }).compile();

    processor = module.get(ParseCandidateProcessor);
  });

  it('throws NonRetryableError when candidate not found', async () => {
    db.candidate.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ candidateId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('skips agent and enqueues embed when no rawResumeText', async () => {
    db.candidate.findUnique.mockResolvedValue({
      id: candidateId,
      rawResumeText: null,
    });
    await processor.handle(makeJob({ candidateId }));
    expect(agent.parseResume).not.toHaveBeenCalled();
    expect(embedQueue.add).toHaveBeenCalledWith(
      { candidateId },
      expect.any(Object),
    );
  });

  it('parses resume via MatchmakerAgent and updates candidate', async () => {
    db.candidate.findUnique.mockResolvedValue({
      id: candidateId,
      rawResumeText: 'Alice, Senior Dev, 5yr',
      fullName: 'Alice',
    });
    const parsedJson = {
      full_name: 'Alice',
      skills: [{ name: 'TypeScript' }],
      total_years: 5,
      positions: [
        { title: 'Senior Dev', company: 'Acme', start: '2020-01', end: null },
      ],
      preferred_salary_uzs: null,
      preferred_work_mode: 'remote',
      city: 'Tashkent',
      languages: [{ name: 'Russian', level: 'C2' }],
    };
    agent.parseResume.mockResolvedValue(parsedJson);
    db.candidate.update.mockResolvedValue({});

    await processor.handle(makeJob({ candidateId }));

    expect(db.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: candidateId },
        data: expect.objectContaining({
          skills: ['TypeScript'],
          yearsExperience: 5,
        }),
      }),
    );
    expect(embedQueue.add).toHaveBeenCalledWith(
      { candidateId },
      expect.any(Object),
    );
  });

  it('handles agent failure gracefully', async () => {
    db.candidate.findUnique.mockResolvedValue({
      id: candidateId,
      rawResumeText: 'some resume',
      fullName: 'Alice',
    });
    agent.parseResume.mockRejectedValue(new Error('Parse error'));
    db.candidate.update.mockResolvedValue({});

    await processor.handle(makeJob({ candidateId }));

    expect(db.candidate.update).toHaveBeenCalled();
  });
});
