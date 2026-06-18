# Authentication Flows

Three completely separate auth systems. Different cookies, different JWT secrets, different guards.

---

## 1. HR Staff Auth (JWT Cookies)

Used by: hiring managers, recruiters, company admins, company owners.

### Registration & Email Verification

```
POST /api/v1/auth/signup
  Body: { email, password, fullName, companyName }

  → validate with Zod
  → check email not already taken
  → argon2.hash(password)
  → create Company record
  → create User record { role: 'owner', emailVerifiedAt: null }
  → send verification email via Resend
  → return 201 { message: "Check your email" }

GET /api/v1/auth/verify-email?token=<token>
  → find AuthToken { type: 'email_verification', usedAt: null, expiresAt > now }
  → set User.emailVerifiedAt = now
  → delete AuthToken
  → redirect to /employer/dashboard
```

### Login

```
POST /api/v1/auth/login
  Body: { email, password }
  Throttle: 5 req/min per IP

  → find User by email
  → check User.emailVerifiedAt is not null (throw 403 if not verified)
  → argon2.verify(storedHash, password)
  → sign JWT access token:
      payload: { sub: userId, companyId, role, type: 'hr_access' }
      secret: JWT_ACCESS_SECRET
      expiresIn: JWT_ACCESS_TTL_SECONDS (default 900s / 15 min)
  → sign JWT refresh token:
      payload: { sub: userId, type: 'hr_refresh' }
      secret: JWT_REFRESH_SECRET
      expiresIn: '30d'
  → Set-Cookie: hr_access_token=<jwt>; HttpOnly; Secure; SameSite=Strict
  → Set-Cookie: hr_refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
  → return 200 { user: { id, email, fullName, role, company: {...} } }
```

### Token Refresh

```
POST /api/v1/auth/refresh
  (reads hr_refresh_token cookie automatically)

  → verify refresh token with JWT_REFRESH_SECRET
  → check type === 'hr_refresh'
  → load fresh user from DB
  → sign new access token
  → Set-Cookie: hr_access_token=<new-jwt>
  → return 200 { ok: true }
```

Frontend `useApi()` composable calls refresh automatically on 401 response, then retries original request.

### Guard: AuthGuard

```typescript
// Reads hr_access_token cookie
// Verifies JWT with JWT_ACCESS_SECRET
// Checks type === 'hr_access'
// Attaches to req.user: { userId, companyId, role }
// On failure: 401 Unauthorized
```

### Role Guard: CompanyRoleGuard

```typescript
// Used with @RequireRole('hiring_manager') decorator
// Role numeric values:
const ROLES = { owner: 4, admin: 3, hiring_manager: 2, viewer: 1 }
// req.user.role >= required → pass
// Otherwise: 403 Forbidden
```

---

## 2. Candidate Auth (JWT Cookies + OAuth)

Used by: job seekers accessing the web candidate portal.

### Email/Password

```
POST /api/v1/candidate-auth/signup
  Body: { email, password, fullName }
  Throttle: 5 req/min

  → check email not taken
  → create Candidate { emailVerifiedAt: null }
  → send verification email
  → return 201

POST /api/v1/candidate-auth/login
  → argon2.verify
  → check emailVerifiedAt not null
  → sign JWT: { sub: candidateId, type: 'candidate_access', secret: JWT_CANDIDATE_SECRET }
  → Set-Cookie: c_access_token; c_refresh_token
```

### Google OAuth

```
GET /api/v1/candidate-auth/google
  → redirect to Google OAuth consent screen
  → scopes: email, profile

GET /api/v1/candidate-auth/google/callback?code=<code>&state=<state>
  → exchange code for Google tokens
  → get Google profile (email, name, picture)
  → find or create Candidate by email
  → set Candidate.googleId, Candidate.emailVerifiedAt = now (Google already verified)
  → sign JWT
  → Set-Cookie: c_access_token; c_refresh_token
  → redirect to /candidate/dashboard
```

### Guard: CandidateAuthGuard

