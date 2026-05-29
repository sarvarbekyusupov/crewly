<script setup lang="ts">
defineProps<{
  stages: Array<{ key: string; label: string; count: number }>
}>()
</script>

<template>
  <div class="stage-strip">
    <div v-for="stage in stages" :key="stage.key" class="stage-cell">
      <span class="stage-count">{{ stage.count }}</span>
      <span class="stage-label">{{ stage.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.stage-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
@media (max-width: 700px) {
  .stage-strip {
    grid-template-columns: repeat(3, 1fr);
  }
}
.stage-cell {
  background: var(--bg-elevated);
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stage-count {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  letter-spacing: -0.04em;
  font-weight: 400;
  color: var(--ink);
  line-height: 1;
}
.stage-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-subtle);
}
</style>
