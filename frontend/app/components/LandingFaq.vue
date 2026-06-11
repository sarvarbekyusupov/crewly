<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()

const openIndex = ref<number | null>(null)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}

const employerFaqs = [
  {
    q: 'What does it cost?',
    a: '15% of first-year salary, billed only on a signed offer. No setup fees, no monthly charge, no commitment.',
  },
  {
    q: 'Where do you find candidates?',
    a: 'Our pre-screened talent pool, your ATS or referral network, and the open web — searched in parallel and ranked into one shortlist.',
  },
  {
    q: 'How quickly will I see candidates?',
    a: 'Most companies receive their first shortlist within a few days of briefing us.',
  },
  { q: "What if we don't hire anyone?", a: 'You owe nothing. No hire, no invoice — ever.' },
]

const candidateFaqs = [
  {
    q: 'Is Crewly free for candidates?',
    a: 'Yes — always. Crewly is completely free for candidates. Companies pay us when they make a hire.',
  },
  {
    q: 'What kinds of roles does Crewly have?',
    a: 'We focus on full-time roles at high-growth tech companies — product, engineering, design, and go-to-market. Mostly Series A to post-IPO.',
  },
  {
    q: "Will companies know I'm looking?",
    a: "Only when you're ready. Your profile is private by default. We only share it with a company when you've approved the match.",
  },
  {
    q: 'How long does it take to hear back?',
    a: 'Most candidates get their first match within a week of onboarding. Active roles move fast — we aim to get you into interviews within 2–3 weeks.',
  },
]
</script>

<template>
  <section class="sec">
    <div class="wrap">
      <div class="sec-header">
        <div class="sec-lbl fade">FAQ</div>
        <div class="sec-h fade">
          {{ audience === 'employer' ? 'Common questions' : 'Questions from candidates' }}
        </div>
      </div>

      <div class="faq-wrap">
        <div
          v-for="(item, i) in audience === 'employer' ? employerFaqs : candidateFaqs"
          :key="i"
          class="faq-item"
          :class="{ open: openIndex === i }"
        >
          <button class="faq-q" @click="toggle(i)">
            {{ item.q }}
            <span class="faq-ico">+</span>
          </button>
          <div class="faq-a">{{ item.a }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sec {
  padding: 0 0 48px;
}
.wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}
.sec-header {
  text-align: center;
  margin-bottom: 40px;
}
.sec-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ld-acc-t);
  margin-bottom: 10px;
}
.sec-h {
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--ld-t1);
}
.faq-wrap {
  max-width: 640px;
  margin: 0 auto;
  border: 1px solid var(--ld-bd2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ld-bd2);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.faq-item {
  background: var(--ld-bg);
}
.faq-q {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ld-t1);
  text-align: left;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
  transition: background 0.15s;
}
.faq-q:hover {
  background: var(--ld-surf);
}
.faq-ico {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--ld-bd);
  color: var(--ld-t3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition:
    transform 0.3s,
    background 0.2s,
    color 0.2s;
}
.faq-item.open .faq-ico {
  transform: rotate(45deg);
  background: var(--ld-acc-s);
  color: var(--ld-acc-t);
  border-color: transparent;
}
.faq-a {
  max-height: 0;
  overflow: hidden;
  padding: 0 22px;
  font-size: 13.5px;
  color: var(--ld-t2);
  line-height: 1.75;
  transition:
    max-height 0.35s ease,
    padding 0.3s;
}
.faq-item.open .faq-a {
  max-height: 200px;
  padding: 0 22px 18px;
}
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
</style>
