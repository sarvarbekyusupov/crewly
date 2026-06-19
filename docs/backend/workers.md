# Background Workers

BullMQ + Redis. 14 queues. Workers co-located with NestJS process.

---

## Configuration

Queue constants: `backend/src/workers/queue-names.ts`  
Default job options: `backend/src/workers/queue-options.ts`  
Registration: `backend/src/workers/workers.module.ts`  
Processors: `backend/src/workers/*.processor.ts`

### Default Options
```typescript
export const INGEST_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,    // 5s, 10s, 20s
  },
  removeOnComplete: {
    age: 3600,      // keep completed jobs 1 hour
  },
  removeOnFail: {
    age: 604800,    // keep failed jobs 7 days (for debugging)
  },
}
```

### Bull Board UI
URL: `https://crewly.uz/admin/queues`  
Auth: HTTP Basic — username: `admin`, password: `BULL_BOARD_PASSWORD`

Shows: queue depths, active/waiting/failed jobs, retry counts, job payloads, logs.

---

## Cron Schedule

All crons registered in `CronService.onModuleInit()` (`backend/src/common/cron.service.ts`):

| Job ID | Queue | Cron | Payload |
|--------|-------|------|---------|
| `hh-{spec}-scheduled` | `ingest-candidates` | `0 */4 * * *` (every 4h) | `{ source: 'hh.ru', specialization: spec, maxPages: 5 }` |
| `cleanup-sessions` | `cleanup` | `0 3 * * *` (3am) | `expire-sessions` |
| `cleanup-idempotency` | `cleanup` | `15 3 * * *` (3:15am) | `expire-idempotency-keys` |
| `mark-invoices-overdue` | `cleanup` | `0 1 * * *` (1am) | `mark-invoices-overdue` |
| `cleanup-guarantee-expiry` | `cleanup` | `0 6 * * *` (6am) | `check-guarantee-expiry` |
| `invoice-reminders` | `cleanup` | `0 9 * * *` (9am) | `send-invoice-reminders` |
| `sync-hh-status-hourly` | `sync-hh-status` | `0 * * * *` (hourly) | `{}` |
| `discover-jobs-hh-scheduled` | `discover-jobs` | `30 */4 * * *` (every 4h +30min) | `{ source: 'hh.ru', location: '2759', maxPages: 5 }` |

> `discover-jobs` runs at `:30` and `ingest-candidates` at `:00` to avoid simultaneous database load.

---

## All 14 Queues

### `ingest-candidates`
**Processor:** `IngestCandidatesProcessor`  
**File:** `workers/ingest-candidates.processor.ts`  
**Triggers:**
- Cron: every 4h per `HH_SPECIALIZATIONS` value (default `1.221`)
- Manual: `POST /staff/ingestion-runs`

**Process:**
```
fetch resumes from HH.uz (employer token)
  → for each resume:
      upsert Candidate (by email or sourceExternalId)
      upsert CandidateRawPayload
      enqueue parse-candidate { candidateId }
  → update IngestionRun { candidatesFetched, candidatesNew, status: 'completed' }
```

---

### `parse-candidate`
**Processor:** `ParseCandidateProcessor`  
**File:** `workers/parse-candidate.processor.ts`  
**Triggers:**
- After `ingest-candidates` (auto)
- After CV upload: `POST /candidate-portal/cv/parse`

**Process:**
```
load Candidate.resumeFileUrl → download PDF from S3
  OR use CandidateRawPayload JSON

extract text (pdf-parse library)
MatchmakerAgent.parseResume(rawText)
  → structured profile saved to Candidate.parsedResume

enqueue embed-candidate { candidateId }
emit 'resume_parsed' event (SSE → candidate portal)
```

---

### `embed-candidate`
**Processor:** `EmbedCandidateProcessor`  
**File:** `workers/embed-candidate.processor.ts`  
**Triggers:** After `parse-candidate`

**Process:**
```
load Candidate.parsedResume
build embedding text: "Position: {pos}. Skills: {skills}. Experience: {years} years. {summary}"
call embedding API (OpenAI text-embedding-3-small or equivalent)
store vector in Candidate.embedding (pgvector column, 1536 dims)
```

Required for semantic candidate-job matching.

---

### `parse-job`
**Processor:** `ParseJobProcessor`  
**File:** `workers/parse-job.processor.ts`  
**Triggers:** When Job is created or description updated (via `JobsService`)

**Process:**
```
load Job.description
MatchmakerAgent.parseJob(description)
  → Job.parsedRequirements = { requiredSkills, techStack, seniority, ... }
  → Job.embedding updated (for ANN search)
enqueue match-candidates { jobId }
```

---

### `match-candidates`
**Processor:** `MatchCandidatesProcessor`  
**File:** `workers/match-candidates.processor.ts`  
**Triggers:**
- After `parse-job`
- Manual trigger from staff portal

