<script setup lang="ts">
import type { DiscoveredJob, SeekerApplication, PaginatedResponse } from '~/types/api'
import {
  scoringActive,
  resumeParseStatus,
  newMessageApplicationIds,
} from '~/composables/useCandidateEventStream'
import { AVATAR_COLORS, CARD_TINTS, CARD_TINTS_DARK } from '~/constants/ui'

definePageMeta({ layout: 'candidate' })
useHead({ title: 'Dashboard' })

const { t } = useI18n()
const store = useCandidateAuthStore()
const api = useCandidateApi()
const toast = useToast()

interface HrApplication {
  id: string
  status: string
  matchScore?: string
  matchedAt?: string
  job: { id: string; title: string; company: { name: string } }
}

interface Profile {
  fullName?: string
  phone?: string
  city?: string
  currentPosition?: string
  currentCompany?: string
  preferredWorkMode?: string
  resumeFileUrl?: string
  telegramUsername?: string
  yearsExperience?: number | string
  skills?: string[]
  minMatchScore?: number | null
}

const [profileRes, topJobsRes, seekerAppsRes, hrAppsRes] = await Promise.all([
  useAsyncData(
    'dash-profile',
    () => api.get<Profile>('/api/v1/candidate-portal/profile').catch(() => null),
    { lazy: true },
  ),
  useAsyncData(
    'dash-top-jobs',
    () =>
      api
        .get<PaginatedResponse<DiscoveredJob>>('/api/v1/candidate-portal/discovered-jobs', {
          sortBy: 'score',
          page: 1,
          limit: 5,
        })
        .catch(() => null),
    { lazy: true },
  ),
  useAsyncData(
    'dash-seeker-apps',
    () =>
      api
        .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
        .catch(() => [] as SeekerApplication[]),
    { lazy: true },
  ),
  useAsyncData(
    'dash-hr-apps',
    () =>
      api
        .get<HrApplication[]>('/api/v1/candidate-portal/applications')
        .catch(() => [] as HrApplication[]),
    { lazy: true },
  ),
])

const profile = profileRes.data
const topJobs = computed(() => topJobsRes.data.value?.data ?? [])
const seekerApps = computed(() => seekerAppsRes.data.value ?? [])
const hrApps = computed(() => hrAppsRes.data.value ?? [])

const { percent: completeness } = useProfileCompletion(profile)

watch(
  () => profileRes.status.value,
  (status) => {
    if (status === 'success' && completeness.value === 0 && !profile.value) {
      navigateTo('/candidate/onboarding')
    }
  },
)

// ── Score trigger ─────────────────────────────────────────────────────────────
const scoringInProgress = ref(false)

async function triggerScoring() {
  scoringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/score', {})
    toast.add({
      title: t('candidate.dashboard.scoringQueued'),
      description: t('candidate.dashboard.scoringDesc'),
      color: 'success',
    })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    scoringInProgress.value = false
  }
}

// ── Pass job ──────────────────────────────────────────────────────────────────
const passedJobIds = ref<Set<string>>(new Set())

async function passJob(id: string, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  passedJobIds.value = new Set([...passedJobIds.value, id])
  try {
    await api.post(`/api/v1/candidate-portal/discovered-jobs/${id}/skip`, {})
  } catch (err) {
    passedJobIds.value = new Set([...passedJobIds.value].filter((x) => x !== id))
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(err),
      color: 'error',
    })
  }
}

// ── Applications tabs ─────────────────────────────────────────────────────────
type AppTab = 'all' | 'submitted' | 'inflight' | 'needs_you' | 'failed' | 'skipped'
const appTab = ref<AppTab>('all')
const appsSearch = ref('')

interface UnifiedApp {
  id: string
  type: 'seeker' | 'hr'
  company: string
  title: string
  status: string
  hasResume: boolean
  hasCoverLetter: boolean
  appliedAt: string | undefined
}

