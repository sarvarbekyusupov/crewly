<script setup lang="ts">
import type { DiscoveredJob, SeekerApplication, PaginatedResponse } from '~/types/api'
import {
  scoringActive,
  resumeParseStatus,
  newMessageApplicationIds,
} from '~/composables/useCandidateEventStream'

definePageMeta({ layout: 'candidate' })
useHead({ title: 'Dashboard' })

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
  useAsyncData('dash-profile', () =>
    api.get<Profile>('/api/v1/candidate-portal/profile').catch(() => null),
  ),
  useAsyncData('dash-top-jobs', () =>
    api
      .get<PaginatedResponse<DiscoveredJob>>('/api/v1/candidate-portal/discovered-jobs', {
        sortBy: 'score',
        page: 1,
        limit: 3,
      })
      .catch(() => null),
  ),
  useAsyncData('dash-seeker-apps', () =>
    api
      .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
      .catch(() => [] as SeekerApplication[]),
  ),
  useAsyncData('dash-hr-apps', () =>
    api
      .get<HrApplication[]>('/api/v1/candidate-portal/applications')
      .catch(() => [] as HrApplication[]),
  ),
])

const profile = profileRes.data
const topJobs = computed(() => topJobsRes.data.value?.data ?? [])
const seekerApps = computed(() => seekerAppsRes.data.value ?? [])
const hrApps = computed(() => hrAppsRes.data.value ?? [])

const { percent: completeness, missing: missingFields } = useProfileCompletion(profile)

onMounted(() => {
  if (completeness.value === 0) {
    navigateTo('/candidate/onboarding')
  }
})

// ── Greeting ─────────────────────────────────────────────────────────────────
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech'
const firstName = computed(() => store.candidate?.fullName?.split(' ')[0] ?? '')

const contextLine = computed(() => {
  if (pulse.value.screening > 0) return `${pulse.value.screening} active screening — reply needed`
  if (pulse.value.offers > 0)
    return `You have ${pulse.value.offers} offer${pulse.value.offers > 1 ? 's' : ''}`
  const total = topJobsRes.data.value?.total ?? 0
  return total > 0 ? `${total} jobs discovered and scored for you` : 'AI is scanning for matches'
})

// ── Priority actions ──────────────────────────────────────────────────────────
interface PriorityAction {
  id: string
  label: string
  detail: string
  icon: string
  to: string
  urgent: boolean
}

const priorityActions = computed<PriorityAction[]>(() => {
  const actions: PriorityAction[] = []

  const screening = hrApps.value.find((a) => a.status === 'screening')
  if (screening) {
    actions.push({
      id: 'screening',
      label: 'Reply to screening',
      detail: `${screening.job.title} at ${screening.job.company.name}`,
      icon: 'i-heroicons-chat-bubble-left-right',
      to: `/candidate/inbox?app=${screening.id}`,
      urgent: true,
    })
  }

  const newMsgCount = newMessageApplicationIds.value.size
  if (newMsgCount > 0 && !screening) {
    const firstNewId = [...newMessageApplicationIds.value][0]
    actions.push({
      id: 'messages',
      label: `${newMsgCount} new message${newMsgCount > 1 ? 's' : ''}`,
      detail: 'Employer replied to your application',
      icon: 'i-heroicons-inbox',
      to: firstNewId ? `/candidate/inbox?app=${firstNewId}` : '/candidate/inbox',
      urgent: true,
    })
  }

  if (completeness.value < 80 && missingFields.value.length > 0) {
    const fieldLabel: Record<string, string> = {
      resumeFileUrl: 'Upload your CV',
      skills: 'Add your skills',
      telegramUsername: 'Add Telegram handle',
      phone: 'Add phone number',
      preferredWorkMode: 'Set work mode',
      city: 'Set your city',
    }
    const firstMissing = missingFields.value[0] ?? ''
    actions.push({
      id: 'profile',
      label: fieldLabel[firstMissing] ?? 'Complete profile',
      detail: `Profile ${completeness.value}% — incomplete profiles get fewer matches`,
      icon: 'i-heroicons-user-circle',
      to: '/candidate/profile',
      urgent: false,
    })
  }

  const topJob = topJobs.value[0]
  if (topJob && topJob.displayScore != null && topJob.displayScore >= 70 && actions.length < 2) {
    actions.push({
      id: 'top-match',
      label: `${topJob.displayScore}% match available`,
      detail: `${topJob.title} at ${topJob.company}`,
      icon: 'i-heroicons-sparkles',
      to: '/candidate/jobs',
      urgent: false,
    })
  }

  return actions.slice(0, 3)
})

// ── Activity feed ─────────────────────────────────────────────────────────────
interface ActivityEvent {
  id: string
  text: string
  time: Date
  type: 'scan' | 'parse' | 'message' | 'match'
}

