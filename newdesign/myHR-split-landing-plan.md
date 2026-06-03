# myHR Split Landing Page — Build Plan (Nuxt 3)

Modeled on [tryprism.com](https://tryprism.com), focused on the dual employer/candidate split you liked. This plan covers what Prism actually does, then a concrete, Nuxt-specific build path with components, design tokens, copy, and step order.

---

## 1. What Prism actually does (the review)

### The core idea: one product, two front doors
Prism doesn't make you guess which side you're on. It runs **two audience-specific landing experiences** that share one brand shell:

- **`/` → Employers** — dark theme, B2B, "serious money" tone.
- **`/candidates` → Candidates** — light/cream theme, B2C, optimistic tone.

A persistent **pill toggle in the center of the nav** (`Employers | Candidates`) switches between them, and a **dismissible announcement bar** at the very top cross-sells the other audience ("Looking for a new job? See Prism for candidates →"). So whichever door you walk through, you're told the other one exists.

The two sides differ on almost everything that matters and share everything that's brand:

| Differs per audience | Shared shell |
| --- | --- |
| Color theme (dark vs light) | Logo + nav structure |
| Headline + sub-headline | Pill toggle component |
| Primary CTA *and its mechanic* | Type system (fonts) |
| Nav CTA label | Hero 3D art asset |
| Product mockups in "how it works" | Logo marquee pattern |
| FAQ content | "How it works" carousel pattern |
| | FAQ accordion pattern, footer |

That asymmetry is the whole trick: it feels like two tailored sites, but it's one design system.

### Visual system
- **Type:** `Source Serif 4` for display headlines (with an *italic accent word* highlighted in green — e.g. "a *lot faster*", "the *best*"), `DM Sans` for everything else (body, UI, buttons).
- **Color:**
  - Employer dark bg `#1a1a18` (warm near-black), text `#f5f0eb` (warm off-white).
  - Candidate light bg ~`#ece9e2` (warm cream), dark text.
  - Accent 1 — **olive/lime green** `~#cfe06a`: active toggle, secondary buttons, highlighted italic words.
  - Accent 2 — **lavender** `~#dcc5f0`: primary CTA buttons ("Start hiring" / "Build Your Profile") and the circular arrow buttons.
- **Shape language:** fully rounded pill buttons, large rounded-corner cards, generous whitespace, a subtle **dotted-grid texture** behind the hero.
- **Hero art:** a single photoreal 3D render — a CV/resume sheet rising out of grass/moss. Same asset on both sides, just dark-tinted for employers and bright for candidates. Whimsical but premium.

### Section-by-section (Employer `/`)
1. Announcement bar (cross-sell → candidates), dismissible.
2. Sticky nav: logo · center pill toggle · `About` `Login` · **Start hiring** (lavender CTA).
3. **Hero:** "Fill critical roles, *a lot faster.*" + sub + a **search input** "What role are you hiring for?" with arrow submit. Small `P26` badge (YC-batch style social proof).
4. **Logo marquee:** "Trusted by recruiting teams at" — auto-scrolling logos.
5. **How Prism works:** 3 feature cards in a **3D tilted scroll carousel** — (a) end-to-end hiring, (b) 15% only when you hire, (c) our pool / your network / whole internet.
6. **"The *best* people search engine in the world"** — scroll-reveal serif statement + a **benchmark bar chart** (Prism 89.6 vs competitors) with a confidence-interval caption and "Open paper" link.
7. **Testimonials marquee** — auto-scrolling quotes.
8. **FAQ accordion** — "Common Questions".
9. Final CTA + footer.

### Section-by-section (Candidate `/candidates`)
- Same skeleton, light theme. Hero: "Find Roles. Upskill. *Get Hired.*" + "Start your career assessment" CTA + "or browse open roles".
- "How it works" carousel shows **product mockups**: a Career Chat conversation, an Upskill/Learn course UI, and a "Your Matches" list with `% match` pills. FAQ tuned to candidate questions. Final CTA "Build Your Profile".

### Notable interactions
- Scroll-linked **3D perspective** on the feature carousel (cards tilt/skew as you scroll).
- Scroll-triggered **text reveal** on the big serif statements (later words fade in).
- Infinite **marquees** for logos and testimonials.
- A branded **loading splash** (logo + animated dots) on route load.

---

## 2. How to build it in myHR (Nuxt 3)

### 2.1 Architecture decision: routes vs. reactive toggle
Prism uses two real routes (`/` and `/candidates`) — good for SEO (two indexable pages, two titles/OG images) but it costs a full reload on toggle (hence their splash screen). For myHR I recommend a **hybrid**:

- Keep **two routes** for SEO: `pages/index.vue` (employer) and `pages/candidates.vue` (candidate).
- Make the **toggle instant** by driving theme + content from a shared `useState` audience flag, and use `<NuxtLink>` with Nuxt's client-side routing so switching is a soft navigation (no white flash, no splash needed).
- Persist the choice (cookie via `useCookie`) so a returning visitor lands on their side, and so the announcement bar knows which cross-sell to show.

### 2.2 File structure
```
app/
├─ layouts/
│  └─ default.vue            # shell: announcement bar + nav + <slot/> + footer
├─ pages/
│  ├─ index.vue              # Employer — definePageMeta({ audience: 'employer' })
│  └─ candidates.vue         # Candidate — definePageMeta({ audience: 'candidate' })
├─ components/
│  ├─ AppAnnouncementBar.vue
│  ├─ AppNav.vue
│  ├─ AudienceToggle.vue     # the pill toggle
│  ├─ HeroSection.vue        # props: variant, headline, accentWord, sub, cta
│  ├─ HeroArt.vue            # the 3D render (img/video), theme-tinted
│  ├─ LogoMarquee.vue
│  ├─ HowItWorks.vue         # 3D tilted card carousel wrapper
│  ├─ FeatureCard.vue
│  ├─ ProductMockCard.vue    # chat / learn / matches mock (candidate side)
│  ├─ BenchmarkChart.vue     # employer proof section
│  ├─ TestimonialMarquee.vue
│  ├─ FaqAccordion.vue
│  ├─ FinalCta.vue
│  └─ AppFooter.vue
├─ composables/
│  └─ useAudience.ts         # current audience + setAudience + cookie persist
└─ assets/css/
   └─ tokens.css             # CSS custom properties (the design tokens)
```

### 2.3 Theming approach (the most important part)
Drive everything off **CSS custom properties** scoped by a `data-audience` attribute on a top-level wrapper, so the *same components* re-skin for free. Set it from the page's `definePageMeta`.

```css
/* assets/css/tokens.css */
:root {
  --green:  #cfe06a;
  --lilac:  #dcc5f0;
  --radius-pill: 999px;
  --font-display: "Source Serif 4", Georgia, serif;
  --font-sans: "DM Sans", system-ui, sans-serif;
}
[data-audience="employer"] {
  --bg: #1a1a18;  --surface: #232320;  --text: #f5f0eb;
  --muted: #a8a39b;  --accent: var(--lilac);  --pill-active: var(--green);
}
[data-audience="candidate"] {
  --bg: #ece9e2;  --surface: #ffffff;  --text: #1a1a18;
  --muted: #6b675f;  --accent: var(--lilac);  --pill-active: var(--green);
}
```
With Tailwind, map these into `tailwind.config` (`colors.bg = 'var(--bg)'`, etc.) so you write `bg-bg text-text` and the audience attribute does the swapping. Add a short CSS `transition` on `background-color`/`color` so the toggle cross-fades instead of snapping.

### 2.4 The toggle + audience composable
```ts
// composables/useAudience.ts
export const useAudience = () => {
  const cookie = useCookie<'employer'|'candidate'>('myhr_audience', { default: () => 'employer' })
  const audience = useState('audience', () => cookie.value)
  const set = (a: 'employer'|'candidate') => { audience.value = a; cookie.value = a }
  return { audience, set }
}
```
`AudienceToggle.vue` renders two `<NuxtLink>`s (`/` and `/candidates`) styled as a pill; the active one gets the green fill. On click it also calls `set()` so theme + bar update instantly.

### 2.5 Fonts
Use `@nuxtjs/google-fonts` (or `@nuxt/fonts`) to self-host `Source Serif 4` (400, 400 italic, 600) and `DM Sans` (400, 500, 700). Self-hosting avoids the layout shift you'd get from a CDN and matches Prism's crispness.

### 2.6 Animations & interactions
- **Scroll reveals + the 3D tilted carousel:** `@vueuse/motion` for simple fade/slide-in; for the scroll-linked tilt use `useScroll` from `@vueuse/core` (or GSAP ScrollTrigger if you want it buttery) to map scroll progress → `rotateX/translateZ` on each card inside a `perspective` container.
- **Marquees:** pure CSS — duplicate the track and `animation: scroll Xs linear infinite` with `transform: translateX(-50%)`; pause on hover.
- **FAQ accordion:** native `<details>/<summary>` (accessible, zero JS) styled to taste.
- **Loading splash:** optional — with soft client-side toggling you don't strictly need it. Keep a small route-transition fade via Nuxt's `<NuxtPage>` transition instead.
- **Benchmark chart:** lightweight inline SVG bars (no chart lib needed) with a count-up + grow-in on scroll.

### 2.7 Hero art
The 3D render is doing heavy lifting visually. Options, cheapest to richest:
1. A single high-res **PNG/WebP** with two tints (CSS `filter`/overlay per audience) — fastest, recommended to start.
2. A short **looping video/WebM** for subtle motion.
3. Generated 3D — overkill for a landing page. Skip.
Either way: `loading="eager"` + `fetchpriority="high"` on the hero image, lazy-load everything below the fold, and serve responsive sizes via `<NuxtImg>`.

---

## 3. myHR copy (drop-in starting point)

**Employer side**
- Headline: "Hire the right people, *a lot faster.*"
- Sub: "myHR is your AI hiring team. We source, screen, and shortlist — so you only spend time with candidates who matter."
- Primary CTA: search input "What role are you hiring for?" → `Start hiring`
- Proof line: "Trusted by people teams at …"

**Candidate side**
- Headline: "Find work. Grow. *Get hired.*"
- Sub: "Your AI career partner. Build your profile, see roles that actually fit, close skill gaps, and get reached out to when you're a match."
- Primary CTA: `Start your career assessment` · "or browse open roles"

(Both adjustable — these mirror Prism's structure so the layout drops in cleanly.)

---

## 4. Build order (suggested PRs)

1. **Scaffold + tokens** — install Tailwind, fonts; add `tokens.css`; wire `data-audience` on the layout wrapper from `definePageMeta`. Ship a blank page that flips dark/light by route. *(De-risks the whole theming model first.)*
2. **Shell** — `AppAnnouncementBar`, `AppNav`, `AudienceToggle`, `AppFooter` in `layouts/default.vue`. Toggle navigates + persists cookie.
3. **Hero** — `HeroSection` + `HeroArt`, both variants, responsive. The employer search box and candidate assessment CTA.
4. **Social proof** — `LogoMarquee` (CSS marquee).
5. **How it works** — `FeatureCard` grid first (static), then layer the 3D scroll tilt. Candidate `ProductMockCard`s.
6. **Employer proof** — `BenchmarkChart` (SVG) + scroll-reveal serif statement.
7. **Testimonials + FAQ** — `TestimonialMarquee`, `FaqAccordion`.
8. **Final CTA + polish** — transitions, reduced-motion handling, Lighthouse pass.

### Responsiveness & a11y
- Carousel collapses to a vertical stack on mobile; disable 3D tilt under `prefers-reduced-motion`.
- Toggle must be keyboard-operable (real links); marquees pause on hover/focus.
- Maintain AA contrast on both themes (the cream side is the one to watch with green text).

---

## 5. What I'd change vs. Prism
- **Instant toggle** (soft navigation) instead of a full reload + splash — better perceived speed.
- **Remember the audience** via cookie so repeat visitors skip the guessing.
- Keep the **two real routes** for SEO regardless — distinct `<title>`, meta description, and OG image per audience.

See the accompanying `myHR-split-landing-mockup.html` for a working visual of the split, theme inversion, and instant toggle.
