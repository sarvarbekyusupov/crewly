<script setup lang="ts">
const props = defineProps<{
  open: boolean
  fullName?: string
  summary?: string
  phone?: string
  telegramUsername?: string
  linkedinUrl?: string
  githubUrl?: string
  city?: string
  country?: string
}>()
const emit = defineEmits<{
  close: []
  save: [
    data: {
      fullName: string
      summary: string
      phone: string
      telegramUsername: string
      linkedinUrl: string
      githubUrl: string
      city: string
      country: string
    },
  ]
}>()

const { t } = useI18n()

const form = reactive({
  fullName: '',
  summary: '',
  phone: '',
  telegramUsername: '',
  linkedinUrl: '',
  githubUrl: '',
  city: '',
  country: '',
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.fullName = props.fullName ?? ''
    form.summary = props.summary ?? ''
    form.phone = props.phone ?? ''
    form.telegramUsername = props.telegramUsername ?? ''
    form.linkedinUrl = props.linkedinUrl ?? ''
    form.githubUrl = props.githubUrl ?? ''
    form.city = props.city ?? ''
    form.country = props.country ?? ''
  },
)

const { searchAreas } = useHhSuggests()
const cityItems = ref<string[]>([])

async function onCitySearch(text: string) {
  if (!text || text.length < 2) {
    cityItems.value = []
    return
  }
  const items = await searchAreas(text)
  cityItems.value = items.map((i) => i.text)
}

const fullNameError = ref('')
const saving = ref(false)

async function submit() {
  if (!form.fullName.trim()) {
    fullNameError.value = t('candidate.modals.header.fullName') + ' is required'
    return
  }
  fullNameError.value = ''
  saving.value = true
  try {
    emit('save', { ...form })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="(v) => !v && emit('close')">
    <template #content>
      <div class="modal-wrap">
        <div class="modal-head">
          <h3 class="modal-title">{{ t('candidate.modals.header.title') }}</h3>
          <button type="button" class="modal-close" @click="emit('close')">
            <UIcon name="i-heroicons-x-mark" style="width: 18px; height: 18px" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field-row">
            <label class="field-label"
              >{{ t('candidate.modals.header.fullName') }} <span class="req">*</span></label
            >
            <input
              v-model="form.fullName"
              type="text"
              :class="['field-input', { 'field-input--error': fullNameError }]"
              placeholder="Abdullayev Bobur"
              @input="fullNameError = ''"
            />
            <span v-if="fullNameError" class="field-error">{{ fullNameError }}</span>
          </div>

          <div class="field-row">
            <label class="field-label">{{ t('candidate.modals.header.bio') }}</label>
            <textarea
              v-model="form.summary"
              class="field-textarea"
              rows="3"
              :placeholder="t('candidate.modals.header.bio')"
            />
          </div>

          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.header.phone') }}</label>
              <input
                v-model="form.phone"
                type="tel"
                class="field-input"
                placeholder="+998 90 123 45 67"
              />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.header.telegram') }}</label>
              <input
                v-model="form.telegramUsername"
                type="text"
                class="field-input"
                placeholder="username"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.header.city') }}</label>
              <UInputMenu
                v-model="form.city"
                :items="cityItems"
                :placeholder="t('candidate.modals.header.city')"
                class="field-input-menu"
                @update:search-term="onCitySearch"
              />
            </div>
            <div class="field-row">
              <label class="field-label">{{ t('candidate.modals.header.country') }}</label>
              <input
                v-model="form.country"
                type="text"
                class="field-input"
                placeholder="Uzbekistan"
              />
            </div>
          </div>

          <div class="field-row">
            <label class="field-label">{{ t('candidate.modals.header.linkedin') }}</label>
            <input
              v-model="form.linkedinUrl"
              type="url"
              class="field-input"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div class="field-row">
            <label class="field-label">{{ t('candidate.modals.header.github') }}</label>
            <input
              v-model="form.githubUrl"
              type="url"
              class="field-input"
              placeholder="https://github.com/username"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="saving" @click="emit('close')">
            {{ t('candidate.modals.cancel') }}
          </button>
          <button
            type="button"
            class="btn-save"
            :disabled="saving || !form.fullName.trim()"
            @click="submit"
          >
            {{ saving ? '...' : t('candidate.modals.save') }}
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
.field-input-menu {
  width: 100%;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
.btn-save:disabled,
.btn-cancel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.field-input--error {
  border-color: var(--accent);
}
.field-error {
  font-size: 11.5px;
  color: var(--accent);
  margin-top: 2px;
}
</style>
