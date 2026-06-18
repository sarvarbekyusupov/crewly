# Data Pipelines

Two main pipelines: Employer (B2B matching) and Seeker (candidate-initiated job discovery).

---

## Employer Pipeline (B2B Matching)

HR posts a job → AI finds, ranks, and screens candidates.

```
┌─────────────┐
│  HR creates  │
│    Job       │
└──────┬───────┘
       │ POST /api/v1/jobs
       ▼
┌──────────────────┐
│  parse-job       │
│  worker          │
│                  │
│  MatchmakerAgent │
│  .parseJob()     │
│                  │
│  Extracts:       │
│  - requirements  │
│  - tech stack    │
│  - seniority     │
│  - must-haves    │
└──────┬───────────┘
       │ Job.parsedRequirements saved
       ▼
┌──────────────────────────────────┐
│  match-candidates worker          │
│                                   │
│  1. pgvector ANN search           │
│     embedding similarity → top 50 │
│                                   │
│  2. MatchmakerAgent.rankCandidates│
│     LLM reranks with reasons      │
│     score: 0-100                  │
│     recommendation: strong/maybe/pass│
│                                   │
│  3. Create Application records    │
│     status: matched               │
└──────┬───────────────────────────┘
       │
       ▼ (if outreach campaign enabled)
┌──────────────────────────────────┐
│  send-outreach worker             │
│                                   │
│  OutreachAgent.generateMessage()  │
│  Personalized per candidate+job   │
│  Channel: Telegram / email / HH   │
│                                   │
│  Creates OutreachAttempt record   │
│  Application status: outreach_sent│
└──────┬───────────────────────────┘
       │
       ▼ (candidate responds)
┌──────────────────────────────────┐
│  advance-screening worker         │
│  (runs multiple times, multi-turn)│
│                                   │
│  ScreeningAgent.advance()         │
│  Generates next question          │
│  5-7 questions over Telegram/web  │
│                                   │
│  Final assessment:                │
│  - technical_score: 0-10          │
│  - communication_score: 0-10      │
│  - recommendation: advance/reject │
│                                   │
│  Application status:              │
│  screened_pass / screened_fail    │
└──────┬───────────────────────────┘
       │ (on pass)
       ▼
┌──────────────────────────────────┐
│  generate-dossier worker          │
│                                   │
│  DebriefAgent.analyzeInterview()  │
│  Full candidate analysis:         │
│  - strengths & concerns           │
│  - cultural fit assessment        │
│  - recommendation + rationale     │
│                                   │
│  Output: PDF dossier → S3         │
│  Application.dossierUrl set       │
└──────┬───────────────────────────┘
       │
       ▼ (HR reviews dossier)
┌──────────────────────────────────┐
│  HR Actions (web portal)          │
│                                   │
│  Schedule interview               │
│  → Google Calendar event created  │
│  → Meet link attached             │
│                                   │
│  Submit debrief (feedback)        │
│  → DebridiefAgent.analyzeInterview│
│                                   │
│  Make offer → Hire                │
│  → Placement record created       │
│  → Invoice generated              │
└──────────────────────────────────┘
```

### Application Status Flow

```
matched
  └─► queued_outreach
        └─► outreach_sent
              └─► responded
                    └─► screening
                          ├─► screened_pass
                          │     └─► delivered
                          │           └─► interview_scheduled
                          │                 └─► interviewed
                          │                       ├─► offered
                          │                       │     └─► hired ✓
                          │                       └─► rejected_by_client
                          └─► screened_fail ✗
  (any time) ──► withdrew ✗
  (any time) ──── no_response ✗
```

---

## Seeker Pipeline (Candidate-Initiated)

Candidate signs up → AI discovers and scores jobs → pushes best matches.

