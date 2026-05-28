export function seekerDecideAndDraftPrompt(
  candidate: {
    name: string;
    skills: string[];
    experience: number;
    settings: {
      auto_apply: boolean;
      min_salary_uzs?: string;
      preferred_modes?: string[];
    };
  },
  job: {
    title: string;
    company: string;
    description: string;
    matchScore: number;
  },
): string {
  return `Decide if your candidate should apply for this job and write a short, high-impact cover letter (in Russian) if yes.

CANDIDATE:
Name: ${candidate.name}
Experience: ${candidate.experience} years
Skills: ${candidate.skills.join(', ')}
Settings: Auto-Apply is ${candidate.settings.auto_apply ? 'ON' : 'OFF'}. Min salary: ${candidate.settings.min_salary_uzs || 'N/A'}. Pref modes: ${(candidate.settings.preferred_modes || []).join(', ')}

JOB:
${job.title} at ${job.company}
Match Score: ${job.matchScore}%
Description: ${job.description.slice(0, 1500)}

GOAL:
1. If the match score is > 70 and fits the candidate's settings, set should_apply to true.
2. If should_apply is true, write a 3-sentence cover letter that references their specific background/skills and why they want this role.

Return ONLY valid JSON:
{
  "should_apply": true,
  "reason": "1-sentence reason for your decision",
  "cover_letter": "Short 3-sentence message in Russian"
}`;
}
