<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <div class="hero">
    <div class="hero-inner">
      <!-- Copy -->
      <div class="hero-copy">
        <template v-if="audience === 'employer'">
          <h1 class="headline serif">
            Hire the right people,<br />
            <span class="accent-italic">a lot faster.</span>
          </h1>
          <p class="sub">myHR is your AI hiring team. We source, screen, and shortlist — so you only spend time with candidates who matter.</p>
          <div class="search">
            <input placeholder="What role are you hiring for?" aria-label="Role to hire for" />
            <NuxtLink to="/employer/signup" class="search-btn">Get started →</NuxtLink>
          </div>
        </template>

        <template v-else>
          <h1 class="headline serif">
            Find work. Grow.<br />
            <span class="accent-italic">Get hired.</span>
          </h1>
          <p class="sub">Your AI career partner. Build your profile, see roles that actually fit, close skill gaps, and get reached out to when you're a match.</p>
          <div class="pill-cta-wrap">
            <NuxtLink to="/candidate/login?mode=signup" class="pill-cta">
              Start your career assessment
              <span class="round">→</span>
            </NuxtLink>
            <span class="browse">or <NuxtLink to="/candidate/login">browse open roles</NuxtLink></span>
          </div>
        </template>
      </div>

      <!-- Art -->
      <div class="art" aria-hidden="true">
        <!-- Employer: candidate shortlist -->
        <div v-if="audience === 'employer'" class="shortlist-card">
          <div class="sl-header">
            <span class="sl-title">Shortlist · Product Manager</span>
            <span class="sl-badge">3 ready</span>
          </div>
          <div class="sl-row sl-row--top">
            <div class="sl-avatar">SC</div>
            <div class="sl-info">
              <span class="sl-name">Sarah Chen</span>
              <span class="sl-meta">Senior PM · ex-Stripe</span>
            </div>
            <span class="sl-score sl-score--1">96%</span>
          </div>
          <div class="sl-row">
            <div class="sl-avatar sl-avatar--2">AR</div>
            <div class="sl-info">
              <span class="sl-name">Alex Rivera</span>
              <span class="sl-meta">Product Lead · Figma</span>
            </div>
            <span class="sl-score sl-score--2">91%</span>
          </div>
          <div class="sl-row">
            <div class="sl-avatar sl-avatar--3">JP</div>
            <div class="sl-info">
              <span class="sl-name">Jamie Park</span>
              <span class="sl-meta">PM III · Notion</span>
            </div>
            <span class="sl-score sl-score--3">87%</span>
          </div>
          <div class="sl-footer">✓ Screened &amp; available to interview</div>
        </div>

        <!-- Candidate: role matches -->
        <div v-else class="match-card">
          <div class="mc-header">
            <span class="mc-title">Your matches today</span>
            <span class="mc-new">12 new</span>
          </div>
          <div class="mc-role mc-role--top">
            <div class="mc-role-info">
              <span class="mc-role-name">Product Designer</span>
              <span class="mc-company">Stripe · Remote</span>
            </div>
            <span class="mc-fit">96% fit</span>
          </div>
          <div class="mc-role">
            <div class="mc-role-info">
              <span class="mc-role-name">Senior UX Designer</span>
              <span class="mc-company">Linear · San Francisco</span>
            </div>
            <span class="mc-fit mc-fit--2">91% fit</span>
          </div>
          <div class="mc-role">
            <div class="mc-role-info">
              <span class="mc-role-name">Design Engineer</span>
              <span class="mc-company">Vercel · Remote</span>
            </div>
            <span class="mc-fit mc-fit--3">88% fit</span>
          </div>
          <div class="mc-footer">↑ Profile 82% complete · 3 skills to unlock more</div>
        </div>

        <div class="grass" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  background-image: radial-gradient(var(--l-dot) 1.4px, transparent 1.4px);
  background-size: 26px 26px;
}
.hero::before {
  content: "";
  position: absolute;
  top: -15%;
  left: -5%;
  width: 50%;
  height: 60%;
  background: radial-gradient(circle, color-mix(in srgb, var(--l-green) 10%, transparent) 0%, transparent 70%);
  filter: blur(100px);
  z-index: 1;
  pointer-events: none;
}
.hero-inner {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
}
.hero-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 50%;
  padding: 80px 40px 80px clamp(28px, calc((100vw - 1180px) / 2 + 28px), 160px);
}
.serif {
  font-family: var(--l-display);
}
.headline {
  font-weight: 400;
  font-size: 68px;
  line-height: 1.02;
  letter-spacing: -0.5px;
  color: var(--l-text);
}
.accent-italic {
  font-style: italic;
  color: var(--l-green);
  background: linear-gradient(transparent 70%, color-mix(in srgb, var(--l-green) 22%, transparent) 0);
}
.sub {
  color: var(--l-muted);
  font-size: 19px;
  max-width: 480px;
  margin: 26px 0 32px;
  line-height: 1.55;
}