const allApps = computed<UnifiedApp[]>(() => {
  const seeker: UnifiedApp[] = seekerApps.value.map((a) => ({
    id: a.id,
    type: 'seeker',
    company: a.discoveredJob?.company ?? '—',
    title: a.discoveredJob?.title ?? '—',
    status: a.status,
    hasResume: true,
    hasCoverLetter: !!a.coverLetter,
    appliedAt: a.appliedAt ?? a.createdAt,
  }))
  const hr: UnifiedApp[] = hrApps.value.map((a) => ({
    id: a.id,
    type: 'hr',
    company: a.job.company.name,
    title: a.job.title,
    status: a.status,
    hasResume: true,
    hasCoverLetter: false,
    appliedAt: a.matchedAt,
  }))
  return [...seeker, ...hr].sort((a, b) => {
    if (!a.appliedAt) return 1
    if (!b.appliedAt) return -1
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  })
})

const tabCounts = computed(() => ({
  all: allApps.value.length,
  submitted: allApps.value.filter((a) => ['applied', 'queued'].includes(a.status)).length,
  inflight: allApps.value.filter((a) => ['viewed', 'interview', 'screening'].includes(a.status))
    .length,
  needs_you: allApps.value.filter((a) => a.status === 'screening').length,
  failed: allApps.value.filter((a) => ['rejected', 'failed'].includes(a.status)).length,
  skipped: passedJobIds.value.size,
}))

const filteredApps = computed(() => {
  let list = allApps.value
  if (appTab.value === 'submitted')
    list = list.filter((a) => ['applied', 'queued'].includes(a.status))
  else if (appTab.value === 'inflight')
    list = list.filter((a) => ['viewed', 'interview', 'screening'].includes(a.status))
  else if (appTab.value === 'needs_you') list = list.filter((a) => a.status === 'screening')
  else if (appTab.value === 'failed')
    list = list.filter((a) => ['rejected', 'failed'].includes(a.status))
  if (appsSearch.value.trim()) {
    const q = appsSearch.value.toLowerCase()
    list = list.filter(
      (a) => a.company.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
    )
  }
  return list
})

const tablePageSize = ref(12)
const tablePageSizeOptions = [12, 25, 50]

const paginatedApps = computed(() => filteredApps.value.slice(0, tablePageSize.value))
const showingEnd = computed(() => Math.min(tablePageSize.value, filteredApps.value.length))

watch([appTab, appsSearch], () => {
  tablePageSize.value = 12
})

const needsYouApps = computed(() => allApps.value.filter((a) => a.status === 'screening'))

function cardTint(idx: number) {
  return CARD_TINTS[idx % CARD_TINTS.length]
}

function companyColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h] ?? AVATAR_COLORS[0]!
}

