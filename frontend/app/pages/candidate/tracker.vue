<script setup lang="ts">
import type { SeekerApplication } from '~/types/api'
import { safeUrl } from '~/utils/safeUrl'
import { capitalizeStatus } from '~/utils/candidate'
import { formatRelativeTime } from '~/utils/formatters'

definePageMeta({ layout: 'candidate' })

const { t } = useI18n()
const api = useCandidateApi()
const toast = useToast()

useHead({ title: t('candidate.tracker.title') })

// ── HH Negotiations ────────────────────────────────────────────────────────

interface HhNegotiation {
  id: string
  state: { id: string; name: string }
  vacancy: {
    id: string
    name: string
    alternate_url: string
    employer: { name: string }
    area?: { name: string }
  }
  created_at: string
  updated_at: string
}

const activeTab = ref<'platform' | 'hh'>('platform')

const {
  data: negotiations,
  pending: negPending,
  refresh: refreshNeg,
} = await useAsyncData(
  'hh-negotiations',
  () =>
    api
      .get<{ items: HhNegotiation[]; found: number }>('/api/v1/candidate-portal/hh/negotiations')
      .catch(() => ({ items: [] as HhNegotiation[], found: 0 })),
  { immediate: false },
)

watch(activeTab, (tab) => {
  if (tab === 'hh' && !negotiations.value) refreshNeg()
})

function negStateColor(stateId: string): 'success' | 'primary' | 'error' | 'warning' | 'neutral' {
  if (['invitation', 'response'].includes(stateId)) return 'primary'
  if (stateId === 'discard') return 'error'
  if (stateId === 'active') return 'success'
  return 'neutral'
}

// ── Negotiation messages ───────────────────────────────────────────────────

interface HhMessage {
  id: string
  author: { participant_type: 'applicant' | 'employer'; name: string }
  text: string
  created_at: string
}

const expandedNegId = ref<string | null>(null)
const negMessages = ref<Record<string, HhMessage[]>>({})
const negMessagesPending = ref<string | null>(null)
const newMessage = ref('')
const sendingMessage = ref(false)
const withdrawingId = ref<string | null>(null)

async function toggleNegMessages(negId: string) {
  if (expandedNegId.value === negId) {
    expandedNegId.value = null
    return
  }
  expandedNegId.value = negId
  if (negMessages.value[negId]) return
  negMessagesPending.value = negId
  try {
    const resp = await api.get<{ items: HhMessage[] }>(
      `/api/v1/candidate-portal/hh/negotiations/${negId}/messages`,
    )
    negMessages.value = { ...negMessages.value, [negId]: resp.items ?? [] }
  } catch {
    negMessages.value = { ...negMessages.value, [negId]: [] }
  } finally {
    negMessagesPending.value = null
  }
}

