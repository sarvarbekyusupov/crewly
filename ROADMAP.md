# Roadmap — crewly

_Generated: 2026-05-28. Based on current state analysis._

---

## Priority Legend

- 🔴 **P0** — Blocks production reliability or first paying client
- 🟠 **P1** — High business value, near-term
- 🟡 **P2** — Enhances product quality, medium-term
- 🟢 **P3** — Nice-to-have, polish

---

## Phase 1: Production Hardening (P0)

These are gaps that would hurt a first client or cause silent failures in production.

### 1.1 Sentry Error Tracking

**Why:** No visibility into production exceptions. First client = first real errors.

- Wire `@sentry/nestjs` into `main.ts` and global exception filter (backend)
- Wire `@sentry/nuxt` into `nuxt.config.ts` (frontend)
- Set `SENTRY_DSN` in both `.env.example` files
- Gate behind env var so local dev stays clean

### 1.2 Fix Pipeline Coordinator Bugs

**Why:** Coordinator Agent books interviews for wrong user and at hardcoded time — will fail or confuse clients.

- `pipeline-coordinator.service.ts:199` — pass real `createdBy.id` instead of `'agent-coordinator'` as userId
- `pipeline-coordinator.service.ts:183` — accept preferred time from event payload (or ask Coordinator Agent to pick slot)
- `pipeline-coordinator.service.ts:37` — replace `data.split(':')` with structured `|`-delimited or JSON callback payload

### 1.3 Dead Code Cleanup

**Why:** `AgentResponse<T>` and unused `socialProof` create confusion for future AI-assisted changes.

- `agent.types.ts` — delete `AgentResponse<T>` or wire it to all agent return types
- `seeker.agent.ts:28` — add `socialProof` to prompt template or remove the field
- `coordinator.agent.ts:10` — remove `GoogleCalendarService` injection and `GoogleCalendarModule` import
- `debrief.agent.ts:116` + `coordinator.agent.ts:66` — replace inline JSON strip regex with `stripLlmJson()`

### 1.4 Circular Dependency Refactor

**Why:** `forwardRef()` in `agents.module.ts` is a code smell; circular deps cause unpredictable initialization order.

- Extract `SchedulingModule` from `ApplicationsModule`
- Move `scheduleInterview` logic there
- Remove `forwardRef` from `agents.module.ts`

---

## Phase 2: Business Features (P1)

### 2.1 Payment Gateway

**Why:** Currently mark-paid is manual. Needed for autonomous billing.

- Integrate Payme or Click (Uzbek payment rails) for invoice payment
- Add `POST /api/v1/invoices/:id/pay` endpoint
- Add `paid` webhook handler (verify signature)
- Frontend: "Pay Now" button on invoice detail page
- Fallback: keep manual mark-paid for bank transfers

### 2.2 LinkedIn Sourcing in Company Portal

**Why:** LinkedIn search currently only in Staff portal. Company users (hiring managers) can't browse/source directly.

- Add `/candidates/source` route in company portal (reuse sourcing service)
- Gate behind `admin`+ role
- Add "Source from LinkedIn" action on job detail page

### 2.3 Real-Time Ingestion Progress

**Why:** Staff trigger ingestion runs and see no feedback until complete.

- Add SSE event `ingestion_progress` emitted by `ingest-candidates.processor`
- Update `/staff/ingestion` page to show live counts (fetched / new / failed)
- Show run status badge (running → completed / partial / failed)

### 2.4 Feature Flag Admin UI

**Why:** `FeatureFlag` table exists but no UI — flags can only be toggled via DB.

- Add `/staff/feature-flags` page (list, toggle enabled, set rollout %, company overrides)
- Add `GET /api/v1/staff/feature-flags`, `PATCH /api/v1/staff/feature-flags/:name`

---

## Phase 3: UX & Quality (P2)

### 3.1 Mobile Optimization

**Why:** Candidate portal accessed from phones. Telegram bot drives candidates to web chat.

- Audit all candidate portal pages on 375px viewport
- Fix navigation (collapsible sidebar or bottom nav on mobile)
- Priority pages: `/candidate/chat/[id]`, `/candidate/dashboard`, `/candidate/jobs`
- Company portal can remain desktop-first for now

### 3.2 Resume Parsing Progress Feedback

