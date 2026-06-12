<script setup lang="ts">
defineProps<{
  id: string
  icon: string
  title: string
  subtitle?: string
}>()
const emit = defineEmits<{ edit: [] }>()
</script>

<template>
  <div :id="id" class="section-card">
    <div class="section-head">
      <div class="section-left">
        <div class="section-icon">
          <UIcon :name="icon" style="width: 15px; height: 15px" />
        </div>
        <div>
          <h2 class="section-title">{{ title }}</h2>
          <p v-if="subtitle" class="section-sub">{{ subtitle }}</p>
        </div>
      </div>
      <button type="button" class="edit-btn" @click="emit('edit')">
        <UIcon name="i-heroicons-pencil" style="width: 13px; height: 13px" />
        Edit
      </button>
    </div>
    <div class="section-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.section-card {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
}
.section-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
  flex-shrink: 0;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.section-sub {
  font-size: 11.5px;
  color: var(--ink-subtle);
  margin-top: 1px;
}
.edit-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-subtle);
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 7px;
  transition: all 0.12s;
}
.edit-btn:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.section-body {
  padding: 20px;
}
</style>
