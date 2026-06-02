<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: 'guest' })

const { t } = useI18n()
const colorMode = useColorMode()

const showPortalModal = ref(false)
const portalIntent = ref<'login' | 'signup'>('login')
const howTab = ref<'companies' | 'candidates'>('companies')
const navScrolled = ref(false)
const mobileMenuOpen = ref(false)

function openPortalModal(intent: 'login' | 'signup' = 'login') {
  portalIntent.value = intent
  showPortalModal.value = true
}

async function goToHR() {
  showPortalModal.value = false
  await navigateTo(portalIntent.value === 'signup' ? '/employer/signup' : '/employer/login')
}

async function goToCandidate() {
  showPortalModal.value = false
  await navigateTo('/candidate/login')
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showPortalModal.value = false
    mobileMenuOpen.value = false
  }
}

function onScroll() {
  navScrolled.value = window.scrollY > 10
}

onMounted(() => {
  window.addEventListener('keydown', onEsc)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('keydown', onEsc)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="landing">
    <!-- ── Nav ── -->
    <nav class="lnav" :class="{ 'lnav--scrolled': navScrolled }">
      <NuxtLink to="/" class="brand">
        <div class="brand-mark">m</div>
        <div class="brand-name">my<em>-hr</em></div>
      </NuxtLink>
      <div class="links">
        <a href="#how-it-works">{{ t('landing.navHowItWorks') }}</a>
        <NuxtLink to="/employer/signup">{{ t('landing.navForCompanies') }}</NuxtLink>
        <a href="#for-candidates">{{ t('landing.navForCandidates') }}</a>
        <a href="#belief">{{ t('landing.navManifesto') }}</a>
      </div>
      <div class="lnav-right">
        <span class="live-pill">
          <span class="live-dot" />
          Agent · live
        </span>
        <button
          type="button"
          class="icon-btn"
          :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            style="width: 16px; height: 16px"
          />
        </button>
        <button class="signin-btn" @click="openPortalModal('login')">
          {{ t('landing.signIn') }}
        </button>
        <button
          type="button"
          class="hamburger"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <UIcon
            :name="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
            style="width: 20px; height: 20px"
          />
        </button>
      </div>
    </nav>

    <!-- ── Mobile Menu ── -->
    <Transition name="mobile-menu">
      <div v-if="mobileMenuOpen" class="mobile-menu" @click.self="mobileMenuOpen = false">
        <div class="mobile-menu-panel">
          <a href="#how-it-works" class="mobile-link" @click="mobileMenuOpen = false">{{
            t('landing.navHowItWorks')
          }}</a>
          <NuxtLink to="/employer/signup" class="mobile-link" @click="mobileMenuOpen = false">{{
            t('landing.navForCompanies')
          }}</NuxtLink>
          <a href="#for-candidates" class="mobile-link" @click="mobileMenuOpen = false">{{
            t('landing.navForCandidates')
          }}</a>
          <a href="#belief" class="mobile-link" @click="mobileMenuOpen = false">{{
            t('landing.navManifesto')
          }}</a>
          <div class="mobile-menu-divider" />
          <button
            class="mobile-signin"
            @click="
              openPortalModal('login');
              mobileMenuOpen = false;
            "
          >
            {{ t('landing.signIn') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Dark Hero ── -->
    <section class="hero-wrap">
      <div class="hero">
        <div class="hero-content">
          <span class="eyebrow-pill">
            <span class="eyebrow-dot" />
            {{ t('landing.eyebrow') }}
          </span>
          <h1 class="headline">
            {{ t('landing.headline') }}<br />
            <em>{{ t('landing.headlineEm') }}</em>
          </h1>
          <p class="hero-body">{{ t('landing.subheadCompany') }}</p>
          <div class="hero-ctas">
            <NuxtLink to="/employer/signup" class="cta-primary">
              {{ t('landing.doorCompanyCta') }}
            </NuxtLink>
            <NuxtLink to="/candidate/login" class="cta-secondary">
              {{ t('landing.doorCandidateCtaNew') }}
            </NuxtLink>
          </div>
        </div>
        <div class="hero-mockup" aria-hidden="true">
          <div class="mockup-card">
            <div class="mockup-header">
              <div class="mockup-dots">
                <span class="mdot mdot--r" /><span class="mdot mdot--y" /><span
                  class="mdot mdot--g"
                />
              </div>
              <span class="mockup-title">Active Pipeline</span>
            </div>
            <div class="mockup-rows">
              <div class="mockup-row">
                <div class="mockup-avatar">A</div>
                <div class="mockup-info">
                  <span class="mockup-name">Alex Ivanov</span>
                  <span class="mockup-role">Product Designer</span>
                </div>
                <span class="mockup-chip chip--interview">Interview</span>
              </div>
              <div class="mockup-row">
                <div class="mockup-avatar mockup-avatar--2">S</div>
                <div class="mockup-info">
                  <span class="mockup-name">Sara Kim</span>
                  <span class="mockup-role">Frontend Eng</span>
                </div>
                <span class="mockup-chip chip--offered">Offered</span>
              </div>
              <div class="mockup-row">
                <div class="mockup-avatar mockup-avatar--3">M</div>
                <div class="mockup-info">
                  <span class="mockup-name">Max Petrov</span>
                  <span class="mockup-role">Data Analyst</span>
                </div>
                <span class="mockup-chip chip--outreach">Outreach</span>
              </div>
            </div>
            <div class="mockup-footer">
              <span class="mockup-label">Hiring rate</span>
              <div class="mockup-bar">
                <div class="mockup-bar-fill" />
              </div>
              <span class="mockup-pct">73%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Stats Strip ── -->
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

    <!-- ── Dual Path Section ── -->
    <section id="paths" class="paths">
      <div class="path-row">
        <div class="path-text">
          <span class="path-ribbon">{{ t('landing.doorCompanyRibbon') }}</span>
          <h2 class="path-title">
            {{ t('landing.doorCompanyTitle') }}<br />
            <em>{{ t('landing.doorCompanyTitleEm') }}</em>
          </h2>
          <p class="path-body">{{ t('landing.doorCompanyBody') }}</p>
          <NuxtLink to="/employer/signup" class="path-cta"
            >{{ t('landing.doorCompanyCta') }}</NuxtLink
          >
        </div>
        <div class="path-steps">
          <div class="path-step">
            <span class="path-step-num">01</span>
            <div>
              <strong>{{ t('landing.companiesStep1Title') }}</strong>
              <p>{{ t('landing.companiesStep1Body') }}</p>
            </div>
          </div>
          <div class="path-connector" />
          <div class="path-step">
            <span class="path-step-num">02</span>
            <div>
              <strong>{{ t('landing.companiesStep2Title') }}</strong>
              <p>{{ t('landing.companiesStep2Body') }}</p>
            </div>
          </div>
          <div class="path-connector" />
          <div class="path-step">
            <span class="path-step-num">03</span>
            <div>
              <strong>{{ t('landing.companiesStep3Title') }}</strong>
              <p>{{ t('landing.companiesStep3Body') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="path-divider" />

      <div id="for-candidates" class="path-row path-row--reverse">
        <div class="path-text">
          <span class="path-ribbon path-ribbon--candidate">{{
            t('landing.doorCandidateRibbon')
          }}</span>
          <h2 class="path-title">
            {{ t('landing.doorCandidateTitle') }}<br />
            <em>{{ t('landing.doorCandidateTitleEm') }}</em>
          </h2>
          <p class="path-body">{{ t('landing.doorCandidateBodyNew') }}</p>
          <NuxtLink to="/candidate/login" class="path-cta path-cta--candidate"
            >{{ t('landing.doorCandidateCtaNew') }}</NuxtLink
          >
        </div>
        <div class="path-steps">
          <div class="path-step">
            <span class="path-step-num path-step-num--candidate">01</span>
            <div>
              <strong>{{ t('landing.candidatesStep1Title') }}</strong>
              <p>{{ t('landing.candidatesStep1Body') }}</p>
            </div>
          </div>
          <div class="path-connector path-connector--candidate" />
          <div class="path-step">
            <span class="path-step-num path-step-num--candidate">02</span>
            <div>
              <strong>{{ t('landing.candidatesStep2Title') }}</strong>
              <p>{{ t('landing.candidatesStep2Body') }}</p>
            </div>
          </div>
          <div class="path-connector path-connector--candidate" />
          <div class="path-step">
            <span class="path-step-num path-step-num--candidate">03</span>
            <div>
              <strong>{{ t('landing.candidatesStep3Title') }}</strong>
              <p>{{ t('landing.candidatesStep3Body') }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How It Works (tabbed) ── -->
    <section id="how-it-works" class="how-section">
      <div class="how-header">
        <div class="how-tab-group">
          <button
            :class="['how-tab', { 'how-tab--active': howTab === 'companies' }]"
            @click="howTab = 'companies'"
          >
            {{ t('landing.companiesHowLabel') }}
          </button>
          <button
            :class="['how-tab', { 'how-tab--active how-tab--candidate': howTab === 'candidates' }]"
            @click="howTab = 'candidates'"
          >
            {{ t('landing.candidatesHowLabel') }}
          </button>
        </div>
      </div>

      <Transition name="tab-fade" mode="out-in">
        <div v-if="howTab === 'companies'" key="companies" class="how-steps-row">
          <div class="how-step-block">
            <span class="how-step-num">01</span>
            <strong>{{ t('landing.companiesStep1Title') }}</strong>
            <p>{{ t('landing.companiesStep1Body') }}</p>
          </div>
          <div class="how-arrow">→</div>
          <div class="how-step-block">
            <span class="how-step-num">02</span>
            <strong>{{ t('landing.companiesStep2Title') }}</strong>
            <p>{{ t('landing.companiesStep2Body') }}</p>
          </div>
          <div class="how-arrow">→</div>
          <div class="how-step-block">
            <span class="how-step-num">03</span>
            <strong>{{ t('landing.companiesStep3Title') }}</strong>
            <p>{{ t('landing.companiesStep3Body') }}</p>
          </div>
        </div>
        <div v-else key="candidates" class="how-steps-row">
          <div class="how-step-block how-step-block--candidate">
            <span class="how-step-num how-step-num--candidate">01</span>
            <strong>{{ t('landing.candidatesStep1Title') }}</strong>
            <p>{{ t('landing.candidatesStep1Body') }}</p>
          </div>
          <div class="how-arrow how-arrow--candidate">→</div>
          <div class="how-step-block how-step-block--candidate">
            <span class="how-step-num how-step-num--candidate">02</span>
            <strong>{{ t('landing.candidatesStep2Title') }}</strong>
            <p>{{ t('landing.candidatesStep2Body') }}</p>
          </div>
          <div class="how-arrow how-arrow--candidate">→</div>
          <div class="how-step-block how-step-block--candidate">
            <span class="how-step-num how-step-num--candidate">03</span>
            <strong>{{ t('landing.candidatesStep3Title') }}</strong>
            <p>{{ t('landing.candidatesStep3Body') }}</p>
          </div>
        </div>
      </Transition>

      <div class="how-cta-row">
        <NuxtLink v-if="howTab === 'companies'" to="/employer/signup" class="how-cta">
          {{ t('landing.doorCompanyCta') }}
        </NuxtLink>
        <NuxtLink v-else to="/candidate/login?mode=signup" class="how-cta how-cta--candidate">
          {{ t('landing.doorCandidateCtaNew') }}
        </NuxtLink>
      </div>
    </section>

    <!-- ── Belief ── -->
    <section id="belief" class="belief">
      <div class="belief-header">
        <span class="belief-quote">"</span>
        <h3 class="belief-title">
          {{ t('landing.beliefTitle') }}<br />
          <em>{{ t('landing.beliefTitleEm') }}</em> {{ t('landing.beliefTitleEnd') }}
        </h3>
      </div>
      <div class="belief-pillars">
        <div class="belief-pillar">
          <span class="belief-num">01</span>
          <div class="belief-pillar-content">
            <span class="pillar-label">{{ t('landing.pillar1Label') }}</span>
            <span class="pillar-big">{{ t('landing.pillar1Title') }}</span>
            <p>{{ t('landing.pillar1Body') }}</p>
          </div>
        </div>
        <div class="belief-pillar belief-pillar--right">
          <span class="belief-num">02</span>
          <div class="belief-pillar-content">
            <span class="pillar-label">{{ t('landing.pillar2Label') }}</span>
            <span class="pillar-big"
              ><em>{{ t('landing.pillar2Title') }}</em></span
            >
            <p>{{ t('landing.pillar2Body') }}</p>
          </div>
        </div>
        <div class="belief-pillar">
          <span class="belief-num">03</span>
          <div class="belief-pillar-content">
            <span class="pillar-label">{{ t('landing.pillar3Label') }}</span>
            <span class="pillar-big">{{ t('landing.pillar3Title') }}</span>
            <p>{{ t('landing.pillar3Body') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Portal Modal ── -->
    <Teleport to="body">
      <Transition name="portal-fade">
        <div v-if="showPortalModal" class="portal-overlay" @click.self="showPortalModal = false">
          <div class="portal-modal">
            <button class="portal-close" aria-label="Close" @click="showPortalModal = false">
              <UIcon name="i-heroicons-x-mark" style="width: 14px; height: 14px" />
            </button>
            <p class="portal-eyebrow">SIGN IN AS</p>
            <h2 class="portal-heading">Choose your<br /><em>portal</em></h2>
            <div class="portal-cards">
              <button class="portal-card" @click="goToHR">
                <span class="portal-card-icon">🏢</span>
                <strong>HR / Company</strong>
                <span>Post jobs, source candidates,<br />hire with AI.</span>
              </button>
              <button class="portal-card portal-card--candidate" @click="goToCandidate">
                <span class="portal-card-icon">👤</span>
                <strong>Candidate</strong>
                <span>Find your next opportunity<br />& track applications.</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Footer ── -->
    <footer class="lfoot">
      <div class="lfoot-brand">
        <span class="lfoot-logo">my<em>-hr</em></span>
        <span class="lfoot-tagline">Hiring, rethought.</span>
      </div>
      <div class="lfoot-links">
        <NuxtLink to="/terms">{{ t('landing.navPricing') }}</NuxtLink>
        <NuxtLink to="/employer/login">{{ t('auth.login') }}</NuxtLink>
        <NuxtLink to="/candidate/login">{{ t('landing.navForCandidates') }}</NuxtLink>
      </div>
      <span class="lfoot-copy">© 2025 my-hr</span>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   Base
═══════════════════════════════════════════ */
.landing {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════════
   Nav
═══════════════════════════════════════════ */
.lnav {
  height: 64px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 32px;
  position: sticky;
  top: 0;
  background: transparent;
  z-index: 100;
  border-bottom: 1px solid transparent;
  transition:
    background 0.25s,
    border-color 0.25s,
    backdrop-filter 0.25s;
}
.lnav--scrolled {
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom-color: var(--line-soft);
}

/* Nav contrast overrides when transparent over dark hero */
.lnav:not(.lnav--scrolled) .brand-name,
.lnav:not(.lnav--scrolled) .brand-mark,
.lnav:not(.lnav--scrolled) .links a,
.lnav:not(.lnav--scrolled) .icon-btn,
.lnav:not(.lnav--scrolled) .hamburger {
  color: rgba(245, 241, 234, 0.85);
}
.lnav:not(.lnav--scrolled) .brand-mark {
  background: #f5f1ea;
  color: #15140f;
}
.lnav:not(.lnav--scrolled) .links a:hover,
.lnav:not(.lnav--scrolled) .icon-btn:hover,
.lnav:not(.lnav--scrolled) .hamburger:hover {
  color: #fff;
}
.lnav:not(.lnav--scrolled) .signin-btn {
  border-color: rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #f5f1ea;
}
.lnav:not(.lnav--scrolled) .signin-btn:hover {
  background: #f5f1ea;
  color: #15140f;
  border-color: #f5f1ea;
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
  background: var(--ink);
  color: var(--bg);
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
  color: var(--ink);
}
.brand-name em {
  font-style: italic;
  color: var(--accent);
}

.links {
  display: flex;
  gap: 22px;
}
.links a {
  font-size: 13px;
  color: var(--ink-muted);
  text-decoration: none;
  transition: color 0.12s;
}
.links a:hover {
  color: var(--ink);
}

.lnav-right {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--ink-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--ink);
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-muted);
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-elevated);
  letter-spacing: 0.04em;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
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
  font-size: 12px;
  letter-spacing: 0.04em;
  padding: 6px 14px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.signin-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

/* ═══════════════════════════════════════════
   Hero — dark, two-column
═══════════════════════════════════════════ */
.hero-wrap {
  background: #15140f;
  padding: 80px 40px 100px;
  position: relative;
  overflow: hidden;
}
.hero-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.hero-wrap::after {
  content: '';
  position: absolute;
  top: -180px;
  left: -120px;
  width: 640px;
  height: 640px;
  background: radial-gradient(circle, rgba(200, 74, 31, 0.14) 0%, transparent 65%);
  pointer-events: none;
  z-index: 1;
}

.hero {
  position: relative;
  z-index: 2;
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 72px;
  align-items: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.eyebrow-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: rgba(245, 241, 234, 0.85);
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  letter-spacing: 0.06em;
  align-self: flex-start;
}
.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}

.headline {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: clamp(52px, 7vw, 96px);
  line-height: 0.96;
  letter-spacing: -0.045em;
  color: #f5f1ea;
  max-width: 16ch;
  text-wrap: balance;
}
.headline em {
  font-style: italic;
  color: var(--accent);
}

.hero-body {
  font-size: 16px;
  color: rgba(245, 241, 234, 0.72);
  line-height: 1.6;
  max-width: 50ch;
}

.hero-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.cta-primary {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: #f5f1ea;
  color: #1a1a1a;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.15s,
    transform 0.15s;
}
.cta-primary:hover {
  background: #fff;
  transform: translateY(-1px);
}
.cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: transparent;
  color: rgba(245, 241, 234, 0.65);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.cta-secondary:hover {
  color: #f5f1ea;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

/* ── Mockup Panel ── */
.hero-mockup {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mockup-card {
  background: #1e1d17;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  box-shadow:
    0 48px 100px -24px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transform: rotate(1.5deg) translateY(-8px);
  transition: transform 0.3s ease;
}
.mockup-card:hover {
  transform: rotate(1.5deg) translateY(-16px) scale(1.01);
}

.mockup-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.mockup-dots {
  display: flex;
  gap: 5px;
}
.mdot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.mdot--r {
  background: #ff5f57;
}
.mdot--y {
  background: #ffbd2e;
}
.mdot--g {
  background: #28ca41;
}
.mockup-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.08em;
  margin-left: 4px;
}

.mockup-rows {
  padding: 12px 0;
}
.mockup-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  transition: background 0.12s;
}
.mockup-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.mockup-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(200, 74, 31, 0.25);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.mockup-avatar--2 {
  background: rgba(74, 124, 200, 0.25);
  color: #6b9ee0;
}
.mockup-avatar--3 {
  background: rgba(139, 92, 246, 0.25);
  color: #a78bfa;
}

.mockup-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mockup-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(245, 241, 234, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mockup-role {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

.mockup-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}
.chip--interview {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}
.chip--offered {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}
.chip--outreach {
  background: rgba(74, 124, 200, 0.2);
  color: #6b9ee0;
}

.mockup-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.mockup-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}
.mockup-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}
.mockup-bar-fill {
  width: 73%;
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #df9070);
  border-radius: 999px;
}
.mockup-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  min-width: 34px;
  text-align: right;
}

/* ═══════════════════════════════════════════
   Stats Strip
═══════════════════════════════════════════ */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--bg-deep);
  border-bottom: 1px solid var(--line);
}
.stat-item {
  padding: 40px 52px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-right: 1px solid var(--line);
}
.stat-item:last-child {
  border-right: none;
}
.stat-value {
  font-family: 'Fraunces', serif;
  font-size: clamp(44px, 5.5vw, 76px);
  letter-spacing: -0.05em;
  line-height: 1;
  color: var(--ink);
}
.stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-subtle);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ═══════════════════════════════════════════
   Dual Path Section
═══════════════════════════════════════════ */
.paths {
  background: var(--bg);
}

.path-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  max-width: 100%;
}
/* grid-column swap — no rtl hack */

.path-text {
  padding: 72px 60px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  border-right: 1px solid var(--line);
  justify-content: center;
}
.path-row--reverse .path-text {
  border-right: none;
  border-left: 1px solid var(--line);
}
@media (min-width: 901px) {
  .path-row--reverse .path-text {
    grid-column: 2;
    grid-row: 1;
    border-left: 1px solid var(--line);
  }
  .path-row--reverse .path-steps {
    grid-column: 1;
    grid-row: 1;
    border-right: 1px solid var(--line);
  }
}

.path-ribbon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.path-ribbon--candidate {
  color: var(--accent);
}

.path-title {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: clamp(32px, 3.5vw, 52px);
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
}
.path-title em {
  font-style: italic;
  color: var(--accent);
}

.path-body {
  font-size: 14px;
  color: var(--ink-muted);
  line-height: 1.6;
  max-width: 40ch;
}

.path-cta {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background: var(--ink);
  color: var(--bg);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
  align-self: flex-start;
}
.path-cta:hover {
  background: var(--accent);
}
.path-cta--candidate {
  background: var(--accent);
}
.path-cta--candidate:hover {
  background: var(--ink);
}

.path-steps {
  padding: 72px 60px;
  display: flex;
  flex-direction: column;
  gap: 0;
  justify-content: center;
  background: var(--bg-elevated);
}

.path-step {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.path-step-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-muted);
  letter-spacing: 0.06em;
  padding-top: 3px;
  min-width: 22px;
  flex-shrink: 0;
}
.path-step-num--candidate {
  color: var(--accent);
  opacity: 0.7;
}
.path-step strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  display: block;
  margin-bottom: 5px;
}
.path-step p {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.5;
  margin: 0;
}

