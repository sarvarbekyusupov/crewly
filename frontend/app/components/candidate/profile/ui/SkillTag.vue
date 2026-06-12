<script setup lang="ts">
defineProps<{ label: string; removable?: boolean }>()
const emit = defineEmits<{ remove: [] }>()
</script>

<template>
  <span class="skill-tag">
    {{ label }}
    <button v-if="removable" type="button" class="rm" @click.stop="emit('remove')">×</button>
  </span>
</template>

<style scoped>
.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--ink-muted);
  border: 1px solid var(--line);
  white-space: nowrap;
}
.rm {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
}
.rm:hover {
  color: var(--ink);
}
</style>
