<script setup lang="ts">
import { watchDebounced, useEventBus } from '@vueuse/core'
import { safeUrl } from '~/utils/safeUrl'
import type { DiscoveredJob, PaginatedResponse } from '~/types/api'
import { capitalizeStatus } from '~/utils/candidate'
import { scoringActive, scoringLog, scoringProgress } from '~/composables/useCandidateEventStream'
import { sanitizeHtml } from '~/utils/sanitize'
import { isHhNotConnected } from '~/utils/hhErrors'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()

useHead({ title: 'Job Discovery' })

const search = ref('')
const workMode = ref('all')
const minScore = ref(0)
const sortBy = ref<'recent' | 'score'>('recent')
const page = ref(1)
const limit = 20
const viewMode = ref<'feed' | 'list'>('feed')

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData(
  'discovered-jobs',
  () =>
    api.get<PaginatedResponse<DiscoveredJob>>('/api/v1/candidate-portal/discovered-jobs', {
      ...(search.value && { search: search.value }),
      ...(workMode.value && workMode.value !== 'all' && { workMode: workMode.value }),
      ...(minScore.value > 0 && { minScore: minScore.value }),
      sortBy: sortBy.value,
      page: page.value,
      limit,
    }),
  { watch: [search, workMode, minScore, sortBy, page] },
)

const jobs = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watchDebounced(
  search,
  () => {
    page.value = 1
  },
  { debounce: 300 },
)
watch([workMode, minScore, sortBy], () => {
  page.value = 1
})

// Two-panel selected job
const selectedJobId = ref<string | null>(null)
const selectedJob = computed<DiscoveredJob | null>(() => {
  const id = selectedJobId.value
  if (!id) return jobs.value[0] ?? null
  return jobs.value.find((j) => j.id === id) ?? jobs.value[0] ?? null
})

watch(
  jobs,
  (newJobs) => {
    if (newJobs.length && !newJobs.find((j) => j.id === selectedJobId.value)) {
      selectedJobId.value = newJobs[0]?.id ?? null
    }
  },
  { immediate: true },
)

const skippedIds = ref(new Set<string>())
const savedIds = ref(new Set<string>())

function skipJob(id: string) {
  skippedIds.value = new Set([...skippedIds.value, id])
}

function toggleSave(id: string) {
  const next = new Set(savedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  savedIds.value = next
}

const workModeOptions = computed(() => [
  { label: t('candidate.jobs.allModes'), value: 'all' },
  { label: t('candidate.jobs.office'), value: 'office' },
  { label: t('candidate.jobs.hybrid'), value: 'hybrid' },
  { label: t('candidate.jobs.remote'), value: 'remote' },
])

const sortOptions = computed(() => [
  { label: t('candidate.jobs.mostRecent'), value: 'recent' },
  { label: t('candidate.jobs.bestMatch'), value: 'score' },
])

const scoringInProgress = ref(false)
const discoveringInProgress = ref(false)

async function triggerScoring() {
  scoringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/score', {})
    toast.add({
      title: t('candidate.dashboard.scoringQueued'),
      description: t('candidate.dashboard.scoringDesc'),
      color: 'success',
    })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    scoringInProgress.value = false
  }
}

async function triggerDiscover() {
  discoveringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/discover', {})
    toast.add({
      title: 'Job discovery started',
      description: 'Finding new roles tailored to your profile. Check back in a minute.',
      color: 'success',
    })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    discoveringInProgress.value = false
  }
}

useEventBus<undefined>('candidate:scoring-complete').on(() => refresh())

const applying = ref(new Set<string>())

const router = useRouter()

async function applyToJob(job: DiscoveredJob) {
  if (applying.value.has(job.id)) return
  const next = new Set(applying.value)
  next.add(job.id)
  applying.value = next
  try {
    const result = await api.post<{ id: string }>('/api/v1/candidate-portal/seeker-applications', {
      discoveredJobId: job.id,
    })
    toast.add({
      title: 'Application queued',
      description: `Applying to ${job.title} at ${job.company}`,
      color: 'success',
      actions: [
        {
          label: 'Track in Inbox →',
          onClick: () => {
            void router.push(result?.id ? `/candidate/inbox?app=${result.id}` : '/candidate/inbox')
          },
        },
      ],
    })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Failed to queue application'), color: 'error' })
  } finally {
    const n = new Set(applying.value)
    n.delete(job.id)
    applying.value = n
  }
}