.path-connector {
  width: 1px;
  height: 28px;
  background: var(--line);
  margin-left: 40px;
  flex-shrink: 0;
}
.path-connector--candidate {
  background: rgba(200, 74, 31, 0.45);
}

.path-divider {
  height: 1px;
  background: var(--line);
}

/* ═══════════════════════════════════════════
   How It Works (tabbed)
═══════════════════════════════════════════ */
.how-section {
  background: var(--bg);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 64px 40px;
  display: flex;
  flex-direction: column;
  gap: 48px;
  align-items: center;
}

.how-header {
  display: flex;
  justify-content: center;
}
.how-tab-group {
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-elevated);
  padding: 3px;
}
.how-tab {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 22px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--ink-subtle);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.how-tab--active {
  background: var(--ink);
  color: var(--bg);
}
.how-tab--candidate.how-tab--active {
  background: var(--accent);
  color: #f5f1ea;
}

.how-steps-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 0;
  max-width: 1000px;
  width: 100%;
  align-items: start;
}

.how-step-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 32px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.how-step-block--candidate {
  border-color: rgba(200, 74, 31, 0.35);
}

.how-step-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-subtle);
  letter-spacing: 0.06em;
}
.how-step-num--candidate {
  color: var(--accent);
  opacity: 0.7;
}
.how-step-block strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.how-step-block p {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.5;
  margin: 0;
}

