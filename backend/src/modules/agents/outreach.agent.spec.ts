import { Test, TestingModule } from '@nestjs/testing';
import { OutreachAgent } from './outreach.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';

describe('OutreachAgent', () => {
  let agent: OutreachAgent;
  let llm: { run: jest.Mock };

  const candidate = {
    name: 'Bob',
    currentPosition: 'Backend Engineer',
    skills: ['Go', 'Kubernetes'],
  };

  const job = {
    title: 'Staff Engineer',
    requiredSkills: ['Go', 'Kubernetes', 'AWS'],
  };

  beforeEach(async () => {
    llm = { run: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachAgent,
        { provide: PromptRunnerService, useValue: llm },
      ],
    }).compile();

    agent = module.get(OutreachAgent);
  });

  it('returns trimmed LLM output on success', async () => {
    llm.run.mockResolvedValue({ output: '  Hey Bob, we have a great role!  ' });

    const result = await agent.generatePersonalizedMessage(candidate, job);

    expect(result).toBe('Hey Bob, we have a great role!');
  });

  it('returns fallback when LLM output is empty string', async () => {
    llm.run.mockResolvedValue({ output: '' });

    const result = await agent.generatePersonalizedMessage(candidate, job);

    expect(result).toContain('Bob');
    expect(result).toContain('Staff Engineer');
  });

  it('returns fallback when LLM throws', async () => {
    llm.run.mockRejectedValue(new Error('LLM timeout'));

    const result = await agent.generatePersonalizedMessage(candidate, job);

    expect(result).toContain('Bob');
    expect(result).toContain('Staff Engineer');
  });

  it('passes applicationId to context when provided', async () => {
    llm.run.mockResolvedValue({ output: 'Hi Bob!' });

    await agent.generatePersonalizedMessage(candidate, job, undefined, 'app-42');

    expect(llm.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining({ related_entity_id: 'app-42' }),
    );
  });
});
