<script setup lang="ts">
import type { SeekerApplication } from '~/types/api'
import { safeUrl } from '~/utils/safeUrl'
import { capitalizeStatus } from '~/utils/candidate'
import { formatRelativeTime } from '~/utils/formatters'

interface InterviewPrepData {
  questions: { category: string; question: string; tip: string }[]
  companyResearch: string
  salaryNegotiationTip: string
}

definePageMeta({ layout: 'candidate' })

const { t } = useI18n()
const api = useCandidateApi()
const toast = useToast()

useHead({ title: t('candidate.tracker.title') })

const activeTab = ref<'all' | 'platform' | 'external'>('all')

// ── Unified tracker ─────────────────────────────────────────────────────────

interface TrackerItem {
  id: string
  type: 'seeker' | 'inbound'
  jobTitle: string
  company: string
  location: string | null
  workMode: string | null
  status: string
  source: string
  matchScore: number | null
  applyUrl: string | null
  seekerApplicationId: string | null
  discoveredJobId: string | null
  sourceUrl: string | null
  applicationId: string | null
  outreachSentAt: string | null
  respondedAt: string | null
  interviewScheduledAt: string | null
  rejectionReason: string | null
  activityAt: string
  createdAt: string
}

const {
  data: trackerData,
  pending: trackerPending,
  refresh: trackerRefresh,
} = await useAsyncData(
  'tracker-summary',
  () =>
    api
      .get<{ items: TrackerItem[]; total: number }>('/api/v1/candidate-portal/tracker/summary')
      .catch(() => ({ items: [] as TrackerItem[], total: 0 })),
  { lazy: true },
)

const trackerItems = computed(() => trackerData.value?.items ?? [])

function inboundStatusColor(status: string): 'warning' | 'primary' | 'info' | 'success' | 'error' {
  const map: Record<string, 'warning' | 'primary' | 'info' | 'success' | 'error'> = {
    matched: 'warning',
    outreach_sent: 'primary',
    responded: 'info',
    interview_scheduled: 'success',
    hired: 'success',
    rejected: 'error',
    withdrawn: 'error',
  }
  return map[status] ?? 'primary'
}

// ── Self-report actions ────────────────────────────────────────────────────

const selfReportingId = ref<string | null>(null)

async function selfReport(
  appId: string,
  newStatus: 'self_reported_applied' | 'self_reported_reply',
) {
  if (selfReportingId.value) return
  selfReportingId.value = appId
  try {
    await api.patch(`/api/v1/candidate-portal/seeker-applications/${appId}/status`, {
      status: newStatus,
    })
    await refresh()
    toast.add({
      title: newStatus === 'self_reported_applied' ? '✅ Отклик записан!' : '💬 Ответ записан!',
      color: 'success',
    })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    selfReportingId.value = null
  }
}

const copiedId = ref<string | null>(null)

function copyToClipboard(text: string, appId: string) {
  navigator.clipboard.writeText(text).then(() => {
    copiedId.value = appId
    setTimeout(() => {
      if (copiedId.value === appId) copiedId.value = null
    }, 2000)
  })
}

const {
  data: applications,
  pending,
  refresh,
} = await useAsyncData(
  'seeker-applications',
  () =>
    api
      .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
      .catch(() => [] as SeekerApplication[]),
  { lazy: true },
)

const viewMode = ref<'list' | 'kanban'>('kanban')
const expandedId = ref<string | null>(null)
const updatingId = ref<string | null>(null)

interface Column {
  status: string
  label: string
  color: 'warning' | 'primary' | 'info' | 'success' | 'error'
}

const COLUMNS = computed<Column[]>(() => [
  { status: 'queued', label: t('candidate.tracker.queued'), color: 'warning' },
  { status: 'applied', label: t('candidate.tracker.applied'), color: 'primary' },
  { status: 'viewed', label: t('candidate.tracker.viewed'), color: 'info' },
  { status: 'interview', label: t('candidate.tracker.interview'), color: 'success' },
  { status: 'offer', label: t('candidate.tracker.offer'), color: 'success' },
  { status: 'rejected', label: t('candidate.tracker.rejected'), color: 'error' },
])