.how-arrow {
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: var(--ink-subtle);
  font-size: 18px;
  margin-top: 40px;
}
.how-arrow--candidate {
  color: rgba(200, 74, 31, 0.4);
}

.how-cta-row {
  display: flex;
  justify-content: center;
}
.how-cta {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  background: var(--ink);
  color: var(--bg);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
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

/* Tab transition */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ═══════════════════════════════════════════
   Belief — editorial
═══════════════════════════════════════════ */
.belief {
  background: var(--bg-deep);
  border-top: 1px solid var(--line);
  padding: 80px 40px 96px;
  max-width: 100%;
}

.belief-header {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  align-items: start;
  max-width: 860px;
  margin: 0 auto 72px;
}
.belief-quote {
  font-family: 'Fraunces', serif;
  font-size: 120px;
  line-height: 0.7;
  color: var(--accent);
  font-style: italic;
  user-select: none;
}
.belief-title {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: clamp(28px, 3.5vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.03em;
  padding-top: 16px;
}
.belief-title em {
  font-style: italic;
  color: var(--accent);
}

.belief-pillars {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 860px;
  margin: 0 auto;
}

.belief-pillar {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 28px;
  padding: 36px 0;
  border-top: 1px solid var(--line);
  align-items: start;
}
.belief-pillar--right .belief-pillar-content {
  text-align: right;
}

.belief-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-muted);
  letter-spacing: 0.06em;
  padding-top: 6px;
}

