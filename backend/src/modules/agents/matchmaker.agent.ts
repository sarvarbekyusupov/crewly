import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent, extractJson } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import {
  MATCHMAKER_PARSE_RESUME_SYSTEM,
  MATCHMAKER_PARSE_JOB_SYSTEM,
  matchmakerRankCandidatesPrompt,
  matchmakerScoreSeekerJobsPrompt,
  matchmakerParseResumeContent,
  matchmakerParseJobContent,
} from '@crewly/prompts';

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
  recommendation: z.enum([
    'strong fit',
    'good fit',
    'possible fit',
    'weak fit',
  ]),
});

const ParsedResumeSchema = z.object({
  full_name: nullableString,
  phone: nullableString,
  email: nullableString,
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
  required_skills: z.array(z.string()).default([]),
  nice_to_have_skills: z.array(z.string()).default([]),
  min_experience_years: z.number().nullable().optional(),
  max_experience_years: z.number().nullable().optional(),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead']).optional(),
  key_responsibilities: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
});

const SeekerJobScoreSchema = z.object({
  index: z.number().optional(),
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
    companyId?: string,
    jobId?: string,
  ): Promise<MatchmakerResult[]> {
    const rerankPrompt = matchmakerRankCandidatesPrompt(
      job,
      candidates,
      targetCount,
    );

    const { output } = await this.runLlm(
      'match_rerank',
      [{ role: 'user', content: rerankPrompt }],
      {
        maxTokens: 1024,
        temperature: 0,
        responseFormat: { type: 'json_object' },
      },
      {
        related_entity_type: 'job',
        ...(jobId ? { related_entity_id: jobId } : {}),
        ...(companyId ? { company_id: companyId } : {}),
      },
    );

    try {
      const parsed = JSON.parse(extractJson(output));
      const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed);
      return z.array(MatchmakerResultSchema).parse(arr);
    } catch (e: any) {
      throw new Error(
        `MatchmakerAgent failed to parse LLM output: ${e.message}`,
      );
    }
  }

  async parseResume(rawText: string, candidateId?: string, companyId?: string) {
    const { output } = await this.runLlm(
      'parse_resume',
      [{ role: 'user', content: matchmakerParseResumeContent(rawText) }],
      {
        system: MATCHMAKER_PARSE_RESUME_SYSTEM,
        maxTokens: 1500,
        temperature: 0,
        responseFormat: { type: 'json_object' },
        skipAgentIdentity: true,
      },
      {
        ...(candidateId
          ? { related_entity_type: 'candidate', related_entity_id: candidateId }
          : {}),
        ...(companyId ? { company_id: companyId } : {}),
      },
    );

    try {
      const parsed = JSON.parse(extractJson(output));
      return ParsedResumeSchema.parse(parsed);
    } catch (e: any) {
      throw new Error(
        `MatchmakerAgent failed to parse resume JSON: ${e.message}`,
      );
    }
  }

  async parseJobDescription(
    title: string,
    description: string,
    jobId?: string,
    companyId?: string,
  ) {
    const { output } = await this.runLlm(
      'parse_job',
      [
        {
          role: 'user',
          content: matchmakerParseJobContent(title, description),
        },
      ],
      {
        system: MATCHMAKER_PARSE_JOB_SYSTEM,
        maxTokens: 2048,
        temperature: 0,
        responseFormat: { type: 'json_object' },
        skipAgentIdentity: true,
      },
      {
        ...(jobId
          ? { related_entity_type: 'job', related_entity_id: jobId }
          : {}),
        ...(companyId ? { company_id: companyId } : {}),
      },
    );

    try {
      const parsed = JSON.parse(extractJson(output));
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
      {
        maxTokens: 2048,
        responseFormat: { type: 'json_object' },
        provider: 'groq',
      },
      candidateId
        ? { related_entity_type: 'candidate', related_entity_id: candidateId }
        : {},
    );

    try {
      const parsed = JSON.parse(extractJson(output));
      const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed);
      const validated = z.array(SeekerJobScoreSchema).parse(arr);
      // Re-order by index if LLM included it, so scores map to the correct job
      if (validated.every((r) => r.index !== undefined)) {
        validated.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      }
      return validated;
    } catch (e: any) {
      throw new Error(
        `MatchmakerAgent failed to parse seeker job scores: ${e.message}`,
      );
    }
  }
}
