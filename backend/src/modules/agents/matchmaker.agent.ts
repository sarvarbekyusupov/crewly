import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import {
  MATCHMAKER_PARSE_RESUME_SYSTEM,
  MATCHMAKER_PARSE_JOB_SYSTEM,
  matchmakerRankCandidatesPrompt,
  matchmakerScoreSeekerJobsPrompt,
} from '@my-hr/prompts';

export interface MatchmakerResult {
  id: string;
  score: number;
  strengths: string[];
  gaps: string[];
  notes?: string;
  recommendation: 'strong fit' | 'good fit' | 'possible fit' | 'weak fit';
}

const nullableString = z
  .string()
  .or(z.null())
  .transform((v) => (v === null ? undefined : v))
  .optional();
const nullableNumber = z
  .number()
  .or(z.null())
  .transform((v) => (v === null ? undefined : v))
  .optional();

const MatchmakerResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  notes: z.string().optional(),
  recommendation: z.enum(['strong fit', 'good fit', 'possible fit', 'weak fit']),
});

const ParsedResumeSchema = z.object({
  full_name: nullableString,
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    }),
  ),
  total_years: nullableNumber,
  positions: z.array(
    z.object({
      title: nullableString,
      company: nullableString,
      start: nullableString,
      end: nullableString,
    }),
  ),
  education: z.array(
    z.object({
      degree: nullableString,
      field: nullableString,
      institution: nullableString,
    }),
  ),
  languages: z.array(
    z.object({
      name: z.string(),
      level: nullableString,
    }),
  ),
  preferred_salary_uzs: nullableNumber,
  preferred_work_mode: z
    .enum(['remote', 'office', 'hybrid', 'null'])
    .or(z.null())
    .transform((v) => (v === null || v === 'null' ? undefined : v))
    .optional(),
  city: nullableString,
  summary: nullableString,
});

const ParsedJobSchema = z.object({
  title: z.string(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  min_experience_years: z.number().nullable().optional(),
  description_summary: z.string(),
});

const SeekerJobScoreSchema = z.object({
  score: z.number(),
  explanation: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
});

@Injectable()
export class MatchmakerAgent extends BaseAgent {
  constructor(llm: PromptRunnerService) {
    super(
      {
        name: 'Matchmaker',
        role: 'Senior Talent Analyst',
        goal: 'Precisely evaluate candidate suitability for specific job roles by analyzing skills, experience, and cultural fit.',
        backstory:
          'You are a world-class technical recruiter with experience at top-tier tech firms. You have a keen eye for talent and can see beyond keywords to understand if a candidate truly has the experience needed for a role.',
      },
      llm,
    );
  }

  async rankCandidates(
    job: {
      title: string;
      requiredSkills: string[];
      minExperienceYears?: number;
      hiringManagerFeedbackContext?: string | null;
    },
    candidates: Array<{
      id: string;
      fullName: string;
      currentPosition: string;
      yearsExperience: number;
      skills: string[];
    }>,
    targetCount = 10,
  ): Promise<MatchmakerResult[]> {
    const rerankPrompt = matchmakerRankCandidatesPrompt(job, candidates, targetCount);

    const { output } = await this.runLlm(
      'match_rerank',
      [{ role: 'user', content: rerankPrompt }],
      { maxTokens: 2048, responseFormat: { type: 'json_object' } },
      {
        related_entity_type: 'job',
        // agentName is already handled by runLlm
      },
    );

    try {
      const parsed = JSON.parse(output);
      return z.array(MatchmakerResultSchema).parse(parsed);
    } catch (e: any) {
      throw new Error(`MatchmakerAgent failed to parse LLM output: ${e.message}`);
    }
  }

  async parseResume(rawText: string, candidateId?: string) {
    const { output } = await this.runLlm(
      'parse_resume',
      [{ role: 'user', content: `Resume:\n${rawText.slice(0, 8000)}` }],
      { system: MATCHMAKER_PARSE_RESUME_SYSTEM, maxTokens: 3000, responseFormat: { type: 'json_object' } },
      candidateId ? { related_entity_type: 'candidate', related_entity_id: candidateId } : {},
    );

    try {
      const parsed = JSON.parse(output);
      return ParsedResumeSchema.parse(parsed);
    } catch (e: any) {
      throw new Error(`MatchmakerAgent failed to parse resume JSON: ${e.message}`);
    }
  }

  async parseJobDescription(title: string, description: string, jobId?: string) {
    const { output } = await this.runLlm(
      'parse_job',
      [{ role: 'user', content: `Job Title: ${title}\n\nDescription:\n${description}` }],
      { system: MATCHMAKER_PARSE_JOB_SYSTEM, maxTokens: 2048, responseFormat: { type: 'json_object' } },
      jobId ? { related_entity_type: 'job', related_entity_id: jobId } : {},
    );

    try {
      const parsed = JSON.parse(output);
      return ParsedJobSchema.parse(parsed);
    } catch (e: any) {
      throw new Error(`MatchmakerAgent failed to parse job JSON: ${e.message}`);
    }
  }

  async scoreSeekerJobs(
    candidate: {
      fullName: string;
      currentPosition: string;
      yearsExperience: number;
      city: string;
      preferredWorkMode: string;
      skills: string[];
    },
    jobs: Array<{
      title: string;
      company: string;
      location?: string;
      workMode?: string;
      description?: string;
      skills: string[];
    }>,
    candidateId?: string,
  ): Promise<
    Array<{
      score: number;
      explanation: string;
      strengths: string[];
      gaps: string[];
    }>
  > {
    const prompt = matchmakerScoreSeekerJobsPrompt(candidate, jobs);

    const { output } = await this.runLlm(
      'seeker_job_score',
      [{ role: 'user', content: prompt }],
      { maxTokens: 1024, responseFormat: { type: 'json_object' } },
      candidateId
        ? { related_entity_type: 'candidate', related_entity_id: candidateId }
        : {},
    );

    try {
      const parsed = JSON.parse(output);
      return z.array(SeekerJobScoreSchema).parse(parsed);
    } catch (e: any) {
      throw new Error(
        `MatchmakerAgent failed to parse seeker job scores: ${e.message}`,
      );
    }
  }
}
