import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { PromptRunnerService } from '../../integrations/llm/prompt-runner.service';
import { SearchService } from '../../integrations/search/search.service';
import { stripLlmJson } from '../../workers/utils';
import {
  sourcingCandidateSearchQueriesPrompt,
  sourcingJobSearchQueriesPrompt,
  sourcingEnrichCandidatePrompt,
  sourcingDraftStrategyPrompt,
} from '@my-hr/prompts';

@Injectable()
export class SourcingAgent extends BaseAgent {
  constructor(
    llm: PromptRunnerService,
    private readonly searchService: SearchService,
  ) {
    super(
      {
        name: 'SourcingHunter',
        role: 'Sourcing Specialist',
        goal: 'Identify high-potential candidates and relevant external job opportunities by optimizing search strategies.',
        backstory:
          'You are a master of finding needles in haystacks. You know exactly what keywords and boolean search strings will surface the best talent across different platforms like LinkedIn and hh.ru.',
      },
      llm,
    );
  }

  async generateCandidateSearchQueries(job: {
    title: string;
    requiredSkills: string[];
    minExperienceYears?: number;
  }): Promise<{
    hh_query: string;
    linkedin_keywords: string;
    specialization_hints: string[];
  }> {
    const prompt = sourcingCandidateSearchQueriesPrompt(job);

    const { output } = await this.runLlm(
      'sourcing_queries',
      [{ role: 'user', content: prompt }],
      { maxTokens: 512, temperature: 0.5 },
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(
        `SourcingAgent failed to parse search queries: ${e.message}`,
      );
    }
  }

  async generateJobSearchQueries(seeker: {
    currentPosition: string;
    skills: string[];
    yearsExperience: number;
  }): Promise<{
    query: string;
    location_hints?: string;
  }> {
    const prompt = sourcingJobSearchQueriesPrompt(seeker);

    const { output } = await this.runLlm(
      'job_discovery_queries',
      [{ role: 'user', content: prompt }],
      { maxTokens: 512, temperature: 0.5 },
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(
        `SourcingAgent failed to parse job search queries: ${e.message}`,
      );
    }
  }

  async enrichCandidateProfile(
    name: string,
    currentCompany?: string,
    skills: string[] = [],
  ): Promise<{
    github_url?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    tech_talks: Array<{ title: string; url: string }>;
    social_proof_summary: string;
  }> {
    const searchQuery = `${name} ${currentCompany || ''} ${skills.slice(0, 3).join(' ')} github linkedin portfolio talk`.trim();
    const searchResults = await this.searchService.search(searchQuery, 8);

    if (searchResults.length === 0) {
      return {
        tech_talks: [],
        social_proof_summary: 'No public social proof found.',
      };
    }

    const prompt = sourcingEnrichCandidatePrompt(name, currentCompany, skills, searchResults);

    const { output } = await this.runLlm(
      'candidate_enrichment',
      [{ role: 'user', content: prompt }],
      { maxTokens: 1024, temperature: 0.3 },
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      return {
        tech_talks: [],
        social_proof_summary: 'Failed to parse enrichment data.',
      };
    }
  }

  async draftSourcingStrategy(job: {
    title: string;
    description: string;
    requiredSkills: string[];
  }): Promise<{
    approach_summary: string;
    target_companies: string[];
    alternative_titles: string[];
    niche_sources: string[];
  }> {
    const prompt = sourcingDraftStrategyPrompt(job);

    const { output } = await this.runLlm(
      'sourcing_strategy',
      [{ role: 'user', content: prompt }],
      { maxTokens: 1024, temperature: 0.4 },
    );

    try {
      return JSON.parse(stripLlmJson(output));
    } catch (e) {
      throw new Error(`SourcingAgent failed to parse strategy JSON: ${e.message}`);
    }
  }
}
