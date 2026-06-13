function sanitize(text: string | undefined | null, max = 120): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

export function sourcingJobSearchQueriesPrompt(seeker: {
  currentPosition: string;
  skills: string[];
  yearsExperience: number;
}): string {
  return `Formulate a job search query for this candidate.
Position: ${sanitize(seeker.currentPosition)}
Skills: ${seeker.skills.slice(0, 15).map((s) => sanitize(s, 60)).join(', ')}
Exp: ${seeker.yearsExperience} years

Return a JSON object:
{
  "query": "concise search query for job boards",
  "location_hints": "optional location string"
}`;
}

function sanitizeExternal(text: string, max: number): string {
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

function sanitizeBlock(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.replace(/[<>{}]/g, ' ').slice(0, max);
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
${searchResults.map((r, i) => `[${i}] ${sanitizeExternal(r.title, 120)} (${sanitizeExternal(r.url, 200)})\n${sanitizeExternal(r.content, 300)}`).join('\n\n')}

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
Job: ${sanitize(job.title)}
Skills: ${job.requiredSkills.slice(0, 15).map((s) => sanitize(s, 60)).join(', ')}
Description: ${sanitizeBlock(job.description, 2000)}

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
