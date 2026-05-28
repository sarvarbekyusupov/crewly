export function sourcingCandidateSearchQueriesPrompt(job: {
  title: string;
  requiredSkills: string[];
  minExperienceYears?: number;
}): string {
  return `Formulate search queries for finding candidates for this job.
Job: ${job.title}
Skills: ${job.requiredSkills.join(', ')}
Min Exp: ${job.minExperienceYears ?? 'N/A'} years

Return a JSON object:
{
  "hh_query": "search query for hh.ru Text search",
  "linkedin_keywords": "keywords for LinkedIn profile search",
  "specialization_hints": ["relevant HH specialization IDs or names"]
}`;
}

export function sourcingJobSearchQueriesPrompt(seeker: {
  currentPosition: string;
  skills: string[];
  yearsExperience: number;
}): string {
  return `Formulate a job search query for this candidate.
Position: ${seeker.currentPosition}
Skills: ${seeker.skills.join(', ')}
Exp: ${seeker.yearsExperience} years

Return a JSON object:
{
  "query": "concise search query for job boards",
  "location_hints": "optional location string"
}`;
}

export function sourcingEnrichCandidatePrompt(
  name: string,
  currentCompany: string | undefined,
  skills: string[],
  searchResults: Array<{ title: string; url: string; content: string }>,
): string {
  return `Identify verified social proof for this candidate from search results.
Candidate: ${name}
Company: ${currentCompany || 'N/A'}
Skills: ${skills.join(', ')}

Search Results:
${searchResults.map((r, i) => `[${i}] ${r.title} (${r.url})\n${r.content.slice(0, 300)}`).join('\n\n')}

Return a JSON object:
{
  "github_url": "verified github profile url or null",
  "linkedin_url": "verified linkedin profile url or null",
  "portfolio_url": "verified personal site url or null",
  "tech_talks": [{"title": "...", "url": "..."}],
  "social_proof_summary": "2-sentence professional summary of their online presence/excellence"
}

Only include links that you are confident belong to THIS candidate.`;
}

export function sourcingDraftStrategyPrompt(job: {
  title: string;
  description: string;
  requiredSkills: string[];
}): string {
  return `Draft a high-level sourcing strategy for this job.
Job: ${job.title}
Skills: ${job.requiredSkills.join(', ')}
Description: ${job.description.slice(0, 2000)}

GOAL:
Provide a strategic memo on how to find the top 1% of talent for this role.
1. Raiding: List 5 companies that likely have this talent.
2. Search: Provide 5 alternative job titles or keywords.
3. Niche: Suggest 3 specific communities, conferences, or open-source projects where these people hang out.

Return ONLY valid JSON:
{
  "approach_summary": "2-sentence strategic summary",
  "target_companies": ["company 1", "..."],
  "alternative_titles": ["title 1", "..."],
  "niche_sources": ["source 1", "..."]
}`;
}
