<script setup lang="ts">
import type { Education } from '../sections/EducationSection.vue'

const props = defineProps<{
  open: boolean
  education: Education | null
  index: number | null
}>()
const emit = defineEmits<{
  close: []
  save: [data: Education, index: number | null]
  delete: [index: number]
}>()

const { t } = useI18n()

const form = reactive<Education>({
  institution: '',
  degree: '',
  field: '',
  start: '',
  end: '',
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const e = props.education
    form.institution = e?.institution ?? ''
    form.degree = e?.degree ?? ''
    form.field = e?.field ?? ''
    form.start = e?.start ?? ''
    form.end = e?.end ?? ''
  },
)

function submit() {
  emit('save', { ...form }, props.index)
}
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">
            {{
              index === null
                ? t('candidate.modals.education.addTitle')
                : t('candidate.modals.education.editTitle')
            }}
          </h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field-row">
            <label class="field-label"
              >{{ t('candidate.modals.education.institution') }} <span class="req">*</span></label
            >
            <input
              v-model="form.institution"
              type="text"
              class="field-input"
              placeholder="TATU, Westminster…"
            />
          </div>

          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.education.degree') }}</label>
              <input v-model="form.degree" type="text" class="field-input" placeholder="Bakalavr" />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.education.field') }}</label>
              <input
                v-model="form.field"
                type="text"
                class="field-input"
                placeholder="Informatika"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.education.start') }}</label>
              <input v-model="form.start" type="text" class="field-input" placeholder="2019" />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.education.end') }}</label>
              <input v-model="form.end" type="text" class="field-input" placeholder="2023" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="index !== null"
            type="button"
            class="btn-delete"
            @click="index !== null && emit('delete', index)"
          >
            O'chirish
          </button>
          <div class="footer-right">
            <button type="button" class="btn-cancel" @click="emit('close')">
              {{ t('candidate.modals.cancel') }}
            </button>
            <button type="button" class="btn-save" @click="submit">
              {{ t('candidate.modals.save') }}
            </button>
          </div>
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
  gap: 14px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-muted);
}
.req {
  color: var(--accent);
}
.field-input {
  width: 100%;
  padding: 8px 11px;
  font-size: 13.5px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input:focus {
  border-color: var(--accent);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--line-soft);
}
.footer-right {
  display: flex;
  gap: 8px;
}
.btn-delete {
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid color-mix(in srgb, var(--accent) 40%, transparent);
  background: var(--bg);
  color: var(--accent);
  cursor: pointer;
  transition: all 0.12s;
}
.btn-delete:hover {
  background: var(--accent);
  color: var(--bg);
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
