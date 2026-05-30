<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const store = useAuthStore()
if (!store.isAuthenticated) {
  await store.fetchMe()
}
if (store.isAuthenticated) {
  await navigateTo('/employer/dashboard', { replace: true })
}
</script>

<template>
  <div class="landing">
    <nav class="lnav">
      <NuxtLink to="/" class="brand">
        <div class="brand-mark">m</div>
        <div class="brand-name">my<em>-hr</em></div>
      </NuxtLink>
      <div class="links">
        <a href="#how-it-works">{{ t('landing.navHowItWorks') }}</a>
        <NuxtLink to="/login?mode=signup">{{ t('landing.navForCompanies') }}</NuxtLink>
        <a href="#for-candidates">{{ t('landing.navForCandidates') }}</a>
        <NuxtLink to="/terms">{{ t('landing.navPricing') }}</NuxtLink>
        <a href="#belief">{{ t('landing.navManifesto') }}</a>
      </div>
      <div class="lnav-right">
        <span class="live-pill">
          <span class="live-dot" />
          Agent · live
        </span>
        <NuxtLink to="/login" class="signin-btn">{{ t('landing.signIn') }}</NuxtLink>
      </div>
    </nav>

    <section class="hero-wrap">
      <div class="hero">
        <span class="eyebrow-pill">
          <span class="eyebrow-dot" />
          {{ t('landing.eyebrow') }}
        </span>

        <h1 class="headline">
          {{ t('landing.headline') }}<br />
          <em>{{ t('landing.headlineEm') }}</em>
        </h1>

        <div class="subhead-wrap">
          <p class="subhead-line">
            <span class="subhead-prefix">{{ t('landing.doorCompanyRibbon') }}</span>
            {{ t('landing.subheadCompany') }}
          </p>
          <p class="subhead-line subhead-line--candidate">
            <span class="subhead-prefix subhead-prefix--candidate">{{
              t('landing.doorCandidateRibbon')
            }}</span>
            {{ t('landing.subheadCandidate') }}
          </p>
        </div>

        <div id="how-it-works" class="doors">
          <NuxtLink class="door" to="/login?mode=signup">
            <span class="ribbon">{{ t('landing.doorCompanyRibbon') }}</span>
            <h2>
              {{ t('landing.doorCompanyTitle') }}<br /><em>{{
                t('landing.doorCompanyTitleEm')
              }}</em>
            </h2>
            <p>{{ t('landing.doorCompanyBody') }}</p>
            <div class="door-foot">
              <span class="door-stat">{{ t('landing.pillar2Title') }}</span>
              <span class="arrow-btn">{{ t('landing.doorCompanyCta') }}</span>
            </div>
          </NuxtLink>

          <NuxtLink class="door" to="/candidate/login">
            <span class="ribbon">{{ t('landing.doorCandidateRibbon') }}</span>
            <h2>
              {{ t('landing.doorCandidateTitle') }}<br /><em>{{
                t('landing.doorCandidateTitleEm')
              }}</em>
            </h2>
            <p>{{ t('landing.doorCandidateBodyNew') }}</p>
            <div class="door-foot">
              <span class="door-stat">{{ t('landing.pillar3Title') }}</span>
              <span class="arrow-btn">{{ t('landing.doorCandidateCtaNew') }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-value">{{ t('landing.statCompaniesValue') }}</span>
        <span class="stat-label">{{ t('landing.statCompaniesLabel') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ t('landing.statCandidatesValue') }}</span>
        <span class="stat-label">{{ t('landing.statCandidatesLabel') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ t('landing.statMarketsValue') }}</span>
        <span class="stat-label">{{ t('landing.statMarketsLabel') }}</span>
      </div>
    </div>

    <section class="how-section">
      <div id="for-companies" class="how-col">
        <span class="how-ribbon">{{ t('landing.companiesHowLabel') }}</span>
        <h3 class="how-title">{{ t('landing.companiesHowTitle') }}</h3>
        <div class="how-steps">
          <div class="how-step">
            <span class="how-step-num">01</span>
            <div>
              <strong>{{ t('landing.companiesStep1Title') }}</strong>
              <p>{{ t('landing.companiesStep1Body') }}</p>
            </div>
          </div>
          <div class="how-step">
            <span class="how-step-num">02</span>
            <div>
              <strong>{{ t('landing.companiesStep2Title') }}</strong>
              <p>{{ t('landing.companiesStep2Body') }}</p>
            </div>
          </div>
          <div class="how-step">
            <span class="how-step-num">03</span>
            <div>
              <strong>{{ t('landing.companiesStep3Title') }}</strong>
              <p>{{ t('landing.companiesStep3Body') }}</p>
            </div>
          </div>
        </div>
        <NuxtLink to="/login?mode=signup" class="how-cta">{{
          t('landing.doorCompanyCta')
        }}</NuxtLink>
      </div>

      <div class="how-divider" />

      <div id="for-candidates" class="how-col">
        <span class="how-ribbon how-ribbon--candidate">{{ t('landing.candidatesHowLabel') }}</span>
        <h3 class="how-title">{{ t('landing.candidatesHowTitle') }}</h3>
        <div class="how-steps">
          <div class="how-step">
            <span class="how-step-num how-step-num--candidate">01</span>
            <div>
              <strong>{{ t('landing.candidatesStep1Title') }}</strong>
              <p>{{ t('landing.candidatesStep1Body') }}</p>
            </div>
          </div>
          <div class="how-step">
            <span class="how-step-num how-step-num--candidate">02</span>
            <div>
              <strong>{{ t('landing.candidatesStep2Title') }}</strong>
              <p>{{ t('landing.candidatesStep2Body') }}</p>
            </div>
          </div>
          <div class="how-step">
            <span class="how-step-num how-step-num--candidate">03</span>
            <div>
              <strong>{{ t('landing.candidatesStep3Title') }}</strong>
              <p>{{ t('landing.candidatesStep3Body') }}</p>
            </div>
          </div>
        </div>
        <NuxtLink to="/candidate/login?mode=signup" class="how-cta how-cta--candidate">{{
          t('landing.doorCandidateCtaNew')
        }}</NuxtLink>
      </div>
    </section>

    <section id="belief" class="belief">
      <h3>
        {{ t('landing.beliefTitle') }}<br />
        <em>{{ t('landing.beliefTitleEm') }}</em> {{ t('landing.beliefTitleEnd') }}
      </h3>
      <div class="pillar">
        <span class="pillar-label">{{ t('landing.pillar1Label') }}</span>
        <span class="pillar-big">{{ t('landing.pillar1Title') }}</span>
        <p>{{ t('landing.pillar1Body') }}</p>
      </div>
      <div class="pillar">
        <span class="pillar-label">{{ t('landing.pillar2Label') }}</span>
        <span class="pillar-big"
          ><em>{{ t('landing.pillar2Title') }}</em></span
        >
        <p>{{ t('landing.pillar2Body') }}</p>
      </div>
      <div class="pillar">
        <span class="pillar-label">{{ t('landing.pillar3Label') }}</span>
        <span class="pillar-big">{{ t('landing.pillar3Title') }}</span>
        <p>{{ t('landing.pillar3Body') }}</p>
      </div>
    </section>

    <footer class="lfoot">
      <span>© 2025 my-hr</span>
      <div style="display: flex; gap: 22px">
        <NuxtLink to="/terms">{{ t('landing.navPricing') }}</NuxtLink>
        <NuxtLink to="/employer/login">{{ t('auth.login') }}</NuxtLink>
        <NuxtLink to="/candidate/login">{{ t('landing.navForCandidates') }}</NuxtLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.lnav {
  height: 64px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 32px;
  border-bottom: 1px solid #e8e2d5;
  position: sticky;
  top: 0;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px);
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #1a1a1a;
  color: #f5f1ea;
  display: grid;
  place-items: center;
  font-family: 'Fraunces', serif;
  font-size: 17px;
  font-style: italic;
  letter-spacing: -0.04em;
}
.brand-name {
  font-family: 'Fraunces', serif;
  font-size: 21px;
  letter-spacing: -0.04em;
  color: #1a1a1a;
}
.brand-name em {
  font-style: italic;
  color: #c84a1f;
}

