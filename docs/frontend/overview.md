# Frontend Overview

Nuxt 4, Vue 3, Pinia. Hybrid SSR: public pages pre-rendered, portals rendered as SPA.

Source: `frontend/app/`

---

## Directory Structure

```
frontend/app/
├── pages/           # 74 route files (file-based routing)
├── layouts/         # 6 layout components
├── stores/          # 8 Pinia stores
├── composables/     # 20 composables
├── components/      # 67 Vue components
├── assets/
│   └── css/main.css # Global styles (Tailwind via @nuxt/ui)
└── i18n/ (via nuxt.config.ts)
    └── locales/
        ├── en.json  # 985 keys
        ├── ru.json  # 985 keys
        └── uz.json  # 985 keys
```

---

## Four Portals

### Employer Portal — `/employer/**`

For HR staff and hiring managers. Uses `default.vue` layout.

Key pages:
```
/employer/login
/employer/signup
/employer/dashboard                    ← KPI cards + pipeline overview
/employer/jobs                         ← Job list with status filters
/employer/jobs/create                  ← Multi-section job form
/employer/jobs/[id]                    ← Job detail + pipeline hub
/employer/jobs/[id]/edit
/employer/applications                 ← Master-detail: list + slideover
/employer/applications/[id]
/employer/candidates                   ← Candidate search database
/employer/candidates/[id]
/employer/conversations                ← Recruiter-candidate chat
/employer/conversations/[id]
/employer/placements                   ← Hire records
/employer/placements/[id]
/employer/invoices                     ← Billing
/employer/invoices/[id]
/employer/analytics
/employer/hh-chats                     ← HH.uz messaging
/employer/hh-chats/[chatId]
/employer/hh-hidden                    ← Hidden HH vacancies
/employer/sourcing                     ← AI LinkedIn sourcing
/employer/settings                     ← Company settings
/employer/settings/hh-templates
```

### Candidate Portal — `/candidate/**`

For job seekers. Uses `candidate.vue` layout.

Key pages:
```
/candidate                             ← Landing/entry
/candidate/login
/candidate/onboarding                  ← 7-step onboarding wizard
/candidate/dashboard                   ← Matched jobs + activity
/candidate/jobs                        ← Job discovery with filters
/candidate/profile                     ← Editable profile (multi-section)
/candidate/preferences                 ← Job preferences + notification settings
/candidate/tracker                     ← Application tracking board
/candidate/analytics
/candidate/inbox                       ← Notifications
/candidate/chat/[id]
/candidate/hh-chats                    ← HH.uz messages
/candidate/hh-chats/[chatId]
```

### Staff Admin Portal — `/staff/**`

For internal Crewly team. Uses `staff.vue` layout.

```
/staff/login
/staff/dashboard                       ← Platform-wide KPIs
/staff/candidates                      ← All candidates globally
/staff/companies                       ← All companies
/staff/invoices                        ← All invoices
/staff/sourcing
/staff/audit                           ← Audit logs
/staff/consent                         ← GDPR records
/staff/ingestion                       ← Ingestion run history
/staff/feature-flags
/staff/llm-costs                       ← AI cost tracking
```

### Telegram Mini App — `/tma/**`

Minimal chrome, touch-optimized. Uses `tma.vue` layout.

```
/tma                                   ← Auth + role detection + redirect
/tma/candidate                         ← Job feed
/tma/candidate/applications
/tma/candidate/job/[id]
/tma/hr                                ← Pipeline overview
/tma/hr/candidate/[id]
```

---

## Layouts

| Layout | File | Chrome | Used By |
|--------|------|--------|---------|
| `default.vue` | layouts/default.vue | Sidebar + breadcrumbs + command palette + SSE stream | `/employer/**` |
| `candidate.vue` | layouts/candidate.vue | Mobile nav + SSE stream + notification badges | `/candidate/**` |
| `staff.vue` | layouts/staff.vue | Admin sidebar, simplified | `/staff/**` |
| `landing.vue` | layouts/landing.vue | Marketing nav + footer | `/`, `/jobs`, `/terms`, `/privacy` |
| `tma.vue` | layouts/tma.vue | Bare (no chrome) | `/tma/**` |
| `empty.vue` | layouts/empty.vue | Nothing | Auth error pages |

`default.vue` features:
- Live agent thought feed (AI activity stream)
- SSE event subscription (`useEventStream()`)
- Command palette (⌘K)
- Breadcrumb injection via `useUIStore`

---

## i18n

3 locales, 985 keys each. Strategy: prefix_except_default.

| Locale | URL prefix | File |
|--------|-----------|------|
| English | *(none)* | `i18n/locales/en.json` |
| Russian | `/ru/` | `i18n/locales/ru.json` |
| Uzbek | `/uz/` | `i18n/locales/uz.json` |

Usage in Vue:
```vue
<template>
  <p>{{ $t('nav.dashboard') }}</p>
</template>
<script setup>
const { t } = useI18n()
const label = t('common.save')
</script>
```

Key structure:
```json
{
  "nav": { "dashboard": "Dashboard", "jobs": "Jobs", ... },
  "auth": { "login": "Login", "email": "Email", ... },
  "common": { "save": "Save", "cancel": "Cancel", "loading": "Loading...", ... },
  "candidate": { "profile": { "title": "My Profile", ... }, ... },
  "employer": { "jobs": { "create": "Create Job", ... }, ... }
}
```

---

## SSR Mode (Nuxt nitro rules)

| Route Pattern | SSR | Prerender | Robots |
|--------------|-----|-----------|--------|
| `/` | Prerender | Yes | Yes |
| `/jobs`, `/jobs/**` | Prerender | Yes | Yes |
| `/terms`, `/privacy` | Prerender | Yes | Yes |
| `/employer/**` | No SSR | No | No |
| `/candidate/**` | No SSR | No | No |
| `/staff/**` | No SSR | No | No |
| `/tma/**` | No SSR | No | No |

Non-SSR routes = SPA mode = all rendered client-side = no server secret exposure.

---

## Nuxt Modules

| Module | Purpose |
|--------|---------|
| `@nuxt/ui` | Component library (Button, Modal, Table, Form, etc.) |
| `@pinia/nuxt` | State management |
| `@nuxtjs/i18n` | Internationalization |
| `@nuxt/fonts` | Google Fonts (Fraunces, Manrope, JetBrains Mono) |
| `@sentry/nuxt/module` | Error tracking |
| `@nuxtjs/seo` | Meta tags, sitemap, robots.txt |
| `@nuxt/eslint` | ESLint integration |

---

## Fonts

| Font | Usage | Weight |
|------|-------|--------|
| Manrope | Body text (sans-serif) | 400, 600, 700 |
| Fraunces | Display headings | 700, 900 |
| JetBrains Mono | Code blocks | 400 |