const activityFeed = ref<ActivityEvent[]>([])

function pushActivity(text: string, type: ActivityEvent['type']) {
  activityFeed.value.unshift({ id: Date.now().toString(), text, time: new Date(), type })
  if (activityFeed.value.length > 12) activityFeed.value.pop()
}

watch(scoringActive, (active) => {
  if (active) pushActivity('AI scoring job matches against your profile', 'scan')
  else if (activityFeed.value[0]?.type === 'scan') pushActivity('Job scoring complete', 'scan')
})

watch(resumeParseStatus, (status) => {
  if (status === 'parsing') pushActivity('Parsing your CV with AI', 'parse')
  else if (status === 'done') pushActivity('CV parsed — profile updated', 'parse')
})

watch(newMessageApplicationIds, (ids) => {
  if (ids.size > 0) pushActivity('New employer message received', 'message')
})

onMounted(() => {
  const activeScreenings = hrApps.value.filter((a) => a.status === 'screening').length
  if (activeScreenings > 0)
    pushActivity(`${activeScreenings} active AI screening in progress`, 'scan')
  const total = topJobsRes.data.value?.total ?? 0
  if (total > 0) pushActivity(`${total} jobs discovered and scored for you`, 'match')
  if (seekerApps.value.length > 0)
    pushActivity(`Tracking ${seekerApps.value.length} applications`, 'match')
  if (completeness.value < 100)
    pushActivity(`Profile ${completeness.value}% — AI matching limited until complete`, 'parse')
})

// ── Pipeline pulse ────────────────────────────────────────────────────────────
const pulse = computed(() => {
  const all = [...seekerApps.value, ...hrApps.value]
  return {
    active: all.filter((a) => !['rejected', 'failed', 'offer'].includes(a.status)).length,
    screening: hrApps.value.filter((a) => a.status === 'screening').length,
    offers: all.filter((a) => a.status === 'offer').length,
  }
})

// ── Score helpers ─────────────────────────────────────────────────────────────
function ringColor(score: number | null | undefined): string {
  if (score == null) return 'var(--ink-subtle)'
  if (score >= 70) return 'var(--positive)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--negative)'
}

function matchQuality(score: number | null | undefined): string {
  if (score == null) return ''
  if (score >= 70) return 'Strong match'
  if (score >= 40) return 'Good match'
  return 'Fair match'
}

function activityIcon(type: ActivityEvent['type']) {
  const map: Record<string, string> = {
    scan: 'i-heroicons-sparkles',
    parse: 'i-heroicons-document-text',
    message: 'i-heroicons-chat-bubble-left-right',
    match: 'i-heroicons-magnifying-glass',
  }
  return map[type] ?? 'i-heroicons-bolt'
}

