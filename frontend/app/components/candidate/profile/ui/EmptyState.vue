<script setup lang="ts">
defineProps<{ icon?: string; text: string; cta?: string }>()
const emit = defineEmits<{ add: [] }>()
</script>

<template>
  <div class="empty">
    <UIcon :name="icon ?? 'i-heroicons-plus-circle'" class="empty-icon" />
    <p class="empty-text">{{ text }}</p>
    <button v-if="cta" type="button" class="empty-btn" @click="emit('add')">+ {{ cta }}</button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  text-align: center;
}
.empty-icon {
  width: 28px;
  height: 28px;
  color: var(--ink-subtle);
  opacity: 0.5;
}
.empty-text {
  font-size: 13px;
  color: var(--ink-subtle);
  max-width: 280px;
  line-height: 1.5;
}
.empty-btn {
  margin-top: 4px;
  padding: 6px 16px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.empty-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
</style>