async function withdrawNegotiation(negId: string) {
  withdrawingId.value = negId
  try {
    await api.del(`/api/v1/candidate-portal/hh/negotiations/${negId}`)
    toast.add({ title: t('candidate.preferences.hhWithdrawn'), color: 'success' })
    if (negotiations.value?.items) {
      negotiations.value.items = negotiations.value.items.filter((n) => n.id !== negId)
    }
  } catch (e) {
    toast.add({
      title: t('candidate.preferences.hhWithdrawFailed'),
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    withdrawingId.value = null
  }
}

async function sendNegMessage(negId: string) {
  const msg = newMessage.value.trim()
  if (!msg) return
  sendingMessage.value = true
  try {
    await api.post(`/api/v1/candidate-portal/hh/negotiations/${negId}/messages`, { message: msg })
    toast.add({ title: t('candidate.preferences.hhMessageSent'), color: 'success' })
    newMessage.value = ''
    // Refresh messages
    const resp = await api.get<{ items: HhMessage[] }>(
      `/api/v1/candidate-portal/hh/negotiations/${negId}/messages`,
    )
    negMessages.value = { ...negMessages.value, [negId]: resp.items ?? [] }
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    sendingMessage.value = false
  }
}

const {
  data: applications,
  pending,
  refresh,
} = await useAsyncData('seeker-applications', () =>
  api
    .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
    .catch(() => [] as SeekerApplication[]),
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

    <!-- Tab toggle: Platform / HH -->
    <div
      class="flex rounded-lg overflow-hidden"
      style="border: 1px solid var(--line); width: fit-content"
    >
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
          activeTab === 'hh'
            ? 'background: var(--ink); color: var(--bg);'
            : 'background: var(--surface); color: var(--ink-muted);'
        "
        @click="activeTab = 'hh'"
      >
        {{ t('candidate.preferences.hhNegotiations') }}
      </button>
    </div>

    <!-- HH Negotiations tab -->
    <div v-if="activeTab === 'hh'">
      <div v-if="negPending" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>
      <div v-else-if="!negotiations?.items?.length" class="flex flex-col items-center py-16 gap-3">
        <UIcon
          name="i-heroicons-document-text"
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
          {{ t('candidate.preferences.hhNoNegotiations') }}
        </p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="neg in negotiations.items"
          :key="neg.id"
          class="rounded-lg overflow-hidden"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="p-4 flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <a
                :href="neg.vacancy.alternate_url"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium hover:underline"
                style="color: var(--ink); font-size: 15px"
              >
                {{ neg.vacancy.name }}
              </a>
              <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
                {{ neg.vacancy.employer.name }}
                <span v-if="neg.vacancy.area" style="color: var(--ink-subtle)">
                  · {{ neg.vacancy.area.name }}</span
                >
              </p>
              <p class="text-xs mt-1" style="color: var(--ink-subtle)">
                {{ formatRelativeTime(neg.created_at) }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UBadge :color="negStateColor(neg.state.id)" variant="subtle" size="sm">
                {{ neg.state.name }}
              </UBadge>
              <UButton
                size="xs"
                variant="ghost"
                :icon="
                  expandedNegId === neg.id
                    ? 'i-heroicons-chevron-up'
                    : 'i-heroicons-chat-bubble-left-right'
                "
                :loading="negMessagesPending === neg.id"
                @click="toggleNegMessages(neg.id)"
              >
                {{ t('candidate.preferences.hhMessages') }}
              </UButton>
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-x-mark"
                :loading="withdrawingId === neg.id"
                @click="withdrawNegotiation(neg.id)"
              >
                {{ t('candidate.preferences.hhWithdraw') }}
              </UButton>
            </div>
          </div>

          <!-- Message thread -->
          <div
            v-if="expandedNegId === neg.id"
            class="px-4 pb-4 pt-3 space-y-3"
            style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
          >
            <div v-if="negMessagesPending === neg.id" class="flex justify-center py-4">
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-5 h-5 animate-spin"
                style="color: var(--ink-subtle)"
              />
            </div>
            <template v-else>
              <div
                v-if="!negMessages[neg.id]?.length"
                class="text-sm text-center py-4"
                style="color: var(--ink-subtle)"
              >
                {{ t('candidate.preferences.hhNoMessages') }}
              </div>
              <div
                v-for="msg in negMessages[neg.id]"
                :key="msg.id"
                class="flex gap-2"
                :class="msg.author.participant_type === 'applicant' ? 'flex-row-reverse' : ''"
              >
                <div
                  class="rounded-lg px-3 py-2 max-w-xs text-sm"
                  :style="
                    msg.author.participant_type === 'applicant'
                      ? 'background: var(--accent, #5b6af5); color: #fff;'
                      : 'background: var(--surface); border: 1px solid var(--line-soft); color: var(--ink);'
                  "
                >
                  <p class="text-xs font-medium mb-1 opacity-70">{{ msg.author.name }}</p>
                  <p>{{ msg.text }}</p>
                  <p class="text-xs opacity-60 mt-1">{{ formatRelativeTime(msg.created_at) }}</p>
                </div>
              </div>
              <div class="flex gap-2 pt-1">
                <UInput
                  v-model="newMessage"
                  :placeholder="t('candidate.preferences.hhSendMessage')"
                  class="flex-1"
                  size="sm"
                  @keydown.enter.prevent="sendNegMessage(neg.id)"
                />
                <UButton
                  size="sm"
                  icon="i-heroicons-paper-airplane"
                  :loading="sendingMessage"
                  :disabled="!newMessage.trim()"
                  @click="sendNegMessage(neg.id)"
                />
              </div>
            </template>
          </div>
        </div>
        <p class="text-xs text-center pt-1" style="color: var(--ink-subtle)">
          {{ negotiations.found }} total
        </p>
      </div>
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

      <!-- Empty state -->
      <div v-if="!pending && !applications?.length" class="flex flex-col items-center py-16 gap-3">
        <UIcon
          name="i-heroicons-paper-airplane"
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
          {{ t('candidate.tracker.empty') }}
        </p>
        <p class="text-sm" style="color: var(--ink-muted)">
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
              <div
                v-for="app in columnApps(col.status)"
                :key="app.id"
                class="rounded-md p-2.5 cursor-pointer transition-opacity"
                :style="{
                  background: 'var(--surface)',
                  border: '1px solid var(--line-soft)',
                  opacity: updatingId === app.id ? 0.5 : 1,
                }"
                @click="expandedId = expandedId === app.id ? null : app.id"
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
                  <a
                    v-if="app.discoveredJob?.sourceUrl"
                    :href="safeUrl(app.discoveredJob.sourceUrl)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 flex items-center gap-1 text-xs hover:underline"
                    style="color: var(--accent)"
                  >
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                    View job
                  </a>
                  <p
                    v-if="app.coverLetter"
                    class="mt-2 text-xs leading-relaxed line-clamp-3"
                    style="color: var(--ink-subtle)"
                  >
                    {{ app.coverLetter }}
                  </p>
                </div>
              </div>

              <p
                v-if="!columnApps(col.status).length"
                class="text-xs text-center py-4"
                style="color: var(--ink-subtle)"
              >
                —
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- List view -->
      <div v-else class="space-y-3">
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
    </div>
    <!-- end platform tab wrapper -->
  </div>
</template>
