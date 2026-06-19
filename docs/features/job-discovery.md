# Job Discovery

How Crewly finds Tashkent jobs and scores them against candidate profiles.

Three sources: **HH.uz** (structured API, public), **Telegram channels** (unstructured posts → AI extraction), and **Crewly-native** (employer posts directly on Crewly — seam wired, full apply UX in progress).

---

## HH.uz Job Discovery

### Trigger
- Cron: every 4h at half-past (`30 */4 * * *`)
- On-demand: Telegram bot enqueues immediately when candidate signs up
- Manual: Staff → `POST /staff/job-discovery-runs`

### Worker Payload
```json
{
  "source": "hh.ru",
  "location": "2759",
  "maxPages": 5
}
```

`location: "2759"` = Tashkent on hh.uz. Critical — without it, global results returned.

### Process

```
DiscoverJobsProcessor.process(job)
  │
  ├── Call HH.uz: GET /vacancies?area=2759&per_page=100&page=0
  │   (repeat for pages 1..maxPages)
  │
  ├── For each vacancy:
  │   ├── Check if DiscoveredJob exists (by sourceUrl — unique)
  │   │     → exists: update title/salary if changed
  │   │     → new: create DiscoveredJob
  │   │
  │   └── HhJobsAdapter normalizes:
  │       {
  │         source: 'hh.ru',
  │         externalId: '12345',
  │         sourceUrl: 'https://hh.uz/vacancy/12345',
  │         title, company, description, skills[], salaryMinUzs, rawPayload
  │       }
  │
  └── Create JobDiscoveryRun record
```

### Deduplication
`DiscoveredJob.sourceUrl` has a unique constraint. Upsert on conflict = update without duplicate.

---

## Telegram Channel Job Discovery

### How Channels Are Monitored

```
Admin: /addchannel -1001234567890
  → INSERT TelegramChannel { channelId: -1001234567890, isActive: true }

Bot is admin in that channel
  → grammY subscribes to channel_post:text events
  → TelegramChannelMonitorService.processChannelPost(ctx)
```

### Extraction Process

```
Channel post text
  │
  ▼
LLM prompt: "Extract job details. Return JSON: { title, company, skills[], salary_min_uzs, description }"
  │
  ▼
Create DiscoveredJob:
  {
    source: 'telegram_channel',
    externalId: String(messageId),
    sourceUrl: `telegram:${channelId}:${messageId}`,
    ...parsed
  }
```

### Currency Conversion
LLM detects and converts currencies (USD, EUR, RUB → UZS). Stored as BigInt in UZS.

---

## Job Scoring

After new jobs are discovered, they're scored against each candidate.

### Trigger
`ScoreSeekerJobsProcessor` is enqueued:
- After `discover-jobs` completes (for all subscribed candidates)
- When candidate requests: `POST /candidate-portal/discovered-jobs/score`
- After candidate onboarding completes

### Process

```
ScoreSeekerJobsProcessor.process({ candidateId })
  │
  ├── Load Candidate with parsedResume, skills, expectedSalaryUzs
  │
  ├── Find unscored DiscoveredJobs (no SeekerJobMatch for this candidate, limit 50)
  │
  ├── For each batch (10 at a time):
  │   └── MatchmakerAgent.scoreSeekerJobs(candidate, jobs[])
  │       → LLM: score fit 0-100, strengths[], gaps[], explanation
  │
  ├── Create SeekerJobMatch records
  │
  └── emit('scoring_complete', { candidateId })
        → if Candidate.minMatchScore set: push top 3 matches via Telegram
```

---

## Assisted Apply (HH.uz + Telegram)

HH.uz applicant API is closed; Telegram channels have no apply API. Both sources use **assisted apply**:

```
Candidate taps "Apply" or Telegram alert triggers apply queue
  │
  ▼
AutoApplyProcessor: source in ('hh.ru', 'telegram_channel')
  │
  ├── ApplyKitService.build(candidateId, discoveredJobId)
  │   ├── Generate cover letter (CoverLetterService.generate)
  │   ├── Build tailored CV text from profile
  │   ├── Deep link:
  │   │     hh.ru → https://hh.uz/vacancy/{externalId}
  │   │     telegram_channel → sourceUrl
  │   └── Step-by-step instructions
  │
  ├── Store on SeekerApplication: { applyKit, applyUrl, status: 'assisted_ready' }
  │
  └── Send Telegram message:
        - Instructions
        - Cover letter (copyable)
        - "🔗 Open on HH/Source" URL button
        - "✅ I applied" callback button
        - "💬 Got a reply" callback button
```

### Self-Report Tracking

| Status | Meaning |
|--------|---------|
| `assisted_required` | Kit building queued |
| `assisted_ready` | Kit built, candidate can apply |
| `self_reported_applied` | Candidate confirmed applying |
| `self_reported_reply` | Candidate confirmed receiving a reply |

---

## Auto-Apply (LinkedIn)

LinkedIn Easy Apply is still fully automated:

```
source === 'linkedin'
  → LinkedInApplyService.apply(...)
  → Playwright automation → submit form
  → status: 'applied'
```

---

## Crewly-Native Jobs (Employer Posts)

Employers can create jobs with `jobSource: 'crewly'` (default is `'hh'`). These jobs:

- Are **not** published to HH.uz (`publishToHh` rejects with 400)
- Can still be discovered and scored against candidates via `DiscoveredJob` records where `source: 'crewly'` and `externalId = Job.id`

When a candidate applies to a crewly-native job, `AutoApplyProcessor` routes to `applyNative()`:

```
source === 'crewly'
  → job = Job.findUnique({ id: discoveredJob.externalId })
  → Application.create({ jobId, candidateId, companyId, status: 'matched' })
  → SeekerApplication: status = 'applied', applyMethod = 'native'
```

The employer sees the candidate in their HR dashboard immediately (standard Application pipeline). No HH.uz or assisted flow involved.

**Status:** Routing seam is live. Creating `DiscoveredJob` records for crewly-native jobs and the candidate-facing apply UX are the remaining pieces.

---

## Candidate-Facing Views

| Surface | Where | Filter |
|---------|-------|--------|
| Telegram | `/mymatches` | Top 5 by score |
| Web portal | `/candidate/jobs` | Sortable, filterable |
| TMA | `/tma/candidate/feed` | Top 20 by score ≥ 50 |
| Push notification | Telegram message | Top 3 ≥ minMatchScore |
| Tracker / External tab | `/candidate/tracker` | HH.uz + Telegram assisted apps |
