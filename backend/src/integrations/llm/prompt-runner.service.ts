import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Langfuse } from 'langfuse';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { CostCalculatorService } from './cost-calculator.service';
import { GroqProvider } from './providers/groq.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { BedrockProvider } from './providers/bedrock.provider';

export interface PromptContext {
  related_entity_type?: string;
  related_entity_id?: string;
  company_id?: string;
  job_id?: string;
  agent_name?: string;
}

export interface RunOptions {
  model?: string;
  provider?: 'groq' | 'anthropic' | 'bedrock';
  system?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

@Injectable()
export class PromptRunnerService {
  private readonly logger = new Logger(PromptRunnerService.name);
  private readonly openai: OpenAI | null;
  private readonly groq: GroqProvider;
  private readonly anthropic: AnthropicProvider;
  private readonly bedrock: BedrockProvider;
  private readonly langfuse: Langfuse | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly costCalc: CostCalculatorService,
    private readonly emitter: EventEmitter2,
  ) {
    this.groq = new GroqProvider(config);
    this.anthropic = new AnthropicProvider(config);
    this.bedrock = new BedrockProvider(config);

    if (
      !this.groq.isAvailable() &&
      !this.anthropic.isAvailable() &&
      !this.bedrock.isAvailable()
    ) {
      this.logger.warn(
        'No LLM provider configured — all agent calls will fail',
      );
    }

    const openaiKey = config.get<string>('OPENAI_API_KEY');
    this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
    if (!this.openai)
      this.logger.warn('OPENAI_API_KEY not set — embeddings will fail');

    const lfPubKey = config.get<string>('LANGFUSE_PUBLIC_KEY');
    const lfSecKey = config.get<string>('LANGFUSE_SECRET_KEY');
    const lfHost =
      config.get<string>('LANGFUSE_HOST') || 'https://cloud.langfuse.com';

    if (lfPubKey && lfSecKey) {
      this.langfuse = new Langfuse({
        publicKey: lfPubKey,
        secretKey: lfSecKey,
        baseUrl: lfHost,
      });
      this.logger.log('Langfuse tracing enabled');
    }
  }

