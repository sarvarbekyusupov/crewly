<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <section class="final">
    <div class="glow" aria-hidden="true" />
    <div class="wrap">
      <div class="stats">
        <template v-if="audience === 'employer'">
          <span class="stat">43 companies hired last month</span>
          <span class="stat-dot" aria-hidden="true">·</span>
          <span class="stat">2.4× faster than agency search</span>
          <span class="stat-dot" aria-hidden="true">·</span>
          <span class="stat">No hire, no bill</span>
        </template>
        <template v-else>
          <span class="stat">12,000+ candidates matched</span>
          <span class="stat-dot" aria-hidden="true">·</span>
          <span class="stat">500+ roles live</span>
          <span class="stat-dot" aria-hidden="true">·</span>
          <span class="stat">Always free for candidates</span>
        </template>
      </div>

      <h2 class="serif">
        <template v-if="audience === 'employer'">
          Spend time with candidates who matter —<br />not on sourcing.
        </template>
        <template v-else>
          One profile. Matched to roles through<br />our network, yours, and the world.
        </template>
      </h2>

      <NuxtLink
        v-if="audience === 'employer'"
        to="/employer/signup"
        class="cta"
      >Start hiring</NuxtLink>
      <NuxtLink
        v-else
        to="/candidate/login?mode=signup"
        class="cta"
      >Build Your Profile</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.final {
  text-align: center;
  padding: 110px 0;
  position: relative;
  overflow: hidden;
}
.glow {
  position: absolute;
  bottom: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(circle, color-mix(in srgb, var(--l-green) 10%, transparent) 0%, transparent 70%);
  filter: blur(60px);
  pointer-events: none;
}
.wrap {
  position: relative;
  z-index: 1;
  max-width: var(--l-maxw);
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}
.stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
.stat {
  font-size: 13px;
  font-weight: 500;
  color: var(--l-muted);
  font-family: var(--l-sans);
}
.stat-dot {
  color: var(--l-line);
  font-size: 16px;
}
.serif { font-family: var(--l-display); }
h2 {
  font-weight: 400;
  font-size: 40px;
  line-height: 1.2;
  max-width: 680px;
  color: var(--l-text);
}
.cta {
  background: var(--l-green);
  color: var(--l-cta-text, #fff);
  font-family: var(--l-display);
  font-style: italic;
  font-weight: 600;
  padding: 14px 36px;
  border-radius: var(--l-pill);
  font-size: 18px;
  cursor: pointer;
  border: none;
  transition: filter 0.2s;
  text-decoration: none;
  display: inline-block;
}
.cta:hover { filter: brightness(1.05); }
</style>
