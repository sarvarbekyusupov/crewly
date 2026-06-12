<script setup lang="ts">
const props = defineProps<{
  resumeFileUrl?: string
  uploading?: boolean
}>()
const emit = defineEmits<{ upload: [file: File] }>()

const { t } = useI18n()

const inputRef = ref<HTMLInputElement | null>(null)

function onInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) emit('upload', f)
  if (inputRef.value) inputRef.value.value = ''
}

const fileName = computed(() => {
  if (!props.resumeFileUrl) return null
  try {
    return decodeURIComponent(props.resumeFileUrl.split('/').pop()?.split('?')[0] ?? 'resume')
  } catch {
    return 'resume'
  }
})
</script>

<template>
  <CandidateProfileUiSectionCard
    id="documents"
    icon="i-heroicons-document-text"
    :title="t('candidate.sections.documents.title')"
    @edit="inputRef?.click()"
  >
    <div class="docs-grid">
      <!-- Resume -->
      <div class="doc-card">
        <div class="doc-icon">
          <UIcon
            name="i-heroicons-document-text"
            style="width: 22px; height: 22px; color: var(--accent)"
          />
        </div>
        <div class="doc-info">
          <p class="doc-title">{{ t('candidate.sections.documents.cvOnFile') }}</p>
          <p class="doc-sub">{{ fileName ?? t('candidate.sections.documents.noCv') }}</p>
        </div>
        <div class="doc-actions">
          <template v-if="uploading">
            <span class="doc-uploading">Yuklanmoqda…</span>
          </template>
          <template v-else-if="resumeFileUrl">
            <a :href="resumeFileUrl" target="_blank" class="doc-btn">
              <UIcon name="i-heroicons-eye" style="width: 13px; height: 13px" />
              Ko'rish
            </a>
            <button type="button" class="doc-btn" @click="inputRef?.click()">
              <UIcon name="i-heroicons-arrow-up-tray" style="width: 13px; height: 13px" />
              {{ t('candidate.sections.documents.replace') }}
            </button>
          </template>
          <template v-else>
            <button type="button" class="doc-btn doc-btn--accent" @click="inputRef?.click()">
              <UIcon name="i-heroicons-arrow-up-tray" style="width: 13px; height: 13px" />
              {{ t('candidate.sections.documents.upload') }}
            </button>
          </template>
        </div>
      </div>

      <!-- Cover Letter — future -->
      <div class="doc-card doc-card--muted">
        <div class="doc-icon doc-icon--muted">
          <UIcon
            name="i-heroicons-envelope-open"
            style="width: 22px; height: 22px; color: var(--ink-subtle)"
          />
        </div>
        <div class="doc-info">
          <p class="doc-title">Cover Letter</p>
          <p class="doc-sub">AI avtomatik yozadi</p>
        </div>
        <div class="doc-actions">
          <span class="doc-badge">Tez kunda</span>
        </div>
      </div>
    </div>

    <input ref="inputRef" type="file" class="hidden" accept=".pdf,.doc,.docx" @change="onInput" />
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.docs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.doc-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
}
.doc-card--muted {
  opacity: 0.6;
}
.doc-icon {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.doc-icon--muted {
  background: var(--bg-elevated);
}
.doc-info {
  flex: 1;
  min-width: 0;
}
.doc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc-sub {
  font-size: 11.5px;
  color: var(--ink-subtle);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.doc-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.12s;
}
.doc-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.doc-btn--accent {
  border-color: var(--accent);
  color: var(--accent);
}
.doc-uploading {
  font-size: 11.5px;
  color: var(--ink-subtle);
}
.doc-badge {
  font-size: 10.5px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--ink-subtle);
  border: 1px solid var(--line);
}
@media (max-width: 640px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
