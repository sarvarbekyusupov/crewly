export function debriefSynthesizeFeedbackPrompt(
  jobTitle: string,
  currentContext: string | null,
  newFeedback: {
    candidateName: string;
    rawFeedback: string;
    decision: string;
  },
): string {
  return `Synthesize new hiring manager feedback into the current "Ideal Candidate Profile" for the role: ${jobTitle}.

CURRENT IDEAL PROFILE CONTEXT (Learning from past decisions):
${currentContext || 'None yet. This is the first feedback.'}

NEW FEEDBACK:
Candidate: ${newFeedback.candidateName}
Decision: ${newFeedback.decision}
Feedback: ${newFeedback.rawFeedback}

GOAL:
Update the "Ideal Profile" context to include new insights.
For example:
- If a candidate was rejected for lack of X, add X as a critical requirement.
- If a candidate was liked for Y, add Y as a strong preference.
- Keep the output concise and structured (bullet points).

Updated Ideal Candidate Profile:`;
}

export function debriefAnalyzeTranscriptPrompt(
  candidate: { name: string; resumeSummary?: string },
  job: { title: string },
  aiScreeningAssessment: unknown,
  transcript: string,
): string {
  return `Analyze this human-to-human interview transcript and provide a deep "Shadow Analysis".
Candidate: ${candidate.name}
Job: ${job.title}

RESUME SUMMARY:
${candidate.resumeSummary || 'Not provided'}

AI SCREENING BOT ASSESSMENT:
${JSON.stringify(aiScreeningAssessment || 'No prior AI screening.')}

TRANSCRIPT:
${transcript.slice(0, 15000)}

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
