import { Test, TestingModule } from '@nestjs/testing';
import { SeekerAgent } from './seeker.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';

describe('SeekerAgent', () => {
  let agent: SeekerAgent;
  let llm: { run: jest.Mock };

  const candidate = {
    name: 'Alice',
    skills: ['TypeScript', 'NestJS'],
    experience: 5,
    settings: { auto_apply: true },
  };

  const job = {
    title: 'Senior Backend Engineer',
    company: 'Acme Corp',
    description: 'Build scalable APIs.',
    matchScore: 90,
  };

  beforeEach(async () => {
    llm = { run: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeekerAgent,
        { provide: PromptRunnerService, useValue: llm },
      ],
    }).compile();

    agent = module.get(SeekerAgent);
  });

  it('returns parsed decision when LLM output is valid JSON', async () => {
    llm.run.mockResolvedValue({
      output: JSON.stringify({
        should_apply: true,
        reason: 'Great match',
        cover_letter: 'Dear Hiring Manager...',
      }),
    });

    const result = await agent.decideAndDraftApplication(candidate, job);

    expect(result.should_apply).toBe(true);
    expect(result.reason).toBe('Great match');
    expect(result.cover_letter).toBe('Dear Hiring Manager...');
  });

  it('returns should_apply true via score fallback when LLM output is invalid JSON and matchScore >= 85', async () => {
    llm.run.mockResolvedValue({ output: 'not json at all' });

    const result = await agent.decideAndDraftApplication(candidate, { ...job, matchScore: 90 });

    expect(result.should_apply).toBe(true);
    expect(result.reason).toMatch(/fallback/i);
  });

  it('returns should_apply false via score fallback when matchScore < 85', async () => {
    llm.run.mockResolvedValue({ output: 'invalid' });

    const result = await agent.decideAndDraftApplication(candidate, { ...job, matchScore: 60 });

    expect(result.should_apply).toBe(false);
  });

  it('passes candidateId to runLlm context when provided', async () => {
    llm.run.mockResolvedValue({ output: '{}' });

    await agent.decideAndDraftApplication(candidate, job, 'cand-123');

    expect(llm.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining({ related_entity_id: 'cand-123' }),
    );
  });
});
