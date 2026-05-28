# Handoff: my-hr — AI-native recruiting platform

## Overview

**my-hr** is a two-sided recruiting platform inspired by the agency model — but the agency is software. AI agents source candidates, screen them, and write outreach on both sides:

- **Companies** post a role and get a curated, AI-scored pipeline within hours.
- **Candidates** connect their work (GitHub, portfolio, LinkedIn) and get a private agent that watches the market for them.

The design ships as three top-level pages: a marketing landing (`my-hr.html`), a company portal (`company.html`), and a candidate portal (`candidate.html`).

---

## About the Design Files

The files in this bundle are **design references created in HTML**. They are working React prototypes (Babel-compiled in-browser), not production code. The goal is to **recreate these designs in your target codebase's environment** (Next.js, Vite + React, Remix, etc.) using your existing component library, state management, and styling system — not to ship the HTML directly.

If your codebase has a design system (e.g. Tailwind tokens, shadcn/ui, a custom DS), prefer mapping the values from `styles.css` into those primitives. If no codebase exists yet, recommended stack:

- **Next.js 14 (App Router)** or **Vite + React 18**
- **TypeScript**
- **Tailwind CSS** with the design tokens listed below mapped to `theme.extend`
- **Radix UI** primitives for accessible dialogs/tabs/popovers
- **lucide-react** for icons (the prototype uses custom SVG icons — see `shared.jsx` for the set; lucide has equivalents for every one)
- Fonts via `next/font` or `@fontsource`: **Fraunces**, **Inter**, **JetBrains Mono**

---

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, component states, and interactions are all decided. Recreate pixel-perfectly. The only things that are mocked rather than designed are: the actual API surface, auth, and persistence — implement these in your codebase's conventional way.

---

## Information Architecture

```
/                      → my-hr.html       Marketing landing, two "doors"
/company               → company.html     Company portal (multi-view SPA)
/candidate             → candidate.html   Candidate portal (multi-view SPA)
```

### Company portal views

| View id      | Route suggestion                  | What it does                                           |
|--------------|-----------------------------------|--------------------------------------------------------|
| `dashboard`  | `/company`                        | Overview: KPI strip, "needs your call", pipeline preview, agent activity feed |
| `jobs`       | `/company/jobs`                   | List of all open roles                                 |
| `job`        | `/company/jobs/:jobId`            | Single role: pipeline kanban, brief, agent outreach, activity |
| `candidates` | `/company/candidates`             | Flat table of every candidate across roles             |
| `candidate`  | `/company/candidates/:candidateId`| Single candidate profile (company-side view)           |
| `chat`       | `/company/agent`                  | Agent chat                                             |
| `analytics`  | `/company/analytics`              | Funnel, sources, agent-vs-human breakdown              |

### Candidate portal views

| View id   | Route suggestion             | What it does                                       |
|-----------|------------------------------|----------------------------------------------------|
| `feed`    | `/candidate`                 | "For you" — AI-matched roles with "why this matches you" |
| `cjob`    | `/candidate/jobs/:jobId`     | Single job, candidate's view (personalized)        |
| `saved`   | `/candidate/saved`           | Saved roles + agent updates on them                |
| `inbox`   | `/candidate/inbox`           | Messages from agency agent + hiring managers       |
| `profile` | `/candidate/profile`         | Candidate's own profile (auto-built from sources)  |
| `chat`    | `/candidate/agent`           | Agent chat                                         |

---

## Design Tokens

All tokens live in `styles.css` under `:root`. Map these to your styling system (Tailwind theme, CSS vars, design-token package, etc.).

### Colors

| Token              | Hex / Value          | Use                                          |
|--------------------|----------------------|----------------------------------------------|
| `--bg`             | `#F5F1EA`            | App background (warm beige paper)            |
| `--bg-elevated`    | `#FAF8F4`            | Subtle elevated surface (cards on top of bg) |
| `--bg-deep`        | `#EFE9DD`            | Deeper surface (sidebar role-switch track)   |
| `--paper`          | `#FDFCF8`            | Main card / sheet                            |
| `--ink`            | `#1A1A1A`            | Primary text                                 |
| `--ink-strong`     | `#0A0A0A`            | Headlines / emphasis                         |
| `--ink-muted`      | `#6B6760`            | Secondary text                               |
| `--ink-subtle`     | `#A8A39A`            | Tertiary text, meta                          |
| `--line`           | `#D9D3C7`            | Standard borders                             |
| `--line-soft`      | `#E8E2D5`            | Subtle dividers                              |
| `--accent`         | `#C84A1F` (Ember)    | Primary brand accent. Italics, KPIs, CTAs    |
| `--accent-soft`    | `#F4DDD2`            | Accent tint backgrounds (badges, avatars)    |
| `--positive`       | `#2F6B3F`            | Success states                               |
| `--warn`           | `#B57A1F`            | Warning states                               |

