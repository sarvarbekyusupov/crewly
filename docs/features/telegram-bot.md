# Telegram Bot

Service: `backend/src/integrations/telegram/telegram-bot.service.ts`  
Library: grammY 1.43  
Bot token: `TELEGRAM_BOT_TOKEN` from `@BotFather`

---

## Modes

| Mode | Condition | How |
|------|-----------|-----|
| **Webhook** | `NODE_ENV=production` | grammY calls `setWebhook()` on startup. Telegram POSTs updates to `/webhooks/telegram` |
| **Polling** | `NODE_ENV=development` | `bot.start()` — long polling. Works without HTTPS |

> If server runs polling mode, messages split between server and any local dev machine also polling. CI/CD prevents this by injecting `NODE_ENV=production` on every deploy.

Webhook URL: `PUBLIC_URL/api/v1/webhooks/telegram`  
Verification: `X-Telegram-Bot-Api-Secret-Token: TELEGRAM_WEBHOOK_SECRET` header

---

## All Commands

### Candidate Commands

| Command | Description | Requires profile |
|---------|-------------|-----------------|
| `/start` | Welcome (uz/en/ru). Handles deep-link variants | No |
| `/help` | Lists all commands in detected language | No |
| `/setup` | 5-question text onboarding (no CV required) | No |
| `/mymatches` | Top 5 scored job matches with apply buttons | Yes |
| `/myapps` | All applications with status labels | Yes |
| `/subscribe` | Enable job push notifications (threshold: 65) | Yes |
| `/unsubscribe` | Disable job push notifications | Yes |
| `/rewrite` | AI rewrites CV summary for top matched job | Yes + matches |
| `/prep` | 5 interview Q&A for selected job | Yes + matches |
| `/feedback` | AI rejection analysis + improvement suggestions | Yes + apps |
| `/refer` | Get shareable referral link | Yes |

### Admin Commands

> Guarded by `ADMIN_TELEGRAM_CHAT_ID` env var. Caller's chatId must match.

| Command | Description |
|---------|-------------|
| `/stats` | Platform KPIs dashboard |
| `/addchannel <numeric_id>` | Register Telegram channel for job monitoring |

### HR Staff Commands (Linked Accounts)

Requires HR user to link Telegram via deep-link from web portal.

| Command | Description |
|---------|-------------|
| `/start link_<token>` | Link HR account to Telegram chatId |
| `/dashboard` or `/pipeline` | Jobs overview with candidate counts |
| `/app_<applicationId>` | Candidate card with approve/reject buttons |
| `/listchannels` | Manage monitored job channels |

---

## Deep-Link Variants

All via `t.me/<botname>?start=<payload>`:

| Payload | Source | What happens |
|---------|--------|-------------|
| `ref_<chatId>` | Referral link | Store referrer chatId, show welcome |
| `link_<token>` | HR web portal | Link HR User.telegramChatId, confirm linking |
| `job_<jobId>` | Shared job link | Show job details, prompt to apply/setup |

---

## Onboarding State Machine

State stored in `TelegramPendingJob` table (one row per chatId).

```
[User sends /start]
    │
    ├── payload = "ref_<chatId>" ──────────────────────────┐
    │                                                       │
    └── No payload → show welcome                          │
              │                                            │
              ▼                                            ▼
         [User sends /setup]                    state = "ref:<chatId>"
              │                                    then show welcome
              ▼
    ┌─────────────────────────────────────┐
    │ Detect existing state               │
    │                                     │
    │ Starts with "ref:"?                 │
    │   → state = "onboard:waiting|ref:<chatId>"
    │ Otherwise:                          │
    │   → state = "onboard:waiting"       │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    [Bot asks 5 questions in sequence]
    1. "What's your name and what role are you looking for?"
    2. "List your main skills (comma separated)"
    3. "How many years of experience do you have?"
    4. "What salary are you expecting? (in UZS per month)"
    5. "Which city are you in?"

    [User answers all 5 in one or multiple messages]
                      │
                      ▼
    [LLM parses all answers into:]
    {
      fullName, currentPosition,
      skills[], yearsExperience,
      expectedSalaryUzs, city
    }
                      │
                      ▼
    [Create/Update Candidate in DB]
    ├── Set consentSource:
    │   "telegram_cv" (if uploaded PDF)
    │   "telegram_setup" (if /setup flow)
    │   "telegram_referral:<referrerChatId>" (if ref in state)
    ├── Set lastActiveAt = now
    ├── Enqueue: parse-candidate worker
    └── Enqueue: discover-jobs { location: '2759', maxPages: 3 }
    state cleared (row deleted)
```

