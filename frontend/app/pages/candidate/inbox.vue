<script setup lang="ts">
import type { SeekerApplication } from '~/types/api'
import { seekerAppStatusColor, appStatusColor } from '~/utils/statusColors'
import { capitalizeStatus } from '~/utils/candidate'
import { formatRelativeTime } from '~/utils/formatters'
import { safeUrl } from '~/utils/safeUrl'
import {
  newMessageApplicationIds,
  newMessageBus,
  clearNewMessage,
} from '~/composables/useCandidateEventStream'

definePageMeta({ layout: 'candidate' })
useHead({ title: 'Inbox' })

const api = useCandidateApi()
const toast = useToast()

interface HrApplication {
  id: string
  status: string
  matchScore?: string
  matchedAt?: string
  matchRecommendation?: string
  matchReasons?: { strengths?: string[]; gaps?: string[]; notes?: string }
  screenings?: Array<{
    id: string
    status: string
    aiAssessment?: {
      technical_score?: number
      experience_depth_score?: number
      communication_score?: number
      overall_score?: number
      strengths?: string[]
      concerns?: string[]
      recommendation?: 'advance' | 'reject' | 'maybe'
      summary?: string
    }
  }>
  shadowAnalysis?: {
    overall_score?: number
    summary?: string
    recruiter_advice?: string
    dimensions?: {
      technical_depth?: number
      communication?: number
      cultural_fit?: number
      experience_relevance?: number
    }
  } | null
  job: {
    id: string
    title: string
    workMode?: string
    employmentType?: string
    officeLocation?: string
    company: { id: string; name: string }
  }
}

interface ChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  sender: string
  content: string
  createdAt: string
}

const [seekerRes, hrRes] = await Promise.all([
  useAsyncData('inbox-seeker', () =>
    api
      .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
      .catch(() => [] as SeekerApplication[]),
  ),
  useAsyncData('inbox-hr', () =>
    api
      .get<HrApplication[]>('/api/v1/candidate-portal/applications')
      .catch(() => [] as HrApplication[]),
  ),
])

const seekerApps = computed(() => seekerRes.data.value ?? [])
const hrApps = computed(() => hrRes.data.value ?? [])

interface UnifiedApp {
  id: string
  type: 'seeker' | 'hr'
  title: string
  company: string
  status: string
  lastActivity?: string
  hasChat: boolean
  isNew: boolean
  raw: SeekerApplication | HrApplication
}

const URGENCY = [
  'screening',
  'responded',
  'outreach_sent',
  'interview',
  'shortlisted',
  'applied',
  'viewed',
  'queued',
  'offer',
  'rejected',
  'failed',
]

function urgencyOf(status: string) {
  const idx = URGENCY.indexOf(status)
  return idx === -1 ? URGENCY.length : idx
}

const filterTab = ref<'all' | 'seeker' | 'hr'>('all')

const unifiedApps = computed<UnifiedApp[]>(() => {
  const seeker: UnifiedApp[] = seekerApps.value.map((a) => ({
    id: a.id,
    type: 'seeker',
    title: a.discoveredJob?.title ?? '—',
    company: a.discoveredJob?.company ?? '',
    status: a.status,
    lastActivity: a.appliedAt ?? a.createdAt,
    hasChat: false,
    isNew: false,
    raw: a,
  }))

  const hr: UnifiedApp[] = hrApps.value.map((a) => ({
    id: a.id,
    type: 'hr',
    title: a.job?.title ?? '—',
    company: a.job?.company?.name ?? '',
    status: a.status,
    lastActivity: a.matchedAt,
    hasChat: ['screening', 'responded', 'outreach_sent', 'shortlisted'].includes(a.status),
    isNew: newMessageApplicationIds.value.has(a.id),
    raw: a,
  }))

  return [...seeker, ...hr]
    .filter((a) => {
      if (filterTab.value === 'seeker') return a.type === 'seeker'
      if (filterTab.value === 'hr') return a.type === 'hr'
      return true
    })
    .sort((a, b) => urgencyOf(a.status) - urgencyOf(b.status))
})

const selectedId = ref<string | null>(null)
const selectedApp = computed(() => unifiedApps.value.find((a) => a.id === selectedId.value) ?? null)

function selectApp(app: UnifiedApp) {
  selectedId.value = app.id
  if (app.isNew) clearNewMessage(app.id)
}

// Full app detail (screenings + shadow analysis) — fetched on HR app selection
const fullAppDetail = ref<HrApplication | null>(null)
const fullAppLoading = ref(false)

async function fetchFullAppDetail(appId: string) {
  fullAppLoading.value = true
  try {
    const res = await api.get<HrApplication>(`/api/v1/candidate-portal/applications/${appId}`)
    fullAppDetail.value = res
  } catch {
    fullAppDetail.value = null
  } finally {
    fullAppLoading.value = false
  }
}

// Chat state
const messages = ref<ChatMessage[]>([])
const chatLoading = ref(false)
const chatContent = ref('')
const isSending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const MAX_LENGTH = 500

