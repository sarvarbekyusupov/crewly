<script setup lang="ts">
export interface Education {
  institution?: string
  degree?: string
  field?: string
  start?: string
  end?: string
}

defineProps<{ education: Education[] }>()
const emit = defineEmits<{ add: []; edit: [index: number] }>()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="education"
    icon="i-heroicons-academic-cap"
    title="Ta'lim"
    :subtitle="education.length ? `${education.length} ta muassasa` : undefined"
    @edit="emit('add')"
  >
    <template v-if="!education.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-academic-cap"
        text="Ta'lim ma'lumotlarini qo'shing"
        cta="Ta'lim qo'shish"
        @add="emit('add')"
      />
    </template>

    <div v-else class="edu-list">
      <div v-for="(edu, i) in education" :key="i" class="edu-item">
        <CandidateProfileUiCompanyAvatar :name="edu.institution || '?'" :size="38" />
        <div class="edu-body">
          <div class="edu-header">
            <div>
              <p class="edu-inst">{{ edu.institution || 'Muassasa' }}</p>
              <p class="edu-degree">
                {{ [edu.degree, edu.field].filter(Boolean).join(' · ') || 'Diplom' }}
              </p>
            </div>
            <div class="edu-actions">
              <span class="edu-dates">{{ edu.start || '—' }} – {{ edu.end || '—' }}</span>
              <button type="button" class="item-edit" @click="emit('edit', i)">
                <UIcon name="i-heroicons-pencil" style="width: 12px; height: 12px" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="add-row" @click="emit('add')">
      <UIcon name="i-heroicons-plus" style="width: 13px; height: 13px" />
      Ta'lim qo'shish
    </button>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.edu-list {
  display: flex;
  flex-direction: column;
}
.edu-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
}
.edu-item:last-child {
  border-bottom: none;
}
.edu-body {
  flex: 1;
  min-width: 0;
}
.edu-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.edu-inst {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.edu-degree {
  font-size: 12.5px;
  color: var(--ink-muted);
  margin-top: 2px;
}
.edu-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.edu-dates {
  font-size: 11.5px;
  color: var(--ink-subtle);
  white-space: nowrap;
}
.item-edit {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  padding: 3px;
  border-radius: 5px;
  transition: all 0.12s;
}
.item-edit:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.add-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-subtle);
  background: none;
  border: 1.5px dashed var(--line);
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
  justify-content: center;
  transition: all 0.12s;
}
.add-row:hover {
  border-color: var(--ink);
  color: var(--ink);
}
</style>
