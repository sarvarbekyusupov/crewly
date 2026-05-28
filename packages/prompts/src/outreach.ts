export function outreachFallback(candidateName: string | undefined, jobTitle: string): string {
  return `Здравствуйте, ${candidateName ?? 'кандидат'}!\n\nУ нас есть интересная позиция: ${jobTitle}.\n\nХотите узнать подробнее?`;
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
  return `Write a hyper-personalized outreach message in Russian to this candidate.

JOB:
Title: ${job.title}
Key Skills: ${job.requiredSkills.join(', ')}

CANDIDATE:
Name: ${candidate.name}
Role: ${candidate.currentPosition ?? 'unknown'}
Skills: ${candidate.skills.slice(0, 8).join(', ')}

SOCIAL PROOF (Use this to personalize the hook!):
${candidate.socialProof?.social_proof_summary ? `Summary: ${candidate.socialProof.social_proof_summary}` : 'None provided'}
${candidate.socialProof?.tech_talks?.length ? `Talks: ${candidate.socialProof.tech_talks.map((t) => t.title).join(', ')}` : ''}

AI MATCH ANALYSIS (Why they fit):
Strengths: ${(matchAnalysis?.strengths ?? []).join(', ')}
Notes: ${matchAnalysis?.notes ?? ''}

RULES:
1. Write 3-4 sentences max.
2. Be warm, professional, but not overly formal.
3. OPEN with a specific reference to their background or social proof (e.g., "I saw your work on...", "Your experience with X at Y stands out...").
4. Connect their specific background to the requirements of the role.
5. End with a low-friction call to action (e.g., "Open to a quick chat?").
6. Return ONLY the message text. No subject line.`;
}
