function sanitize(text: string | undefined | null, max = 200): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

function sanitizeBlock(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.replace(/[<>{}]/g, ' ').slice(0, max);
}

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
    socialProof?: Record<string, unknown> | null;
  },
  job: {
    title: string;
    company: string;
    description: string;
    matchScore: number;
  },
): string {
  const socialProofLine = candidate.socialProof?.social_proof_summary
    ? `Social proof: ${sanitize(String(candidate.socialProof.social_proof_summary), 400)}`
    : '';

  return `Decide if your candidate should apply for this job and write a short, high-impact cover letter (in Russian) if yes.

CANDIDATE:
Name: ${sanitize(candidate.name)}
Experience: ${candidate.experience} years
Skills: ${candidate.skills.slice(0, 15).map((s) => sanitize(s, 60)).join(', ')}
Settings: Auto-Apply is ${candidate.settings.auto_apply ? 'ON' : 'OFF'}. Min salary: ${sanitize(candidate.settings.min_salary_uzs, 40) || 'N/A'}. Pref modes: ${(candidate.settings.preferred_modes || []).map((m) => sanitize(m, 30)).join(', ')}${socialProofLine ? '\n' + socialProofLine : ''}

JOB:
${sanitize(job.title, 120)} at ${sanitize(job.company, 120)}
Match Score: ${job.matchScore}%
Description: ${sanitizeBlock(job.description, 1500)}

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
