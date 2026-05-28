<script setup lang="ts">
defineProps<{
  label: string
  value: number
  delta: string
  positive?: boolean
  href: string
}>()
</script>

<template>
  <NuxtLink :to="href" class="kpi" style="text-decoration: none">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-val">{{ value }}</div>
    <div
      class="kpi-delta"
      :style="positive ? 'color: var(--positive)' : 'color: var(--ink-subtle)'"
    >
      {{ delta }}
    </div>
  </NuxtLink>
</template>

<style scoped>
.kpi {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition:
    border-color 0.12s,
    transform 0.12s;
  cursor: pointer;
  color: inherit;
}
.kpi:hover {
  border-color: var(--ink-muted);
  transform: translateY(-1px);
}
.kpi-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}
.kpi-val {
  font-family: 'Fraunces', serif;
  font-size: 38px;
  letter-spacing: -0.035em;
  line-height: 1;
  margin-top: 6px;
  color: var(--ink);
}
.kpi-delta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  margin-top: 6px;
}
</style>
