import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ParseJobProcessor } from './parse-job.processor';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { MatchmakerAgent } from '../modules/agents/matchmaker.agent';
import { QUEUES } from './queue-names';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data }) as any;

describe('ParseJobProcessor', () => {
  let processor: ParseJobProcessor;
  let db: any;
  let llm: { embed: jest.Mock };
  let agent: { parseJobDescription: jest.Mock };
  let matchQueue: { add: jest.Mock };

  const jobId = 'job-1';

  beforeEach(async () => {
    db = {
      job: { findUnique: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    llm = {
      embed: jest.fn().mockResolvedValue([0.1, 0.2]),
    };
    agent = { parseJobDescription: jest.fn() };
    matchQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParseJobProcessor,
        { provide: PrismaService, useValue: db },
        { provide: PromptRunnerService, useValue: llm },
        { provide: MatchmakerAgent, useValue: agent },
        {
          provide: getQueueToken(QUEUES.MATCH_CANDIDATES),
          useValue: matchQueue,
        },
      ],
    }).compile();

    processor = module.get(ParseJobProcessor);
  });

  it('throws NonRetryableError when job not found', async () => {
    db.job.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ jobId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('parses job, generates embedding, and updates DB', async () => {
    const dbJob = {
      id: jobId,
      title: 'Senior Dev',
      description: 'We need a senior developer',
      companyId: 'company-1',
      status: 'draft',
      requiredSkills: ['TypeScript'],
      minExperienceYears: 3,
    };
    db.job.findUnique.mockResolvedValue(dbJob);
    agent.parseJobDescription.mockResolvedValue({
      required_skills: ['TypeScript', 'Node.js'],
      nice_to_have_skills: ['GraphQL'],
      min_experience_years: 3,
      max_experience_years: 7,
    });

    await processor.handle(makeJob({ jobId }));

    expect(agent.parseJobDescription).toHaveBeenCalled();
    expect(llm.embed).toHaveBeenCalled();
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  it('enqueues match when job is already active', async () => {
    const dbJob = {
      id: jobId,
      title: 'Dev',
      description: 'desc',
      companyId: 'company-1',
      status: 'active',
      requiredSkills: [],
    };
    db.job.findUnique.mockResolvedValue(dbJob);
    agent.parseJobDescription.mockResolvedValue({});

    await processor.handle(makeJob({ jobId }));

    expect(matchQueue.add).toHaveBeenCalledWith(
      'match',
      { jobId },
      expect.any(Object),
    );
  });

  it('does not enqueue match when job is draft', async () => {
    const dbJob = {
      id: jobId,
      title: 'Dev',
      description: 'desc',
      companyId: 'company-1',
      status: 'draft',
      requiredSkills: [],
    };
    db.job.findUnique.mockResolvedValue(dbJob);
    agent.parseJobDescription.mockResolvedValue({});

    await processor.handle(makeJob({ jobId }));

    expect(matchQueue.add).not.toHaveBeenCalled();
  });

  it('handles agent failure gracefully by throwing error to trigger Bull retry', async () => {
    const dbJob = {
      id: jobId,
      title: 'Dev',
      description: 'desc',
      companyId: 'company-1',
      status: 'draft',
      requiredSkills: [],
    };
    db.job.findUnique.mockResolvedValue(dbJob);
    agent.parseJobDescription.mockRejectedValue(new Error('Parse error'));

    await expect(processor.handle(makeJob({ jobId }))).rejects.toThrow('Parse error');
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
});
