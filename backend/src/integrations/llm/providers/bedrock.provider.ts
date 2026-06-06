import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { NonRetryableError } from '../../../workers/errors';
import {
  LlmProvider,
  LlmCompletionOpts,
  LlmCompletionResult,
} from './llm-provider.interface';

const GROQ_TO_BEDROCK: Record<string, string> = {
  'llama-3.3-70b-versatile': 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  'llama-3.1-8b-instant': 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
};

@Injectable()
export class BedrockProvider implements LlmProvider {
  readonly name = 'bedrock';
  private readonly logger = new Logger(BedrockProvider.name);
  private readonly client: AnthropicBedrock | null;

  constructor(config: ConfigService) {
    const token = config.get<string>('AWS_BEARER_TOKEN_BEDROCK');
    const region = config.get<string>('AWS_BEDROCK_REGION') ?? 'us-east-1';
    if (token) {
      // SDK reads AWS_BEARER_TOKEN_BEDROCK from env automatically
      process.env.AWS_BEARER_TOKEN_BEDROCK = token;
      this.client = new AnthropicBedrock({ awsRegion: region });
    } else {
      this.client = null;
      this.logger.warn('AWS_BEARER_TOKEN_BEDROCK not set — Bedrock unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: LlmCompletionOpts,
  ): Promise<LlmCompletionResult> {
    if (!this.client) throw new Error('Bedrock not configured');

    const groqModel = opts.model ?? 'llama-3.3-70b-versatile';
    const model =
      GROQ_TO_BEDROCK[groqModel] ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.system && {
          system: [
            {
              type: 'text' as const,
              text: opts.system,
              cache_control: { type: 'ephemeral' as const },
            },
          ],
        }),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const output = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const usage = response.usage as any;
      return {
        output,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        finishReason: response.stop_reason,
        rawResponse: response,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      };
    } catch (e: any) {
      if (e.status === 400 || e.status === 401 || e.status === 403) {
        throw new NonRetryableError(
          `Bedrock non-retriable: ${e.status} ${e.message}`,
        );
      }
      throw e;
    }
  }
}