function relTime(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Score trigger ─────────────────────────────────────────────────────────────
const scoringInProgress = ref(false)

async function triggerScoring() {
  scoringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/score', {})
    toast.add({
      title: 'AI scoring queued',
      description: 'Results will appear shortly',
      color: 'success',
    })
    pushActivity('AI scoring triggered manually', 'scan')
  } catch (e) {
    toast.add({ title: 'Error', description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    scoringInProgress.value = false
  }
}

const showCoachModal = ref(false)
</script>

<template>
  <div class="dashboard-root">
    <!-- ── Greeting bar ── -->
    <div class="greeting-bar">
      <div class="greeting-text">
        <p class="greeting-eyebrow">
          <span v-if="scoringActive" class="inline-flex items-center gap-1.5">
            <span class="scanning-dot" />AI scanning
          </span>
          <span v-else>{{ greeting }}</span>
        </p>
        <h1 class="greeting-name">{{ firstName || 'Welcome' }}</h1>
        <p class="greeting-context">{{ contextLine }}</p>
      </div>
      <div class="greeting-actions">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-banknotes"
          @click="showCoachModal = true"
        >
          Salary Coach
        </UButton>
      </div>
    </div>

    <!-- ── Pipeline strip — 3 stat cards ── -->
    <div class="stat-strip">
      <NuxtLink to="/candidate/tracker" class="stat-card stat-card--active">
        <span
          class="stat-num"
          :style="pulse.active > 0 ? 'color: var(--ink)' : 'color: var(--ink-subtle)'"
          >{{ pulse.active }}</span
        >
        <span class="stat-label">Active</span>
      </NuxtLink>
      <NuxtLink to="/candidate/inbox" class="stat-card stat-card--screening">
        <span
          class="stat-num"
          :style="pulse.screening > 0 ? 'color: var(--warning)' : 'color: var(--ink-subtle)'"
          >{{ pulse.screening }}</span
        >
        <span class="stat-label" :style="pulse.screening > 0 ? 'color: var(--warning)' : ''">
          Screening
          <span v-if="pulse.screening > 0" class="scanning-dot ml-1" />
        </span>
      </NuxtLink>
      <NuxtLink to="/candidate/inbox" class="stat-card stat-card--offers">
        <span
          class="stat-num"
          :style="pulse.offers > 0 ? 'color: var(--positive)' : 'color: var(--ink-subtle)'"
          >{{ pulse.offers }}</span
        >
        <span class="stat-label" :style="pulse.offers > 0 ? 'color: var(--positive)' : ''"
          >Offers</span
        >
      </NuxtLink>
    </div>

    <!-- ── Focus cards — up to 3 priority actions ── -->
    <NuxtLink
      v-for="action in priorityActions"
      :key="action.id"
      :to="action.to"
      class="focus-card"
      :class="action.urgent ? 'focus-card--urgent' : 'focus-card--soft'"
    >
      <div class="focus-card-icon-wrap">
        <UIcon :name="action.icon" class="w-8 h-8" />
      </div>
      <div class="focus-card-body">
        <p class="focus-card-label">{{ action.label }}</p>
        <p class="focus-card-detail">{{ action.detail }}</p>
      </div>
      <span class="focus-card-arrow">→</span>
    </NuxtLink>

    <!-- ── Top AI matches — horizontal scroll briefing cards ── -->
    <div class="matches-section">
      <div class="matches-header">
        <p class="section-label">Top AI matches</p>
        <div class="flex items-center gap-1.5">
          <UButton
            v-if="topJobs.length"
            variant="ghost"
            size="xs"
            icon="i-heroicons-sparkles"
            :loading="scoringInProgress"
            @click="triggerScoring"
          >
            Rescore
          </UButton>
          <UButton variant="ghost" size="xs" to="/candidate/jobs">All jobs →</UButton>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="topJobsRes.status.value === 'pending'">
        <div class="matches-scroll">
          <div v-for="n in 3" :key="n" class="job-briefing">
            <USkeleton class="w-14 h-14 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <USkeleton class="h-4 w-3/4 rounded" />
              <USkeleton class="h-3 w-1/2 rounded" />
              <USkeleton class="h-3 w-full rounded" />
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="!topJobs.length" class="matches-empty">
        <div class="matches-empty-icon">
          <UIcon name="i-heroicons-sparkles" class="w-6 h-6" style="color: var(--ink-subtle)" />
        </div>
        <p class="text-sm font-medium" style="color: var(--ink)">AI is scanning for matches</p>
        <p class="text-xs" style="color: var(--ink-muted)">Check back in a few minutes</p>
        <UButton to="/candidate/jobs" size="sm" variant="outline">Explore manually →</UButton>
      </div>

      <div v-else class="matches-scroll">
        <NuxtLink v-for="job in topJobs" :key="job.id" to="/candidate/jobs" class="job-briefing">
          <!-- Score ring -->
          <div class="job-briefing-ring shrink-0">
            <svg width="56" height="56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--line)" stroke-width="3.5" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                :stroke="ringColor(job.displayScore)"
                stroke-width="3.5"
                stroke-linecap="round"
                :stroke-dasharray="`${2 * Math.PI * 22}`"
                :stroke-dashoffset="`${2 * Math.PI * 22 * (1 - (job.displayScore ?? 0) / 100)}`"
                transform="rotate(-90 28 28)"
                style="transition: stroke-dashoffset 0.5s ease"
              />
              <text
                x="28"
                y="33"
                text-anchor="middle"
                font-size="11"
                font-weight="700"
                font-family="JetBrains Mono, monospace"
                :fill="ringColor(job.displayScore)"
              >
                {{ job.displayScore ?? '?' }}
              </text>
            </svg>
            <p class="job-briefing-quality" :style="{ color: ringColor(job.displayScore) }">
              {{ matchQuality(job.displayScore) }}
            </p>
          </div>
          <!-- Info -->
          <div class="job-briefing-info">
            <p class="job-briefing-title">{{ job.title }}</p>
            <p class="job-briefing-company">{{ job.company }}</p>
            <p v-if="job.matchExplanation" class="job-briefing-explanation">
              {{ job.matchExplanation }}
            </p>
            <div v-if="job.skillMatch != null || job.matchGaps?.length" class="job-briefing-chips">
              <span v-if="job.skillMatch != null" class="chip chip--green"
                >{{ job.skillMatch }}% skills</span
              >
              <span v-if="job.matchGaps?.length" class="chip chip--amber"
                >Missing {{ job.matchGaps.length }}</span
              >
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- ── Activity log — collapsed accordion ── -->
    <details class="activity-accordion" open>
      <summary class="activity-summary">
        <span class="section-label" style="margin: 0">Agent activity</span>
        <span
          v-if="scoringActive"
          class="inline-flex items-center gap-1.5 text-[10px] font-mono"
          style="color: var(--accent)"
        >
          <span class="scanning-dot" />live
        </span>
        <span class="activity-count">{{ activityFeed.length }} events</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="activity-chevron w-3.5 h-3.5 ml-auto"
          style="color: var(--ink-muted)"
        />
      </summary>

      <div class="activity-body">
        <div v-if="!activityFeed.length" class="activity-empty">
          <p class="text-xs" style="color: var(--ink-subtle)">No activity yet</p>
        </div>
        <TransitionGroup name="feed" tag="div">
          <div
            v-for="(event, i) in activityFeed.slice(0, 6)"
            :key="event.id"
            class="activity-row"
            :style="
              i < Math.min(5, activityFeed.length - 1)
                ? 'border-bottom: 1px solid var(--line-soft)'
                : ''
            "
          >
            <div class="activity-icon-wrap">
              <UIcon
                :name="activityIcon(event.type)"
                class="w-3 h-3"
                style="color: var(--accent)"
              />
            </div>
            <p class="activity-text">{{ event.text }}</p>
            <p class="activity-time">{{ relTime(event.time) }}</p>
          </div>
        </TransitionGroup>
      </div>
    </details>

    <SalaryCoachModal v-model:open="showCoachModal" />
  </div>
</template>

<style scoped>
.dashboard-root {
  max-width: 720px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Greeting ── */
.greeting-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.greeting-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-subtle);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.greeting-name {
  font-family: 'Fraunces', serif;
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--ink);
  font-weight: 400;
}
.greeting-context {
  font-size: 13px;
  color: var(--ink-muted);
  margin-top: 4px;
}
.greeting-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

/* ── Pipeline strip ── */
.stat-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition:
    border-color 0.15s,
    transform 0.15s;
}
.stat-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.stat-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}
.stat-label {
  font-size: 11px;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', monospace;
  display: flex;
  align-items: center;
}

