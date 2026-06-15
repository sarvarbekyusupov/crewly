<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { CandidatePreferences } from '~/types/api'
import { candidatePreferencesSchema } from '~/schemas/candidate'
import { isHhNotConnected } from '~/utils/hhErrors'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useHead({ title: t('candidate.preferences.title') })

const { data: prefs, refresh } = await useAsyncData('candidate-preferences', () =>
  api.get<CandidatePreferences>('/api/v1/candidate-portal/preferences').catch(() => null),
)

// Handle HH OAuth callback result from query param
const hhConnecting = ref(false)

onMounted(() => {
  hhConnecting.value = false
  const hhParam = route.query.hh as string | undefined
  const liParam = route.query.linkedin as string | undefined

  if (liParam) {
    router.replace({ query: { ...route.query, linkedin: undefined, reason: undefined } })
    if (liParam === 'connected') {
      toast.add({ title: 'LinkedIn connected!', color: 'success' })
      refresh()
    } else if (liParam === 'denied') {
      toast.add({ title: 'LinkedIn access denied', color: 'warning' })
    } else if (liParam === 'error') {
      const reason = route.query.reason as string | undefined
      toast.add({
        title: 'LinkedIn connection failed',
        description: reason ? decodeURIComponent(reason) : undefined,
        color: 'error',
      })
    }
  }

  if (!hhParam) return
  router.replace({ query: { ...route.query, hh: undefined } })

  if (hhParam === 'connected') {
    toast.add({ title: t('candidate.preferences.hhConnected'), color: 'success' })
    refresh()
  } else if (hhParam === 'denied') {
    toast.add({ title: t('candidate.preferences.hhAccessDenied'), color: 'warning' })
  } else if (hhParam === 'employer_account') {
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description:
        'You connected an employer HH account. Please log in to HH as a job seeker (соискатель) and try again.',
      color: 'error',
    })
  } else if (hhParam === 'no_resume') {
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description: 'No resumes found on your HH account. Please create a resume on hh.uz first.',
      color: 'error',
    })
  } else if (hhParam === 'connected_no_resume') {
    toast.add({
      title: 'HH account connected',
      description: 'Paste your HH resume URL below to complete setup.',
      color: 'warning',
    })
    refresh()
  } else if (hhParam === 'resume_forbidden') {
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description:
        'Access to your HH resumes was denied. The HH application needs applicant (соискатель) API access enabled on dev.hh.uz.',
      color: 'error',
    })
  } else if (hhParam === 'error') {
    const reason = route.query.reason as string | undefined
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description: reason ? decodeURIComponent(reason) : undefined,
      color: 'error',
    })
  }
})

async function connectHh() {
  hhConnecting.value = true
  try {
    const { url } = await api.get<{ url: string }>('/api/v1/candidate-portal/hh/oauth-url')
    window.location.href = url
  } catch (e) {
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description: extractApiErrorMessage(e),
      color: 'error',
    })
    hhConnecting.value = false
  }
}

const disconnecting = ref(false)