function ringColor(score: number | null | undefined): string {
  if (score == null) return 'var(--ink-subtle)'
  if (score >= 70) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function relTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function statusLabel(s: string): string {
  const key = `candidate.tracker.${s}`
  return t(key, s)
}

function statusColor(s: string): string {
  if (['applied', 'viewed', 'interview'].includes(s)) return 'var(--positive)'
  if (s === 'screening') return 'var(--warning)'
  if (['rejected', 'failed'].includes(s)) return 'var(--negative)'
  if (s === 'offer') return 'var(--accent)'
  return 'var(--ink-subtle)'
}

function needsAction(app: UnifiedApp): boolean {
  return app.status === 'screening'
}

const showCoachModal = ref(false)

const APP_TABS = computed(() => [
  { key: 'all' as AppTab, label: t('candidate.dashboard.tabAll') },
  { key: 'submitted' as AppTab, label: t('candidate.dashboard.tabSubmitted') },
  { key: 'inflight' as AppTab, label: t('candidate.dashboard.tabInflight') },
  { key: 'needs_you' as AppTab, label: t('candidate.dashboard.tabNeedsYou') },
  { key: 'failed' as AppTab, label: t('candidate.dashboard.tabFailed') },
  { key: 'skipped' as AppTab, label: t('candidate.dashboard.tabSkipped') },
])

// Keep SSE watchers for toast
watch(resumeParseStatus, (status) => {
  if (status === 'parsing')
    toast.add({ title: t('candidate.profile.analyzingAi'), color: 'info', duration: 0 })
  else if (status === 'done')
    toast.add({
      title: t('candidate.profile.resumeAnalysisComplete'),
      color: 'success',
      duration: 4000,
    })
  else if (status === 'error')
    toast.add({ title: t('candidate.profile.cvUploadFailed'), color: 'error', duration: 5000 })
})
</script>

<template>
  <div class="dash-root">
    <!-- ── Search bar ── -->
    <div class="search-row">
      <div class="search-wrap">
        <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
        <input
          type="text"
          class="search-input"
          :placeholder="t('candidate.dashboard.searchJobsPlaceholder')"
          :title="t('candidate.dashboard.searchJobsTitle')"
          @keydown.enter="navigateTo('/candidate/jobs')"
        />
      </div>
    </div>

    <!-- ── Filter chips ── -->
    <div class="filter-row">
      <button type="button" class="chip-btn" @click="navigateTo('/candidate/jobs')">
        {{ t('candidate.dashboard.filterDate') }}
        <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-0.5" />
      </button>
      <button type="button" class="chip-btn" @click="navigateTo('/candidate/jobs')">
        <UIcon name="i-heroicons-map-pin" class="w-3 h-3" />
        {{ t('candidate.dashboard.filterLocation') }}
        <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-0.5" />
      </button>
      <button type="button" class="chip-btn" @click="navigateTo('/candidate/jobs')">
        {{ t('candidate.dashboard.filterWorkplace') }}
        <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-0.5" />
      </button>
      <button type="button" class="chip-btn" @click="navigateTo('/candidate/jobs')">
        {{ t('candidate.dashboard.filterExperience') }}
        <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-0.5" />
      </button>
      <button type="button" class="chip-btn" @click="navigateTo('/candidate/jobs')">
        {{ t('candidate.dashboard.filterJobType') }}
        <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-0.5" />
      </button>
      <div class="flex-1" />
      <button
        type="button"
        class="chip-btn chip-btn--apply"
        :class="{ 'opacity-60': scoringInProgress }"
        @click="triggerScoring"
      >
        <UIcon
          v-if="scoringInProgress"
          name="i-heroicons-arrow-path"
          class="w-3.5 h-3.5 animate-spin"
        />
        <UIcon v-else name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
        {{ t('candidate.dashboard.scoreBtn') }}
      </button>
    </div>

    <!-- ── Top job matches ── -->
    <div class="section-block">
      <div class="section-head">
        <h2 class="section-title">{{ t('candidate.dashboard.topMatches') }}</h2>
        <div class="section-actions">
          <NuxtLink to="/candidate/jobs" class="action-btn">
            <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
            {{ t('candidate.dashboard.addOwn') }}
          </NuxtLink>
          <NuxtLink to="/candidate/jobs" class="action-btn">
            <UIcon name="i-heroicons-briefcase" class="w-3.5 h-3.5" />
            {{ t('candidate.dashboard.browseJobs') }}
          </NuxtLink>
          <button
            v-if="topJobs.length"
            type="button"
            class="action-btn action-btn--primary"
            :class="{ 'opacity-60 pointer-events-none': scoringInProgress }"
            @click="triggerScoring"
          >
            <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5" />
            {{ t('candidate.dashboard.applyToAll', { n: topJobs.length }) }} →
          </button>
        </div>
      </div>

      <!-- Loading -->
      <template v-if="topJobsRes.status.value === 'pending'">
        <div class="jobs-scroll">
          <div v-for="n in 4" :key="n" class="job-card job-card--skeleton">
            <USkeleton class="h-3 w-24 rounded" />
            <USkeleton class="h-5 w-4/5 rounded mt-3" />
            <USkeleton class="h-5 w-3/5 rounded mt-1" />
            <USkeleton class="h-3 w-full rounded mt-4" />
            <div class="flex gap-2 mt-4">
              <USkeleton class="h-6 w-16 rounded-full" />
              <USkeleton class="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </template>

      <!-- Empty -->
      <div v-else-if="!topJobs.length" class="jobs-empty">
        <div class="jobs-empty-icon">
          <UIcon name="i-heroicons-sparkles" class="w-6 h-6" style="color: var(--ink-subtle)" />
        </div>
        <p class="text-sm font-medium" style="color: var(--ink)">
          {{ t('candidate.dashboard.aiScanning') }}
        </p>
        <p class="text-xs" style="color: var(--ink-muted)">
          {{ t('candidate.dashboard.aiScanningDesc') }}
        </p>
        <NuxtLink to="/candidate/jobs" class="action-btn action-btn--primary mt-2">
          {{ t('candidate.dashboard.exploreManually') }} →
        </NuxtLink>
      </div>

      <!-- Cards -->
      <div v-else class="jobs-scroll">
        <NuxtLink
          v-for="(job, idx) in topJobs.filter((j) => !passedJobIds.has(j.id))"
          :key="job.id"
          to="/candidate/jobs"
          class="job-card"
          :style="{ background: cardTint(idx) }"
        >
          <!-- Top meta row -->
          <div class="job-card-meta">
            <span class="job-meta-loc">
              <UIcon name="i-heroicons-map-pin" class="w-3 h-3 shrink-0" />
              {{ job.location ?? t('candidate.jobs.remote') }}
            </span>
            <span class="job-meta-time">{{ relTime(job.postedAt ?? job.discoveredAt) }}</span>
            <!-- Match badge -->
            <div v-if="job.displayScore != null" class="match-badge-wrap">
              <svg width="42" height="42" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="17" fill="white" opacity="0.7" stroke="none" />
                <circle cx="21" cy="21" r="16" fill="none" stroke="#e5e7eb" stroke-width="2.5" />
                <circle
                  cx="21"
                  cy="21"
                  r="16"
                  fill="none"
                  :stroke="ringColor(job.displayScore)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 16}`"
                  :stroke-dashoffset="`${2 * Math.PI * 16 * (1 - (job.displayScore ?? 0) / 100)}`"
                  transform="rotate(-90 21 21)"
                />
                <text
                  x="21"
                  y="25"
                  text-anchor="middle"
                  font-size="9"
                  font-weight="700"
                  :fill="ringColor(job.displayScore)"
                >
                  {{ job.displayScore }}%
                </text>
              </svg>
              <span class="match-badge-label">{{ t('candidate.dashboard.matchLabel') }}</span>
            </div>
          </div>

          <!-- Title -->
          <p class="job-card-title">{{ job.title }}</p>

          <!-- Skills -->
          <div v-if="job.skills?.length" class="job-skills">
            <span v-for="skill in job.skills.slice(0, 3)" :key="skill" class="skill-tag">{{
              skill
            }}</span>
            <span v-if="job.skills.length > 3" class="skill-tag skill-tag--more"
              >+{{ job.skills.length - 3 }}</span
            >
          </div>

          <!-- Bottom row: company + actions -->
          <div class="job-card-bottom">
            <div class="job-company-row">
              <span
                class="company-initial"
                :style="{
                  background: companyColor(job.company).bg,
                  color: companyColor(job.company).fg,
                }"
                >{{ (job.company[0] ?? '?').toUpperCase() }}</span
              >
              <span class="company-name">{{ job.company }}</span>
            </div>
            <div class="job-card-btns">
              <button type="button" class="btn-pass" @click="passJob(job.id, $event)">
                <UIcon name="i-heroicons-hand-thumb-down" class="w-3.5 h-3.5" />
                {{ t('candidate.dashboard.passJob') }}
              </button>
              <button
                type="button"
                class="btn-apply"
                @click.prevent="navigateTo('/candidate/jobs')"
              >
                {{ t('candidate.dashboard.applyBtn') }}
              </button>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- ── All applications ── -->
    <div class="section-block">
      <div class="section-head">
        <h2 class="section-title">{{ t('candidate.dashboard.allApplications') }}</h2>
        <div class="section-actions">
          <NuxtLink to="/candidate/tracker" class="action-btn">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-3.5 h-3.5" />
            {{ t('candidate.dashboard.openTracker') }}
          </NuxtLink>
          <button
            v-if="needsYouApps.length"
            type="button"
            class="action-btn action-btn--primary"
            @click="navigateTo('/candidate/inbox')"
          >
            <UIcon name="i-heroicons-check" class="w-3.5 h-3.5" />
            {{ t('candidate.dashboard.approveAll', { n: needsYouApps.length }) }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="apps-tabs-row">
        <div class="apps-tabs">
          <button
            v-for="tab in APP_TABS"
            :key="tab.key"
            type="button"
            class="app-tab"
            :class="{ 'app-tab--active': appTab === tab.key }"
            @click="appTab = tab.key"
          >
            {{ tab.label }}
            <span class="tab-count">{{ tabCounts[tab.key] }}</span>
          </button>
        </div>
        <div class="apps-search-wrap">
          <UIcon name="i-heroicons-magnifying-glass" class="apps-search-icon" />
          <input
            v-model="appsSearch"
            type="text"
            class="apps-search"
            :placeholder="t('candidate.dashboard.companySearch')"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="apps-table-wrap">
        <table class="apps-table">
          <thead>
            <tr>
              <th>{{ t('candidate.dashboard.colCompany') }}</th>
              <th>{{ t('candidate.dashboard.colResume') }}</th>
              <th>{{ t('candidate.dashboard.colCoverLetter') }}</th>
              <th>{{ t('candidate.dashboard.colStatus') }}</th>
              <th>{{ t('candidate.dashboard.colApplied') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredApps.length">
              <td colspan="6" class="apps-empty-row">
                <span>{{ t('candidate.dashboard.noApps') }}</span>
              </td>
            </tr>
            <tr v-for="app in paginatedApps" :key="app.id" class="apps-row">
              <td class="app-company-cell">
                <span
                  class="app-company-initial"
                  :style="{
                    background: companyColor(app.company).bg,
                    color: companyColor(app.company).fg,
                  }"
                  >{{ (app.company[0] ?? '?').toUpperCase() }}</span
                >
                <div>
                  <p class="app-company-name">{{ app.company }}</p>
                  <p class="app-job-title">{{ app.title }}</p>
                </div>
              </td>
              <td>
                <span
                  class="status-dot-row"
                  :style="{ color: app.hasResume ? 'var(--warning)' : 'var(--ink-subtle)' }"
                >
                  <span
                    class="status-dot"
                    :style="{ background: app.hasResume ? 'var(--warning)' : 'var(--ink-subtle)' }"
                  />
                  {{
                    app.hasResume
                      ? t('candidate.dashboard.resumeReview')
                      : t('candidate.dashboard.resumeNone')
                  }}
                </span>
              </td>
              <td>
                <span class="status-dot-row" style="color: var(--ink-subtle)">
                  <span class="status-dot" style="background: var(--ink-subtle)" />
                  {{
                    app.hasCoverLetter
                      ? t('candidate.dashboard.coverLetterYes')
                      : t('candidate.dashboard.coverLetterPending')
                  }}
                </span>
              </td>
              <td>
                <span class="status-dot-row" :style="{ color: statusColor(app.status) }">
                  <span class="status-dot" :style="{ background: statusColor(app.status) }" />
                  {{ statusLabel(app.status) }}
                </span>
              </td>
              <td class="app-time-cell">{{ relTime(app.appliedAt) }}</td>
              <td>
                <button
                  v-if="needsAction(app)"
                  type="button"
                  class="btn-approve"
                  @click="navigateTo('/candidate/inbox')"
                >
                  <UIcon name="i-heroicons-check" class="w-3 h-3" />
                  {{ t('candidate.dashboard.approve') }}
                </button>
                <NuxtLink v-else to="/candidate/tracker" class="btn-view">{{
                  t('candidate.dashboard.view')
                }}</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination info -->
      <div v-if="filteredApps.length" class="table-footer">
        <span>{{ t('candidate.dashboard.rowsPerPage') }}</span>
        <select v-model="tablePageSize" class="page-size-select">
          <option v-for="n in tablePageSizeOptions" :key="n" :value="n">{{ n }}</option>
        </select>
        <span style="color: var(--ink-muted)">
          {{ t('candidate.dashboard.showing', { n: showingEnd, total: filteredApps.length }) }}
        </span>
      </div>
    </div>

    <SalaryCoachModal v-model:open="showCoachModal" />
  </div>
</template>

<style scoped>
.dash-root {
  max-width: 1100px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Search ── */
.search-row {
  display: flex;
  gap: 10px;
}
.search-wrap {
  flex: 1;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 17px;
  height: 17px;
  color: var(--ink-subtle);
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 42px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input::placeholder {
  color: var(--ink-subtle);
}
.search-input:focus {
  border-color: var(--accent);
}

/* ── Filter chips ── */
.filter-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.chip-btn:hover {
  border-color: var(--ink-subtle);
  color: var(--ink);
}
.chip-btn--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
}
.chip-btn--apply {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}
.chip-btn--apply:hover {
  opacity: 0.85;
  border-color: var(--ink);
  color: var(--bg);
}
.chip-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 10px;
  font-weight: 700;
}

/* ── Section block ── */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.section-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.12s;
  white-space: nowrap;
}
.action-btn:hover {
  border-color: var(--ink-subtle);
  color: var(--ink);
}
.action-btn--primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}
.action-btn--primary:hover {
  opacity: 0.85;
  color: var(--bg);
}

