<template>
  <section class="sec">
    <div class="wrap">
      <div class="sec-lbl fade">What hiring teams say</div>
      <div class="sec-h fade">Companies that stopped searching.</div>
      <div class="testi-grid">
        <div class="testi-card fade">
          <p class="testi-quote">
            We briefed Crewly on Thursday. By Monday we had three shortlisted PMs — all stronger
            than what we'd found in two months on our own.
          </p>
          <div class="testi-author">
            <div class="testi-av" style="background: oklch(52% 0.22 258)">MK</div>
            <div>
              <div class="testi-name">Marcus Kim</div>
              <div class="testi-co">VP Product · Seed-stage SaaS</div>
            </div>
          </div>
        </div>
        <div class="testi-card fade">
          <p class="testi-quote">
            The 15% fee sounds steep until you realize you only pay after a signed offer. We got
            months of sourcing help and spent exactly zero upfront.
          </p>
          <div class="testi-author">
            <div class="testi-av" style="background: oklch(52% 0.22 148)">RL</div>
            <div>
              <div class="testi-name">Rachel Lim</div>
              <div class="testi-co">Head of People · Series B startup</div>
            </div>
          </div>
        </div>
        <div class="testi-card fade">
          <p class="testi-quote">
            Our ATS was a mess and we had no bandwidth to screen. Crewly took everything off our
            plate. Two engineers hired in three weeks.
          </p>
          <div class="testi-author">
            <div class="testi-av" style="background: oklch(52% 0.22 40)">DT</div>
            <div>
              <div class="testi-name">David Torres</div>
              <div class="testi-co">CTO · Early-stage fintech</div>
            </div>
          </div>
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
  margin-bottom: 48px;
}
.testi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.testi-card {
  background: var(--ld-surf);
  border: 1px solid var(--ld-bd2);
  border-radius: 10px;
  padding: 26px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.testi-quote {
  font-size: 14px;
  color: var(--ld-t2);
  line-height: 1.78;
  flex: 1;
  font-style: italic;
}
.testi-quote::before {
  content: '\201C';
  color: var(--ld-acc-t);
  font-size: 20px;
  font-style: normal;
  display: block;
  margin-bottom: 6px;
  line-height: 1;
}
.testi-author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.testi-av {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
}
.testi-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ld-t1);
}
.testi-co {
  font-size: 11.5px;
  color: var(--ld-t3);
  margin-top: 1px;
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

@media (max-width: 820px) {
  .testi-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .wrap {
    padding: 0 16px;
  }
  .testi-card {
    padding: 20px 18px;
  }
  .sec-h {
    margin-bottom: 32px;
  }
}
</style>
