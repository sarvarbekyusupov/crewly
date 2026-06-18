# HH Pivot — Implementation Plan (for Claude Code)

**Status:** Ready to implement
**Owner:** Claude Code
**Context doc:** read this fully before touching code.

---

## Why this work exists

HH.uz support confirmed in writing that the **applicant (job-seeker) API is permanently closed**:

> "Мы закрыли доступ к API для соискателей… С авторизацией пользователя-соискателя доступны только запрос `GET /me` и некоторые справочники. Работать с резюме и откликами соискатели могут только через веб/мобильную версию сайта или мобильное приложение. Мы не планируем запуск нового API для соискателей и не делаем исключений."

Consequences, treat as permanent:

- **Dead:** applying to HH vacancies on a candidate's behalf (`POST /negotiations`), reading a candidate's HH resume (`/resumes/mine`), reading/syncing their HH negotiations/applications status.
- **Still works (do NOT remove):** vacancy search (`GET /vacancies?area=2759`) — this is public job-board data, not the applicant API. Job discovery is unaffected.
- **Still works:** `GET /me` (candidate identity only) and dictionaries.
- **Still works:** the entire **employer** API (server-to-server with `HH_EMPLOYER_TOKEN`).

## Guardrail (do not violate)

Do **not** build headless automation, scraping, or session-replay that submits HH applications on the user's behalf. HH explicitly cited security risk and intent. The only acceptable apply path for external HH jobs is **user-initiated assisted apply** (we prepare the materials; the human clicks apply in their own HH session).

## Strategy this implements

Three-tier job sourcing:

| Source | Discovery | Apply | Status tracking |
|--------|-----------|-------|-----------------|
| **HH.uz** | API vacancy search (keep) | **Assisted** (AI kit + deep link, user applies) | Self-report only |
| **Telegram channels** | LLM extraction (keep) | **Assisted** (kit + contact link) | Self-report only |
| **Crewly-native employer posts** | Posted directly in Crewly | **Full native auto-apply** | Fully owned in Crewly pipeline |

HH and Telegram become top-of-funnel discovery. The full automated experience and monetization live on **Crewly-native employer posts**, where we own all the data.

---

## Phase 0 — Remove dead HH applicant-API code paths

Goal: nothing in the product calls the closed applicant API. No silent failures.