/* ── Job cards ── */
.jobs-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-snap-type: x mandatory;
  -ms-overflow-style: none;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 60px), transparent 100%);
}
.jobs-scroll::-webkit-scrollbar {
  display: none;
}
.job-card {
  flex-shrink: 0;
  width: 270px;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-decoration: none;
  scroll-snap-align: start;
  border: 1.5px solid transparent;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.job-card--skeleton {
  background: var(--bg-elevated);
  border: 1.5px solid var(--line-soft);
}

.job-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.job-meta-loc {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
}
.job-meta-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  margin-left: auto;
  padding-right: 52px;
}
.match-badge-wrap {
  position: absolute;
  right: 0;
  top: -2px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.match-badge-label {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0, 0.4);
  margin-top: -2px;
}

.job-card-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.job-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.skill-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.6);
}
.skill-tag--more {
  color: rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.04);
}

.job-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}
.job-company-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
}
.company-initial {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}
.company-name {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-card-btns {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.btn-pass {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.6);
  color: rgba(0, 0, 0, 0.5);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s;
}
.btn-pass:hover {
  background: rgba(255, 255, 255, 0.9);
  color: rgba(0, 0, 0, 0.7);
}
.btn-apply {
  padding: 5px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.12s;
}
.btn-apply:hover {
  opacity: 0.8;
}

.jobs-empty {
  background: var(--bg-elevated);
  border: 1.5px solid var(--line-soft);
  border-radius: 16px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.jobs-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Applications ── */
.apps-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.apps-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.app-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
}
.app-tab:hover {
  background: var(--bg-elevated);
  color: var(--ink);
}
.app-tab--active {
  background: var(--ink);
  color: var(--bg);
}
.tab-count {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.7;
}
.app-tab--active .tab-count {
  opacity: 1;
}

.apps-search-wrap {
  position: relative;
}
.apps-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--ink-subtle);
  pointer-events: none;
}
.apps-search {
  height: 34px;
  padding: 0 12px 0 30px;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  min-width: 180px;
}
.apps-search::placeholder {
  color: var(--ink-subtle);
}
.apps-search:focus {
  border-color: var(--accent);
}

