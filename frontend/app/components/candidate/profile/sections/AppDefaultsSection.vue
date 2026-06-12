<script setup lang="ts">
const props = defineProps<{
  preferredWorkMode?: string
  willingToRelocate?: boolean
  noticePeriodDays?: number | string | null
  hasTransport?: boolean
  canStartImmediately?: boolean
}>()
const emit = defineEmits<{ edit: [] }>()

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  office: 'Ofis',
  hybrid: 'Gibrid',
}

const noticePeriodLabel = computed(() => {
  const days = Number(props.noticePeriodDays ?? 0)
  if (!days) return 'Hoziroq'
  if (days <= 14) return '2 hafta'
  if (days <= 30) return '1 oy'
  if (days <= 60) return '2 oy'
  return '3 oy'
})
</script>

<template>
  <CandidateProfileUiSectionCard
    id="app-defaults"
    icon="i-heroicons-adjustments-horizontal"
    title="Ish sozlamalari"
    @edit="emit('edit')"
  >
    <div class="defaults-grid">
      <div class="def-group">
        <p class="def-label">Ish tartibi</p>
        <div class="chips-row">
          <CandidateProfileUiTagChip
            :active="!!preferredWorkMode"
            :label="
              WORK_MODE_LABELS[preferredWorkMode ?? ''] ?? preferredWorkMode ?? 'Ko\'rsatilmagan'
            "
          />
        </div>
      </div>

      <div class="def-group">
        <p class="def-label">Preferences</p>
        <div class="chips-row">
          <CandidateProfileUiTagChip :active="!!willingToRelocate" label="Ko'chirishga tayyor" />
          <CandidateProfileUiTagChip :active="!!canStartImmediately" label="Darhol boshlaydi" />
          <CandidateProfileUiTagChip :active="!!hasTransport" label="Shaxsiy transport" />
        </div>
      </div>

      <div class="def-group">
        <p class="def-label">Bildirishnoma muddati</p>
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
