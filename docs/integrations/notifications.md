# Notifications

Three channels: email (Resend), SMS (Eskiz), Telegram bot push.

---

## Email — Resend

**Service:** `backend/src/integrations/email/email.service.ts`  
**Provider:** [Resend](https://resend.com)  
**API Key:** `RESEND_API_KEY`  
**From:** `FROM_EMAIL` (default: `noreply@crewly.uz`)

### What Triggers Emails

| Trigger | Recipient | Template |
|---------|-----------|---------|
| HR signup | HR user | Email verification link |
| HR forgot password | HR user | Password reset link |
| Candidate signup | Candidate | Email verification link |
| Candidate forgot password | Candidate | Password reset link |
| Job outreach campaign | Candidate | Personalized outreach (LLM-generated) |
| Invoice issued | Company admin | Invoice with payment link |
| Invoice reminder (3 days before due) | Company admin | Payment reminder |
| Guarantee period expiry | Company admin | Expiry notification |

### Sending Email

```typescript
await emailService.send({
  to: 'candidate@example.com',
  subject: 'Your Crewly job matches are ready',
  html: renderTemplate('matches', { candidateName, jobCount }),
  // OR
  text: 'Plain text fallback',
  replyTo: 'hr@company.com',
})
```

Returns Resend `emailId` — stored in `OutreachAttempt.resendEmailId` for tracking.

### Open/Click Tracking

Resend sends events to `POST /webhooks/resend`:

```
email.delivered → OutreachAttempt.status = 'sent'
email.opened    → OutreachAttempt.openedAt = timestamp
email.bounced   → OutreachAttempt.status = 'failed'
email.complained → Candidate.doNotContact = true (spam complaint)
```

Webhook verified via Svix signature headers using `RESEND_WEBHOOK_SECRET`.

---

## SMS — Eskiz

**Service:** `backend/src/integrations/sms/eskiz.service.ts`  
**Provider:** [Eskiz.uz](https://eskiz.uz) — Uzbek SMS gateway  
**Auth:** Email + password → bearer token (auto-refreshed)

```env
ESKIZ_EMAIL=your@email.com
ESKIZ_PASSWORD=password
ESKIZ_FROM=4546       # registered sender name/number
```

### Sending SMS

```typescript
await eskizService.send({
  to: '+998901234567',
  message: 'Crewly: New job match! Backend Dev at TechCorp. Reply STOP to unsubscribe.',
})
```

Max 160 chars per message. Unicode SMS (uz/ru) = 70 chars per segment.

### Token Management

```typescript
// EskizService auto-manages token:
POST https://notify.eskiz.uz/api/auth/login
  { email, password }
→ { token }

// Stored in service. Refresh on 401:
POST https://notify.eskiz.uz/api/auth/refresh
  Authorization: Bearer <old-token>
```

### Use Cases
- Outreach SMS for candidates without Telegram
- OTP codes (future feature)
- Interview reminders

---

## Telegram Push Notifications

Sent directly from `TelegramBotService`.

### New Job Match Notification

Triggered by `scoring_complete` event after `ScoreSeekerJobsProcessor` runs:

```typescript
// notifyNewMatches(candidateId)
const matches = await getTopMatches(candidateId, 3)
for (const match of matches) {
  await bot.api.sendMessage(candidate.telegramChatId, formatMatchMessage(match), {
    reply_markup: new InlineKeyboard()
      .text('Apply', JSON.stringify({ a: 'tg_apply', matchId: match.id }))
      .text('Details', JSON.stringify({ a: 'sel_job', jobId: match.job.id }))
  })
}
```

Only sent if `Candidate.minMatchScore != null` (subscribed).

### Notification Message Format

```
🎯 New job match: 87% fit

Backend Developer — TechCorp Tashkent
💰 15,000,000 – 25,000,000 UZS/month
🛠 NestJS · PostgreSQL · Redis

Your fit:
✅ 5 years NestJS (required 3+)
✅ PostgreSQL expert
⚠️ No Kubernetes (nice-to-have)

[Apply Now]  [View Details]
```

### Application Status Update

When `sync-hh-status` detects a status change, Telegram message sent to candidate:

```
✅ Update on your application at TechCorp:
   Backend Developer position

   Status: Interview Invitation

   HH.uz employer sent you a message.
   [View in HH.uz]
```

### Screening Message

`AdvanceScreeningProcessor` sends questions through Telegram:
```
Hi! I'm your AI interviewer for the Backend Developer role at TechCorp.

Question 1/6: Can you walk me through your most complex backend project? 
What was the architecture and what problems did you solve?
```

---

## Notification Priority Order

When system needs to notify a candidate:

1. **Telegram** (if `telegramChatId` set) — real-time, highest engagement
2. **Email** (if `email` set) — reliable, works without Telegram
3. **SMS** (if `phone` set) — fallback for urgent messages

Outreach campaigns can target a specific channel per job via `channel` param.
