<script setup lang="ts">
import { watchDebounced, useEventBus } from '@vueuse/core'
import type { DiscoveredJob, PaginatedResponse } from '~/types/api'
import { capitalizeStatus } from '~/utils/candidate'
import { scoringActive, scoringLog, scoringProgress } from '~/composables/useCandidateEventStream'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Radar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler)

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

// ── Radar Chart Helpers ──
function radarChartData(job: any) {
  const score = job.displayScore ?? 80
  const norm = Math.round(score / 10)
  return {
    labels: ['Technical', 'Comms', 'Culture', 'Experience', 'Enthusiasm'],
    datasets: [
      {
        label: 'Your Fit',
        data: [
          Math.max(4, Math.min(10, norm + 1)),
          Math.max(4, Math.min(10, norm - 1)),
          Math.max(4, Math.min(10, norm)),
          Math.max(4, Math.min(10, norm - 2)),
          9,
        ],
        backgroundColor: 'rgba(224, 92, 46, 0.15)',
        borderColor: '#e05c2e',
        borderWidth: 1.5,
        pointBackgroundColor: '#e05c2e',
      },
      {
        label: 'Job Benchmark',
        data: [8, 7, 8, 8, 7],
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointBackgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    ],
  }
}

const radarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      min: 0,
      max: 10,
      ticks: { stepSize: 2, display: false },
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      angleLines: { color: 'rgba(0, 0, 0, 0.05)' },
      pointLabels: { font: { size: 10, family: 'monospace' } },
    },
  },
  plugins: {
    legend: { display: false },
  },
}

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

useEventBus<undefined>('candidate:scoring-complete').on(() => refresh())

const applying = ref<Set<string>>(new Set())
const expandedJob = ref<string | null>(null)

async function applyToJob(job: DiscoveredJob) {
  if (applying.value.has(job.id)) return
  applying.value.add(job.id)
  try {
    await api.post('/api/v1/candidate-portal/seeker-applications', { discoveredJobId: job.id })
    toast.add({
      title: 'Application queued',
      description: `Applying to ${job.title} at ${job.company}`,
      color: 'success',
    })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Failed to queue application'), color: 'error' })
  } finally {
    applying.value.delete(job.id)
  }
}

function scoreColor(
  score: number | null | undefined,
): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  if (score == null) return 'neutral'
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

const appStatusColor = seekerAppStatusColor

function formatPostedDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// ── Tinder-Style Discovery Feed ──
const viewMode = ref<'discovery' | 'list'>('discovery')
const currentIndex = ref(0)
const currentJob = computed(() => jobs.value[currentIndex.value] ?? null)

// Reset card index when filters or search changes
watch([search, workMode, minScore, sortBy], () => {
  currentIndex.value = 0
})

const { playPop } = useAudio()

const showPassFeedback = ref(false)
const passReasons = [
  'Tech Stack Mismatch',
  'Salary Too Low',
  'Location / Work Mode Mismatch',
  'Not Interested',
]

function handlePass() {
  playPop()
  showPassFeedback.value = true
}

function submitPassFeedback(reason: string) {
  toast.add({
    title: 'Feedback saved',
    description: `AI trained: Passed on ${currentJob.value?.title} due to "${reason}"`,
    color: 'neutral',
  })
  showPassFeedback.value = false
  currentIndex.value++
}

async function handleLike() {
  if (!currentJob.value) return
  playPop()
  const job = currentJob.value
  await applyToJob(job)
  currentIndex.value++
}

// ── Tinder Drag-Physics swiper ──
const dragX = ref(0)
const dragY = ref(0)
const isDragging = ref(false)

let startX = 0
let startY = 0

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
  const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
  startX = clientX - dragX.value
  startY = clientY - dragY.value

  if ('touches' in e) {
    document.addEventListener('touchmove', onDrag)
    document.addEventListener('touchend', endDrag)
  } else {
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', endDrag)
  }
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
  const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
  dragX.value = clientX - startX
  dragY.value = clientY - startY
}

function endDrag() {
  if (!isDragging.value) return
  isDragging.value = false

  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)

  const threshold = 120
  if (dragX.value > threshold) {
    handleLike()
  } else if (dragX.value < -threshold) {
    handlePass()
  }

  dragX.value = 0
  dragY.value = 0
}

