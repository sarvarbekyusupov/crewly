# Next-Steps Roadmap (for Claude Code)

**Status:** Ready to implement
**Owner:** Claude Code
**Prereqs done:** HH applicant API removed; assisted-apply live (HH/Telegram); `applyNative` emits `application.created`; jest memory fixed; first test suite green.

Read fully before coding. Work the blocks in order — Block A unblocks everything else.

---

## Where we are

| Piece | State |
|-------|-------|
| Assisted apply (HH + Telegram) | ✅ Working |
| `applyNative()` → Application(matched) + event | ✅ Working, but **unreachable** (see A1) |
| Employer dashboard ranks `status='matched'` by `matchScore` | ✅ Exists (`jobs.service.ts:156/302`, `applications.service.ts:66`) |
| Native job → candidate-visible job | ❌ **Missing bridge** |
| Monetization gate on employer access | ❌ Missing (Payme infra exists, not wired) |
| e2e tests for the two apply flows | ❌ Missing |

**Critical finding:** `DiscoveredJob` rows are only created for `source='hh.ru'` and `source='telegram_channel'` (`job-discovery.service.ts`, `telegram-channel-monitor.service.ts`). Nothing creates `source='crewly'`. So an employer's native job never reaches a candidate, and `applyNative` never fires. Fix this first.

---

## Block A — Close the native loop (highest priority)

Goal: an employer posts a Crewly-native job → a candidate sees it, applies one-tap → it lands ranked in the employer's dashboard.

- [ ] **A1 — Native Job → DiscoveredJob bridge.** When a job is created/published with `jobSource='crewly'` (`modules/jobs/jobs.service.ts`, the `jobSource === 'crewly'` branch at ~line 232), create a matching `DiscoveredJob`:
  - `source: 'crewly'`, `externalId: job.id` (this is what `applyNative` looks up), `sourceUrl: 'crewly:job:{id}'`, plus title/company/description/skills/salary from the Job.
  - Keep it in sync on job update/close (archive the DiscoveredJob when the Job closes).
  - **Acceptance:** publishing a native job produces exactly one `DiscoveredJob{source:'crewly', externalId: job.id}`.
- [ ] **A2 — Score + surface native jobs to candidates.** Ensure new `source='crewly'` DiscoveredJobs are picked up by `ScoreSeekerJobsProcessor` and appear in candidate feeds (Telegram `/mymatches`, TMA feed, web `/candidate/jobs`). Confirm no source filter excludes `crewly`.
  - **Acceptance:** a matched candidate sees the native job in all three surfaces with a score.
- [ ] **A3 — Verify apply carries `source='crewly'` end-to-end.** The apply entrypoints (`candidate-portal.service.ts:370`, `tma.service.ts:306`, `telegram-bot.service.ts:502/825`) create `SeekerApplication` — confirm they set `source` from the `DiscoveredJob.source` so native jobs route to `applyNative`, not assisted.
  - **Acceptance:** applying to a native job creates `SeekerApplication{source:'crewly'}` → `applyNative` → `Application{status:'matched'}` → `application.created` emitted → ranked → visible to employer. Walk it once manually.

## Block B — Monetization gate (the wedge)

Goal: employers pay to access ranked applicants for native jobs. Payme infra already exists (`integrations/payme/`, `Invoice` model, env vars).

- [ ] **B1 — Define the gate.** Decide the locked unit (recommend: viewing a candidate's contact info / unlocking the ranked shortlist beyond a free preview). Document it.
- [ ] **B2 — Entitlement model.** Add a `CompanyEntitlement` (or reuse `Invoice`) tying a paid Payme invoice to unlocked access (per-job unlock or time-boxed subscription). Migration included.
- [ ] **B3 — Guard the endpoints.** Gate the employer applicant-access endpoints (`modules/jobs` / `modules/applications` list + candidate detail) behind the entitlement. Free tier: first N applicants previewed (name + score, no contact), rest locked.
- [ ] **B4 — Wire Payme.** On `payme-webhook` payment success, grant the entitlement. Stub pricing is fine; the seam must work end-to-end.
  - **Acceptance:** unpaid employer sees locked previews; after a (test) Payme payment, the shortlist + contacts unlock.

## Block C — Verification & launch readiness

- [ ] **C1 — e2e (Playwright):** (a) candidate prepares assisted HH apply → self-reports applied → shows in tracker; (b) employer posts native job → candidate applies → employer sees ranked applicant → unlock via payment.
- [ ] **C2 — Fresh-DB check:** run all migrations clean; add/update a seed script with a demo employer, native job, and candidate.
- [ ] **C3 — Pipeline health:** confirm Bull Board shows no orphaned queues; add basic logging/alert on apply-pipeline failures (`assisted_required`, `applyNative` NonRetryableError).
- [ ] **C4 — Full green:** `npm run build` + full test suite pass with the committed jest config.

## Block D — Go-to-market (Tashkent launch)

Product is the means; these are the launch actions the candidate-first strategy needs.

- [ ] **D1 — Seed supply:** wire 3–5 active Tashkent Telegram job channels into channel monitoring; confirm HH discovery cron is live for area 2759.
- [ ] **D2 — Candidate acquisition:** ship the referral hook in the Telegram bot; recruit the first 30–50 candidates by hand.
- [ ] **D3 — First employers:** onboard 5–10 warm employers to post **native** jobs (this is where Crewly's full value + monetization live).
- [ ] **D4 — Instrument:** track active candidates, 7-day return rate, referrals, native-job applications, and first paid unlock.

---

## Suggested commit sequence

1. `feat(jobs): bridge native Crewly jobs into DiscoveredJob + candidate feeds (Block A)`
2. `feat(billing): entitlement gate on employer applicant access via Payme (Block B)`
3. `test(e2e): cover assisted + native apply and payment unlock (Block C)`
4. `chore(launch): seed channels, referral hook, demo seed data (Block D)`

## Guardrails (unchanged)

- No HH applicant-API calls; no covert HH session automation. Assisted apply only for HH/Telegram.
- Keep vacancy search + employer API intact.
- The full automated experience lives only on `source='crewly'` jobs — that's the point of the model.
