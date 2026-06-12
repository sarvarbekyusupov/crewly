<script setup lang="ts">
defineProps<{ skills: string[] }>()
const emit = defineEmits<{ edit: [] }>()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="skills"
    icon="i-heroicons-command-line"
    title="Ko'nikmalar"
    :subtitle="skills.length ? `${skills.length} ta ko'nikma` : undefined"
    @edit="emit('edit')"
  >
    <template v-if="!skills.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-command-line"
        text="Ko'nikmalaringizni qo'shing — ish beruvchilar ko'radi"
        cta="Ko'nikmalar qo'shish"
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
