export const MATCHMAKER_PARSE_RESUME_SYSTEM = `Extract structured information from a resume.
The input resume may be written in English, Russian, Uzbek (Latin script), or Uzbek (Cyrillic script) - or a mixed-language format.
Normalize and translate all output fields into standardized English schemas where appropriate (e.g. normalize skills, positions, degrees, and institutions).

GUIDELINES FOR LOCALIZATION & NORMALIZATION (Uzbekistan Context):
1. EDUCATION & UNIVERSITIES:
   - Recognize local universities and normalize their names into standard English equivalents:
     * "WIUT" / "Westminster" / "Вестминстер" -> "Westminster International University in Tashkent (WIUT)"
     * "TUIT" / "ТУИТ" / "Ташкентский университет информационных технологий" / "ТАТУ" -> "Tashkent University of Information Technologies (TUIT)"
     * "Amity" / "Амити" -> "Amity University Tashkent"
     * "IUT" / "Inha" / "Инха" -> "Inha University in Tashkent (IUT)"
     * "MDIST" / "Сингапурский" -> "Management Development Institute of Singapore in Tashkent (MDIST)"
     * "YTIT" / "Kiut" / "Технический институт Ёджу" -> "Kimyo International University in Tashkent (KIUT)"
     * "TPUT" / "Туринский" -> "Turin Polytechnic University in Tashkent (TPUT)"
     * "TSUE" / "Нархоз" / "Ташкентский государственный экономический университет" -> "Tashkent State University of Economics (TSUE)"
     * "TashPMI" / "САМПИ" -> "Tashkent Pediatric Medical Institute (TashPMI)"
     * "TMA" / "ТАМИ" / "Ташкентская медицинская академия" -> "Tashkent Medical Academy"
2. SKILLS & TECH TERMINOLOGIES:
   - Translate and normalize local technology names into standard technical tags (e.g., "1С" -> "1C Enterprise", "БД" -> "Databases", "ООП" -> "OOP", "Верстка" -> "HTML/CSS").
   - Extract raw skills into clean lowercase tags (e.g., "javascript", "postgresql", "python") to optimize pgvector semantic similarity matching.
3. LANGUAGES:
   - Map language names standardly: "O'zbek", "Узбекский", "Oʻzbekcha" -> "Uzbek"; "Русский" -> "Russian"; "English" -> "English".

Return ONLY valid JSON matching this exact structure:
{
  "full_name": "...",
  "phone": "...",
  "email": "...",
  "skills": [{"name": "...", "level": "beginner|intermediate|advanced|expert"}],
  "total_years": 5,
  "positions": [{"title": "...", "company": "...", "start": "2020-01", "end": "2023-06"}],
  "education": [{"degree": "...", "field": "...", "institution": "..."}],
  "languages": [{"name": "Russian|Uzbek|English|...", "level": "A1|A2|B1|B2|C1|C2|Native|..."}],
  "preferred_salary_uzs": null,
  "preferred_work_mode": "remote|office|hybrid|null",
  "city": "...",
  "summary": "2-sentence professional summary in English"
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

function sanitizeField(text: string | undefined | null, max = 120): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

function sanitizeBlock(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.replace(/[<>{}]/g, ' ').slice(0, max);
}

export function matchmakerParseResumeContent(rawText: string): string {
  return `Resume:\n${sanitizeBlock(rawText, 8000)}`;
}

export function matchmakerParseJobContent(title: string, description: string): string {
  return `Job Title: ${sanitizeField(title, 200)}\n\nDescription:\n${sanitizeBlock(description, 5000)}`;
}

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

Job: ${sanitizeField(job.title)}
Required skills: ${job.requiredSkills.slice(0, 15).map((s) => sanitizeField(s, 60)).join(', ')}
Min experience: ${job.minExperienceYears ?? 'N/A'} years

${job.hiringManagerFeedbackContext ? `IMPORTANT HIRING MANAGER PREFERENCES (Learn from these!):\n<preferences>\n${sanitizeBlock(job.hiringManagerFeedbackContext, 2000)}\n</preferences>\n` : ''}
Candidates:
${candidates.map((c, i) => `${i + 1}. [ID:${c.id}] ${sanitizeField(c.fullName)} | ${sanitizeField(c.currentPosition)} | ${c.yearsExperience}yr | Skills: ${c.skills.slice(0, 8).map((s) => sanitizeField(s, 40)).join(', ')}`).join('\n')}

Return a JSON object with key "results" containing the top ${targetCount} candidates:
{"results": [{"id": "...", "score": 85, "strengths": ["..."], "gaps": ["..."], "notes": "...", "recommendation": "strong fit"}]}

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
    `Name: ${sanitizeField(candidate.fullName)}`,
    `Role: ${sanitizeField(candidate.currentPosition)}`,
    `Experience: ${candidate.yearsExperience ?? '?'} years`,
    `Location: ${sanitizeField(candidate.city)}`,
    `Preferred mode: ${sanitizeField(candidate.preferredWorkMode)}`,
    `Skills: ${(candidate.skills ?? []).map((s) => sanitizeField(s, 40)).join(', ') || 'None listed'}`,
  ].join('\n');

  return `Score each job listing for this candidate (0-100) and explain why.

CANDIDATE:
${candidateSummary}

JOBS TO SCORE:
${jobs
  .map(
    (j, idx) => `
[${idx}] ${sanitizeField(j.title)} at ${sanitizeField(j.company)}
Location: ${sanitizeField(j.location ?? 'unspecified')} | Mode: ${sanitizeField(j.workMode ?? 'unspecified')}
Required skills: ${j.skills.slice(0, 8).map((s) => sanitizeField(s, 40)).join(', ') || 'not specified'}
${j.description ? `Description: ${sanitizeBlock(j.description, 300)}` : ''}
`,
  )
  .join('\n')}

Return a JSON object with key "results" containing exactly ${jobs.length} objects. Include the original index:
{"results": [{"index": 0, "score": 85, "explanation": "one sentence why", "strengths": ["skill A matches", "..."], "gaps": ["missing X", "..."]}]}

index: must match the [N] from the job list. score: 0-100 integer. explanation: 1 sentence. strengths/gaps: max 3 items each.`;
}
