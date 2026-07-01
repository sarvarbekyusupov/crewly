n# Candidate Value Suite — Implementation Plan

> **Scope**: Three self-contained features that run entirely on public read APIs and our own DB.
> No external write-API dependency. Zero HH ToS risk.

---

## Feature A — AI CV / Cover-Letter Builder

### Goal
Candidate inputs a job description (paste or URL) → gets a tailored cover letter + CV summary paragraph in <30 seconds. Download as text or copy to clipboard. Works without HH OAuth.

### What Already Exists
| Asset | Location |
|---|---|
| `CoverLetterService.generate()` | `backend/src/integrations/apply/cover-letter.service.ts` |
| `ApplyKitService.build()` | `backend/src/integrations/apply/apply-kit.service.ts` |
| `PromptRunnerService` | `backend/src/integrations/llm/prompt-runner.service.ts` |
| `Candidate.parsedResume`, `skills`, `currentPosition` | `prisma/schema.prisma` |

### What's Missing

#### Backend
1. **New endpoint**: `POST /api/v1/candidate-portal/generate/cover-letter`
   - Body: `{ jobTitle: string, company: string, jobDescription: string, jobSkills?: string[] }`
   - Auth: `CandidateAuthGuard` (candidate JWT)
   - Action: load candidate profile from DB → call `CoverLetterService.generate()` → return `{ coverLetter: string }`
   - Rate limit: 10 calls/hour per candidate (existing `UserThrottlerGuard` pattern)

2. **New endpoint**: `POST /api/v1/candidate-portal/generate/cv-summary`
   - Body: `{ jobTitle: string, company: string, jobDescription: string }`
   - Action: prompt → generate 3-4 sentence professional summary tailored to the specific job
   - Prompt note: draw from `candidate.rawResumeText` + `parsedResume` + `skills`; instruct LLM to match keywords from jobDescription without fabricating facts
   - Return: `{ cvSummary: string }`

3. **Add to `CandidatePortalModule`**: wire both endpoints into `candidate-portal.controller.ts`

4. **No new DB table needed** — generations are ephemeral; frontend holds state. If we want history later, `SeekerApplication.coverLetter` and `SeekerApplication.applyKit` already handle it for seeker flows.

#### Frontend
5. **New page**: `frontend/app/pages/candidate/cv-builder.vue`
   - Two tabs: "Cover Letter" / "CV Summary"
   - Left: form (job title, company, paste job description textarea)
   - Right: streamed/spinner output, copy button, download `.txt`
   - Pre-fill job title/company/description if navigated from a vacancy card (query params `?jobTitle=&company=&desc=`)

6. **Nav link**: add "CV Builder" to candidate sidebar (`frontend/app/layouts/` or nav component)

7. **Composable**: `useCvBuilder.ts` in `frontend/app/composables/`
   - `generateCoverLetter(payload)` → `useCandidateApi.post('/generate/cover-letter', payload)`
   - `generateCvSummary(payload)` → `useCandidateApi.post('/generate/cv-summary', payload)`

---

## Feature B — AI-Matched Vacancy Discovery + HH Apply Link

### Goal
Candidate sees HH vacancies ranked by AI match score with a single "Apply on HH" button that opens HH's own apply flow. No write-API call from our side.

### What Already Exists
| Asset | Location |
|---|---|
| `GET /hh/vacancies` (public HH search) | `candidate-portal.controller.ts:searchHhVacancies` |
| `DiscoveredJob` pipeline + scoring | `workers/score-seeker-jobs.processor.ts` |
| `HhApplicantService.searchVacancies()` | `hh-applicant.service.ts` |
| `SeekerApplication.applyUrl` | `prisma/schema.prisma` |
| `DiscoveredJob.rawPayload` | `prisma/schema.prisma` (stores full HH JSON) |

### What's Missing

#### Backend — `apply_alternate_url` gap
HH API returns two URL fields per vacancy:
- `alternate_url` — view the vacancy on HH website  
- `apply_alternate_url` — deep-link directly into HH's own apply modal

Current `HhVacancyItem` type only declares `alternate_url`. **Fix**:

