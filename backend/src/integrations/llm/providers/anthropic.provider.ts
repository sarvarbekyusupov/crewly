import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { NonRetryableError } from '../../../workers/errors';
import {
  LlmProvider,
  LlmCompletionOpts,
  LlmCompletionResult,
} from './llm-provider.interface';

const GROQ_TO_ANTHROPIC: Record<string, string> = {
  'llama-3.3-70b-versatile': 'claude-haiku-4-5-20251001',
  'llama-3.1-8b-instant': 'claude-haiku-4-5-20251001',
};

@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('ANTHROPIC_API_KEY');
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client)
      this.logger.warn('ANTHROPIC_API_KEY not set — Anthropic unavailable');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: LlmCompletionOpts,
  ): Promise<LlmCompletionResult> {
    if (!this.client) throw new Error('Anthropic not configured');

    const groqModel = opts.model ?? 'llama-3.3-70b-versatile';
    const model = GROQ_TO_ANTHROPIC[groqModel] ?? 'claude-haiku-4-5-20251001';

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.system && { system: opts.system }),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const output = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      return {
        output,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        finishReason: response.stop_reason,
        rawResponse: response,
      };
    } catch (e: any) {
      if (e.status === 400 || e.status === 401 || e.status === 403) {
        throw new NonRetryableError(
          `Anthropic non-retriable: ${e.status} ${e.message}`,
        );
      }
      throw e;
    }
  }
}
