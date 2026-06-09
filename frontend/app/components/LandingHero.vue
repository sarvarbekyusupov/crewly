<script setup lang="ts">
const props = defineProps<{ audience: 'employer' | 'candidate' }>()
const waitlistMode = useRuntimeConfig().public.waitlistMode as boolean

onMounted(() => {
  if (props.audience === 'employer') {
    const fills = document.querySelectorAll<HTMLElement>('.cand-fill')
    fills.forEach((fill, i) => {
      const target = fill.style.width
      fill.style.width = '0'
      fill.style.transition = `width 0.55s cubic-bezier(0.4,0,0.2,1) ${0.55 + i * 0.18}s`
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fill.style.width = target
        }),
      )
    })
  }
})
</script>

<template>
  <div class="hero">
    <!-- Left copy -->
    <div class="hero-copy">
      <template v-if="audience === 'employer'">
        <div class="hero-badge">
          <span class="badge-dot" />
          AI-native recruiting · waitlist open
        </div>
        <h1>Hire the right people,<br />without the search.</h1>
        <p class="hero-sub">
          Tell us the role. Our AI sources candidates, runs outreach, and screens them — you spend
          time only with people worth meeting.
        </p>
        <form id="waitlist" class="hero-form" @submit.prevent>
          <LandingWaitlistForm audience="employer" />
        </form>
        <p class="hero-micro">
          <b>43 companies</b> joined this month &nbsp;·&nbsp; No card required
        </p>
      </template>

      <template v-else>
        <div class="hero-badge">
          <span class="badge-dot" />
          For candidates · waitlist open
        </div>
        <h1>The right companies are already looking for you.</h1>
        <p class="hero-sub">
          Tell us what you're looking for. We surface you to top companies hiring your exact profile
          — no spam, no cold applications, no job boards.
        </p>
        <form id="waitlist" class="hero-form" @submit.prevent>
          <LandingWaitlistForm audience="candidate" />
        </form>
        <p class="hero-micro"><b>1,200+ candidates</b> placed · Free, always</p>
      </template>
    </div>

    <!-- Right demo card -->
    <div class="hero-art">
      <!-- Employer: shortlist card -->
      <div v-if="audience === 'employer'" class="hcard">
        <div class="hcard-bar">
          <span class="hbar-dot" style="background: #ff5f57" />
          <span class="hbar-dot" style="background: #febc2e" />
          <span class="hbar-dot" style="background: #28c840" />
          <span class="hcard-title">Crewly · Shortlist</span>
        </div>
        <div class="hcard-role-row">
          <div class="hcard-role-lbl">Active role</div>
          <div class="hcard-role-name">Product Manager</div>
          <div class="hcard-role-meta">San Francisco · 3 candidates ready</div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(52% 0.22 258)">SC</div>
          <div class="cand-info">
            <div class="cand-name">Sarah Chen</div>
            <div class="cand-sub">Senior PM · ex-Stripe</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">96%</span>
            <div class="cand-bar"><div class="cand-fill" style="width: 96%" /></div>
          </div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(52% 0.22 148)">AR</div>
          <div class="cand-info">
            <div class="cand-name">Alex Rivera</div>
            <div class="cand-sub">Product Lead · Figma</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">91%</span>
            <div class="cand-bar"><div class="cand-fill" style="width: 91%" /></div>
          </div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(52% 0.22 40)">JP</div>
          <div class="cand-info">
            <div class="cand-name">Jamie Park</div>
            <div class="cand-sub">PM III · Notion</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">87%</span>
            <div class="cand-bar"><div class="cand-fill" style="width: 87%" /></div>
          </div>
        </div>
        <div class="hcard-foot">
          <span class="hfoot-dot" />
          All 3 screened &amp; available to interview
        </div>
      </div>

      <!-- Candidate: matches card -->
      <div v-else class="hcard">
        <div class="hcard-bar">
          <span class="hbar-dot" style="background: #ff5f57" />
          <span class="hbar-dot" style="background: #febc2e" />
          <span class="hbar-dot" style="background: #28c840" />
          <span class="hcard-title">Crewly · Your matches</span>
        </div>
        <div class="hcard-role-row">
          <div class="hcard-role-lbl">Matched to your profile</div>
          <div class="hcard-role-name">Senior Product Manager</div>
          <div class="hcard-role-meta">3 new matches this week</div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(48% 0.22 258)">St</div>
          <div class="cand-info">
            <div class="cand-name">Stripe</div>
            <div class="cand-sub">Growth PM · Full-time</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">96% fit</span>
            <div class="cand-loc">San Francisco</div>
          </div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(48% 0.22 310)">Fi</div>
          <div class="cand-info">
            <div class="cand-name">Figma</div>
            <div class="cand-sub">Product Lead · Full-time</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">91% fit</span>
            <div class="cand-loc">New York</div>
          </div>
        </div>
        <div class="cand-row">
          <div class="av" style="background: oklch(48% 0.22 148)">No</div>
          <div class="cand-info">
            <div class="cand-name">Notion</div>
            <div class="cand-sub">PM III · Full-time</div>
          </div>
          <div class="cand-right">
            <span class="cand-pct">87% fit</span>
            <div class="cand-loc">Remote</div>
          </div>
        </div>
        <div class="hcard-foot">
          <span class="hfoot-dot" />
          All roles pre-screened &amp; actively hiring
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Hero layout ── */
.hero {
  max-width: 1440px;
  margin: 0 auto;
  padding: 88px 32px 80px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
}