```
┌────────────────────────┐
│  Candidate signs up    │
│  via Telegram bot or   │
│  web portal            │
└──────────┬─────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  parse-candidate worker           │
│                                   │
│  MatchmakerAgent.parseResume()    │
│  Input: raw CV text or 5-Q answers│
│                                   │
│  Extracts structured profile:     │
│  - currentPosition                │
│  - skills[] (normalized)          │
│  - yearsExperience                │
│  - expectedSalaryUzs              │
│  - education, certifications      │
│                                   │
│  Saves Candidate.parsedResume     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  embed-candidate worker           │
│                                   │
│  Generate text embedding from     │
│  parsedResume summary             │
│                                   │
│  Store in pgvector column         │
│  (1536 dims, HNSW index)          │
└──────────┬───────────────────────┘
           │
           └──────────────┐
                          │
           ┌──────────────┘
           ▼ (immediate on signup + cron every 4h)
┌──────────────────────────────────┐
│  discover-jobs worker             │
│                                   │
│  Source: HH.uz                    │
│  Area: 2759 (Tashkent)            │
│  Pages: up to 5 (500 jobs)        │
│                                   │
│  Also: Telegram channel posts     │
│  → LLM extracts job from text     │
│                                   │
│  Creates DiscoveredJob records    │
│  (deduped by sourceUrl)           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  score-seeker-jobs worker         │
│  (runs per candidate)             │
│                                   │
│  MatchmakerAgent.scoreSeekerJobs()│
│  For each unscored DiscoveredJob: │
│                                   │
│  Produces SeekerJobMatch:         │
│  - score: 0-100                   │
│  - strengths: ["..."]             │
│  - gaps: ["..."]                  │
│  - explanation: "..."             │
└──────────┬───────────────────────┘
           │
           ├─► emit scoring_complete event
           │         │
           │         ▼ (if Candidate.minMatchScore != null)
           │   notifyNewMatches()
           │   → top 3 matches ≥ threshold
           │   → Telegram message with apply buttons
           │
           ▼ (candidate views matches)
┌──────────────────────────────────┐
│  Candidate actions                │
│                                   │
│  Telegram: /mymatches             │
│  Web: /candidate/jobs             │
│  TMA: /tma/candidate/feed         │
│                                   │
│  One-tap apply button             │
│  → auto-apply worker enqueued     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  auto-apply worker                │
│                                   │
│  HH.uz: POST /applicant/:resumeId/cv│
│         → hhNegotiationId stored  │
│                                   │
│  LinkedIn: POST application       │
│                                   │
│  SeekerApplication status:        │
│  pending → submitted              │
└──────────┬───────────────────────┘
           │
           ▼ (hourly sync)
┌──────────────────────────────────┐
│  sync-hh-status worker            │
│                                   │
│  Poll GET /negotiations           │
│  Map HH status → internal status: │
│  - "response" → viewed            │
│  - "invitation" → interview       │
│  - "discard" → rejected           │
│                                   │
│  Update SeekerApplication.status  │
│  Notify candidate of changes      │
└──────────────────────────────────┘
```

---

## AI Career Help Pipeline (Telegram Commands)

Real-time, per-command. No queue — synchronous LLM call in bot handler.

```
/rewrite command
  → Load candidate's parsedResume
  → Load top SeekerJobMatch (highest score)
  → Load DiscoveredJob details
  → LLM prompt: "Rewrite this CV summary to target this job"
  → Return rewritten summary in Telegram message

/prep command
  → Load selected job (state = "discovered:<jobId>")
  → LLM prompt: "Generate 5 interview Q&A for this candidate + job"
  → Return formatted Q&A in Telegram message

/feedback command
  → Load candidate's recent SeekerApplications (rejected)
  → Load job details
  → LLM prompt: "Analyze likely rejection reasons, give 3 improvements"
  → Return actionable feedback in Telegram message
```

---

## Event Flow (SSE)

Real-time updates pushed to frontend via Server-Sent Events.

```
Worker emits EventEmitter event
  │
  ▼
EventsGateway.handleEvent()
  │
  ├─► HR portal listeners (AuthGuard session active):
  │   GET /api/v1/events (text/event-stream)
  │   Events: new_match, outreach_sent, screening_complete, dossier_ready
  │
  └─► Candidate portal listeners:
      GET /api/v1/candidate-portal/events (text/event-stream)
      Events: scoring_complete, resume_parsed, new_message, application_status_change

Frontend SSE composables reconnect automatically on disconnect.
Event types trigger UI: toast notifications, badge counts, auto-refresh data.
```
