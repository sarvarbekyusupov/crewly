# Webhooks

All webhooks at `/api/v1/webhooks/`. All are **public** but signature-verified.  
Deduplication via `IdempotencyKey` table (TTL 24h).

---

## Telegram — `POST /webhooks/telegram`

Receives all Telegram updates (messages, callbacks, channel posts, document uploads).

**Verification:**
```
Header: X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>
```
NestJS verifies this header before processing. Returns 200 immediately to avoid Telegram retry.

**What it handles:**
- Private messages → command routing in `TelegramBotService`
- Inline button callbacks → `handleCallback()`
- Document uploads (PDF CVs) → CV processing
- Channel posts (if bot is admin) → `TelegramChannelMonitorService.processChannelPost()`

**Registration:**
Webhook auto-registered on app startup (`OnModuleInit`):
```
POST https://api.telegram.org/bot<TOKEN>/setWebhook
  { url: PUBLIC_URL/api/v1/webhooks/telegram, secret_token: TELEGRAM_WEBHOOK_SECRET }
```

---

## HH.uz — `POST /webhooks/hh`

Receives HH.uz employment agreement updates.

**Verification:**
```
Header: Authorization: Bearer <HH_WEBHOOK_SECRET>
```

**Payload example:**
```json
{
  "id": "123456789",
  "type": "EMPLOYMENT_AGREEMENT",
  "action": "STATUS_CHANGED",
  "object": {
    "id": "neg_id",
    "status": "invitation",
    "vacancy_id": "12345"
  }
}
```

**What it does:**
1. Verify Bearer token matches `HH_WEBHOOK_SECRET`
2. Check idempotency key (event ID)
3. Find `SeekerApplication` by `hhNegotiationId`
4. Map HH status → internal status:
   - `response` → `viewed`
   - `invitation` → interview scheduled
   - `discard` → `rejected`
5. Update `SeekerApplication.status`
6. Emit SSE event to candidate portal

---

## Resend (Email) — `POST /webhooks/resend`

Receives email delivery events from Resend.

**Verification:** Svix signature in headers:
```
svix-id, svix-timestamp, svix-signature
```
Verified against `RESEND_WEBHOOK_SECRET`.

**Events handled:**

| Resend Event | Action |
|-------------|--------|
| `email.delivered` | Update `OutreachAttempt.status = delivered` |
| `email.opened` | Update `OutreachAttempt.openedAt = timestamp` |
| `email.bounced` | Update `OutreachAttempt.status = failed`, log error |
| `email.complained` | Mark candidate `doNotContact = true` |
| `email.link.clicked` | Log click event |

---

## Payme — `POST /webhooks/payme`

Handles Payme payment gateway JSON-RPC 2.0 calls.

**Verification:** HTTP Basic auth:
```
Username: PAYME_MERCHANT_ID
Password: PAYME_MERCHANT_KEY
```

**Methods:**

| Method | Description |
|--------|-------------|
| `CheckPerformTransaction` | Validate invoice exists and amount matches |
| `CreateTransaction` | Create `PaymeTransaction` record, set `state = 1` |
| `PerformTransaction` | Mark invoice paid, `PaymeTransaction.state = 2`, `Invoice.status = paid` |
| `CancelTransaction` | Cancel transaction, reason code stored |
| `CheckTransaction` | Return current transaction state |
| `GetStatement` | Return transaction list for period |

**Error codes returned on failure:**
- `-31050` — order not found
- `-31051` — amount mismatch
- `-31099` — internal error

---

## Generic Payment — `POST /webhooks/payment`

Alternative payment webhook (non-Payme gateways).

**Verification:** HMAC-SHA256 signature:
```
Header: X-Webhook-Signature: <hmac>
Secret: PAYMENT_WEBHOOK_SECRET
```

---

## LinkedIn OAuth — `POST /webhooks/linkedin/exchange`

Receives LinkedIn OAuth callback after candidate authorizes.

**Verification:** State parameter matches expected value stored in session.

**Flow:**
1. LinkedIn redirects candidate to `/auth/linkedin/callback` (frontend page)
2. Frontend extracts `code` + `state` from URL
3. Frontend calls `POST /webhooks/linkedin/exchange` with `{ code, state }`
4. Backend exchanges code for `access_token`
5. Stores `Candidate.linkedinOauthToken`
6. Returns `{ success: true }`

---

## Security Notes

**Never log raw webhook payloads** — they may contain PII (candidate data, payment amounts).

**Idempotency:** All webhooks check `IdempotencyKey` before processing:
```typescript
const key = `${source}:${eventId}`
if (await idempotencyService.exists(key)) {
  return cachedResponse
}
// process...
await idempotencyService.set(key, response, 86400) // 24h TTL
```

**Timing attacks:** Signature comparisons use constant-time comparison (`crypto.timingSafeEqual`), not `===`.

**Retry handling:** All external services (Telegram, Resend, HH.uz) retry on non-200 responses. The idempotency check prevents double processing.