**Process:**
```
load Job with parsedRequirements + embedding

phase 1: ANN search
  SELECT candidateId, 1 - (embedding <=> $jobEmbedding) AS similarity
  FROM candidates
  WHERE embedding IS NOT NULL AND do_not_contact = false
  ORDER BY similarity DESC LIMIT 50

phase 2: LLM reranking
  MatchmakerAgent.rankCandidates(job, top50)
  → sorted list with scores, reasons, recommendation

phase 3: persist
  for each ranked candidate:
    upsert Application { jobId, candidateId, companyId,
      matchScore, vectorSimilarity, rerankScore,
      matchRecommendation, matchReasons, status: 'matched' }

emit event if outreach campaign enabled
```

---

### `send-outreach`
**Processor:** `SendOutreachProcessor`  
**File:** `workers/send-outreach.processor.ts`  
**Triggers:**
- After match + campaign enabled
- `POST /applications/:id/retry-outreach`

**Process:**
```
load Application + Candidate + Job
OutreachAgent.generateMessage(candidate, job, channel)
  → personalized message text

send via channel:
  telegram: bot.api.sendMessage(candidate.telegramChatId, text)
  email:    EmailService.send({ to, subject, body })
  hh:       HhApplicantService.sendMessage(resumeId, vacancyId, text)
  sms:      EskizService.send(phone, text)

create OutreachAttempt {
  applicationId, channel, attemptNumber,
  status: 'sent', resendEmailId?
}
Application.status → 'outreach_sent'
```

---

### `advance-screening`
**Processor:** `AdvanceScreeningProcessor`  
**File:** `workers/advance-screening.processor.ts`  
**Triggers:**
- New candidate message received in conversation
- `POST /screenings` (initial start)

**Process:**
```
load Screening + full conversation history
ScreeningAgent.advance(screening, messages)
  returns: { type: 'question', message } OR { type: 'assessment', assessment }

if type === 'question':
  create Message { content: question, direction: 'outbound' }
  send via channel (Telegram/web/email)
  Screening.questionsAsked++

if type === 'assessment':
  Screening.aiAssessment = assessment
  Screening.status = 'completed'
  Application.status → 'screened_pass' | 'screened_fail'
  enqueue generate-dossier (if pass)
  notify HR via SSE
```

---

### `generate-dossier`
**Processor:** `GenerateDossierProcessor`  
**File:** `workers/generate-dossier.processor.ts`  
**Triggers:**
- After screening completes (pass)
- `POST /applications/:id/transcript`

**Process:**
```
load Application + Candidate + Screening.fullTranscript + Job
DebriefAgent.analyzeInterview(transcript, job)
  → dossierContent: { markdownFull, summary, recommendation, ... }

convert markdown → PDF (html to PDF library)
upload PDF to S3 → get URL
Application.dossierUrl = url

notify HR via SSE: 'dossier_ready'
```

---

### `discover-jobs`
**Processor:** `DiscoverJobsProcessor`  
**File:** `workers/discover-jobs.processor.ts`  
**Triggers:**
- Cron: `30 */4 * * *`
- On candidate signup (immediate, `maxPages: 3`)
- Manual: `POST /staff/job-discovery-runs`

**Process:**
```
payload.source === 'hh.ru':
  for page in 0..maxPages:
    GET https://api.hh.ru/vacancies?area=2759&per_page=100&page={n}
    for each vacancy:
      HhJobsAdapter.normalize(vacancy) → DiscoveredJob shape
      upsert DiscoveredJob by sourceUrl
      increment jobsFetched/jobsNew counters

  create JobDiscoveryRun { source, status, jobsFetched, jobsNew }

  enqueue score-seeker-jobs for all Candidates with minMatchScore != null
```

---

### `score-seeker-jobs`
**Processor:** `ScoreSeekerJobsProcessor`  
**File:** `workers/score-seeker-jobs.processor.ts`  
**Triggers:**
- After `discover-jobs`
- `POST /candidate-portal/discovered-jobs/score`

**Process:**
```
load Candidate with parsedResume

find DiscoveredJobs not yet scored for this candidate:
  SELECT dj.* FROM discovered_jobs dj
  LEFT JOIN seeker_job_matches sjm
    ON sjm.discovered_job_id = dj.id AND sjm.candidate_id = $candidateId
  WHERE sjm.id IS NULL
  LIMIT 50

batch into groups of 10:
  MatchmakerAgent.scoreSeekerJobs(candidate, batch)
  → Array<{ jobId, score, strengths, gaps, explanation }>

create SeekerJobMatch records

emit('scoring_complete', { candidateId })
  → if Candidate.minMatchScore != null:
       notifyNewMatches(candidateId)
       top 3 matches → Telegram push notification
```

---

