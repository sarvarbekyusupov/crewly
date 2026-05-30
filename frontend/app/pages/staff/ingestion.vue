<script setup lang="ts">
import type { IngestionRun } from '~/types/api'

definePageMeta({ layout: 'staff', middleware: 'staff-auth' })

const { t } = useI18n()
const api = useStaffApi()
const toast = useToast()

const {
  data: runs,
  pending,
  refresh,
} = await useAsyncData('ingestion-runs', () =>
  api.get<IngestionRun[]>('/api/v1/staff/ingestion-runs'),
)

const {
  data: jobRuns,
  pending: jobRunsPending,
  refresh: refreshJobRuns,
} = await useAsyncData('job-discovery-runs', () =>
  api.get<any[]>('/api/v1/staff/job-discovery-runs').catch(() => []),
)

const triggerForm = reactive({
  source: 'hh.ru' as 'hh.ru' | 'linkedin',
  specialization: '1.221',
  text: '',
  keywords: '',
  location: '',
  maxPages: 5,
})

const jobDiscoveryForm = reactive({
  source: 'hh.ru' as 'hh.ru' | 'linkedin',
  query: '',
  location: '',
  maxPages: 5,
})

const triggering = ref(false)
const triggeringJobs = ref(false)

const { connect: connectSSE, disconnect: disconnectSSE } = useStaffEventStream()
const lastEvent = useLastStaffSseEvent()

watch(lastEvent, (event) => {
  if (!event) return
  const { type, payload } = event

  if (type === 'ingestion.progress') {
    if (!runs.value) return
    const idx = runs.value.findIndex((r) => r.id === payload.runId)
    if (idx !== -1) {
      const current = runs.value[idx]!
      runs.value[idx] = {
        ...current,
        status: payload.status,
        candidatesFetched: payload.fetched,
        candidatesNew: payload.created,
        candidatesUpdated: payload.updated,
        candidatesFailed: payload.failed,
        completedAt:
          payload.status === 'completed' || payload.status === 'failed'
            ? new Date().toISOString()
            : current.completedAt,
      }
    } else if (payload.status === 'running') {
      // Optional: refresh to get the new run if we missed the trigger callback
      refresh()
    }
  } else if (type === 'job_discovery.progress') {
    if (!jobRuns.value) return
    const idx = jobRuns.value.findIndex((r) => r.id === payload.runId)
    if (idx !== -1) {
      jobRuns.value[idx] = {
        ...jobRuns.value[idx],
        status: payload.status,
        jobsFetched: payload.fetched,
        jobsNew: payload.created,
        jobsUpdated: payload.updated,
        completedAt:
          payload.status === 'completed'
            ? new Date().toISOString()
            : jobRuns.value[idx].completedAt,
      }
    } else if (payload.status === 'running') {
      refreshJobRuns()
    }
  }
})

onMounted(() => connectSSE())
onUnmounted(() => disconnectSSE())

const sourceOptions = [
  { label: 'hh.ru', value: 'hh.ru' },
  { label: 'LinkedIn', value: 'linkedin' },
]

async function triggerIngestion() {
  triggering.value = true
  try {
    const payload: Record<string, unknown> = {
      source: triggerForm.source,
      maxPages: triggerForm.maxPages,
    }

    if (triggerForm.source === 'hh.ru') {
      if (triggerForm.specialization) payload.specialization = triggerForm.specialization
      if (triggerForm.text) payload.text = triggerForm.text
    } else {
      if (triggerForm.keywords) payload.keywords = triggerForm.keywords
      if (triggerForm.location) payload.location = triggerForm.location
    }

    const res = await api.post<{ jobId: string | number; queued: boolean }>(
      '/api/v1/staff/ingestion-runs',
      payload,
    )
    toast.add({
      title: t('staff.ingestionQueued'),
      description: `Job ID: ${res.jobId}`,
      color: 'success',
    })
    setTimeout(() => refresh(), 2000)
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    triggering.value = false
  }
}

async function triggerJobDiscovery() {
  triggeringJobs.value = true
  try {
    const res = await api.post<{ jobId: string | number; queued: boolean }>(
      '/api/v1/staff/job-discovery-runs',
      {
        source: jobDiscoveryForm.source,
        query: jobDiscoveryForm.query || undefined,
        location: jobDiscoveryForm.location || undefined,
        maxPages: jobDiscoveryForm.maxPages,
      },
    )
    toast.add({
      title: t('staff.jobDiscoveryQueued'),
      description: `Job ID: ${res.jobId}`,
      color: 'success',
    })
    setTimeout(() => refreshJobRuns(), 2000)
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    triggeringJobs.value = false
  }
}