.links {
  display: flex;
  gap: 22px;
}
.links a {
  font-size: 13px;
  color: #6b6760;
  text-decoration: none;
  transition: color 0.12s;
}
.links a:hover {
  color: #1a1a1a;
}

.lnav-right {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6b6760;
  padding: 4px 10px;
  border: 1px solid #d9d3c7;
  border-radius: 999px;
  background: #faf8f4;
  letter-spacing: 0.04em;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c84a1f;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.signin-btn {
  display: inline-flex;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  padding: 4px 12px;
  border: 1px solid #1a1a1a;
  border-radius: 999px;
  background: #1a1a1a;
  color: #f5f1ea;
  text-decoration: none;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.signin-btn:hover {
  background: #c84a1f;
  border-color: #c84a1f;
}

/* ── Hero ── */
.hero-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 60px 32px 40px;
}
.hero-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
  background-size: 36px 36px;
}
.hero-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 80% at center, transparent 0%, #f5f1ea 75%);
  pointer-events: none;
}
.hero {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.eyebrow-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6b6760;
  padding: 6px 14px;
  border: 1px solid #d9d3c7;
  border-radius: 999px;
  background: #fdfcf8;
  letter-spacing: 0.06em;
}
.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c84a1f;
}

.headline {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: clamp(56px, 8vw, 112px);
  line-height: 0.96;
  letter-spacing: -0.045em;
  color: #1a1a1a;
  max-width: 14ch;
  text-wrap: balance;
}
.headline em {
  font-style: italic;
  color: #c84a1f;
}

