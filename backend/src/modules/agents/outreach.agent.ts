import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { outreachFallback, outreachPersonalizedPrompt } from '@my-hr/prompts';

@Injectable()
export class OutreachAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'OutreachWriter',
        role: 'Recruiting Copywriter',
        goal: 'Craft highly personalized, compelling outreach messages that maximize candidate response rates.',
        backstory:
          'You are an elite talent sourcer known for your incredibly high response rates. You never send generic templates. You always find specific, verified details about a candidate (like GitHub projects or specific past achievements) and tie them directly to why they would be perfect for the open role.',
      },
      llm,
    );
  }

  async generatePersonalizedMessage(
    candidate: {
      name: string;
      currentPosition: string | null;
      skills: string[];
      socialProof?: Record<string, unknown>;
    },
    job: {
      title: string;
      requiredSkills: string[];
    },
    matchAnalysis?: Record<string, unknown>,
    applicationId?: string,
  ): Promise<string> {
    const fallback = outreachFallback(candidate.name, job.title);
    const prompt = outreachPersonalizedPrompt(candidate, job, matchAnalysis);

    try {
      const { output } = await this.runLlm(
        'hyper_personalized_outreach',
        [{ role: 'user', content: prompt }],
        { maxTokens: 400, temperature: 0.7 },
        applicationId
          ? {
              related_entity_type: 'application',
              related_entity_id: applicationId,
            }
          : {},
      );

      return output.trim() || fallback;
    } catch (err: any) {
      return fallback;
    }
  }
}