**Why:** Resume upload completes instantly but parsing takes 5–30s — no feedback leaves user confused.

- Emit SSE event `resume_parse_progress` (queued → parsing → done)
- Frontend: show progress indicator on candidate profile after upload

### 3.3 Matchmaker Skill Slice Consistency

**Why:** `matchmaker.agent.ts` uses `slice(0, 5)` for ranking but `slice(0, 8)` for seeker scoring — inconsistent signal.

- Define `MAX_SKILLS_FOR_MATCHING = 8` constant in agent types
- Apply consistently across `rankCandidates` and `scoreSeekerJobs`

### 3.4 Outreach Agent Type Safety

**Why:** `any | null` type on `outreach.agent.ts:26,31` is redundant and masks real type.

- Define `CandidateContext` and `JobContext` interfaces
- Replace `any` with typed interfaces

### 3.5 Analytics: Visual Funnel Chart

**Why:** Analytics page uses progress bars — functional but not visually compelling for client demos.

- Add a proper funnel/bar chart using `@nuxtjs/echarts` or `vue-chartjs`
- Keep table view as fallback/detail
- Show conversion rate between stages as percentage labels

---

## Phase 4: Platform Maturity (P3)

### 4.1 `packages/prompts` Package

**Why:** `backend/plan.md` specifies prompts as versioned code in a shared package, but all prompts are inline in agent files.

- Extract all agent prompts into `packages/prompts/`
- Version with semantic versioning
- Record prompt name + version in `llm_calls` table (already has `prompt_name`, `prompt_version` columns)

### 4.2 PDF Dossier Generation

**Why:** `generate-dossier.processor` produces assessment but `plan.md` marks S3 PDF storage as incomplete.

- Verify dossier PDF is actually uploaded to S3 (check `storage.service.ts` usage in dossier processor)
- If not: add PDF render step (puppeteer or `@pdfme/generator`) and S3 upload

### 4.3 SMS Channel

**Why:** Telegram-only outreach misses candidates without Telegram.

- Add SMS channel to `Conversation` model (channel `'sms'`)
- Integrate Twilio or Eskiz (Uzbek SMS provider)
- Update `send-outreach.processor` to route by channel preference

### 4.4 Playwright E2E Coverage Expansion

**Why:** Only `auth.spec.ts` and `jobs.spec.ts` exist — core hiring flow untested end-to-end.

- Add `applications.spec.ts` — approve, reject, hire flow
- Add `screening.spec.ts` — web chat screening
- Add `candidate-portal.spec.ts` — login, profile, jobs feed

### 4.5 Multi-Language Resume Parsing

**Why:** Currently ru/uz/en only. LinkedIn candidates may have EN or mixed-language resumes.

- Test Matchmaker Agent against EN-only resumes
- Add language detection before parsing prompt selection

---

## Summary Table

| Phase | Item | Priority | Effort | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Sentry wiring | P0 | S | **Done** |
| 1 | Pipeline coordinator bugs (3 fixes) | P0 | S | **Done** |
| 1 | Dead code cleanup | P0 | S | **Done** |
| 1 | Circular dep refactor | P0 | M | **Done** |
| 2 | Payment gateway (Payme/Click) | P1 | L | **Done** |
| 2 | LinkedIn in company portal | P1 | M | **Done** |
| 2 | Real-time ingestion progress | P1 | S | **Done** |
| 2 | Feature flag admin UI | P1 | M | **Done** |
| 3 | Mobile optimization (candidate portal) | P2 | M | **Done** |
| 3 | Resume parsing progress feedback | P2 | S | **Done** |
| 3 | Skill slice consistency | P2 | XS | **Done** |
| 3 | Outreach agent type safety | P2 | XS | **Done** |
| 3 | Analytics visual funnel chart | P2 | M | **Done** |
| 4 | `packages/prompts` extraction | P3 | L | **Done** |
| 4 | PDF dossier S3 verify/fix | P3 | S | **Done** |
| 4 | SMS channel (Eskiz) | P3 | L | **Done** |
| 4 | E2E test expansion | P3 | M | **Done** |
| 4 | Multi-language resume parsing | P3 | M | **Done** |

_Effort: XS <1h · S 1–4h · M 1–2d · L 3–5d_