1. **`hh.types.ts`** — add `apply_alternate_url?: string` to `HhVacancyItem` interface

2. **Verify** `HhApplicantService.searchVacancies()` already passes the full HH JSON response through (`resp.data` is returned as-is → `apply_alternate_url` comes through if HH sends it, even without explicit typing). After the type fix the field is accessible and typed.

3. **`DiscoveredJob.rawPayload`** already stores the full HH item. Add helper in `HhJobsAdapter` or `job-discovery.service.ts` to extract and surface `apply_alternate_url` when returning discovered job lists.

4. **`GET /candidate-portal/discovered-jobs` response** — add `applyAlternateUrl: string | null` to the shape returned by `CandidatePortalService.getDiscoveredJobs()`. Source it from `rawPayload.apply_alternate_url ?? sourceUrl`.

5. **`GET /candidate-portal/hh/vacancies` response** — already proxies raw HH JSON; `apply_alternate_url` will be present after type fix. No structural change needed.

#### Backend — AI match for real-time HH search
The existing pipeline scores `DiscoveredJob` rows (background). For the real-time vacancy search (`/hh/vacancies`) there's no scoring.

6. **New endpoint**: `POST /api/v1/candidate-portal/hh/vacancies/score`
   - Body: `{ vacancies: HhVacancyItem[] }` (client sends the search results page it received)
   - Action: load candidate profile (skills, yearsExperience, preferredWorkMode) → for each vacancy call a lightweight LLM prompt that returns a score 0–100 + one-line reason
   - Batch max 20 vacancies per call; use `haiku-4-5` model for cost
   - Return: `{ scores: { vacancyId: string, score: number, reason: string }[] }`
   - Rate limit: 5 calls/hour per candidate

#### Frontend
7. **`/candidate/jobs.vue`** — add "Apply on HH" button to each vacancy card:
   ```
   <a :href="vacancy.apply_alternate_url ?? vacancy.alternate_url" target="_blank" rel="noopener">
     Apply on HH →
   </a>
   ```
   Also add "Generate Cover Letter" shortcut → navigates to `/candidate/cv-builder?jobTitle=...&company=...&desc=...`

8. **Score overlay**: after search results load, fire `/hh/vacancies/score` in background, update cards with match % badge when response arrives

9. **Filter bar**: add "Min match score" slider (only active after scoring completes)

---

## Feature C — Application Tracker + AI Interview Prep

### Goal
Candidate sees all applications (inbound via Crewly + self-submitted via seeker flow) in a Kanban/list view, with a "Prep for interview" button that generates tailored questions + tips for each specific job.

### What Already Exists
| Asset | Location |
|---|---|
| `GET /seeker-applications` | `candidate-portal.controller.ts` |
| `GET /applications` (inbound) | `candidate-portal.controller.ts` |
| `/candidate/tracker.vue` | `frontend/app/pages/candidate/tracker.vue` |
| `SeekerApplication.{ status, coverLetter, appliedAt }` | `prisma/schema.prisma` |
| `PromptRunnerService` | `backend/src/integrations/llm/prompt-runner.service.ts` |

### What's Missing

