<script setup lang="ts">
export interface Language {
  name?: string
  level?: string
}

defineProps<{ languages: Language[] }>()
const emit = defineEmits<{ edit: [] }>()

const { t } = useI18n()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="languages"
    icon="i-heroicons-language"
    :title="t('candidate.sections.languages.title')"
    :subtitle="
      languages.length
        ? t('candidate.sections.languages.subtitle', { n: languages.length })
        : undefined
    "
    @edit="emit('edit')"
  >
    <template v-if="!languages.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-language"
        :text="t('candidate.sections.languages.empty')"
        :cta="t('candidate.sections.languages.emptyCta')"
        @add="emit('edit')"
      />
    </template>

    <div v-else class="lang-list">
      <div v-for="(lang, i) in languages" :key="i" class="lang-item">
        <div class="lang-dot" />
        <span class="lang-name">{{ lang.name }}</span>
        <span v-if="lang.level" class="lang-level">{{ lang.level }}</span>
      </div>
    </div>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.lang-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lang-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.lang-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}
.lang-level {
  font-size: 12px;
  color: var(--ink-subtle);
}
.lang-level::before {
  content: '·';
  margin-right: 6px;
}
</style>
