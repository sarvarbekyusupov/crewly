# HR Portal API

All endpoints require `AuthGuard` (cookie: `hr_access_token`) unless noted.  
All data scoped to caller's `companyId` from JWT.

Role abbreviations: `V` = viewer, `HM` = hiring_manager, `A` = admin, `O` = owner.  
Role is cumulative — HM can do V things, A can do HM things, etc.

---

## Auth — `/auth`

No guard required.

| Method | Path | Throttle | Description |
|--------|------|----------|-------------|
| POST | `/auth/signup` | 5/min | Register HR user + company. Body: `{ email, password, fullName, companyName }` |
| POST | `/auth/login` | 5/min | Login. Sets `hr_access_token` (15min) + `hr_refresh_token` (30d) cookies |
| POST | `/auth/refresh` | — | Rotate access token. Reads `hr_refresh_token` cookie |
| POST | `/auth/logout` | — | Clear auth cookies |
| GET | `/auth/me` | — | Current user + company info *(AuthGuard)* |
| POST | `/auth/forgot-password` | 3/min | Send reset email |
| POST | `/auth/reset-password` | 5/min | Body: `{ token, newPassword }` |
| GET | `/auth/verify-email` | 10/min | `?token=<token>` — activates account |
| POST | `/auth/resend-verification` | 3/min | Resend activation email |
| GET | `/auth/me/telegram-link-code` | — | Returns deep-link code to connect HR Telegram account *(AuthGuard)* |

---

## Dashboard — `/dashboard`

| Method | Path | Role | Response |
|--------|------|------|----------|
| GET | `/dashboard/stats` | V | `{ totalJobs, activeJobs, totalCandidates, totalApplications, pipeline: { matched, outreachSent, screening, delivered }, recentActivity: [...] }` |

---

## Jobs — `/jobs`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/jobs` | V | List jobs. Query: `?status=active&page=1&limit=20` |
| POST | `/jobs` | HM | Create job. Body: `{ title, description, employmentType, workMode, salaryMinUzs?, salaryMaxUzs?, requiredSkills[], ... }` |
| GET | `/jobs/:id` | V | Full job detail with stats |
| PATCH | `/jobs/:id` | HM | Update any job field |
| POST | `/jobs/:id/activate` | HM | Set status → active, triggers match-candidates worker |
| POST | `/jobs/:id/pause` | HM | Set status → paused |
| POST | `/jobs/:id/close` | A | Set status → cancelled |
| DELETE | `/jobs/:id` | A | Soft delete (sets deletedAt) |
| POST | `/jobs/:id/send-outreach` | HM | Start outreach campaign. Body: `{ channel: 'telegram'|'email'|'hh', template? }` |
| GET | `/jobs/:id/applications` | V | All applications for job. Query: `?status=screening&page=1` |
| GET | `/jobs/:id/stats` | V | Funnel stats: `{ total, byStatus: {...}, averageMatchScore, responseRate }` |