  async run(
    promptName: string,
    promptVersion: string,
    purpose: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: RunOptions = {},
    ctx: PromptContext = {},
  ): Promise<{ output: string; callId: string }> {
    const modelName = opts.model ?? 'llama-3.3-70b-versatile';
    const maxTokens = opts.maxTokens ?? 4096;
    const temperature = opts.temperature ?? 0.3;
    const startedAt = Date.now();

    if (ctx.company_id && ctx.agent_name) {
      this.emitter.emit('company.event', {
        type: 'agent.thought',
        companyId: ctx.company_id,
        payload: {
          agent: ctx.agent_name,
          action: 'started',
          purpose,
          promptName,
        },
      });
    }

    let outputText: string | undefined;
    let error: string | undefined;
    let providerUsed = 'unknown';
    let rawResponse: unknown;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let finishReason: string | null = null;

    // Create Langfuse trace & generation if configured
    let lfTrace: any = null;
    let lfGeneration: any = null;

    if (this.langfuse) {
      lfTrace = this.langfuse.trace({
        name: promptName,
        userId: ctx.company_id || undefined,
        metadata: {
          purpose,
          promptVersion,
          relatedEntityType: ctx.related_entity_type,
          relatedEntityId: ctx.related_entity_id,
          agentName: ctx.agent_name,
          jobId: ctx.job_id,
        },
      });

      lfGeneration = lfTrace.generation({
        name: purpose,
        model: modelName,
        modelParameters: {
          temperature,
          maxTokens,
        },
        input: messages as any,
      });
    }

    try {
      // Select provider: explicit opt-in, or Groq first, Anthropic/Bedrock as fallback
      const preferredProvider = opts.provider ?? 'groq';
      const providerMap = {
        groq: this.groq,
        anthropic: this.anthropic,
        bedrock: this.bedrock,
      };
      const primary = providerMap[preferredProvider] ?? this.groq;
      const fallback =
        preferredProvider === 'anthropic'
          ? this.groq
          : preferredProvider === 'bedrock'
            ? this.groq
            : this.anthropic.isAvailable()
              ? this.anthropic
              : this.bedrock;

      if (!primary.isAvailable() && !fallback.isAvailable()) {
        throw new Error(
          'No LLM provider available — configure GROQ_API_KEY, ANTHROPIC_API_KEY, or AWS_BEARER_TOKEN_BEDROCK',
        );
      }

      let result;
      if (primary.isAvailable()) {
        try {
          result = await primary.complete(messages, {
            model: modelName,
            system: opts.system,
            maxTokens,
            temperature,
            responseFormat: opts.responseFormat,
          });
          providerUsed = primary.name;
        } catch (primaryErr: any) {
          // Only fall back on retriable errors (rate limit, 5xx); rethrow non-retriable
          if (
            primaryErr.message?.includes('non-retriable') ||
            primaryErr.name === 'NonRetryableError'
          ) {
            throw primaryErr;
          }
          this.logger.warn(
            { promptName, provider: primary.name, err: primaryErr.message },
            `${primary.name} failed, trying ${fallback.name}`,
          );
          if (!fallback.isAvailable()) throw primaryErr;
          result = await fallback.complete(messages, {
            model: modelName,
            system: opts.system,
            maxTokens,
            temperature,
            responseFormat: opts.responseFormat,
          });
          providerUsed = fallback.name;
        }
      } else {
        result = await fallback.complete(messages, {
          model: modelName,
          system: opts.system,
          maxTokens,
          temperature,
          responseFormat: opts.responseFormat,
        });
        providerUsed = fallback.name;
      }

      outputText = result.output;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      totalTokens = result.totalTokens;
      finishReason = result.finishReason;
      rawResponse = result.rawResponse;

      if (lfGeneration) {
        lfGeneration.update({
          output: outputText,
          usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: totalTokens,
          },
        });
      }
    } catch (e: any) {
      error = e.message;
      this.logger.error({ promptName, error, providerUsed }, 'LLM call failed');

      if (lfGeneration) {
        lfGeneration.update({
          statusMessage: error,
        });
      }

      throw e;
    } finally {
      const costUsd = this.costCalc.compute(modelName, {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });

      if (ctx.company_id && ctx.agent_name) {
        this.emitter.emit('company.event', {
          type: 'agent.thought',
          companyId: ctx.company_id,
          payload: {
            agent: ctx.agent_name,
            action: error ? 'failed' : 'completed',
            purpose,
            cost: costUsd,
            latency: Date.now() - startedAt,
            provider: providerUsed,
            error,
          },
        });
      }

      let callId = 'unlogged';
      try {
        const record = await this.db.llmCall.create({
          data: {
            purpose,
            relatedEntityType: ctx.related_entity_type,
            relatedEntityId: ctx.related_entity_id,
            companyId: ctx.company_id,
            jobId: ctx.job_id,
            agentName: ctx.agent_name,
            promptName,
            promptVersion,
            model: modelName,
            provider: providerUsed,
            temperature,
            maxTokens,
            requestPayload: { system: opts.system, messages } as any,
            responsePayload: rawResponse as any,
            outputText,
            finishReason,
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens,
            costUsd,
            latencyMs: Date.now() - startedAt,
            error,
          },
        });
        callId = record.id;
      } catch (dbErr: any) {
        this.logger.error(
          { promptName, dbErr: dbErr.message },
          'Failed to persist LLM call log',
        );
      }

      if (this.langfuse) {
        this.langfuse.shutdownAsync().catch(() => {});
      }

      if (!error) {
        return { output: outputText!, callId };
      }
    }
    throw new Error('unreachable');
  }

  async embed(text: string): Promise<number[]> {
    if (!this.openai)
      throw new Error(
        'OPENAI_API_KEY not configured — required for embeddings',
      );
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  }
}