### `auto-apply`
**Processor:** `AutoApplyProcessor`  
**File:** `workers/auto-apply.processor.ts`  
**Triggers:**
- `POST /candidate-portal/seeker-applications`
- Telegram apply button callback

**Process:**
```
load SeekerApplication + DiscoveredJob + Candidate

SeekerAgent.decideAndDraftApplication(candidate, job)
  → should_apply? (false → status: 'skipped')
  → cover_letter text

if source === 'telegram_alert':
  applyTelegram() → status: 'applied' + notify candidate

if source === 'crewly':
  // Crewly-native job: route straight to employer Application pipeline.
  // discoveredJob.externalId = Job.id (set when employer creates native job).
  job = db.job.findUnique({ id: discoveredJob.externalId })
  db.application.create({ jobId, candidateId, companyId, status: 'matched' })
  SeekerApplication.status = 'applied', applyMethod = 'native'
  // Employer sees candidate in HR dashboard; no HH.uz involved.

if source in ('hh.ru', 'telegram_channel'):
  // HH applicant API permanently closed.
  // Telegram channels have no apply API.
  // Assisted apply path:
  ApplyKitService.build(candidateId, discoveredJobId)
    → cover letter, tailored CV, applyUrl, instructions
  SeekerApplication.applyKit = kit
  SeekerApplication.applyUrl = kit.applyUrl
  SeekerApplication.status = 'assisted_ready'
  Telegram: send kit message with "Open on HH" + self-report buttons

if source === 'linkedin':
  LinkedInApplyService.apply(...) → Playwright automation
  SeekerApplication.status = 'applied'
```

---

### `sync-hh-status`
**Processor:** `SyncHhStatusProcessor`  
**File:** `workers/sync-hh-status.processor.ts`  
**Triggers:**
- Cron: `0 * * * *` (every hour)
- HH.uz webhook: `POST /webhooks/hh`

**Process (employer-side only — applicant API closed):**
```
syncEmployerNegotiations():
  load all Applications (HR pipeline) with hhNegotiationId
    WHERE status NOT IN ('rejected', 'hired')
  for each:
    HhNegotiationsService.getEmployerNegotiationState(hhNegotiationId)
    map HH employer state → internal status via HH_EMPLOYER_STATE_MAP
    if changed: update Application.status
    if 404: set status = 'rejected'

syncInboundResponses():
  load active Jobs with hhVacancyId
  for each:
    HhNegotiationsService.getVacancyResponses(vacancyId, { collection: 'response' })
    for new negotiations: HhCandidateService.findOrCreate(neg.resume.id)
    upsert Application record
```

> Note: `SeekerApplication` status sync (candidate-side) is no longer done here — the applicant API is closed. Self-reporting via Telegram buttons is the only status update path for `assisted_ready` applications.

---

### `cleanup` (sub-jobs)

**Processor:** `CleanupProcessor`  
**File:** `workers/cleanup.processor.ts`

| Sub-job name | When | What |
|-------------|------|------|
| `expire-sessions` | 3:00am | DELETE FROM sessions WHERE expires_at < NOW() |
| `expire-idempotency-keys` | 3:15am | DELETE FROM idempotency_keys WHERE expires_at < NOW() |
| `mark-invoices-overdue` | 1:00am | UPDATE invoices SET status='overdue' WHERE due_date < NOW() AND status='issued' |
| `check-guarantee-expiry` | 6:00am | Flag placements past guarantee period, notify HR |
| `send-invoice-reminders` | 9:00am | Email companies with invoices due in 3 days |

---

### `enrich-job`
**Processor:** `EnrichJobProcessor`  
**File:** `workers/enrich-job.processor.ts`  
**Triggers:** After `parse-job`

**Process:**
```
additional LLM extraction pass on job description:
  - visa/permit requirements
  - seniority confidence score
  - industry classification
  - remote work details

updates Job with enriched fields
```

---

## Adding a New Worker

1. Add constant to `queue-names.ts`:
   ```typescript
   export const QUEUES = {
     ...existing,
     MY_NEW_QUEUE: 'my-new-queue',
   }
   ```

2. Create processor:
   ```typescript
   // workers/my-new.processor.ts
   @Processor(QUEUES.MY_NEW_QUEUE)
   export class MyNewProcessor extends WorkerHost {
     async process(job: Job<MyPayload>): Promise<void> {
       const { myField } = job.data
       // do work
     }
   }
   ```

3. Register in `workers.module.ts`:
   ```typescript
   BullModule.registerQueue({ name: QUEUES.MY_NEW_QUEUE })
   providers: [...existing, MyNewProcessor]
   ```

4. Inject queue where you enqueue:
   ```typescript
   @InjectQueue(QUEUES.MY_NEW_QUEUE) private readonly myQueue: Queue
   await this.myQueue.add({ myField: 'value' }, INGEST_JOB_OPTIONS)
   ```

5. Register queue in that module's `BullModule.registerQueue([...])`.
