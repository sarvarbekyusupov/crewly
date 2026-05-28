export const MATCHMAKER_PARSE_RESUME_SYSTEM = `Extract structured information from a resume.
Return ONLY valid JSON:
{
  "full_name": "...",
  "skills": [{"name": "...", "level": "beginner|intermediate|advanced|expert"}],
  "total_years": 5,
  "positions": [{"title": "...", "company": "...", "start": "2020-01", "end": "2023-06"}],
  "education": [{"degree": "...", "field": "...", "institution": "..."}],
  "languages": [{"name": "Russian", "level": "C2"}],
  "preferred_salary_uzs": null,
  "preferred_work_mode": "remote|office|hybrid|null",
  "city": "...",
  "summary": "2-sentence professional summary"
}`;

export const MATCHMAKER_PARSE_JOB_SYSTEM = `Extract structured requirements from a job description.
Return ONLY valid JSON matching this structure:
{
  "required_skills": ["skill1", "skill2"],
  "nice_to_have_skills": ["skill3"],
  "min_experience_years": 3,
  "max_experience_years": 7,
  "seniority": "mid|senior|lead|junior",
  "key_responsibilities": ["..."],
  "tech_stack": ["..."],
  "soft_skills": ["..."]
}`;

export function matchmakerRankCandidatesPrompt(
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
  targetCount: number,
): string {
  return `Rank these candidates for the job.

Job: ${job.title}
Required skills: ${job.requiredSkills.join(', ')}
Min experience: ${job.minExperienceYears ?? 'N/A'} years

${job.hiringManagerFeedbackContext ? `IMPORTANT HIRING MANAGER PREFERENCES (Learn from these!):\n<preferences>\n${job.hiringManagerFeedbackContext}\n</preferences>\n` : ''}
Candidates:
${candidates.map((c, i) => `${i + 1}. [ID:${c.id}] ${c.fullName} | ${c.currentPosition} | ${c.yearsExperience}yr | Skills: ${c.skills.slice(0, 8).join(', ')}`).join('\n')}

Return a JSON array of the top ${targetCount} candidates. Use exactly this shape:
[{"id": "...", "score": 85, "strengths": ["..."], "gaps": ["..."], "notes": "...", "recommendation": "strong fit"}]

recommendation must be one of: "strong fit", "good fit", "possible fit", "weak fit".`;
}

export function matchmakerScoreSeekerJobsPrompt(
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
): string {
  const candidateSummary = [
    `Name: ${candidate.fullName ?? 'Unknown'}`,
    `Role: ${candidate.currentPosition ?? 'Not specified'}`,
    `Experience: ${candidate.yearsExperience ?? '?'} years`,
    `Location: ${candidate.city ?? 'Not specified'}`,
    `Preferred mode: ${candidate.preferredWorkMode ?? 'any'}`,
    `Skills: ${(candidate.skills ?? []).join(', ') || 'None listed'}`,
  ].join('\n');

  return `Score each job listing for this candidate (0-100) and explain why.

CANDIDATE:
${candidateSummary}

JOBS TO SCORE:
${jobs
  .map(
    (j, idx) => `
[${idx}] ${j.title} at ${j.company}
Location: ${j.location ?? 'unspecified'} | Mode: ${j.workMode ?? 'unspecified'}
Required skills: ${j.skills.slice(0, 8).join(', ') || 'not specified'}
${j.description ? `Description: ${j.description.slice(0, 300)}` : ''}
`,
  )
  .join('\n')}

Return a JSON array with exactly ${jobs.length} objects in the same order:
[{"score": 85, "explanation": "one sentence why", "strengths": ["skill A matches", "..."], "gaps": ["missing X", "..."]}]

score: 0-100 integer. explanation: 1 sentence. strengths/gaps: max 3 items each.`;
}