/* Dual subhead */
.subhead-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 660px;
  width: 100%;
  text-align: left;
}
.subhead-line {
  font-size: 14px;
  color: #6b6760;
  line-height: 1.55;
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.subhead-prefix {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a8a39a;
  border: 1px solid #d9d3c7;
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.subhead-prefix--candidate {
  color: #c84a1f;
  border-color: rgba(200, 74, 31, 0.3);
}

/* ── Doors ── */
.doors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  max-width: 880px;
  width: 100%;
  margin-top: 16px;
}
.door {
  background: #fdfcf8;
  border: 1px solid #d9d3c7;
  border-radius: 18px;
  padding: 30px 28px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s,
    transform 0.18s,
    box-shadow 0.18s;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}
.door:hover {
  border-color: #1a1a1a;
  transform: translateY(-3px);
  box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.1);
}
.ribbon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #a8a39a;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.door h2 {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: 34px;
  letter-spacing: -0.028em;
  line-height: 1.05;
}
.door h2 em {
  font-style: italic;
  color: #c84a1f;
}
.door p {
  font-size: 14px;
  color: #6b6760;
  line-height: 1.55;
}

.door-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e8e2d5;
  gap: 12px;
}
.door-stat {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #a8a39a;
  flex: 1;
}
.arrow-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a1a1a;
  color: #f5f1ea;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s;
}
.door:hover .arrow-btn {
  background: #c84a1f;
}

/* ── Stats strip ── */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.stat-item {
  padding: 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid var(--line);
}
.stat-item:last-child {
  border-right: none;
}
.stat-value {
  font-family: 'Fraunces', serif;
  font-size: 42px;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--ink);
}
.stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-subtle);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── How it works ── */
.how-section {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  border-top: 1px solid var(--line);
  background: var(--bg);
}
.how-divider {
  background: var(--line);
}
.how-col {
  padding: 56px 52px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.how-ribbon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--ink-subtle);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.how-ribbon--candidate {
  color: var(--accent);
}
.how-title {
  font-family: 'Fraunces', serif;
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
}
.how-steps {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.how-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.how-step-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-subtle);
  letter-spacing: 0.06em;
  padding-top: 3px;
  min-width: 22px;
}
.how-step-num--candidate {
  color: var(--accent);
  opacity: 0.7;
}
.how-step strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  display: block;
  margin-bottom: 4px;
}
.how-step p {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.5;
  margin: 0;
}
.how-cta {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background: var(--ink);
  color: var(--paper);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
  align-self: flex-start;
}
.how-cta:hover {
  background: var(--accent);
}
.how-cta--candidate {
  background: var(--accent);
}
.how-cta--candidate:hover {
  background: var(--ink);
}

/* ── Belief ── */
.belief {
  border-top: 1px solid #d9d3c7;
  padding: 48px 40px;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  gap: 36px;
  align-items: start;
  background: #f5f1ea;
}
.belief h3 {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.belief h3 em {
  font-style: italic;
  color: #c84a1f;
}

.pillar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pillar-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a8a39a;
}
.pillar-big {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.pillar-big em {
  color: #c84a1f;
  font-style: italic;
}
.pillar p {
  font-size: 13px;
  color: #6b6760;
  line-height: 1.5;
}

/* ── Footer ── */
.lfoot {
  border-top: 1px solid #e8e2d5;
  padding: 22px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #a8a39a;
}
.lfoot a {
  color: #6b6760;
  text-decoration: none;
}
.lfoot a:hover {
  color: #c84a1f;
}

/* ── Responsive ── */
@media (max-width: 760px) {
  .doors {
    grid-template-columns: 1fr;
  }
  .belief {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 32px 20px;
  }
  .links {
    display: none;
  }
  .lnav {
    padding: 0 20px;
    gap: 12px;
  }
  .lfoot {
    padding: 22px 20px;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  .stats-strip {
    grid-template-columns: 1fr;
  }
  .stat-item {
    border-right: none;
    border-bottom: 1px solid var(--line);
    padding: 20px 24px;
  }
  .how-section {
    grid-template-columns: 1fr;
  }
  .how-divider {
    height: 1px;
    width: 100%;
  }
  .how-col {
    padding: 32px 20px;
  }
  .subhead-wrap {
    padding: 0 4px;
  }
}
</style>
