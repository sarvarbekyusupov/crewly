<script setup lang="ts">
import { type Job, type AgentActivityResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const api = useApi()
useHead({ title: 'Analytics' })

interface FunnelRow {
  stage: string
  count: number
  rate: number
}
interface TimingRow {
  matchToOutreach: number | null
  outreachToResponse: number | null
  responseToDelivery: number | null
  deliveryToInterview: number | null
  interviewToHire: number | null
}
interface SourcingRow {
  source: string
  count: number
}
interface OutcomesRow {
  totalHired: number
  totalRejected: number
  monthHired: number
  monthRejected: number
}

const selectedJobId = ref<string>('')

const { data: jobs } = useAsyncData('analytics-jobs', () =>
  api.get<{ data: Job[] }>('/api/v1/jobs').then(res => res.data).catch(() => [] as Job[])
)

const jobOptions = computed(() => {
  const options = [{ id: '', title: 'All Jobs' }]
  if (jobs.value) {
    options.push(...jobs.value.map(j => ({ id: j.id, title: j.title })))
  }
  return options
})

const currentJobQuery = computed(() => selectedJobId.value ? { jobId: selectedJobId.value } : undefined)

const { data: funnelRes } = useAsyncData('analytics-pipeline', () =>
  api.get<FunnelRow[]>('/api/v1/analytics/pipeline', { query: currentJobQuery.value }).catch(() => [] as FunnelRow[]),
  { watch: [selectedJobId] }
)
const { data: timingRes } = useAsyncData('analytics-timing', () =>
  api.get<TimingRow>('/api/v1/analytics/timing', { query: currentJobQuery.value }).catch(() => null),
  { watch: [selectedJobId] }
)
const { data: sourcingRes } = useAsyncData('analytics-sourcing', () =>
  api.get<SourcingRow[]>('/api/v1/analytics/sourcing', { query: currentJobQuery.value }).catch(() => [] as SourcingRow[]),
  { watch: [selectedJobId] }
)
const { data: outcomesRes } = useAsyncData('analytics-outcomes', () =>
  api.get<OutcomesRow>('/api/v1/analytics/outcomes', { query: currentJobQuery.value }).catch(() => null),
  { watch: [selectedJobId] }
)
const { data: agentsRes } = useAsyncData('analytics-agents', () =>
  api.get<AgentActivityResponse>('/api/v1/analytics/agents', { query: currentJobQuery.value }).catch(() => null),
  { watch: [selectedJobId] }
)

const funnel = computed(() => funnelRes.value ?? [])
const timing = computed(() => timingRes.value)
const sourcing = computed(() => sourcingRes.value ?? [])
const outcomes = computed(() => outcomesRes.value)
const agents = computed(() => agentsRes.value)

const funnelMax = computed(() => Math.max(...funnel.value.map((r) => r.count), 1))

const STAGE_LABELS: Record<string, string> = {
  matched: 'Matched',
  outreach_sent: 'Outreach sent',
  responded: 'Responded',
  screening: 'Screening',
  screened_pass: 'Screened pass',
  delivered: 'Delivered',
  interview_scheduled: 'Interview',
  interviewed: 'Interviewed',
  offered: 'Offered',
  hired: 'Hired',
}

function fmtHours(h: number | null | undefined) {
  if (h == null) return '—'
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const timingRows = computed(() => {
  const t = timing.value
  if (!t) return []
  return [
    { label: 'Match → Outreach', value: t.matchToOutreach },
    { label: 'Outreach → Response', value: t.outreachToResponse },
    { label: 'Response → Delivery', value: t.responseToDelivery },
    { label: 'Delivery → Interview', value: t.deliveryToInterview },
    { label: 'Interview → Hire', value: t.interviewToHire },
  ]
})

const sourcingTotal = computed(() => sourcing.value.reduce((s, r) => s + r.count, 0) || 1)
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4" style="border-bottom: 1px solid var(--line)">
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
          Insights
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
          Analytics
        </h1>
      </div>
      
      <div class="w-full sm:w-64">
        <USelectMenu
          v-model="selectedJobId"
          :options="jobOptions"
          value-attribute="id"
          option-attribute="title"
          placeholder="Filter by job..."
        />
      </div>
    </div>

    <!-- Outcomes KPI row -->
    <div v-if="outcomes" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="kpi in [
          { label: 'Total hired', value: outcomes.totalHired, color: 'var(--positive)' },
          { label: 'This month hired', value: outcomes.monthHired, color: 'var(--positive)' },
          { label: 'Total rejected', value: outcomes.totalRejected, color: 'var(--negative)' },
          { label: 'This month rejected', value: outcomes.monthRejected, color: 'var(--negative)' },
        ]"
        :key="kpi.label"
        class="rounded-lg p-4"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <p class="text-xs mb-1" style="color: var(--ink-subtle)">{{ kpi.label }}</p>
        <div
          style="font-family: 'Fraunces', serif; font-size: 32px; font-weight: 400; line-height: 1"
          :style="{ color: kpi.color }"
        >
          {{ kpi.value }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Pipeline funnel (2/3 width) -->
      <div class="lg:col-span-2">
        <UCard>
          <h2 class="section-label mb-4">Pipeline Funnel</h2>
          <div v-if="!funnel.length" class="text-center py-8" style="color: var(--ink-subtle)">
            No data yet
          </div>
          <div v-else class="space-y-2">
            <div v-for="row in funnel" :key="row.stage" class="flex items-center gap-3">
              <span class="text-xs w-32 shrink-0 text-right" style="color: var(--ink-muted)">
                {{ STAGE_LABELS[row.stage] ?? row.stage }}
              </span>
              <div
                class="flex-1 h-5 rounded-sm overflow-hidden"
                style="background: var(--bg-elevated)"
              >
                <div
                  class="h-full rounded-sm transition-all duration-500"
                  :style="{
                    width: funnelMax > 0 ? `${(row.count / funnelMax) * 100}%` : '0%',
                    background: row.stage === 'hired' ? 'var(--positive)' : 'var(--accent)',
                    minWidth: row.count > 0 ? '4px' : '0',
                  }"
                />
              </div>
              <span class="text-xs font-mono w-16 shrink-0" style="color: var(--ink-muted)">
                {{ row.count }} <span style="color: var(--ink-subtle)">({{ row.rate }}%)</span>
              </span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Sourcing breakdown (1/3) -->
      <div>
        <UCard>
          <h2 class="section-label mb-4">Sourcing Channels</h2>
          <div v-if="!sourcing.length" class="text-center py-8" style="color: var(--ink-subtle)">
            No data yet
          </div>
          <div v-else class="space-y-3">
            <div v-for="row in sourcing" :key="row.source" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span style="color: var(--ink-muted)">{{ row.source }}</span>
                <span class="font-mono" style="color: var(--ink-subtle)">{{ row.count }}</span>
              </div>
              <div
                class="h-1.5 rounded-full overflow-hidden"
                style="background: var(--bg-elevated)"
              >
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${(row.count / sourcingTotal) * 100}%`,
                    background: 'var(--accent)',
                  }"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Stage timing -->
    <UCard>
      <h2 class="section-label mb-4">Average Time Per Stage</h2>
      <div v-if="!timingRows.length" class="text-center py-6" style="color: var(--ink-subtle)">
        No data yet
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div
          v-for="row in timingRows"
          :key="row.label"
          class="rounded-lg p-3 text-center"
          style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
        >
          <p class="text-xs mb-1" style="color: var(--ink-subtle)">{{ row.label }}</p>
          <p
            style="
              font-family: 'Fraunces', serif;
              font-size: 22px;
              color: var(--ink);
              font-weight: 400;
            "
          >
            {{ fmtHours(row.value) }}
          </p>
        </div>
      </div>
    </UCard>
    
    <!-- Agent Performance -->
    <div v-if="agents">
      <h2 class="section-label mb-4 mt-8">Agent Performance</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Costs by Agent</h3>
          <div v-if="!agents.stats.length" class="text-center py-4" style="color: var(--ink-subtle)">
            No data yet
          </div>
          <div v-else class="space-y-4">
            <div v-for="stat in agents.stats" :key="stat.agent" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium" style="color: var(--ink)">{{ stat.agent }}</p>
                <p class="text-xs" style="color: var(--ink-subtle)">{{ stat.count }} calls</p>
              </div>
              <p class="font-mono text-sm" style="color: var(--ink)">${{ stat.totalCost.toFixed(4) }}</p>
            </div>
          </div>
        </UCard>
        
        <UCard>
          <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Recent Activity</h3>
          <div v-if="!agents.recent.length" class="text-center py-4" style="color: var(--ink-subtle)">
            No data yet
          </div>
          <div v-else class="space-y-3 max-h-[250px] overflow-y-auto pr-2">
            <div v-for="call in agents.recent" :key="call.id" class="flex items-start justify-between border-b pb-2 last:border-0" style="border-color: var(--line-soft)">
              <div>
                <p class="text-sm" style="color: var(--ink)">{{ call.agent }}</p>
                <p class="text-xs" style="color: var(--ink-subtle)">{{ call.purpose }}</p>
              </div>
              <div class="text-right">
                <p class="font-mono text-xs" style="color: var(--ink)">${{ call.cost.toFixed(4) }}</p>
                <p class="text-xs" style="color: var(--ink-muted)">{{ formatRelativeTime(call.at) }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
