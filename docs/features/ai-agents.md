# AI Agents

7 specialized agents. All extend `BaseAgent` (`backend/src/modules/agents/base.agent.ts`).

---

## BaseAgent

Provides:
- `runLlm(prompt, options)` — routes to provider, handles retries
- `extractJson(response)` — parses JSON from LLM response (handles markdown code blocks)
- Auto-logging to `LlmCall` table
- Langfuse span wrapping (if `LANGFUSE_*` configured)

```typescript
abstract class BaseAgent {
  constructor(private llm: PromptRunnerService) {}

  protected async runLlm(prompt: string, opts: LlmOptions): Promise<string> {
    // calls PromptRunnerService → routes to provider
    // logs to LlmCall: purpose, tokens, cost_usd, latency_ms
    // throws LlmError on failure
  }

  protected extractJson<T>(text: string): T {
    // strips markdown ```json blocks
    // JSON.parse with type assertion
    // throws ParseError if invalid
  }
}
```

---

## LLM Provider Routing

`PromptRunnerService` (`backend/src/integrations/llm/prompt-runner.service.ts`):

```typescript
// Priority order (first available key wins):
1. ANTHROPIC_API_KEY → AnthropicProvider (claude-3-5-sonnet)
2. GROQ_API_KEY      → GroqProvider (llama-3.3-70b)
3. OPENAI_API_KEY    → OpenAiProvider (gpt-4o)
4. AWS_BEARER_TOKEN_BEDROCK → BedrockProvider (claude via AWS)
```

Agents can override provider per-call via `opts.provider`.

---

## Cost Tracking

Every call logged to `LlmCall`:
```sql
SELECT SUM(cost_usd), model, COUNT(*) FROM llm_calls
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model ORDER BY SUM(cost_usd) DESC;
```

Visible at `GET /staff/llm-costs`. Staff admin can filter by company, model, purpose, date.

---

## The 7 Agents

### 1. MatchmakerAgent
**File:** `backend/src/modules/agents/matchmaker.agent.ts`  
**Role:** Core engine — parse resumes, parse jobs, rank candidates, score discovered jobs.

#### `parseResume(rawText: string): ParsedResume`
Input: raw text from PDF/CV upload or 5-question answers  
Output:
```typescript
{
  fullName: string,
  currentPosition: string,
  currentCompany?: string,
  skills: string[],         // normalized, lowercase
  yearsExperience: number,
  education: Array<{ degree, institution, year }>,
  certifications: string[],
  languages: Array<{ language, level }>,
  summary: string,          // 2-3 sentence summary
  expectedSalaryUzs?: number
}
```

#### `parseJob(description: string): ParsedJob`
Input: raw job description text  
Output:
```typescript
{
  requiredSkills: string[],
  niceToHaveSkills: string[],
  minYearsExperience: number,
  seniority: 'junior' | 'middle' | 'senior' | 'lead',
  techStack: string[],
  employmentType: string,
  workMode: string,
  keyRequirements: string[]
}
```

#### `rankCandidates(job, candidates[]): RankedCandidate[]`
Input: parsed job + top-50 candidates from pgvector ANN search  
Output: sorted array:
```typescript
Array<{
  candidateId: string,
  score: number,            // 0-100
  matchReasons: string[],
  gaps: string[],
  recommendation: 'strong_match' | 'maybe' | 'pass',
  fitSummary: string
}>
```

#### `scoreSeekerJobs(candidate, jobs[]): ScoredJob[]`
Input: candidate profile + batch of discovered jobs  
Output:
```typescript
Array<{
  jobId: string,
  score: number,
  strengths: string[],
  gaps: string[],
  explanation: string
}>
```

---

### 2. ScreeningAgent
**File:** `backend/src/modules/agents/screening.agent.ts`  
**Role:** Conduct multi-turn AI screening interviews.

#### `advance(screening, messages[]): ScreeningAdvance`
Input: screening session state + full conversation history  
Output depends on state:

```typescript
// While questions remain:
{
  type: 'question',
  message: "Can you describe a challenging backend project you led?",
  questionIndex: 3
}