.belief-pillar-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pillar-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-muted);
}
.pillar-big {
  font-family: 'Fraunces', serif;
  font-size: clamp(28px, 3vw, 42px);
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.pillar-big em {
  color: var(--accent);
  font-style: italic;
}
.belief-pillar-content p {
  font-size: 14px;
  color: var(--ink-muted);
  line-height: 1.6;
  max-width: 52ch;
}
.belief-pillar--right .belief-pillar-content p {
  margin-left: auto;
}

/* ═══════════════════════════════════════════
   Portal Modal
═══════════════════════════════════════════ */
.portal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.portal-modal {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 40px 36px 36px;
  width: 100%;
  max-width: 480px;
  position: relative;
  box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.2);
}
.portal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    background 0.12s,
    color 0.12s;
}
.portal-close:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.portal-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--ink-subtle);
  margin: 0 0 10px;
}
.portal-heading {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: 34px;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--ink);
  margin: 0 0 28px;
}
.portal-heading em {
  font-style: italic;
  color: var(--accent);
}
.portal-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.portal-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 22px 18px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--bg-elevated);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;
}
.portal-card:hover {
  border-color: var(--ink);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.12);
}
.portal-card--candidate:hover {
  border-color: var(--accent);
}
.portal-card-icon {
  font-size: 22px;
  line-height: 1;
}
.portal-card strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  display: block;
}
.portal-card span:last-child {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.45;
}
.portal-fade-enter-active,
.portal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.portal-fade-enter-from,
.portal-fade-leave-to {
  opacity: 0;
}
.portal-fade-enter-active .portal-modal,
.portal-fade-leave-active .portal-modal {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.portal-fade-enter-from .portal-modal,
.portal-fade-leave-to .portal-modal {
  transform: translateY(10px);
  opacity: 0;
}

/* ═══════════════════════════════════════════
   Footer
═══════════════════════════════════════════ */
.lfoot {
  background: var(--bg-deep);
  border-top: 1px solid var(--line);
  padding: 32px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.lfoot-brand {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lfoot-logo {
  font-family: 'Fraunces', serif;
  font-size: 18px;
  letter-spacing: -0.04em;
  color: var(--ink);
}
.lfoot-logo em {
  font-style: italic;
  color: var(--accent);
}
.lfoot-tagline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-muted);
  letter-spacing: 0.06em;
}

.lfoot-links {
  display: flex;
  gap: 22px;
}
.lfoot-links a {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-muted);
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.12s;
}
.lfoot-links a:hover {
  color: var(--accent);
}

