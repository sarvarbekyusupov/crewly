<script setup lang="ts">
import { watchDebounced, useEventBus, useLocalStorage, onClickOutside } from '@vueuse/core'
import { safeUrl } from '~/utils/safeUrl'
import type { DiscoveredJob, PaginatedResponse } from '~/types/api'
import { capitalizeStatus } from '~/utils/candidate'
import { scoringActive, scoringLog, scoringProgress } from '~/composables/useCandidateEventStream'
import { sanitizeHtml } from '~/utils/sanitize'
import { isHhNotConnected } from '~/utils/hhErrors'
import { AVATAR_COLORS } from '~/constants/ui'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()

useHead({ title: 'Job Discovery' })

const search = ref('')
const workMode = ref('all')
const minScore = ref(0)
const sortBy = ref<'recent' | 'score'>('score')
const page = ref(1)
const limit = 20

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
  { watch: [search, workMode, minScore, sortBy, page], lazy: true },
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

// Detail modal
const detailJobId = ref<string | null>(null)
const showDetailModal = ref(false)
const detailJob = computed<DiscoveredJob | null>(() =>
  detailJobId.value ? (jobs.value.find((j) => j.id === detailJobId.value) ?? null) : null,
)
function openDetail(job: DiscoveredJob) {
  detailJobId.value = job.id
  showDetailModal.value = true
}

const _skippedArr = useLocalStorage<string[]>('candidate:skipped-jobs', [])
const _savedArr = useLocalStorage<string[]>('candidate:saved-jobs', [])
const skippedIds = computed(() => new Set(_skippedArr.value))
const savedIds = computed(() => new Set(_savedArr.value))

function skipJob(id: string) {
  if (!_skippedArr.value.includes(id)) _skippedArr.value = [..._skippedArr.value, id]
}
function toggleSave(id: string) {
  if (_savedArr.value.includes(id)) {
    _savedArr.value = _savedArr.value.filter((x) => x !== id)
  } else {
    _savedArr.value = [..._savedArr.value, id]
  }
}

const workModeOptions = computed(() => [
  { label: t('candidate.jobs.allModes'), value: 'all' },
  { label: t('candidate.jobs.office'), value: 'office' },
  { label: t('candidate.jobs.hybrid'), value: 'hybrid' },
  { label: t('candidate.jobs.remote'), value: 'remote' },
])

