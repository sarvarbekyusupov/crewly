<script setup lang="ts">
defineProps<{ audience: 'employer' | 'candidate' }>()
</script>

<template>
  <section class="how-section">
    <div class="wrap">
      <h2 class="htitle serif">
        {{ audience === 'employer' ? 'How myHR works' : 'How it works' }}
      </h2>

      <!-- Employer cards -->
      <div v-if="audience === 'employer'" class="cards">
        <div class="card">
          <span class="kicker">Brief</span>
          <h3 class="serif">We hire for you, end-to-end</h3>
          <p>No software, no team to build. Brief us once — we open the role, source, screen, and send a shortlist ready to interview.</p>
        </div>
        <div class="card">
          <span class="kicker">Pricing</span>
          <h3 class="serif">15% of salary, only when you hire</h3>
          <p>No setup fees. No monthly platform charge. You pay on signed offer. No hire, no bill.</p>
        </div>
        <div class="card">
          <span class="kicker">Reach</span>
          <h3 class="serif">Our pool. Your network. The whole internet.</h3>
          <p>Every channel in parallel — our pre-screened pool, your ATS, and the open web — into one ranked shortlist.</p>
        </div>
      </div>

      <!-- Candidate product mock cards -->
      <div v-else class="cards">
        <div class="card">
          <span class="kicker">Chat</span>
          <h3 class="serif">Tell us what you want</h3>
          <div class="bubble">What kind of role are you after?</div>
          <div class="bubble bubble--me">Product design at a startup</div>
          <div class="bubble">Great — experience level?</div>
          <div class="bubble bubble--me">4 years, currently at Figma</div>
        </div>
        <div class="card">
          <span class="kicker">Learn</span>
          <h3 class="serif">Upskill with AI coaching</h3>
          <div class="chips">
            <span class="chip chip--l">Courses</span>
            <span class="chip chip--l">Flashcards</span>
            <span class="chip chip--l">AI Tutor</span>
          </div>
          <div class="match flex-col">
            <div class="match-row">
              <span>System Design</span>
              <span class="pct-text">70%</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width: 70%"></div>
            </div>
          </div>
          <div class="match flex-col">
            <div class="match-row">
              <span>SQL Fundamentals</span>
              <span class="pct-text">45%</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width: 45%; background: var(--l-lilac)"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <span class="kicker">Find roles</span>
          <h3 class="serif">We find roles that fit</h3>
          <div class="match border-highlight">
            <div class="match-info">
              <span class="role-title">Product Designer</span>
              <span class="role-company">Stripe</span>
            </div>
            <span class="pct">96% fit</span>
          </div>
          <div class="match">
            <div class="match-info">
              <span class="role-title">Senior UX</span>
              <span class="role-company">Linear</span>
            </div>
            <span class="pct pct-secondary">91% fit</span>
          </div>
          <p class="new-roles">✨ 12 new roles matching today</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.how-section {
  padding: 90px 0;
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

/* 3D tilt card grid */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  perspective: 1400px;
}
.card {
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: 20px;
  padding: 30px;
  min-height: 280px;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.3s ease, opacity 0.3s ease;
  transform-style: preserve-3d;
}

@media (min-width: 881px) {
  .card:nth-child(1) { transform: rotateY(9deg); }
  .card:nth-child(3) { transform: rotateY(-9deg); }

  .card:hover {
    transform: translateY(-8px) scale(1.02) rotateY(0) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
    border-color: var(--l-green);
    z-index: 10;
  }

  /* Soft fade on other cards to draw focus */
  .cards:hover .card:not(:hover) {
    opacity: 0.75;
    transform: scale(0.98);
  }
}

.kicker {
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--l-green);
  font-weight: 700;
  text-transform: uppercase;
  font-family: var(--l-sans);
}
.card h3 {
  font-weight: 400;
  font-size: 26px;
  margin: 14px 0 12px;
  color: var(--l-text);
}
.card p {
  color: var(--l-muted);
  font-size: 16px;
  line-height: 1.55;
}

/* Chat bubbles */
.bubble {
  background: var(--l-surface-2);
  border-radius: 14px;
  padding: 9px 13px;
  font-size: 14px;
  margin-top: 8px;
  max-width: 80%;
  color: var(--l-text);
}
.bubble--me {
  background: var(--l-green);
  color: #1a1a18;
  margin-left: auto;
}

/* Chips */
.chips {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  display: inline-block;
  font-size: 13px;
  padding: 5px 11px;
  border-radius: var(--l-pill);
}
.chip--g { background: color-mix(in srgb, var(--l-green) 30%, transparent); color: var(--l-text); }
.chip--l { background: color-mix(in srgb, var(--l-lilac) 45%, transparent); color: var(--l-text); }

/* Match rows & Progress bars */
.match {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--l-surface-2);
  border-radius: 12px;
  padding: 12px 14px;
  margin-top: 10px;
  font-size: 14px;
  color: var(--l-text);
}
.flex-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch !important;
}
.match-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pct-text {
  font-weight: 600;
  font-size: 13px;
  color: var(--l-muted);
}
.progress-bar-wrap {
  width: 100%;
  height: 6px;
  background: var(--l-surface);
  border: 1px solid var(--l-line);
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--l-green);
  border-radius: 3px;
}
.border-highlight {
  border: 1px solid color-mix(in srgb, var(--l-green) 60%, transparent) !important;
}
.match-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.role-title {
  font-weight: 500;
}
.role-company {
  font-size: 12px;
  color: var(--l-muted);
}

.pct {
  background: var(--l-green);
  color: #1a1a18;
  font-weight: 700;
  border-radius: var(--l-pill);
  padding: 3px 9px;
  font-size: 12px;
  flex-shrink: 0;
}
.pct-secondary {
  background: var(--l-lilac) !important;
  color: #341b48 !important;
}

.new-roles {
  margin-top: 12px;
  font-size: 13px;
  color: var(--l-muted);
}

@media (max-width: 880px) {
  .cards {
    grid-template-columns: 1fr;
    perspective: none;
  }
  .card,
  .cards:hover .card {
    transform: none !important;
    opacity: 1 !important;
    box-shadow: none !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }
  .card:nth-child(1),
  .card:nth-child(3) { transform: none; }
}
</style>
