# HH.uz Integration

> **Applicant API closed.** HH.uz confirmed (June 2026) that applicant-side API (`POST /negotiations`, resume CRUD, `/resumes/mine`) is permanently closed for third-party apps in Uzbekistan. Only public vacancy search and server-to-server employer API remain functional.

Base URL: `https://api.hh.ru`  
Area ID: `2759` = Tashkent  
Services: `backend/src/integrations/hh/`

---

## What Works

| API | Auth | Used For |
|-----|------|---------|
| `GET /vacancies?area=2759` | None (public) | Job discovery every 4h |
| Employer API (`/vacancies`, `/negotiations`, etc.) | `HH_EMPLOYER_TOKEN` | Employer vacancy management, inbound applications |
| `GET /me` | Candidate OAuth token | Identity check only after OAuth connect |

---

## Employer API (Server-to-Server)

```
Headers:
  Authorization: Bearer <HH_EMPLOYER_TOKEN>
  User-Agent: Crewly/1.0 (contact@crewly.uz)  (HH_USER_AGENT)
  HH-User-Agent: Crewly/1.0 (contact@crewly.uz)
```

Token set in `HH_EMPLOYER_TOKEN` — static token issued to employer account.

### Employer Operations

| HH.uz API | What Crewly does |
|-----------|-----------------|
| `GET /vacancies?area=2759` | Job discovery (every 4h) |
| `POST /vacancies` | Publish job from Crewly to HH.uz |
| `PUT /vacancies/{id}` | Update HH.uz vacancy |
| `DELETE /vacancies/{id}` | Archive vacancy |
| `POST /vacancies/{id}/prolongate` | Extend vacancy expiry |
| `GET /negotiations?vacancy_id={id}` | Inbound applications for a vacancy |
| `PUT /negotiations/{id}` | Move applicant to collection/stage |
| `GET /resumes/{id}` | Full resume (for inbound applicants) |

---

## Candidate OAuth (Identity Only)

Candidates may link their HH.uz account. Token is stored but used **only for `GET /me`** (identity check). No resume CRUD or negotiation calls are made on the candidate's behalf.

### OAuth Flow

```
GET /candidate-portal/hh/oauth-url
→ https://hh.ru/oauth/authorize?response_type=code&client_id=HH_CLIENT_ID&redirect_uri=HH_REDIRECT_URI&state=<state>

Callback: HH_REDIRECT_URI?code=<code>&state=<state>
→ Exchange code → access_token
→ GET /me (verify not employer account)
→ Store token for identity use only
→ Redirect: /candidate/preferences?hh=connected
```

Token revocation: `POST /candidate-portal/hh/disconnect`

---

## Assisted Apply (HH Discovery + Manual Apply)

Since the applicant API is closed, Crewly uses an **assisted apply** flow for HH jobs:

1. `AutoApplyProcessor` routes `source === 'hh.ru'` to `ApplyKitService.build()`
2. Service generates: cover letter, tailored CV text, deep link (`https://hh.uz/vacancy/{externalId}`), instructions
3. Kit stored on `SeekerApplication.applyKit` (JSON) + `applyUrl`
4. Candidate receives Telegram message with kit + "Open on HH" button
5. Candidate applies themselves and self-reports via "✅ I applied" / "💬 Got a reply" buttons

Status progression: `queued → assisted_required → assisted_ready → self_reported_applied → self_reported_reply`

---

## Services

| Service | File | Purpose |
|---------|------|---------|
| `HhClientService` | `hh-client.service.ts` | Base HTTP client — auth, error handling, retry |
| `HhOAuthService` | `hh-oauth.service.ts` | OAuth token exchange (identity scope only) |
| `HhApplicantService` | `hh-applicant.service.ts` | Public vacancy search, `GET /me` |
| `HhNegotiationsService` | `hh-negotiations.service.ts` | Employer negotiation sync |
| `HhVacancyService` | `hh-vacancy.service.ts` | Vacancy CRUD, stats, prolong |
| `HhChatService` | `hh-chat.service.ts` | Employer-candidate messaging |
| `HhJobsAdapter` | `hh-jobs.adapter.ts` | Normalize HH vacancy → `DiscoveredJob` |
| `HhWebhookService` | `hh-webhook.service.ts` | Employment agreement webhooks |
| `ApplyKitService` | `apply/apply-kit.service.ts` | Build assisted-apply kit for HH/Telegram jobs |

---

## Webhook (HH → Crewly)

```
POST /api/v1/webhooks/hh
  Authorization: Bearer <HH_WEBHOOK_SECRET>
  Body: { id, type: 'EMPLOYMENT_AGREEMENT', action: 'STATUS_CHANGED', object: {...} }
```

---

## Constants

| Constant | Value | Source |
|---------|-------|--------|
| `HH_BASE_URL` | `https://api.hh.ru` | `hh.constants.ts` |
| `HH_UZBEKISTAN_AREA_ID` | `2759` | `hh.constants.ts` |

---

## Rate Limits

- Anonymous: 10 req/s  
- Authenticated employer: 50 req/s  

`HhClientService` retries up to 3 times with exponential backoff on 429.