function duration(run: { completedAt?: string; startedAt?: string }) {
  if (!run.completedAt || !run.startedAt) return '—'
  const ms = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`
}

const columns: any[] = [
  { key: 'source', label: 'Source' },
  { key: 'trigger', label: 'Trigger' },
  { key: 'status', label: 'Status' },
  { key: 'stats', label: 'Fetched / New / Updated / Failed' },
  { key: 'startedAt', label: 'Started' },
  { key: 'duration', label: 'Duration' },
]

const jobColumns: any[] = [
  { key: 'source', label: 'Source' },
  { key: 'trigger', label: 'Trigger' },
  { key: 'status', label: 'Status' },
  { key: 'stats', label: 'Fetched / New / Updated' },
  { key: 'startedAt', label: 'Started' },
  { key: 'duration', label: 'Duration' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <p
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ink-subtle);
          margin-bottom: 8px;
        "
      >
        Staff · Data
      </p>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -0.035em;
          color: var(--ink);
          font-weight: 400;
        "
        class="sm:text-3xl"
      >
        Ingestion
      </h1>
    </div>

    <!-- Candidate ingestion trigger -->
    <UCard>
      <template #header>
        <h2 class="section-label">Trigger candidate ingestion</h2>
      </template>
      <form class="space-y-4" @submit.prevent="triggerIngestion">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UFormField label="Source">
            <USelect v-model="triggerForm.source" :options="sourceOptions" class="w-full" />
          </UFormField>

          <template v-if="triggerForm.source === 'hh.ru'">
            <UFormField label="Specialization">
              <UInput
                v-model="triggerForm.specialization"
                placeholder="e.g. 1.221"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Search text">
              <UInput
                v-model="triggerForm.text"
                placeholder="e.g. Python developer"
                class="w-full"
              />
            </UFormField>
          </template>

          <template v-else>
            <UFormField label="Keywords">
              <UInput
                v-model="triggerForm.keywords"
                placeholder="e.g. Python developer"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Location">
              <UInput v-model="triggerForm.location" placeholder="e.g. Tashkent" class="w-full" />
            </UFormField>
          </template>

          <UFormField label="Max pages">
            <UInput
              v-model.number="triggerForm.maxPages"
              type="number"
              min="1"
              max="20"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="flex justify-end">
          <UButton type="submit" :loading="triggering" icon="i-heroicons-play">
            Start ingestion
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Candidate ingestion runs table -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="section-label">Recent ingestion runs</h2>
          <UButton variant="ghost" size="xs" icon="i-heroicons-arrow-path" @click="() => refresh()" />
        </div>
      </template>
      <UTable
        :data="runs ?? []"
        :columns="columns"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-arrow-down-tray', label: 'No ingestion runs' }"
      >
        <template #source-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink)">{{ row.source?.name ?? '—' }}</span>
        </template>
        <template #trigger-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{ row.trigger }}</span>
        </template>
        <template #status-cell="{ row: { original: row } }">
          <UBadge :color="ingestionStatusColor(row.status)" variant="subtle" size="xs">{{
            row.status
          }}</UBadge>
        </template>
        <template #stats-cell="{ row: { original: row } }">
          <span class="text-sm font-mono" style="color: var(--ink)">
            {{ row.candidatesFetched }} /
            <span class="text-green-400">{{ row.candidatesNew }}</span> /
            <span style="color: var(--accent)">{{ row.candidatesUpdated }}</span> /
            <span class="text-red-400">{{ row.candidatesFailed }}</span>
          </span>
        </template>
        <template #startedAt-cell="{ row: { original: row } }">
          <span class="text-xs" style="color: var(--ink-muted)">{{
            formatDateTime(row.startedAt)
          }}</span>
        </template>
        <template #duration-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{ duration(row) }}</span>
        </template>
      </UTable>
    </UCard>

    <!-- Job discovery trigger -->
    <UCard>
      <template #header>
        <h2 class="section-label">Trigger job discovery</h2>
      </template>
      <form class="space-y-4" @submit.prevent="triggerJobDiscovery">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UFormField label="Source">
            <USelect v-model="jobDiscoveryForm.source" :options="sourceOptions" class="w-full" />
          </UFormField>
          <UFormField label="Search query">
            <UInput
              v-model="jobDiscoveryForm.query"
              placeholder="e.g. Python developer"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Location">
            <UInput
              v-model="jobDiscoveryForm.location"
              placeholder="e.g. Tashkent"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Max pages">
            <UInput
              v-model.number="jobDiscoveryForm.maxPages"
              type="number"
              min="1"
              max="20"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="flex justify-end">
          <UButton type="submit" :loading="triggeringJobs" icon="i-heroicons-magnifying-glass">
            Discover jobs
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Job discovery runs -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="section-label">Recent job discovery runs</h2>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-heroicons-arrow-path"
            @click="() => refreshJobRuns()"
          />
        </div>
      </template>
      <UTable
        :data="jobRuns ?? []"
        :columns="jobColumns"
        :loading="jobRunsPending"
        :empty-state="{ icon: 'i-heroicons-briefcase', label: 'No job discovery runs' }"
      >
        <template #source-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink)">{{ row.source }}</span>
        </template>
        <template #trigger-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{ row.trigger }}</span>
        </template>
        <template #status-cell="{ row: { original: row } }">
          <UBadge :color="ingestionStatusColor(row.status)" variant="subtle" size="xs">{{
            row.status
          }}</UBadge>
        </template>
        <template #stats-cell="{ row: { original: row } }">
          <span class="text-sm font-mono" style="color: var(--ink)">
            {{ row.jobsFetched }} / <span class="text-green-400">{{ row.jobsNew }}</span> /
            <span style="color: var(--accent)">{{ row.jobsUpdated }}</span>
          </span>
        </template>
        <template #startedAt-cell="{ row: { original: row } }">
          <span class="text-xs" style="color: var(--ink-muted)">{{
            formatDateTime(row.startedAt)
          }}</span>
        </template>
        <template #duration-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{ duration(row) }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