async function disconnectHh() {
  disconnecting.value = true
  try {
    await api.post('/api/v1/candidate-portal/hh/disconnect', {})
    toast.add({ title: t('candidate.preferences.hhDisconnected'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({
      title: t('candidate.preferences.hhDisconnectFailed'),
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    disconnecting.value = false
  }
}

const resumeUrlInput = ref('')
const savingResumeUrl = ref(false)

async function saveResumeUrl() {
  const url = resumeUrlInput.value.trim()
  if (!url) return
  savingResumeUrl.value = true
  try {
    await api.post('/api/v1/candidate-portal/hh/resume-url', { resumeUrl: url })
    toast.add({ title: 'HH resume linked!', color: 'success' })
    resumeUrlInput.value = ''
    refresh()
  } catch (e) {
    toast.add({
      title: 'Failed to save resume URL',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    savingResumeUrl.value = false
  }
}

const detecting = ref(false)

async function detectHhResume() {
  detecting.value = true
  try {
    const result = await api.post<{
      found: boolean
      resumeId?: string
      title?: string
      total?: number
    }>('/api/v1/candidate-portal/hh/resume/detect', {})
    if (result.found) {
      toast.add({
        title: 'Resume detected!',
        description: result.title ?? result.resumeId,
        color: 'success',
      })
      refresh()
    } else {
      toast.add({
        title: 'No resumes found',
        description: 'No resumes on HH account. Create one at hh.uz first.',
        color: 'warning',
      })
    }
  } catch (e: any) {
    const code = e?.data?.code ?? e?.response?.data?.code
    if (code === 'resume_access_denied') {
      toast.add({
        title: 'HH denied resume access',
        description: 'Paste your resume URL manually below.',
        color: 'error',
      })
    } else {
      toast.add({
        title: 'Detection failed',
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    }
  } finally {
    detecting.value = false
  }
}

const syncing = ref(false)
const publishing = ref(false)
const hiding = ref(false)
const syncingSkills = ref(false)
const viewsCount = ref<number | null>(null)
const viewsLoading = ref(false)

async function syncHhResume() {
  syncing.value = true
  try {
    await api.post('/api/v1/candidate-portal/hh/resume/sync', {})
    toast.add({ title: t('candidate.preferences.hhResumeSynced'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({
      title: t('candidate.preferences.hhResumeSyncFailed'),
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    syncing.value = false
  }
}

async function publishHhResume() {
  publishing.value = true
  try {
    await api.post('/api/v1/candidate-portal/hh/resume/publish', {})
    toast.add({ title: t('candidate.preferences.hhResumePublished'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    publishing.value = false
  }
}

async function syncSkillsToHh() {
  syncingSkills.value = true
  try {
    const profile = await api.get<{ skills: string[] }>('/api/v1/candidate-portal/profile')
    await api.put('/api/v1/candidate-portal/hh/resume', { skill_set: profile.skills ?? [] })
    toast.add({ title: t('candidate.preferences.hhResumeUpdated'), color: 'success' })
  } catch (e) {
    if (isHhNotConnected(e)) {
      toast.add({
        title: 'HH not connected',
        description: 'Connect your HH account below',
        color: 'warning',
      })
    } else {
      toast.add({
        title: t('candidate.preferences.hhResumeUpdateFailed'),
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    }
  } finally {
    syncingSkills.value = false
  }
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

const linkedInConnecting = ref(false)
const linkedInDisconnecting = ref(false)
const linkedInSyncing = ref(false)
const linkedInSyncResult = ref<{
  name?: string | null
  email?: string | null
  picture?: string | null
} | null>(null)

async function connectLinkedIn() {
  linkedInConnecting.value = true
  try {
    const { url } = await api.get<{ url: string }>('/api/v1/candidate-portal/linkedin/oauth-url')
    window.location.href = url
  } catch (e) {
    toast.add({
      title: 'LinkedIn connection failed',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
    linkedInConnecting.value = false
  }
}

async function disconnectLinkedIn() {
  linkedInDisconnecting.value = true
  try {
    await api.post('/api/v1/candidate-portal/linkedin/disconnect', {})
    toast.add({ title: 'LinkedIn disconnected', color: 'success' })
    linkedInSyncResult.value = null
    refresh()
  } catch (e) {
    toast.add({
      title: 'LinkedIn disconnect failed',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    linkedInDisconnecting.value = false
  }
}

async function syncLinkedInProfile() {
  linkedInSyncing.value = true
  try {
    const result = await api.post<{
      synced: boolean
      name?: string | null
      email?: string | null
      picture?: string | null
    }>('/api/v1/candidate-portal/linkedin/sync', {})
    linkedInSyncResult.value = result
    toast.add({
      title: 'LinkedIn profile synced!',
      description: result.name ?? undefined,
      color: 'success',
    })
    refresh()
  } catch (e) {
    toast.add({
      title: 'LinkedIn sync failed',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    linkedInSyncing.value = false
  }
}

async function hideHhResume() {
  hiding.value = true
  try {
    await api.post('/api/v1/candidate-portal/hh/resume/hide', {})
    toast.add({ title: t('candidate.preferences.hhResumeHidden'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    hiding.value = false
  }
}

async function loadViews() {
  if (!prefs.value?.hhResumeId) return
  viewsLoading.value = true
  try {
    const resp = await api.get<{ found: number }>('/api/v1/candidate-portal/hh/resume/views')
    viewsCount.value = resp.found
  } catch {
    // silently ignore
  } finally {
    viewsLoading.value = false
  }
}

watch(
  () => prefs.value?.hhResumeId,
  (id) => {
    if (id) loadViews()
  },
  { immediate: true },
)

const hhMe = ref<{ first_name?: string; last_name?: string; email?: string } | null>(null)

async function loadHhMe() {
  if (!prefs.value?.hhResumeId) return
  try {
    hhMe.value = await api.get('/api/v1/candidate-portal/hh/me')
  } catch {
    // silently ignore
  }
}

watch(
  () => prefs.value?.hhResumeId,
  (id) => {
    if (id) loadHhMe()
  },
  { immediate: true },
)

// --- VeeValidate form ---
const { errors, handleSubmit, defineField, setValues } = useForm({
  validationSchema: toTypedSchema(candidatePreferencesSchema),
  initialValues: {
    minMatchScore: 0,
    maxApplicationsPerDay: 5,
    preferredWorkMode: '',
    expectedSalaryUzs: '',
  },
})

const [minMatchScore, minMatchScoreProps] = defineField('minMatchScore') as unknown as [
  import('vue').Ref<number>,
  object,
]
const [maxApplicationsPerDay, maxApplicationsPerDayProps] = defineField(
  'maxApplicationsPerDay',
) as unknown as [import('vue').Ref<number>, object]
const [preferredWorkMode] = defineField('preferredWorkMode')
const [expectedSalaryUzs, expectedSalaryUzsProps] = defineField('expectedSalaryUzs')

const blacklistedCompanies = ref<string[]>([])
const blacklistInput = ref('')

watch(
  prefs,
  (p) => {
    if (!p) return
    setValues({
      minMatchScore: p.minMatchScore ?? 0,
      maxApplicationsPerDay: p.maxApplicationsPerDay ?? 5,
      preferredWorkMode: p.preferredWorkMode ?? '',
      expectedSalaryUzs: p.expectedSalaryUzs ? String(p.expectedSalaryUzs) : '',
    })
    blacklistedCompanies.value = [...(p.blacklistedCompanies ?? [])]
  },
  { immediate: true },
)

function addBlacklist() {
  const c = blacklistInput.value.trim()
  if (c && !blacklistedCompanies.value.includes(c)) blacklistedCompanies.value.push(c)
  blacklistInput.value = ''
}

function removeBlacklist(c: string) {
  blacklistedCompanies.value = blacklistedCompanies.value.filter((x) => x !== c)
}

const saving = ref(false)

const save = handleSubmit(async (values) => {
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/preferences', {
      minMatchScore: values.minMatchScore || null,
      blacklistedCompanies: blacklistedCompanies.value,
      maxApplicationsPerDay: values.maxApplicationsPerDay,
      preferredWorkMode: values.preferredWorkMode || null,
      expectedSalaryUzs: values.expectedSalaryUzs ? Number(values.expectedSalaryUzs) : null,
    })
    toast.add({ title: t('candidate.preferences.saved'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
})
</script>

<template>
  <div class="prefs-page">
    <!-- Header -->
    <div class="prefs-header">
      <p class="prefs-eyebrow">{{ t('candidate.preferences.eyebrow') }}</p>
      <h1 class="prefs-title">{{ t('candidate.preferences.title') }}</h1>
    </div>

    <!-- Live summary strip -->
    <div class="prefs-summary-strip">
      <div class="prefs-summary-pill">
        <span class="prefs-summary-key">Work</span>
        <span class="prefs-summary-val">{{ preferredWorkMode || 'Any' }}</span>
      </div>
      <div class="prefs-summary-pill">
        <span class="prefs-summary-key">Match ≥</span>
        <span class="prefs-summary-val" :style="minMatchScore > 0 ? 'color: var(--accent)' : ''">
          {{ minMatchScore > 0 ? minMatchScore + '%' : 'Off' }}
        </span>
      </div>
      <div class="prefs-summary-pill">
        <span class="prefs-summary-key">Auto-apply</span>
        <span class="prefs-summary-val">{{ maxApplicationsPerDay }}/day</span>
      </div>
      <div class="prefs-summary-pill">
        <span class="prefs-summary-key">Salary</span>
        <span class="prefs-summary-val">
          {{ expectedSalaryUzs ? Number(expectedSalaryUzs).toLocaleString() + ' UZS' : 'Any' }}
        </span>
      </div>
    </div>

    <form class="prefs-form" @submit.prevent="save">
      <!-- Section: Matching -->
      <section class="prefs-section">
        <div class="prefs-section-head">
          <UIcon name="i-heroicons-sparkles" class="prefs-section-icon" />
          <h2 class="prefs-section-title">Matching</h2>
        </div>

        <div class="prefs-field">
          <label class="prefs-label">{{ t('candidate.profile.preferredWorkMode') }}</label>
          <div class="prefs-mode-row">
            <button
              v-for="mode in [
                { label: t('candidate.jobs.allModes'), value: '' },
                { label: t('jobs.workMode.remote'), value: 'remote' },
                { label: t('jobs.workMode.hybrid'), value: 'hybrid' },
                { label: t('jobs.workMode.office'), value: 'office' },
              ]"
              :key="mode.value"
              type="button"
              class="prefs-mode-btn"
              :class="{ 'prefs-mode-btn--active': preferredWorkMode === mode.value }"
              @click="preferredWorkMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>
          <p v-if="errors.preferredWorkMode" class="prefs-error">{{ errors.preferredWorkMode }}</p>
        </div>

        <div class="prefs-field">
          <label class="prefs-label">{{ t('candidate.preferences.minScoreLabel') }}</label>
          <p class="prefs-hint">{{ t('candidate.preferences.minScoreHint') }}</p>
          <div class="prefs-score-row">
            <input
              v-model="minMatchScore"
              v-bind="minMatchScoreProps"
              type="range"
              min="0"
              max="100"
              step="5"
              class="prefs-slider"
            />
            <span
              class="prefs-score-badge"
              :style="minMatchScore > 0 ? 'color: var(--accent); border-color: var(--accent)' : ''"
            >
              {{ minMatchScore > 0 ? minMatchScore + '%' : 'Off' }}
            </span>
          </div>
          <p v-if="errors.minMatchScore" class="prefs-error">{{ errors.minMatchScore }}</p>
        </div>

        <div class="prefs-field">
          <label class="prefs-label">{{ t('candidate.preferences.salaryLabel') }}</label>
          <p class="prefs-hint">{{ t('candidate.preferences.salaryHint') }}</p>
          <div class="prefs-salary-row">
            <UInput
              v-model="expectedSalaryUzs"
              v-bind="expectedSalaryUzsProps"
              type="number"
              min="0"
              step="1000000"
              placeholder="e.g. 5000000"
              class="prefs-salary-input"
            />
            <span class="prefs-salary-unit">UZS</span>
          </div>
          <p v-if="errors.expectedSalaryUzs" class="prefs-error">{{ errors.expectedSalaryUzs }}</p>
        </div>

        <div class="prefs-field">
          <label class="prefs-label">{{ t('candidate.preferences.maxAppsLabel') }}</label>
          <p class="prefs-hint">{{ t('candidate.preferences.maxAppsHint') }}</p>
          <div class="prefs-apps-row">
            <button
              v-for="n in [1, 3, 5, 10, 20]"
              :key="n"
              type="button"
              class="prefs-mode-btn"
              :class="{ 'prefs-mode-btn--active': maxApplicationsPerDay === n }"
              @click="maxApplicationsPerDay = n"
            >
              {{ n }}
            </button>
            <span class="text-xs ml-1" style="color: var(--ink-subtle)">per day</span>
          </div>
          <p v-if="errors.maxApplicationsPerDay" class="prefs-error">
            {{ errors.maxApplicationsPerDay }}
          </p>
        </div>
      </section>

      <!-- Section: HH Integration -->
      <section class="prefs-section">
        <div class="prefs-section-head">
          <span class="prefs-hh-badge">HH</span>
          <h2 class="prefs-section-title">{{ t('candidate.preferences.hhTitle') }}</h2>
        </div>
        <p class="prefs-section-desc">{{ t('candidate.preferences.hhDesc') }}</p>

        <!-- Connected state -->
        <div v-if="prefs?.hhResumeId" class="prefs-hh-connected">
          <div class="prefs-hh-identity">
            <div class="prefs-hh-avatar">
              {{ (hhMe?.first_name ?? 'H').charAt(0).toUpperCase() }}
            </div>
            <div class="prefs-hh-info">
              <p class="prefs-hh-name">
                <template v-if="hhMe?.first_name"
                  >{{ hhMe.first_name }} {{ hhMe.last_name }}</template
                >
                <template v-else>{{ t('candidate.preferences.hhConnectedLabel') }}</template>
              </p>
              <p class="prefs-hh-meta">
                <template v-if="hhMe?.email">{{ hhMe.email }}</template>
                <template v-if="viewsCount !== null"> · {{ viewsCount }} views</template>
              </p>
            </div>
            <span class="prefs-hh-status-dot" />
          </div>
          <div class="prefs-hh-actions">
            <button
              type="button"
              class="prefs-hh-action-btn"
              :disabled="syncing"
              :title="t('candidate.preferences.hhResumeSync')"
              @click="syncHhResume"
            >
              <UIcon name="i-heroicons-arrow-path" :class="{ 'animate-spin': syncing }" />
              <span>Sync CV</span>
            </button>
            <button
              type="button"
              class="prefs-hh-action-btn"
              :disabled="publishing"
              :title="t('candidate.preferences.hhResumePublish')"
              @click="publishHhResume"
            >
              <UIcon name="i-heroicons-eye" />
              <span>Publish</span>
            </button>
            <button
              type="button"
              class="prefs-hh-action-btn"
              :disabled="hiding"
              :title="t('candidate.preferences.hhResumeHide')"
              @click="hideHhResume"
            >
              <UIcon name="i-heroicons-eye-slash" />
              <span>Hide</span>
            </button>
            <button
              type="button"
              class="prefs-hh-action-btn"
              :disabled="syncingSkills"
              :title="t('candidate.preferences.hhResumeUpdate')"
              @click="syncSkillsToHh"
            >
              <UIcon name="i-heroicons-sparkles" />
              <span>Skills</span>
            </button>
            <button
              type="button"
              class="prefs-hh-action-btn prefs-hh-action-btn--danger"
              :disabled="disconnecting"
              @click="disconnectHh"
            >
              <UIcon name="i-heroicons-x-mark" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        <!-- Partial connection state: token stored but no resume ID yet -->
        <div v-else-if="prefs?.hhOauthTokenSet" class="prefs-hh-partial">
          <p class="prefs-hint" style="margin-bottom: 10px">
            HH account connected — auto-detect your resume or paste the URL manually.
            <br />
            <span style="opacity: 0.6; font-size: 0.85em">
              Example: https://hh.uz/resume/abc123def456
            </span>
          </p>
          <UButton
            type="button"
            :loading="detecting"
            icon="i-heroicons-magnifying-glass"
            style="margin-bottom: 10px; width: 100%; justify-content: center"
            @click="detectHhResume"
          >
            Auto-detect resume
          </UButton>
          <div style="display: flex; gap: 8px; align-items: center">
            <UInput
              v-model="resumeUrlInput"
              placeholder="https://hh.uz/resume/..."
              style="flex: 1"
              @keydown.enter.prevent="saveResumeUrl"
            />
            <UButton
              type="button"
              :loading="savingResumeUrl"
              icon="i-heroicons-check"
              @click="saveResumeUrl"
            >
              Save
            </UButton>
          </div>
          <button
            type="button"
            class="prefs-hh-action-btn prefs-hh-action-btn--danger"
            style="margin-top: 10px"
            :disabled="disconnecting"
            @click="disconnectHh"
          >
            <UIcon name="i-heroicons-x-mark" />
            <span>Disconnect</span>
          </button>
        </div>

        <!-- Not connected state -->
        <button
          v-else
          type="button"
          class="prefs-hh-connect-btn"
          :disabled="hhConnecting"
          @click="connectHh"
        >
          <UIcon v-if="hhConnecting" name="i-heroicons-arrow-path" class="animate-spin" />
          <UIcon v-else name="i-heroicons-link" />
          <span>{{ t('candidate.preferences.hhConnect') }}</span>
        </button>
      </section>

      <!-- Section: LinkedIn Integration -->
      <section class="prefs-section">
        <div class="prefs-section-head">
          <span class="prefs-li-badge">in</span>
          <h2 class="prefs-section-title">LinkedIn</h2>
        </div>
        <p class="prefs-section-desc">
          Connect LinkedIn to import your profile name and sync identity.
        </p>

        <!-- Connected state -->
        <div v-if="prefs?.linkedinOauthTokenSet" class="prefs-li-connected">
          <div class="prefs-hh-identity">
            <div class="prefs-li-avatar">
              {{ (linkedInSyncResult?.name ?? 'L').charAt(0).toUpperCase() }}
            </div>
            <div class="prefs-hh-info">
              <p class="prefs-hh-name">{{ linkedInSyncResult?.name ?? 'LinkedIn connected' }}</p>
              <p class="prefs-hh-meta">
                {{ linkedInSyncResult?.email ?? 'Sync to load profile info' }}
              </p>
            </div>
            <span class="prefs-hh-status-dot" />
          </div>
          <div class="prefs-hh-actions">
            <button
              type="button"
              class="prefs-hh-action-btn"
              :disabled="linkedInSyncing"
              @click="syncLinkedInProfile"
            >
              <UIcon name="i-heroicons-arrow-path" :class="{ 'animate-spin': linkedInSyncing }" />
              <span>Sync profile</span>
            </button>
            <button
              type="button"
              class="prefs-hh-action-btn prefs-hh-action-btn--danger"
              :disabled="linkedInDisconnecting"
              @click="disconnectLinkedIn"
            >
              <UIcon name="i-heroicons-x-mark" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        <!-- Not connected state -->
        <button
          v-else
          type="button"
          class="prefs-li-connect-btn"
          :disabled="linkedInConnecting"
          @click="connectLinkedIn"
        >
          <UIcon v-if="linkedInConnecting" name="i-heroicons-arrow-path" class="animate-spin" />
          <UIcon v-else name="i-heroicons-link" />
          <span>Connect LinkedIn</span>
        </button>
      </section>

      <!-- Section: Blacklist -->
      <section class="prefs-section" style="border-bottom: none">
        <div class="prefs-section-head">
          <UIcon name="i-heroicons-no-symbol" class="prefs-section-icon" />
          <h2 class="prefs-section-title">{{ t('candidate.preferences.blacklistTitle') }}</h2>
        </div>
        <p class="prefs-section-desc">{{ t('candidate.preferences.blacklistDesc') }}</p>
        <div class="prefs-blacklist-add">
          <UInput
            v-model="blacklistInput"
            placeholder="Company name…"
            class="flex-1"
            @keydown.enter.prevent="addBlacklist"
          />
          <UButton type="button" variant="outline" icon="i-heroicons-plus" @click="addBlacklist" />
        </div>
        <div class="prefs-blacklist-chips">
          <span v-for="c in blacklistedCompanies" :key="c" class="prefs-blacklist-chip">
            {{ c }}
            <button type="button" class="prefs-chip-remove" @click="removeBlacklist(c)">×</button>
          </span>
          <span v-if="!blacklistedCompanies.length" class="prefs-empty-hint">
            {{ t('candidate.preferences.noBlacklist') }}
          </span>
        </div>
      </section>

      <div class="prefs-save-row">
        <UButton type="submit" :loading="saving" icon="i-heroicons-check" size="lg">
          {{ t('candidate.preferences.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.prefs-page {
  max-width: 560px;
}

.prefs-header {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
}

.prefs-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-subtle);
  margin-bottom: 6px;
}

.prefs-title {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--ink);
  font-weight: 400;
}

.prefs-summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.prefs-summary-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  font-size: 12px;
}

.prefs-summary-key {
  color: var(--ink-subtle);
}

.prefs-summary-val {
  color: var(--ink);
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.prefs-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.prefs-section {
  padding: 24px 0;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prefs-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prefs-section-icon {
  width: 16px;
  height: 16px;
  color: var(--ink-subtle);
  flex-shrink: 0;
}

.prefs-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.prefs-section-desc {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.5;
  margin-top: -8px;
}

.prefs-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prefs-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.prefs-hint {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: -2px;
}

.prefs-error {
  font-size: 12px;
  color: var(--negative);
}

.prefs-mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prefs-mode-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.prefs-mode-btn:hover {
  border-color: var(--ink-subtle);
  color: var(--ink);
}

.prefs-mode-btn--active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.prefs-score-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prefs-slider {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
}

.prefs-score-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  color: var(--ink-subtle);
  min-width: 52px;
  text-align: center;
}

.prefs-salary-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prefs-salary-input {
  width: 180px;
}

.prefs-salary-unit {
  font-size: 12px;
  color: var(--ink-subtle);
  font-family: 'JetBrains Mono', monospace;
}

.prefs-apps-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* HH Integration */
.prefs-hh-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #d52b1e;
  color: #fff;
  letter-spacing: 0.05em;
}

.prefs-hh-connected {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
}

.prefs-hh-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prefs-hh-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #d52b1e;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prefs-hh-info {
  flex: 1;
  min-width: 0;
}

.prefs-hh-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.prefs-hh-meta {
  font-size: 11px;
  color: var(--ink-subtle);
  margin-top: 1px;
}

.prefs-hh-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--positive);
  flex-shrink: 0;
}

.prefs-hh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prefs-hh-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.prefs-hh-action-btn:hover:not(:disabled) {
  border-color: var(--ink-subtle);
  color: var(--ink);
}

.prefs-hh-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prefs-hh-action-btn--danger:hover:not(:disabled) {
  border-color: var(--negative);
  color: var(--negative);
}

.prefs-hh-connect-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px dashed var(--line);
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  justify-content: center;
}

.prefs-hh-connect-btn:hover:not(:disabled) {
  border-color: #d52b1e;
  color: #d52b1e;
  background: color-mix(in srgb, #d52b1e 6%, transparent);
}

.prefs-hh-connect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Blacklist */
.prefs-blacklist-add {
  display: flex;
  gap: 8px;
}

.prefs-blacklist-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
}

.prefs-blacklist-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: color-mix(in srgb, var(--negative) 10%, transparent);
  color: var(--negative);
  border: 1px solid color-mix(in srgb, var(--negative) 22%, transparent);
}

.prefs-chip-remove {
  font-size: 14px;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;
  padding: 0 1px;
}

.prefs-chip-remove:hover {
  opacity: 1;
}

.prefs-empty-hint {
  font-size: 12px;
  color: var(--ink-subtle);
}

.prefs-save-row {
  padding-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* LinkedIn Integration */
.prefs-li-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0a66c2;
  color: #fff;
  letter-spacing: 0.05em;
}

.prefs-li-connected {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
}

.prefs-li-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0a66c2;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prefs-li-connect-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px dashed var(--line);
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  justify-content: center;
}

.prefs-li-connect-btn:hover:not(:disabled) {
  border-color: #0a66c2;
  color: #0a66c2;
  background: color-mix(in srgb, #0a66c2 6%, transparent);
}

.prefs-li-connect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
