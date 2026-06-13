function sanitize(text: string | null | undefined, max = 200): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

export function generateDossierPrompt(params: {
  jobTitle: string;
  candidateName: string | null;
  yearsExperience: number | string;
  skills: string[];
  aiAssessment: unknown;
}): string {
  return `Generate a professional candidate dossier for a hiring manager.

Job: ${sanitize(params.jobTitle)}
Candidate: ${sanitize(params.candidateName) || 'Unknown'}
Experience: ${params.yearsExperience} years
Skills: ${params.skills.map((s) => sanitize(s, 60)).join(', ')}

Screening Assessment:
${JSON.stringify(params.aiAssessment, null, 2)}

Write a structured 3-section report:
1. Candidate Overview (background, key strengths)
2. Technical Assessment (skills depth, experience relevance)
3. Recommendation (hire/maybe/reject with reasoning)`;
}