.apps-table-wrap {
  border: 1.5px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.apps-table {
  width: 100%;
  border-collapse: collapse;
}
.apps-table thead tr {
  border-bottom: 1.5px solid var(--line);
}
.apps-table th {
  padding: 10px 16px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--ink-subtle);
  text-transform: uppercase;
  background: var(--bg-elevated);
}
.apps-table td {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--ink);
  vertical-align: middle;
}
.apps-row {
  border-bottom: 1px solid var(--line-soft);
  transition: background 0.1s;
}
.apps-row:last-child {
  border-bottom: none;
}
.apps-row:hover {
  background: var(--bg-elevated);
}
.apps-empty-row {
  text-align: center;
  padding: 32px !important;
  color: var(--ink-muted);
  font-size: 13px;
}

.app-company-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.app-company-initial {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
.app-company-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.app-job-title {
  font-size: 11.5px;
  color: var(--ink-muted);
  margin-top: 1px;
}
.app-time-cell {
  font-size: 12px;
  color: var(--ink-muted);
  white-space: nowrap;
}

.status-dot-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.btn-approve {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 8px;
  border: none;
  background: var(--ink);
  color: var(--bg);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;
  white-space: nowrap;
}
.btn-approve:hover {
  opacity: 0.85;
}
.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: transparent;
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.12s;
  white-space: nowrap;
}
.btn-view:hover {
  border-color: var(--ink-subtle);
  color: var(--ink);
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1.5px solid var(--line-soft);
  font-size: 12.5px;
  color: var(--ink-muted);
}
.page-size-select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 12.5px;
  outline: none;
  cursor: pointer;
}
</style>
