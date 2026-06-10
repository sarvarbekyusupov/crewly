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
  const hhParam = route.query.hh as string | undefined
  if (!hhParam) return
  router.replace({ query: { ...route.query, hh: undefined } })

  if (hhParam === 'connected') {
    toast.add({ title: t('candidate.preferences.hhConnected'), color: 'success' })
    refresh()
  } else if (hhParam === 'denied') {
    toast.add({ title: t('candidate.preferences.hhAccessDenied'), color: 'warning' })
  } else if (hhParam === 'no_resume') {
    toast.add({
      title: t('candidate.preferences.hhConnectFailed'),
      description: 'No resumes found on your HH account',
      color: 'error',
    })
  } else if (hhParam === 'error') {
    toast.add({ title: t('candidate.preferences.hhConnectFailed'), color: 'error' })
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
  <div class="max-w-xl space-y-6">
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <p
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ink-subtle);
          margin-bottom: 6px;
        "
      >
        {{ t('candidate.preferences.eyebrow') }}
      </p>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--ink);
          font-weight: 400;
        "
      >
        {{ t('candidate.preferences.title') }}
      </h1>
    </div>

    <!-- Live settings summary -->
    <div
      class="rounded-lg px-4 py-3"
      style="background: var(--bg-elevated); border: 1px solid var(--line)"
    >
      <p
        class="text-xs font-medium mb-2"
        style="color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.08em"
      >
        Current settings
      </p>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm" style="color: var(--ink)">
        <span>
          <span style="color: var(--ink-subtle)">Min match </span>
          <strong>{{ minMatchScore > 0 ? minMatchScore + '%' : 'None' }}</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Auto-apply </span>
          <strong>{{ maxApplicationsPerDay }}/day</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Salary </span>
          <strong>{{
            expectedSalaryUzs ? Number(expectedSalaryUzs).toLocaleString() + ' UZS' : 'Any'
          }}</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Blocked </span>
          <strong
            >{{ blacklistedCompanies.length }}
            {{ blacklistedCompanies.length === 1 ? 'company' : 'companies' }}</strong
          >
        </span>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <UCard>
        <h3 class="section-label mb-4">{{ t('candidate.preferences.title') }}</h3>
        <div class="space-y-4">
          <UFormField
            :label="t('candidate.profile.preferredWorkMode')"
            :error="errors.preferredWorkMode"
          >
            <div class="flex gap-2">
              <button
                v-for="mode in [
                  { label: t('candidate.jobs.allModes'), value: '' },
                  { label: t('jobs.workMode.remote'), value: 'remote' },
                  { label: t('jobs.workMode.hybrid'), value: 'hybrid' },
                  { label: t('jobs.workMode.office'), value: 'office' },
                ]"
                :key="mode.value"
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                :style="
                  preferredWorkMode === mode.value
                    ? 'background: var(--ink); color: var(--bg);'
                    : 'background: var(--surface); color: var(--ink-muted); border: 1px solid var(--line);'
                "
                @click="preferredWorkMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.salaryLabel')"
            :hint="t('candidate.preferences.salaryHint')"
            :error="errors.expectedSalaryUzs"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model="expectedSalaryUzs"
                v-bind="expectedSalaryUzsProps"
                type="number"
                min="0"
                step="1000000"
                placeholder="e.g. 5000000"
                class="w-48"
              />
              <span v-if="expectedSalaryUzs" class="text-sm" style="color: var(--ink-muted)">
                {{ Number(expectedSalaryUzs).toLocaleString() }} UZS
              </span>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.minScoreLabel')"
            :hint="t('candidate.preferences.minScoreHint')"
            :error="errors.minMatchScore"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model="minMatchScore"
                v-bind="minMatchScoreProps"
                type="number"
                min="0"
                max="100"
                step="5"
                class="w-24"
              />
              <span class="text-sm" style="color: var(--ink-muted)">
                {{ minMatchScore || 'No' }} minimum
              </span>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.maxAppsLabel')"
            :hint="t('candidate.preferences.maxAppsHint')"
            :error="errors.maxApplicationsPerDay"
          >
            <UInput
              v-model="maxApplicationsPerDay"
              v-bind="maxApplicationsPerDayProps"
              type="number"
              min="1"
              max="50"
              class="w-24"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- HH Connect -->
      <UCard>
        <h3 class="section-label mb-3">{{ t('candidate.preferences.hhTitle') }}</h3>
        <p class="text-sm mb-4" style="color: var(--ink-muted)">
          {{ t('candidate.preferences.hhDesc') }}
        </p>

        <div v-if="prefs?.hhResumeId" class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="text-green-500 w-5 h-5" />
              <div>
                <p class="text-sm font-medium" style="color: var(--ink)">
                  <template v-if="hhMe?.first_name">
                    {{ t('candidate.preferences.hhConnectedAs') }} {{ hhMe.first_name }}
                    {{ hhMe.last_name }}
                  </template>
                  <template v-else>{{ t('candidate.preferences.hhConnectedLabel') }}</template>
                </p>
                <p class="text-xs" style="color: var(--ink-subtle)">
                  <template v-if="hhMe?.email">{{ hhMe.email }} · </template>
                  {{ t('candidate.preferences.hhActiveDesc') }}
                  <template v-if="viewsCount !== null">
                    · {{ viewsCount }} {{ t('candidate.preferences.hhResumeViews').toLowerCase() }}
                  </template>
                </p>
              </div>
            </div>
            <UButton
              variant="ghost"
              color="error"
              size="sm"
              :loading="disconnecting"
              @click="disconnectHh"
            >
              {{ t('candidate.preferences.disconnect') }}
            </UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              variant="outline"
              icon="i-heroicons-arrow-path"
              :loading="syncing"
              @click="syncHhResume"
            >
              {{ t('candidate.preferences.hhResumeSync') }}
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              icon="i-heroicons-eye"
              :loading="publishing"
              @click="publishHhResume"
            >
              {{ t('candidate.preferences.hhResumePublish') }}
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              icon="i-heroicons-eye-slash"
              :loading="hiding"
              @click="hideHhResume"
            >
              {{ t('candidate.preferences.hhResumeHide') }}
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              icon="i-heroicons-sparkles"
              :loading="syncingSkills"
              @click="syncSkillsToHh"
            >
              {{ t('candidate.preferences.hhResumeUpdate') }}
            </UButton>
          </div>
        </div>

        <UButton
          v-else
          :loading="hhConnecting"
          icon="i-heroicons-link"
          variant="outline"
          @click="connectHh"
        >
          {{ t('candidate.preferences.hhConnect') }}
        </UButton>
      </UCard>

      <!-- Blacklisted companies -->
      <UCard>
        <h3 class="section-label mb-3">{{ t('candidate.preferences.blacklistTitle') }}</h3>
        <p class="text-sm mb-3" style="color: var(--ink-muted)">
          {{ t('candidate.preferences.blacklistDesc') }}
        </p>
        <div class="flex gap-2 mb-3">
          <UInput
            v-model="blacklistInput"
            placeholder="Company name..."
            class="flex-1"
            @keydown.enter.prevent="addBlacklist"
          />
          <UButton type="button" variant="outline" icon="i-heroicons-plus" @click="addBlacklist" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="c in blacklistedCompanies" :key="c" color="error" variant="subtle">
            {{ c }}
            <button class="ml-1 hover:opacity-70" @click="removeBlacklist(c)">×</button>
          </UBadge>
          <span
            v-if="!blacklistedCompanies.length"
            class="text-sm"
            style="color: var(--ink-subtle)"
            >{{ t('candidate.preferences.noBlacklist') }}</span
          >
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton type="submit" :loading="saving" icon="i-heroicons-check">{{
          t('candidate.preferences.save')
        }}</UButton>
      </div>
    </form>
  </div>
</template>