async function fetchMessages(appId: string) {
  chatLoading.value = true
  try {
    const res = await api.get<ChatMessage[]>(
      `/api/v1/candidate-portal/applications/${appId}/messages`,
    )
    messages.value = res ?? []
    await nextTick()
    scrollToBottom()
  } catch {
    messages.value = []
  } finally {
    chatLoading.value = false
  }
}

async function sendMessage() {
  if (!chatContent.value.trim() || isSending.value || !selectedId.value) return
  const text = chatContent.value.trim()
  chatContent.value = ''
  isSending.value = true

  messages.value.push({
    id: 'temp-' + Date.now(),
    direction: 'inbound',
    sender: 'candidate',
    content: text,
    createdAt: new Date().toISOString(),
  })
  await nextTick()
  scrollToBottom()

  try {
    await api.post(`/api/v1/candidate-portal/applications/${selectedId.value}/messages`, {
      content: text,
    })
    await fetchMessages(selectedId.value)
  } catch (e) {
    toast.add({ title: 'Failed to send', description: extractApiErrorMessage(e), color: 'error' })
    messages.value = messages.value.filter((m) => !m.id.startsWith('temp-'))
  } finally {
    isSending.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(dateStr),
  )
}

watch(selectedId, async (id) => {
  messages.value = []
  fullAppDetail.value = null
  if (id) {
    if (selectedApp.value?.type === 'hr') {
      fetchFullAppDetail(id)
    }
    if (selectedApp.value?.hasChat) {
      await fetchMessages(id)
    }
  }
})

watch(filterTab, () => {
  selectedId.value = null
  mobileView.value = 'list'
})

// URL param: pre-select app from ?app=<id>
const route = useRoute()
onMounted(() => {
  const appParam = route.query.app as string | undefined
  if (appParam) {
    selectedId.value = appParam
    mobileView.value = 'detail'
  }
})

