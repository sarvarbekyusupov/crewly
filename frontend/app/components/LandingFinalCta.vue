<script setup lang="ts">
const props = defineProps<{ audience: 'employer' | 'candidate' }>()
const waitlistMode = useRuntimeConfig().public.waitlistMode as boolean
</script>

<template>
  <section class="sec">
    <div class="wrap">
      <div class="cta-box fade">
        <h2 v-if="props.audience === 'employer'">
          Spend time with candidates who matter — not on sourcing.
        </h2>
        <h2 v-else>Your next role is one conversation away.</h2>
        <p v-if="props.audience === 'employer'">Join the waitlist and get early access.</p>
        <p v-else>Join the waitlist — we'll reach out to get you set up.</p>

        <div v-if="waitlistMode" id="waitlist" class="cta-form-wrap">
          <LandingWaitlistForm :audience="props.audience" />
        </div>
        <template v-else>
          <NuxtLink v-if="props.audience === 'employer'" to="/employer/signup" class="btn-cta"
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
  padding: 0 0 40px;
}
.wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}

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

.fade {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.fade.in {
  opacity: 1;
  transform: none;
}

@media (max-width: 820px) {
  .cta-box {
    padding: 48px 24px;
  }
}

@media (max-width: 480px) {
  .wrap {
    padding: 0 16px;
  }
  .cta-box {
    padding: 36px 20px;
  }
  .cta-box > p {
    font-size: 14px;
  }
}
</style>
