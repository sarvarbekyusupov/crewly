<script setup lang="ts">
export interface Project {
  name?: string
  description?: string
  url?: string
  tags?: string[]
}

defineProps<{ projects: Project[] }>()
const emit = defineEmits<{ add: []; edit: [index: number] }>()

const { t } = useI18n()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="projects"
    icon="i-heroicons-code-bracket-square"
    :title="t('candidate.sections.projects.title')"
    :subtitle="
      projects.length
        ? t('candidate.sections.projects.subtitle', { n: projects.length })
        : undefined
    "
    @edit="emit('add')"
  >
    <template v-if="!projects.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-code-bracket-square"
        :text="t('candidate.sections.projects.empty')"
        :cta="t('candidate.sections.projects.emptyCta')"
        @add="emit('add')"
      />
    </template>

    <div v-else class="proj-list">
      <div v-for="(proj, i) in projects" :key="i" class="proj-item">
        <div class="proj-header">
          <div class="proj-left">
            <p class="proj-name">{{ proj.name || t('candidate.sections.projects.title') }}</p>
            <p v-if="proj.description" class="proj-desc">{{ proj.description }}</p>
            <div v-if="proj.tags && proj.tags.length" class="proj-tags">
              <CandidateProfileUiSkillTag v-for="tag in proj.tags" :key="tag" :label="tag" />
            </div>
          </div>
          <div class="proj-actions">
            <a v-if="proj.url" :href="proj.url" target="_blank" class="proj-link">
              <UIcon
                name="i-heroicons-arrow-top-right-on-square"
                style="width: 13px; height: 13px"
              />
            </a>
            <button type="button" class="item-edit" @click="emit('edit', i)">
              <UIcon name="i-heroicons-pencil" style="width: 12px; height: 12px" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="projects.length" type="button" class="add-row" @click="emit('add')">
      <UIcon name="i-heroicons-plus" style="width: 13px; height: 13px" />
      {{ t('candidate.sections.projects.addBtn') }}
    </button>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.proj-list {
  display: flex;
  flex-direction: column;
}
.proj-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
}
.proj-item:last-child {
  border-bottom: none;
}
.proj-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.proj-left {
  flex: 1;
  min-width: 0;
}
.proj-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.proj-desc {
  font-size: 12.5px;
  color: var(--ink-muted);
  margin-top: 3px;
  line-height: 1.5;
}
.proj-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.proj-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.proj-link {
  color: var(--ink-subtle);
  text-decoration: none;
  transition: color 0.12s;
  padding: 3px;
}
.proj-link:hover {
  color: var(--accent);
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