### State Value Reference

| Value | Meaning |
|-------|---------|
| `onboard:waiting` | Awaiting answers to 5 onboarding questions |
| `onboard:waiting\|ref:<chatId>` | Onboarding with referral source preserved |
| `ref:<chatId>` | Came via referral, not yet started onboarding |
| `discovered:<jobId>` | Selected this job for /prep or /rewrite |
| *(no row)* | Idle state |

---

## Push Notifications

### Trigger
`ScoreSeekerJobsProcessor` emits `scoring_complete` event after scoring.

### Handler
`handleCandidateEvent()` in `TelegramBotService`:

```
scoring_complete event received
    │
    ▼
Load Candidate by candidateId
    │
    ├── Candidate.minMatchScore === null → skip (not subscribed)
    │
    └── Load top 3 SeekerJobMatch where:
            score >= Candidate.minMatchScore
            ORDER BY score DESC
            LIMIT 3
              │
              ▼
        For each match, send Telegram message:
        "🎯 New job match: {score}% — {jobTitle} at {company}"
        [Apply] [View Details] inline buttons
```

### Subscribe/Unsubscribe

```
/subscribe  → Candidate.minMatchScore = 65
/unsubscribe → Candidate.minMatchScore = null
```

---

## Channel Monitoring

How Telegram job channels feed into `DiscoveredJob`:

```
1. Admin registers channel: /addchannel -1001234567890
   → Insert TelegramChannel { channelId: BigInt(-1001234567890), isActive: true }

2. Add bot as ADMIN to that Telegram channel
   (bot needs "Read messages" permission)

3. Channel posts a message:
   "@hrjobuz: Ищем Backend разработчика..."

4. grammY fires: channel_post:text event
   → TelegramChannelMonitorService.processChannelPost(ctx)

5. LLM extracts:
   { title, company, skills[], salary?, description }

6. Create DiscoveredJob:
   { source: 'telegram_channel', sourceUrl: unique_id, ... }

7. Enqueue score-seeker-jobs for subscribed candidates
```

Channels in Tashkent to add: `@hrjobuz`, `@itjobstashkent`, `@uzbekjobs`

---

## Referral Tracking

When user opens bot via referral link:
1. `ref_<referrerChatId>` stored in pending state
2. On onboarding complete: `Candidate.consentSource = "telegram_referral:<referrerChatId>"`
3. `/stats` counts: `SELECT COUNT(*) FROM Candidate WHERE consentSource LIKE 'telegram_referral:%'`

No reward system yet — tracking and attribution only.

---

## Return Rate Tracking

`touchCandidate(chatId)` called on every interaction:
```typescript
prisma.candidate.update({
  where: { telegramChatId: chatId },
  data: { lastActiveAt: new Date() }
})
```

Called by: all command handlers + document handler (fire-and-forget, doesn't block response).

`/stats` shows: candidates with `lastActiveAt > now - 7 days` / total candidates × 100.

---

## Inline Button Callbacks

All buttons encode JSON: `{ a: '<action>', ...extraData }`.

| Action | Extra data | Handler |
|--------|-----------|---------|
| `sel_job` | `{ jobId }` | Store jobId in pending state |
| `tg_apply` | `{ matchId }` | Enqueue auto-apply |
| `app_scr` | `{ appId }` | Start screening for HR |
| `rej_app` | `{ appId }` | Reject application (HR) |
| `dash` | — | Show HR dashboard |
| `v_new` | `{ page }` | View new candidates (paginated) |
| `v_scr` | `{ page }` | View screening candidates |
| `rm_ch` | `{ channelId }` | Deactivate channel |
| `act_ch` | `{ channelId }` | Activate channel |

---

## /stats Admin Output

```
📊 Crewly Stats

👥 Total candidates: 127
📈 Active (7d): 43 (33.9%)
🔔 Subscribed to alerts: 78
🤝 Via referral: 29 (22.8%)
📡 Monitored channels: 3
💼 Active jobs: 12
```

---

## Setup Checklist

1. Create bot → `@BotFather` → `/newbot` → copy token
2. Set commands in BotFather → `/setcommands` → paste list
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in `backend/.env`
4. Add to GitHub Secrets (same names)
5. Get admin chat ID → message `@userinfobot` → copy numeric ID
6. Set `ADMIN_TELEGRAM_CHAT_ID` in env and GitHub Secrets
7. Deploy → webhook auto-registers
8. Verify: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
9. Add bot as admin to job channels → `/addchannel <numeric_id>`