// Real-time: refresh messages when new message arrives for selected app
let unsubscribe: (() => void) | null = null
onMounted(() => {
  unsubscribe = newMessageBus.on((event) => {
    if (event.applicationId === selectedId.value) {
      fetchMessages(event.applicationId)
    }
    // isNew flag is reactive via newMessageApplicationIds Set — no full refresh needed
  })
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Seeker app status pipeline steps
const SEEKER_STEPS = ['queued', 'applied', 'viewed', 'interview', 'offer']
const HR_STEPS = ['outreach_sent', 'screening', 'responded', 'shortlisted', 'offer']

function stepsDone(steps: string[], currentStatus: string): number {
  const idx = steps.indexOf(currentStatus)
  if (idx === -1) return currentStatus === 'rejected' || currentStatus === 'failed' ? -1 : 0
  return idx
}

function stepDotStyle(steps: string[], currentStatus: string, step: string, i: number): string {
  if (currentStatus === step) return 'background: var(--ink); color: var(--bg);'
  if (stepsDone(steps, currentStatus) > i) return 'background: var(--accent); color: var(--bg);'
  return 'background: var(--bg-elevated); border: 1px solid var(--line); color: var(--ink-subtle);'
}

function stepLabel(s: string): string {
  const map: Record<string, string> = {
    queued: 'Queued',
    applied: 'Applied',
    viewed: 'Viewed',
    interview: 'Interview',
    offer: 'Offer',
    outreach_sent: 'Reached out',
    screening: 'Screening',
    responded: 'Responded',
    shortlisted: 'Shortlisted',
  }
  return map[s] ?? capitalizeStatus(s)
}

// Mobile: show detail pane when app selected
const mobileView = ref<'list' | 'detail'>('list')

function openDetail(app: UnifiedApp) {
  selectApp(app)
  mobileView.value = 'detail'
}

function backToList() {
  mobileView.value = 'list'
}

// Status color helper unified
function statusColor(app: UnifiedApp) {
  return app.type === 'seeker' ? seekerAppStatusColor(app.status) : appStatusColor(app.status)
}

const seekerCount = computed(() => seekerApps.value.length)
const hrCount = computed(() => hrApps.value.length)
const newCount = computed(
  () => hrApps.value.filter((a) => newMessageApplicationIds.value.has(a.id)).length,
)

// Screening + AI assessment helpers
function scoreRing(value: number | undefined): string {
  if (value == null) return 'var(--line)'
  if (value >= 7) return 'var(--positive)'
  if (value >= 5) return 'var(--warning)'
  return 'var(--negative)'
}

function recommendationLabel(r?: string): string {
  if (r === 'advance') return 'Strong fit'
  if (r === 'maybe') return 'Possible fit'
  if (r === 'reject') return 'Not a fit'
  return ''
}

function recommendationColor(r?: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (r === 'advance') return 'success'
  if (r === 'maybe') return 'warning'
  if (r === 'reject') return 'error'
  return 'neutral'
}

function matchRecommendationLabel(r?: string): string {
  if (!r) return ''
  const map: Record<string, string> = {
    strong_fit: 'Strong Fit',
    good_fit: 'Good Fit',
    possible_fit: 'Possible Fit',
    weak_fit: 'Weak Fit',
  }
  return map[r] ?? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const completedScreening = computed(() =>
  fullAppDetail.value?.screenings?.find((s) => s.status === 'completed' && s.aiAssessment),
)

const shadowAnalysis = computed(() => fullAppDetail.value?.shadowAnalysis ?? null)

// Shadow analysis dimension labels
const shadowDimensions: Array<{
  key: keyof NonNullable<NonNullable<HrApplication['shadowAnalysis']>['dimensions']>
  label: string
}> = [
  { key: 'technical_depth', label: 'Technical' },
  { key: 'communication', label: 'Communication' },
  { key: 'cultural_fit', label: 'Culture Fit' },
  { key: 'experience_relevance', label: 'Experience' },
]

// Shadow analysis visibility: show when shortlisted, offer, or after interview
const showShadowAnalysis = computed(
  () =>
    shadowAnalysis.value != null &&
    selectedApp.value?.type === 'hr' &&
    ['shortlisted', 'interview', 'offer', 'responded'].includes(selectedApp.value.status),
)

// ── List item stage helpers ───────────────────────────────────────────────────
function stageColor(status: string): string {
  if (['screening', 'interview'].includes(status)) return 'var(--warning)'
  if (['shortlisted', 'offer'].includes(status)) return 'var(--positive)'
  if (['rejected', 'failed'].includes(status)) return 'var(--negative)'
  if (['responded', 'viewed'].includes(status)) return 'var(--accent)'
  return 'var(--ink-subtle)'
}

function stageClass(app: UnifiedApp): string {
  if (['screening', 'interview'].includes(app.status)) return 'app-row-urgent'
  if (['rejected', 'failed'].includes(app.status)) return 'app-row-dead'
  return ''
}

function avatarStyle(app: UnifiedApp): string {
  const color = stageColor(app.status)
  return `background: color-mix(in srgb, ${color} 15%, transparent); color: ${color}; border: 1.5px solid color-mix(in srgb, ${color} 30%, transparent);`
}

function pipelineSteps(app: UnifiedApp): string[] {
  return app.type === 'hr' ? HR_STEPS : SEEKER_STEPS
}

function dotState(app: UnifiedApp, i: number): string {
  const steps = pipelineSteps(app)
  const current = steps.indexOf(app.status)
  if (app.status === 'rejected' || app.status === 'failed') return i === 0 ? 'dead' : 'inactive'
  if (i < current) return 'done'
  if (i === current) return 'active'
  return 'inactive'
}

// HR app shorthand for detail panel
const hrApp = computed(() =>
  selectedApp.value?.type === 'hr' ? (selectedApp.value.raw as HrApplication) : null,
)
</script>

<template>
  <div class="h-[calc(100dvh-2rem)] lg:h-[calc(100dvh-4rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
    <!-- Header bar -->
    <div
      class="shrink-0 flex items-center gap-4 px-5 py-3"
      style="border-bottom: 1px solid var(--line); background: var(--bg)"
    >
      <div>
        <p
          style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--ink-subtle);
          "
        >
          Applications
        </p>
        <h1
          style="
            font-family: 'Fraunces', serif;
            font-size: 22px;
            line-height: 1.1;
            letter-spacing: -0.03em;
            color: var(--ink);
            font-weight: 400;
          "
        >
          Inbox
          <span v-if="newCount > 0" class="new-badge">{{ newCount }} new</span>
        </h1>
      </div>
      <!-- Filter tabs -->
      <div
        class="ml-auto flex items-center gap-1 p-0.5 rounded-lg"
        style="background: var(--bg-elevated); border: 1px solid var(--line)"
      >
        <button
          v-for="tab in [
            { key: 'all', label: 'All', count: seekerCount + hrCount },
            { key: 'seeker', label: 'Applied', count: seekerCount },
            { key: 'hr', label: 'HR Pipeline', count: hrCount },
          ]"
          :key="tab.key"
          class="px-3 py-1 text-xs rounded-md transition-colors font-medium"
          :style="
            filterTab === tab.key
              ? 'background: var(--ink); color: var(--bg);'
              : 'color: var(--ink-muted);'
          "
          @click="filterTab = tab.key as any"
        >
          {{ tab.label }}
          <span
            class="ml-1 font-mono opacity-60"
            :style="filterTab === tab.key ? 'opacity: 0.7' : ''"
            >{{ tab.count }}</span
          >
        </button>
      </div>
    </div>

    <!-- Body: split panel -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: app list — hidden on mobile when detail is open -->
      <div
        class="flex flex-col border-r overflow-y-auto"
        :class="mobileView === 'detail' ? 'hidden lg:flex' : 'flex'"
        style="width: 100%; max-width: 100%; border-color: var(--line); background: var(--bg)"
        :style="{ 'max-width': selectedId ? '360px' : '100%' }"
      >
        <!-- Empty state -->
        <div
          v-if="!unifiedApps.length"
          class="flex flex-col items-center justify-center flex-1 gap-3 py-12"
        >
          <UIcon name="i-heroicons-inbox" class="w-12 h-12" style="color: var(--ink-subtle)" />
          <p
            style="
              font-family: 'Fraunces', serif;
              font-size: 20px;
              color: var(--ink);
              font-weight: 400;
            "
          >
            No applications yet
          </p>
          <p class="text-sm" style="color: var(--ink-muted)">Start browsing jobs to apply</p>
          <UButton
            to="/candidate/jobs"
            size="sm"
            variant="outline"
            icon="i-heroicons-magnifying-glass"
          >
            Browse jobs
          </UButton>
        </div>

        <!-- App rows -->
        <div
          v-for="app in unifiedApps"
          :key="app.id"
          class="app-row"
          :class="[stageClass(app), selectedId === app.id && 'app-row-selected']"
          @click="openDetail(app)"
        >
          <!-- Company initial avatar (stage-colored) -->
          <div class="app-avatar" :style="avatarStyle(app)">
            {{ app.company.charAt(0).toUpperCase() || '?' }}
          </div>

          <!-- Center: title + company + pipeline dots -->
          <div class="app-row-center">
            <div class="app-row-title-line">
              <p class="app-row-title" :class="{ 'font-semibold': app.isNew }">{{ app.title }}</p>
              <span v-if="app.isNew" class="unread-dot shrink-0" />
            </div>
            <p class="app-row-company">{{ app.company }}</p>
            <!-- Pipeline progress dots -->
            <div class="pipeline-dots">
              <span
                v-for="(_, i) in pipelineSteps(app)"
                :key="i"
                class="pipeline-dot"
                :class="`pipeline-dot--${dotState(app, i)}`"
              />
            </div>
          </div>

          <!-- Right: time only -->
          <span v-if="app.lastActivity" class="app-row-time">
            {{ formatRelativeTime(app.lastActivity) }}
          </span>
        </div>
      </div>

      <!-- Right: detail panel — full on mobile when open -->
      <div
        class="flex-1 flex flex-col overflow-hidden"
        :class="mobileView === 'list' ? 'hidden lg:flex' : 'flex'"
        style="background: var(--bg)"
      >
        <!-- No selection placeholder -->
        <div
          v-if="!selectedApp"
          class="flex-1 flex flex-col items-center justify-center gap-3"
          style="color: var(--ink-subtle)"
        >
          <UIcon name="i-heroicons-cursor-arrow-rays" class="w-10 h-10 opacity-30" />
          <p class="text-sm">Select an application to view details</p>
        </div>

        <!-- Selected app detail -->
        <Transition name="detail-fade" mode="out-in">
          <div v-if="selectedApp" :key="selectedApp.id" class="contents">
            <!-- Detail header -->
            <div
              class="shrink-0 flex items-center gap-3 px-5 py-3"
              style="border-bottom: 1px solid var(--line)"
            >
              <UButton
                icon="i-heroicons-arrow-left"
                variant="ghost"
                size="xs"
                class="lg:hidden"
                @click="backToList"
              />
              <div class="flex-1 min-w-0">
                <p class="text-base font-medium truncate" style="color: var(--ink)">
                  {{ selectedApp.title }}
                </p>
                <p class="text-xs" style="color: var(--ink-muted)">
                  {{ selectedApp.company }}
                  <span
                    class="ml-2 font-mono"
                    style="
                      font-size: 9px;
                      text-transform: uppercase;
                      letter-spacing: 0.08em;
                      color: var(--ink-subtle);
                    "
                    >{{ selectedApp.type === 'hr' ? 'HR found you' : 'You applied' }}</span
                  >
                </p>
              </div>
              <UBadge :color="statusColor(selectedApp)" variant="subtle" size="sm">
                {{ capitalizeStatus(selectedApp.status) }}
              </UBadge>
            </div>

            <!-- Detail body (scrollable except chat input) -->
            <div class="flex-1 flex flex-col overflow-hidden">
              <div class="flex-1 overflow-y-auto">
                <!-- AI Snapshot — shown first for HR apps with a match score -->
                <div
                  v-if="hrApp?.matchScore"
                  class="ai-snapshot px-5 py-4"
                  style="border-bottom: 1px solid var(--line-soft)"
                >
                  <div class="ai-snapshot-inner">
                    <div class="ai-snapshot-score-block">
                      <span class="ai-snapshot-score-num">
                        {{ Math.round(Number(hrApp.matchScore)) }}
                      </span>
                      <span class="ai-snapshot-score-pct">%</span>
                      <span class="ai-snapshot-score-label">match</span>
                    </div>
                    <div class="ai-snapshot-body">
                      <UBadge
                        v-if="hrApp.matchRecommendation"
                        :color="
                          hrApp.matchRecommendation?.includes('strong')
                            ? 'success'
                            : hrApp.matchRecommendation?.includes('weak')
                              ? 'warning'
                              : 'neutral'
                        "
                        variant="subtle"
                        size="xs"
                      >
                        {{ matchRecommendationLabel(hrApp.matchRecommendation) }}
                      </UBadge>
                      <div v-if="hrApp.matchReasons?.strengths?.length" class="ai-snapshot-chips">
                        <span
                          v-for="s in hrApp.matchReasons.strengths.slice(0, 3)"
                          :key="s"
                          class="snapshot-chip snapshot-chip--green"
                          >{{ s }}</span
                        >
                      </div>
                      <div v-if="hrApp.matchReasons?.gaps?.length" class="ai-snapshot-chips mt-1">
                        <span
                          v-for="g in hrApp.matchReasons.gaps.slice(0, 2)"
                          :key="g"
                          class="snapshot-chip snapshot-chip--amber"
                          >{{ g }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Status timeline -->
                <div class="px-5 py-4" style="border-bottom: 1px solid var(--line-soft)">
                  <p
                    class="text-[10px] font-mono font-semibold uppercase tracking-wider mb-3"
                    style="color: var(--ink-subtle)"
                  >
                    Pipeline
                  </p>
                  <div class="flex items-center gap-0">
                    <template
                      v-for="(step, i) in selectedApp.type === 'seeker' ? SEEKER_STEPS : HR_STEPS"
                      :key="step"
                    >
                      <div class="flex flex-col items-center gap-1">
                        <div
                          class="w-6 h-6 rounded-full flex items-center justify-center"
                          :style="
                            stepDotStyle(
                              selectedApp.type === 'seeker' ? SEEKER_STEPS : HR_STEPS,
                              selectedApp.status,
                              step,
                              i,
                            )
                          "
                        >
                          <UIcon
                            v-if="
                              stepsDone(
                                selectedApp.type === 'seeker' ? SEEKER_STEPS : HR_STEPS,
                                selectedApp.status,
                              ) > i
                            "
                            name="i-heroicons-check"
                            class="w-3 h-3"
                          />
                          <span v-else class="text-[9px] font-bold">{{ i + 1 }}</span>
                        </div>
                        <span
                          class="text-[9px] font-mono"
                          style="color: var(--ink-subtle); white-space: nowrap"
                        >
                          {{ stepLabel(step) }}
                        </span>
                      </div>
                      <div
                        v-if="
                          i < (selectedApp.type === 'seeker' ? SEEKER_STEPS : HR_STEPS).length - 1
                        "
                        class="flex-1 h-px mb-4"
                        :style="
                          stepsDone(
                            selectedApp.type === 'seeker' ? SEEKER_STEPS : HR_STEPS,
                            selectedApp.status,
                          ) > i
                            ? 'background: var(--accent)'
                            : 'background: var(--line)'
                        "
                      />
                    </template>
                  </div>
                  <!-- Rejected state -->
                  <div
                    v-if="selectedApp.status === 'rejected' || selectedApp.status === 'failed'"
                    class="mt-2 text-xs px-3 py-2 rounded-lg"
                    style="
                      background: var(--bg-elevated);
                      color: var(--negative);
                      border: 1px solid color-mix(in srgb, var(--negative) 20%, transparent);
                    "
                  >
                    {{
                      selectedApp.status === 'failed'
                        ? 'Application failed to submit'
                        : 'Not selected for this role'
                    }}
                  </div>
                </div>

                <!-- Seeker app details -->
                <template v-if="selectedApp.type === 'seeker'">
                  <div
                    class="px-5 py-4 space-y-2"
                    style="border-bottom: 1px solid var(--line-soft)"
                  >
                    <p
                      class="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2"
                      style="color: var(--ink-subtle)"
                    >
                      Details
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-if="(selectedApp.raw as SeekerApplication).discoveredJob?.workMode"
                        class="text-xs px-2 py-0.5 rounded-md"
                        style="
                          background: var(--bg-elevated);
                          color: var(--ink-muted);
                          border: 1px solid var(--line);
                        "
                      >
                        {{ (selectedApp.raw as SeekerApplication).discoveredJob?.workMode }}
                      </span>
                      <span
                        v-if="(selectedApp.raw as SeekerApplication).source"
                        class="text-xs px-2 py-0.5 rounded-md font-mono"
                        style="
                          background: var(--bg-elevated);
                          color: var(--ink-muted);
                          border: 1px solid var(--line);
                        "
                      >
                        via {{ (selectedApp.raw as SeekerApplication).source }}
                      </span>
                    </div>
                    <a
                      v-if="(selectedApp.raw as SeekerApplication).discoveredJob?.sourceUrl"
                      :href="
                        safeUrl((selectedApp.raw as SeekerApplication).discoveredJob!.sourceUrl!)
                      "
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-xs mt-1 hover:underline"
                      style="color: var(--accent)"
                    >
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                      View original job posting
                    </a>
                  </div>
                  <!-- Cover letter -->
                  <div v-if="(selectedApp.raw as SeekerApplication).coverLetter" class="px-5 py-4">
                    <p
                      class="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2"
                      style="color: var(--ink-subtle)"
                    >
                      Cover Letter
                    </p>
                    <p
                      class="text-sm leading-relaxed whitespace-pre-line"
                      style="color: var(--ink-muted)"
                    >
                      {{ (selectedApp.raw as SeekerApplication).coverLetter }}
                    </p>
                  </div>
                </template>

                <!-- HR app details + chat -->
                <template v-else>
                  <div
                    class="px-5 py-4 space-y-2"
                    style="border-bottom: 1px solid var(--line-soft)"
                  >
                    <p
                      class="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2"
                      style="color: var(--ink-subtle)"
                    >
                      Role Details
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-if="(selectedApp.raw as HrApplication).job?.workMode"
                        class="text-xs px-2 py-0.5 rounded-md"
                        style="
                          background: var(--bg-elevated);
                          color: var(--ink-muted);
                          border: 1px solid var(--line);
                        "
                      >
                        {{ (selectedApp.raw as HrApplication).job?.workMode }}
                      </span>
                      <span
                        v-if="(selectedApp.raw as HrApplication).job?.employmentType"
                        class="text-xs px-2 py-0.5 rounded-md"
                        style="
                          background: var(--bg-elevated);
                          color: var(--ink-muted);
                          border: 1px solid var(--line);
                        "
                      >
                        {{ (selectedApp.raw as HrApplication).job?.employmentType }}
                      </span>
                      <span
                        v-if="(selectedApp.raw as HrApplication).matchScore"
                        class="text-xs px-2 py-0.5 rounded-md font-mono"
                        style="
                          background: var(--accent-soft);
                          color: var(--accent);
                          border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
                        "
                      >
                        {{ Math.round(Number((selectedApp.raw as HrApplication).matchScore)) }}%
                        match
                      </span>
                    </div>
                  </div>

                  <!-- Match Reasons card -->
                  <details
                    v-if="
                      fullAppDetail?.matchRecommendation ||
                      fullAppDetail?.matchReasons?.strengths?.length ||
                      fullAppDetail?.matchReasons?.gaps?.length
                    "
                    class="ai-accordion"
                    style="border-bottom: 1px solid var(--line-soft)"
                  >
                    <summary class="ai-accordion-summary px-5 py-3">
                      <span
                        class="text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style="color: var(--ink-subtle)"
                        >AI Match Analysis</span
                      >
                      <UBadge
                        v-if="fullAppDetail?.matchRecommendation"
                        :color="
                          fullAppDetail.matchRecommendation.includes('strong')
                            ? 'success'
                            : fullAppDetail.matchRecommendation.includes('weak')
                              ? 'warning'
                              : 'info'
                        "
                        variant="subtle"
                        size="xs"
                      >
                        {{ matchRecommendationLabel(fullAppDetail.matchRecommendation) }}
                      </UBadge>
                      <UIcon name="i-heroicons-chevron-down" class="ai-accordion-chevron ml-auto" />
                    </summary>
                    <div class="px-5 pb-4 space-y-3">
                      <div v-if="fullAppDetail?.matchReasons?.strengths?.length" class="space-y-1">
                        <p class="text-[10px] font-semibold" style="color: var(--positive)">
                          Why you match
                        </p>
                        <div class="flex flex-wrap gap-1.5">
                          <span
                            v-for="s in fullAppDetail.matchReasons.strengths"
                            :key="s"
                            class="text-xs px-2 py-0.5 rounded-md"
                            style="
                              background: color-mix(in srgb, var(--positive) 12%, transparent);
                              color: var(--positive);
                              border: 1px solid color-mix(in srgb, var(--positive) 25%, transparent);
                            "
                          >
                            {{ s }}
                          </span>
                        </div>
                      </div>
                      <div v-if="fullAppDetail?.matchReasons?.gaps?.length" class="space-y-1">
                        <p class="text-[10px] font-semibold" style="color: var(--warning)">
                          Missing
                        </p>
                        <div class="flex flex-wrap gap-1.5">
                          <span
                            v-for="g in fullAppDetail.matchReasons.gaps"
                            :key="g"
                            class="text-xs px-2 py-0.5 rounded-md"
                            style="
                              background: color-mix(in srgb, var(--warning) 12%, transparent);
                              color: var(--warning);
                              border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
                            "
                          >
                            {{ g }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </details>

                  <!-- Screening Results card -->
                  <details
                    v-if="completedScreening"
                    class="ai-accordion"
                    style="border-bottom: 1px solid var(--line-soft)"
                  >
                    <summary class="ai-accordion-summary px-5 py-3">
                      <span
                        class="text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style="color: var(--ink-subtle)"
                        >AI Screening Results</span
                      >
                      <UBadge
                        v-if="completedScreening.aiAssessment?.recommendation"
                        :color="recommendationColor(completedScreening.aiAssessment.recommendation)"
                        variant="subtle"
                        size="xs"
                      >
                        {{ recommendationLabel(completedScreening.aiAssessment.recommendation) }}
                      </UBadge>
                      <UIcon name="i-heroicons-chevron-down" class="ai-accordion-chevron ml-auto" />
                    </summary>
                    <div class="px-5 pb-4 space-y-3">
                      <p
                        v-if="completedScreening.aiAssessment?.summary"
                        class="text-xs leading-relaxed"
                        style="color: var(--ink-muted)"
                      >
                        {{ completedScreening.aiAssessment.summary }}
                      </p>
                      <!-- Score rings row -->
                      <div class="flex gap-4">
                        <div
                          v-for="item in [
                            {
                              label: 'Overall',
                              val: completedScreening.aiAssessment?.overall_score,
                            },
                            {
                              label: 'Technical',
                              val: completedScreening.aiAssessment?.technical_score,
                            },
                            {
                              label: 'Comms',
                              val: completedScreening.aiAssessment?.communication_score,
                            },
                          ]"
                          :key="item.label"
                          class="flex flex-col items-center gap-1"
                        >
                          <div class="relative w-10 h-10">
                            <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke="var(--line)"
                                stroke-width="3"
                              />
                              <circle
                                v-if="item.val != null"
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                :stroke="scoreRing(item.val)"
                                stroke-width="3"
                                stroke-linecap="round"
                                :stroke-dasharray="`${(item.val / 10) * 94.2} 94.2`"
                              />
                            </svg>
                            <span
                              class="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold"
                              :style="{ color: scoreRing(item.val) }"
                            >
                              {{ item.val != null ? item.val : '—' }}
                            </span>
                          </div>
                          <span class="text-[9px] font-mono" style="color: var(--ink-subtle)">{{
                            item.label
                          }}</span>
                        </div>
                      </div>
                      <!-- Strengths/Concerns -->
                      <div
                        v-if="completedScreening.aiAssessment?.strengths?.length"
                        class="flex flex-wrap gap-1"
                      >
                        <span
                          v-for="s in completedScreening.aiAssessment.strengths"
                          :key="s"
                          class="text-[10px] px-2 py-0.5 rounded"
                          style="
                            background: color-mix(in srgb, var(--positive) 12%, transparent);
                            color: var(--positive);
                          "
                          >{{ s }}</span
                        >
                      </div>
                      <div
                        v-if="completedScreening.aiAssessment?.concerns?.length"
                        class="flex flex-wrap gap-1"
                      >
                        <span
                          v-for="c in completedScreening.aiAssessment.concerns"
                          :key="c"
                          class="text-[10px] px-2 py-0.5 rounded"
                          style="
                            background: color-mix(in srgb, var(--warning) 12%, transparent);
                            color: var(--warning);
                          "
                          >{{ c }}</span
                        >
                      </div>
                    </div>
                  </details>

                  <!-- Shadow Analysis card (post-interview) -->
                  <details
                    v-if="showShadowAnalysis"
                    class="ai-accordion"
                    style="border-bottom: 1px solid var(--line-soft)"
                  >
                    <summary class="ai-accordion-summary px-5 py-3">
                      <span
                        class="text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style="color: var(--ink-subtle)"
                        >Interview Analysis</span
                      >
                      <span
                        v-if="shadowAnalysis?.overall_score != null"
                        class="text-xs font-mono font-bold"
                        :style="{ color: scoreRing(shadowAnalysis.overall_score) }"
                      >
                        {{ shadowAnalysis.overall_score }}/10
                      </span>
                      <UIcon name="i-heroicons-chevron-down" class="ai-accordion-chevron ml-auto" />
                    </summary>
                    <div class="px-5 pb-4 space-y-3">
                      <p
                        v-if="shadowAnalysis?.summary"
                        class="text-xs leading-relaxed"
                        style="color: var(--ink-muted)"
                      >
                        {{ shadowAnalysis.summary }}
                      </p>
                      <!-- Dimension bars -->
                      <div v-if="shadowAnalysis?.dimensions" class="space-y-2">
                        <div
                          v-for="dim in shadowDimensions"
                          :key="dim.key"
                          class="flex items-center gap-2"
                        >
                          <span
                            class="text-[10px] w-20 shrink-0 font-mono"
                            style="color: var(--ink-subtle)"
                            >{{ dim.label }}</span
                          >
                          <div
                            class="flex-1 h-1.5 rounded-full overflow-hidden"
                            style="background: var(--bg-elevated)"
                          >
                            <div
                              class="h-full rounded-full"
                              :style="{
                                width: `${((shadowAnalysis.dimensions?.[dim.key] ?? 0) / 10) * 100}%`,
                                background: scoreRing(shadowAnalysis.dimensions?.[dim.key]),
                              }"
                            />
                          </div>
                          <span
                            class="text-[10px] font-mono w-6 text-right"
                            style="color: var(--ink-subtle)"
                          >
                            {{ shadowAnalysis.dimensions?.[dim.key] ?? '—' }}
                          </span>
                        </div>
                      </div>
                      <div
                        v-if="shadowAnalysis?.recruiter_advice"
                        class="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                        style="
                          background: var(--bg-elevated);
                          color: var(--ink-muted);
                          border: 1px solid var(--line-soft);
                        "
                      >
                        <span class="font-semibold" style="color: var(--accent)">Tip: </span
                        >{{ shadowAnalysis.recruiter_advice }}
                      </div>
                    </div>
                  </details>

                  <!-- Loading detail skeleton -->
                  <div v-if="fullAppLoading" class="px-5 py-4 space-y-2">
                    <USkeleton class="h-3 w-32 rounded" />
                    <USkeleton class="h-8 w-full rounded" />
                    <USkeleton class="h-8 w-3/4 rounded" />
                  </div>

                  <!-- Chat thread (if applicable) -->
                  <div v-if="selectedApp.hasChat" class="flex flex-col" style="min-height: 200px">
                    <div class="px-5 py-2" style="border-bottom: 1px solid var(--line-soft)">
                      <p
                        class="text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style="color: var(--ink-subtle)"
                      >
                        Screening Chat
                      </p>
                    </div>
                    <div
                      ref="messagesContainer"
                      class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3"
                      style="min-height: 160px; max-height: 320px"
                    >
                      <div v-if="chatLoading" class="flex items-center justify-center py-8">
                        <UIcon
                          name="i-heroicons-arrow-path"
                          class="w-5 h-5 animate-spin"
                          style="color: var(--ink-subtle)"
                        />
                      </div>
                      <div
                        v-else-if="!messages.length"
                        class="flex flex-col items-center py-6 gap-2"
                        style="color: var(--ink-subtle)"
                      >
                        <UIcon
                          name="i-heroicons-chat-bubble-left-right"
                          class="w-8 h-8 opacity-30"
                        />
                        <p class="text-sm">No messages yet — start the conversation</p>
                      </div>
                      <div
                        v-for="msg in messages"
                        :key="msg.id"
                        class="flex flex-col max-w-[80%]"
                        :class="msg.direction === 'inbound' ? 'self-end' : 'self-start'"
                      >
                        <div
                          class="px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap"
                          :class="msg.direction === 'inbound' ? 'rounded-tr-sm' : 'rounded-tl-sm'"
                          :style="
                            msg.direction === 'inbound'
                              ? 'background: var(--ink); color: var(--bg);'
                              : 'background: var(--surface); color: var(--ink); border: 1px solid var(--line-soft);'
                          "
                        >
                          {{ msg.content }}
                        </div>
                        <span
                          class="text-[10px] mt-0.5 px-1"
                          style="color: var(--ink-subtle)"
                          :class="msg.direction === 'inbound' ? 'text-right' : 'text-left'"
                        >
                          {{ formatTime(msg.createdAt) }}
                        </span>
                      </div>
                      <div
                        v-if="isSending"
                        class="self-start flex items-center gap-1.5 px-3 py-2 rounded-2xl rounded-tl-sm"
                        style="background: var(--surface); border: 1px solid var(--line-soft)"
                      >
                        <span class="typing-dot" style="animation-delay: 0s" />
                        <span class="typing-dot" style="animation-delay: 0.2s" />
                        <span class="typing-dot" style="animation-delay: 0.4s" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Chat input pinned at bottom (HR apps with chat only) -->
              <div
                v-if="selectedApp.hasChat"
                class="shrink-0 px-5 py-3"
                style="border-top: 1px solid var(--line)"
              >
                <form class="flex gap-2" @submit.prevent="sendMessage">
                  <UInput
                    v-model="chatContent"
                    placeholder="Reply to screening..."
                    class="flex-1"
                    size="sm"
                    :maxlength="MAX_LENGTH"
                    :disabled="isSending"
                    autocomplete="off"
                  />
                  <UButton
                    type="submit"
                    size="sm"
                    icon="i-heroicons-paper-airplane"
                    :loading="isSending"
                    :disabled="!chatContent.trim()"
                  />
                </form>
                <div
                  v-if="chatContent.length > MAX_LENGTH * 0.8"
                  class="text-right text-[10px] mt-1"
                  :style="
                    chatContent.length >= MAX_LENGTH
                      ? 'color: var(--negative)'
                      : 'color: var(--ink-subtle)'
                  "
                >
                  {{ chatContent.length }}/{{ MAX_LENGTH }}
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── App row (redesigned) ── */
.app-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line-soft);
  border-left: 3px solid transparent;
  transition:
    background 0.1s,
    border-left-color 0.2s;
}
.app-row:hover {
  background: var(--bg-elevated);
}
.app-row-selected {
  background: var(--bg-elevated) !important;
  border-left-color: var(--accent) !important;
}
.app-row-urgent {
  border-left-color: var(--warning);
}
.app-row-dead {
  opacity: 0.55;
}
.app-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.app-row-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.app-row-title-line {
  display: flex;
  align-items: center;
  gap: 5px;
}
.app-row-title {
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.app-row-company {
  font-size: 11px;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-row-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  flex-shrink: 0;
}

/* ── Pipeline dots ── */
.pipeline-dots {
  display: flex;
  gap: 3px;
  margin-top: 3px;
}
.pipeline-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pipeline-dot--done {
  background: var(--positive);
}
.pipeline-dot--active {
  background: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}
.pipeline-dot--inactive {
  background: var(--line);
}
.pipeline-dot--dead {
  background: var(--negative);
}

/* ── AI Snapshot ── */
.ai-snapshot-inner {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.ai-snapshot-score-block {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}
.ai-snapshot-score-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}
.ai-snapshot-score-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-muted);
}
.ai-snapshot-score-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-subtle);
  margin-left: 4px;
}
.ai-snapshot-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
}
.ai-snapshot-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.snapshot-chip {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
}
.snapshot-chip--green {
  background: color-mix(in srgb, var(--positive) 12%, transparent);
  color: var(--positive);
}
.snapshot-chip--amber {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
}
.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.new-badge {
  display: inline-flex;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 8px;
  border-radius: 20px;
  margin-left: 8px;
  vertical-align: middle;
  letter-spacing: 0.02em;
}
.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-muted);
  display: inline-block;
  animation: bounce 1.2s ease-in-out infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Timeline step dots animate on state change */
.step-dot {
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

/* Detail panel fade when switching apps */
.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.15s ease;
}
.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
}

.ai-accordion {
  border: none;
}
.ai-accordion-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.ai-accordion-summary::-webkit-details-marker {
  display: none;
}
.ai-accordion-chevron {
  width: 14px;
  height: 14px;
  color: var(--ink-subtle);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.ai-accordion[open] .ai-accordion-chevron {
  transform: rotate(180deg);
}
</style>