#### Backend
1. **New endpoint**: `POST /api/v1/candidate-portal/interview-prep`
   - Body: `{ seekerApplicationId?: string, discoveredJobId?: string }`  
     (one of the two must be provided; `seekerApplicationId` is preferred as it has candidate's cover letter context too)
   - Auth: `CandidateAuthGuard`
   - Action:
     1. Load candidate profile (skills, yearsExperience, currentPosition, parsedResume)
     2. Load job details (title, company, description, skills) from `DiscoveredJob` via `seekerApplicationId → discoveredJobId`
     3. LLM prompt → return structured JSON:
        ```json
        {
          "questions": [
            { "category": "Technical", "question": "...", "tip": "..." },
            ...
          ],
          "companyResearch": "2-3 sentences about what to look up",
          "salaryNegotiationTip": "one sentence"
        }
        ```
     4. Generate 8-10 questions split across: Technical (3), Behavioral (3), Role-specific (2), Salary/logistics (1-2)
   - Rate limit: 20 calls/day per candidate (interview prep is more forgiving)
   - Model: `claude-haiku-4-5` for cost; upgrade to `claude-sonnet-4-6` if quality complaints arise

2. **New endpoint**: `GET /api/v1/candidate-portal/tracker/summary`
   - Returns unified view: merged `SeekerApplication` + `Application` lists, each with `type: 'seeker' | 'inbound'`
   - Fields: `id, type, jobTitle, company, status, appliedAt/createdAt, source, applyUrl, coverLetter`
   - Sorts by most-recent-activity descending

#### Frontend
3. **`/candidate/tracker.vue`** — enhance with:
   - Unified list (seeker + inbound) grouped by status: `Applied → Interviewed → Offer → Rejected`
   - Status badge with colour coding (matches `useStatusLabels` composable pattern)
   - Each card: job title, company, date, source badge (HH / LinkedIn / Crewly)
   - **"Prep for Interview" button** → opens slide-over panel

4. **Interview Prep slide-over component**: `components/candidate/InterviewPrepPanel.vue`
   - Trigger: `POST /interview-prep` on open (lazy — only fires when panel opens)
   - Loading state: skeleton + "Generating questions…" text
   - Sections: Technical Questions / Behavioral / Company Research / Salary Tip
   - Each question: expandable → shows tip on expand
   - "Copy all questions" button

5. **Composable**: `useInterviewPrep.ts`
   - `prepare(seekerApplicationId)` → POST, returns reactive `{ loading, data, error }`
   - Cache by `seekerApplicationId` in a `Map` for the session (avoid re-fetching on re-open)

---

## DB Migrations Needed

| Migration | Reason |
|---|---|
| None for A | Ephemeral generation, no storage |
| None for B | `rawPayload` already stores `apply_alternate_url`; type fix only |
| None for C | All fields exist; tracker/prep is read + LLM only |

---

## Build Order

```
Phase 1 (1-2 days)
  B-1: Add apply_alternate_url to HhVacancyItem type
  B-7: Frontend Apply on HH button (one-liner change)
  C-2: GET /tracker/summary endpoint
  C-3: Tracker UI unified list

Phase 2 (2-3 days)
  A-1/A-2: Generate endpoints (cover letter + CV summary)
  A-5: /candidate/cv-builder page
  C-1: Interview prep endpoint
  C-4/C-5: InterviewPrepPanel component + composable

Phase 3 (1-2 days)
  B-6: Vacancy scoring endpoint
  B-8/B-9: Score badges + filter bar on jobs page
  A-6: Nav link + CV builder polish
```

---

## API Contract Summary

```
POST /api/v1/candidate-portal/generate/cover-letter
  body: { jobTitle, company, jobDescription, jobSkills? }
  resp: { coverLetter: string }

POST /api/v1/candidate-portal/generate/cv-summary
  body: { jobTitle, company, jobDescription }
  resp: { cvSummary: string }

POST /api/v1/candidate-portal/hh/vacancies/score
  body: { vacancies: HhVacancyItem[] }
  resp: { scores: { vacancyId, score, reason }[] }

POST /api/v1/candidate-portal/interview-prep
  body: { seekerApplicationId?, discoveredJobId? }
  resp: { questions: { category, question, tip }[], companyResearch, salaryNegotiationTip }

GET  /api/v1/candidate-portal/tracker/summary
  resp: { items: TrackerItem[], total: number }
```

---

## Key Design Constraints

- **No HH write API** — "Apply" button is always `<a target="_blank">` to `apply_alternate_url`. We never POST to HH negotiations on behalf of the candidate in this flow.
- **No LinkedIn write API** — CV builder output is text/plain only.
- **LLM cost control** — use `haiku-4-5` for scoring (20 vacancies/batch) and interview prep; `sonnet-4-6` only for cover letters (candidate explicitly requests, fewer calls).
- **Rate limits** — all new LLM endpoints inherit existing `UserThrottlerGuard` pattern; add per-endpoint decorators.
- **`rawPayload` as source of truth** — `DiscoveredJob.rawPayload` already contains full HH JSON; extract `apply_alternate_url` from there rather than adding a new DB column.
