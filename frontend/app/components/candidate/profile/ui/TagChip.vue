<script setup lang="ts">
defineProps<{ active: boolean; label: string }>()
</script>

<template>
  <span class="chip" :class="active ? 'chip--on' : 'chip--off'">
    <span class="chip-icon">{{ active ? '✓' : '✗' }}</span>
    {{ label }}
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  border: 1.5px solid;
}
.chip--on {
  border-color: color-mix(in srgb, var(--positive) 40%, transparent);
  background: var(--positive-soft);
  color: var(--positive);
}
.chip--off {
  border-color: var(--line);
  background: var(--bg);
  color: var(--ink-subtle);
}
.chip-icon {
  font-size: 11px;
  line-height: 1;
}
</style>
