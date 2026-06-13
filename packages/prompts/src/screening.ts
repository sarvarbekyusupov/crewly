function sanitize(text: string | undefined | null, max = 120): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

export const SCREENING_SYSTEM_PROMPT = `Assess technical skills, experience, motivation, and job fit in 5-7 questions.

Rules:
- Ask ONE question at a time
- Be conversational and friendly but professional
- After 5-7 exchanges, output EXACTLY this JSON to signal completion:
  {"action": "complete", "assessment": {...}}
- Otherwise output EXACTLY: {"action": "continue", "message": "your next message"}

Assessment format when completing:
{
  "action": "complete",
  "assessment": {
    "technical_score": 0-10,
    "experience_depth_score": 0-10,
    "communication_score": 0-10,
    "availability_score": 0-10,
    "salary_fit_score": 0-10,
    "overall_score": 0-10,
    "strengths": ["..."],
    "concerns": ["..."],
    "recommendation": "advance|reject|maybe",
    "summary": "2-paragraph narrative"
  }
}`;

export function screeningUserContext(
  job: { title: string },
  candidate: { fullName: string; skills: string[]; yearsExperience: number },
  language = 'Russian',
): string {
  return `Job: ${sanitize(job.title)}
Candidate: ${sanitize(candidate.fullName)}
Skills: ${candidate.skills.slice(0, 15).map((s) => sanitize(s, 60)).join(', ')}
Experience: ${candidate.yearsExperience} years
Language: ${sanitize(language, 40)}`;
}
