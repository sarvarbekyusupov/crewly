<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
const waitlistMode = useRuntimeConfig().public.waitlistMode as boolean
</script>

<template>
  <section class="sec">
    <div class="wrap">
      <!-- Stats -->
      <div class="stats-row fade">
        <template v-if="audience === 'employer'">
          <div class="stat">
            <div class="stat-n"><em>43</em></div>
            <div class="stat-l">companies hired last month</div>
          </div>
          <div class="stat">
            <div class="stat-n"><em>2.4×</em></div>
            <div class="stat-l">faster than agency search</div>
          </div>
          <div class="stat">
            <div class="stat-n">$0</div>
            <div class="stat-l">until you make a hire</div>
          </div>
        </template>
        <template v-else>
          <div class="stat">
            <div class="stat-n"><em>1,200+</em></div>
            <div class="stat-l">candidates placed</div>
          </div>
          <div class="stat">
            <div class="stat-n"><em>18</em> days</div>
            <div class="stat-l">avg. time to first interview</div>
          </div>
          <div class="stat">
            <div class="stat-n">$0</div>
            <div class="stat-l">cost to candidates, forever</div>
          </div>
        </template>
      </div>

      <!-- CTA box -->
      <div class="cta-box fade">
        <h2 v-if="audience === 'employer'">
          Spend time with candidates who matter — not on sourcing.
        </h2>
        <h2 v-else>Your next role is one conversation away.</h2>
        <p v-if="audience === 'employer'">Join the waitlist and get early access.</p>
        <p v-else>Join the waitlist — we'll reach out to get you set up.</p>

        <div v-if="waitlistMode" id="waitlist" class="cta-form-wrap">
          <LandingWaitlistForm :audience="audience" />
        </div>
        <template v-else>
          <NuxtLink v-if="audience === 'employer'" to="/employer/signup" class="btn-cta"
            >Start hiring</NuxtLink
          >
          <NuxtLink v-else to="/candidate/login?mode=signup" class="btn-cta"
            >Build my profile</NuxtLink
          >
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sec {
  padding: 0 0 100px;
}
.wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--ld-bd2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ld-surf);
}

.stat {
  padding: 32px 28px;
}

.stat + .stat {
  border-left: 1px solid var(--ld-bd2);
}

.stat-n {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
  color: var(--ld-t1);
  margin-bottom: 5px;
}

.stat-n em {
  color: var(--ld-acc);
  font-style: normal;
}

.stat-l {
  font-size: 13px;
  color: var(--ld-t3);
}

/* CTA box */
.cta-box {
  border: 1px solid var(--ld-bd2);
  border-radius: 14px;
  padding: 72px 48px;
  text-align: center;
  background: var(--ld-surf);
}

.cta-box h2 {
  font-size: clamp(24px, 3vw, 40px);
  font-weight: 800;
  letter-spacing: -0.035em;
  max-width: 520px;
  margin: 0 auto 14px;
  color: var(--ld-t1);
  line-height: 1.15;
}

.cta-box > p {
  font-size: 15px;
  color: var(--ld-t2);
  margin-bottom: 32px;
}

.cta-form-wrap {
  max-width: 360px;
  margin: 0 auto;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  padding: 11px 24px;
  border-radius: 8px;
  background: var(--ld-acc);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  text-decoration: none;
  transition:
    background 0.15s,
    transform 0.15s;
}
.btn-cta:hover {
  background: var(--ld-acc-h);
  transform: translateY(-1px);
}

/* Fade */
.fade {
  opacity: 0;
  transform: translateY(14px);
  transition:
    opacity 0.5s,
    transform 0.5s;
}
.fade.in {
  opacity: 1;
  transform: none;
}

@media (max-width: 820px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .stat + .stat {
    border-left: none;
    border-top: 1px solid var(--ld-bd2);
  }
  .cta-box {
    padding: 48px 24px;
  }
}
</style>
