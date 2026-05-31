import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { SCREENING_SYSTEM_PROMPT, screeningUserContext } from '@my-hr/prompts';

export interface ScreeningResponse {
  action: 'continue' | 'complete';
  message?: string;
  assessment?: {
    technical_score: number;
    experience_depth_score: number;
    communication_score: number;
    availability_score: number;
    salary_fit_score: number;
    overall_score: number;
    strengths: string[];
    concerns: string[];
    recommendation: 'advance' | 'reject' | 'maybe';
    summary: string;
  };
}

const ScreeningResponseSchema = z.object({
  action: z.enum(['continue', 'complete']),
  message: z.string().optional(),
  assessment: z
    .object({
      technical_score: z.number(),
      experience_depth_score: z.number(),
      communication_score: z.number(),
      availability_score: z.number(),
      salary_fit_score: z.number(),
      overall_score: z.number(),
      strengths: z.array(z.string()),
      concerns: z.array(z.string()),
      recommendation: z.enum(['advance', 'reject', 'maybe']),
      summary: z.string(),
    })
    .optional(),
});

@Injectable()
export class ScreeningAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'ScreeningBot',
        role: 'AI Recruiter',
        goal: 'Assess technical skills, experience, motivation, and job fit through a conversational interview.',
        backstory:
          'You are a professional and friendly AI recruiter. You know how to ask probing questions to validate a candidate\'s claims and evaluate their cultural fit.',
      },
      llm,
    );
  }

  async advance(
    job: { title: string },
    candidate: { fullName: string; skills: string[]; yearsExperience: number },
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    screeningId?: string,
  ): Promise<ScreeningResponse> {
    const contextMessages =
      messages.length === 0
        ? [{ role: 'user' as const, content: screeningUserContext(job, candidate) }]
        : messages;

    const { output } = await this.runLlm(
      'screening',
      contextMessages,
      { maxTokens: 1024, temperature: 0.7, system: SCREENING_SYSTEM_PROMPT, responseFormat: { type: 'json_object' } },
      screeningId
        ? { related_entity_type: 'screening', related_entity_id: screeningId }
        : {},
    );

    try {
      const parsed = JSON.parse(output);
      return ScreeningResponseSchema.parse(parsed);
    } catch {
      return { action: 'continue', message: output };
    }
  }
}