// After 5-7 questions:
{
  type: 'assessment',
  assessment: {
    technical_score: 8,       // 0-10
    experience_depth_score: 7,
    communication_score: 9,
    availability_score: 10,
    salary_fit_score: 6,
    overall_score: 8.0,
    strengths: ["Deep PostgreSQL knowledge", "Led 5-person team"],
    concerns: ["Salary expectation 20% above budget"],
    recommendation: "advance",  // | "reject" | "maybe"
    summary: "Strong backend engineer, minor salary risk."
  }
}
```

Language-aware: detects uz/en/ru from candidate messages, responds in same language.

---

### 3. SourcingAgent
**File:** `backend/src/modules/agents/sourcing.agent.ts`  
**Role:** Extract structured candidate data from raw text.

#### `parseCandidate(rawText: string): ParsedCandidate`
Input: raw LinkedIn scrape, HH profile HTML, or plain-text bio  
Output: same shape as `MatchmakerAgent.parseResume()`  
Used by: `IngestCandidatesProcessor` after fetching from HH/LinkedIn

---

### 4. OutreachAgent
**File:** `backend/src/modules/agents/outreach.agent.ts`  
**Role:** Generate personalized outreach messages.

#### `generateMessage(candidate, job, channel): string`
Input: candidate profile + job details + `'telegram' | 'email' | 'hh' | 'sms'`  
Output: ready-to-send message string

Channel-specific behavior:
- **Telegram:** Max 200 chars, casual tone, emoji OK
- **Email:** 150-200 words, formal, subject line included
- **HH.uz:** 100-150 words, professional, Russian preferred
- **SMS:** Max 160 chars, no formatting

---

### 5. DebriefAgent
**File:** `backend/src/modules/agents/debrief.agent.ts`  
**Role:** Analyze interview transcripts, generate candidate dossiers.

#### `analyzeInterview(transcript, job): DossierContent`
Input: full interview Q&A transcript + job requirements  
Output:
```typescript
{
  executiveSummary: string,      // 2-3 sentences for busy hiring managers
  technicalAssessment: string,   // detailed technical evaluation
  culturalFitNotes: string,
  strengths: string[],
  redFlags: string[],
  recommendation: 'hire' | 'strong_hire' | 'no_hire' | 'further_evaluation',
  salaryGuidance: string,
  markdownFull: string           // full dossier as markdown (→ PDF)
}
```

---

### 6. SeekerAgent
**File:** `backend/src/modules/agents/seeker.agent.ts`  
**Role:** Candidate-side job assistance (career help commands).

#### `scoreJob(candidate, job): DetailedJobScore`
Used by: individual job detail requests from Telegram `/prep` and `/rewrite`

Output includes `coverLetterDraft` for auto-apply.

---

### 7. PipelineCoordinator
**File:** `backend/src/modules/agents/pipeline-coordinator.service.ts`  
**Role:** Orchestrates agents across the hiring pipeline.

Responsibilities:
- Route Telegram messages to correct agent
- Manage state transitions between agents
- Handle escalations (screening → HR notification)
- Coordinate parallel agent calls
- Called by `TelegramPipelineHandler` for bot interactions

---

## Prompt Versioning

Agent prompts include a `promptVersion` field logged to `LlmCall.promptVersion`. This allows:
- A/B testing different prompts
- Rolling back if a new prompt degrades quality
- Filtering cost reports by prompt version

---

## Error Handling

If LLM call fails (API error, timeout, rate limit):
1. Retry up to 2 times with exponential backoff
2. Log error to `LlmCall.error`
3. Throw `LlmError` → worker marks job as failed
4. BullMQ retries worker job (up to 3 total attempts with 5s base backoff)
5. After 3 failures: job in "failed" state, visible in Bull Board

No silent failures — all failures surface in Bull Board and Sentry.
