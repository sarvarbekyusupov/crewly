# Candidate Portal API

All endpoints require `CandidateAuthGuard` (cookie: `c_access_token`) unless noted.

---

## Profile — `/candidate-portal/profile`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/profile` | Full candidate profile with all sections |
| PATCH | `/candidate-portal/profile` | Update profile fields. Body: partial `Candidate` fields |

Profile fields:
```json
{
  "fullName": "string",
  "currentPosition": "string",
  "currentCompany": "string",
  "yearsExperience": 5,
  "skills": ["TypeScript", "NestJS"],
  "city": "Tashkent",
  "phone": "+998901234567",
  "linkedinUrl": "https://linkedin.com/in/...",
  "githubUrl": "https://github.com/...",
  "willingToRelocate": false,
  "preferredWorkMode": "hybrid",
  "expectedSalaryUzs": "15000000"
}
```

---

## CV — `/candidate-portal/cv`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/candidate-portal/cv` | Upload CV file (PDF/DOCX, max 10MB). Stores in S3, sets `Candidate.resumeFileUrl` |
| POST | `/candidate-portal/cv/parse` | Trigger AI CV parsing. Enqueues `parse-candidate` worker. Returns `{ queued: true }` |

After parsing completes, `SSE event: resume_parsed` fires → frontend refreshes profile.

---

## Job Preferences — `/candidate-portal/preferences`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/preferences` | Get current preferences |
| PATCH | `/candidate-portal/preferences` | Update preferences |

Preference fields:
```json
{
  "preferredWorkMode": "remote|hybrid|onsite",
  "preferredLocations": ["Tashkent"],
  "expectedSalaryUzs": "15000000",
  "openToRelocation": false,
  "desiredJobTitles": ["Senior Backend Engineer"],
  "minMatchScore": 65,
  "notificationsEnabled": true
}
```

`minMatchScore` controls Telegram push notification threshold. Set to `null` to disable notifications.

---

## Applications (Employer-Side) — `/candidate-portal/applications`

Applications where an HR company reached out to the candidate.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/applications` | List all inbound applications with statuses |
| GET | `/candidate-portal/applications/:id` | Application detail with job info |
| GET | `/candidate-portal/applications/:id/messages` | Conversation messages |
| POST | `/candidate-portal/applications/:id/messages` | Reply to recruiter message |

---

## Discovered Jobs — `/candidate-portal/discovered-jobs`

Jobs found from HH.uz and Telegram channels, scored for this candidate.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/discovered-jobs` | Scored job feed. Query: `?minScore=50&sortBy=score|date&page=1` |
| POST | `/candidate-portal/discovered-jobs/score` | Trigger scoring for unscored jobs. Enqueues `score-seeker-jobs`. Returns `{ queued: true }` |
| POST | `/candidate-portal/discovered-jobs/discover` | Trigger immediate job discovery. Enqueues `discover-jobs`. Returns `{ queued: true }` |

Response per job:
```json
{
  "matchId": "uuid",
  "score": 87,
  "strengths": ["5 years NestJS", "PostgreSQL experience"],
  "gaps": ["No React mentioned"],
  "job": {
    "id": "uuid",
    "title": "Senior Backend Engineer",
    "company": "TechCorp",
    "description": "...",
    "salaryMinUzs": "15000000",
    "salaryMaxUzs": "25000000",
    "skills": ["NestJS", "PostgreSQL"],
    "sourceUrl": "https://hh.uz/vacancy/..."
  }
}
```

---

## Seeker Applications — `/candidate-portal/seeker-applications`

Applications initiated by the candidate (via auto-apply).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/seeker-applications` | List all self-initiated applications |
| POST | `/candidate-portal/seeker-applications` | Apply to a discovered job. Body: `{ discoveredJobId }`. Enqueues `auto-apply` |
| PATCH | `/candidate-portal/seeker-applications/:id/status` | Update status. Body: `{ status }` |

**Statuses:**

- `queued` → `applied` (LinkedIn / Telegram alert)
- `queued` → `assisted_required` → `assisted_ready` (HH.uz / Telegram channel jobs)
- `assisted_ready` → `self_reported_applied` → `self_reported_reply` (candidate self-reports)
- Any → `skipped` (agent decided not to apply) or `failed` (error)

**`assisted_ready` response shape (extra fields):**

```json
{
  "id": "...",
  "status": "assisted_ready",
  "applyMethod": "assisted",
  "applyUrl": "https://hh.uz/vacancy/12345",
  "applyKit": {
    "coverLetter": "...",
    "tailoredCvText": "...",
    "applyUrl": "https://hh.uz/vacancy/12345",
    "instructions": "1. Tap Open. 2. Click Respond. 3. Paste cover letter. 4. Submit."
  }
}
```

---

## Analytics — `/candidate-portal/analytics`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/analytics` | `{ totalApplications, profileViews, matchRate, applicationsByStatus, recentActivity }` |

---

## SSE Events — `/candidate-portal/events`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/events` | SSE stream for real-time updates |

Event types:
```
scoring_complete    — jobs have been scored, feed updated
resume_parsed       — CV parsing done, profile updated
new_message         — recruiter sent message
application_status  — application status changed
new_matches         — push notification trigger (top 3 matches)
```

---

## HH.uz Integration — `/candidate-portal/hh`

> **Note:** HH.uz applicant API (resume CRUD, negotiations, apply) is permanently closed. Only account linking (identity), vacancy search, and autocomplete remain.

### Account Linking

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/hh/oauth-url` | Get HH.uz OAuth URL to start linking |
| GET | `/candidate-portal/hh/me` | HH.uz identity info (`auth_type`, name) |
| POST | `/candidate-portal/hh/disconnect` | Revoke token. Clears `hhOauthToken` from Candidate |

### Job Search (Public API — no token required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/hh/vacancies` | Search HH.uz jobs. Query: `?text=backend&area=2759` |
| GET | `/candidate-portal/hh/vacancies/:id` | Job detail |

### Autocomplete Suggests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/hh/suggests/areas` | Area/city autocomplete |
| GET | `/candidate-portal/hh/suggests/skills` | Skill tag suggestions |
| GET | `/candidate-portal/hh/suggests/universities` | University name suggestions |
| GET | `/candidate-portal/hh/suggests/positions` | Job title suggestions |

---

## LinkedIn Integration — `/candidate-portal/linkedin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/candidate-portal/linkedin/oauth-url` | Get LinkedIn OAuth URL |
| POST | `/candidate-portal/linkedin/disconnect` | Revoke LinkedIn token |
| POST | `/candidate-portal/linkedin/sync` | Sync LinkedIn profile → Crewly (skills, experience, education) |