const sortOptions = computed(() => [
  { label: t('candidate.jobs.bestMatch'), value: 'score' },
  { label: t('candidate.jobs.mostRecent'), value: 'recent' },
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
    const res = await api.post<{ id: string }>('/api/v1/candidate-portal/seeker-applications', {
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
            void router.push(res?.id ? `/candidate/inbox?app=${res.id}` : '/candidate/inbox')
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
  if (score >= 70) return 'var(--positive)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--negative)'
}

function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'var(--bg-elevated)'
  if (score >= 70) return 'color-mix(in srgb, var(--positive) 12%, transparent)'
  if (score >= 40) return 'color-mix(in srgb, var(--warning) 12%, transparent)'
  return 'color-mix(in srgb, var(--negative) 12%, transparent)'
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

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h] ?? AVATAR_COLORS[0]
}

function jobStatus(job: DiscoveredJob): { label: string; bg: string; fg: string } {
  if (job.application) {
    const s = job.application.status
    if (s === 'applied')
      return {
        label: 'Applied',
        bg: 'color-mix(in srgb, var(--positive) 14%, transparent)',
        fg: 'var(--positive)',
      }
    if (s === 'queued' || s === 'applying')
      return {
        label: 'In progress',
        bg: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        fg: 'var(--accent)',
      }
    if (s === 'failed')
      return {
        label: 'Failed',
        bg: 'color-mix(in srgb, var(--negative) 14%, transparent)',
        fg: 'var(--negative)',
      }
    return { label: capitalizeStatus(s), bg: 'var(--bg-elevated)', fg: 'var(--ink-muted)' }
  }
  if (skippedIds.value.has(job.id))
    return {
      label: 'Skipped',
      bg: 'color-mix(in srgb, var(--warning) 14%, transparent)',
      fg: 'var(--warning)',
    }
  if (savedIds.value.has(job.id))
    return {
      label: 'Saved',
      bg: 'color-mix(in srgb, var(--accent) 14%, transparent)',
      fg: 'var(--accent)',
    }
  return {
    label: 'New',
    bg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    fg: 'var(--accent)',
  }
}

// ── Live HH Search ──────────────────────────────────────────────────────────

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

const matchedResults = ref<HhVacancyResult[]>([])
const matchedLoaded = ref(false)
const matchedPending = ref(false)
const matchedTotal = ref(0)
const matchedPage = ref(1)
const MATCHED_PER_PAGE = 20

async function loadMatchedVacancies(p = 1) {
  matchedPending.value = true
  try {
    const resp = await api.get<{ items: HhVacancyResult[]; found: number }>(
      '/api/v1/candidate-portal/hh/resume/similar-vacancies',
      { page: p - 1, per_page: MATCHED_PER_PAGE },
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
    // fall back to card info
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
  liveSearchPage.value = p - 1
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

const hhAreaPickerRef = ref<HTMLElement | null>(null)
onClickOutside(hhAreaPickerRef, () => {
  hhAreaOptions.value = []
})

watchDebounced(
  liveSearchText,
  () => {
    if (activeMainTab.value === 'live') runLiveSearch()
  },
  { debounce: 400 },
)
</script>

<template>
  <div class="jobs-layout">
    <!-- Header -->
    <div class="jobs-header">
      <div>
        <p class="eyebrow">{{ t('candidate.jobs.eyebrow') }}</p>
        <h1 class="page-title">
          {{
            activeMainTab === 'live'
              ? t('candidate.preferences.hhLiveSearch')
              : activeMainTab === 'match'
                ? t('candidate.preferences.hhMatchedVacancies')
                : t('candidate.jobs.title')
          }}
        </h1>
        <p v-if="activeMainTab === 'discovered'" class="jobs-count">
          {{ t('candidate.jobs.matchingJobs', { n: total }) }}
        </p>
      </div>
      <div v-if="activeMainTab === 'discovered'" class="header-actions">
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-magnifying-glass"
          :loading="discoveringInProgress"
          @click="triggerDiscover"
        >
          Find Jobs
        </UButton>
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-bolt"
          :loading="scoringInProgress"
          @click="triggerScoring"
        >
          AI Score
        </UButton>
      </div>
    </div>

    <!-- Tab strip -->
    <div class="tab-strip">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeMainTab === 'discovered' }"
        @click="activeMainTab = 'discovered'"
      >
        {{ t('candidate.jobs.title') }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeMainTab === 'live' }"
        @click="activeMainTab = 'live'"
      >
        <span class="hh-badge">HH</span>
        {{ t('candidate.preferences.hhLiveSearch') }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeMainTab === 'match' }"
        @click="activeMainTab = 'match'"
      >
        <span class="hh-badge">HH</span>
        {{ t('candidate.preferences.hhMatchedVacancies') }}
      </button>
    </div>

    <!-- ── Live HH Search ── -->
    <div v-if="activeMainTab === 'live'" class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <UInput
          v-model="liveSearchText"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search HH vacancies..."
          class="flex-1 min-w-0"
          @keydown.enter="runLiveSearch"
        />
        <div ref="hhAreaPickerRef" class="relative">
          <UInput
            v-model="hhAreaSearchText"
            icon="i-heroicons-map-pin"
            :placeholder="hhAreaLabel"
            class="w-40"
            @keydown.escape="hhAreaOptions = []"
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

      <div
        v-else-if="!liveSearchResults.length && !liveSearchTotal"
        class="flex flex-col items-center py-16 gap-3 text-center"
      >
        <UIcon
          name="i-heroicons-magnifying-glass-circle"
          class="w-10 h-10"
          style="color: var(--ink-subtle)"
        />
        <p
          style="
            font-family: 'Fraunces', serif;
            font-size: 18px;
            color: var(--ink);
            font-weight: 400;
          "
        >
          Search HH vacancies
        </p>
        <p class="text-sm max-w-xs" style="color: var(--ink-muted)">
          Type a job title or keyword above and press Enter to find matching vacancies from hh.uz.
        </p>
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
                <template v-if="job.salary?.from && job.salary?.to">
                  {{ job.salary.from.toLocaleString() }} – {{ job.salary.to.toLocaleString() }}
                  {{ job.salary.currency }}
                </template>
                <template v-else-if="job.salary?.from">
                  {{ t('candidate.jobs.from') }} {{ job.salary.from.toLocaleString() }}
                  {{ job.salary.currency }}
                </template>
                <template v-else-if="job.salary?.to">
                  {{ t('candidate.jobs.upTo') }} {{ job.salary.to.toLocaleString() }}
                  {{ job.salary.currency }}
                </template>
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

    <!-- ── Matched to Resume ── -->
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
          <UButton to="/candidate/preferences" size="sm" variant="outline" icon="i-heroicons-link">
            Connect HH account
          </UButton>
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
              >
                {{ t('candidate.preferences.hhVacancyDetail') }} →
              </a>
            </div>
          </div>
        </div>
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

    <!-- ── Discovered Jobs ── -->
    <div v-show="activeMainTab === 'discovered'">
      <!-- AI activity feed -->
      <Transition name="feed">
        <div v-if="scoringActive || scoringLog.length" class="activity-feed">
          <div class="feed-header">
            <span class="pulse-dot" :class="{ active: scoringActive }" />
            <span class="feed-label">{{
              scoringActive ? 'Analyzing your job matches…' : 'Analysis complete'
            }}</span>
            <span v-if="scoringProgress.total" class="feed-count">
              {{ scoringProgress.done }}/{{ scoringProgress.total }}
            </span>
          </div>
          <div
            v-for="entry in scoringLog.filter((e) => !e.text.startsWith('Batch'))"
            :key="entry.ts"
            class="feed-entry"
          >
            <span class="feed-icon">{{ entry.icon }}</span>
            <span>{{ entry.text }}</span>
          </div>
        </div>
      </Transition>

      <!-- Filter bar -->
      <div class="filter-bar">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search jobs..."
          size="sm"
          class="filter-search"
        />
        <div class="mode-pills">
          <button
            v-for="opt in workModeOptions"
            :key="opt.value"
            type="button"
            class="mode-pill"
            :class="{ active: workMode === opt.value }"
            @click="workMode = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="filter-sep" />
        <div class="sort-toggle">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            type="button"
            class="sort-btn"
            :class="{ active: sortBy === opt.value }"
            @click="sortBy = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="score-range-wrap">
          <span class="score-range-label">
            Score ≥ <strong>{{ minScore }}%</strong>
          </span>
          <input
            v-model.number="minScore"
            type="range"
            min="0"
            max="100"
            step="10"
            class="score-range"
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
        <span v-if="scoringActive" class="scanning-pill">
          <span class="scanning-dot-sm" />AI scoring…
        </span>
      </div>

      <!-- Loading skeleton grid -->
      <div v-if="pending" class="jobs-grid">
        <div v-for="n in 6" :key="n" class="job-card-skeleton">
          <div class="flex items-start justify-between gap-2">
            <USkeleton class="w-10 h-10 rounded-[10px] shrink-0" />
            <USkeleton class="w-14 h-6 rounded-full" />
          </div>
          <USkeleton class="h-4 w-4/5 rounded mt-1" />
          <USkeleton class="h-3 w-3/5 rounded" />
          <div class="flex gap-2 mt-1">
            <USkeleton class="h-5 w-16 rounded-full" />
            <USkeleton class="h-5 w-16 rounded-full" />
          </div>
          <USkeleton class="h-3 w-full rounded mt-1" />
          <USkeleton class="h-3 w-5/6 rounded" />
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

      <!-- Card grid -->
      <div v-else class="jobs-grid">
        <div v-for="job in jobs" :key="job.id" class="job-card" @click="openDetail(job)">
          <!-- Top: avatar + score -->
          <div class="card-top">
            <div
              class="co-avatar"
              :style="{
                background: avatarColor(job.company).bg,
                color: avatarColor(job.company).fg,
              }"
            >
              {{ companyInitials(job.company) }}
            </div>
            <div
              class="score-badge"
              :style="{
                color: scoreBarColor(job.displayScore),
                background: scoreBg(job.displayScore),
              }"
            >
              {{ job.displayScore != null ? job.displayScore + '%' : '–' }}
            </div>
          </div>

          <!-- Title + company -->
          <h3 class="card-title">{{ job.title }}</h3>
          <p class="card-company">
            {{ job.company
            }}<span v-if="job.location" class="card-location"> · {{ job.location }}</span>
          </p>

          <!-- Tags row -->
          <div class="card-tags">
            <span v-if="job.workMode" class="tag tag-mode">{{ job.workMode }}</span>
            <span v-if="job.employmentType" class="tag tag-type">{{ job.employmentType }}</span>
            <span
              v-if="!job.application"
              class="status-badge"
              :style="{ background: jobStatus(job).bg, color: jobStatus(job).fg }"
              >{{ jobStatus(job).label }}</span
            >
          </div>

          <!-- Salary -->
          <p v-if="job.salaryMinUzs || job.salaryMaxUzs" class="card-salary">
            {{ formatSalary(job.salaryMinUzs)
            }}<template v-if="job.salaryMaxUzs"> – {{ formatSalary(job.salaryMaxUzs) }}</template>
          </p>

          <!-- Match hint -->
          <p v-if="job.matchExplanation" class="card-hint">{{ job.matchExplanation }}</p>

          <!-- Skill chips -->
          <div v-if="job.matchStrengths?.length || job.matchGaps?.length" class="card-skills">
            <span v-for="s in job.matchStrengths?.slice(0, 3)" :key="s" class="skill-match">{{
              s
            }}</span>
            <span v-for="g in job.matchGaps?.slice(0, 2)" :key="g" class="skill-gap">{{ g }}</span>
          </div>

          <!-- Footer -->
          <div class="card-footer" @click.stop>
            <span class="card-date">{{ formatPostedDate(job.postedAt) }}</span>
            <div class="card-actions">
              <template v-if="job.application">
                <UBadge
                  :color="appStatusColor(job.application.status)"
                  variant="subtle"
                  size="sm"
                  :title="
                    job.application.status === 'failed'
                      ? 'Application sending failed. You can try applying again.'
                      : undefined
                  "
                >
                  {{ capitalizeStatus(job.application.status) }}
                </UBadge>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="act-btn act-skip"
                  :class="{ active: skippedIds.has(job.id) }"
                  title="Skip"
                  @click="skipJob(job.id)"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="act-btn act-save"
                  :class="{ active: savedIds.has(job.id) }"
                  title="Save"
                  @click="toggleSave(job.id)"
                >
                  <UIcon
                    :name="
                      savedIds.has(job.id) ? 'i-heroicons-bookmark-solid' : 'i-heroicons-bookmark'
                    "
                    class="w-3.5 h-3.5"
                  />
                </button>
                <button
                  v-if="job.displayScore == null || job.displayScore > 0"
                  type="button"
                  class="act-apply"
                  :disabled="applying.has(job.id)"
                  @click="applyToJob(job)"
                >
                  <UIcon
                    v-if="applying.has(job.id)"
                    name="i-heroicons-arrow-path"
                    class="w-3.5 h-3.5 animate-spin"
                  />
                  <template v-else>Apply →</template>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="pagination-row">
        <UPagination v-model="page" :total="total" :page-size="limit" size="sm" />
      </div>
    </div>

    <!-- ── Job Detail Modal ── -->
    <UModal v-model:open="showDetailModal" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <div v-if="detailJob" class="detail-modal">
          <!-- Modal header -->
          <div class="dm-head">
            <div
              class="co-avatar co-avatar--lg"
              :style="{
                background: avatarColor(detailJob.company).bg,
                color: avatarColor(detailJob.company).fg,
              }"
            >
              {{ companyInitials(detailJob.company) }}
            </div>
            <div class="dm-title-block">
              <h2 class="dm-job-title">{{ detailJob.title }}</h2>
              <p class="dm-company">
                {{ detailJob.company
                }}<span v-if="detailJob.location" style="color: var(--ink-subtle)">
                  · {{ detailJob.location }}</span
                >
              </p>
            </div>
            <button type="button" class="dm-close" @click="showDetailModal = false">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <div class="dm-body">
            <!-- Meta chips -->
            <div class="dm-meta">
              <span v-if="detailJob.workMode" class="meta-chip">
                <UIcon name="i-heroicons-building-office-2" class="w-3.5 h-3.5" />
                {{ detailJob.workMode }}
              </span>
              <span v-if="detailJob.employmentType" class="meta-chip">
                <UIcon name="i-heroicons-briefcase" class="w-3.5 h-3.5" />
                {{ detailJob.employmentType }}
              </span>
              <span v-if="detailJob.salaryMinUzs || detailJob.salaryMaxUzs" class="meta-chip">
                <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5" />
                {{ formatSalary(detailJob.salaryMinUzs)
                }}<template v-if="detailJob.salaryMaxUzs">
                  – {{ formatSalary(detailJob.salaryMaxUzs) }}</template
                >
              </span>
              <a
                v-if="detailJob.sourceUrl"
                :href="safeUrl(detailJob.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="meta-chip meta-link"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
                {{ detailJob.source }}
              </a>
            </div>

            <!-- Actions -->
            <div class="dm-actions">
              <template v-if="detailJob.application">
                <UBadge
                  :color="appStatusColor(detailJob.application.status)"
                  variant="subtle"
                  size="md"
                >
                  {{ capitalizeStatus(detailJob.application.status) }}
                </UBadge>
              </template>
              <template v-else>
                <UButton
                  v-if="detailJob.displayScore == null || detailJob.displayScore > 0"
                  size="sm"
                  icon="i-heroicons-paper-airplane"
                  :loading="applying.has(detailJob.id)"
                  @click="applyToJob(detailJob)"
                >
                  Apply
                </UButton>
                <UButton
                  size="sm"
                  variant="outline"
                  :icon="
                    savedIds.has(detailJob.id)
                      ? 'i-heroicons-bookmark-solid'
                      : 'i-heroicons-bookmark'
                  "
                  @click="toggleSave(detailJob.id)"
                >
                  {{ savedIds.has(detailJob.id) ? 'Saved' : 'Save' }}
                </UButton>
                <UButton
                  v-if="!skippedIds.has(detailJob.id)"
                  size="sm"
                  variant="outline"
                  color="error"
                  icon="i-heroicons-x-mark"
                  @click="skipJob(detailJob.id)"
                >
                  Skip
                </UButton>
              </template>
            </div>

            <!-- AI Match -->
            <div
              v-if="detailJob.displayScore != null && detailJob.application?.status !== 'failed'"
              class="match-section"
            >
              <div class="match-head">
                <span class="match-label">AI MATCH</span>
                <span class="match-score" :style="{ color: scoreBarColor(detailJob.displayScore) }">
                  {{ detailJob.displayScore }}%
                </span>
              </div>
              <div
                v-if="detailJob.matchStrengths?.length || detailJob.matchGaps?.length"
                class="skills-grid"
              >
                <div v-if="detailJob.matchStrengths?.length" class="skills-col">
                  <p class="skills-label matched-label">Matched skills</p>
                  <div class="skills-tags">
                    <span
                      v-for="s in detailJob.matchStrengths"
                      :key="s"
                      class="skill-tag matched-tag"
                      >{{ s }}</span
                    >
                  </div>
                </div>
                <div v-if="detailJob.matchGaps?.length" class="skills-col">
                  <p class="skills-label missing-label">Missing skills</p>
                  <div class="skills-tags">
                    <span v-for="g in detailJob.matchGaps" :key="g" class="skill-tag missing-tag">{{
                      g
                    }}</span>
                  </div>
                </div>
              </div>
              <p v-if="detailJob.matchExplanation" class="match-explanation">
                {{ detailJob.matchExplanation }}
              </p>
            </div>

            <!-- Description -->
            <div v-if="detailJob.description" class="desc-section">
              <p class="section-eyebrow">JOB DESCRIPTION</p>
              <p class="desc-text">
                {{ detailJob.description.slice(0, 800)
                }}{{ detailJob.description.length > 800 ? '…' : '' }}
              </p>
              <a
                v-if="detailJob.sourceUrl"
                :href="safeUrl(detailJob.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="view-full"
              >
                View full description →
              </a>
            </div>

            <!-- Skills -->
            <div v-if="detailJob.skills?.length" class="desc-section">
              <p class="section-eyebrow">SKILLS</p>
              <div class="skills-tags">
                <span v-for="s in detailJob.skills" :key="s" class="skill-tag neutral-tag">{{
                  s
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.jobs-layout {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Header ── */
.jobs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
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
}

/* ── Tab strip ── */
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
  padding: 6px 14px;
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
.hh-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
  letter-spacing: 0.04em;
}
.tab-btn.active .hh-badge {
  background: rgba(0, 0, 0, 0.08);
  color: var(--ink-muted);
}

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-search {
  max-width: 200px;
}
.mode-pills {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.mode-pill {
  padding: 5px 11px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
  border: none;
  background: var(--bg);
  white-space: nowrap;
}
.mode-pill + .mode-pill {
  border-left: 1px solid var(--line);
}
.filter-sep {
  width: 1px;
  height: 18px;
  background: var(--line);
  flex-shrink: 0;
  align-self: center;
}
.mode-pill:hover:not(.active) {
  background: var(--bg-elevated);
  color: var(--ink);
}
.mode-pill.active {
  background: var(--ink);
  color: var(--bg);
}
.sort-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.sort-btn {
  padding: 5px 11px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
  border: none;
  background: var(--bg);
  white-space: nowrap;
}
.sort-btn + .sort-btn {
  border-left: 1px solid var(--line);
}
.sort-btn:hover:not(.active) {
  background: var(--bg-elevated);
  color: var(--ink);
}
.sort-btn.active {
  background: var(--ink);
  color: var(--bg);
}
.score-range-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
}
.score-range-label {
  font-size: 12.5px;
  color: var(--ink-muted);
  white-space: nowrap;
}
.score-range {
  width: 80px;
  accent-color: var(--accent, #5b6af5);
  cursor: pointer;
  height: 4px;
}
.scanning-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--accent);
}
.scanning-dot-sm {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  animation: scan-pulse 1.2s ease-in-out infinite;
}
@keyframes scan-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* ── Card grid ── */
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 1280px) {
  .jobs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .jobs-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Job card ── */
.job-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 16px 16px 12px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    border-color 0.15s,
    transform 0.1s;
  position: relative;
}
.job-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  border-color: var(--line);
  transform: translateY(-1px);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.co-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}
