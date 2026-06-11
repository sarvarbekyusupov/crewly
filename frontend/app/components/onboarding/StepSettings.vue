<script setup lang="ts">
const store = useOnboardingStore()

type OptLevel = 'off' | 'honest' | 'aggressive'

const CV_OPTIONS: { value: OptLevel; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'CV aynan yuboriladi' },
  { value: 'honest', label: 'Honest', desc: 'Ish uchun tajribani qayta tartiblaydi' },
  { value: 'aggressive', label: 'Aggressive', desc: 'CV matnini ish tavsifiga mos yozadi' },
]

const CL_OPTIONS: { value: OptLevel; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'Cover letter yozilmaydi' },
  { value: 'honest', label: 'Honest', desc: "Ton va urg'uni moslaydi" },
  { value: 'aggressive', label: 'Aggressive', desc: 'Ish tavsifiga mos cover letter yozadi' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- CV Optimization -->
    <section class="section">
      <div class="section-header">
        <div>
          <h3 class="section-title">CV Optimizatsiyasi</h3>
          <p class="section-desc">AI arizalar uchun CVni qanday moslashsin?</p>
        </div>
      </div>
      <div class="opt-cards">
        <button
          v-for="opt in CV_OPTIONS"
          :key="opt.value"
          type="button"
          class="opt-card"
          :class="{ selected: store.appSettings.resumeOptimization === opt.value }"
          @click="store.appSettings.resumeOptimization = opt.value"
        >
          <div class="opt-radio">
            <div class="opt-dot" />
          </div>
          <div class="opt-text">
            <p class="opt-label">{{ opt.label }}</p>
            <p class="opt-desc">{{ opt.desc }}</p>
          </div>
        </button>
      </div>
      <div class="auto-approve-row">
        <div class="aa-text">
          <p class="aa-label">Avtomatik tasdiqlash</p>
          <p class="aa-desc">AI optimizatsiya qilgan CVni tasdiqlashsiz yuborsin</p>
        </div>
        <button
          type="button"
          class="toggle-pill"
          :class="{ on: store.appSettings.autoApproveResume }"
          :aria-label="store.appSettings.autoApproveResume ? 'On' : 'Off'"
          @click="store.appSettings.autoApproveResume = !store.appSettings.autoApproveResume"
        >
          <span class="pill-thumb" />
        </button>
      </div>
    </section>

    <!-- Cover Letter Optimization -->
    <section class="section">
      <div class="section-header">
        <div>
          <h3 class="section-title">Cover Letter Optimizatsiyasi</h3>
          <p class="section-desc">AI cover letter yozish uslubi</p>
        </div>
      </div>
      <div class="opt-cards">
        <button
          v-for="opt in CL_OPTIONS"
          :key="opt.value"
          type="button"
          class="opt-card"
          :class="{ selected: store.appSettings.coverLetterOptimization === opt.value }"
          @click="store.appSettings.coverLetterOptimization = opt.value"
        >
          <div class="opt-radio">
            <div class="opt-dot" />
          </div>
          <div class="opt-text">
            <p class="opt-label">{{ opt.label }}</p>
            <p class="opt-desc">{{ opt.desc }}</p>
          </div>
        </button>
      </div>
      <div class="auto-approve-row">
        <div class="aa-text">
          <p class="aa-label">Avtomatik tasdiqlash</p>
          <p class="aa-desc">AI yozgan cover letterni tasdiqlashsiz yuborsin</p>
        </div>
        <button
          type="button"
          class="toggle-pill"
          :class="{ on: store.appSettings.autoApproveCoverLetter }"
          :aria-label="store.appSettings.autoApproveCoverLetter ? 'On' : 'Off'"
          @click="
            store.appSettings.autoApproveCoverLetter = !store.appSettings.autoApproveCoverLetter
          "
        >
          <span class="pill-thumb" />
        </button>
      </div>
    </section>

    <!-- Info note -->
    <div class="info-note">
      <UIcon
        name="i-heroicons-information-circle"
        style="width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px"
      />
      <p>Bu sozlamalarni istalgan vaqt Preferences sahifasida o'zgartirish mumkin.</p>
    </div>
  </div>
</template>

<style scoped>
.space-y-6 > * + * {
  margin-top: 24px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-header {
  margin-bottom: 2px;
}
.section-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.section-desc {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: 2px;
}

.opt-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.opt-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
  width: 100%;
}
.opt-card:hover {
  border-color: var(--ink);
}
.opt-card.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.opt-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.12s;
}
.opt-card.selected .opt-radio {
  border-color: var(--accent);
}
.opt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.12s;
}
.opt-card.selected .opt-dot {
  opacity: 1;
}
.opt-text {
  flex: 1;
  min-width: 0;
}
.opt-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.opt-desc {
  font-size: 12px;
  color: var(--ink-muted);
  margin-top: 2px;
}

.auto-approve-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--line-soft);
}
.aa-text {
  flex: 1;
}
.aa-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
.aa-desc {
  font-size: 11.5px;
  color: var(--ink-subtle);
  margin-top: 2px;
}

.toggle-pill {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--line);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.toggle-pill.on {
  background: var(--accent);
}
.pill-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  display: block;
}
.toggle-pill.on .pill-thumb {
  transform: translateX(18px);
}

.info-note {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--ink-subtle);
  font-size: 12px;
  line-height: 1.5;
}
</style>
