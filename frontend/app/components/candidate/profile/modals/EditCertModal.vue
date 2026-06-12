<script setup lang="ts">
import type { Certification } from '../sections/CertificationsSection.vue'

const props = defineProps<{
  open: boolean
  cert: Certification | null
  index: number | null
}>()
const emit = defineEmits<{
  close: []
  save: [data: Certification, index: number | null]
  delete: [index: number]
}>()

const { t } = useI18n()

const form = reactive<Certification>({ name: '', issuer: '', date: '', url: '' })

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.name = props.cert?.name ?? ''
    form.issuer = props.cert?.issuer ?? ''
    form.date = props.cert?.date ?? ''
    form.url = props.cert?.url ?? ''
  },
)
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">
            {{
              index === null
                ? t('candidate.modals.cert.addTitle')
                : t('candidate.modals.cert.editTitle')
            }}
          </h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field-row">
            <label class="field-label"
              >{{ t('candidate.modals.cert.name') }} <span class="req">*</span></label
            >
            <input
              v-model="form.name"
              type="text"
              class="field-input"
              placeholder="IELTS Academic Band 7.0"
            />
          </div>
          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.cert.issuer') }}</label>
              <input
                v-model="form.issuer"
                type="text"
                class="field-input"
                placeholder="British Council"
              />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.cert.date') }}</label>
              <input v-model="form.date" type="text" class="field-input" placeholder="Jan 2025" />
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">{{ t('candidate.modals.cert.url') }}</label>
            <input v-model="form.url" type="url" class="field-input" placeholder="https://…" />
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
            <button type="button" class="btn-save" @click="emit('save', { ...form }, index)">
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
