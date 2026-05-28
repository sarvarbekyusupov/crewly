<script setup lang="ts">
import type { DiscoveredJob, PaginatedResponse } from '~/types/api'

definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()

useHead({ title: 'Job Discovery' })

const search = ref('')
const workMode = ref('')
const minScore = ref(0)
const sortBy = ref<'recent' | 'score'>('recent')
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
      ...(workMode.value && { workMode: workMode.value }),
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

const workModeOptions = [
  { label: 'All modes', value: '' },
  { label: 'Office', value: 'office' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' },
]

const sortOptions = [
  { label: 'Most recent', value: 'recent' },
  { label: 'Best match', value: 'score' },
]

const scoringInProgress = ref(false)

async function triggerScoring() {
  scoringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/score', {})
    toast.add({
      title: 'AI scoring queued',
      description: 'Scores will appear in 1-2 minutes.',
      color: 'success',
    })
  } catch {
    toast.add({ title: 'Could not queue scoring', color: 'error' })
  } finally {
    scoringInProgress.value = false
  }
}

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

function scoreColor(score: number | null | undefined) {
  if (score == null) return 'neutral'
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

function appStatusColor(status: string) {
  const map: Record<string, string> = {
    queued: 'warning',
    applied: 'primary',
    viewed: 'info',
    interview: 'success',
    rejected: 'error',
    offer: 'success',
    failed: 'error',
  }
  return map[status] ?? 'neutral'
}

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
            Job Discovery
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
            Open Positions
          </h1>
          <p class="mt-1 text-sm" style="color: var(--ink-muted)">
            {{ total }} jobs matching your profile.
          </p>
        </div>
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-sparkles"
          :loading="scoringInProgress"
          @click="triggerScoring"
        >
          AI Score All
        </UButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search jobs..."
        class="max-w-xs"
      />
      <USelect v-model="workMode" :options="workModeOptions" size="sm" class="w-36" />
      <USelect v-model="sortBy" :options="sortOptions" size="sm" class="w-36" />
      <div class="flex items-center gap-2 text-sm" style="color: var(--ink-muted)">
        <span>Min score:</span>
        <UInput
          v-model.number="minScore"
          type="number"
          min="0"
          max="100"
          step="10"
          class="w-20"
          size="sm"
        />
      </div>
      <UButton
        variant="ghost"
        size="sm"
        icon="i-heroicons-arrow-path"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!pending && !jobs.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon name="i-heroicons-briefcase" class="w-12 h-12" style="color: var(--ink-subtle)" />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        No jobs found
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        Try adjusting filters or run AI scoring to improve ranking.
      </p>
    </div>

    <!-- Job list -->
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
                  {{ job.application.status }}
                </UBadge>
              </template>
              <template v-else>
                <UButton
                  size="sm"
                  icon="i-heroicons-paper-airplane"
                  :loading="applying.has(job.id)"
                  @click="applyToJob(job)"
                >
                  Apply
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
          class="px-4 pb-4 pt-0"
          style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
        >
          <p class="text-sm mb-3" style="color: var(--ink-muted)">{{ job.matchExplanation }}</p>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="job.matchStrengths?.length">
              <p class="text-xs font-medium mb-1" style="color: var(--positive)">Why it fits</p>
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
              <p class="text-xs font-medium mb-1" style="color: var(--warning)">Gaps</p>
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

    <!-- Pagination -->
    <div v-if="total > limit" class="flex justify-center pt-2">
      <UPagination v-model="page" :total="total" :page-size="limit" />
    </div>
  </div>
</template>
