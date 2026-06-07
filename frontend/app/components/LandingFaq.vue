<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <section class="faq-section">
    <div class="wrap">
      <h2 class="htitle serif">Common questions</h2>
      <div class="faq">
        <template v-if="audience === 'employer'">
          <details>
            <summary>What does it cost? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  15% of first-year salary, billed only on a signed offer. No setup fees, no monthly
                  charge, no commitment.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>Where do you find candidates? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  Our pre-screened talent pool, your ATS or referral network, and the open web —
                  searched in parallel and ranked into one shortlist.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>How quickly will I see candidates? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  Most companies receive their first shortlist within a few days of briefing us.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>What if we don't hire anyone? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>You owe nothing. No hire, no invoice — ever.</p>
              </div>
            </div>
          </details>
        </template>
        <template v-else>
          <details>
            <summary>Is this free for candidates? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  Always. Crewly is 100% free for candidates — employers pay when they make a hire.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>How does matching work? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  We score your profile against live roles from our network and the open web, then
                  rank by fit. You only hear from us when there's a real match.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>What if I'm not actively looking right now? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  Keep your profile active and we'll reach out when a role fits. No daily checking,
                  no cold applications.
                </p>
              </div>
            </div>
          </details>
          <details>
            <summary>What kind of roles do you have? <span class="pm">+</span></summary>
            <div class="faq-content">
              <div class="faq-inner">
                <p>
                  Tech, product, design, data, and ops — at startups and scale-ups, primarily in
                  Central Asia and remote-friendly companies.
                </p>
              </div>
            </div>
          </details>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-section {
  padding: 20px 0 90px;
}
.wrap {
  max-width: var(--l-maxw);
  margin: 0 auto;
  padding: 0 28px;
}
.htitle {
  text-align: center;
  font-weight: 400;
  font-size: 46px;
  margin-bottom: 48px;
  color: var(--l-text);
}
.serif {
  font-family: var(--l-display);
}
.faq {
  max-width: 760px;
  margin: 0 auto;
}
details {
  border-bottom: 1px solid var(--l-line);
  padding: 20px 4px;
}
summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-size: 19px;
  font-weight: 500;
  color: var(--l-text);
  font-family: var(--l-sans);
}
summary::-webkit-details-marker {
  display: none;
}
details[open] summary .pm {
  transform: rotate(45deg);
}
.pm {
  transition: transform 0.2s;
  color: var(--l-muted);
  flex-shrink: 0;
}

.faq-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
details[open] .faq-content {
  grid-template-rows: 1fr;
}
.faq-inner {
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
}
details[open] .faq-inner {
  opacity: 1;
  transition-delay: 0.08s;
}

.faq-inner p {
  color: var(--l-muted);
  margin-top: 12px;
  font-size: 16px;
  line-height: 1.6;
  font-family: var(--l-sans);
}
</style>