```typescript
// Reads c_access_token cookie
// Verifies with JWT_CANDIDATE_SECRET
// Checks type === 'candidate_access'
// Attaches req.candidate: { candidateId }
```

### HH.uz OAuth (within candidate session)

Once logged in, candidate can link their HH.uz account:

```
GET /api/v1/candidate-portal/hh/oauth-url
  → returns URL: https://hh.ru/oauth/authorize?client_id=HH_CLIENT_ID&...

HH.uz redirects to: PUBLIC_URL/api/v1/webhooks/hh/callback?code=<code>
  → exchange code for { access_token, refresh_token, expires_in }
  → update Candidate: { hhOauthToken, hhRefreshToken, hhTokenExpiresAt }
  → redirect to /candidate/profile
```

HH token auto-refreshed before each API call by `HhClientService.ensureValidToken()`.

---

## 3. Staff Admin Auth (Session DB)

Used by: internal Crewly admins.

No JWT — pure session tokens stored in database.

```
POST /api/v1/staff/login
  Body: { email, password }   (staff accounts created manually in DB)

  → find Staff by email
  → argon2.verify
  → generate random token (32 bytes hex)
  → hash token with argon2
  → insert StaffSession { staffId, tokenHash, expiresAt: +30d }
  → Set-Cookie: staff_session=<raw-token>; HttpOnly; Secure
  → return 200 { staff: { id, email, fullName } }

POST /api/v1/staff/logout
  → hash current token
  → find and delete StaffSession
  → clear cookie

POST /api/v1/staff/logout-all
  → delete all StaffSession rows for this staff member
  → clear cookie
```

### Guard: StaffGuard

```typescript
// Reads staff_session cookie (raw token)
// argon2.verify against StaffSession.tokenHash in DB
// Checks StaffSession.expiresAt > now
// Attaches req.staff: { staffId, email }
// On any failure: 401
```

Sessions stored in DB = can be revoked instantly. No JWT expiry race condition.

---

## 4. TMA Auth (Telegram Mini App)

One-time auth when TMA loads.

```
POST /api/v1/tma/auth
  Body: { initData: string }
  (initData = window.Telegram.WebApp.initData)

  → parse initData query string
  → extract: hash, user.id, auth_date
  → HMAC-SHA256 verify:
      data_check_string = sorted(key=value pairs, exclude hash) joined by \n
      secret_key = HMAC-SHA256("WebAppData", TELEGRAM_BOT_TOKEN)
      expected_hash = HMAC-SHA256(data_check_string, secret_key)
      if hash != expected_hash → 401
  → check auth_date not older than 1 hour
  → role detection:
      find User where telegramChatId = user.id → role: 'hr', profile: User
      else: find or create Candidate where telegramUserId = user.id → role: 'candidate'
  → sign JWT: { sub: id, role, type: 'tma_access', expiresIn: '7d' }
  → return { token, role, profile }
```

Frontend stores JWT in Pinia `tma` store. Attaches as `Authorization: Bearer <token>` header.

---

## Cookie Security Settings

All auth cookies set with:
```
HttpOnly   — JavaScript cannot read (prevents XSS token theft)
Secure     — HTTPS only
SameSite=Strict — not sent cross-site (CSRF protection)
```

Refresh token cookies additionally:
```
Path=/api/v1/auth/refresh  (HR)
Path=/api/v1/candidate-auth/refresh  (Candidate)
```
This restricts the refresh token to only being sent to the refresh endpoint, not every API call.

---

## Password Reset Flow

```
POST /api/v1/auth/forgot-password
  Throttle: 3/min
  → generate random token
  → store as AuthToken { type: 'password_reset', expiresAt: +1h }
  → send email with link: FRONTEND_URL/employer/reset-password?token=<token>

POST /api/v1/auth/reset-password
  Throttle: 5/min
  Body: { token, newPassword }
  → find AuthToken (unused, not expired)
  → argon2.hash(newPassword)
  → update User.passwordHash
  → mark AuthToken.usedAt = now
  → (optionally) invalidate all existing sessions
```

Same flow for `/candidate-auth/forgot-password` and `/candidate-auth/reset-password`.
