import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { stripLlmJson } from '../../workers/utils';
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
      { maxTokens: 2048 },
      {
        related_entity_type: 'job',
        // agentName is already handled by runLlm
      },
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(`MatchmakerAgent failed to parse LLM output: ${e.message}`);
    }
  }

  async parseResume(rawText: string, candidateId?: string) {
    const { output } = await this.runLlm(
      'parse_resume',
      [{ role: 'user', content: `Resume:\n${rawText.slice(0, 8000)}` }],
      { system: MATCHMAKER_PARSE_RESUME_SYSTEM, maxTokens: 3000 },
      candidateId ? { related_entity_type: 'candidate', related_entity_id: candidateId } : {},
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(`MatchmakerAgent failed to parse resume JSON: ${e.message}`);
    }
  }

  async parseJobDescription(title: string, description: string, jobId?: string) {
    const { output } = await this.runLlm(
      'parse_job',
      [{ role: 'user', content: `Job Title: ${title}\n\nDescription:\n${description}` }],
      { system: MATCHMAKER_PARSE_JOB_SYSTEM, maxTokens: 2048 },
      jobId ? { related_entity_type: 'job', related_entity_id: jobId } : {},
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
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
      { maxTokens: 1024 },
      candidateId
        ? { related_entity_type: 'candidate', related_entity_id: candidateId }
        : {},
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(
        `MatchmakerAgent failed to parse seeker job scores: ${e.message}`,
      );
    }
  }
}
