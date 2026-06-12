<script setup lang="ts">
import type { Language } from '../sections/LanguagesSection.vue'

const props = defineProps<{
  open: boolean
  languages: Language[]
}>()
const emit = defineEmits<{
  close: []
  save: [languages: Language[]]
}>()

const localLangs = ref<Language[]>([])

const LEVELS = ['Native', 'Fluent', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1']

watch(
  () => props.open,
  (v) => {
    if (!v) return
    localLangs.value = props.languages.map((l) => ({ ...l }))
  },
)

function addLang() {
  localLangs.value.push({ name: '', level: '' })
}

function removeLang(i: number) {
  localLangs.value.splice(i, 1)
}
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">Tillar</h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div v-for="(lang, i) in localLangs" :key="i" class="lang-row">
            <input v-model="lang.name" type="text" class="field-input" placeholder="English" />
            <select v-model="lang.level" class="field-select">
              <option value="">Daraja…</option>
              <option v-for="lvl in LEVELS" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
            <button type="button" class="rm-btn" @click="removeLang(i)">
              <UIcon name="i-heroicons-trash" style="width: 13px; height: 13px" />
            </button>
          </div>

          <button type="button" class="add-lang-btn" @click="addLang">
            <UIcon name="i-heroicons-plus" style="width: 13px; height: 13px" />
            Til qo'shish
          </button>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="emit('close')">Bekor qilish</button>
          <button
            type="button"
            class="btn-save"
            @click="
              emit(
                'save',
                localLangs.map((l) => ({ ...l })),
              )
            "
          >
            Saqlash
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
  gap: 10px;
}
.lang-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.field-input,
.field-select {
  padding: 8px 11px;
  font-size: 13px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input {
  flex: 1;
}
.field-select {
  width: 140px;
  appearance: none;
}
.field-input:focus,
.field-select:focus {
  border-color: var(--accent);
}
.rm-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  padding: 6px;
  border-radius: 6px;
  transition: all 0.12s;
  flex-shrink: 0;
}
.rm-btn:hover {
  color: var(--accent);
  background: var(--bg-elevated);
}
.add-lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-subtle);
  background: none;
  border: 1.5px dashed var(--line);
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
  justify-content: center;
  transition: all 0.12s;
}
.add-lang-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
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
