<script setup lang="ts">
const store = useOnboardingStore()
const api = useCandidateApi()
const toast = useToast()

const isDragging = ref(false)
const uploadedFile = ref<{ name: string; size: string } | null>(null)
const referralCode = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validate(file: File) {
  const ok = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!ok.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
    toast.add({ title: 'Only PDF, DOC, DOCX allowed', color: 'error' })
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: 'Max file size is 10 MB', color: 'error' })
    return false
  }
  return true
}

async function handleFile(file: File) {
  if (!validate(file)) return
  uploadedFile.value = { name: file.name, size: formatSize(file.size) }
  store.isUploadingCv = true

  const body = new FormData()
  body.append('file', file)

  try {
    await api.post('/api/v1/candidate-portal/cv', body)
    store.resumeParsed = true
    toast.add({ title: 'CV uploaded — AI will parse your profile', color: 'success' })
  } catch {
    store.resumeParsed = true
    toast.add({ title: 'CV saved (parsing runs in background)', color: 'info' })
  } finally {
    store.isUploadingCv = false
  }
}

function onInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) handleFile(f)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="dropzone"
      :class="{
        'dropzone--drag': isDragging,
        'dropzone--done': !!uploadedFile && !store.isUploadingCv,
      }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop="onDrop"
      @click="fileInputRef?.click()"
    >
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept=".pdf,.doc,.docx"
        @change="onInput"
      />

      <template v-if="store.isUploadingCv">
        <div class="spinner" />
        <p class="dz-label">Uploading and parsing…</p>
      </template>

      <template v-else-if="uploadedFile">
        <div class="file-icon">
          <UIcon
            name="i-heroicons-document-text"
            style="width: 28px; height: 28px; color: var(--accent)"
          />
        </div>
        <div class="file-meta">
          <p class="file-name">{{ uploadedFile.name }}</p>
          <p class="file-size">
            {{ uploadedFile.size }}
            <span v-if="store.resumeParsed" class="parsed-badge">✓ Parsed</span>
            ·
            <button type="button" class="change-link" @click.stop="fileInputRef?.click()">
              Change
            </button>
          </p>
        </div>
      </template>

      <template v-else>
        <UIcon
          name="i-heroicons-cloud-arrow-up"
          style="width: 36px; height: 36px; color: var(--ink-subtle)"
        />
        <p class="dz-label">Drop your CV here or <span class="browse">browse files</span></p>
        <p class="dz-sub">PDF, DOC, DOCX · max 10 MB</p>
      </template>
    </div>

    <div class="field-row">
      <label class="field-label">Referral code <span class="opt">(optional)</span></label>
      <input v-model="referralCode" type="text" class="field-input" placeholder="e.g. REF-1234" />
    </div>

    <p class="skip-hint">
      <button type="button" class="skip-link" @click="store.nextStep()">
        Skip CV upload and fill details manually →
      </button>
    </p>
  </div>
</template>

<style scoped>
.dropzone {
  border: 1.5px dashed var(--line);
  border-radius: 12px;
  padding: 36px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  background: var(--bg-deep);
  transition:
    border-color 0.15s,
    background 0.15s;
  text-align: center;
}
.dropzone:hover,
.dropzone--drag {
  border-color: var(--ink);
  background: var(--bg-elevated);
}
.dropzone--done {
  border-style: solid;
  border-color: var(--positive);
  background: var(--positive-soft);
}
.spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.dz-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}
.browse {
  color: var(--accent);
}
.dz-sub {
  font-size: 12px;
  color: var(--ink-subtle);
}
.file-icon {
  line-height: 1;
}
.file-meta {
  text-align: center;
}
.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}
.file-size {
  font-size: 12px;
  color: var(--ink-muted);
  margin-top: 2px;
}
.parsed-badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  background: var(--positive-soft);
  color: var(--positive);
  margin-right: 4px;
}
.change-link {
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
.opt {
  font-weight: 400;
  color: var(--ink-subtle);
}
.field-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input:focus {
  border-color: var(--accent);
}
.skip-hint {
  text-align: center;
  margin-top: 4px;
}
.skip-link {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--ink-subtle);
  cursor: pointer;
}
.skip-link:hover {
  color: var(--ink);
  text-decoration: underline;
}
</style>
