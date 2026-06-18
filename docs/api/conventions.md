# API Conventions

Base URL: `PUBLIC_URL/api/v1`  
Format: JSON. Content-Type: `application/json`.

---

## Authentication

Three separate cookie-based auth systems. Cookies set automatically on login — no manual header management needed.

| Cookie | Auth Guard | Used By |
|--------|-----------|---------|
| `hr_access_token` | `AuthGuard` | HR portal endpoints |
| `c_access_token` | `CandidateAuthGuard` | Candidate portal endpoints |
| `staff_session` | `StaffGuard` | Staff admin endpoints |

TMA endpoints use `Authorization: Bearer <tma_jwt>` header instead of cookies.

### Cookie properties

```
HttpOnly   — not accessible via JavaScript
Secure     — HTTPS only
SameSite=Strict
```

Refresh tokens have restricted `Path` (only sent to refresh endpoint).

---

## Rate Limiting

Default: unlimited (no throttle).

Throttled endpoints use per-IP limits:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/signup` | 5 req/min |
| `POST /auth/login` | 5 req/min |
| `POST /auth/forgot-password` | 3 req/min |
| `POST /auth/resend-verification` | 3 req/min |
| `POST /auth/reset-password` | 5 req/min |
| `GET /auth/verify-email` | 10 req/min |
| `POST /candidate-auth/signup` | 5 req/min |
| `POST /candidate-auth/login` | 5 req/min |

nginx additionally rate-limits all `/api/` traffic to **30 req/min per IP** with burst of 20.

---

## Pagination

All `GET` list endpoints support:

| Query Param | Type | Default | Max |
|-------------|------|---------|-----|
| `page` | number | 1 | — |
| `limit` | number | 20 | 100 |

Response envelope:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "totalPages": 8
  }
}
```

---

## Filtering & Sorting

Common query params across list endpoints:

| Param | Example | Notes |
|-------|---------|-------|
| `search` | `?search=john` | Full-text or name search |
| `status` | `?status=active` | Filter by status enum |
| `sortBy` | `?sortBy=score` | Sort field |
| `order` | `?order=desc` | `asc` or `desc` |
| `jobId` | `?jobId=uuid` | Filter by related job |

---

## Error Format

All errors return consistent JSON:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

Common status codes:

| Code | Meaning | When |
|------|---------|------|
| 400 | Bad Request | Validation failed (Zod) |
| 401 | Unauthorized | No/invalid/expired token |
| 403 | Forbidden | Authenticated but insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (e.g. email already taken) |
| 422 | Unprocessable Entity | Valid format but business logic violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected error (logged to Sentry) |

---

## File Uploads

Endpoints accepting file uploads use `multipart/form-data`:

| Endpoint | Field | Allowed Types | Max Size |
|----------|-------|---------------|---------|
| `POST /candidates/:id/resume` | `resume` | PDF, DOCX | 10 MB |
| `POST /candidate-portal/cv` | `cv` | PDF, DOCX | 10 MB |
| `POST /applications/:id/transcript` | `transcript` | PDF, TXT | 10 MB |

nginx client max body: **25 MB**.

---

## BigInt Serialization

PostgreSQL `BigInt` fields (salary values in UZS, Telegram channel IDs) are serialized as **strings** in JSON responses, not numbers. JavaScript cannot safely represent 64-bit integers.

```json
{
  "expectedSalaryUzs": "15000000",
  "channelId": "1234567890123456789"
}
```

Handled by `BigIntInterceptor` applied globally.

---

## Audit Logging

All `POST`, `PATCH`, `PUT`, `DELETE` mutations on protected endpoints are automatically logged to the `AuditLog` table by `AuditInterceptor`:

```json
{
  "actorType": "user",
  "actorId": "uuid",
  "action": "update",
  "resourceType": "Application",
  "resourceId": "uuid",
  "metadata": { "before": {...}, "after": {...} }
}
```

Staff can view audit logs at `GET /api/v1/staff/audit`.

---

## Idempotency (Webhooks)

All webhook endpoints (`/webhooks/*`) use `IdempotencyService` to prevent duplicate processing:

1. Hash the webhook event ID
2. Check `IdempotencyKey` table
3. If found → return cached response (200 OK) without processing
4. If not found → process → store key with TTL 24h

---

## Health Check

```
GET /health
→ 200 OK
→ { status: "ok", timestamp: "2026-06-18T..." }
```

No auth required. Used by Docker Compose healthcheck and CI/CD post-deploy verification.
