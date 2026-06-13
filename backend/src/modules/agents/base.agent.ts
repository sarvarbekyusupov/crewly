import {
  PromptRunnerService,
  RunOptions,
  PromptContext,
} from '../../integrations/llm/prompt-runner.service';
import { AgentMetadata } from './agent.types';

export function extractJson(output: string): string {
  // Strip markdown code fences (```json...``` or ```...```)
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find first { or [ and trim trailing garbage
  const start = output.search(/[{[]/);
  if (start === -1) return output;
  const end = Math.max(output.lastIndexOf('}'), output.lastIndexOf(']'));
  if (end === -1) return output;
  return output.slice(start, end + 1);
}

export abstract class BaseAgent {
  constructor(
    protected readonly metadata: AgentMetadata,
    protected readonly llm: PromptRunnerService,
  ) {}

  protected async runLlm(
    purpose: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: RunOptions = {},
    ctx: PromptContext = {},
    version = '1.0',
  ) {
    return this.llm.run(
      `${this.metadata.name}:${purpose}`,
      version,
      purpose,
      messages,
      {
        ...opts,
        system: opts.skipAgentIdentity
          ? (opts.system ?? '')
          : this.constructSystemPrompt(opts.system),
      },
      {
        ...ctx,
        agent_name: this.metadata.name,
      },
    );
  }

  protected constructSystemPrompt(extraSystem?: string): string {
    const base = `You are ${this.metadata.name}, ${this.metadata.role}. ${this.metadata.goal}`;
    const backstory = this.metadata.backstory
      ? `\n${this.metadata.backstory}`
      : '';
    return `${base}${backstory}${extraSystem ? '\n' + extraSystem : ''}`;
  }
}
