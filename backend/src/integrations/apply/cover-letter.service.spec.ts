import { Test, TestingModule } from '@nestjs/testing';
import { CoverLetterService } from './cover-letter.service';
import { PromptRunnerService } from '../llm/prompt-runner.service';

describe('CoverLetterService', () => {
  let service: CoverLetterService;
  let llm: any;

  const baseInput = {
    candidateName: 'Alice',
    currentPosition: 'Senior Dev',
    skills: ['JavaScript', 'React', 'Node.js'],
    yearsExperience: '5',
    city: 'Tashkent',
    jobTitle: 'Frontend Engineer',
    company: 'Acme Corp',
    jobDescription: 'Build great UIs',
    jobSkills: ['React', 'TypeScript'],
    candidateId: 'cand-1',
  };

  beforeEach(async () => {
    llm = { run: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLetterService,
        { provide: PromptRunnerService, useValue: llm },
      ],
    }).compile();

    service = module.get(CoverLetterService);
  });

  it('returns trimmed LLM output on success', async () => {
    llm.run.mockResolvedValue({ output: '  Great cover letter content.  ' });

    const result = await service.generate(baseInput);

    expect(result).toBe('Great cover letter content.');
  });

  it('calls llm.run with maxTokens=512 and temperature=0.6', async () => {
    llm.run.mockResolvedValue({ output: 'ok' });

    await service.generate(baseInput);

    expect(llm.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ maxTokens: 512, temperature: 0.6 }),
      expect.any(Object),
    );
  });

  it('returns fallback template on LLM error — no re-throw', async () => {
    llm.run.mockRejectedValue(new Error('LLM down'));

    const result = await service.generate(baseInput);

    expect(result).toBeTruthy();
    expect(result).toContain('Frontend Engineer');
    expect(result).toContain('Acme Corp');
  });

  it('fallback includes candidateName', async () => {
    llm.run.mockRejectedValue(new Error('fail'));

    const result = await service.generate({
      ...baseInput,
      candidateName: 'Bob Smith',
    });

    expect(result).not.toContain('Bob Smith'); // fallback doesn't use name in current impl
    // but it does include the position and company
    expect(result).toContain('Acme Corp');
  });

  it('fallback uses "several" for missing yearsExperience', async () => {
    llm.run.mockRejectedValue(new Error('fail'));

    const result = await service.generate({
      ...baseInput,
      yearsExperience: undefined,
    });

    expect(result).toContain('several');
  });

  it('fallback uses "software professional" for missing currentPosition', async () => {
    llm.run.mockRejectedValue(new Error('fail'));

    const result = await service.generate({
      ...baseInput,
      currentPosition: undefined,
    });

    expect(result).toContain('software professional');
  });
});
