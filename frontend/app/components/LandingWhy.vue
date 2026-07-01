<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <section class="sec">
    <div class="wrap">
      <template v-if="audience === 'employer'">
        <h2 class="why-h fade">Why companies choose Crewly</h2>
        <div class="why-grid">
          <p class="why-p fade">
            Agencies charge 15–25% retainers regardless of outcome. Job boards give you unfiltered
            CVs to screen manually. LinkedIn sourcing burns days for single-digit reply rates.
          </p>
          <p class="why-p fade">
            Crewly runs sourcing, outreach, and first-round screening — no retainers, no monthly
            fees. You meet only candidates who cleared your requirements and confirmed interest.
          </p>
          <p class="why-p fade">
            Tech, product, engineering, design, and ops across UZ, CIS, and remote. Shortlist in 3–5
            days. 15% of salary — only on a signed offer.
          </p>
        </div>
      </template>

      <template v-else>
        <h2 class="why-h fade">Why candidates trust Crewly</h2>
        <div class="why-grid">
          <p class="why-p fade">
            Most platforms make you apply endlessly to roles that may not fit. Crewly works the
            other way: set your preferences once, and companies come to you.
          </p>
          <p class="why-p fade">
            Tech, product, engineering, design, and ops — UZ, CIS, and remote-first. Your profile is
            private by default, shared only on a strong match with your approval.
          </p>
          <p class="why-p fade">
            Profile setup to first interview in under two weeks on average. No mass applying, no
            ghosting, no noise.
          </p>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.sec {
  padding: 72px 0 0;
}
.wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
  border-top: 1px solid var(--ld-bd2);
  padding-top: 72px;
}
.why-h {
  font-size: clamp(20px, 2.5vw, 30px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--ld-t1);
  margin: 0 0 40px;
}
.why-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
.why-p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ld-t2);
  margin: 0;
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
@media (prefers-reduced-motion: reduce) {
  .fade {
    transition: none;
  }
}
@media (max-width: 820px) {
  .why-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
@media (max-width: 480px) {
  .sec {
    padding: 48px 0 0;
  }
  .wrap {
    padding: 48px 16px 0;
  }
}
</style>
