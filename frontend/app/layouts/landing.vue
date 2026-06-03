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
        <span class="footer-brand">myHR</span>
        <div class="footer-links">
          <NuxtLink to="/terms">Terms</NuxtLink>
          <NuxtLink to="/employer/signup">For companies</NuxtLink>
          <NuxtLink to="/candidate/login">For candidates</NuxtLink>
          <NuxtLink to="/employer/login">Login</NuxtLink>
        </div>
        <span class="footer-copy">© {{ new Date().getFullYear() }} myHR</span>
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
