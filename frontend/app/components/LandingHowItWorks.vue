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
            No software to configure, no onboarding calls, no ATS integration required. Tell us the
            role once — seniority, must-have skills, compensation range, and culture fit criteria.
            We source candidates from every channel, run AI-powered screening conversations, and
            deliver a ranked shortlist with match scores and call summaries. Most clients receive
            their first qualified shortlist within 3–5 business days.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">02</div>
          <div class="feat-tag">Pricing</div>
          <h3>15% of salary. Only when you hire.</h3>
          <p>
            No setup fees, no monthly subscription, no long-term contracts. You pay 15% of the
            candidate's first-year salary — and only after they sign an offer and join your team. If
            we don't find someone you want to hire, you owe nothing. We absorb the search cost and
            the risk so you don't have to.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">03</div>
          <div class="feat-tag">Reach</div>
          <h3>Our pool. Your network. The open web.</h3>
          <p>
            We search every channel simultaneously — our pre-screened talent pool, your internal ATS
            and referral network, and the open web including LinkedIn and niche job boards across
            Central Asia and beyond. Every candidate is ranked by fit score against your role's
            specific requirements and delivered in one unified shortlist with interview-ready notes.
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
            Share your experience and what you want next in one conversation — no CV upload forms,
            no LinkedIn prompts, no long questionnaires. Describe your background, salary
            expectations, preferred locations, and what the right company looks like to you. Your
            profile stays private by default and the whole setup takes under 10 minutes.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">02</div>
          <div class="feat-tag">Matching</div>
          <h3>We surface you to the right roles</h3>
          <p>
            Our AI scores your profile against active openings at companies across Uzbekistan,
            Central Asia, and remote-first teams worldwide. Every match is ranked by fit —
            accounting for your required skills, salary expectations, location preferences, and
            culture signals. You only hear about roles where you're genuinely competitive, not every
            opening that shares a keyword with your CV.
          </p>
        </div>
        <div class="feat fade">
          <div class="feat-n">03</div>
          <div class="feat-tag">Interviews</div>
          <h3>Meet companies that already want you</h3>
          <p>
            You hear from us only when a company is actively hiring and your profile is a strong fit
            for their open role. We make the introduction directly — companies have already reviewed
            your profile before reaching out. That means faster response times, more relevant
            conversations, and far fewer wasted interviews.
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
