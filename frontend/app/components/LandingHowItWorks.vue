<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <section id="how-it-works" class="sec">
    <div class="wrap">
      <p class="sec-lbl fade">
        {{ audience === 'employer' ? 'How Crewly works' : 'How it works' }}
      </p>
      <h2 class="sec-h fade">
        <template v-if="audience === 'employer'">
          From brief to shortlist,<br />we handle everything.
        </template>
        <template v-else> Your profile does the work.<br />You show up to interviews. </template>
      </h2>

      <!-- Employer cards -->
      <div v-if="audience === 'employer'" class="feat-grid">
        <div class="feat fade">
          <div class="feat-n">01</div>
          <div class="feat-tag">Brief</div>
          <h3>We run the whole search for you</h3>
          <p>
            No software to configure. Tell us the role once — we source, screen, and deliver a
            shortlist ready to interview.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">02</div>
          <div class="feat-tag">Pricing</div>
          <h3>15% of salary. Only when you hire.</h3>
          <p>
            No setup fees. No monthly charge. You pay on a signed offer — not a penny before that.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">03</div>
          <div class="feat-tag">Reach</div>
          <h3>Our pool. Your network. The open web.</h3>
          <p>
            We search every channel in parallel — pre-screened pool, your ATS, and the web — into
            one shortlist.
          </p>
        </div>
      </div>

      <!-- Candidate cards -->
      <div v-else class="feat-grid">
        <div class="feat fade">
          <div class="feat-n">01</div>
          <div class="feat-tag">Profile</div>
          <h3>Tell us what you're looking for</h3>
          <p>
            Share your experience and what you want next. One conversation, no forms. Takes under 10
            minutes.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">02</div>
          <div class="feat-tag">Matching</div>
          <h3>We surface you to the right roles</h3>
          <p>
            Our AI matches your profile to active openings at top companies. Only relevant, real
            opportunities — no noise.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">03</div>
          <div class="feat-tag">Interviews</div>
          <h3>Meet companies that already want you</h3>
          <p>
            You only hear from us when there's a genuine match. No cold outreach, no generic job
            alerts.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sec {
  padding: 88px 0;
}
.wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
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
  margin: 0;
}

.feat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  border: 1px solid var(--ld-bd2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ld-bd2);
  margin-top: 48px;
}

.feat {
  background: var(--ld-bg);
  padding: 32px 28px;
  transition:
    background 0.2s,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.2s;
}
.feat:hover {
  background: var(--ld-surf);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
}

.feat-n {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--ld-t3);
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.feat-n::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ld-bd2);
}

.feat-tag {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ld-acc-t);
  background: var(--ld-acc-s);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.feat h3 {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ld-t1);
  margin-bottom: 8px;
  line-height: 1.25;
}

.feat p {
  font-size: 13.5px;
  color: var(--ld-t2);
  line-height: 1.7;
}

/* Fade animation */
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
  .feat-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .sec {
    padding: 56px 0;
  }
  .wrap {
    padding: 0 16px;
  }
  .feat {
    padding: 24px 20px;
  }
}
</style>