**HH.uz integration sub-routes:**

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/jobs/hh/active` | HM | List active vacancies on HH.uz |
| POST | `/jobs/:id/publish-hh` | HM | Publish job to HH.uz. Creates `Job.hhVacancyId` |
| POST | `/jobs/:id/archive-hh` | HM | Archive on HH.uz (candidates still searchable) |
| POST | `/jobs/:id/prolong-hh` | HM | Extend HH.uz vacancy expiry |
| GET | `/jobs/:id/hh-viewers` | HM | Candidates who viewed resume on HH.uz |
| GET | `/jobs/:id/hh/stats` | HM | HH.uz vacancy stats (views, responses, invitations) |
| GET | `/jobs/:id/hh/negotiations` | HM | All negotiations (applications) on HH.uz |
| PUT | `/jobs/:id/hh/negotiations/:negId` | HM | Move negotiation to collection/stage |

---

## Applications — `/applications`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/applications` | V | List. Query: `?jobId=uuid&status=screening&page=1` |
| GET | `/applications/:id` | V | Full application with candidate, job, screenings, outreach history |
| PATCH | `/applications/:id` | HM | Update `hiringManagerNotes`, `hiringManagerDecision` |
| POST | `/applications/:id/approve` | HM | Move to `delivered` status |
| POST | `/applications/:id/reject` | HM | Set `rejected_by_client`. Body: `{ reason: string }` |
| POST | `/applications/:id/mark-interviewed` | HM | Set `interviewed` |
| POST | `/applications/:id/make-offer` | HM | Set `offered` |
| POST | `/applications/:id/hire` | HM | Set `hired`, create Placement record. Body: `{ agreedSalaryUzs }` |
| POST | `/applications/:id/schedule-interview` | HM | Create Google Calendar event. Body: `{ scheduledAt, durationMins?, notes? }` |
| POST | `/applications/:id/debrief` | HM | Submit interview feedback. Body: `{ summary, recommendation, strengths[], concerns[] }` |
| POST | `/applications/:id/transcript` | HM | Upload interview transcript file |
| GET | `/applications/:id/dossier` | V | AI-generated candidate dossier (PDF URL or markdown) |
| POST | `/applications/:id/retry-outreach` | HM | Re-queue outreach for this application |
| POST | `/applications/bulk-reject` | HM | Body: `{ ids: string[], reason? }` |
| POST | `/applications/bulk-approve` | HM | Body: `{ ids: string[] }` |

---

## Candidates — `/candidates`

Read-only view of candidate database (candidates are global, not company-scoped).

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/candidates` | V | Search candidates. Query: `?search=john&sortBy=score|recent&page=1` |
| GET | `/candidates/:id` | V | Full candidate profile |
| GET | `/candidates/:id/outreach-history` | V | All outreach attempts for this candidate |
| POST | `/candidates/:id/resume` | HM | Upload candidate resume file (PDF/DOCX, 10MB max) |

---

## Screenings — `/screenings`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/applications/:applicationId/screenings` | V | List screenings for application |
| POST | `/applications/:applicationId/screenings` | HM | Start AI screening interview |
| GET | `/screenings/:id` | V | Screening detail with transcript and assessment |
| POST | `/screenings/:id/escalate` | HM | Mark as escalated (needs human review) |

---

## Conversations — `/conversations`

Recruiter-candidate messaging.

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/conversations` | V | List. Query: `?applicationId=uuid` |
| GET | `/conversations/:id` | V | Conversation with messages |
| POST | `/conversations/:id/messages` | HM | Send recruiter message. Body: `{ content, channel?: 'telegram'|'email' }` |

---

## Placements — `/placements`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/placements` | V | List placements. Query: `?status=active` |
| GET | `/placements/:id` | V | Placement detail |
| POST | `/placements/:id/separation` | HM | Record candidate departure. Body: `{ separationDate, reason }` |

---

## Invoices — `/invoices`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/invoices` | V | List. Query: `?status=overdue|issued|paid` |
| GET | `/invoices/:id` | V | Invoice detail with payment info |
| POST | `/invoices/:id/pay` | A | Get Payme payment link |
| PATCH | `/invoices/:id/paid` | A | Mark manually paid (for bank transfer) |

---

## Companies — `/companies`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/companies/me` | V | Company profile |
| PATCH | `/companies/me` | A | Update company info. Body: `{ name?, legalName?, website?, ... }` |
| GET | `/companies/me/users` | V | List team members with roles |
| POST | `/companies/me/users` | A | Invite team member. Body: `{ email, fullName, role }` → sends invitation email |
| DELETE | `/companies/me/users/:id` | A | Remove team member |

---

## Events — SSE

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events` | SSE stream. Returns `text/event-stream`. Reconnects automatically |

Event types pushed:
```
new_match          — new candidate matched to a job
outreach_sent      — outreach delivery confirmed
screening_complete — candidate finished screening
dossier_ready      — AI dossier generated
new_message        — candidate replied in conversation
```

Event format:
```
data: {"type":"new_match","applicationId":"uuid","candidateName":"John","jobTitle":"Backend Dev","score":87}
```
