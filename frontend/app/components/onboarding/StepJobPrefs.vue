<script setup lang="ts">
const store = useOnboardingStore()

function fmt(n: number) {
  if (!n) return ''
  return n.toLocaleString('ru-RU')
}

function parseSalary(v: string) {
  return parseInt(v.replace(/\D/g, ''), 10) || 0
}

type FormatKey = keyof typeof store.jobPreferences.formats
type TypeKey = keyof typeof store.jobPreferences.types

const FORMAT_LABELS: { key: FormatKey; label: string }[] = [
  { key: 'remote', label: 'Remote' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'onsite', label: 'Ofisda' },
  { key: 'abroad', label: 'Xorijda' },
]

const TYPE_LABELS: { key: TypeKey; label: string }[] = [
  { key: 'fullTime', label: 'Full-time' },
  { key: 'partTime', label: 'Part-time' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'internship', label: 'Internship' },
]
</script>

<template>
  <div class="space-y-5">
    <!-- Desired role -->
    <div class="field-row">
      <label class="field-label">Istagan lavozim <span class="req">*</span></label>
      <input
        v-model="store.jobPreferences.desiredRole"
        type="text"
        class="field-input"
        placeholder="e.g. Frontend Developer, Product Manager…"
        autofocus
      />
    </div>

    <!-- Salary range -->
    <div class="field-row">
      <div class="salary-header">
        <label class="field-label">Maosh diapazoni</label>
        <div class="currency-toggle">
          <button
            type="button"
            class="cur-btn"
            :class="{ active: store.jobPreferences.currency === 'USD' }"
            @click="store.jobPreferences.currency = 'USD'"
          >
            USD
          </button>
          <button
            type="button"
            class="cur-btn"
            :class="{ active: store.jobPreferences.currency === 'UZS' }"
            @click="store.jobPreferences.currency = 'UZS'"
          >
            UZS
          </button>
        </div>
      </div>
      <div class="salary-row">
        <div class="salary-field">
          <span class="salary-prefix">{{
            store.jobPreferences.currency === 'USD' ? '$' : '₸'
          }}</span>
          <input
            :value="fmt(store.jobPreferences.salaryMin)"
            type="text"
            class="salary-input"
            placeholder="Min"
            @input="
              store.jobPreferences.salaryMin = parseSalary(
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </div>
        <span class="salary-dash">—</span>
        <div class="salary-field">
          <span class="salary-prefix">{{
            store.jobPreferences.currency === 'USD' ? '$' : '₸'
          }}</span>
          <input
            :value="fmt(store.jobPreferences.salaryMax)"
            type="text"
            class="salary-input"
            placeholder="Max"
            @input="
              store.jobPreferences.salaryMax = parseSalary(
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </div>
      </div>
    </div>

    <!-- Work format -->
    <div class="field-row">
      <label class="field-label">Ish formati</label>
      <div class="toggle-grid">
        <button
          v-for="fmt in FORMAT_LABELS"
          :key="fmt.key"
          type="button"
          class="toggle-btn"
          :class="{ active: store.jobPreferences.formats[fmt.key] }"
          @click="store.jobPreferences.formats[fmt.key] = !store.jobPreferences.formats[fmt.key]"
        >
          <span class="toggle-check">{{ store.jobPreferences.formats[fmt.key] ? '✓' : '' }}</span>
          {{ fmt.label }}
        </button>
      </div>
    </div>

    <!-- Job type -->
    <div class="field-row">
      <label class="field-label">Ish turi</label>
      <div class="toggle-grid">
        <button
          v-for="t in TYPE_LABELS"
          :key="t.key"
          type="button"
          class="toggle-btn"
          :class="{ active: store.jobPreferences.types[t.key] }"
          @click="store.jobPreferences.types[t.key] = !store.jobPreferences.types[t.key]"
        >
          <span class="toggle-check">{{ store.jobPreferences.types[t.key] ? '✓' : '' }}</span>
          {{ t.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-y-5 > * + * {
  margin-top: 20px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
.req {
  color: var(--accent);
}
.field-input {
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
}
.field-input:focus {
  border-color: var(--accent);
}

.salary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.currency-toggle {
  display: flex;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.cur-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg);
  color: var(--ink-muted);
  border: none;
  cursor: pointer;
  transition: all 0.12s;
}
.cur-btn.active {
  background: var(--ink);
  color: var(--bg);
}

.salary-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.salary-field {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  overflow: hidden;
  transition: border-color 0.15s;
}
.salary-field:focus-within {
  border-color: var(--accent);
}
.salary-prefix {
  padding: 9px 10px;
  font-size: 14px;
  color: var(--ink-subtle);
  background: var(--bg-deep);
  border-right: 1px solid var(--line);
  flex-shrink: 0;
}
.salary-input {
  flex: 1;
  padding: 9px 12px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: var(--ink);
  outline: none;
  font-family: inherit;
  min-width: 0;
}
.salary-dash {
  color: var(--ink-subtle);
  font-size: 16px;
}

.toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.toggle-btn {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}
.toggle-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.toggle-btn.active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.toggle-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}
.toggle-btn.active .toggle-check {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
