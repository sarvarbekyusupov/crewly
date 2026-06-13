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
            Traditional recruiting agencies charge 15–25% retainers and bill regardless of outcome.
            Job boards surface unfiltered applications your team has to screen manually. LinkedIn
            sourcing requires days of outreach with single-digit response rates and no guarantee of
            quality or availability.
          </p>
          <p class="why-p fade">
            Crewly runs the full hiring cycle — sourcing, outreach, and AI-powered screening —
            without retainers or monthly fees. We search your ATS, our pre-screened candidate pool,
            and the open web simultaneously, conduct first-round screening conversations, and rank
            results by verified fit. You only meet candidates who confirmed interest and cleared
            your stated requirements.
          </p>
          <p class="why-p fade">
            We specialise in tech, product, engineering, design, and operations roles at companies
            across Uzbekistan, Central Asia, and beyond. Most roles receive a qualified shortlist
            within 3–5 business days. You pay 15% of first-year salary only on a signed offer — no
            payment, no penalty if no hire is made.
          </p>
        </div>
      </template>

      <template v-else>
        <h2 class="why-h fade">Why candidates trust Crewly</h2>
        <div class="why-grid">
          <p class="why-p fade">
            Most job platforms make you apply endlessly to roles that may or may not fit your
            background. Crewly works the opposite way: set your preferences once, and we match you
            to roles where you are genuinely competitive. Companies reach out to you — not the other
            way around.
          </p>
          <p class="why-p fade">
            We focus on full-time roles in tech, product, engineering, design, and operations at
            high-growth startups and established companies across Uzbekistan, Central Asia, and
            remote-first teams worldwide. Your profile stays private by default and is only shared
            with a company when there is a strong match and you approve the introduction.
          </p>
          <p class="why-p fade">
            Over 1,200 candidates have found roles through Crewly that matched their salary
            expectations, technical background, and location preferences. Average time from profile
            setup to first interview is under two weeks — no mass applying required.
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
