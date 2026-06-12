<script setup lang="ts">
import { PRESET_SKILLS } from '~/constants/skills'

const props = defineProps<{
  open: boolean
  skills: string[]
}>()
const emit = defineEmits<{
  close: []
  save: [skills: string[]]
}>()

const { t } = useI18n()

const localSkills = ref<string[]>([])
const activeCategory = ref<string | null>(null)
const customInput = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) return
    localSkills.value = [...props.skills]
  },
)

function toggleTag(tag: string) {
  const idx = localSkills.value.indexOf(tag)
  if (idx >= 0) localSkills.value.splice(idx, 1)
  else localSkills.value.push(tag)
}

function addCustom() {
  const tag = customInput.value.trim()
  if (tag && !localSkills.value.includes(tag)) localSkills.value.push(tag)
  customInput.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addCustom()
  }
}
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">{{ t('candidate.modals.skills.title') }}</h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Category tabs -->
          <div class="cat-tabs">
            <button
              v-for="cat in Object.keys(PRESET_SKILLS)"
              :key="cat"
              type="button"
              class="cat-tab"
              :class="{ active: activeCategory === cat }"
              @click="activeCategory = activeCategory === cat ? null : cat"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Preset tags -->
          <div class="tags-grid">
            <template v-for="(tags, cat) in PRESET_SKILLS" :key="cat">
              <template v-if="!activeCategory || activeCategory === cat">
                <button
                  v-for="tag in tags"
                  :key="tag"
                  type="button"
                  class="tag-btn"
                  :class="{ selected: localSkills.includes(tag) }"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </template>
            </template>
          </div>

          <!-- Custom input -->
          <div class="custom-row">
            <input
              v-model="customInput"
              type="text"
              class="field-input"
              :placeholder="t('candidate.modals.skills.addPlaceholder')"
              @keydown="onKeydown"
            />
            <button type="button" class="add-btn" @click="addCustom">+</button>
          </div>

          <!-- Selected -->
          <div v-if="localSkills.length" class="selected-tags">
            <span v-for="tag in localSkills" :key="tag" class="chip">
              {{ tag }}
              <button type="button" class="chip-rm" @click="toggleTag(tag)">×</button>
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <span class="count">{{ localSkills.length }} tanlandi</span>
          <div class="footer-right">
            <button type="button" class="btn-cancel" @click="emit('close')">
              {{ t('candidate.modals.cancel') }}
            </button>
            <button type="button" class="btn-save" @click="emit('save', [...localSkills])">
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
.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cat-tab {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cat-tab.active,
.cat-tab:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.tag-btn {
  padding: 5px 11px;
  font-size: 12.5px;
  border-radius: 7px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.tag-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.tag-btn.selected {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.custom-row {
  display: flex;
  gap: 8px;
}
.field-input {
  flex: 1;
  padding: 8px 11px;
  font-size: 13.5px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.field-input:focus {
  border-color: var(--accent);
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
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.chip-rm {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
}
.chip-rm:hover {
  opacity: 1;
}
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--line-soft);
}
.count {
  font-size: 12.5px;
  color: var(--ink-subtle);
}
.footer-right {
  display: flex;
  gap: 8px;
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
