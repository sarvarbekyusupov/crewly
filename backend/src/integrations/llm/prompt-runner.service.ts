import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Langfuse } from 'langfuse';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { CostCalculatorService } from './cost-calculator.service';
import { LlmProvider } from './providers/llm-provider.interface';
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
  /** Skip prepending agent identity — use for structured extraction tasks */
  skipAgentIdentity?: boolean;
}

const LLM_TIMEOUT_MS = 90_000;

function withLlmTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    factory(controller.signal),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`LLM call timed out after ${LLM_TIMEOUT_MS / 1000}s`));
      }, LLM_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

@Injectable()
export class PromptRunnerService implements OnModuleDestroy {
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
    let effectiveModel = modelName;
    let rawResponse: unknown;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;
    let finishReason: string | null = null;
    let callId = 'unlogged';

    // Create Langfuse trace & generation if configured
    let lfTrace: any = null;
    let lfGeneration: any = null;

    if (this.langfuse) {
      lfTrace = this.langfuse.trace({
        name: promptName,
        sessionId: ctx.company_id || undefined,
        metadata: {
          purpose,
          promptVersion,
          companyId: ctx.company_id,
          relatedEntityType: ctx.related_entity_type,
          relatedEntityId: ctx.related_entity_id,
          agentName: ctx.agent_name,
          jobId: ctx.job_id,
        },
      });

      lfGeneration = lfTrace.generation({
        name: purpose,
        model: modelName,
        modelParameters: { temperature, maxTokens },
        input: {
          system: opts.system ? opts.system.slice(0, 1000) : undefined,
          messages: messages.map((m) => ({
            role: m.role,
            content:
              m.content.length > 2000
                ? m.content.slice(0, 2000) + '…[truncated]'
                : m.content,
          })),
        } as any,
      });
    }

