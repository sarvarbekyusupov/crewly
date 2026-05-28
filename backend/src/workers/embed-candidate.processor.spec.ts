import { Test, TestingModule } from '@nestjs/testing';
import { EmbedCandidateProcessor } from './embed-candidate.processor';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data }) as any;

describe('EmbedCandidateProcessor', () => {
  let processor: EmbedCandidateProcessor;
  let db: any;
  let llm: { embed: jest.Mock };

  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      candidate: { findUnique: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    llm = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbedCandidateProcessor,
        { provide: PrismaService, useValue: db },
        { provide: PromptRunnerService, useValue: llm },
      ],
    }).compile();

    processor = module.get(EmbedCandidateProcessor);
  });

  it('throws NonRetryableError when candidate not found', async () => {
    db.candidate.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ candidateId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('generates embedding and updates candidate in DB', async () => {
    db.candidate.findUnique.mockResolvedValue({
      id: candidateId,
      currentPosition: 'Dev',
      currentCompany: 'Acme',
      skills: ['TypeScript', 'Node.js'],
      rawResumeText: 'some resume text',
    });

    await processor.handle(makeJob({ candidateId }));

    expect(llm.embed).toHaveBeenCalledWith(expect.stringContaining('Dev'));
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  it('builds embedding text from available fields when rawResumeText is null', async () => {
    db.candidate.findUnique.mockResolvedValue({
      id: candidateId,
      currentPosition: 'Dev',
      currentCompany: null,
      skills: ['TypeScript'],
      rawResumeText: null,
    });

    await processor.handle(makeJob({ candidateId }));
    expect(llm.embed).toHaveBeenCalledWith(expect.any(String));
  });
});