.co-avatar--lg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
}
.score-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.4;
  flex-shrink: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-company {
  font-size: 12.5px;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-location {
  color: var(--ink-subtle);
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tag {
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
}
.tag-mode,
.tag-type {
  background: var(--bg-elevated);
  color: var(--ink-muted);
  border: 1px solid var(--line-soft);
}
.status-badge {
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 500;
}

.card-salary {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.card-hint {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.skill-match {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, var(--positive) 10%, transparent);
  color: var(--positive);
  border: 1px solid color-mix(in srgb, var(--positive) 22%, transparent);
}
.skill-gap {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 22%, transparent);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line-soft);
}
.card-date {
  font-size: 11.5px;
  color: var(--ink-subtle);
}
.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.act-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  flex-shrink: 0;
}
.act-skip:hover {
  border-color: var(--negative);
  color: var(--negative);
  background: color-mix(in srgb, var(--negative) 8%, transparent);
}
.act-skip.active {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
}
.act-save:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.act-save.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}
.act-apply {
  padding: 5px 12px;
  border-radius: 7px;
  background: var(--ink);
  color: var(--bg);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.12s;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  white-space: nowrap;
}
.act-apply:hover:not(:disabled) {
  opacity: 0.82;
}
.act-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Card skeleton ── */
.job-card-skeleton {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Empty state ── */
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
  text-align: center;
  max-width: 300px;
}

