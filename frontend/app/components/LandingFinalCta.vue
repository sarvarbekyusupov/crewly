<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
const waitlistMode = useRuntimeConfig().public.waitlistMode as boolean
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
          One profile. Matched to the right role<br />from every corner of the market.
        </template>
      </h2>

      <div v-if="waitlistMode" id="waitlist" style="width: 100%; max-width: 440px; margin: 0 auto">
        <LandingWaitlistForm :audience="audience" />
      </div>
      <template v-else>
        <NuxtLink v-if="audience === 'employer'" to="/employer/signup" class="cta"
          >Start hiring</NuxtLink
        >
        <NuxtLink v-else to="/candidate/login?mode=signup" class="cta">Build My Profile</NuxtLink>
      </template>
    </div>
  </section>
</template>

<style scoped>
.final {
  text-align: center;
  padding: 110px 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #fff7f4 0%, #ffffff 45%, #fdf4ec 100%);
}
.glow {
  display: none;
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
.serif {
  font-family: var(--l-display);
}
h2 {
  font-weight: 400;
  font-size: 40px;
  line-height: 1.2;
  max-width: 680px;
  color: var(--l-text);
}
.cta {
  background: linear-gradient(135deg, var(--l-grad-a, #c84a1f), var(--l-grad-b, #f97316));
  color: #fff;
  font-family: var(--l-display);
  font-style: italic;
  font-weight: 600;
  padding: 14px 36px;
  border-radius: var(--l-pill);
  font-size: 18px;
  cursor: pointer;
  border: none;
  transition:
    opacity 0.2s,
    box-shadow 0.2s;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 4px 18px rgba(200, 74, 31, 0.28);
}
.cta:hover {
  opacity: 0.9;
  box-shadow: 0 6px 24px rgba(200, 74, 31, 0.4);
}
</style>
