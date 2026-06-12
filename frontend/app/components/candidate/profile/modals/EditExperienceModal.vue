<script setup lang="ts">
import type { Position } from '../sections/ExperienceSection.vue'

const props = defineProps<{
  open: boolean
  position: Position | null
  index: number | null
}>()
const emit = defineEmits<{
  close: []
  save: [data: Position, index: number | null]
  delete: [index: number]
}>()

const { t } = useI18n()

const confirmingDelete = ref(false)

const form = reactive<Position>({
  title: '',
  company: '',
  start: '',
  end: '',
  bullets: [],
})

const newBullet = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const p = props.position
    form.title = p?.title ?? ''
    form.company = p?.company ?? ''
    form.start = p?.start ?? ''
    form.end = p?.end ?? ''
    form.bullets = p?.bullets ? [...p.bullets] : []
    newBullet.value = ''
    confirmingDelete.value = false
  },
)

function addBullet() {
  const text = newBullet.value.trim()
  if (text) {
    form.bullets = [...(form.bullets ?? []), text]
    newBullet.value = ''
  }
}

function removeBullet(i: number) {
  form.bullets = (form.bullets ?? []).filter((_, idx) => idx !== i)
}

function submit() {
  if (!form.title?.trim() || !form.company?.trim()) return
  emit('save', { ...form, bullets: form.bullets ?? [] }, props.index)
}

function requestDelete() {
  confirmingDelete.value = true
}

function confirmDelete() {
  if (props.index !== null) emit('delete', props.index)
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
                ? t('candidate.modals.experience.addTitle')
                : t('candidate.modals.experience.editTitle')
            }}
          </h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="grid-2">
            <div class="field-row">
              <label class="field-label"
                >{{ t('candidate.modals.experience.position') }} <span class="req">*</span></label
              >
              <input
                v-model="form.title"
                type="text"
                class="field-input"
                placeholder="Backend Developer"
              />
            </div>
            <div class="field-row">
              <label class="field-label"
                >{{ t('candidate.modals.experience.company') }} <span class="req">*</span></label
              >
              <input
                v-model="form.company"
                type="text"
                class="field-input"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.experience.start') }}</label>
              <input v-model="form.start" type="text" class="field-input" placeholder="Jan 2022" />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.experience.end') }}</label>
              <input v-model="form.end" type="text" class="field-input" placeholder="Present" />
              <span class="field-hint">{{ t('candidate.modals.experience.currentRoleHint') }}</span>
            </div>
          </div>

          <div class="field-row">
            <label class="field-label">{{ t('candidate.modals.experience.bullets') }}</label>
            <ul v-if="form.bullets?.length" class="bullets-list">
              <li v-for="(b, i) in form.bullets" :key="i" class="bullet-item">
                <span class="bullet-text">{{ b }}</span>
                <button type="button" class="bullet-rm" @click="removeBullet(i)">×</button>
              </li>
            </ul>
            <div class="bullet-input-row">
              <input
                v-model="newBullet"
                type="text"
                class="field-input"
                :placeholder="t('candidate.modals.experience.addBullet')"
                @keydown.enter.prevent="addBullet"
              />
              <button type="button" class="add-btn" @click="addBullet">+</button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div v-if="index !== null && !confirmingDelete">
            <button type="button" class="btn-delete" @click="requestDelete">
              {{ t('candidate.modals.delete') }}
            </button>
          </div>
          <div v-if="confirmingDelete" class="confirm-delete-row">
            <span class="confirm-text">{{ t('candidate.modals.deleteConfirm') }}</span>
            <button type="button" class="btn-delete" @click="confirmDelete">
              {{ t('candidate.modals.delete') }}
            </button>
            <button type="button" class="btn-cancel" @click="confirmingDelete = false">
              {{ t('candidate.modals.cancel') }}
            </button>
          </div>
          <div v-if="!confirmingDelete" class="footer-right">
            <button type="button" class="btn-cancel" @click="emit('close')">
              {{ t('candidate.modals.cancel') }}
            </button>
            <button
              type="button"
              class="btn-save"
              :disabled="!form.title?.trim() || !form.company?.trim()"
              @click="submit"
            >
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
  max-height: 90vh;
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
  overflow-y: auto;
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
.bullets-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bullet-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--bg-elevated);
  border: 1px solid var(--line);
}
.bullet-text {
  font-size: 12.5px;
  color: var(--ink-muted);
  flex: 1;
  line-height: 1.4;
}
.bullet-rm {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  font-size: 16px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.bullet-rm:hover {
  color: var(--accent);
}
.bullet-input-row {
  display: flex;
  gap: 8px;
}
.add-btn {
  padding: 8px 14px;
  font-size: 16px;
  line-height: 1;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.add-btn:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
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
.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.field-hint {
  font-size: 11.5px;
  color: var(--ink-subtle);
  margin-top: 2px;
}
.confirm-delete-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}
.confirm-text {
  font-size: 12px;
  color: var(--ink-muted);
  flex: 1;
}
</style>
