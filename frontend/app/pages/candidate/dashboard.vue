<script setup lang="ts">
import type { DiscoveredJob, SeekerApplication, PaginatedResponse } from '~/types/api'
import { appStatusColor } from '~/utils/statusColors'
import { capitalizeStatus } from '~/utils/candidate'
import {
  scoringActive,
  resumeParseStatus,
  newMessageApplicationIds,
} from '~/composables/useCandidateEventStream'

definePageMeta({ layout: 'candidate' })
useHead({ title: 'Command' })

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
      .get<
        PaginatedResponse<DiscoveredJob>
      >('/api/v1/candidate-portal/discovered-jobs', { sortBy: 'score', page: 1, limit: 3 })
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

// ── Priority Queue — max 3 actions that need attention ──────────────────────
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

  // Unanswered screening
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

  // New messages
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

  // Profile incomplete
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

  // High match job unseen
  const topJob = topJobs.value[0]
  if (topJob && topJob.displayScore != null && topJob.displayScore >= 70 && actions.length < 3) {
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

// ── AI Activity Feed — live event log ────────────────────────────────────────
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

// Seed feed with data-derived events on mount
onMounted(() => {
  const hrsActivve = hrApps.value.filter((a) => a.status === 'screening').length
  if (hrsActivve > 0) pushActivity(`${hrsActivve} active AI screening in progress`, 'scan')
  const total = topJobsRes.data.value?.total ?? 0
  if (total > 0) pushActivity(`${total} jobs discovered and scored for you`, 'match')
  if (seekerApps.value.length > 0)
    pushActivity(`Tracking ${seekerApps.value.length} applications`, 'match')
  if (completeness.value < 100)
    pushActivity(`Profile ${completeness.value}% — AI matching limited until complete`, 'parse')
})

// ── Pipeline pulse — compact counts ─────────────────────────────────────────
const pulse = computed(() => {
  const all = [...seekerApps.value, ...hrApps.value]
  return {
    active: all.filter((a) => !['rejected', 'failed', 'offer'].includes(a.status)).length,
    screening: hrApps.value.filter((a) => a.status === 'screening').length,
    offers: all.filter((a) => a.status === 'offer').length,
  }
})

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

// ── Activity icon helper ──────────────────────────────────────────────────────
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

function scoreColor(score: number | null | undefined): 'neutral' | 'success' | 'warning' | 'error' {
  if (score == null) return 'neutral'
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

const showCoachModal = ref(false)
</script>

<template>
  <div class="space-y-6 max-w-6xl">
    <!-- Header -->
    <div
      class="flex items-center justify-between pb-4"
      style="border-bottom: 1px solid var(--line)"
    >
      <div>
        <p
          style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--ink-subtle);
            margin-bottom: 4px;
          "
        >
          <span
            v-if="scoringActive"
            class="inline-flex items-center gap-1.5 mr-2"
            style="color: var(--accent)"
          >
            <span class="scanning-dot" />AI scanning
          </span>
          <span v-else>Command</span>
        </p>
        <h1
          style="
            font-family: 'Fraunces', serif;
            font-size: 26px;
            line-height: 1.05;
            letter-spacing: -0.03em;
            color: var(--ink);
            font-weight: 400;
          "
        >
          {{ store.candidate?.fullName?.split(' ')[0] ?? 'Welcome' }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <!-- Pipeline pulse -->
        <div
          class="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <NuxtLink
            to="/candidate/inbox"
            class="flex items-center gap-1.5 hover:opacity-80"
            style="color: var(--ink-muted); text-decoration: none"
          >
            <span
              class="w-2 h-2 rounded-full"
              :style="pulse.active > 0 ? 'background: var(--accent)' : 'background: var(--line)'"
            />
            <span class="font-mono font-semibold" style="color: var(--ink)">{{
              pulse.active
            }}</span>
            active
          </NuxtLink>
          <span style="color: var(--line)">·</span>
          <span
            class="flex items-center gap-1"
            :style="pulse.screening > 0 ? 'color: var(--warning)' : 'color: var(--ink-subtle)'"
          >
            <span class="font-mono font-semibold">{{ pulse.screening }}</span> screening
          </span>
          <span style="color: var(--line)">·</span>
          <span
            class="flex items-center gap-1"
            :style="pulse.offers > 0 ? 'color: var(--positive)' : 'color: var(--ink-subtle)'"
          >
            <span class="font-mono font-semibold">{{ pulse.offers }}</span> offers
          </span>
        </div>
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-banknotes"
          @click="showCoachModal = true"
        >
          Salary Coach
        </UButton>
      </div>
    </div>

    <!-- Priority queue (max 3 items) -->
    <div v-if="priorityActions.length" class="space-y-2">
      <p
        class="text-[10px] font-mono font-semibold uppercase tracking-wider"
        style="color: var(--ink-subtle)"
      >
        Needs your attention
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <NuxtLink
          v-for="action in priorityActions"
          :key="action.id"
          :to="action.to"
          class="priority-card flex items-start gap-3 p-3 rounded-xl transition-all"
          style="text-decoration: none"
          :style="
            action.urgent
              ? 'background: var(--ink); color: var(--bg);'
              : 'background: var(--surface); color: var(--ink); border: 1px solid var(--line-soft);'
          "
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            :style="
              action.urgent
                ? 'background: rgba(255,255,255,0.15);'
                : 'background: var(--accent-soft);'
            "
          >
            <UIcon
              :name="action.icon"
              class="w-4 h-4"
              :style="action.urgent ? 'color: var(--bg)' : 'color: var(--accent)'"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="text-sm font-semibold truncate"
              :style="action.urgent ? 'color: var(--bg)' : 'color: var(--ink)'"
            >
              {{ action.label }}
            </p>
            <p
              class="text-xs mt-0.5 truncate leading-snug"
              :style="action.urgent ? 'color: rgba(255,255,255,0.6)' : 'color: var(--ink-muted)'"
            >
              {{ action.detail }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-4 h-4 shrink-0 mt-1 opacity-50"
            :style="action.urgent ? 'color: var(--bg)' : ''"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Main grid: Top match + AI feed -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Top job matches (3/5) -->
      <div class="lg:col-span-3 space-y-3">
        <div class="flex items-center justify-between">
          <p
            class="text-[10px] font-mono font-semibold uppercase tracking-wider"
            style="color: var(--ink-subtle)"
          >
            Top AI matches
          </p>
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
          <div
            v-for="n in 3"
            :key="n"
            class="rounded-xl p-4 space-y-2"
            style="background: var(--surface); border: 1px solid var(--line-soft)"
          >
            <div class="flex items-start gap-3">
              <USkeleton class="w-7 h-7 rounded-full shrink-0" />
              <div class="flex-1 space-y-2">
                <USkeleton class="h-4 w-3/4 rounded" />
                <USkeleton class="h-3 w-1/2 rounded" />
                <USkeleton class="h-3 w-full rounded" />
              </div>
            </div>
            <USkeleton class="h-1 w-full rounded-full mt-2" />
          </div>
        </template>

        <div
          v-else-if="!topJobs.length"
          class="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center"
            style="background: var(--bg-elevated)"
          >
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6" style="color: var(--ink-subtle)" />
          </div>
          <div>
            <p class="text-sm font-medium" style="color: var(--ink)">AI is scanning for matches</p>
            <p class="text-xs mt-1" style="color: var(--ink-muted)">Check back in a few minutes</p>
          </div>
          <UButton to="/candidate/jobs" size="sm" variant="outline">Explore manually →</UButton>
        </div>

        <div
          v-for="(job, i) in topJobs"
          :key="job.id"
          class="job-match-card rounded-xl p-4 transition-all cursor-pointer"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="flex items-start gap-3">
            <!-- Rank badge -->
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono"
              :style="
                i === 0
                  ? 'background: var(--ink); color: var(--bg);'
                  : 'background: var(--bg-elevated); color: var(--ink-subtle); border: 1px solid var(--line);'
              "
            >
              {{ i + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <a
                  :href="job.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-semibold hover:underline truncate"
                  style="color: var(--ink)"
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
              <p class="text-xs mt-0.5" style="color: var(--ink-muted)">
                {{ job.company }}<span v-if="job.location"> · {{ job.location }}</span>
              </p>
              <p
                v-if="job.matchExplanation"
                class="text-xs mt-1.5 leading-relaxed"
                style="color: var(--ink-subtle)"
              >
                {{ job.matchExplanation }}
              </p>
            </div>
          </div>

          <!-- Score bar -->
          <div
            v-if="job.displayScore != null"
            class="mt-3 h-1 rounded-full overflow-hidden"
            style="background: var(--bg-elevated)"
          >
            <div
              class="h-full rounded-full transition-all"
              :style="{
                width: job.displayScore + '%',
                background:
                  job.displayScore >= 70
                    ? 'var(--positive)'
                    : job.displayScore >= 40
                      ? 'var(--warning)'
                      : 'var(--negative)',
              }"
            />
          </div>
          <!-- skillMatch + gap chips -->
          <div v-if="job.skillMatch != null || job.matchGaps?.length" class="mt-2 flex gap-1.5">
            <span
              v-if="job.skillMatch != null"
              class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
              style="
                background: color-mix(in srgb, var(--positive) 12%, transparent);
                color: var(--positive);
              "
              >{{ job.skillMatch }}% skills</span
            >
            <span
              v-if="job.matchGaps?.length"
              class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
              style="
                background: color-mix(in srgb, var(--warning) 12%, transparent);
                color: var(--warning);
              "
              >Missing {{ job.matchGaps.length }}</span
            >
          </div>
        </div>
      </div>

      <!-- AI Activity Feed (2/5) -->
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center justify-between">
          <p
            class="text-[10px] font-mono font-semibold uppercase tracking-wider"
            style="color: var(--ink-subtle)"
          >
            Agent activity
          </p>
          <span
            v-if="scoringActive"
            class="inline-flex items-center gap-1 text-[10px] font-mono"
            style="color: var(--accent)"
          >
            <span class="scanning-dot" />live
          </span>
        </div>

        <div
          class="rounded-xl overflow-hidden"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div
            v-if="!activityFeed.length"
            class="flex flex-col items-center justify-center gap-2 py-10"
          >
            <UIcon name="i-heroicons-bolt" class="w-7 h-7 opacity-20" style="color: var(--ink)" />
            <p class="text-xs" style="color: var(--ink-subtle)">No activity yet</p>
          </div>

          <TransitionGroup name="feed" tag="div">
            <div
              v-for="(event, i) in activityFeed"
              :key="event.id"
              class="flex items-start gap-3 px-4 py-3"
              :style="
                i < activityFeed.length - 1 ? 'border-bottom: 1px solid var(--line-soft)' : ''
              "
            >
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style="background: var(--bg-elevated)"
              >
                <UIcon
                  :name="activityIcon(event.type)"
                  class="w-3 h-3"
                  style="color: var(--accent)"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs leading-snug" style="color: var(--ink)">{{ event.text }}</p>
                <p class="text-[10px] mt-0.5 font-mono" style="color: var(--ink-subtle)">
                  {{ relTime(event.time) }}
                </p>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Quick profile completeness (ambient, not banner) -->
        <div
          v-if="completeness < 100"
          class="rounded-xl px-4 py-3 flex items-center gap-3"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="relative w-10 h-10 shrink-0">
            <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" stroke-width="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--accent)"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="`${(completeness / 100) * 94.2} 94.2`"
              />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold"
              style="color: var(--accent)"
              >{{ completeness }}%</span
            >
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium" style="color: var(--ink)">Profile strength</p>
            <p class="text-[11px] mt-0.5 leading-snug truncate" style="color: var(--ink-muted)">
              {{
                completeness < 50
                  ? 'Low visibility to employers'
                  : completeness < 80
                    ? 'Partial match coverage'
                    : 'Almost fully optimized'
              }}
            </p>
          </div>
          <UButton to="/candidate/profile" variant="ghost" size="xs">Edit →</UButton>
        </div>
      </div>
    </div>

    <!-- Active screenings (if any) -->
    <div v-if="hrApps.some((a) => ['screening', 'responded'].includes(a.status))">
      <p
        class="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2"
        style="color: var(--ink-subtle)"
      >
        Active conversations
      </p>
      <div class="flex flex-col gap-2">
        <NuxtLink
          v-for="app in hrApps.filter((a) =>
            ['screening', 'responded', 'outreach_sent'].includes(a.status),
          )"
          :key="app.id"
          :to="`/candidate/inbox?app=${app.id}`"
          class="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
          style="background: var(--ink); color: var(--bg); text-decoration: none"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center animate-pulse shrink-0"
            style="background: var(--accent)"
          >
            <UIcon
              name="i-heroicons-chat-bubble-left-right"
              class="w-4 h-4"
              style="color: var(--bg)"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium" style="color: var(--bg)">{{ app.job.title }}</p>
            <p class="text-xs opacity-60">{{ app.job.company.name }}</p>
          </div>
          <UBadge :color="appStatusColor(app.status)" variant="subtle" size="xs">
            {{ capitalizeStatus(app.status) }}
          </UBadge>
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-4 h-4 opacity-50"
            style="color: var(--bg)"
          />
        </NuxtLink>
      </div>
    </div>

    <SalaryCoachModal v-model:open="showCoachModal" />
  </div>
</template>

<style scoped>
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
.priority-card:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.job-match-card:hover {
  border-color: var(--accent) !important;
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
