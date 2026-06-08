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
          class="footer-brand"
          style="height: 18px; width: auto; display: block"
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
  background: var(--l-bg);
  color: var(--l-text);
  font-family: var(--l-sans);
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 0.5s ease,
    color 0.5s ease;
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
}
.landing-footer {
  border-top: 1px solid var(--l-line);
}
.footer-wrap {
  max-width: var(--l-maxw);
  margin: 0 auto;
  padding: 32px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.footer-brand {
  font-family: var(--l-sans);
  font-size: 18px;
  font-weight: 600;
  color: var(--l-text);
}
.footer-links {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.footer-links a {
  font-size: 14px;
  color: var(--l-muted);
  text-decoration: none;
  transition: color 0.12s;
}
.footer-links a:hover {
  color: var(--l-text);
}
.footer-copy {
  font-size: 13px;
  color: var(--l-muted);
}
</style>

<style>
/* ── Bold White + Gradient — employer landing ── */
.landing-shell[data-audience='employer'] {
  --l-bg: #ffffff;
  --l-surface: #ffffff;
  --l-surface-2: #f5f4f2;
  --l-text: #0f0d0b;
  --l-muted: #7a746d;
  --l-line: rgba(15, 13, 11, 0.1);
  --l-dot: rgba(15, 13, 11, 0.04);
  --l-green: #c84a1f;
  --l-green-soft: rgba(200, 74, 31, 0.12);
  --l-lilac: #7c6af5;
  --l-lilac-deep: #5b4fe8;
  --l-cta-text: #ffffff;
  --l-grad-a: #c84a1f;
  --l-grad-b: #f97316;
  --l-grad-c: #fbbf24;
  --l-hero-glow: rgba(200, 74, 31, 0.18);
}
.dark .landing-shell[data-audience='employer'] {
  --l-bg: #0d0c0b;
  --l-surface: #1a1918;
  --l-surface-2: #242320;
  --l-text: #f5f0eb;
  --l-muted: #a8a39b;
  --l-line: rgba(245, 240, 235, 0.1);
  --l-dot: rgba(245, 240, 235, 0.06);
  --l-green: #e05c2e;
  --l-green-soft: rgba(224, 92, 46, 0.15);
  --l-lilac: #9d8ff8;
  --l-lilac-deep: #7c6af5;
  --l-cta-text: #ffffff;
  --l-grad-a: #e05c2e;
  --l-grad-b: #fb923c;
  --l-grad-c: #fcd34d;
  --l-hero-glow: rgba(224, 92, 46, 0.15);
}
</style>