    try {
      const callOpts = {
        model: modelName,
        system: opts.system,
        maxTokens,
        temperature,
        responseFormat: opts.responseFormat,
      };

      // Build ordered provider list: preferred first, then remaining in default order
      const preferredName = opts.provider ?? 'groq';
      const allProviders: LlmProvider[] = [
        this.groq,
        this.anthropic,
        this.bedrock,
      ];
      const ordered = [
        ...allProviders.filter((p) => p.name === preferredName),
        ...allProviders.filter((p) => p.name !== preferredName),
      ].filter((p) => p.isAvailable());

      if (ordered.length === 0) {
        throw new Error(
          'No LLM provider available — configure GROQ_API_KEY, ANTHROPIC_API_KEY, or AWS_BEARER_TOKEN_BEDROCK',
        );
      }

      let result;
      let lastErr: Error | undefined;
      const qualityPinned =
        opts.provider === 'anthropic' || opts.provider === 'bedrock';

      for (let i = 0; i < ordered.length; i++) {
        const provider = ordered[i];
        try {
          result = await withLlmTimeout((signal) =>
            provider.complete(messages, { ...callOpts, signal }),
          );
          providerUsed = provider.name;
          break;
        } catch (err: any) {
          if (
            err.message?.includes('non-retriable') ||
            err.name === 'NonRetryableError'
          ) {
            throw err;
          }
          lastErr = err;
          const next = ordered[i + 1];
          if (next) {
            if (qualityPinned && i === 0) {
              this.logger.error(
                {
                  promptName,
                  provider: provider.name,
                  next: next.name,
                  err: err.message,
                },
                `Quality-pinned provider ${provider.name} failed — trying ${next.name}; output quality may be degraded`,
              );
            } else {
              this.logger.warn(
                { promptName, provider: provider.name, err: err.message },
                `${provider.name} failed, trying ${next.name}`,
              );
            }
          }
        }
      }

      if (!result) throw lastErr!;

      outputText = result.output;
      effectiveModel = result.actualModel;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      totalTokens = result.totalTokens;
      cacheReadTokens = result.cacheReadTokens ?? 0;
      cacheCreationTokens = result.cacheCreationTokens ?? 0;
      finishReason = result.finishReason;
      rawResponse = result.rawResponse;

      if (lfGeneration) {
        lfGeneration.update({
          model: effectiveModel,
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

      if (lfGeneration) lfGeneration.update({ statusMessage: error });
      if (lfTrace) lfTrace.update({ level: 'ERROR', statusMessage: error });

      throw e;
    } finally {
      const costUsd = this.costCalc.compute(effectiveModel, {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_tokens: cacheReadTokens,
        cache_creation_tokens: cacheCreationTokens,
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
            model: effectiveModel,
            provider: providerUsed,
            temperature,
            maxTokens,
            requestPayload: {
              system: opts.system?.slice(0, 1000),
              messages: messages.map((m) => ({
                role: m.role,
                content:
                  m.content.length > 2000
                    ? m.content.slice(0, 2000) + '…[truncated]'
                    : m.content,
              })),
            } as any,
            responsePayload: (() => {
              if (!rawResponse) return null;
              const s = JSON.stringify(rawResponse);
              return s.length <= 8_000
                ? rawResponse
                : ({ _truncated: true, preview: s.slice(0, 8_000) } as any);
            })(),
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
    }

    return { output: outputText!, callId };
  }

  async embed(text: string, ctx: PromptContext = {}): Promise<number[]> {
    if (!this.openai)
      throw new Error(
        'OPENAI_API_KEY not configured — required for embeddings',
      );
    const model = 'text-embedding-3-small';
    const startedAt = Date.now();
    let embedError: string | undefined;
    let promptTokens = 0;
    let totalTokens = 0;
    let costUsd = 0;

    let lfTrace: any = null;
    let lfGeneration: any = null;
    if (this.langfuse) {
      lfTrace = this.langfuse.trace({
        name: 'embed',
        sessionId: ctx.company_id || undefined,
        metadata: {
          relatedEntityType: ctx.related_entity_type,
          relatedEntityId: ctx.related_entity_id,
          companyId: ctx.company_id,
          jobId: ctx.job_id,
        },
      });
      lfGeneration = lfTrace.generation({
        name: 'embed',
        model,
        input: text.slice(0, 200),
      });
    }

    try {
      const response = await withLlmTimeout((signal) =>
        this.openai!.embeddings.create(
          { model, input: text.slice(0, 8000) },
          { signal },
        ),
      );
      const usage = response.usage;
      promptTokens = usage.prompt_tokens;
      totalTokens = usage.total_tokens;
      costUsd = this.costCalc.compute(model, {
        input_tokens: promptTokens,
        output_tokens: 0,
      });

      if (lfGeneration) {
        lfGeneration.update({
          usage: { promptTokens, completionTokens: 0, totalTokens },
        });
      }

      return response.data[0].embedding;
    } catch (e: any) {
      embedError = e.message;
      if (lfGeneration) lfGeneration.update({ statusMessage: embedError });
      if (lfTrace)
        lfTrace.update({ level: 'ERROR', statusMessage: embedError });
      throw e;
    } finally {
      this.db.llmCall
        .create({
          data: {
            purpose: 'embed',
            relatedEntityType: ctx.related_entity_type,
            relatedEntityId: ctx.related_entity_id,
            companyId: ctx.company_id,
            jobId: ctx.job_id,
            agentName: ctx.agent_name,
            promptName: 'embed',
            promptVersion: 'v1',
            model,
            provider: 'openai',
            temperature: 0,
            maxTokens: 0,
            promptTokens,
            completionTokens: 0,
            totalTokens,
            costUsd,
            latencyMs: Date.now() - startedAt,
            error: embedError,
          },
        })
        .catch(() => {});
    }
  }

  async onModuleDestroy() {
    if (this.langfuse) {
      await this.langfuse.shutdownAsync().catch(() => {});
    }
  }
}
