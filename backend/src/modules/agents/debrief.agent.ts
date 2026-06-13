import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent, extractJson } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import {
  debriefSynthesizeFeedbackPrompt,
  debriefAnalyzeTranscriptPrompt,
} from '@crewly/prompts';

const TranscriptAnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  summary: z.string(),
  overall_score: z.number(),
  dimensions: z.object({
    technical_depth: z.number(),
    communication: z.number(),
    cultural_fit: z.number(),
    experience_relevance: z.number(),
    enthusiasm: z.number(),
  }),
  key_takeaways: z.array(z.string()),
  confirmations: z.array(z.string()),
  discrepancies: z.array(z.string()),
  red_flags: z.array(z.string()),
  recruiter_advice: z.string(),
});

@Injectable()
export class DebriefAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'DebriefExpert',
        role: 'Feedback Analyst',
        goal: 'Synthesize hiring manager feedback from interviews to refine the job requirements and ideal candidate persona.',
        backstory:
          'You are an expert at reading between the lines of hiring manager feedback. You understand that "too junior" might mean "lacks specific experience with X" or "cultural fit issues." Your job is to distill raw feedback into actionable intelligence that helps the other agents (Matchmaker, Hunter) find better candidates in the future.',
      },
      llm,
    );
  }

  async synthesizeFeedback(
    jobTitle: string,
    currentContext: string | null,
    newFeedback: {
      candidateName: string;
      rawFeedback: string;
      decision: 'hired' | 'rejected_by_client' | 'interviewed';
    },
    companyId?: string,
    jobId?: string,
  ): Promise<string> {
    const prompt = debriefSynthesizeFeedbackPrompt(
      jobTitle,
      currentContext,
      newFeedback,
    );

    const { output } = await this.runLlm(
      'feedback_synthesis',
      [{ role: 'user', content: prompt }],
      { maxTokens: 700, temperature: 0.3 },
      {
        ...(companyId ? { company_id: companyId } : {}),
        ...(jobId ? { job_id: jobId } : {}),
      },
    );

    return output.trim().slice(0, 1000);
  }

  async analyzeTranscript(
    candidate: { name: string; resumeSummary?: string },
    job: { title: string },
    aiScreeningAssessment: any | null,
    transcript: string,
    applicationId?: string,
    companyId?: string,
    jobId?: string,
  ): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    summary: string;
    overall_score: number;
    dimensions: {
      technical_depth: number;
      communication: number;
      cultural_fit: number;
      experience_relevance: number;
      enthusiasm: number;
    };
    key_takeaways: string[];
    confirmations: string[];
    discrepancies: string[];
    red_flags: string[];
    recruiter_advice: string;
  }> {
    const prompt = debriefAnalyzeTranscriptPrompt(
      candidate,
      job,
      aiScreeningAssessment,
      transcript,
    );

    const { output } = await this.runLlm(
      'shadow_analysis',
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 1200,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      },
      {
        ...(applicationId
          ? {
              related_entity_type: 'application',
              related_entity_id: applicationId,
            }
          : {}),
        ...(companyId ? { company_id: companyId } : {}),
        ...(jobId ? { job_id: jobId } : {}),
      },
    );

    try {
      const parsed = JSON.parse(extractJson(output));
      return TranscriptAnalysisSchema.parse(parsed);
    } catch (e: any) {
      throw new Error(
        `DebriefAgent failed to parse shadow analysis: ${e.message}`,
      );
    }
  }
}