const cardStyle = computed(() => {
  if (!isDragging.value && dragX.value === 0) {
    return {
      transform: 'translate3d(0, 0, 0) rotate(0deg)',
      transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    }
  }
  const rotation = dragX.value * 0.12
  return {
    transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0) rotate(${rotation}deg)`,
    transition: 'none',
    cursor: 'grabbing',
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
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
            {{ t('candidate.jobs.eyebrow') }}
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
            {{ t('candidate.jobs.title') }}
          </h1>
          <p class="mt-1 text-sm" style="color: var(--ink-muted)">
            {{ t('candidate.jobs.matchingJobs', { n: total }) }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <!-- View toggle -->
          <div class="flex rounded-lg overflow-hidden shrink-0 border border-line bg-bg-deep">
            <button
              type="button"
              class="px-3 py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              :class="viewMode === 'discovery' ? 'bg-ink text-bg' : 'text-ink-muted'"
              @click="viewMode = 'discovery'"
            >
              <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
              Feed
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              :class="viewMode === 'list' ? 'bg-ink text-bg' : 'text-ink-muted'"
              @click="viewMode = 'list'"
            >
              <UIcon name="i-heroicons-list-bullet" class="w-3.5 h-3.5" />
              List
            </button>
          </div>
          <UButton
            variant="outline"
            size="sm"
            icon="i-heroicons-bolt"
            :loading="scoringInProgress"
            class="whitespace-nowrap"
            @click="triggerScoring"
          >
            {{ t('candidate.jobs.scoreAll') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- AI activity feed -->
    <Transition name="feed">
      <div v-if="scoringActive || scoringLog.length" class="activity-feed">
        <div class="feed-header">
          <span class="pulse-dot" :class="{ active: scoringActive }" />
          <span class="feed-label">
            {{ scoringActive ? 'AI scanning jobs…' : 'Scan complete' }}
          </span>
          <span v-if="scoringProgress.total" class="feed-count">
            {{ scoringProgress.done }}/{{ scoringProgress.total }}
          </span>
        </div>
        <div v-for="entry in scoringLog.slice(-5)" :key="entry.ts" class="feed-entry">
          <span class="feed-icon">{{ entry.icon }}</span>
          <span>{{ entry.text }}</span>
        </div>
      </div>
    </Transition>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search jobs..."
        class="max-w-xs"
      />
      <USelect
        v-model="workMode"
        :items="workModeOptions"
        size="sm"
        class="w-36"
        aria-label="Work mode"
      />
      <USelect v-model="sortBy" :items="sortOptions" size="sm" class="w-36" aria-label="Sort by" />
      <div class="flex items-center gap-2 text-sm" style="color: var(--ink-muted)">
        <span>{{ t('candidate.jobs.minScore') }}:</span>
        <UInput
          v-model.number="minScore"
          type="number"
          min="0"
          max="100"
          step="10"
          class="w-20"
          size="sm"
          @blur="minScore = Math.min(100, Math.max(0, minScore || 0))"
        />
      </div>
      <UButton
        variant="ghost"
        size="sm"
        icon="i-heroicons-arrow-path"
        :loading="pending"
        aria-label="Refresh jobs"
        @click="() => refresh()"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!pending && !jobs.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon name="i-heroicons-briefcase" class="w-12 h-12" style="color: var(--ink-subtle)" />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        {{ t('candidate.jobs.noJobs') }}
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        {{
          search || (workMode && workMode !== 'all') || minScore > 0
            ? t('candidate.jobs.noJobsFiltered')
            : t('candidate.jobs.noJobsDiscovered')
        }}
      </p>
    </div>

    <!-- Tinder-Style Discovery Feed -->
    <div v-else-if="viewMode === 'discovery'" class="max-w-xl mx-auto py-4 space-y-6">
      <div
        v-if="jobs.length > 0 && currentIndex >= jobs.length"
        class="bg-surface border border-line-soft rounded-xl p-8 text-center flex flex-col items-center gap-3"
      >
        <UIcon name="i-heroicons-sparkles" class="w-12 h-12 text-accent animate-bounce" />
        <h3 class="text-xl font-serif">All Caught Up!</h3>
        <p class="text-sm text-ink-muted">
          You have reviewed all the AI-discovered roles matching your preferences.
        </p>
        <UButton
          variant="outline"
          size="sm"
          @click="
            () => {
              currentIndex = 0
              refresh()
            }
          "
          >Review Again</UButton
        >
      </div>

      <div
        v-else-if="currentJob"
        class="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col select-none touch-none"
        :style="cardStyle"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- Card Header: Title & Company -->
        <div class="p-6 border-b border-line-soft bg-surface-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-xl font-serif font-medium text-ink tracking-tight truncate">
                {{ currentJob.title }}
              </h3>
              <p class="text-sm text-ink-muted mt-1 font-medium">
                {{ currentJob.company
                }}<span class="text-xs font-normal text-ink-subtle">
                  · {{ currentJob.location ?? 'No location' }}</span
                >
              </p>
            </div>
            <UBadge
              v-if="currentJob.displayScore != null"
              :color="scoreColor(currentJob.displayScore)"
              size="sm"
              class="font-mono text-xs shrink-0 px-2 py-0.5"
            >
              {{ currentJob.displayScore }}% Match
            </UBadge>
          </div>
        </div>

        <!-- Card Body: Details & AI match insights -->
        <div class="p-6 flex-1 space-y-5">
          <!-- Metadata row -->
          <div class="flex flex-wrap items-center gap-3 text-xs" style="color: var(--ink-subtle)">
            <span
              v-if="currentJob.workMode"
              class="px-2 py-0.5 rounded bg-bg-deep uppercase tracking-wider font-mono text-[10px]"
              >{{ currentJob.workMode }}</span
            >
            <span
              v-if="currentJob.employmentType"
              class="px-2 py-0.5 rounded bg-bg-deep uppercase tracking-wider font-mono text-[10px]"
              >{{ currentJob.employmentType }}</span
            >
            <span
              v-if="currentJob.salaryMinUzs || currentJob.salaryMaxUzs"
              class="font-medium text-ink-muted"
            >
              {{ formatSalary(currentJob.salaryMinUzs)
              }}<span v-if="currentJob.salaryMaxUzs">
                – {{ formatSalary(currentJob.salaryMaxUzs) }}</span
              >
            </span>
          </div>

          <!-- Skills tags -->
          <div v-if="currentJob.skills?.length" class="flex flex-wrap gap-1">
            <UBadge
              v-for="s in currentJob.skills"
              :key="s"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ s }}
            </UBadge>
          </div>

          <!-- Match Explanation (Why it fits) -->
          <div
            v-if="currentJob.matchExplanation"
            class="bg-accent-soft border border-line-soft rounded-xl p-4 space-y-3.5"
          >
            <h4 class="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              AI Matchmaker Analysis
            </h4>
            <p class="text-sm leading-relaxed text-ink-muted">
              {{ currentJob.matchExplanation }}
            </p>

            <!-- Split Panel: Left: Radar, Right: details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-line-soft">
              <!-- Radar Match breakdown -->
              <div class="h-44 flex flex-col justify-center items-center">
                <p
                  class="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-subtle mb-1 self-start"
                >
                  Alignment Map
                </p>
                <div class="w-full flex-1 relative">
                  <Radar :data="radarChartData(currentJob)" :options="radarChartOptions" />
                </div>
              </div>

              <!-- Strengths & Gaps -->
              <div class="space-y-3">
                <div v-if="currentJob.matchStrengths?.length">
                  <p class="text-xs font-semibold mb-1" style="color: var(--positive)">
                    Key Strengths
                  </p>
                  <ul class="space-y-0.5">
                    <li
                      v-for="s in currentJob.matchStrengths"
                      :key="s"
                      class="text-[11px] flex gap-1"
                      style="color: var(--ink-muted)"
                    >
                      <span style="color: var(--positive)">✓</span> {{ s }}
                    </li>
                  </ul>
                </div>
                <div v-if="currentJob.matchGaps?.length">
                  <p class="text-xs font-semibold mb-1" style="color: var(--warning)">
                    Considerations / Gaps
                  </p>
                  <ul class="space-y-0.5">
                    <li
                      v-for="g in currentJob.matchGaps"
                      :key="g"
                      class="text-[11px] flex gap-1"
                      style="color: var(--ink-muted)"
                    >
                      <span style="color: var(--warning)">△</span> {{ g }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Footer: Swiping actions -->
        <div class="p-6 border-t border-line bg-surface-2 flex items-center justify-center gap-4">
          <!-- Pass Button -->
          <UButton
            color="error"
            size="lg"
            variant="outline"
            icon="i-heroicons-x-mark"
            class="rounded-full w-14 h-14 flex items-center justify-center"
            aria-label="Pass"
            @click="handlePass"
          />

          <!-- Apply / Interested Button -->
          <template v-if="currentJob.application">
            <UBadge
              :color="appStatusColor(currentJob.application.status)"
              variant="subtle"
              size="md"
            >
              {{ capitalizeStatus(currentJob.application.status) }}
            </UBadge>
          </template>
          <template v-else>
            <UButton
              color="success"
              size="lg"
              icon="i-heroicons-heart"
              class="rounded-full w-14 h-14 flex items-center justify-center text-white"
              style="background: var(--positive)"
              :loading="applying.has(currentJob.id)"
              aria-label="Interested"
              @click="handleLike"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Job list (Classic) -->
    <div v-else class="space-y-3">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="rounded-lg overflow-hidden"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <!-- Main row -->
        <div class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <!-- Title + score badge -->
              <div class="flex items-center gap-2 mb-1">
                <a
                  :href="job.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium hover:underline"
                  style="color: var(--ink); font-size: 15px"
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
                  <span
                    v-if="job.aiScore != null"
                    class="ml-0.5"
                    style="opacity: 0.6; font-size: 9px"
                    >AI</span
                  >
                </UBadge>
              </div>

              <!-- Company + location -->
              <p class="text-sm mb-2" style="color: var(--ink-muted)">
                {{ job.company }}<span v-if="job.location"> · {{ job.location }}</span>
              </p>

              <!-- Meta row -->
              <div
                class="flex flex-wrap items-center gap-3 text-xs"
                style="color: var(--ink-subtle)"
              >
                <span v-if="job.workMode">{{ job.workMode }}</span>
                <span v-if="job.employmentType">{{ job.employmentType }}</span>
                <span v-if="job.salaryMinUzs || job.salaryMaxUzs">
                  {{ formatSalary(job.salaryMinUzs)
                  }}<span v-if="job.salaryMaxUzs"> – {{ formatSalary(job.salaryMaxUzs) }}</span>
                </span>
                <span v-if="job.postedAt">{{ formatPostedDate(job.postedAt) }}</span>
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                  "
                >
                  {{ job.source }}
                </span>
              </div>

              <!-- Skills -->
              <div v-if="job.skills.length" class="flex flex-wrap gap-1 mt-2">
                <UBadge
                  v-for="s in job.skills.slice(0, 6)"
                  :key="s"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  >{{ s }}</UBadge
                >
                <span v-if="job.skills.length > 6" class="text-xs" style="color: var(--ink-subtle)"
                  >+{{ job.skills.length - 6 }}</span
                >
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col items-end gap-2 shrink-0">
              <!-- Application status or apply button -->
              <template v-if="job.application">
                <UBadge :color="appStatusColor(job.application.status)" variant="subtle" size="sm">
                  {{ capitalizeStatus(job.application.status) }}
                </UBadge>
              </template>
              <template v-else>
                <UButton
                  size="sm"
                  icon="i-heroicons-paper-airplane"
                  :loading="applying.has(job.id)"
                  @click="applyToJob(job)"
                >
                  {{ t('candidate.jobs.apply') }}
                </UButton>
              </template>

              <!-- Expand for AI explanation -->
              <UButton
                v-if="job.matchExplanation"
                variant="ghost"
                size="xs"
                :icon="
                  expandedJob === job.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
                "
                @click="expandedJob = expandedJob === job.id ? null : job.id"
              />
            </div>
          </div>
        </div>

        <!-- AI explanation panel -->
        <div
          v-if="expandedJob === job.id && job.matchExplanation"
          class="px-4 pb-4 pt-4"
          style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
        >
          <p class="text-sm mb-4 leading-relaxed" style="color: var(--ink-muted)">
            {{ job.matchExplanation }}
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Radar Alignment Map -->
            <div class="h-44 flex flex-col justify-center items-center">
              <p
                class="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-subtle mb-1 self-start"
              >
                Alignment Map
              </p>
              <div class="w-full flex-1 relative">
                <Radar :data="radarChartData(job)" :options="radarChartOptions" />
              </div>
            </div>

            <!-- Strengths & Gaps checklists -->
            <div class="space-y-3">
              <div v-if="job.matchStrengths?.length">
                <p class="text-xs font-semibold mb-1" style="color: var(--positive)">Why it fits</p>
                <ul class="space-y-0.5">
                  <li
                    v-for="s in job.matchStrengths"
                    :key="s"
                    class="text-xs flex gap-1"
                    style="color: var(--ink-muted)"
                  >
                    <span style="color: var(--positive)">✓</span> {{ s }}
                  </li>
                </ul>
              </div>
              <div v-if="job.matchGaps?.length">
                <p class="text-xs font-semibold mb-1" style="color: var(--warning)">Gaps</p>
                <ul class="space-y-0.5">
                  <li
                    v-for="g in job.matchGaps"
                    :key="g"
                    class="text-xs flex gap-1"
                    style="color: var(--ink-muted)"
                  >
                    <span style="color: var(--warning)">△</span> {{ g }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="viewMode === 'list' && total > limit" class="flex justify-center pt-2">
      <UPagination v-model="page" :total="total" :page-size="limit" />
    </div>

    <!-- Pass Dismiss Feedback Modal -->
    <CommonConfirmModal
      v-model:open="showPassFeedback"
      title="Tell us why you passed"
      confirm-label="Dismiss Card"
      confirm-color="primary"
      @confirm="submitPassFeedback('Not Interested')"
    >
      <div class="space-y-3">
        <p class="text-xs text-ink-muted">
          Your feedback trains our AI Matchmaker to fetch better job fits for you in real-time.
        </p>
        <div class="flex flex-col gap-1.5">
          <UButton
            v-for="reason in passReasons"
            :key="reason"
            variant="outline"
            size="sm"
            class="justify-start font-mono text-xs text-left"
            @click="submitPassFeedback(reason)"
          >
            {{ reason }}
          </UButton>
        </div>
      </div>
    </CommonConfirmModal>
  </div>
</template>

<style scoped>
.activity-feed {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: 6px;
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
