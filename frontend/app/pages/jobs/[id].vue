<script setup lang="ts">
import type { Job, Application, PaginatedResponse, HhResumeViewItem } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const jobId = route.params.id as string

const {
  data: job,
  pending,
  refresh: refreshJob,
} = await useAsyncData(`job-${jobId}`, () => api.get<Job>(`/api/v1/jobs/${jobId}`))

const { data: appsResult, refresh: refreshApps } = await useAsyncData(`job-${jobId}-apps`, () =>
  api.get<PaginatedResponse<Application>>(`/api/v1/jobs/${jobId}/applications`),
)
const applications = computed(() => appsResult.value?.data ?? [])

const { data: stats } = await useAsyncData(`job-${jobId}-stats`, () =>
  api.get<Record<string, number | { views: number; responses: number }>>(
    `/api/v1/jobs/${jobId}/stats`,
  ),
)

const hhStats = computed(() => stats.value?.hh as { views: number; responses: number } | undefined)
const pipelineStats = computed(() => {
  if (!stats.value) return {}
  return Object.fromEntries(Object.entries(stats.value).filter(([k]) => k !== 'hh')) as Record<
    string,
    number
  >
})

const statsMaxCount = computed(() => {
  const vals = Object.values(pipelineStats.value)
  return vals.length ? Math.max(...(vals as number[])) : 1
})

const hhViewersOpen = ref(false)
const {
  data: hhViewers,
  pending: hhViewersPending,
  refresh: refreshViewers,
} = useAsyncData(
  `job-${jobId}-viewers`,
  () =>
    job.value?.hhVacancyId
      ? api.get<HhResumeViewItem[]>(`/api/v1/jobs/${jobId}/hh-viewers`)
      : Promise.resolve([]),
  { immediate: false },
)

watch(hhViewersOpen, (open) => {
  if (open) refreshViewers()
})

const hhPublishing = ref(false)
async function publishToHh() {
  hhPublishing.value = true
  try {
    await api.post(`/api/v1/jobs/${jobId}/publish-hh`, {})
    toast.add({ title: 'Published to HH', color: 'success' })
    refreshJob()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    hhPublishing.value = false
  }
}