/* Employer search */
.search {
  display: flex;
  align-items: center;
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: var(--l-pill);
  padding: 7px 7px 7px 24px;
  max-width: 480px;
  gap: 8px;
}
.search input {
  flex: 1;
  background: none;
  border: none;
  color: var(--l-text);
  font-family: var(--l-sans);
  font-size: 17px;
  outline: none;
  min-width: 0;
}
.search input::placeholder {
  color: var(--l-muted);
}
.search-btn {
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0 22px;
  border-radius: var(--l-pill);
  background: var(--l-green);
  color: var(--l-cta-text, #fff);
  font-family: var(--l-sans);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: filter 0.15s;
}
.search-btn:hover {
  filter: brightness(1.05);
}

/* Candidate pill CTA */
.pill-cta-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.pill-cta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: var(--l-pill);
  padding: 8px 8px 8px 28px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  color: var(--l-text);
  transition: border-color 0.15s;
  width: fit-content;
}
.pill-cta:hover {
  border-color: var(--l-green);
}
.browse {
  display: block;
  margin-top: 14px;
  color: var(--l-muted);
  font-size: 15px;
}
.browse a {
  text-decoration: underline;
  color: var(--l-text);
}

/* Shared round arrow */
.round {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: var(--l-green);
  color: var(--l-cta-text, #fff);
  font-size: 20px;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  text-decoration: none;
  transition: filter 0.15s;
}
.round:hover {
  filter: brightness(1.05);
}

/* Art panel */
.art {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  left: 48%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Employer shortlist card ── */
.shortlist-card {
  width: clamp(300px, 32vw, 420px);
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: 20px;
  padding: 24px;
  transform: rotate(4deg) translateY(-20px);
  box-shadow: 0 60px 120px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.sl-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--l-muted);
}
.sl-badge {
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in srgb, var(--l-green) 25%, transparent);
  color: var(--l-green);
  padding: 3px 10px;
  border-radius: 999px;
}
.sl-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--l-surface-2);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid transparent;
}
.sl-row--top {
  border-color: color-mix(in srgb, var(--l-green) 40%, transparent);
}
.sl-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--l-green) 30%, var(--l-surface));
  color: var(--l-text);
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.sl-avatar--2 {
  background: color-mix(in srgb, var(--l-lilac) 40%, var(--l-surface));
}
.sl-avatar--3 {
  background: color-mix(in srgb, #7dd3fc 30%, var(--l-surface));
}
.sl-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sl-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--l-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sl-meta {
  font-size: 12px;
  color: var(--l-muted);
}
.sl-score {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.sl-score--1 {
  background: var(--l-green);
  color: #1a1a18;
}
.sl-score--2 {
  background: color-mix(in srgb, var(--l-green) 55%, transparent);
  color: var(--l-text);
}
.sl-score--3 {
  background: color-mix(in srgb, var(--l-green) 30%, transparent);
  color: var(--l-text);
}
.sl-footer {
  font-size: 12px;
  color: var(--l-muted);
  text-align: center;
  padding-top: 4px;
}

/* ── Candidate match card ── */
.match-card {
  width: clamp(300px, 32vw, 420px);
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: 20px;
  padding: 24px;
  transform: rotate(4deg) translateY(-20px);
  box-shadow: 0 60px 120px rgba(120, 90, 60, 0.28);
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.mc-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--l-muted);
}
.mc-new {
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in srgb, var(--l-lilac) 40%, transparent);
  color: var(--l-text);
  padding: 3px 10px;
  border-radius: 999px;
}
.mc-role {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--l-surface-2);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid transparent;
}
.mc-role--top {
  border-color: color-mix(in srgb, var(--l-green) 40%, transparent);
}
.mc-role-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mc-role-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--l-text);
}
.mc-company {
  font-size: 12px;
  color: var(--l-muted);
}
.mc-fit {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  background: var(--l-green);
  color: #1a1a18;
}
.mc-fit--2 {
  background: color-mix(in srgb, var(--l-green) 55%, transparent);
  color: var(--l-text);
}
.mc-fit--3 {
  background: color-mix(in srgb, var(--l-green) 30%, transparent);
  color: var(--l-text);
}
.mc-footer {
  font-size: 12px;
  color: var(--l-muted);
  text-align: center;
  padding-top: 4px;
}

/* Grass decoration */
.grass {
  position: absolute;
  bottom: 0;
  left: -20%;
  right: -5%;
  height: 260px;
  background: linear-gradient(transparent 5%, color-mix(in srgb, var(--l-green) 65%, var(--l-bg)));
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 7px);
  mask: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 7px);
}

@media (max-width: 880px) {
  .hero-inner {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .hero-copy {
    padding: 48px 28px;
    width: 100%;
  }
  .art {
    display: none;
  }
  .headline {
    font-size: 48px;
  }
}
</style>