const statusOptions = computed(() =>
  COLUMNS.value.map((c) => ({ label: c.label, value: c.status })),
)

const statusColor = seekerAppStatusColor

function getCoachingTip(status: string) {
  const map: Record<string, string> = {
    queued:
      'Our Matchmaker agent is aligning your skills with company requirements. Ensure your profile has core keywords!',
    applied:
      'Application successfully received. Recruiter agent has been notified and is scanning your CV.',
    viewed:
      'Great news! Recruiter has read your CV and dossier. Prepare for automated outreach email delivery.',
    interview:
      'Screening interview is active! Practice your verbal Nuxt/SPA architectures inside our Interview Prep Cockpit first.',
    offer:
      'Congratulations! An offer is placed. Evaluate compensation and leverage talking points inside the Salary Negotiator!',
    rejected:
      'This role was not a fit, but our AI agent has logged your skills and is searching for alternative roles as we speak.',
  }
  return map[status] ?? 'Keep pushing! Perfect fits are discovered daily.'
}

function columnApps(status: string) {
  return (applications.value ?? []).filter((a) =>
    status === 'rejected' ? a.status === 'rejected' || a.status === 'failed' : a.status === status,
  )
}

function colDotColor(color: string): string {
  const map: Record<string, string> = {
    warning: 'var(--warning)',
    primary: 'var(--accent)',
    info: 'var(--info)',
    success: 'var(--positive)',
    error: 'var(--negative)',
  }
  return map[color] ?? 'var(--ink-subtle)'
}

async function updateStatus(app: SeekerApplication, newStatus: string) {
  if (updatingId.value) return
  updatingId.value = app.id
  try {
    await api.patch(`/api/v1/candidate-portal/seeker-applications/${app.id}/status`, {
      status: newStatus,
    })
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    updatingId.value = null
  }
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item)
      ;(acc[k] ??= []).push(item)
      return acc
    },
    {} as Record<string, T[]>,
  )
}

// ── Interview Prep ────────────────────────────────────────────────────────────

const prepPanelId = ref<string | null>(null)
const prepLoading = ref(false)
const prepCache = ref<Record<string, InterviewPrepData>>({})
const prepExpandedQuestion = ref<number | null>(null)