/* ── Left copy ── */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px 4px 8px;
  border-radius: 100px;
  background: var(--ld-acc-s);
  border: 1px solid rgba(91, 106, 245, 0.18);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ld-acc-t);
  margin-bottom: 22px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ld-acc);
  flex-shrink: 0;
  animation: blink 2.4s ease infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

h1 {
  font-size: clamp(34px, 5vw, 58px);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.07;
  color: var(--ld-t1);
  margin: 0 0 18px;
}

.hero-sub {
  font-size: 16px;
  color: var(--ld-t2);
  line-height: 1.72;
  margin-bottom: 32px;
  max-width: 420px;
}

.hero-form {
  margin-bottom: 14px;
}

.hero-micro {
  font-size: 12.5px;
  color: var(--ld-t3);
}

.hero-micro b {
  color: var(--ld-t2);
  font-weight: 600;
}

/* ── Demo card ── */
.hero-art {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hcard {
  background: var(--ld-surf);
  border: 1px solid var(--ld-bd);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--ld-sh);
  width: 100%;
  max-width: 380px;
}

.hcard-bar {
  background: var(--ld-surf2);
  border-bottom: 1px solid var(--ld-bd2);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hbar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hcard-title {
  flex: 1;
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ld-t3);
}

.hcard-role-row {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--ld-bd2);
  animation: hcardFade 0.4s ease 0.1s both;
}

.hcard-role-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ld-t3);
  margin-bottom: 3px;
}

.hcard-role-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ld-t1);
}

.hcard-role-meta {
  font-size: 11.5px;
  color: var(--ld-t3);
  margin-top: 2px;
}

.cand-row {
  padding: 11px 16px;
  border-bottom: 1px solid var(--ld-bd2);
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s;
}
.cand-row:last-of-type {
  border-bottom: none;
}
.cand-row:hover {
  background: var(--ld-surf2);
}

.cand-row:nth-of-type(1) {
  animation: hcardSlide 0.35s ease 0.25s both;
}
.cand-row:nth-of-type(2) {
  animation: hcardSlide 0.35s ease 0.42s both;
}
.cand-row:nth-of-type(3) {
  animation: hcardSlide 0.35s ease 0.59s both;
}

@keyframes hcardFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes hcardSlide {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hcard-role-row,
  .cand-row,
  .hcard-foot {
    animation: none;
  }
}

.av {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.02em;
}

.cand-info {
  flex: 1;
  min-width: 0;
}

.cand-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ld-t1);
}

.cand-sub {
  font-size: 11.5px;
  color: var(--ld-t3);
  margin-top: 1px;
}

.cand-right {
  text-align: right;
  flex-shrink: 0;
}

.cand-pct {
  font-size: 13px;
  font-weight: 800;
  color: var(--ld-acc-t);
  display: block;
}

.cand-bar {
  width: 44px;
  height: 3px;
  border-radius: 2px;
  background: var(--ld-bd2);
  margin-top: 4px;
  overflow: hidden;
}

.cand-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--ld-acc);
  opacity: 0.6;
}

.cand-loc {
  font-size: 11px;
  color: var(--ld-t3);
  margin-top: 2px;
  white-space: nowrap;
}

.hcard-foot {
  padding: 9px 16px;
  background: var(--ld-bg2);
  border-top: 1px solid var(--ld-bd2);
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--ld-t3);
  font-weight: 500;
  animation: hcardFade 0.35s ease 0.75s both;
}

.hfoot-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ld-green);
  flex-shrink: 0;
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 60px 24px 56px;
  }

  .hero-art {
    order: -1;
  }

  .hcard {
    max-width: 100%;
  }
}
</style>
