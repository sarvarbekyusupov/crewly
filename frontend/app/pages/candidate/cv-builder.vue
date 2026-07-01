<script setup lang="ts">
import type { SeekerApplication } from '~/types/api'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const route = useRoute()

useHead({ title: 'CV Builder' })

const activeTab = ref<'cover-letter' | 'cv-summary'>('cover-letter')

const jobTitle = ref((route.query.jobTitle as string) ?? '')
const company = ref((route.query.company as string) ?? '')
const jobDescription = ref((route.query.desc as string) ?? '')
const jobSkills = ref('')

const coverLetter = ref('')
const cvSummary = ref('')
const loading = ref(false)
const copied = ref(false)

async function generate() {
  if (!jobTitle.value.trim() || !company.value.trim()) {
    toast.add({ title: 'Job title and company required', color: 'warning' })
    return
  }

  loading.value = true
  copied.value = false

  try {
    if (activeTab.value === 'cover-letter') {
      const res = await api.post<{ coverLetter: string }>(
        '/api/v1/candidate-portal/generate/cover-letter',
        {
          jobTitle: jobTitle.value.trim(),
          company: company.value.trim(),
          jobDescription: jobDescription.value.trim(),
          jobSkills: jobSkills.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      )
      coverLetter.value = res.coverLetter
    } else {
      const res = await api.post<{ cvSummary: string }>(
        '/api/v1/candidate-portal/generate/cv-summary',
        {
          jobTitle: jobTitle.value.trim(),
          company: company.value.trim(),
          jobDescription: jobDescription.value.trim(),
        },
      )
      cvSummary.value = res.cvSummary
    }
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Generation failed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

const output = computed(() =>
  activeTab.value === 'cover-letter' ? coverLetter.value : cvSummary.value,
)

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function downloadOutput() {
  if (!output.value) return
  const label = activeTab.value === 'cover-letter' ? 'cover-letter' : 'cv-summary'
  const blob = new Blob([output.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${label}-${company.value.replace(/\s+/g, '-').toLowerCase()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

watch(activeTab, () => {
  copied.value = false
})

// ── Save cover letter to seeker application ──────────────────────────────────

interface AppOption {
  label: string
  value: string
}

const { data: seekerApps } = await useAsyncData(
  'cv-builder-seeker-apps',
  () =>
    api
      .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
      .catch(() => [] as SeekerApplication[]),
  { lazy: true },
)

const appOptions = computed<AppOption[]>(() =>
  (seekerApps.value ?? []).map((a) => ({
    label: `${a.discoveredJob?.title ?? 'Unknown'} · ${a.discoveredJob?.company ?? '—'}`,
    value: a.id,
  })),
)

const saveToAppId = ref<string | null>(null)
const saveDropdownOpen = ref(false)
const saving = ref(false)

async function saveToApplication(appId: string) {
  if (!coverLetter.value || !appId) return
  saving.value = true
  saveDropdownOpen.value = false
  try {
    await api.patch(`/api/v1/candidate-portal/seeker-applications/${appId}/cover-letter`, {
      coverLetter: coverLetter.value,
    })
    saveToAppId.value = appId
    toast.add({ title: 'Cover letter saved to application', color: 'success' })
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Save failed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="builder-layout">
    <!-- Header -->
    <div class="builder-header">
      <div>
        <p class="eyebrow">AI Tools</p>
        <h1 class="page-title">CV Builder</h1>
        <p class="subtitle">Generate tailored cover letters and CV summaries in seconds.</p>
      </div>
    </div>

    <!-- Tab strip -->
    <div class="tab-strip">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'cover-letter' }"
        @click="activeTab = 'cover-letter'"
      >
        <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
        Cover Letter
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'cv-summary' }"
        @click="activeTab = 'cv-summary'"
      >
        <UIcon name="i-heroicons-user-circle" class="w-4 h-4" />
        CV Summary
      </button>
    </div>

    <!-- Two-column layout -->
    <div class="builder-body">
      <!-- Left: input form -->
      <div class="form-panel">
        <p class="panel-label">Job Details</p>

        <div class="field-group">
          <label class="field-label">Job Title *</label>
          <UInput
            v-model="jobTitle"
            placeholder="e.g. Senior Frontend Engineer"
            @keydown.enter="generate"
          />
        </div>

        <div class="field-group">
          <label class="field-label">Company *</label>
          <UInput v-model="company" placeholder="e.g. Uzum Market" @keydown.enter="generate" />
        </div>

        <div class="field-group">
          <label class="field-label">Job Description</label>
          <textarea
            v-model="jobDescription"
            class="textarea-field"
            rows="8"
            placeholder="Paste the job description here for a more tailored result…"
          />
        </div>

        <div v-if="activeTab === 'cover-letter'" class="field-group">
          <label class="field-label"
            >Required Skills <span class="field-hint">(comma-separated)</span></label
          >
          <UInput v-model="jobSkills" placeholder="Vue.js, TypeScript, Node.js" />
        </div>

        <UButton block :loading="loading" icon="i-heroicons-sparkles" @click="generate">
          {{ loading ? 'Generating…' : 'Generate' }}
        </UButton>
      </div>

      <!-- Right: output -->
      <div class="output-panel">
        <div class="output-header">
          <p class="panel-label">
            {{ activeTab === 'cover-letter' ? 'Cover Letter' : 'Professional Summary' }}
          </p>
          <div v-if="output" class="output-actions">
            <UButton
              size="xs"
              variant="ghost"
              :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
              @click="copyOutput"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadOutput"
            >
              Download
            </UButton>
            <!-- Save to application — cover-letter tab only -->
            <UDropdownMenu
              v-if="activeTab === 'cover-letter' && appOptions.length"
              v-model:open="saveDropdownOpen"
              :items="
                appOptions.map((o) => ({
                  label: o.label,
                  onSelect: () => saveToApplication(o.value),
                }))
              "
            >
              <UButton
                size="xs"
                :variant="saveToAppId ? 'solid' : 'ghost'"
                :icon="
                  saving
                    ? 'i-heroicons-arrow-path'
                    : saveToAppId
                      ? 'i-heroicons-check'
                      : 'i-heroicons-bookmark'
                "
                :loading="saving"
              >
                {{ saveToAppId ? 'Saved' : 'Save to app' }}
              </UButton>
            </UDropdownMenu>
          </div>
        </div>

        <!-- Skeleton while loading -->
        <div v-if="loading" class="output-skeleton">
          <USkeleton class="h-4 w-full rounded" />
          <USkeleton class="h-4 w-5/6 rounded" />
          <USkeleton class="h-4 w-full rounded" />
          <USkeleton class="h-4 w-4/5 rounded" />
          <USkeleton class="h-4 w-full rounded" />
          <USkeleton class="h-4 w-3/4 rounded" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!output" class="output-empty">
          <UIcon name="i-heroicons-sparkles" class="w-10 h-10 empty-icon" />
          <p class="empty-title">
            {{
              activeTab === 'cover-letter'
                ? 'Your cover letter will appear here'
                : 'Your CV summary will appear here'
            }}
          </p>
          <p class="empty-desc">
            Fill in the job details on the left and click Generate.
            {{
              activeTab === 'cover-letter'
                ? 'The more description you provide, the more tailored the result.'
                : 'Your profile skills and experience are used automatically.'
            }}
          </p>
        </div>

        <!-- Output text -->
        <div v-else class="output-text-wrap">
          <p class="output-text">{{ output }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1100px;
}

.builder-header {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-subtle);
  margin-bottom: 4px;
}
.page-title {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--ink);
  font-weight: 400;
}
.subtitle {
  margin-top: 4px;
  font-size: 13.5px;
  color: var(--ink-muted);
}

/* Tabs */
.tab-strip {
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 3px;
  border: 1px solid var(--line-soft);
  width: fit-content;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  background: none;
}
.tab-btn.active {
  background: var(--bg);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.tab-btn:hover:not(.active) {
  color: var(--ink);
}

/* Body layout */
.builder-body {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 860px) {
  .builder-body {
    grid-template-columns: 1fr;
  }
}

/* Form panel */
.form-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
}
.panel-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
.field-hint {
  font-size: 11.5px;
  color: var(--ink-subtle);
  font-weight: 400;
}
.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 13.5px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.textarea-field:focus {
  border-color: var(--accent, #5b6af5);
}
.textarea-field::placeholder {
  color: var(--ink-subtle);
}

/* Output panel */
.output-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  min-height: 400px;
}
.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.output-actions {
  display: flex;
  gap: 4px;
}
.output-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}
.output-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
}
.empty-icon {
  color: var(--ink-subtle);
}
.empty-title {
  font-family: 'Fraunces', serif;
  font-size: 18px;
  color: var(--ink);
  font-weight: 400;
}
.empty-desc {
  font-size: 13px;
  color: var(--ink-muted);
  max-width: 320px;
  line-height: 1.6;
}
.output-text-wrap {
  flex: 1;
}
.output-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
  white-space: pre-wrap;
}
</style>
