export function outreachFallback(candidateName: string | undefined, jobTitle: string): string {
  return `Здравствуйте, ${candidateName ?? 'кандидат'}!\n\nУ нас есть интересная позиция: ${jobTitle}.\n\nХотите узнать подробнее?`;
}

const MAX_SOCIAL_PROOF_CHARS = 500;
const MAX_TALK_TITLE_CHARS = 100;
const MAX_NOTES_CHARS = 500;

function cap(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.slice(0, max);
}

export function outreachPersonalizedPrompt(
  candidate: {
    name: string;
    currentPosition: string | null;
    skills: string[];
    socialProof?: {
      social_proof_summary?: string;
      tech_talks?: Array<{ title: string }>;
    };
  },
  job: { title: string; requiredSkills: string[] },
  matchAnalysis?: { strengths?: string[]; notes?: string },
): string {
  const safeSocialProof = cap(candidate.socialProof?.social_proof_summary, MAX_SOCIAL_PROOF_CHARS);
  const safeTalks = (candidate.socialProof?.tech_talks ?? [])
    .slice(0, 5)
    .map((t) => cap(t.title, MAX_TALK_TITLE_CHARS))
    .join(', ');
  const safeNotes = cap(matchAnalysis?.notes, MAX_NOTES_CHARS);

  return `Write a hyper-personalized outreach message in Russian to this candidate.

JOB:
Title: ${job.title}
Key Skills: ${job.requiredSkills.join(', ')}

CANDIDATE:
Name: ${candidate.name}
Role: ${candidate.currentPosition ?? 'unknown'}
Skills: ${candidate.skills.slice(0, 8).join(', ')}

SOCIAL PROOF (Use this to personalize the hook!):
${safeSocialProof ? `Summary: ${safeSocialProof}` : 'None provided'}
${safeTalks ? `Talks: ${safeTalks}` : ''}

AI MATCH ANALYSIS (Why they fit):
Strengths: ${(matchAnalysis?.strengths ?? []).join(', ')}
Notes: ${safeNotes}

RULES:
1. Write 3-4 sentences max.
2. Be warm, professional, but not overly formal.
3. OPEN with a specific reference to their background or social proof (e.g., "I saw your work on...", "Your experience with X at Y stands out...").
4. Connect their specific background to the requirements of the role.
5. End with a low-friction call to action (e.g., "Open to a quick chat?").
6. Return ONLY the message text. No subject line.`;
}
