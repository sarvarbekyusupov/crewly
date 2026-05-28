import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PromptRunnerService } from './prompt-runner.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CostCalculatorService } from './cost-calculator.service';
import { NonRetryableError } from '../../workers/errors';

const mockGroqCreate = jest.fn();
const mockEmbedCreate = jest.fn();

jest.mock('groq-sdk', () => {
  const MockGroq = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  }));
  return MockGroq;
});

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbedCreate },
  }));
  return MockOpenAI;
});

describe('PromptRunnerService', () => {
  let service: PromptRunnerService;
  let db: { llmCall: { create: jest.Mock } };
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    db = { llmCall: { create: jest.fn().mockResolvedValue({ id: 'call-1' }) } };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptRunnerService,
        CostCalculatorService,
        { provide: PrismaService, useValue: db },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GROQ_API_KEY') return 'groq-key';
              if (key === 'OPENAI_API_KEY') return 'openai-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PromptRunnerService);
  });

  describe('run', () => {
    it('returns output and callId on success', async () => {
      mockGroqCreate.mockResolvedValue({
        choices: [
          { message: { content: 'LLM output' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await service.run('test-prompt', 'v1', 'parse', [
        { role: 'user', content: 'Hello' },
      ]);
      expect(result.output).toBe('LLM output');
      expect(result.callId).toBe('call-1');
      expect(db.llmCall.create).toHaveBeenCalled();
    });

    it('throws NonRetryableError on 400 status error', async () => {
      const err: any = new Error('Bad request');
      err.status = 400;
      mockGroqCreate.mockRejectedValue(err);

      await expect(
        service.run('p', 'v1', 'parse', [{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(NonRetryableError);
    });

    it('rethrows on 429 rate limit error', async () => {
      const err: any = new Error('Rate limited');
      err.status = 429;
      mockGroqCreate.mockRejectedValue(err);

      await expect(
        service.run('p', 'v1', 'parse', [{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow('Rate limited');
    });

    it('includes system message when provided', async () => {
      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      await service.run('p', 'v1', 'parse', [{ role: 'user', content: 'hi' }], {
        system: 'You are helpful',
      });
      const callArgs =
        mockGroqCreate.mock.calls[mockGroqCreate.mock.calls.length - 1][0];
      const hasSystem = callArgs.messages.some((m: any) => m.role === 'system');
      expect(hasSystem).toBe(true);
    });

    it('still saves LLM call record on error', async () => {
      const err: any = new Error('Connection refused');
      err.status = 503;
      mockGroqCreate.mockRejectedValue(err);

      await expect(
        service.run('p', 'v1', 'parse', [{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow();
      expect(db.llmCall.create).toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('returns embedding vector', async () => {
      mockEmbedCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      });
      const result = await service.embed('test text');
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