/* ── Pagination ── */
.pagination-row {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

/* ── Detail modal ── */
.detail-modal {
  display: flex;
  flex-direction: column;
  max-height: 88vh;
}
.dm-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--line-soft);
}
.dm-title-block {
  flex: 1;
  min-width: 0;
}
.dm-job-title {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  font-weight: 400;
  color: var(--ink);
  line-height: 1.2;
}
.dm-company {
  font-size: 13.5px;
  color: var(--ink-muted);
  margin-top: 3px;
}
.dm-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  padding: 4px;
  border-radius: 6px;
  transition: all 0.12s;
  flex-shrink: 0;
  outline: none;
}
.dm-close:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.dm-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.dm-body {
  padding: 18px 22px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dm-meta {
  display: flex;
  gap: 6px;
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
.dm-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ── Match section (modal) ── */
.match-section {
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.match-head {
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
  gap: 12px;
}
.skills-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
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
  gap: 4px;
}
.skill-tag {
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11.5px;
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

/* ── Description (modal) ── */
.desc-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}
.desc-text {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--ink-muted);
}
.view-full {
  font-size: 13px;
  color: var(--accent, #5b6af5);
  text-decoration: none;
  align-self: flex-start;
}
.view-full:hover {
  text-decoration: underline;
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
  margin-bottom: 4px;
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