.lfoot-copy {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-muted);
}

/* ═══════════════════════════════════════════
   Responsive
═══════════════════════════════════════════ */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
  }
  .hero-mockup {
    order: -1;
  }
  .mockup-card {
    max-width: 100%;
  }
  .path-row,
  .path-row--reverse {
    grid-template-columns: 1fr;
  }
  .path-text,
  .path-row--reverse .path-text {
    border-right: none;
    border-left: none;
    border-bottom: 1px solid var(--line);
    padding: 40px 32px;
  }
  .path-steps {
    padding: 40px 32px;
  }
  .how-steps-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .how-arrow {
    display: none;
  }
  .belief-header {
    grid-template-columns: auto 1fr;
    gap: 16px;
  }
  .belief-quote {
    font-size: 80px;
  }
  .belief-pillar--right .belief-pillar-content {
    text-align: left;
  }
  .belief-pillar--right .belief-pillar-content p {
    margin-left: 0;
  }
}

/* ═══════════════════════════════════════════
   Hamburger & Mobile Menu
═══════════════════════════════════════════ */
.hamburger {
  display: none;
  width: 44px;
  height: 44px;
  place-items: center;
  border: none;
  background: transparent;
  color: rgba(245, 241, 234, 0.7);
  cursor: pointer;
  border-radius: 8px;
  transition:
    background 0.12s,
    color 0.12s;
  flex-shrink: 0;
}
.hamburger:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f5f1ea;
}

