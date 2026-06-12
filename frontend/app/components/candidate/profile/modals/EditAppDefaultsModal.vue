<script setup lang="ts">
const props = defineProps<{
  open: boolean
  preferredWorkMode?: string
  willingToRelocate?: boolean
  noticePeriodDays?: number | string | null
  hasTransport?: boolean
  canStartImmediately?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: [
    data: {
      preferredWorkMode: string
      willingToRelocate: boolean
      noticePeriodDays: number | null
      hasTransport: boolean
      canStartImmediately: boolean
    },
  ]
}>()

const { t } = useI18n()

const form = reactive({
  preferredWorkMode: '',
  willingToRelocate: false,
  noticePeriodDays: null as number | null,
  hasTransport: false,
  canStartImmediately: false,
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.preferredWorkMode = props.preferredWorkMode ?? ''
    form.willingToRelocate = props.willingToRelocate ?? false
    const nd =
      props.noticePeriodDays !== undefined && props.noticePeriodDays !== null
        ? Number(props.noticePeriodDays)
        : null
    form.noticePeriodDays = nd
    form.canStartImmediately = nd === 0 || (props.canStartImmediately ?? false)
    form.hasTransport = props.hasTransport ?? false
  },
)

const WORK_MODES = computed(() => [
  { value: 'remote', label: 'Remote' },
  { value: 'office', label: t('candidate.modals.appDefaults.workMode') },
  { value: 'hybrid', label: 'Gibrid' },
])

const NOTICE_OPTIONS = computed(() => [
  { value: 0, label: t('candidate.modals.appDefaults.immediately') },
  { value: 14, label: t('candidate.modals.appDefaults.twoWeeks') },
  { value: 30, label: t('candidate.modals.appDefaults.oneMonth') },
  { value: 60, label: t('candidate.modals.appDefaults.twoMonths') },
  { value: 90, label: t('candidate.modals.appDefaults.threeMonths') },
])
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">{{ t('candidate.modals.appDefaults.title') }}</h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field-group">
            <p class="group-label">{{ t('candidate.modals.appDefaults.workMode') }}</p>
            <div class="btn-group">
              <button
                v-for="m in WORK_MODES"
                :key="m.value"
                type="button"
                class="toggle-btn"
                :class="{ active: form.preferredWorkMode === m.value }"
                @click="form.preferredWorkMode = m.value"
              >
                {{ m.label }}
              </button>
            </div>
          </div>

          <div class="field-group">
            <p class="group-label">{{ t('candidate.modals.appDefaults.noticeLabel') }}</p>
            <div class="btn-group">
              <button
                v-for="opt in NOTICE_OPTIONS"
                :key="opt.value"
                type="button"
                class="toggle-btn"
                :class="{
                  active:
                    (form.canStartImmediately && opt.value === 0) ||
                    (!form.canStartImmediately &&
                      form.noticePeriodDays === opt.value &&
                      opt.value > 0) ||
                    (form.canStartImmediately && opt.value === 0),
                }"
                @click="
                  () => {
                    if (opt.value === 0) {
                      form.canStartImmediately = true
                      form.noticePeriodDays = 0
                    } else {
                      form.canStartImmediately = false
                      form.noticePeriodDays = opt.value
                    }
                  }
                "
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="field-group">
            <p class="group-label">{{ t('candidate.modals.appDefaults.extra') }}</p>
            <div class="check-list">
              <label class="check-row">
                <input v-model="form.willingToRelocate" type="checkbox" class="chk" />
                <span>{{ t('candidate.modals.appDefaults.relocate') }}</span>
              </label>
              <label class="check-row">
                <input v-model="form.hasTransport" type="checkbox" class="chk" />
                <span>{{ t('candidate.modals.appDefaults.transport') }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="emit('close')">
            {{ t('candidate.modals.cancel') }}
          </button>
          <button type="button" class="btn-save" @click="emit('save', { ...form })">
            {{ t('candidate.modals.save') }}
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.modal-wrap {
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line-soft);
}
.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  padding: 4px;
  border-radius: 6px;
  transition: all 0.12s;
}
.modal-close:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-subtle);
}
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.toggle-btn {
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.toggle-btn.active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.toggle-btn:hover:not(.active) {
  border-color: var(--ink);
  color: var(--ink);
}
.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--ink-muted);
  cursor: pointer;
}
.chk {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--ink);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--line-soft);
}
.btn-cancel {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.btn-cancel:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.btn-save {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: opacity 0.12s;
}
.btn-save:hover {
  opacity: 0.85;
}
</style>
