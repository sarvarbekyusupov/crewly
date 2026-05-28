import { Injectable, Logger } from '@nestjs/common';
import { NonRetryableError } from '../../workers/errors';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { CostCalculatorService } from './cost-calculator.service';

export interface PromptContext {
  related_entity_type?: string;
  related_entity_id?: string;
  company_id?: string;
  job_id?: string;
  agent_name?: string;
}

export interface RunOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

@Injectable()
export class PromptRunnerService {
  private readonly logger = new Logger(PromptRunnerService.name);
  private readonly groq: Groq | null;
  private readonly openai: OpenAI | null;

  constructor(
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly costCalc: CostCalculatorService,
    private readonly emitter: EventEmitter2,
  ) {
    const groqKey = config.get<string>('GROQ_API_KEY');
    this.groq = groqKey ? new Groq({ apiKey: groqKey }) : null;
    if (!this.groq)
      this.logger.warn('GROQ_API_KEY not set — LLM calls will fail');

    const openaiKey = config.get<string>('OPENAI_API_KEY');
    this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
    if (!this.openai)
      this.logger.warn('OPENAI_API_KEY not set — embeddings will fail');
  }

  async run(
    promptName: string,
    promptVersion: string,
    purpose: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: RunOptions = {},
    ctx: PromptContext = {},
  ): Promise<{ output: string; callId: string }> {
    if (!this.groq) throw new Error('GROQ_API_KEY not configured');

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

    let completion: Groq.Chat.ChatCompletion | undefined;
    let outputText: string | undefined;
    let error: string | undefined;

    try {
      const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
        ...(opts.system
          ? [{ role: 'system' as const, content: opts.system }]
          : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      completion = await this.groq.chat.completions.create({
        model: modelName,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature,
      });

      outputText = completion.choices[0]?.message?.content ?? '';
    } catch (e: any) {
      error = e.message;
      this.logger.error(
        { promptName, error, status: e.status },
        'LLM call failed',
      );
      // 400/401/403: bad config or request data — retrying won't help
      if (e.status === 400 || e.status === 401 || e.status === 403) {
        throw new NonRetryableError(
          `LLM non-retriable: ${e.status} ${e.message}`,
        );
      }
      throw e; // 429 rate limit, 5xx server errors → BullMQ retries with backoff
    } finally {
      const usage = completion?.usage;
      const costUsd = this.costCalc.compute(modelName, {
        input_tokens: usage?.prompt_tokens,
        output_tokens: usage?.completion_tokens,
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
            error,
          },
        });
      }

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
          provider: 'groq',
          temperature,
          maxTokens,
          requestPayload: { system: opts.system, messages } as any,
          responsePayload: completion as any,
          outputText,
          finishReason: completion?.choices[0]?.finish_reason,
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
          costUsd,
          latencyMs: Date.now() - startedAt,
          error,
        },
      });
      if (!error) {
        return { output: outputText!, callId: record.id };
      }
    }
    // unreachable: error path always rethrows in try block
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