Alternate accents exposed via Tweaks: `#2A5D8C` Indigo, `#2F6B3F` Sage, `#7A3F8C` Plum.

### Dark mode (warm-dark)

| Token              | Hex                  |
|--------------------|----------------------|
| `--bg`             | `#15140F`            |
| `--bg-elevated`    | `#1C1B16`            |
| `--bg-deep`        | `#232118`            |
| `--paper`          | `#1A1813`            |
| `--ink`            | `#F5F1EA`            |
| `--line`           | `#2C2A22`            |

### Typography

Three families, used as a strict system — never mix outside these rules.

| Family            | Weights        | Used for                                                          |
|-------------------|----------------|-------------------------------------------------------------------|
| **Fraunces**      | 400, 500       | Display headlines, KPI numbers, page titles, card titles ≥18px    |
| **Inter**         | 400, 500, 600  | All UI body text, buttons, labels                                 |
| **JetBrains Mono**| 400, 500       | Meta text, eyebrows, timestamps, KBD, data labels, counts         |

Fraunces is used in **italic** for accent words (the part of a headline colored `--accent`).

**Sizes** (approx, see `styles.css` for exact):

| Use                          | Family   | Size           | Weight | Letter-spacing |
|------------------------------|----------|----------------|--------|----------------|
| Display (landing hero)       | Fraunces | clamp(56, 8vw, 112px) | 400 | -0.045em       |
| Page title                   | Fraunces | 44px           | 400    | -0.035em       |
| Card title                   | Fraunces | 22px           | 400    | -0.025em       |
| KPI value                    | Fraunces | 38px           | 400    | -0.035em       |
| Eyebrow / mono label         | Mono     | 10–11px        | 400    | 0.10em UPPER   |
| Body                         | Inter    | 13–14px        | 400    | -0.005em       |
| Body emphasis                | Inter    | 13–14px        | 500    | -0.005em       |

### Spacing & Radius

The design uses an informal scale; key values:

- Card padding: **20px** (default), **16px** (compact), **28px** (large)
- Section gap inside a page: **20px**
- Border radius: **7px** (small chips), **8px** (buttons), **10–12px** (small cards), **14px** (large cards), **18–20px** (hero / doors)
- Pill / fully rounded: `999px`

### Shadows

Used very sparingly. Only on hover for clickable cards:

- `0 10px 30px -8px rgba(0,0,0,0.10)` — door hover on landing
- `0 1px 2px rgba(0,0,0,0.04)` — active role-switch button

### Grid background

Hero sections use a faded grid:
- 32px squares, `rgba(0,0,0,0.05)` 1px lines
- Radial-gradient fade from transparent center to bg edge (80% stop)

---

## Components (catalog)

Every component is in `shared.jsx`, `sidebar.jsx`, `company.jsx`, `candidate.jsx`, `chat.jsx`. The contract for each:

### `<Avatar name size tone square />`
- Sizes: `md` (30px), `lg` (56px), `xl` (88px)
- Auto-picks a tone from name hash if not specified (5 tones: accent, sage, sand, sky, plum)
- Initials derived from name (first letter of first two words)
- `square` = 7px rounded square instead of circle

### `<Tag tone dot>...</Tag>`
- Tones: default, `solid`, `accent`, `positive`, `warn`
- 10.5px JetBrains Mono UPPERCASE, `0.04em` letter-spacing
- 3px × 9px padding, 999px radius
- `dot` adds a small status dot on the left

### `<Btn variant size icon iconRight>`
- Variants: `primary` (ink bg → accent on hover), `accent` (accent bg), `ghost` (border-only), `soft` (subtle elevated)
- Sizes: default (`9px × 14px`, 13px font), `lg` (`12px × 20px`, 14px font)
- Hover on primary lifts 1px and switches bg from ink to accent

### `<ScoreRing value color />`
- Conic-gradient ring, value 0–100
- 44px diameter, 4px ring thickness
- Center shows value in JetBrains Mono 12px

### `<Sparkline data color height />`
- Inline SVG polyline, no axes, no dots
- Default color: `--accent`; alternates: `--ink`, `--positive`
- Used in KPI cards (height 28px)

### `<GridHero>`
- Bordered, 20px radius
- Inner ::before paints the grid, ::after paints the radial fade
- Used as the hero shell in candidate job-detail and landing