/* ── Focus card ── */
.focus-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 14px;
  text-decoration: none;
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.focus-card:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.focus-card--urgent {
  background: var(--ink);
  color: var(--bg);
}
.focus-card--soft {
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-left: 4px solid var(--accent);
  color: var(--ink);
}
.focus-card-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.focus-card--urgent .focus-card-icon-wrap {
  background: rgba(255, 255, 255, 0.12);
  color: var(--bg);
}
.focus-card--soft .focus-card-icon-wrap {
  background: var(--accent-soft);
  color: var(--accent);
}
.focus-card-body {
  flex: 1;
  min-width: 0;
}
.focus-card-label {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}
.focus-card--urgent .focus-card-label {
  color: var(--bg);
}
.focus-card--soft .focus-card-label {
  color: var(--ink);
}
.focus-card-detail {
  font-size: 12px;
  margin-top: 3px;
}
.focus-card--urgent .focus-card-detail {
  color: rgba(255, 255, 255, 0.6);
}
.focus-card--soft .focus-card-detail {
  color: var(--ink-muted);
}
.focus-card-arrow {
  font-size: 18px;
  flex-shrink: 0;
  opacity: 0.5;
}

/* ── Matches ── */
.matches-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.matches-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-subtle);
  font-weight: 600;
}
.matches-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-snap-type: x mandatory;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.matches-scroll::-webkit-scrollbar {
  display: none;
}
.matches-empty {
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.matches-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
}
.job-briefing {
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  gap: 14px;
  flex-shrink: 0;
  width: 288px;
  scroll-snap-align: start;
  text-decoration: none;
  transition:
    border-color 0.15s,
    transform 0.15s;
}
.job-briefing:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.job-briefing-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.job-briefing-quality {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  white-space: nowrap;
}
.job-briefing-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.job-briefing-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.job-briefing-company {
  font-size: 11px;
  color: var(--ink-muted);
}
.job-briefing-explanation {
  font-size: 11px;
  color: var(--ink-subtle);
  line-height: 1.4;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.job-briefing-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.chip--green {
  background: color-mix(in srgb, var(--positive) 12%, transparent);
  color: var(--positive);
}
.chip--amber {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
}

/* ── Activity accordion ── */
.activity-accordion {
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  overflow: hidden;
}
.activity-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.activity-summary::-webkit-details-marker {
  display: none;
}
.activity-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  margin-left: auto;
  margin-right: 4px;
}
.activity-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
details[open] .activity-chevron {
  transform: rotate(180deg);
}
.activity-body {
  border-top: 1px solid var(--line-soft);
}
.activity-empty {
  padding: 20px;
  text-align: center;
}
.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
}
.activity-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.activity-text {
  flex: 1;
  font-size: 12px;
  color: var(--ink);
  line-height: 1.4;
}
.activity-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Animations ── */
.scanning-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
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
.feed-enter-active {
  transition: all 0.25s ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.feed-move {
  transition: transform 0.25s ease;
}
</style>
