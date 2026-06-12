<script setup lang="ts">
import type { Project } from '../sections/ProjectsSection.vue'

const props = defineProps<{
  open: boolean
  project: Project | null
  index: number | null
}>()
const emit = defineEmits<{
  close: []
  save: [data: Project, index: number | null]
  delete: [index: number]
}>()

const form = reactive<Project>({ name: '', description: '', url: '', tags: [] })
const tagInput = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.name = props.project?.name ?? ''
    form.description = props.project?.description ?? ''
    form.url = props.project?.url ?? ''
    form.tags = props.project?.tags ? [...props.project.tags] : []
    tagInput.value = ''
  },
)

function addTag() {
  const t = tagInput.value.trim()
  if (t && !(form.tags ?? []).includes(t)) form.tags = [...(form.tags ?? []), t]
  tagInput.value = ''
}

function removeTag(t: string) {
  form.tags = (form.tags ?? []).filter((x) => x !== t)
}
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">
            {{ index === null ? "Loyiha qo'shish" : 'Loyihani tahrirlash' }}
          </h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field-row">
            <label class="field-label">Loyiha nomi <span class="req">*</span></label>
            <input
              v-model="form.name"
              type="text"
              class="field-input"
              placeholder="Crewly — HR Platform"
            />
          </div>
          <div class="field-row">
            <label class="field-label">Tavsif</label>
            <textarea
              v-model="form.description"
              class="field-textarea"
              rows="3"
              placeholder="Loyiha haqida qisqacha…"
            />
          </div>
          <div class="field-row">
            <label class="field-label">URL (GitHub yoki live)</label>
            <input
              v-model="form.url"
              type="url"
              class="field-input"
              placeholder="https://github.com/…"
            />
          </div>
          <div class="field-row">
            <label class="field-label">Texnologiyalar</label>
            <div class="tag-row">
              <input
                v-model="tagInput"
                type="text"
                class="field-input"
                placeholder="Vue.js, NestJS…"
                @keydown.enter.prevent="addTag"
              />
              <button type="button" class="add-btn" @click="addTag">+</button>
            </div>
            <div v-if="form.tags?.length" class="chips-row">
              <span v-for="t in form.tags" :key="t" class="chip">
                {{ t }}
                <button type="button" class="chip-rm" @click="removeTag(t)">×</button>
              </span>
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
            <button type="button" class="btn-cancel" @click="emit('close')">Bekor qilish</button>
            <button type="button" class="btn-save" @click="emit('save', { ...form }, index)">
              Saqlash
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
.field-input,
.field-textarea {
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
.field-input:focus,
.field-textarea:focus {
  border-color: var(--accent);
}
.field-textarea {
  resize: vertical;
}
.tag-row {
  display: flex;
  gap: 8px;
}
.add-btn {
  padding: 8px 14px;
  font-size: 18px;
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
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--ink-muted);
  border: 1px solid var(--line);
}
.chip-rm {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  font-size: 14px;
  line-height: 1;
  padding: 0;
}
.chip-rm:hover {
  color: var(--ink);
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
