<script setup lang="ts">
defineProps<{ skills: string[] }>()
const emit = defineEmits<{ edit: [] }>()

const { t } = useI18n()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="skills"
    icon="i-heroicons-command-line"
    :title="t('candidate.sections.skills.title')"
    :subtitle="
      skills.length ? t('candidate.sections.skills.subtitle', { n: skills.length }) : undefined
    "
    @edit="emit('edit')"
  >
    <template v-if="!skills.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-command-line"
        :text="t('candidate.sections.skills.empty')"
        :cta="t('candidate.sections.skills.emptyCta')"
        @add="emit('edit')"
      />
    </template>

    <div v-else class="skills-wrap">
      <CandidateProfileUiSkillTag v-for="skill in skills" :key="skill" :label="skill" />
    </div>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.skills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
</style>
