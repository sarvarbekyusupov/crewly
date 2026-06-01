import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { NonRetryableError } from '../../../workers/errors';
import {
  LlmProvider,
  LlmCompletionOpts,
  LlmCompletionResult,
} from './llm-provider.interface';

@Injectable()
export class GroqProvider implements LlmProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('GROQ_API_KEY');
    this.client = key ? new Groq({ apiKey: key }) : null;
    if (!this.client)
      this.logger.warn('GROQ_API_KEY not set — Groq unavailable');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: LlmCompletionOpts,
  ): Promise<LlmCompletionResult> {
    if (!this.client) throw new Error('Groq not configured');

    const model = opts.model ?? 'llama-3.3-70b-versatile';
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      ...(opts.system
        ? [{ role: 'system' as const, content: opts.system }]
        : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: groqMessages,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.3,
        ...(opts.responseFormat
          ? { response_format: opts.responseFormat }
          : {}),
      });

      return {
        output: completion.choices[0]?.message?.content ?? '',
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        finishReason: completion.choices[0]?.finish_reason ?? null,
        rawResponse: completion,
      };
    } catch (e: any) {
      if (e.status === 400 || e.status === 401 || e.status === 403) {
        throw new NonRetryableError(
          `Groq non-retriable: ${e.status} ${e.message}`,
        );
      }
      throw e;
    }
  }
}