function scoreBarColor(score: number | null | undefined): string {
  if (score == null) return 'var(--ink-subtle)'
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function scoreColor(score: number | null | undefined): 'neutral' | 'success' | 'warning' | 'error' {
  if (score == null) return 'neutral'
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

const appStatusColor = seekerAppStatusColor

function formatPostedDate(dateStr?: any): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ── Live HH Search ────────────────────────────────────────────────────────

interface HhVacancyResult {
  id: string
  name: string
  alternate_url: string
  employer: { name: string }
  area?: { name: string }
  salary?: { from?: number; to?: number; currency?: string }
  snippet?: { requirement?: string; responsibility?: string }
  published_at?: string
}

const activeMainTab = ref<'discovered' | 'live' | 'match'>('discovered')
const liveSearchText = ref('')
const liveSearchResults = ref<HhVacancyResult[]>([])
const liveSearchTotal = ref(0)
const liveSearchPending = ref(false)
const liveSearchPage = ref(0)
const LIVE_PER_PAGE = 20
const similarResults = ref<HhVacancyResult[]>([])
const similarFor = ref<string | null>(null)
const similarPending = ref(false)
const applyingHh = ref(new Set<string>())

// Matched vacancies (resume-based)
const matchedResults = ref<HhVacancyResult[]>([])
const matchedLoaded = ref(false)
const matchedPending = ref(false)
const matchedTotal = ref(0)
const matchedPage = ref(1)
const MATCHED_PER_PAGE = 20

async function loadMatchedVacancies(page = 1) {
  matchedPending.value = true
  try {
    const resp = await api.get<{ items: HhVacancyResult[]; found: number }>(
      '/api/v1/candidate-portal/hh/resume/similar-vacancies',
      { page: page - 1, per_page: MATCHED_PER_PAGE },
    )
    matchedResults.value = resp.items ?? []
    matchedTotal.value = resp.found ?? 0
    matchedLoaded.value = true
  } catch (e) {
    if (isHhNotConnected(e)) {
      toast.add({
        title: 'Connect HH first',
        description: 'Go to Preferences → HH to connect your account',
        color: 'warning',
      })
    } else {
      toast.add({
        title: t('common.error'),
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    }
  } finally {
    matchedPending.value = false
  }
}

watch(matchedPage, (p) => loadMatchedVacancies(p))
watch(activeMainTab, (tab) => {
  if (tab === 'match' && !matchedLoaded.value) loadMatchedVacancies(1)
})

// Vacancy detail expand
interface HhVacancyDetailResult extends HhVacancyResult {
  description?: string
  key_skills?: { name: string }[]
  employment?: { name: string }
  schedule?: { name: string }
  experience?: { name: string }
  employer: { name: string; logo_urls?: { original?: string } }
}

const selectedVacancyId = ref<string | null>(null)
const vacancyDetails = ref<Record<string, HhVacancyDetailResult>>({})
const vacancyDetailPending = ref<string | null>(null)

async function toggleVacancyDetail(id: string) {
  if (selectedVacancyId.value === id) {
    selectedVacancyId.value = null
    return
  }
  selectedVacancyId.value = id
  if (vacancyDetails.value[id]) return
  vacancyDetailPending.value = id
  try {
    const detail = await api.get<HhVacancyDetailResult>(
      `/api/v1/candidate-portal/hh/vacancies/${id}`,
    )
    vacancyDetails.value = { ...vacancyDetails.value, [id]: detail }
  } catch {
    // silently ignore — fall back to card info
  } finally {
    vacancyDetailPending.value = null
  }
}

async function applyOnHh(vacancyId: string) {
  if (applyingHh.value.has(vacancyId)) return
  applyingHh.value = new Set([...applyingHh.value, vacancyId])
  try {
    await api.post(`/api/v1/candidate-portal/hh/vacancies/${vacancyId}/apply`, {})
    toast.add({ title: t('candidate.preferences.hhApplied'), color: 'success' })
  } catch (e) {
    if (isHhNotConnected(e)) {
      toast.add({
        title: 'Connect HH first',
        description: 'Go to Preferences → HH to connect your account',
        color: 'warning',
      })
    } else {
      toast.add({
        title: t('candidate.preferences.hhApplyFailed'),
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    }
  } finally {
    const next = new Set(applyingHh.value)
    next.delete(vacancyId)
    applyingHh.value = next
  }
}

async function runLiveSearch(resetPage = true) {
  if (!liveSearchText.value.trim()) return
  if (resetPage) liveSearchPage.value = 0
  liveSearchPending.value = true
  try {
    const resp = await api.get<{ items: HhVacancyResult[]; found: number }>(
      '/api/v1/candidate-portal/hh/vacancies',
      {
        text: liveSearchText.value,
        page: liveSearchPage.value,
        per_page: LIVE_PER_PAGE,
        ...(hhAreaId.value && { area: hhAreaId.value }),
      },
    )
    liveSearchResults.value = resp.items ?? []
    liveSearchTotal.value = resp.found ?? 0
  } catch (e) {
    if (isHhNotConnected(e)) {
      toast.add({
        title: 'Connect HH first',
        description: 'Go to Preferences → HH to connect your account',
        color: 'warning',
      })
    } else {
      toast.add({
        title: t('common.error'),
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    }
  } finally {
    liveSearchPending.value = false
  }
}

function onLiveSearchPageChange(p: number) {
  liveSearchPage.value = p - 1 // UPagination is 1-based, HH is 0-based
  runLiveSearch(false)
}

async function loadSimilar(vacancyId: string) {
  if (similarFor.value === vacancyId) {
    similarFor.value = null
    return
  }
  similarFor.value = vacancyId
  similarPending.value = true
  try {
    const items = await api.get<HhVacancyResult[]>(
      `/api/v1/candidate-portal/hh/vacancies/${vacancyId}/similar`,
    )
    similarResults.value = Array.isArray(items) ? items : []
  } catch {
    similarResults.value = []
  } finally {
    similarPending.value = false
  }
}

// HH area picker
interface HhAreaSuggest {
  id: string
  text: string
}
const hhAreaId = ref<string | null>(null)
const hhAreaLabel = ref('All regions')
const hhAreaOptions = ref<HhAreaSuggest[]>([])
const hhAreaSearchText = ref('')

watchDebounced(
  hhAreaSearchText,
  async (q) => {
    if (!q.trim()) {
      hhAreaOptions.value = []
      return
    }
    try {
      const res = await api.get<HhAreaSuggest[]>('/api/v1/candidate-portal/hh/suggests/areas', {
        text: q,
      })
      hhAreaOptions.value = Array.isArray(res) ? res : []
    } catch {
      hhAreaOptions.value = []
    }
  },
  { debounce: 300 },
)

function selectArea(area: HhAreaSuggest | null) {
  hhAreaId.value = area ? area.id : null
  hhAreaLabel.value = area ? area.text : 'All regions'
  hhAreaOptions.value = []
  hhAreaSearchText.value = ''
}

watchDebounced(
  liveSearchText,
  () => {
    if (activeMainTab.value === 'live') runLiveSearch()
  },
  { debounce: 400 },
)

const AVATAR_COLORS = [
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fce7f3', fg: '#9d174d' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#ffedd5', fg: '#c2410c' },
  { bg: '#fef9c3', fg: '#a16207' },
] as const

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h] ?? AVATAR_COLORS[0]
}

function jobStatus(job: DiscoveredJob): { label: string; bg: string; fg: string } {
  if (job.application) {
    const s = job.application.status
    if (s === 'applied') return { label: 'Applied', bg: '#dcfce7', fg: '#15803d' }
    if (s === 'queued' || s === 'applying')
      return { label: 'In progress', bg: '#dbeafe', fg: '#1d4ed8' }
    if (s === 'failed') return { label: 'Failed', bg: '#fee2e2', fg: '#dc2626' }
    return { label: capitalizeStatus(s), bg: '#f3f4f6', fg: '#6b7280' }
  }
  if (skippedIds.value.has(job.id)) return { label: 'Skipped', bg: '#fef9c3', fg: '#a16207' }
  if (savedIds.value.has(job.id)) return { label: 'Saved', bg: '#ede9fe', fg: '#6d28d9' }
  return { label: 'New', bg: '#dbeafe', fg: '#1d4ed8' }
}
</script>

<template>
  <div class="jobs-layout">
    <!-- Header -->
    <div class="jobs-header">
      <div>
        <p class="eyebrow">{{ t('candidate.jobs.eyebrow') }}</p>
        <h1 class="page-title">{{ t('candidate.jobs.title') }}</h1>
        <p class="jobs-count">{{ t('candidate.jobs.matchingJobs', { n: total }) }}</p>
      </div>
      <div class="header-actions">
        <div class="view-toggle">
          <button
            type="button"
            :class="['toggle-btn', viewMode === 'feed' && 'active']"
            @click="viewMode = 'feed'"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-3.5 h-3.5" />
            Feed
          </button>
          <button
            type="button"
            :class="['toggle-btn', viewMode === 'list' && 'active']"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-heroicons-list-bullet" class="w-3.5 h-3.5" />
            List
          </button>
        </div>
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-magnifying-glass"
          :loading="discoveringInProgress"
          class="whitespace-nowrap"
          @click="triggerDiscover"
        >
          Find Jobs
        </UButton>
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-bolt"
          :loading="scoringInProgress"
          class="whitespace-nowrap"
          @click="triggerScoring"
        >
          AI Score All
        </UButton>
      </div>
    </div>

    <!-- Main tab toggle -->
    <div
      class="flex rounded-lg overflow-hidden"
      style="border: 1px solid var(--line); width: fit-content"
    >
      <button
        type="button"
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeMainTab === 'discovered'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeMainTab = 'discovered'"
      >
        {{ t('candidate.jobs.title') }}
      </button>
      <button
        type="button"
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeMainTab === 'live'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeMainTab = 'live'"
      >
        {{ t('candidate.preferences.hhLiveSearch') }}
      </button>
      <button
        type="button"
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeMainTab === 'match'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeMainTab = 'match'"
      >
        {{ t('candidate.preferences.hhMatchedVacancies') }}
      </button>
    </div>

    <!-- Live HH Search panel -->
    <div v-if="activeMainTab === 'live'" class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <UInput
          v-model="liveSearchText"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search HH vacancies..."
          class="flex-1 min-w-0"
          @keydown.enter="runLiveSearch"
        />
        <!-- Area picker -->
        <div class="relative">
          <UInput
            v-model="hhAreaSearchText"
            icon="i-heroicons-map-pin"
            :placeholder="hhAreaLabel"
            class="w-40"
          />
          <div
            v-if="hhAreaOptions.length"
            class="absolute z-10 mt-1 w-52 rounded-lg shadow-lg overflow-hidden"
            style="background: var(--surface); border: 1px solid var(--line-soft)"
          >
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs hover:bg-(--bg-elevated) transition-colors"
              style="color: var(--ink-muted)"
              @click="selectArea(null)"
            >
              All regions
            </button>
            <button
              v-for="opt in hhAreaOptions"
              :key="opt.id"
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs hover:bg-(--bg-elevated) transition-colors"
              style="color: var(--ink)"
              @click="selectArea(opt)"
            >
              {{ opt.text }}
            </button>
          </div>
        </div>
        <UButton
          :loading="liveSearchPending"
          icon="i-heroicons-magnifying-glass"
          @click="() => runLiveSearch()"
        >
          Search
        </UButton>
      </div>

      <p v-if="liveSearchTotal" class="text-xs" style="color: var(--ink-subtle)">
        {{ liveSearchTotal }} results
      </p>

      <div v-if="liveSearchPending" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="job in liveSearchResults"
          :key="job.id"
          class="rounded-lg p-4"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <a
                :href="job.alternate_url"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium hover:underline"
                style="color: var(--ink); font-size: 15px"
              >
                {{ job.name }}
              </a>
              <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
                {{ job.employer.name }}
                <span v-if="job.area" style="color: var(--ink-subtle)"> · {{ job.area.name }}</span>
              </p>
              <p
                v-if="job.salary?.from || job.salary?.to"
                class="text-xs mt-1"
                style="color: var(--ink-subtle)"
              >
                {{ job.salary?.from?.toLocaleString() }} – {{ job.salary?.to?.toLocaleString() }}
                {{ job.salary?.currency }}
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <UButton
                size="xs"
                icon="i-heroicons-paper-airplane"
                :loading="applyingHh.has(job.id)"
                @click="applyOnHh(job.id)"
              >
                {{ t('candidate.preferences.hhApply') }}
              </UButton>
              <UButton
                size="xs"
                variant="ghost"
                :icon="
                  selectedVacancyId === job.id
                    ? 'i-heroicons-chevron-up'
                    : 'i-heroicons-information-circle'
                "
                :loading="vacancyDetailPending === job.id"
                @click="toggleVacancyDetail(job.id)"
              />
              <UButton
                size="xs"
                variant="ghost"
                :icon="similarFor === job.id ? 'i-heroicons-chevron-up' : 'i-heroicons-squares-2x2'"
                :loading="similarPending && similarFor === job.id"
                @click="loadSimilar(job.id)"
              >
                {{ t('candidate.preferences.hhSimilarJobs') }}
              </UButton>
            </div>
          </div>

          <!-- Vacancy detail inline -->
          <div
            v-if="selectedVacancyId === job.id && vacancyDetails[job.id]"
            class="px-4 pb-3 pt-3 space-y-2"
            style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <div v-if="vacancyDetails[job.id]?.key_skills?.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="s in vacancyDetails[job.id]?.key_skills ?? []"
                :key="s.name"
                class="px-2 py-0.5 rounded-md text-xs"
                style="
                  background: var(--bg-deep);
                  color: var(--ink-muted);
                  border: 1px solid var(--line-soft);
                "
                >{{ s.name }}</span
              >
            </div>
            <div
              v-if="vacancyDetails[job.id]?.description"
              class="text-sm leading-relaxed"
              style="color: var(--ink-muted); max-height: 200px; overflow-y: auto"
              v-html="sanitizeHtml(vacancyDetails[job.id]?.description ?? '')"
            />
          </div>

          <!-- Similar vacancies inline -->
          <div
            v-if="similarFor === job.id && !similarPending"
            class="mt-3 pt-3 space-y-2"
            style="border-top: 1px solid var(--line-soft)"
          >
            <p
              class="text-xs font-medium"
              style="color: var(--ink-subtle); text-transform: uppercase; letter-spacing: 0.08em"
            >
              {{ t('candidate.preferences.hhSimilarJobs') }}
            </p>
            <div
              v-for="sim in similarResults"
              :key="sim.id"
              class="flex items-center justify-between gap-2 py-1"
            >
              <a
                :href="sim.alternate_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm hover:underline truncate"
                style="color: var(--ink)"
              >
                {{ sim.name }} — {{ sim.employer.name }}
              </a>
            </div>
            <p v-if="!similarResults.length" class="text-xs" style="color: var(--ink-subtle)">
              No similar vacancies found
            </p>
          </div>
        </div>
      </div>
      <!-- Live search pagination -->
      <div v-if="liveSearchTotal > LIVE_PER_PAGE" class="flex justify-center pt-2">
        <UPagination
          :model-value="liveSearchPage + 1"
          :total="liveSearchTotal"
          :page-size="LIVE_PER_PAGE"
          size="sm"
          @update:model-value="onLiveSearchPageChange"
        />
      </div>
    </div>

    <!-- Matched to Resume panel -->
    <div v-if="activeMainTab === 'match'" class="space-y-4">
      <div v-if="matchedPending" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>
      <template v-else>
        <p v-if="matchedTotal" class="text-xs" style="color: var(--ink-subtle)">
          {{ matchedTotal }} {{ t('candidate.preferences.hhSimilarVacancies').toLowerCase() }}
        </p>
        <div v-if="!matchedResults.length" class="flex flex-col items-center py-16 gap-3">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="w-12 h-12"
            style="color: var(--ink-subtle)"
          />
          <p
            style="
              font-family: 'Fraunces', serif;
              font-size: 20px;
              color: var(--ink);
              font-weight: 400;
            "
          >
            {{ t('candidate.preferences.hhSimilarVacancies') }}
          </p>
          <p class="text-sm" style="color: var(--ink-muted)">
            Connect HH and add a resume to see matched vacancies
          </p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="job in matchedResults"
            :key="job.id"
            class="rounded-lg overflow-hidden"
            style="background: var(--surface); border: 1px solid var(--line-soft)"
          >
            <div class="p-4 flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <button
                  class="font-medium hover:underline text-left"
                  style="color: var(--ink); font-size: 15px"
                  @click="toggleVacancyDetail(job.id)"
                >
                  {{ job.name }}
                </button>
                <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
                  {{ job.employer.name }}
                  <span v-if="job.area" style="color: var(--ink-subtle)">
                    · {{ job.area.name }}</span
                  >
                </p>
                <p
                  v-if="job.salary?.from || job.salary?.to"
                  class="text-xs mt-1"
                  style="color: var(--ink-subtle)"
                >
                  {{ job.salary?.from?.toLocaleString() }} – {{ job.salary?.to?.toLocaleString() }}
                  {{ job.salary?.currency }}
                </p>
              </div>
              <div class="flex gap-2 shrink-0">
                <UButton
                  size="xs"
                  icon="i-heroicons-paper-airplane"
                  :loading="applyingHh.has(job.id)"
                  @click="applyOnHh(job.id)"
                >
                  {{ t('candidate.preferences.hhApply') }}
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  :icon="
                    selectedVacancyId === job.id
                      ? 'i-heroicons-chevron-up'
                      : 'i-heroicons-information-circle'
                  "
                  :loading="vacancyDetailPending === job.id"
                  @click="toggleVacancyDetail(job.id)"
                />
              </div>
            </div>
            <!-- Vacancy detail inline -->
            <div
              v-if="selectedVacancyId === job.id && vacancyDetails[job.id]"
              class="px-4 pb-4 pt-3 space-y-3"
              style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
            >
              <div v-if="vacancyDetails[job.id]?.key_skills?.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="s in vacancyDetails[job.id]?.key_skills ?? []"
                  :key="s.name"
                  class="px-2 py-0.5 rounded-md text-xs"
                  style="
                    background: var(--bg-deep);
                    color: var(--ink-muted);
                    border: 1px solid var(--line-soft);
                  "
                  >{{ s.name }}</span
                >
              </div>
              <div
                v-if="vacancyDetails[job.id]?.description"
                class="text-sm leading-relaxed"
                style="color: var(--ink-muted); max-height: 200px; overflow-y: auto"
                v-html="sanitizeHtml(vacancyDetails[job.id]?.description ?? '')"
              />
              <a
                :href="job.alternate_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs hover:underline"
                style="color: var(--accent)"
                >{{ t('candidate.preferences.hhVacancyDetail') }} →</a
              >
            </div>
          </div>
        </div>
        <!-- Matched pagination -->
        <div v-if="matchedTotal > MATCHED_PER_PAGE" class="flex justify-center pt-2">
          <UPagination
            v-model="matchedPage"
            :total="matchedTotal"
            :page-size="MATCHED_PER_PAGE"
            size="sm"
          />
        </div>
      </template>
    </div>

    <!-- Discovered jobs (existing content) -->
    <div v-show="activeMainTab === 'discovered'">
      <!-- AI activity banner -->
      <Transition name="feed">
        <div v-if="scoringActive || scoringLog.length" class="activity-feed">
          <div class="feed-header">
            <span class="pulse-dot" :class="{ active: scoringActive }" />
            <span class="feed-label">{{
              scoringActive ? 'AI scanning jobs…' : 'Scan complete'
            }}</span>
            <span v-if="scoringProgress.total" class="feed-count"
              >{{ scoringProgress.done }}/{{ scoringProgress.total }}</span
            >
          </div>
          <div v-for="entry in scoringLog.slice(-4)" :key="entry.ts" class="feed-entry">
            <span class="feed-icon">{{ entry.icon }}</span>
            <span>{{ entry.text }}</span>
          </div>
        </div>
      </Transition>

      <!-- Filters -->
      <div class="filters-row">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search jobs..."
          class="filter-search"
          size="sm"
        />
        <USelect
          v-model="workMode"
          :items="workModeOptions"
          size="sm"
          class="w-36"
          aria-label="Work mode"
        />
        <USelect
          v-model="sortBy"
          :items="sortOptions"
          size="sm"
          class="w-36"
          aria-label="Sort by"
        />
        <div class="score-filter">
          <UIcon
            name="i-heroicons-adjustments-horizontal"
            class="w-3.5 h-3.5 shrink-0"
            style="color: var(--ink-muted)"
          />
          <span class="score-filter-label"
            >Min score: <strong>{{ minScore }}%</strong></span
          >
          <input
            v-model.number="minScore"
            type="range"
            min="0"
            max="100"
            step="10"
            class="score-slider"
          />
        </div>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          aria-label="Refresh"
          @click="() => refresh()"
        />
      </div>

      <!-- Loading skeleton -->
      <div v-if="pending" class="space-y-2 py-2">
        <div
          v-for="n in 4"
          :key="n"
          class="rounded-lg p-3 flex gap-3"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <USkeleton class="w-8 h-8 rounded-full shrink-0" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-2/3 rounded" />
            <USkeleton class="h-3 w-1/2 rounded" />
            <USkeleton class="h-1.5 w-full rounded-full mt-1" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!jobs.length" class="empty-state">
        <UIcon name="i-heroicons-briefcase" class="w-12 h-12" style="color: var(--ink-subtle)" />
        <p class="empty-title">{{ t('candidate.jobs.noJobs') }}</p>
        <p class="empty-desc">
          {{
            search || workMode !== 'all' || minScore > 0
              ? t('candidate.jobs.noJobsFiltered')
              : t('candidate.jobs.noJobsDiscovered')
          }}
        </p>
      </div>

      <!-- ── Two-panel Feed ── -->
      <div v-else-if="viewMode === 'feed'" class="two-panel">
        <!-- Left: compact job list -->
        <div class="panel-left">
          <div
            v-for="job in jobs"
            :key="job.id"
            :class="['job-card-compact', job.id === selectedJob?.id && 'selected']"
            @click="selectedJobId = job.id"
          >
            <div
              class="company-avatar"
              :style="{
                background: avatarColor(job.company).bg,
                color: avatarColor(job.company).fg,
              }"
            >
              {{ companyInitials(job.company) }}
            </div>
            <div class="card-body">
              <div class="card-title">{{ job.title }}</div>
              <div class="card-company">{{ job.company }}</div>
              <div class="score-bar-wrap">
                <div class="score-bar-track">
                  <div
                    class="score-bar-fill"
                    :style="{
                      width: `${job.displayScore ?? 0}%`,
                      background: scoreBarColor(job.displayScore),
                    }"
                  />
                </div>
                <span class="score-bar-num" :style="{ color: scoreBarColor(job.displayScore) }">
                  {{ job.displayScore != null ? `${job.displayScore}%` : '—' }}
                </span>
              </div>
              <!-- Match explanation visible on card -->
              <p v-if="job.matchExplanation" class="card-match-hint">
                {{ job.matchExplanation }}
              </p>
              <!-- skillMatch + gap summary chips -->
              <div v-if="job.skillMatch != null || job.matchGaps?.length" class="card-skill-row">
                <span v-if="job.skillMatch != null" class="card-skill-chip card-skill-chip--match">
                  {{ job.skillMatch }}% skills
                </span>
                <span v-if="job.matchGaps?.length" class="card-skill-chip card-skill-chip--gap">
                  Missing {{ job.matchGaps.length }}
                </span>
              </div>
              <div class="card-meta">
                <span v-if="job.workMode" class="meta-item">
                  <UIcon name="i-heroicons-building-office-2" class="w-3 h-3" />
                  {{ job.workMode }}
                </span>
                <span v-if="formatPostedDate(job.postedAt)" class="meta-item">
                  <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                  {{ formatPostedDate(job.postedAt) }}
                </span>
                <span
                  class="status-dot"
                  :style="{ background: jobStatus(job).bg, color: jobStatus(job).fg }"
                  >{{ jobStatus(job).label }}</span
                >
              </div>
              <!-- Quick apply button on card -->
              <div v-if="!job.application" class="card-quick-apply" @click.stop>
                <UButton
                  size="xs"
                  :loading="applying.has(job.id)"
                  icon="i-heroicons-paper-airplane"
                  @click="applyToJob(job)"
                >
                  Apply
                </UButton>
              </div>
            </div>
          </div>

          <div v-if="total > limit" class="panel-pagination">
            <UPagination v-model="page" :total="total" :page-size="limit" size="sm" />
          </div>
        </div>

        <!-- Right: job detail -->
        <div class="panel-right">
          <div v-if="selectedJob" class="detail-content">
            <!-- Title + company -->
            <div class="detail-header">
              <div
                class="company-avatar-lg"
                :style="{
                  background: avatarColor(selectedJob.company).bg,
                  color: avatarColor(selectedJob.company).fg,
                }"
              >
                {{ companyInitials(selectedJob.company) }}
              </div>
              <div class="detail-title-block">
                <h2 class="detail-job-title">{{ selectedJob.title }}</h2>
                <p class="detail-company">
                  {{ selectedJob.company
                  }}<span v-if="selectedJob.location" style="color: var(--ink-subtle)">
                    · {{ selectedJob.location }}</span
                  >
                </p>
              </div>
            </div>

            <!-- Meta chips -->
            <div class="detail-meta">
              <span v-if="selectedJob.workMode" class="meta-chip">
                <UIcon name="i-heroicons-building-office-2" class="w-3.5 h-3.5" />
                {{ selectedJob.workMode }}
              </span>
              <span v-if="selectedJob.employmentType" class="meta-chip">
                <UIcon name="i-heroicons-briefcase" class="w-3.5 h-3.5" />
                {{ selectedJob.employmentType }}
              </span>
              <span v-if="selectedJob.salaryMinUzs || selectedJob.salaryMaxUzs" class="meta-chip">
                <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5" />
                {{ formatSalary(selectedJob.salaryMinUzs)
                }}<template v-if="selectedJob.salaryMaxUzs">
                  – {{ formatSalary(selectedJob.salaryMaxUzs) }}</template
                >
              </span>
              <a
                v-if="selectedJob.sourceUrl"
                :href="safeUrl(selectedJob.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="meta-chip meta-link"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
                {{ selectedJob.source }}
              </a>
            </div>

            <!-- Action buttons -->
            <div class="action-row">
              <template v-if="selectedJob.application">
                <UBadge
                  :color="appStatusColor(selectedJob.application.status)"
                  variant="subtle"
                  size="md"
                >
                  {{ capitalizeStatus(selectedJob.application.status) }}
                </UBadge>
              </template>
              <template v-else>
                <UButton
                  size="sm"
                  icon="i-heroicons-paper-airplane"
                  :loading="applying.has(selectedJob.id)"
                  @click="applyToJob(selectedJob)"
                >
                  Apply
                </UButton>
                <UButton
                  size="sm"
                  variant="outline"
                  :icon="
                    savedIds.has(selectedJob.id)
                      ? 'i-heroicons-bookmark-solid'
                      : 'i-heroicons-bookmark'
                  "
                  @click="toggleSave(selectedJob.id)"
                >
                  {{ savedIds.has(selectedJob.id) ? 'Saved' : 'Save' }}
                </UButton>
                <UButton
                  v-if="!skippedIds.has(selectedJob.id)"
                  size="sm"
                  variant="outline"
                  color="error"
                  icon="i-heroicons-x-mark"
                  @click="skipJob(selectedJob.id)"
                >
                  Skip
                </UButton>
              </template>
            </div>

            <!-- AI Match section -->
            <div v-if="selectedJob.displayScore != null" class="match-section">
              <div class="match-header">
                <span class="match-label">AI MATCH</span>
                <span
                  class="match-score"
                  :style="{ color: scoreBarColor(selectedJob.displayScore) }"
                >
                  {{ selectedJob.displayScore }}%
                </span>
              </div>

              <div
                v-if="selectedJob.matchStrengths?.length || selectedJob.matchGaps?.length"
                class="skills-grid"
              >
                <div v-if="selectedJob.matchStrengths?.length" class="skills-col">
                  <p class="skills-label matched-label">Matched skills</p>
                  <div class="skills-tags">
                    <span
                      v-for="s in selectedJob.matchStrengths"
                      :key="s"
                      class="skill-tag matched-tag"
                      >{{ s }}</span
                    >
                  </div>
                </div>
                <div v-if="selectedJob.matchGaps?.length" class="skills-col">
                  <p class="skills-label missing-label">Missing skills</p>
                  <div class="skills-tags">
                    <span
                      v-for="g in selectedJob.matchGaps"
                      :key="g"
                      class="skill-tag missing-tag"
                      >{{ g }}</span
                    >
                  </div>
                </div>
              </div>

              <p v-if="selectedJob.matchExplanation" class="match-explanation">
                {{ selectedJob.matchExplanation }}
              </p>
            </div>

            <!-- Job description -->
            <div v-if="selectedJob.description" class="description-section">
              <p class="section-eyebrow">JOB DESCRIPTION</p>
              <p class="description-text">
                {{ selectedJob.description.slice(0, 500)
                }}{{ selectedJob.description.length > 500 ? '…' : '' }}
              </p>
              <a
                v-if="selectedJob.sourceUrl"
                :href="safeUrl(selectedJob.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="view-full-link"
              >
                View full description →
              </a>
            </div>

            <!-- Job skills (if available) -->
            <div v-if="selectedJob.skills?.length" class="description-section">
              <p class="section-eyebrow">SKILLS</p>
              <div class="skills-tags">
                <span v-for="s in selectedJob.skills" :key="s" class="skill-tag neutral-tag">{{
                  s
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Classic list ── -->
      <div v-else class="space-y-2">
        <div v-for="job in jobs" :key="job.id" class="list-row">
          <div
            class="company-avatar-sm"
            :style="{ background: avatarColor(job.company).bg, color: avatarColor(job.company).fg }"
          >
            {{ companyInitials(job.company) }}
          </div>
          <div class="list-body">
            <div class="list-title-row">
              <a
                :href="safeUrl(job.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="list-title"
              >
                {{ job.title }}
              </a>
              <UBadge
                v-if="job.displayScore != null"
                :color="scoreColor(job.displayScore)"
                variant="subtle"
                size="xs"
                class="font-mono shrink-0"
              >
                {{ job.displayScore }}%
              </UBadge>
            </div>
            <p class="list-company">
              {{ job.company
              }}<span v-if="job.location" style="color: var(--ink-subtle)">
                · {{ job.location }}</span
              >
            </p>
            <div class="list-meta">
              <span v-if="job.workMode">{{ job.workMode }}</span>
              <span v-if="job.salaryMinUzs || job.salaryMaxUzs"
                >{{ formatSalary(job.salaryMinUzs)
                }}<template v-if="job.salaryMaxUzs">
                  – {{ formatSalary(job.salaryMaxUzs) }}</template
                ></span
              >
              <span v-if="formatPostedDate(job.postedAt)">{{
                formatPostedDate(job.postedAt)
              }}</span>
            </div>
          </div>
          <div class="list-actions">
            <template v-if="job.application">
              <UBadge :color="appStatusColor(job.application.status)" variant="subtle" size="sm">{{
                capitalizeStatus(job.application.status)
              }}</UBadge>
            </template>
            <template v-else>
              <UButton
                size="sm"
                icon="i-heroicons-paper-airplane"
                :loading="applying.has(job.id)"
                @click="applyToJob(job)"
                >{{ t('candidate.jobs.apply') }}</UButton
              >
            </template>
          </div>
        </div>
        <div v-if="total > limit" class="flex justify-center pt-3">
          <UPagination v-model="page" :total="total" :page-size="limit" />
        </div>
      </div>
    </div>
    <!-- end discovered tab wrapper -->
  </div>
</template>

<style scoped>
/* ── Layout ── */
.jobs-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Header ── */
.jobs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
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

.jobs-count {
  margin-top: 3px;
  font-size: 13px;
  color: var(--ink-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.view-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--bg-deep);
}

.toggle-btn {
  padding: 5px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--ink-muted);
  background: transparent;
  border: none;
  transition: all 0.12s;
}

.toggle-btn.active {
  background: var(--ink);
  color: var(--bg);
}

/* ── Filters ── */
.filters-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-search {
  max-width: 220px;
}

.score-filter {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--ink-muted);
}

.score-filter-label {
  white-space: nowrap;
  min-width: 108px;
}

.score-slider {
  width: 90px;
  accent-color: var(--accent, #5b6af5);
  cursor: pointer;
  height: 4px;
}

/* ── Empty ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 10px;
}

.empty-title {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  color: var(--ink);
  font-weight: 400;
}

.empty-desc {
  font-size: 14px;
  color: var(--ink-muted);
}

/* ── Two-panel ── */
.two-panel {
  display: flex;
  min-height: 580px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.panel-left {
  width: 340px;
  min-width: 280px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--line);
  background: var(--surface);
}

.panel-right {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-elevated, var(--surface));
}

/* ── Compact job card ── */
.job-card-compact {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line-soft);
  transition: background 0.1s;
  border-left: 3px solid transparent;
}

.job-card-compact:hover {
  background: var(--bg-elevated);
}

.job-card-compact.selected {
  background: var(--bg-elevated);
  border-left-color: var(--accent, #5b6af5);
}

.company-avatar {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.card-company {
  font-size: 11.5px;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 2px 0 6px;
}

.score-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.score-bar-track {
  flex: 1;
  height: 4px;
  background: var(--line);
  border-radius: 2px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.score-bar-num {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  min-width: 30px;
  text-align: right;
}

.card-match-hint {
  font-size: 11px;
  color: var(--ink-subtle);
  line-height: 1.5;
  margin-top: 4px;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-skill-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.card-skill-chip {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.card-skill-chip--match {
  background: color-mix(in srgb, var(--positive) 12%, transparent);
  color: var(--positive);
  border: 1px solid color-mix(in srgb, var(--positive) 25%, transparent);
}

.card-skill-chip--gap {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
}

.card-quick-apply {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: var(--ink-subtle);
}

.status-dot {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.6;
}

.panel-pagination {
  padding: 12px 14px;
  display: flex;
  justify-content: center;
}

/* ── Detail panel ── */
.detail-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.company-avatar-lg {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 700;
  flex-shrink: 0;
}

.detail-title-block {
  flex: 1;
  min-width: 0;
}

.detail-job-title {
  font-family: 'Fraunces', serif;
  font-size: 21px;
  font-weight: 400;
  color: var(--ink);
  line-height: 1.2;
}

.detail-company {
  font-size: 14px;
  color: var(--ink-muted);
  margin-top: 3px;
}

.detail-meta {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 12.5px;
  color: var(--ink-muted);
  background: var(--bg-deep);
  border: 1px solid var(--line-soft);
  text-decoration: none;
}

.meta-link {
  color: var(--accent, #5b6af5);
}

.meta-link:hover {
  background: var(--accent-soft, #ede9fe);
}

.action-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ── Match section ── */
.match-section {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.match-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}

.match-score {
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}

.skills-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.skills-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skills-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.matched-label {
  color: #15803d;
}
.missing-label {
  color: #b45309;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.skill-tag {
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
}

.matched-tag {
  background: #dcfce7;
  color: #15803d;
}
.missing-tag {
  background: #fef3c7;
  color: #b45309;
}
.neutral-tag {
  background: var(--bg-deep);
  color: var(--ink-muted);
  border: 1px solid var(--line-soft);
}

.match-explanation {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.55;
}

/* ── Description ── */
.description-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.section-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}

.description-text {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--ink-muted);
}

.view-full-link {
  font-size: 13px;
  color: var(--accent, #5b6af5);
  text-decoration: none;
  align-self: flex-start;
}

.view-full-link:hover {
  text-decoration: underline;
}

/* ── List view ── */
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 9px;
}

.company-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.list-body {
  flex: 1;
  min-width: 0;
}

.list-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.list-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.list-title:hover {
  text-decoration: underline;
}

.list-company {
  font-size: 12.5px;
  color: var(--ink-muted);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-meta {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  color: var(--ink-subtle);
  flex-wrap: wrap;
}

.list-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* ── Activity feed ── */
.activity-feed {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  flex: 1;
}

.feed-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-muted);
}

.feed-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-muted);
}

.feed-icon {
  font-size: 11px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-subtle);
  flex-shrink: 0;
  transition: background 0.3s;
}

.pulse-dot.active {
  background: var(--accent);
  animation: pulse-ring 1.4s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
  }
  70% {
    box-shadow: 0 0 0 5px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.feed-enter-active,
.feed-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}

.feed-enter-from,
.feed-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
