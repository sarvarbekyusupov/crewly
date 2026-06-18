# Telegram Mini App (TMA)

Web app that opens inside Telegram. Zero install, mobile-optimized, touch-first.

Frontend: `/tma` routes  
Backend: `backend/src/modules/tma/`  
Layout: `frontend/app/layouts/tma.vue` (bare — no sidebar, no header)

---

## How It Works

1. Bot sends message with "Open App" button pointing to `https://crewly.uz/tma`
2. Telegram opens an in-app webview (not a browser)
3. `window.Telegram.WebApp` SDK is injected into the page
4. `window.Telegram.WebApp.initData` contains a signed proof of user identity
5. Frontend sends `initData` to backend → backend validates HMAC → returns JWT
6. All subsequent calls use this JWT in `Authorization: Bearer` header

---

## Auth Flow (Detailed)

```
Frontend:
  useTma().init()
  → window.Telegram.WebApp.ready()
  → window.Telegram.WebApp.expand()
  → initData = window.Telegram.WebApp.initData

POST /api/v1/tma/auth { initData }

Backend validates:
  1. Parse query string from initData
  2. Extract: hash, user (id, first_name, username), auth_date
  3. Build data_check_string:
       - Remove hash from params
       - Sort params alphabetically by key
       - Join: "key=value\nkey=value\n..."
  4. Compute secret key:
       HMAC-SHA256(key="WebAppData", message=TELEGRAM_BOT_TOKEN)
  5. Compute expected hash:
       HMAC-SHA256(key=secret_key, message=data_check_string)
  6. Compare: if hash != expected_hash → 401

  7. Check auth_date > now - 3600 (1 hour)

  8. Role detection:
     → SELECT FROM users WHERE telegram_chat_id = user.id
     → Found: role = 'hr', profile = User
     → Not found: find or create Candidate WHERE telegram_user_id = user.id
     → role = 'candidate', profile = Candidate

  9. Sign JWT:
       { sub: id, role: 'hr'|'candidate', type: 'tma_access' }
       expiresIn: 7d (longer than web JWT — no refresh in TMA)

Response: { token, role, profile }
```

---

## Pinia Store (`frontend/app/stores/tma.ts`)

```typescript
state: {
  token: string | null
  role: 'candidate' | 'hr' | null
  profile: Candidate | User | null
}

actions:
  login(initData)   // calls /tma/auth, stores result
  logout()          // clear state

computed:
  isAuthenticated   // token != null
  isHR             // role === 'hr'
  isCandidate      // role === 'candidate'
```

---

## Pages

| Route | Role | Description |
|-------|------|-------------|
| `/tma` | Any | Entry: init Telegram SDK → auth → redirect by role |
| `/tma/candidate` | Candidate | Job feed — top scored matches |
| `/tma/candidate/applications` | Candidate | Application history with statuses |
| `/tma/candidate/job/[id]` | Candidate | Job detail: description, match score, strengths/gaps, apply button |
| `/tma/hr` | HR | Active pipeline: candidates by status |
| `/tma/hr/candidate/[id]` | HR | Full candidate profile for review + approve/reject |

---

## API Endpoints

All protected by `TmaAuthGuard`. Role enforced per endpoint.

### POST `/api/v1/tma/auth`

Public. Body: `{ initData: string }`.  
Response:
```json
{
  "token": "eyJ...",
  "role": "candidate",
  "profile": {
    "id": "uuid",
    "fullName": "Sarvar Yusupov",
    "currentPosition": "Backend Engineer",
    "skills": ["NestJS", "PostgreSQL"]
  }
}
```

### Candidate Endpoints

#### GET `/api/v1/tma/candidate/feed`
Top matched jobs (score ≥ 50), up to 20.
```json
[
  {
    "matchId": "uuid",
    "score": 87,
    "applied": false,
    "job": {
      "id": "uuid",
      "title": "Senior Backend Engineer",
      "company": "TechCorp Tashkent",
      "salaryMinUzs": "15000000",
      "skills": ["NestJS", "PostgreSQL", "Redis"],
      "sourceUrl": "https://hh.uz/vacancy/12345"
    }
  }
]
```

#### GET `/api/v1/tma/candidate/applications`
```json
[
  {
    "id": "uuid",
    "status": "submitted",
    "source": "telegram",
    "appliedAt": "2026-06-18T...",
    "job": { "title": "...", "company": "..." }
  }
]
```

#### GET `/api/v1/tma/candidate/jobs/:id`
```json
{
  "id": "uuid",
  "title": "Senior Backend Engineer",
  "company": "TechCorp",
  "description": "We are looking for...",
  "skills": ["NestJS"],
  "salaryMinUzs": "15000000",
  "match": {
    "score": 87,
    "strengths": ["5 years NestJS experience", "PostgreSQL expert"],
    "gaps": ["No React mentioned"]
  },
  "application": null
}
```

#### POST `/api/v1/tma/candidate/jobs/:id/apply`
One-tap apply. Enqueues `auto-apply` worker.
```json
{ "id": "uuid", "status": "pending", "alreadyApplied": false }
```

### HR Endpoints

#### GET `/api/v1/tma/hr/pipeline`
Up to 50 active applications.
```json
[
  {
    "id": "uuid",
    "status": "screening",
    "matchScore": 82,
    "job": { "title": "Frontend Dev", "id": "uuid" },
    "candidate": {
      "fullName": "Timur Rakhimov",
      "currentPosition": "React Developer",
      "skills": ["React", "TypeScript"]
    }
  }
]
```

#### POST `/api/v1/tma/hr/applications/:id/approve`
Queues outreach. Returns `{ queued: true }`.

#### POST `/api/v1/tma/hr/applications/:id/reject`
Optional body: `{ reason: "Not enough experience" }`. Returns `{ rejected: true }`.

#### GET `/api/v1/tma/hr/applications/:id/candidate`
Full candidate profile for evaluation.
```json
{
  "applicationId": "uuid",
  "status": "screening",
  "matchScore": 82,
  "matchReasons": { "strengths": [], "gaps": [] },
  "job": { ... },
  "screening": {
    "status": "completed",
    "aiAssessment": {
      "technical_score": 8,
      "overall_score": 7.5,
      "recommendation": "advance",
      "summary": "Strong backend, limited frontend"
    }
  },
  "candidate": {
    "fullName": "...",
    "skills": [...],
    "yearsExperience": 5,
    "expectedSalaryUzs": "15000000",
    "resumeFileUrl": "https://s3..."
  }
}
```

---

## Telegram WebApp SDK Usage

```typescript
// useTma.ts composable
const tma = window.Telegram?.WebApp

// Signal ready (hides loading indicator)
tma.ready()

// Expand to full screen
tma.expand()

// Dark/light mode
const isDark = tma.colorScheme === 'dark'

// Primary button (bottom of screen)
tma.MainButton.setText('Apply Now')
tma.MainButton.show()
tma.MainButton.onClick(() => { ... })

// Back button (top left)
tma.BackButton.show()
tma.BackButton.onClick(() => router.back())

// Close mini app
tma.close()

// Haptic feedback
tma.HapticFeedback.impactOccurred('medium')
```

---

## Development Without Telegram

TMA requires Telegram's webview to inject `window.Telegram.WebApp`. Without it:

1. `useTma().isTma` returns `false`
2. App can show a "Open in Telegram" button
3. For dev: manually set a mock `initData` in browser console

For real TMA testing, use ngrok tunnel + set the Mini App URL in BotFather to your ngrok address.
