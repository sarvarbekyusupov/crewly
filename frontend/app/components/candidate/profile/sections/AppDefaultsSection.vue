<script setup lang="ts">
import { WORK_MODE_LABELS } from '~/constants/candidate'

const props = defineProps<{
  preferredWorkMode?: string
  willingToRelocate?: boolean
  noticePeriodDays?: number | string | null
  hasTransport?: boolean
  canStartImmediately?: boolean
}>()
const emit = defineEmits<{ edit: [] }>()

const { t } = useI18n()

const noticePeriodLabel = computed(() => {
  const days = Number(props.noticePeriodDays ?? 0)
  if (!days) return t('candidate.sections.appDefaults.immediately')
  if (days <= 14) return t('candidate.modals.appDefaults.twoWeeks')
  if (days <= 30) return t('candidate.modals.appDefaults.oneMonth')
  if (days <= 60) return t('candidate.modals.appDefaults.twoMonths')
  return t('candidate.modals.appDefaults.threeMonths')
})
</script>

<template>
  <CandidateProfileUiSectionCard
    id="app-defaults"
    icon="i-heroicons-adjustments-horizontal"
    :title="t('candidate.sections.appDefaults.title')"
    @edit="emit('edit')"
  >
    <div class="defaults-grid">
      <div class="def-group">
        <p class="def-label">{{ t('candidate.sections.appDefaults.workMode') }}</p>
        <div class="chips-row">
          <CandidateProfileUiTagChip
            :active="!!preferredWorkMode"
            :label="
              WORK_MODE_LABELS[preferredWorkMode ?? ''] ??
              preferredWorkMode ??
              t('candidate.sections.appDefaults.notice')
            "
          />
        </div>
      </div>

      <div class="def-group">
        <p class="def-label">Preferences</p>
        <div class="chips-row">
          <CandidateProfileUiTagChip
            :active="!!willingToRelocate"
            :label="t('candidate.sections.appDefaults.relocation')"
          />
          <CandidateProfileUiTagChip
            :active="!!canStartImmediately"
            :label="t('candidate.sections.appDefaults.immediately')"
          />
          <CandidateProfileUiTagChip
            :active="!!hasTransport"
            :label="t('candidate.sections.appDefaults.transport')"
          />
        </div>
      </div>

      <div class="def-group">
        <p class="def-label">{{ t('candidate.sections.appDefaults.notice') }}</p>
        <div class="chips-row">
          <CandidateProfileUiTagChip :active="true" :label="noticePeriodLabel" />
        </div>
      </div>
    </div>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.defaults-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.def-group {
}
.def-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-subtle);
  margin-bottom: 7px;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
