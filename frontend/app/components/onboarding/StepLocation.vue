<script setup lang="ts">
import { REGIONS, COUNTRIES } from '~/constants/geo'

const store = useOnboardingStore()
</script>

<template>
  <div class="space-y-4">
    <div class="field-row">
      <label class="field-label">Shahar <span class="req">*</span></label>
      <input
        v-model="store.location.city"
        type="text"
        class="field-input"
        placeholder="e.g. Toshkent"
        autofocus
      />
    </div>

    <div class="grid-2">
      <div class="field-row">
        <label class="field-label">Tuman</label>
        <input
          v-model="store.location.district"
          type="text"
          class="field-input"
          placeholder="e.g. Mirzo Ulug'bek"
        />
      </div>

      <div class="field-row">
        <label class="field-label">Viloyat <span class="req">*</span></label>
        <select v-model="store.location.region" class="field-select">
          <option value="">Tanlang…</option>
          <option v-for="r in REGIONS" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
    </div>

    <div class="field-row">
      <label class="field-label">Mamlakat</label>
      <select v-model="store.location.country" class="field-select">
        <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 16px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
.req {
  color: var(--accent);
}
.field-input,
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
}
.field-input:focus,
.field-select:focus {
  border-color: var(--accent);
}
.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
@media (max-width: 480px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
