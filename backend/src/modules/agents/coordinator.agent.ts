import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { coordinatorDecidePrompt } from '@my-hr/prompts';

const CoordinatorDecisionSchema = z.object({
  action: z.enum([
    'trigger_sourcing',
    'trigger_matching',
    'trigger_screening',
    'schedule_interview',
    'notify_human',
    'wait',
  ]),
  reason: z.string(),
});

@Injectable()
export class CoordinatorAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'Coordinator',
        role: 'Orchestration Manager',
        goal: 'Seamlessly manage the recruitment pipeline by coordinating between specialized agents and platform events.',
        backstory:
          'You are the ultimate logistics expert for HR. You ensure no candidate is dropped and every job is filled by triggering the right agent at the right time.',
      },
      llm,
    );
  }

  async decideNextSteps(
    context: {
      eventType: string;
      entityType: string;
      entityId: string;
      currentStatus: string;
    },
    metadata?: any,
  ): Promise<{
    action:
      | 'trigger_sourcing'
      | 'trigger_matching'
      | 'trigger_screening'
      | 'schedule_interview'
      | 'notify_human'
      | 'wait';
    reason: string;
  }> {
    const prompt = coordinatorDecidePrompt(context, metadata);

    const { output } = await this.runLlm(
      'orchestration_decision',
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 512,
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      },
    );

    try {
      const parsed = JSON.parse(output);
      return CoordinatorDecisionSchema.parse(parsed);
    } catch {
      return { action: 'wait', reason: 'Coordinator failed to decide' };
    }
  }
}