async function openPrep(app: SeekerApplication) {
  if (prepPanelId.value === app.id) {
    prepPanelId.value = null
    return
  }
  prepPanelId.value = app.id
  prepExpandedQuestion.value = null

  if (prepCache.value[app.id]) return

  prepLoading.value = true
  try {
    const data = await api.post<InterviewPrepData>('/api/v1/candidate-portal/interview-prep', {
      seekerApplicationId: app.id,
    })
    prepCache.value = { ...prepCache.value, [app.id]: data }
  } catch (e) {
    toast.add({
      title: 'Could not generate prep',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
    prepPanelId.value = null
  } finally {
    prepLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-center justify-between">
        <div>
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
            {{ t('candidate.tracker.eyebrow') }}
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
            {{ t('candidate.tracker.title') }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <!-- View toggle -->
          <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--line)">
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :style="
                viewMode === 'kanban'
                  ? 'background: var(--ink); color: var(--bg);'
                  : 'background: var(--surface); color: var(--ink-muted);'
              "
              @click="viewMode = 'kanban'"
            >
              {{ t('candidate.tracker.board') }}
            </button>
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :style="
                viewMode === 'list'
                  ? 'background: var(--ink); color: var(--bg);'
                  : 'background: var(--surface); color: var(--ink-muted);'
              "
              @click="viewMode = 'list'"
            >
              {{ t('candidate.tracker.list') }}
            </button>
          </div>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-path"
            :loading="pending"
            @click="() => refresh()"
          />
        </div>
      </div>
    </div>

    <!-- Tab toggle: All / Platform / External -->
    <div
      class="flex rounded-lg overflow-hidden"
      style="border: 1px solid var(--line); width: fit-content"
    >
      <button
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeTab === 'all'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeTab = 'all'"
      >
        All
        <span v-if="trackerItems.length" class="ml-1.5 text-xs opacity-70">{{
          trackerItems.length
        }}</span>
      </button>
      <button
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeTab === 'platform'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeTab = 'platform'"
      >
        {{ t('candidate.tracker.title') }}
      </button>
      <button
        class="px-4 py-1.5 text-sm transition-colors"
        :style="
          activeTab === 'external'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeTab = 'external'"
      >
        External
      </button>
    </div>

    <!-- All Applications tab (unified view) -->
    <div v-if="activeTab === 'all'" class="space-y-2">
      <div v-if="trackerPending" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>
      <div
        v-else-if="!trackerItems.length"
        class="flex flex-col items-center gap-3 py-16"
        style="color: var(--ink-subtle)"
      >
        <UIcon name="i-heroicons-clipboard-document-list" class="w-10 h-10" />
        <p class="text-sm">No applications yet. Start applying or wait for inbound matches.</p>
      </div>
      <template v-else>
        <div v-for="item in trackerItems" :key="item.id" class="tracker-unified-row">
          <!-- Type badge -->
          <span :class="item.type === 'inbound' ? 'type-badge inbound' : 'type-badge seeker'">
            {{ item.type === 'inbound' ? 'Inbound' : 'Self-applied' }}
          </span>

          <!-- Job info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" style="color: var(--ink)">
              {{ item.jobTitle }}
            </p>
            <p class="text-xs truncate" style="color: var(--ink-muted)">
              {{ item.company }}
              <span v-if="item.location" class="hidden sm:inline"> · {{ item.location }}</span>
              <span v-if="item.workMode" class="hidden sm:inline"> · {{ item.workMode }}</span>
            </p>
          </div>

          <!-- Source (hidden on mobile) -->
          <span class="text-xs shrink-0 hidden sm:inline" style="color: var(--ink-subtle)">{{
            item.source
          }}</span>

          <!-- Match score (inbound only, hidden on mobile) -->
          <span
            v-if="item.type === 'inbound' && item.matchScore != null"
            class="text-xs font-mono shrink-0 hidden sm:inline"
            style="color: var(--positive)"
            >{{ Math.round(Number(item.matchScore)) }}%</span
          >

          <!-- Status badge -->
          <UBadge
            :color="
              item.type === 'inbound' ? inboundStatusColor(item.status) : statusColor(item.status)
            "
            variant="soft"
            size="xs"
            class="shrink-0"
          >
            {{ capitalizeStatus(item.status) }}
          </UBadge>

          <!-- Time -->
          <span class="text-xs shrink-0" style="color: var(--ink-subtle)">
            {{ formatRelativeTime(item.activityAt) }}
          </span>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Seeker: open source URL -->
            <a
              v-if="item.type === 'seeker' && item.sourceUrl"
              :href="safeUrl(item.sourceUrl)"
              target="_blank"
              rel="noopener noreferrer"
              class="tracker-action-link"
              >Open</a
            >
            <!-- CV Kit link for both seeker and inbound -->
            <NuxtLink
              :to="`/candidate/cv-builder?jobTitle=${encodeURIComponent(item.jobTitle)}&company=${encodeURIComponent(item.company)}`"
              class="tracker-action-link"
              >CV Kit</NuxtLink
            >
          </div>
        </div>
        <div class="pt-1">
          <UButton
            size="xs"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            :loading="trackerPending"
            @click="() => trackerRefresh()"
            >Refresh</UButton
          >
        </div>
      </template>
    </div>

    <!-- External Applications tab (HH.uz + Telegram channel jobs) -->
    <div v-if="activeTab === 'external'" class="space-y-3">
      <p class="text-xs" style="color: var(--ink-subtle)">
        These jobs require you to apply directly. Your AI kit is ready — open the link, paste the
        cover letter, then confirm below.
      </p>

      <div v-if="pending" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>

      <template v-else>
        <div
          v-for="app in (applications ?? []).filter(
            (a) => a.source === 'hh.ru' || a.source === 'telegram_channel',
          )"
          :key="app.id"
          class="rounded-lg overflow-hidden"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="p-4 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-medium" style="color: var(--ink); font-size: 15px">
                {{ app.discoveredJob?.title ?? '—' }}
              </p>
              <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
                {{ app.discoveredJob?.company }}
              </p>
              <p class="text-xs mt-1" style="color: var(--ink-subtle)">
                {{ formatRelativeTime(app.createdAt) }} ·
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    text-transform: uppercase;
                  "
                  >{{ app.source }}</span
                >
              </p>
            </div>
            <UBadge
              :color="
                app.status === 'self_reported_reply'
                  ? 'success'
                  : app.status === 'self_reported_applied'
                    ? 'primary'
                    : app.status === 'assisted_ready'
                      ? 'warning'
                      : 'neutral'
              "
              variant="subtle"
              size="sm"
            >
              {{
                app.status === 'assisted_ready'
                  ? 'Kit Ready'
                  : app.status === 'assisted_required'
                    ? 'Building kit…'
                    : app.status === 'self_reported_applied'
                      ? '✅ Applied'
                      : app.status === 'self_reported_reply'
                        ? '💬 Got Reply'
                        : capitalizeStatus(app.status)
              }}
            </UBadge>
          </div>

          <!-- Kit panel for assisted_ready -->
          <div
            v-if="app.status === 'assisted_ready' && app.applyKit"
            class="px-4 pb-4 pt-3 space-y-3"
            style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <p
              class="text-xs font-medium"
              style="color: var(--ink-subtle); text-transform: uppercase; letter-spacing: 0.08em"
            >
              How to apply
            </p>
            <p class="text-xs whitespace-pre-line" style="color: var(--ink-muted)">
              {{ app.applyKit.instructions }}
            </p>

            <p
              class="text-xs font-medium mt-2"
              style="color: var(--ink-subtle); text-transform: uppercase; letter-spacing: 0.08em"
            >
              Cover letter
            </p>
            <div
              class="rounded-md p-3 text-xs whitespace-pre-line"
              style="
                background: var(--surface);
                border: 1px solid var(--line-soft);
                color: var(--ink-muted);
                line-height: 1.6;
              "
            >
              {{ app.applyKit.coverLetter }}
            </div>

            <div class="flex flex-wrap gap-2 pt-1">
              <UButton
                size="sm"
                :icon="copiedId === app.id ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                variant="outline"
                @click="copyToClipboard(app.applyKit!.coverLetter, app.id)"
              >
                {{ copiedId === app.id ? 'Copied!' : 'Copy cover letter' }}
              </UButton>
              <a
                :href="safeUrl(app.applyUrl ?? app.discoveredJob?.sourceUrl ?? '')"
                target="_blank"
                rel="noopener noreferrer"
                style="text-decoration: none"
              >
                <UButton size="sm" icon="i-heroicons-arrow-top-right-on-square">
                  Open on {{ app.source === 'hh.ru' ? 'HH.uz' : 'Source' }}
                </UButton>
              </a>
              <UButton
                size="sm"
                variant="ghost"
                icon="i-heroicons-check-circle"
                :loading="selfReportingId === app.id"
                @click="selfReport(app.id, 'self_reported_applied')"
              >
                ✅ I applied
              </UButton>
              <UButton
                size="sm"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left"
                :loading="selfReportingId === app.id"
                @click="selfReport(app.id, 'self_reported_reply')"
              >
                💬 Got a reply
              </UButton>
            </div>
          </div>

          <!-- Self-reported confirmation banner -->
          <div
            v-else-if="
              app.status === 'self_reported_applied' || app.status === 'self_reported_reply'
            "
            class="px-4 pb-3 pt-2"
            style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <p class="text-xs" style="color: var(--ink-muted)">
              {{
                app.status === 'self_reported_reply'
                  ? '💬 You reported receiving a reply. Good luck with the next step!'
                  : "✅ You confirmed applying. We're tracking this externally."
              }}
            </p>
            <p v-if="app.appliedAt" class="text-xs mt-1" style="color: var(--ink-subtle)">
              {{ formatRelativeTime(app.appliedAt) }}
            </p>
            <div v-if="app.status === 'self_reported_applied'" class="mt-2">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left"
                :loading="selfReportingId === app.id"
                @click="selfReport(app.id, 'self_reported_reply')"
              >
                Got a reply? Mark it
              </UButton>
            </div>
          </div>
        </div>

        <div
          v-if="
            !(applications ?? []).filter(
              (a) => a.source === 'hh.ru' || a.source === 'telegram_channel',
            ).length
          "
          class="flex flex-col items-center py-16 gap-3"
        >
          <UIcon
            name="i-heroicons-document-magnifying-glass"
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
            No external applications yet
          </p>
          <p class="text-sm text-center max-w-sm" style="color: var(--ink-muted)">
            When you match with HH.uz or Telegram channel jobs, your AI kit will appear here.
          </p>
        </div>
      </template>
    </div>

    <!-- Platform tracker (wrap existing content) -->
    <div v-show="activeTab === 'platform'">
      <!-- Cross-link to offers page -->
      <NuxtLink
        to="/candidate/offers"
        class="inline-flex items-center gap-2 text-xs rounded-lg px-3 py-2"
        style="
          background: var(--bg-elevated);
          border: 1px solid var(--line);
          color: var(--ink-muted);
          text-decoration: none;
        "
      >
        <UIcon name="i-heroicons-briefcase" class="w-3.5 h-3.5 shrink-0" />
        Looking for employer offers sent to you?
        <span style="color: var(--accent)">View Applications →</span>
      </NuxtLink>

      <!-- Loading skeleton -->
      <div v-if="pending" class="flex gap-3 overflow-hidden pt-1">
        <div v-for="n in 4" :key="n" class="w-64 shrink-0 flex flex-col gap-2">
          <USkeleton class="h-5 w-24 rounded" />
          <USkeleton class="h-24 w-full rounded-xl" />
          <USkeleton class="h-24 w-full rounded-xl opacity-60" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!applications?.length" class="flex flex-col items-center py-16 gap-4">
        <!-- Pulsing AI watcher indicator -->
        <div class="tracker-watch-ring">
          <span class="tracker-watch-dot" />
        </div>
        <p
          style="
            font-family: 'Fraunces', serif;
            font-size: 20px;
            color: var(--ink);
            font-weight: 400;
          "
        >
          {{ t('candidate.tracker.empty') }}
        </p>
        <p class="text-sm text-center max-w-sm" style="color: var(--ink-muted)">
          {{ t('candidate.tracker.emptyDesc') }}
        </p>
        <UButton
          to="/candidate/jobs"
          size="sm"
          variant="outline"
          icon="i-heroicons-magnifying-glass"
          >{{ t('candidate.dashboard.browseJobs') }}</UButton
        >
      </div>

      <!-- Kanban board -->
      <div v-else-if="viewMode === 'kanban'" class="overflow-x-auto pb-4 snap-x snap-mandatory">
        <div class="flex gap-3 min-w-max">
          <div
            v-for="col in COLUMNS"
            :key="col.status"
            class="w-64 shrink-0 flex flex-col gap-2 snap-start"
          >
            <!-- Column header -->
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full" :style="{ background: colDotColor(col.color) }" />
                <span
                  class="text-xs font-medium"
                  style="color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.08em"
                >
                  {{ col.label }}
                </span>
              </div>
              <span class="text-xs font-mono" style="color: var(--ink-subtle)">{{
                columnApps(col.status).length
              }}</span>
            </div>

            <!-- Cards -->
            <div
              class="rounded-lg min-h-20 p-1.5 space-y-1.5"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <!-- Empty column indicator -->
              <div
                v-if="!columnApps(col.status).length"
                class="flex flex-col items-center justify-center gap-1.5 py-4"
              >
                <span class="col-watch-dot" />
                <span
                  class="text-[10px] font-mono"
                  style="color: var(--ink-subtle); letter-spacing: 0.06em"
                  >watching</span
                >
              </div>
              <div
                v-for="app in columnApps(col.status)"
                :key="app.id"
                role="button"
                tabindex="0"
                class="rounded-md p-2.5 cursor-pointer transition-opacity"
                :style="{
                  background: 'var(--surface)',
                  border: '1px solid var(--line-soft)',
                  opacity: updatingId === app.id ? 0.5 : 1,
                }"
                @click="expandedId = expandedId === app.id ? null : app.id"
                @keydown.enter.prevent="expandedId = expandedId === app.id ? null : app.id"
                @keydown.space.prevent="expandedId = expandedId === app.id ? null : app.id"
              >
                <p class="text-sm font-medium leading-snug" style="color: var(--ink)">
                  {{ app.discoveredJob?.title ?? '—' }}
                </p>
                <p class="text-xs mt-0.5 truncate" style="color: var(--ink-muted)">
                  {{ app.discoveredJob?.company }}
                </p>
                <div class="flex items-center justify-between mt-2 gap-1">
                  <span
                    class="text-xs font-mono px-1.5 py-0.5 rounded"
                    style="
                      background: var(--bg-elevated);
                      color: var(--ink-subtle);
                      text-transform: uppercase;
                      font-size: 9px;
                      letter-spacing: 0.06em;
                    "
                  >
                    {{ app.source }}
                  </span>
                  <span v-if="app.coverLetter" class="text-xs" style="color: var(--accent)"
                    >✦ CL</span
                  >
                </div>

                <!-- Expanded: move controls -->
                <div
                  v-if="expandedId === app.id"
                  class="mt-2 pt-2"
                  style="border-top: 1px solid var(--line-soft)"
                  @click.stop
                >
                  <!-- Journey Milestone Timeline -->
                  <div class="mb-3 p-3 bg-bg-deep border border-line-soft rounded-lg space-y-2">
                    <span
                      class="text-[9px] font-mono font-bold text-accent uppercase tracking-wider block"
                      >AI Recruiter Advice</span
                    >
                    <p class="text-[11px] leading-relaxed text-ink-muted">
                      {{ getCoachingTip(app.status) }}
                    </p>

                    <!-- Compact Stepper visualizer -->
                    <div class="flex items-center gap-1 pt-1 border-t border-line-soft/40">
                      <div
                        v-for="s in ['queued', 'applied', 'viewed', 'interview', 'offer']"
                        :key="s"
                        class="flex-1 h-1 rounded-full transition-all"
                        :style="
                          app.status === s ||
                          (s === 'queued' && app.status !== 'queued') ||
                          (s === 'applied' &&
                            ['viewed', 'interview', 'offer'].includes(app.status)) ||
                          (s === 'viewed' && ['interview', 'offer'].includes(app.status)) ||
                          (s === 'interview' && app.status === 'offer')
                            ? 'background: var(--accent)'
                            : 'background: var(--line)'
                        "
                      />
                    </div>
                  </div>

                  <p class="text-xs mb-1.5" style="color: var(--ink-subtle)">
                    {{ t('candidate.tracker.moveTo') }}:
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-for="c in COLUMNS.filter((c) => c.status !== col.status)"
                      :key="c.status"
                      class="text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                      :style="`background: var(--bg-elevated); color: var(--ink-muted); border: 1px solid var(--line);`"
                      @click="(updateStatus(app, c.status), (expandedId = null))"
                    >
                      {{ c.label }}
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <a
                      v-if="app.discoveredJob?.sourceUrl"
                      :href="safeUrl(app.discoveredJob.sourceUrl)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-1 text-xs hover:underline"
                      style="color: var(--accent)"
                    >
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                      View job
                    </a>
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs hover:underline"
                      :style="
                        prepPanelId === app.id ? 'color: var(--accent)' : 'color: var(--ink-muted)'
                      "
                      @click="openPrep(app)"
                    >
                      <UIcon name="i-heroicons-academic-cap" class="w-3 h-3" />
                      {{ prepPanelId === app.id ? 'Hide prep' : 'Interview prep' }}
                    </button>
                  </div>
                  <p
                    v-if="app.coverLetter"
                    class="mt-2 text-xs leading-relaxed line-clamp-3"
                    style="color: var(--ink-subtle)"
                  >
                    {{ app.coverLetter }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List view -->
      <div v-else-if="viewMode === 'list'" class="space-y-3">
        <div
          v-for="app in applications"
          :key="app.id"
          class="rounded-lg overflow-hidden"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="p-4 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <a
                v-if="app.discoveredJob?.sourceUrl"
                :href="safeUrl(app.discoveredJob.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium hover:underline"
                style="color: var(--ink); font-size: 15px"
              >
                {{ app.discoveredJob?.title ?? '—' }}
              </a>
              <span v-else class="font-medium" style="color: var(--ink); font-size: 15px">
                {{ app.discoveredJob?.title ?? '—' }}
              </span>
              <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
                {{ app.discoveredJob?.company }}
                <span v-if="app.discoveredJob?.location"> · {{ app.discoveredJob.location }}</span>
              </p>
              <div class="flex items-center gap-2 mt-1 text-xs" style="color: var(--ink-subtle)">
                <span v-if="app.discoveredJob?.workMode">{{ app.discoveredJob.workMode }}</span>
                <span v-if="app.appliedAt"
                  >{{ t('candidate.tracker.appliedAt') }}
                  {{ formatRelativeTime(app.appliedAt) }}</span
                >
                <span v-else
                  >{{ t('candidate.tracker.queuedAt') }}
                  {{ formatRelativeTime(app.createdAt) }}</span
                >
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    text-transform: uppercase;
                  "
                  >{{ app.source }}</span
                >
              </div>
              <p v-if="app.error" class="text-xs mt-1" style="color: var(--negative)">
                {{ app.error }}
              </p>
            </div>

            <div class="flex flex-col items-end gap-2 shrink-0">
              <UBadge :color="statusColor(app.status)" variant="subtle" size="sm">
                {{ capitalizeStatus(app.status) }}
              </UBadge>
              <USelect
                :model-value="app.status"
                :items="statusOptions"
                size="xs"
                class="w-32"
                :disabled="updatingId === app.id"
                @update:model-value="(v) => updateStatus(app, v as string)"
              />
              <UButton
                v-if="app.coverLetter"
                variant="ghost"
                size="xs"
                :icon="
                  expandedId === app.id ? 'i-heroicons-chevron-up' : 'i-heroicons-document-text'
                "
                @click="expandedId = expandedId === app.id ? null : app.id"
              >
                {{ t('candidate.tracker.coverLetter') }}
              </UButton>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-heroicons-academic-cap"
                :loading="prepLoading && prepPanelId === app.id"
                @click="openPrep(app)"
              >
                Prep
              </UButton>
            </div>
          </div>

          <div
            v-if="expandedId === app.id && app.coverLetter"
            class="px-4 pb-4"
            style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <p
              class="text-xs font-medium mb-2 pt-3"
              style="color: var(--ink-subtle); text-transform: uppercase; letter-spacing: 0.08em"
            >
              {{ t('candidate.tracker.generatedCoverLetter') }}
            </p>
            <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--ink-muted)">
              {{ app.coverLetter }}
            </p>
          </div>
        </div>
      </div>

      <!-- Interview Prep Panel — outside v-if chain so it doesn't break v-else-if sequence -->
      <Transition name="prep">
        <div
          v-if="prepPanelId"
          class="mt-4 rounded-xl overflow-hidden"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div
            class="flex items-center justify-between px-5 py-3"
            style="border-bottom: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-academic-cap" class="w-4 h-4" style="color: var(--accent)" />
              <span class="text-sm font-semibold" style="color: var(--ink)">Interview Prep</span>
              <span class="text-xs" style="color: var(--ink-muted)">
                —
                {{
                  (applications ?? []).find((a) => a.id === prepPanelId)?.discoveredJob?.title ?? ''
                }}
              </span>
            </div>
            <button
              type="button"
              class="text-xs"
              style="color: var(--ink-subtle)"
              @click="prepPanelId = null"
            >
              Close
            </button>
          </div>

          <div v-if="prepLoading" class="p-5 flex flex-col gap-3">
            <USkeleton v-for="n in 4" :key="n" class="h-4 rounded w-full" />
            <p class="text-xs text-center" style="color: var(--ink-subtle)">
              Generating questions…
            </p>
          </div>

          <div v-else-if="prepCache[prepPanelId]" class="p-5 flex flex-col gap-5">
            <!-- Questions by category -->
            <div
              v-for="(questions, cat) in groupBy(
                prepCache[prepPanelId]!.questions,
                (q) => q.category,
              )"
              :key="cat"
            >
              <p class="prep-cat-label">{{ cat }}</p>
              <div class="space-y-2 mt-2">
                <div
                  v-for="(q, idx) in questions"
                  :key="idx"
                  class="prep-q-item"
                  @click="prepExpandedQuestion = prepExpandedQuestion === idx ? null : idx"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm" style="color: var(--ink); line-height: 1.5">
                      {{ q.question }}
                    </p>
                    <UIcon
                      :name="
                        prepExpandedQuestion === idx
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4 shrink-0 mt-0.5"
                      style="color: var(--ink-subtle)"
                    />
                  </div>
                  <p
                    v-if="prepExpandedQuestion === idx"
                    class="text-xs mt-2 leading-relaxed"
                    style="
                      color: var(--accent);
                      border-top: 1px solid var(--line-soft);
                      padding-top: 8px;
                    "
                  >
                    💡 {{ q.tip }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Company research + salary tip -->
            <div v-if="prepCache[prepPanelId]!.companyResearch" class="prep-info-block">
              <p class="prep-cat-label">Company Research</p>
              <p class="text-sm mt-1" style="color: var(--ink-muted); line-height: 1.6">
                {{ prepCache[prepPanelId]!.companyResearch }}
              </p>
            </div>
            <div v-if="prepCache[prepPanelId]!.salaryNegotiationTip" class="prep-info-block">
              <p class="prep-cat-label">Salary Negotiation</p>
              <p class="text-sm mt-1" style="color: var(--ink-muted); line-height: 1.6">
                {{ prepCache[prepPanelId]!.salaryNegotiationTip }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <!-- end platform tab wrapper -->
  </div>
</template>

<style scoped>
.tracker-watch-ring {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tracker-watch-ring::before,
.tracker-watch-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid var(--positive);
  animation: watch-ripple 2.4s ease-out infinite;
}
.tracker-watch-ring::after {
  animation-delay: 1.2s;
}
.tracker-watch-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--positive);
  animation: watch-pulse 2s ease-in-out infinite;
}
@keyframes watch-ripple {
  0% {
    width: 10px;
    height: 10px;
    opacity: 0.8;
  }
  100% {
    width: 48px;
    height: 48px;
    opacity: 0;
  }
}
@keyframes watch-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}
.col-watch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-subtle);
  animation: watch-pulse 2s ease-in-out infinite;
}

/* Interview prep panel */
.prep-cat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}
.prep-q-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--line-soft);
  cursor: pointer;
  transition: border-color 0.12s;
}
.prep-q-item:hover {
  border-color: var(--line);
}
.prep-info-block {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--line-soft);
}

/* Prep panel transition */
.prep-enter-active,
.prep-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.prep-enter-from,
.prep-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Unified tracker row */
.tracker-unified-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  transition: border-color 0.12s;
}
.tracker-unified-row:hover {
  border-color: var(--line);
}
.type-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 5px;
  shrink: 0;
  white-space: nowrap;
}
.type-badge.inbound {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.type-badge.seeker {
  background: color-mix(in srgb, var(--positive) 12%, transparent);
  color: var(--positive);
}
.tracker-action-link {
  font-size: 11px;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
  opacity: 0.8;
  transition: opacity 0.12s;
}
.tracker-action-link:hover {
  opacity: 1;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .tracker-unified-row {
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