async function archiveOnHh() {
  try {
    await api.post(`/api/v1/jobs/${jobId}/archive-hh`, {})
    toast.add({ title: 'Archived on HH', color: 'success' })
    refreshJob()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function prolongOnHh() {
  try {
    await api.post(`/api/v1/jobs/${jobId}/prolong-hh`, {})
    toast.add({ title: 'Prolonged on HH', color: 'success' })
    refreshJob()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const hasMatchedCandidates = computed(() => applications.value.some((a) => a.status === 'matched'))
const outreachLoading = ref(false)

const { jobStatusLabel, appStatusLabel } = useStatusLabels()

useHead({ title: computed(() => job.value?.title ?? t('jobs.title')) })

const { setBreadcrumbLabel } = useBreadcrumb()
watch(
  () => job.value?.title,
  (title) => {
    if (title) setBreadcrumbLabel(title)
  },
  { immediate: true },
)

async function activate() {
  await api.post(`/api/v1/jobs/${jobId}/activate`)
  toast.add({ title: t('common.success'), color: 'success' })
  refreshJob()
  refreshNuxtData('nav-counts')
}

async function startOutreach() {
  outreachLoading.value = true
  try {
    const res = await api.post<{ queued: number }>(`/api/v1/jobs/${jobId}/send-outreach`, {})
    toast.add({ title: t('jobs.outreachQueued', { count: res.queued }), color: 'success' })
    refreshApps()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    outreachLoading.value = false
  }
}

async function pause() {
  await api.post(`/api/v1/jobs/${jobId}/pause`)
  toast.add({ title: t('common.success'), color: 'success' })
  refreshJob()
  refreshNuxtData('nav-counts')
}

async function close() {
  await api.post(`/api/v1/jobs/${jobId}/close`)
  toast.add({ title: t('common.success'), color: 'success' })
  refreshJob()
  refreshNuxtData('nav-counts')
}

const appColumns: any[] = [
  { key: 'candidate', label: t('candidates.title') },
  { key: 'matchScore', label: t('applications.matchScore') },
  { key: 'status', label: t('common.status') },
  { key: 'actions', label: '' },
]
</script>

<template>
  <CommonListSkeleton v-if="pending" />

  <div v-else-if="job" class="space-y-6">
    <!-- Hero header -->
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex flex-col lg:flex-row items-start justify-between gap-6">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <NuxtLink to="/jobs" style="color: var(--ink-muted)">
              <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
            </NuxtLink>
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--ink-subtle);
              "
            >
              {{ t('jobs.breadcrumb') }}
            </p>
            <UBadge :color="jobStatusColor(job.status)" variant="subtle" size="xs">
              {{ jobStatusLabel(job.status) }}
            </UBadge>
          </div>
          <h1
            style="
              font-family: 'Fraunces', serif;
              font-size: 28px;
              line-height: 1.05;
              letter-spacing: -0.035em;
              color: var(--ink);
              font-weight: 400;
            "
            class="sm:text-3xl lg:text-[32px]"
          >
            {{ job.title }}
          </h1>
          <p style="color: var(--ink-muted); font-size: 14px; margin-top: 6px">
            {{ job.workMode }} · {{ job.employmentType
            }}<span v-if="job.officeLocation"> · {{ job.officeLocation }}</span>
          </p>
        </div>
        <div
          v-if="auth.can('hiring_manager')"
          class="flex flex-wrap gap-2 shrink-0 w-full lg:w-auto"
        >
          <UButton
            size="sm"
            variant="ghost"
            icon="i-heroicons-pencil-square"
            :to="`/jobs/${jobId}/edit`"
            class="flex-1 lg:flex-none justify-center"
            >{{ t('common.edit') }}</UButton
          >
          <UButton
            size="sm"
            variant="ghost"
            icon="i-heroicons-document-duplicate"
            :to="`/jobs/create?from=${jobId}`"
            class="flex-1 lg:flex-none justify-center"
            >{{ t('jobs.duplicate') }}</UButton
          >
          <UButton
            v-if="job.status === 'draft'"
            size="sm"
            class="flex-1 lg:flex-none justify-center"
            @click="activate"
            >{{ t('jobs.activate') }}</UButton
          >
          <UButton
            v-if="job.status === 'active' && hasMatchedCandidates"
            size="sm"
            icon="i-heroicons-paper-airplane"
            :loading="outreachLoading"
            class="flex-1 lg:flex-none justify-center"
            @click="startOutreach"
            >{{ t('jobs.startOutreach') }}</UButton
          >
          <UButton
            v-if="job.status === 'active'"
            size="sm"
            variant="outline"
            class="flex-1 lg:flex-none justify-center"
            @click="pause"
            >{{ t('jobs.pause') }}</UButton
          >
          <UButton
            v-if="job.status !== 'cancelled' && job.status !== 'filled'"
            size="sm"
            color="error"
            variant="outline"
            class="flex-1 lg:flex-none justify-center"
            @click="close"
            >{{ t('jobs.close') }}</UButton
          >
          <!-- HH controls -->
          <UButton
            v-if="!job.hhVacancyId && job.status !== 'draft'"
            size="sm"
            variant="outline"
            icon="i-heroicons-arrow-up-tray"
            :loading="hhPublishing"
            class="flex-1 lg:flex-none justify-center"
            @click="publishToHh"
            >Publish to HH</UButton
          >
          <UButton
            v-if="job.hhVacancyId"
            size="sm"
            variant="outline"
            icon="i-heroicons-clock"
            class="flex-1 lg:flex-none justify-center"
            @click="prolongOnHh"
            >Prolong HH</UButton
          >
          <UButton
            v-if="job.hhVacancyId"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-heroicons-archive-box"
            class="flex-1 lg:flex-none justify-center"
            @click="archiveOnHh"
            >Archive HH</UButton
          >
        </div>
      </div>
    </div>

    <JobPipelineHub
      :job="job"
      :applications="applications"
      :stats="stats"
      :outreach-loading="outreachLoading"
      :has-matched-candidates="hasMatchedCandidates"
      @outreach="startOutreach"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main info -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Sourcing Strategy Memo -->
        <div
          v-if="job.sourcingStrategy"
          class="rounded-2xl p-5 mb-1"
          style="background: var(--paper); border: 1px solid var(--line)"
        >
          <div class="flex items-center gap-2 mb-4">
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--ink-subtle);
              "
            >
              Agent: Sourcing Hunter
            </p>
          </div>
          <h3
            style="
              font-family: 'Fraunces', serif;
              font-size: 18px;
              letter-spacing: -0.02em;
              color: var(--ink);
              font-weight: 400;
              margin-bottom: 12px;
            "
          >
            Strategic Sourcing Memo
          </h3>

          <div
            v-if="job.sourcingStrategy.approach_summary"
            class="mb-6 text-[13.5px] leading-relaxed italic border-l-3 border-accent pl-4 py-1"
            style="color: var(--ink-muted); background: var(--bg-deep)"
          >
            "{{ job.sourcingStrategy.approach_summary }}"
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[13px]">
            <div v-if="job.sourcingStrategy.target_companies?.length">
              <p class="section-label-tiny text-ink-subtle mb-3">Target Companies (Raiding)</p>
              <ul class="space-y-1.5">
                <li
                  v-for="c in job.sourcingStrategy.target_companies"
                  :key="c"
                  class="flex items-center gap-2 text-ink"
                >
                  <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5 text-accent" />
                  {{ c }}
                </li>
              </ul>
            </div>
            <div v-if="job.sourcingStrategy.niche_sources?.length">
              <p class="section-label-tiny text-ink-subtle mb-3">Niche Communities & Events</p>
              <ul class="space-y-1.5">
                <li
                  v-for="s in job.sourcingStrategy.niche_sources"
                  :key="s"
                  class="flex items-center gap-2 text-ink"
                >
                  <UIcon name="i-heroicons-user-group" class="w-3.5 h-3.5 text-positive" />
                  {{ s }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <UCard>
          <h3 class="section-label mb-3">{{ t('jobs.description') }}</h3>
          <p class="whitespace-pre-wrap text-sm leading-relaxed" style="color: var(--ink-muted)">
            {{ job.description }}
          </p>
        </UCard>

        <!-- AI-parsed requirements — visible only in draft so recruiter can review before activating -->
        <UCard v-if="job.status === 'draft' && job.parsedRequirements">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="section-label">
                AI-Parsed Requirements
                <span style="color: var(--ink-subtle); font-weight: 400"
                  >(review before activating)</span
                >
              </h3>
              <UBadge color="warning" variant="subtle" size="xs">{{
                t('jobs.status.draft')
              }}</UBadge>
            </div>
          </template>
          <div class="space-y-4 text-sm">
            <div v-if="job.parsedRequirements.seniority">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  color: var(--ink-subtle);
                  margin-bottom: 6px;
                "
              >
                Seniority
              </p>
              <UBadge color="neutral" variant="subtle">{{
                job.parsedRequirements.seniority
              }}</UBadge>
            </div>
            <div v-if="job.parsedRequirements.tech_stack?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  color: var(--ink-subtle);
                  margin-bottom: 6px;
                "
              >
                Tech Stack
              </p>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="tech in job.parsedRequirements.tech_stack"
                  :key="tech"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  >{{ tech }}</UBadge
                >
              </div>
            </div>
            <div v-if="job.parsedRequirements.key_responsibilities?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  color: var(--ink-subtle);
                  margin-bottom: 6px;
                "
              >
                Key Responsibilities
              </p>
              <ul class="space-y-1" style="color: var(--ink-muted)">
                <li
                  v-for="r in job.parsedRequirements.key_responsibilities"
                  :key="r"
                  class="flex gap-2 items-start text-xs"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-4 h-4 shrink-0 mt-0.5"
                    style="color: var(--positive)"
                  />
                  {{ r }}
                </li>
              </ul>
            </div>
            <div v-if="job.parsedRequirements.soft_skills?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  color: var(--ink-subtle);
                  margin-bottom: 6px;
                "
              >
                Soft Skills
              </p>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="s in job.parsedRequirements.soft_skills"
                  :key="s"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  >{{ s }}</UBadge
                >
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <h3 class="section-label mb-3">{{ t('jobs.fields.requiredSkills') }}</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="s in job.requiredSkills" :key="s" color="primary" variant="subtle">{{
              s
            }}</UBadge>
            <span
              v-if="!job.requiredSkills?.length"
              class="text-sm"
              style="color: var(--ink-subtle)"
              >—</span
            >
          </div>
          <h3 class="section-label mt-5 mb-3">{{ t('jobs.fields.niceToHaveSkills') }}</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="s in job.niceToHaveSkills" :key="s" color="neutral" variant="subtle">{{
              s
            }}</UBadge>
            <span
              v-if="!job.niceToHaveSkills?.length"
              class="text-sm"
              style="color: var(--ink-subtle)"
              >—</span
            >
          </div>
        </UCard>
      </div>

      <!-- Side info -->
      <div class="space-y-4">
        <UCard>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('jobs.fields.feePercentage') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ job.feePercentage }}%</dd>
            </div>
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('jobs.fields.feeBasis') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ job.feeBasis }}</dd>
            </div>
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('jobs.fields.salaryMin') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ formatSalary(job.salaryMinUzs) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('jobs.fields.salaryMax') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ formatSalary(job.salaryMaxUzs) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('candidates.fields.experience') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{
                  t('jobs.experience', {
                    min: job.minExperienceYears ?? 0,
                    max: job.maxExperienceYears ?? '?',
                  })
                }}
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- Stats pipeline funnel -->
        <UCard v-if="stats">
          <h3 class="section-label mb-4">{{ t('jobs.stats') }}</h3>
          <div class="space-y-2.5">
            <div v-for="(count, status) in pipelineStats" :key="status" class="text-sm">
              <div class="flex justify-between items-center mb-1">
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--ink-subtle);
                  "
                >
                  {{ appStatusLabel(String(status)) }}
                </span>
                <span
                  class="font-medium"
                  style="
                    color: var(--ink);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12px;
                  "
                  >{{ count }}</span
                >
              </div>
              <div class="rounded-full h-1.5 overflow-hidden" style="background: var(--bg-deep)">
                <div
                  class="h-1.5 rounded-full transition-all"
                  :style="{
                    width: `${Math.min(100, Math.round(((count as number) / statsMaxCount) * 100))}%`,
                    background:
                      appStatusColor(status as string) === 'success'
                        ? 'var(--positive)'
                        : appStatusColor(status as string) === 'error'
                          ? 'var(--accent)'
                          : appStatusColor(status as string) === 'warning'
                            ? 'var(--warn)'
                            : 'var(--ink-subtle)',
                  }"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- HH stats + viewers -->
        <UCard v-if="job.hhVacancyId">
          <div class="flex items-center justify-between mb-3">
            <h3 class="section-label">HH.ru</h3>
            <UBadge color="neutral" variant="subtle" size="xs">{{ job.hhVacancyId }}</UBadge>
          </div>
          <div v-if="hhStats" class="grid grid-cols-2 gap-3 mb-4">
            <div
              class="rounded-lg p-3 text-center"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <p
                style="font-family: 'JetBrains Mono', monospace; font-size: 22px; color: var(--ink)"
              >
                {{ hhStats.views }}
              </p>
              <p style="font-size: 11px; color: var(--ink-subtle); margin-top: 2px">Views</p>
            </div>
            <div
              class="rounded-lg p-3 text-center"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <p
                style="font-family: 'JetBrains Mono', monospace; font-size: 22px; color: var(--ink)"
              >
                {{ hhStats.responses }}
              </p>
              <p style="font-size: 11px; color: var(--ink-subtle); margin-top: 2px">Responses</p>
            </div>
          </div>
          <UButton
            size="xs"
            variant="outline"
            block
            icon="i-heroicons-eye"
            :loading="hhViewersPending"
            @click="hhViewersOpen = !hhViewersOpen"
          >
            {{ hhViewersOpen ? 'Hide' : 'Show' }} Resume Viewers
          </UButton>
          <div v-if="hhViewersOpen && hhViewers?.length" class="mt-3 space-y-2">
            <div
              v-for="v in hhViewers"
              :key="v.resume.id"
              class="flex items-center justify-between py-2 text-xs"
              style="border-bottom: 1px solid var(--line-soft)"
            >
              <div>
                <p style="color: var(--ink); font-weight: 500">
                  {{ v.resume.title ?? v.resume.id }}
                </p>
                <p style="color: var(--ink-subtle)">{{ v.employer.name }}</p>
              </div>
              <p style="color: var(--ink-subtle); font-family: 'JetBrains Mono', monospace">
                {{ new Date(v.viewed_at).toLocaleDateString() }}
              </p>
            </div>
          </div>
          <p
            v-else-if="hhViewersOpen && !hhViewersPending"
            class="mt-3 text-xs text-center"
            style="color: var(--ink-subtle)"
          >
            No viewers yet
          </p>
        </UCard>
      </div>
    </div>

    <!-- Applications table -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <h2 class="section-label">{{ t('applications.title') }} ({{ appsResult?.total ?? 0 }})</h2>
      </template>
      <UTable :data="(applications) as any[]" :columns="appColumns">
        <template #empty>
          <div class="py-10 text-center" style="color: var(--ink-subtle); font-size: 13px">
            {{ t('applications.empty') }}
          </div>
        </template>
        <template #candidate-cell="{ row: { original: row } }">
          <div class="flex items-center gap-3">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs"
              style="
                background: var(--accent-soft);
                color: var(--accent);
                font-family: 'Fraunces', serif;
                font-style: italic;
              "
            >
              {{ row.candidate?.fullName?.[0] ?? '?' }}
            </div>
            <div>
              <p class="font-medium" style="color: var(--ink)">
                {{ row.candidate?.fullName ?? '—' }}
              </p>
              <p class="text-xs" style="color: var(--ink-subtle)">
                {{ row.candidate?.currentPosition ?? '—' }}
              </p>
            </div>
          </div>
        </template>
        <template #matchScore-cell="{ row: { original: row } }">
          <span class="font-mono" style="color: var(--ink-muted)">{{
            row.matchScore ? Number(row.matchScore).toFixed(1) : '—'
          }}</span>
        </template>
        <template #status-cell="{ row: { original: row } }">
          <UBadge :color="appStatusColor(row.status)" variant="subtle" size="xs">
            {{ appStatusLabel(row.status) }}
          </UBadge>
        </template>
        <template #actions-cell="{ row: { original: row } }">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-heroicons-eye"
            :to="`/applications/${row.id}`"
          />
        </template>
      </UTable>
    </UCard>
  </div>

  <div v-else class="py-24 text-center space-y-3">
    <p style="color: var(--ink-muted)">{{ t('common.notFound') }}</p>
    <UButton variant="outline" size="sm" @click="() => refreshJob()">{{ t('common.retry') }}</UButton>
  </div>
</template>