.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
.mobile-menu-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 85vw);
  background: var(--bg-elevated);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 80px 32px 40px;
  gap: 4px;
}
.mobile-link {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: var(--ink-muted);
  text-decoration: none;
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
  transition: color 0.12s;
}
.mobile-link:hover {
  color: var(--ink);
}
.mobile-link:last-of-type {
  border-bottom: none;
}
.mobile-menu-divider {
  height: 1px;
  background: var(--line);
  margin: 16px 0;
}
.mobile-signin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: var(--ink);
  color: var(--bg);
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.mobile-signin:hover {
  background: var(--accent);
}

/* Mobile menu transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.2s ease;
}
.mobile-menu-enter-active .mobile-menu-panel,
.mobile-menu-leave-active .mobile-menu-panel {
  transition: transform 0.2s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}
.mobile-menu-enter-from .mobile-menu-panel,
.mobile-menu-leave-to .mobile-menu-panel {
  transform: translateX(100%);
}

@media (max-width: 760px) {
  .hamburger {
    display: grid;
  }
  .live-pill {
    display: none;
  }

  .hero-wrap {
    padding: 48px 24px 64px;
  }
  .lnav {
    padding: 0 20px;
    gap: 12px;
  }
  .links {
    display: none;
  }
  .stats-strip {
    grid-template-columns: 1fr;
  }
  .stat-item {
    border-right: none;
    border-bottom: 1px solid var(--line);
    padding: 28px 28px;
  }
  .stat-item:last-child {
    border-bottom: none;
  }
  .belief {
    padding: 48px 24px 64px;
  }
  .belief-header {
    margin-bottom: 40px;
  }
  .belief-quote {
    font-size: 64px;
  }
  .portal-cards {
    grid-template-columns: 1fr;
  }
  .portal-modal {
    padding: 32px 20px 24px;
  }
  .lfoot {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 24px;
  }
  .how-section {
    padding: 48px 24px;
  }
}
</style>