### `<Sidebar>`
- 232px fixed width, sticky full-height
- Three sections: brand → role context → nav → pinned roles (company only) → agent status card at bottom
- Active nav item: `--ink` background, `--bg` text
- Hover: `--bg-elevated` background

### `<Topbar>`
- 56px height, sticky top
- Crumbs (left) · Search (centered, ⌘K hint) · Notifications, Help, Avatar (right)

### Pipeline kanban (`<Pipeline>`)
- 5 columns: Sourcing, Screening, Shortlist, Interviewing, Offer
- Equal `1fr` grid with 14px gap
- Each column: 12px padding, 12px radius, dashed phantom card in Sourcing for "agent is sourcing more…"
- Mini cards: avatar + name + location + score tag + notice-time meta

### Candidate row (`.pipe-row`)
- 7-column grid: `44px 1.6fr 1fr 90px 110px 130px 40px`
- Avatar · Name+headline · Match info · Stage tag · Notice · ScoreRing+meta · Chevron
- Hover: `--bg-elevated` background
- Header row uses uppercase 10px mono

### Agent stream item
- 3-column grid: `28px 1fr auto`
- Circle icon · Text + extra · Timestamp
- `accent` variant gives the icon circle an accent-soft background

### Chat message
- 32px avatar + bubble
- `me` variant: justified to the right, ink bg, paper text
- `agent` variant: paper bg, ink text, 1px line-soft border
- Border-top-left-radius collapsed to 4px (or top-right for `me`) for the "tail" effect
- Below the bubble, optional: action chips, diff card, attached job card

### AI summary card (`.ai-summary`)
- White card with a small accent ribbon top-left reading "AI" (9px mono)
- Body text 13.5px, `--ink`
- Footer: comma-separated citation chips in mono 10px

### KPI card (`.kpi`)
- 18px padding, 14px radius
- Label (mono uppercase) → Value (Fraunces 38px, italic accent on the highlight word) → Delta (mono, positive=green / negative=accent) → Sparkline
- 4-up grid on dashboard/analytics

### Job card (candidate-side `.job-card`)
- 14px radius, 20px padding, 14px gap column
- Top: company avatar+meta (left) · Match score (right, Fraunces 26px italic accent)
- Title (Fraunces 22px)
- Meta row (location · salary)
- **"Why this matches you" block**: `--bg-elevated`, 10px radius, 12.5px text, 2px left border in accent
- Footer: skill tags · "View role →"

### Landing doors (`.door`)
- 18px radius, 30px×28px padding
- Hover lifts 3px, border darkens to ink, soft shadow appears
- Inside: ribbon · headline (Fraunces 34px) · description · footer with stat + pill button
- Pill button bg switches from ink to accent on door hover

---

## Interactions & Behavior

### Landing → portals
- Each "door" is a full-card link. Whole card clickable, not just the button.
- The pill button in the top-right ("Sign in") also routes to `/company` for now.

### Portals — shared
- Sidebar nav switches inline view (no full page reload in the prototype). In production, route normally.
- Logo in sidebar links back to landing (`my-hr.html`).
- Topbar search has `⌘K` hint — implement as a command palette later (not in scope here).
- `window.scrollTo({ top: 0, behavior: 'smooth' })` on every internal nav.

### Pipeline kanban
- Cards are clickable → opens candidate profile.
- The "Agent sourcing 30 more…" phantom card in `Sourcing` is decorative — not draggable.
- Production: implement drag-between-columns with `@dnd-kit/sortable` or similar.

### Agent chat
- User input → optimistically append `me` message → after 600ms append a typing-only `agent` message (3 pulsing dots).
- In production: stream from your LLM endpoint. Render markdown lightly (bold + paragraphs sufficient).
- Action chips below an agent message are clickable shortcuts that act as if the user typed the text on the chip.
- Suggestion chip strip above the input is always visible; chips are also clickable shortcuts.

### Tweaks panel
- Optional in production. The prototype exposes: accent color, density (comfortable/compact), theme (warm/dark).
- Implement as a settings drawer or skip entirely.

### Animations
- `pulse` (2s ease-in-out infinite, 1→0.25 opacity): live dots, agent typing dots
- Door hover: 180ms transform + border + shadow
- Card hover: 120ms background
- Button hover (primary): 150ms bg + 1px lift
- No page transitions. Sidebar nav switches view instantly.

---

## State Management

What needs to be in app state:

### Company portal
- `currentJobId` — which role's pipeline/brief/outreach is open
- `currentCandidateId` — which candidate's profile is open
- `pipelineFilters` — stage, score range, location, skills
- `agentStreamCursor` — for paginated activity feed
- `pendingOutreachDrafts[]` — drafts the agent generated and needs approval on
- `chatThread[]` — messages, with role discriminator

