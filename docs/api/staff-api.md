# Staff Admin API

Internal Crewly admin endpoints. All require `StaffGuard` (cookie: `staff_session`) unless noted.

---

## Auth — `/staff`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/staff/login` | Public | Body: `{ email, password }`. Sets `staff_session` cookie (30d) |
| GET | `/staff/me` | StaffGuard | Current staff profile |
| POST | `/staff/refresh` | StaffGuard | Rotate session |
| POST | `/staff/logout` | StaffGuard | Clear cookie + delete session |
| POST | `/staff/logout-all` | StaffGuard | Delete all sessions for this staff member |

---

## Dashboard — `/staff`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/dashboard` | Platform KPIs: `{ totalCompanies, activeCompanies, totalCandidates, totalApplications, totalRevenue, pendingInvoices, recentSignups: [...] }` |

---

## Companies — `/staff/companies`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/companies` | All companies (paginated). Query: `?status=active&search=corp&page=1` |
| GET | `/staff/companies/:id` | Company detail with users, jobs, recent activity |
| PATCH | `/staff/companies/:id` | Update company (status, pricing tier, fee %) |

---

## Candidates — `/staff/candidates`

Global candidate list (not company-scoped).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/candidates` | All candidates. Query: `?dnc=true` for Do Not Contact list |
| GET | `/staff/candidates/:id` | Full candidate profile |
| POST | `/staff/candidates/:id/dnc` | Mark as Do Not Contact. Body: `{ reason }` → sets `Candidate.doNotContact = true` |

---

## Candidate Ingestion — `/staff/ingestion-runs`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/staff/ingestion-runs` | Trigger ingestion. Body: `{ source: 'hh.ru'|'linkedin', specialization?: '1.221', maxPages?: 5 }` |
| GET | `/staff/ingestion-runs` | List runs. Query: `?source=hh.ru&page=1` |
| GET | `/staff/ingestion-runs/:id` | Run detail: status, candidatesFetched, candidatesNew, errors |

Triggers `ingest-candidates` BullMQ job → `parse-candidate` → `embed-candidate` chain.

---

## Job Discovery Runs — `/staff/job-discovery-runs`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/staff/job-discovery-runs` | Trigger job discovery. Body: `{ source: 'hh.ru', location: '2759', maxPages?: 5 }` |
| GET | `/staff/job-discovery-runs` | List runs |
| GET | `/staff/job-discovery-runs/:id` | Run detail: jobsFetched, jobsNew, jobsUpdated |

---

## Invoices — `/staff/invoices`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/invoices` | All invoices across all companies. Query: `?status=overdue&companyId=uuid` |
| GET | `/staff/invoices/:id` | Invoice detail |

---

## LLM Costs — `/staff` + `/llm-calls`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/llm-costs` | Cost summary by company, model, date range |
| GET | `/llm-calls` | All LLM calls (paginated). Query: `?purpose=parse_resume&model=claude&companyId=uuid&from=2026-01-01&to=2026-12-31` |
| GET | `/llm-calls/summary` | Aggregated: total calls, total tokens, total cost USD by period |
| GET | `/llm-calls/:id` | Single call detail with full prompt + response |

LlmCall fields:
```json
{
  "id": "uuid",
  "purpose": "parse_resume",
  "agentName": "MatchmakerAgent",
  "model": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "promptTokens": 2048,
  "completionTokens": 512,
  "costUsd": "0.0031",
  "latencyMs": 1240,
  "error": null,
  "createdAt": "2026-06-18T..."
}
```

---

## Consent — `/staff/consent`

GDPR consent records.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/consent` | All consent records. Query: `?candidateId=uuid&action=opt_in` |

ConsentRecord fields:
```json
{
  "candidateId": "uuid",
  "action": "opt_in",
  "basis": "telegram_cv",
  "ipAddress": "...",
  "recordedAt": "2026-06-18T..."
}
```

---

## Audit Log — `/staff/audit`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/audit` | All mutations. Query: `?actorType=user&resourceType=Application&page=1` |

---

## Sourcing — `/sourcing`

Requires `StaffOrAdminGuard` (staff OR company admin).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sourcing/linkedin` | Search LinkedIn. Query: `?q=backend+engineer+tashkent` |
| POST | `/sourcing/linkedin/ingest` | Ingest LinkedIn profile. Body: `{ profileUrl }` → enqueues `ingest-candidates` |

---

## Events — SSE

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/events` | Staff SSE stream for real-time platform activity |

---

## Feature Flags — `/feature-flags`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feature-flags/:name` | Public | Get flag value + rollout %. Returns `{ enabled: bool, rollout: 0-100 }` |
| POST | `/feature-flags` | StaffGuard | Create flag. Body: `{ name, enabled, rolloutPercentage }` |
| PATCH | `/feature-flags/:name` | StaffGuard | Update flag |
| DELETE | `/feature-flags/:name` | StaffGuard | Delete flag |

---

## Waitlist — `/waitlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/waitlist` | Public | List waitlist entries |
| POST | `/waitlist` | Public | Join waitlist. Body: `{ email, role: 'employer'|'candidate' }` |
| POST | `/waitlist/:id/notify` | Public | Notify waitlist entry (send invite email) |