- [ ] **`backend/src/workers/auto-apply.processor.ts`** — remove the HH `POST /negotiations` apply branch. Any `DiscoveredJob` with `source = 'hh.ru'` must NOT attempt API apply. Route it to the assisted-apply path (Phase 1) by setting status to `assisted_required` instead of `queued`→`submitted`. Drop the `HhApplicantService` and `HhOAuthService` injections from this processor if no longer used.
- [ ] **`backend/src/integrations/hh/hh-applicant.service.ts`** — delete/disable apply + negotiations methods (`getNegotiations`, apply-to-vacancy, send-message). **Keep `searchVacancies`** (move it to `hh-vacancy.service.ts` if it doesn't belong in an "applicant" service anymore) and keep a `getMe(token)` helper for `GET /me`.
- [ ] **`backend/src/integrations/hh/hh-resume.service.ts`** — remove candidate resume read/publish/hide (all applicant-token). If the file becomes empty, delete it and its `hh.module.ts` registration.
- [ ] **`backend/src/integrations/hh/hh-negotiations.service.ts`** and **`hh-chat.service.ts`** — remove candidate-side negotiation/chat sync. Verify nothing employer-side depends on them before deleting.
- [ ] **`backend/src/workers/sync-hh-status.processor.ts`** — delete. There is no candidate negotiation status to sync anymore. Remove its queue registration in the workers module and any cron entry.
- [ ] **`backend/src/integrations/hh/hh-oauth.service.ts`** — reduce to identity only. Keep the authorize/callback/token exchange ONLY if we use `GET /me` as a "verify HH identity" feature; otherwise delete. Do not keep refresh logic for resume/apply scopes.
- [ ] **`backend/src/modules/candidate-portal/`** (controller + service) — remove endpoints that linked HH for resume/apply (`/hh/resume/*`, `/hh/vacancies/{id}/apply`, `/hh/negotiations`, `/hh/chats`). Keep `GET /hh/vacancies` (discovery) if it's served here.
- [ ] **`backend/src/modules/agents/seeker.agent.ts`** — the "Career Pilot auto-applies to external jobs" behavior must change: for HH/Telegram it now *drafts the application kit* but does not submit. Keep the decide-and-draft logic; remove the submit step for external sources.

**Acceptance:** grep the backend for calls to `/negotiations`, `/resumes/mine`, `resumes/{id}/publish` under candidate/applicant context → zero remaining. `npm run build` passes. No queue references a deleted processor.

---

## Phase 1 — Make assisted-apply the standard for external jobs (HH + Telegram)

Goal: for any HH or Telegram job, the candidate gets a ready-to-send "application kit" and a deep link, then applies themselves.

- [ ] **Schema (`prisma/schema.prisma`)** — on `SeekerApplication`:
  - add `applyMethod` enum: `native` | `assisted` (default `assisted` for external sources).
  - extend status enum to include `assisted_required`, `assisted_ready`, `self_reported_applied`, `self_reported_reply`.
  - add nullable `applyUrl` (deep link) and `applyKit` (Json: coverLetter, tailoredCvText, instructions).
  - write a migration; run `prisma migrate dev`.
- [ ] **Application-kit builder** — reuse **`backend/src/integrations/apply/cover-letter.service.ts`** for the cover letter. Add a service (e.g. `apply-kit.service.ts` in the same `integrations/apply/` module) that returns `{ coverLetter, tailoredCvText, applyUrl, instructions }`.
  - HH deep link: `https://hh.uz/vacancy/{externalId}` (use `DiscoveredJob.externalId` / `sourceUrl`).
  - Telegram deep link: the contact handle / channel post URL already in `sourceUrl`.
- [ ] **`auto-apply.processor.ts`** (or a new `prepare-apply.processor.ts`) — for `source in ('hh.ru','telegram_channel')`: build the kit, set status `assisted_ready`, store `applyUrl` + `applyKit`, notify the candidate. Do not submit anything externally.
- [ ] **Candidate surfaces** — expose the kit on all three:
  - Telegram bot (`backend/src/integrations/telegram/…`): "📝 Prepare application" button → sends cover letter as copyable text + Apply link.
  - TMA + web portal (`frontend/`): an "Apply kit" view with copy-to-clipboard for the cover letter and CV, and an "Open on HH" button.
- [ ] **Self-report tracking** — since no API status sync, add candidate actions: "I applied" → `self_reported_applied`; "Got a reply" → `self_reported_reply`. Surface in their applications list.

**Acceptance:** end-to-end for one real HH vacancy — candidate taps Prepare, gets AI cover letter + tailored CV + working hh.uz link, marks "applied," and it shows in their tracker. No external API write occurs.

---

## Phase 2 — Crewly-native employer posts = full automated apply (monetization wedge)

Goal: jobs posted directly into Crewly get the full automated experience that HH denies us.

- [ ] **Employer posting** — confirm the HR portal can create a native job (`source = 'crewly'`). It already publishes to HH via employer API; add the option to keep a job **Crewly-native** (not pushed to HH).
- [ ] **Native apply pipeline** — for `source = 'crewly'`, candidate apply creates a first-class `Application` in the Crewly pipeline (not a `SeekerApplication` assisted record). Full status tracking, employer-candidate messaging, and AI cover letter all run natively because we own the data.
- [ ] **Wire the loop** — when a candidate matches a native job, they can one-tap apply; the employer sees the AI-ranked applicant in their HR dashboard immediately.
- [ ] **Monetization hook (stub OK for now)** — gate employer access to ranked applicants behind the existing Payme flow (`integrations/payments`). Just the seam; pricing later.

**Acceptance:** an employer posts a native job → a matched candidate applies in-app → employer sees the application with AI ranking, all status changes tracked inside Crewly with zero external dependency.

---

## Phase 3 — Docs, env, cleanup

- [ ] **`docs/integrations/hh-uz.md`** — delete the "Candidate OAuth Flow" and "Candidate Operations" sections. Add a clear note: applicant API closed by HH (quote the email). Keep employer API + vacancy search + `GET /me`.
- [ ] **`docs/features/job-discovery.md`** — change the Auto-Apply section: HH/Telegram = assisted apply; add the native-apply path. Remove the "Status Sync (HH.uz)" section.
- [ ] **`docs/90-day-roadmap.md`** and **`ROADMAP.md`** — reflect: HH = discovery + assisted apply; native employer posts = monetization.
- [ ] **`.env.example` / `ops/environment.md`** — if HH OAuth is fully removed, deprecate `HH_CLIENT_ID`, `HH_CLIENT_SECRET`, `HH_REDIRECT_URI`. If kept only for `GET /me` identity, document that narrow purpose. Keep `HH_EMPLOYER_TOKEN`, `HH_EMPLOYER_ID`, `HH_USER_AGENT`.
- [ ] **`CURRENT_STATE.md`** — update the seeker.agent and worker descriptions (no HH auto-apply; no sync-hh-status).

---

## Phase 4 — Tests & verification

- [ ] Remove/replace unit tests asserting HH auto-apply and HH status sync.
- [ ] Add unit tests for the apply-kit builder (HH + Telegram deep links, cover letter present).
- [ ] Add an e2e (Playwright) spec: candidate prepares an assisted application and self-reports applied.
- [ ] Add an e2e spec for native employer post → candidate apply → employer sees ranked applicant.
- [ ] `npm run build` + full test suite green. Bull Board shows no orphaned queues.

---

## Out of scope / do not do

- Do not attempt to re-enable any HH applicant-API call.
- Do not build covert HH session automation or scraping of logged-in applicant pages.
- Do not remove vacancy search or the employer API — they are unaffected.

## Suggested commit sequence

1. `chore(hh): remove dead applicant-API code paths (Phase 0)`
2. `feat(apply): assisted-apply kit for HH + Telegram jobs (Phase 1)`
3. `feat(jobs): native Crewly employer posts with full apply pipeline (Phase 2)`
4. `docs(hh): document applicant API closure and assisted-apply pivot (Phase 3)`
5. `test: cover assisted + native apply, drop HH auto-apply tests (Phase 4)`