### Candidate portal
- `feedFilters` — comp band, location, role type, company size
- `savedJobIds[]`
- `inboxMessages[]` with read/unread state
- `profile` — editable preferences (role type, comp, location, avoids)
- `connectedSources[]` — GitHub, LinkedIn, etc. with last-sync timestamp

### Data fetching
- All views can render with a single initial query per page. The prototype uses static mock data in `data.jsx` — `COMPANIES`, `JOBS`, `CANDIDATES`, `STAGES`, `AGENT_FEED`, `INBOX`. Match these shapes when designing your API.

### Mock data shapes

```ts
type Company = {
  id: string; name: string; industry: string;
  size: string; city: string; logo: string;
};

type Job = {
  id: string; title: string; company: string /* companyId */;
  salary: string; location: string; type: string;
  posted: string; stage: 'sourcing'|'screening'|'interviewing';
  applicants: number; shortlisted: number; interviews: number;
  tags: string[]; summary: string;
  must: string[]; nice: string[];
};

type Candidate = {
  id: string; name: string; avatar: string /* tone */;
  headline: string; location: string; open: boolean;
  score: number; // 0-100
  fit: { skills: number; experience: number; signal: number; retention: number };
  salary: string; notice: string; languages: string[];
  skills: string[]; summary: string;
  citations: string[]; // source labels for the AI summary
  experience: { when: string; role: string; co: string; loc: string; note: string }[];
  matchedJob: string /* jobId */;
  stage: 'sourcing'|'screening'|'shortlisted'|'interviewing'|'offer';
};
```

---

## Assets

- **Fonts**: All three families load from Google Fonts via `<link>` in each HTML file. Move to `next/font` or self-host with `@fontsource` for production.
- **Icons**: Custom SVG set in `shared.jsx` (function `Icon`). Replace with `lucide-react` 1:1 — every name (home, briefcase, users, inbox, chart, search, bell, etc.) has a lucide equivalent.
- **Logo**: Pure CSS — a 26×26px ink square with a Fraunces italic lowercase "m" in beige. No image asset.
- **Avatars**: All initial-based, no photos.
- **Company logos**: All single-letter avatars (`logo: 'A'` on the Company record). Replace with real images once available.

---

## Files in this bundle

| File              | Role                                                              |
|-------------------|-------------------------------------------------------------------|
| `my-hr.html`      | Landing page (pure HTML, no React) — two-door pattern             |
| `company.html`    | Company portal entry — loads React app with `data-role="company"` |
| `candidate.html`  | Candidate portal entry — same React app with `data-role="candidate"` |
| `styles.css`      | All design tokens + component CSS                                 |
| `shared.jsx`      | Icon set, Avatar, Tag, Btn, ScoreRing, Sparkline, GridHero, Logo  |
| `data.jsx`        | All mock data (companies, jobs, candidates, agent feed, inbox)    |
| `sidebar.jsx`     | Left navigation                                                   |
| `company.jsx`     | Topbar, CompanyDashboard, JobsList, JobDetail, Pipeline, JobBrief, Outreach, CandidateProfile |
| `candidate.jsx`   | CandidateFeed, CandidateJob (detail), Inbox                       |
| `chat.jsx`        | AgentChat, Analytics, Saved, MyProfile                            |
| `app.jsx`         | Root App component, routing, Tweaks panel                         |
| `tweaks-panel.jsx`| Tweaks shell (can be omitted in production)                       |

---

## Implementation order (suggested)

1. Set up the codebase with the three fonts and design tokens.
2. Build the **landing** (`my-hr.html`) — pure markup, no state. Smallest scope, gives you the visual system.
3. Build the **shared shell**: sidebar + topbar + page chrome. Wire routing.
4. Build the **company dashboard** — exercises every primitive (KPIs, stream, pipeline, table row).
5. Build **job detail + pipeline kanban** — the densest screen.
6. Build the **candidate profile (company view)** — exercises AI-summary card + timeline.
7. Build the **candidate "For you" feed + job detail** — mirror of company-side primitives.
8. Build **agent chat** — last because it depends on your LLM streaming infra.
9. Build **analytics** — chart-heavy; use Recharts or Visx.

---

## Open questions for the developer

- Auth: not designed. Add your own (Clerk, Auth.js, Supabase, etc.) and put company-portal under a "hiring team" role gate.
- Empty states: not in the prototype. Design these as you build.
- Mobile: prototype is desktop-only (≥1100px). Either build mobile separately or constrain the marketing site to mobile and gate the portals as desktop-only.
- Real AI: the agent stream is mocked. Wire to your LLM provider with tool-use for sourcing, outreach drafting, scoring.
