const MAX_CONTEXT_CHARS = 3_000;
const MAX_FEEDBACK_CHARS = 10_000;
const MAX_NAME_CHARS = 200;
const MAX_TRANSCRIPT_CHARS = 15_000;

function sanitize(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.replace(/[\n\r<>{}]/g, ' ').slice(0, max).trim();
}

function sanitizeBlock(text: string, max: number): string {
  // Preserves newlines for readability but strips injection chars <>{}
  return text.replace(/[<>{}]/g, ' ').slice(0, max);
}

export function debriefSynthesizeFeedbackPrompt(
  jobTitle: string,
  currentContext: string | null,
  newFeedback: {
    candidateName: string;
    rawFeedback: string;
    decision: string;
  },
): string {
  const safeContext = currentContext
    ? sanitizeBlock(currentContext, MAX_CONTEXT_CHARS)
    : null;
  const safeFeedback = sanitizeBlock(newFeedback.rawFeedback, MAX_FEEDBACK_CHARS);
  const safeName = sanitize(newFeedback.candidateName, MAX_NAME_CHARS);

  return `Synthesize new hiring manager feedback into the current "Ideal Candidate Profile" for the role: ${sanitize(jobTitle, 120)}.

CURRENT IDEAL PROFILE CONTEXT (Learning from past decisions):
<context>
${safeContext || 'None yet. This is the first feedback.'}
</context>

NEW FEEDBACK:
Candidate: ${safeName}
Decision: ${sanitize(newFeedback.decision, 60)}
Feedback: <user_feedback>
${safeFeedback}
</user_feedback>

GOAL:
Update the "Ideal Profile" context to include new insights.
- If a candidate was rejected for lack of X, add X as a critical requirement.
- If a candidate was liked for Y, add Y as a strong preference.
- CRITICAL INSTRUCTION: Keep the total output highly compacted and concise. Output ONLY a clean, high-signal list of the top 3-5 learning criteria (maximum 1000 characters total). 
- Discard any stale, duplicate, or low-value historical notes to maintain extreme density. Do NOT output any conversational text or preambles.

Updated Ideal Candidate Profile:`;
}

function formatAssessment(assessment: unknown): string {
  if (!assessment) return 'No prior AI screening.';
  const a = assessment as Record<string, unknown>;
  return [
    `Score: ${a.overall_score ?? 'N/A'}`,
    `Recommendation: ${sanitize(String(a.recommendation ?? ''), 40) || 'N/A'}`,
    `Summary: ${sanitize(String(a.summary ?? ''), 400) || 'N/A'}`,
    `Strengths: ${(Array.isArray(a.strengths) ? a.strengths : []).slice(0, 5).map((s) => sanitize(String(s), 80)).join('; ')}`,
    `Concerns: ${(Array.isArray(a.concerns) ? a.concerns : []).slice(0, 5).map((s) => sanitize(String(s), 80)).join('; ')}`,
  ].join('\n');
}

export function debriefAnalyzeTranscriptPrompt(
  candidate: { name: string; resumeSummary?: string },
  job: { title: string },
  aiScreeningAssessment: unknown,
  transcript: string,
): string {
  return `Analyze this human-to-human interview transcript and provide a deep "Shadow Analysis".
Candidate: ${sanitize(candidate.name, 200)}
Job: ${sanitize(job.title, 120)}

RESUME SUMMARY:
${candidate.resumeSummary ? sanitizeBlock(candidate.resumeSummary, 2000) : 'Not provided'}

AI SCREENING BOT ASSESSMENT:
${formatAssessment(aiScreeningAssessment)}

TRANSCRIPT:
<transcript>
${sanitizeBlock(transcript, MAX_TRANSCRIPT_CHARS)}
</transcript>

GOAL:
Provide a multi-dimensional assessment of the candidate based on the interview.
1. Evaluate 5 dimensions (Score 1-10): Technical Depth, Communication, Cultural Fit, Experience Relevance, and Enthusiasm.
2. Identify confirmations: where interview matches resume/AI screen.
3. Identify discrepancies: where candidate contradicted themselves or prior data.
4. Call out red flags (behavioral or factual).
5. Provide actionable "Recruiter Advice" (what to dig into next or how to close them).

Return ONLY valid JSON:
{
  "sentiment": "positive|neutral|negative",
  "summary": "3-sentence concise synthesis of the candidate's performance",
  "overall_score": 85,
  "dimensions": {
    "technical_depth": 8,
    "communication": 9,
    "cultural_fit": 7,
    "experience_relevance": 8,
    "enthusiasm": 9
  },
  "key_takeaways": ["..."],
  "confirmations": ["..."],
  "discrepancies": ["..."],
  "red_flags": ["..."],
  "recruiter_advice": "Actionable next steps for the recruiter"
}`;
}
