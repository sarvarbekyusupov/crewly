<script setup lang="ts">
const { audience } = useAudience()
</script>

<template>
  <div class="landing-shell" :data-audience="audience">
    <div class="site-header">
      <LandingAnnouncementBar />
      <LandingNav />
    </div>
    <main>
      <slot />
    </main>
    <footer class="landing-footer">
      <div class="footer-wrap">
        <img
          src="/crewly-logo-horizontal.svg"
          alt="Crewly"
          class="footer-brand block dark:hidden"
        />
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          class="footer-brand hidden dark:block"
        />
        <div class="footer-links">
          <NuxtLink to="/terms">Terms</NuxtLink>
          <NuxtLink to="/employer/signup">For companies</NuxtLink>
          <NuxtLink to="/candidate/login">For candidates</NuxtLink>
          <NuxtLink to="/employer/login">Login</NuxtLink>
        </div>
        <span class="footer-copy">© {{ new Date().getFullYear() }} Crewly</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-shell {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(var(--grid-color) 1px, transparent 1px), var(--ld-bg);
  background-size:
    28px 28px,
    auto;
  color: var(--ld-t1);
  font-family: 'Manrope', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 0.22s,
    color 0.22s;
}
.landing-shell::before {
  content: '';
  position: absolute;
  top: -180px;
  left: 50%;
  width: 900px;
  height: 600px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(91, 106, 245, 0.18) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: glow-drift 10s ease-in-out infinite;
  will-change: transform, opacity;
}
@keyframes glow-drift {
  0% {
    transform: translateX(-50%) scale(1);
    opacity: 0.8;
  }
  30% {
    transform: translateX(-42%) scale(1.08);
    opacity: 1;
  }
  60% {
    transform: translateX(-58%) scale(0.96);
    opacity: 0.85;
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 0.8;
  }
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
main {
  flex: 1;
  overflow-x: hidden;
  position: relative;
  z-index: 1;
}
.landing-footer {
  border-top: 1px solid var(--ld-bd2);
}
.footer-wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-brand {
  height: 20px;
  width: auto;
}
.footer-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-links a {
  font-size: 12.5px;
  color: var(--ld-t3);
  text-decoration: none;
  transition: color 0.12s;
}
.footer-links a:hover {
  color: var(--ld-t2);
}
.footer-copy {
  font-size: 12px;
  color: var(--ld-t3);
}
@media (max-width: 768px) {
  .footer-wrap {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .footer-wrap {
    padding: 20px 16px;
    gap: 12px;
  }
  .footer-links {
    gap: 12px;
  }
}
</style>

<style>
/* ── Landing design tokens (light) ── */
.landing-shell {
  --ld-bg: #f7f6f3;
  --ld-bg2: #eeecea;
  --ld-surf: #ffffff;
  --ld-surf2: #f4f2ee;
  --ld-bd: #e2e0da;
  --ld-bd2: #eceae5;
  --ld-acc: #4252e8;
  --ld-acc-h: #3545d8;
  --ld-acc-s: #eef0fd;
  --ld-acc-t: #3848d6;
  --ld-t1: #0f0f12;
  --ld-t2: #585866;
  --ld-t3: #9898a8;
  --ld-green: #16a34a;
  --ld-nav: rgba(247, 246, 243, 0.92);
  --ld-sh: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 4px 28px rgba(0, 0, 0, 0.07);
}

/* ── Landing design tokens (dark) ── */
.dark .landing-shell {
  --ld-bg: #0c0d0f;
  --ld-bg2: #111318;
  --ld-surf: #141519;
  --ld-surf2: #1b1d24;
  --ld-bd: #242630;
  --ld-bd2: #1d1f28;
  --ld-acc: #5b6af5;
  --ld-acc-h: #6b7af7;
  --ld-acc-s: #151828;
  --ld-acc-t: #8b98fa;
  --ld-t1: #eeeef2;
  --ld-t2: #888899;
  --ld-t3: #4e505e;
  --ld-green: #22c55e;
  --ld-nav: rgba(12, 13, 15, 0.88);
  --ld-sh: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 20px 60px rgba(0, 0, 0, 0.55);
}

/* ── Bold White + Gradient — employer landing ── */
.landing-shell[data-audience='employer'] {
  --l-bg: #f7f6f3;
  --l-surface: #ffffff;
  --l-surface-2: #eeecea;
  --l-text: #0f0f12;
  --l-muted: #585866;
  --l-line: rgba(15, 15, 18, 0.1);
  --l-dot: rgba(15, 15, 18, 0.04);
  --l-green: #4252e8;
  --l-green-soft: rgba(66, 82, 232, 0.12);
  --l-lilac: #4252e8;
  --l-lilac-deep: #3545d8;
  --l-cta-text: #ffffff;
  --l-grad-a: #4252e8;
  --l-grad-b: #7c6af5;
  --l-grad-c: #a78bfa;
  --l-hero-glow: rgba(66, 82, 232, 0.18);
}
.dark .landing-shell[data-audience='employer'] {
  --l-bg: #0c0d0f;
  --l-surface: #141519;
  --l-surface-2: #1b1d24;
  --l-text: #eeeef2;
  --l-muted: #888899;
  --l-line: rgba(238, 238, 242, 0.1);
  --l-dot: rgba(238, 238, 242, 0.06);
  --l-green: #5b6af5;
  --l-green-soft: rgba(91, 106, 245, 0.15);
  --l-lilac: #5b6af5;
  --l-lilac-deep: #6b7af7;
  --l-cta-text: #ffffff;
  --l-grad-a: #5b6af5;
  --l-grad-b: #818cf8;
  --l-grad-c: #a5b4fc;
  --l-hero-glow: rgba(91, 106, 245, 0.15);
}
</style>
