<script setup lang="ts">
const props = defineProps<{ percentage: number }>()

const R = 21
const CIRC = 2 * Math.PI * R

const stroke = computed(() => {
  if (props.percentage >= 80) return 'var(--positive)'
  if (props.percentage >= 50) return 'var(--warning)'
  return 'var(--accent)'
})

const dashOffset = computed(() => CIRC * (1 - props.percentage / 100))
</script>

<template>
  <svg width="52" height="52" viewBox="0 0 52 52">
    <circle cx="26" cy="26" :r="R" fill="none" stroke="var(--line)" stroke-width="3" />
    <circle
      cx="26"
      cy="26"
      :r="R"
      fill="none"
      :stroke="stroke"
      stroke-width="3"
      stroke-linecap="round"
      :stroke-dasharray="CIRC"
      :stroke-dashoffset="dashOffset"
      transform="rotate(-90 26 26)"
      style="transition: stroke-dashoffset 0.4s ease"
    />
    <text
      x="26"
      y="30"
      text-anchor="middle"
      font-size="10"
      font-weight="700"
      font-family="JetBrains Mono, monospace"
      :fill="stroke"
    >
      {{ percentage }}%
    </text>
  </svg>
</template>
