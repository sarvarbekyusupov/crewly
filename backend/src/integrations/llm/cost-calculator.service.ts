import { Injectable } from '@nestjs/common';

// Prices per 1M tokens in USD (as of 2026-05)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gpt-4o': { input: 5, output: 15 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'text-embedding-004': { input: 0, output: 0 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama3-70b-8192': { input: 0.59, output: 0.79 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
};

@Injectable()
export class CostCalculatorService {
  compute(
    model: string,
    usage:
      | {
          input_tokens?: number;
          output_tokens?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
        }
      | undefined,
  ): number {
    if (!usage) return 0;
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;

    const input = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const output = usage.output_tokens ?? usage.completion_tokens ?? 0;

    return (
      (input / 1_000_000) * pricing.input +
      (output / 1_000_000) * pricing.output
    );
  }
}
