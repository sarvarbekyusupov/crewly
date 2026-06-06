import {
  PromptRunnerService,
  RunOptions,
  PromptContext,
} from '../../integrations/llm/prompt-runner.service';
import { AgentMetadata } from './agent.types';

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
  ) {
    return this.llm.run(
      this.metadata.name,
      '1.0',
      purpose,
      messages,
      {
        ...opts,
        system: this.constructSystemPrompt(opts.system),
      },
      {
        ...ctx,
        agent_name: this.metadata.name,
      },
    );
  }

  protected constructSystemPrompt(extraSystem?: string): string {
    return `You are ${this.metadata.name}, ${this.metadata.role}. ${this.metadata.goal}${extraSystem ? '\n' + extraSystem : ''}`;
  }
}
