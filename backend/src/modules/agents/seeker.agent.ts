import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { seekerDecideAndDraftPrompt } from '@crewly/prompts';

const SeekerApplicationDecisionSchema = z.object({
  should_apply: z.boolean(),
  reason: z.string(),
  cover_letter: z.string().optional(),
});

@Injectable()
export class SeekerAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'CareerPilot',
        role: 'Personal Career Agent',
        goal: "Autonomously manage a candidate's job search, identifying the best roles and applying with high-impact, personalized cover letters.",
        backstory:
          'You are a dedicated career agent for top-tier talent. Your only loyalty is to your candidate. You sift through hundreds of jobs to find the perfect fit, ensuring the candidate only applies to roles that match their career trajectory, salary goals, and lifestyle preferences.',
      },
      llm,
    );
  }

  async decideAndDraftApplication(
    candidate: {
      name: string;
      skills: string[];
      experience: number;
      settings: {
        auto_apply: boolean;
        min_salary_uzs?: string;
        preferred_modes?: string[];
      };
    },
    job: {
      title: string;
      company: string;
      description: string;
      matchScore: number;
    },
    candidateId?: string,
  ): Promise<{
    should_apply: boolean;
    reason: string;
    cover_letter?: string;
  }> {
    const prompt = seekerDecideAndDraftPrompt(candidate, job);

    const { output } = await this.runLlm(
      'seeker_application_decision',
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 800,
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      },
      candidateId
        ? { related_entity_type: 'candidate', related_entity_id: candidateId }
        : {},
    );

    try {
      const parsed = JSON.parse(output);
      return SeekerApplicationDecisionSchema.parse(parsed);
    } catch {
      return {
        should_apply: job.matchScore >= 85, // Default to true for elite matches
        reason: 'Failed to parse agent decision, using match score fallback.',
      };
    }
  }
}
