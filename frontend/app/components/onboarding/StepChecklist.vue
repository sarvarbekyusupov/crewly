<script setup lang="ts">
import { NOTICE_PERIOD_OPTIONS, GENDERS } from '~/constants/candidate'

const store = useOnboardingStore()

const NOTICE_OPTIONS = NOTICE_PERIOD_OPTIONS

type YesNo = boolean
type ThreeWay = 'yes' | 'no' | 'prefer_not'

function yesNoBtn(value: YesNo, target: boolean) {
  return value === target ? 'toggle-active' : 'toggle-off'
}

function threeBtn(value: ThreeWay, target: ThreeWay) {
  return value === target ? 'toggle-active' : 'toggle-off'
}
</script>

<template>
  <div class="space-y-6">
    <!-- PREFERENCES -->
    <section class="section">
      <h3 class="section-title">Preferences</h3>

      <div class="check-row">
        <div class="check-info">
          <p class="check-q">Darhol boshlashga tayyormisiz?</p>
        </div>
        <div class="yn-group">
          <button
            type="button"
            :class="yesNoBtn(store.checklist.canStartImmediately, true)"
            @click="store.checklist.canStartImmediately = true"
          >
            Ha
          </button>
          <button
            type="button"
            :class="yesNoBtn(store.checklist.canStartImmediately, false)"
            @click="store.checklist.canStartImmediately = false"
          >
            Yo'q
          </button>
        </div>
      </div>

      <div v-if="!store.checklist.canStartImmediately" class="notice-row">
        <label class="field-label">Bildirishnoma muddati</label>
        <div class="notice-options">
          <button
            v-for="opt in NOTICE_OPTIONS.slice(1)"
            :key="opt.value"
            type="button"
            class="notice-btn"
            :class="{ active: store.checklist.noticePeriodDays === opt.value }"
            @click="store.checklist.noticePeriodDays = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="check-row">
        <div class="check-info">
          <p class="check-q">Ko'chirishga tayyormisiz?</p>
        </div>
        <div class="yn-group">
          <button
            type="button"
            :class="yesNoBtn(store.checklist.willingToRelocate, true)"
            @click="store.checklist.willingToRelocate = true"
          >
            Ha
          </button>
          <button
            type="button"
            :class="yesNoBtn(store.checklist.willingToRelocate, false)"
            @click="store.checklist.willingToRelocate = false"
          >
            Yo'q
          </button>
        </div>
      </div>

      <div class="check-row">
        <div class="check-info">
          <p class="check-q">Shaxsiy transport bormи?</p>
        </div>
        <div class="yn-group">
          <button
            type="button"
            :class="yesNoBtn(store.checklist.hasTransport, true)"
            @click="store.checklist.hasTransport = true"
          >
            Ha
          </button>
          <button
            type="button"
            :class="yesNoBtn(store.checklist.hasTransport, false)"
            @click="store.checklist.hasTransport = false"
          >
            Yo'q
          </button>
        </div>
      </div>

      <div class="check-row">
        <div class="check-info">
          <p class="check-q">Ish joyi moslashuvi kerakmi?</p>
          <p class="check-sub">(nogironlik yoki maxsus ehtiyojlar)</p>
        </div>
        <div class="yn-group">
          <button
            type="button"
            :class="threeBtn(store.checklist.needsAccommodations, 'yes')"
            @click="store.checklist.needsAccommodations = 'yes'"
          >
            Ha
          </button>
          <button
            type="button"
            :class="threeBtn(store.checklist.needsAccommodations, 'no')"
            @click="store.checklist.needsAccommodations = 'no'"
          >
            Yo'q
          </button>
          <button
            type="button"
            :class="threeBtn(store.checklist.needsAccommodations, 'prefer_not')"
            @click="store.checklist.needsAccommodations = 'prefer_not'"
          >
            Aytmayman
          </button>
        </div>
      </div>
    </section>

    <!-- BACKGROUND -->
    <section class="section">
      <h3 class="section-title">Background</h3>

      <div class="check-row">
        <div class="check-info">
          <p class="check-q">Chet el hukumati bilan bog'liqlik bormi?</p>
          <p class="check-sub check-note">Ba'zi ish beruvchilar ushbu ma'lumotni so'raydi</p>
        </div>
        <div class="yn-group">
          <button
            type="button"
            :class="yesNoBtn(store.checklist.foreignGovTies, true)"
            @click="store.checklist.foreignGovTies = true"
          >
            Ha
          </button>
          <button
            type="button"
            :class="yesNoBtn(store.checklist.foreignGovTies, false)"
            @click="store.checklist.foreignGovTies = false"
          >
            Yo'q
          </button>
        </div>
      </div>
    </section>

    <!-- D&I (optional) -->
    <section class="section">
      <h3 class="section-title">D&I <span class="optional-badge">ixtiyoriy</span></h3>

      <div class="field-row">
        <label class="field-label">Jins</label>
        <select v-model="store.checklist.gender" class="field-select">
          <option value="">Ko'rsatishni xohlamayman</option>
          <option v-for="g in GENDERS" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
    </section>

    <!-- Additional notes -->
    <section class="section">
      <h3 class="section-title">Qo'shimcha</h3>
      <div class="field-row">
        <label class="field-label">Arizalarda bilish kerak bo'lgan narsa?</label>
        <textarea
          v-model="store.checklist.additionalNotes"
          class="field-textarea"
          rows="3"
          placeholder="Masalan: Bildirishnoma muddati 15 kun, faqat Toshkent…"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.space-y-6 > * + * {
  margin-top: 24px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-subtle);
  display: flex;
  align-items: center;
  gap: 8px;
}
.optional-badge {
  font-size: 10px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--ink-subtle);
  border: 1px solid var(--line);
}
.check-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
}
.check-row:last-child {
  border-bottom: none;
}
.check-info {
  flex: 1;
  min-width: 0;
}
.check-q {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}
.check-sub {
  font-size: 11.5px;
  color: var(--ink-subtle);
  margin-top: 2px;
}
.check-note {
  color: var(--ink-subtle);
}

.yn-group {
  display: flex;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.yn-group button {
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  background: var(--bg);
  border: none;
  border-right: 1px solid var(--line);
  cursor: pointer;
  transition: all 0.12s;
  color: var(--ink-muted);
  white-space: nowrap;
}
.yn-group button:last-child {
  border-right: none;
}
.toggle-active {
  background: var(--ink) !important;
  color: var(--bg) !important;
}
.toggle-off:hover {
  background: var(--bg-elevated) !important;
  color: var(--ink) !important;
}

.notice-row {
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.notice-options {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.notice-btn {
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 7px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.notice-btn.active,
.notice-btn:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
.field-select {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.field-select:focus {
  border-color: var(--accent);
}
.field-textarea {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-textarea:focus {
  border-color: var(--accent);
}
</style>
