<script setup lang="ts">
import type { Job, AgentActivityResponse } from '~/types/api'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const api = useApi()
useHead({ title: 'Analytics' })

interface LlmSummaryByPurpose {
  purpose: string
  _count: number
  _sum: { costUsd: number | null; totalTokens: number | null }
}
interface LlmSummaryByModel {
  model: string
  _count: number
  _sum: { costUsd: number | null; totalTokens: number | null }
}
interface LlmSummary {
  byPurpose: LlmSummaryByPurpose[]
  byModel: LlmSummaryByModel[]
  totalCostUsd: number
}

const { data: llmSummary } = useAsyncData('llm-summary', () =>
  api.get<LlmSummary>('/api/v1/llm-calls/summary').catch(() => null),
)
const llm = computed(() => llmSummary.value)
const llmMaxCost = computed(() =>
  Math.max(...(llm.value?.byPurpose.map((r) => r._sum.costUsd ?? 0) ?? [1]), 0.001),
)

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
  api.get<{ data: Job[] }>('/api/v1/jobs').then((res) => res.data),
)

const jobOptions = computed(() => {
  const options = [{ value: '', label: 'All Jobs' }]
  if (jobs.value) {
    options.push(...jobs.value.map((j) => ({ value: j.id, label: j.title })))
  }
  return options
})

const currentJobQuery = computed(() =>
  selectedJobId.value ? { jobId: selectedJobId.value } : undefined,
)

const { data: funnelRes } = useAsyncData(
  'analytics-pipeline',
  () => api.get<FunnelRow[]>('/api/v1/analytics/pipeline', { query: currentJobQuery.value }),
  { watch: [selectedJobId] },
)
const { data: timingRes } = useAsyncData(
  'analytics-timing',
  () => api.get<TimingRow>('/api/v1/analytics/timing', { query: currentJobQuery.value }),
  { watch: [selectedJobId] },
)
const { data: sourcingRes } = useAsyncData(
  'analytics-sourcing',
  () => api.get<SourcingRow[]>('/api/v1/analytics/sourcing', { query: currentJobQuery.value }),
  { watch: [selectedJobId] },
)
const { data: outcomesRes } = useAsyncData(
  'analytics-outcomes',
  () => api.get<OutcomesRow>('/api/v1/analytics/outcomes', { query: currentJobQuery.value }),
  { watch: [selectedJobId] },
)
const { data: agentsRes } = useAsyncData(
  'analytics-agents',
  () =>
    api.get<AgentActivityResponse>('/api/v1/analytics/agents', { query: currentJobQuery.value }),
  { watch: [selectedJobId] },
)

interface OutreachStats {
  delivered: number
  responded: number
  screened: number
  placed: number
  replyRate: number
  screenRate: number
}
const { data: outreachRes } = useAsyncData('analytics-outreach', () =>
  api.get<OutreachStats>('/api/v1/analytics/outreach').catch(() => null),
)

const funnel = computed(() => funnelRes.value ?? [])
const timing = computed(() => timingRes.value)
const sourcing = computed(() => sourcingRes.value ?? [])
const outcomes = computed(() => outcomesRes.value)
const agents = computed(() => agentsRes.value)
const outreach = computed(() => outreachRes.value)

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

const chartData = computed(() => {
  return {
    labels: funnel.value.map((row) => STAGE_LABELS[row.stage] ?? row.stage),
    datasets: [
      {
        label: 'Candidates',
        data: funnel.value.map((row) => row.count),
        backgroundColor: funnel.value.map(
          (row) => (row.stage === 'hired' ? '#22c55e' : '#c84a1f'), // Using direct hex to avoid CSS var issues in canvas
        ),
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context: any) {
          const index = context.dataIndex
          const row = funnel.value[index]
          if (!row) return context.parsed.x
          return ` ${row.count} candidates (${row.rate}% conversion)`
        },
      },
    },
  },
  scales: {
    x: {
      display: false,
      grid: { display: false },
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#64748b',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 13,
        },
      },
      border: { display: false },
    },
  },
}))

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
    minute: '2-digit',
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
    <div
      class="pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
      style="border-bottom: 1px solid var(--line)"
    >
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
        <USelect v-model="selectedJobId" :items="jobOptions" placeholder="Filter by job..." />
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
          <div v-else class="relative w-full" style="height: 400px">
            <Bar :data="chartData" :options="chartOptions" />
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

    <!-- Outreach Campaign Analytics -->
    <div v-if="outreach" class="mt-8 space-y-4">
      <h2 class="section-label">Outreach Campaign Analytics</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Outreach Delivered</span>
            <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-accent" />
          </div>
          <p class="text-3xl font-serif text-ink">{{ outreach.delivered.toLocaleString() }}</p>
          <p class="text-xs" style="color: var(--ink-subtle)">Total candidates contacted</p>
        </div>

        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Reply Rate</span>
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4 text-info" />
          </div>
          <p class="text-3xl font-serif text-ink">{{ outreach.replyRate }}%</p>
          <p class="text-xs" style="color: var(--ink-subtle)">{{ outreach.responded }} replied</p>
        </div>

        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Offers Placed</span>
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-positive" />
          </div>
          <p class="text-3xl font-serif text-ink">{{ outreach.placed.toLocaleString() }}</p>
          <p class="text-xs" style="color: var(--ink-subtle)">
            {{ outreach.screened }} screened qualified
          </p>
        </div>
      </div>

      <!-- Outreach Funnel -->
      <UCard>
        <h3 class="text-sm font-semibold mb-4" style="color: var(--ink-muted)">Outreach Funnel</h3>
        <div
          v-if="outreach.delivered === 0"
          class="text-center py-4 text-sm"
          style="color: var(--ink-subtle)"
        >
          No outreach data yet.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="row in [
              {
                stage: 'Outreach Delivered',
                count: outreach.delivered,
                pct: 100,
                color: 'bg-accent',
              },
              {
                stage: 'Campaign Responded',
                count: outreach.responded,
                pct: outreach.replyRate,
                color: 'bg-info',
              },
              {
                stage: 'AI Screened (Qualified)',
                count: outreach.screened,
                pct: outreach.screenRate,
                color: 'bg-positive',
              },
              {
                stage: 'Offer Placed',
                count: outreach.placed,
                pct:
                  outreach.delivered > 0
                    ? Math.round((outreach.placed / outreach.delivered) * 1000) / 10
                    : 0,
                color: 'bg-indigo-500',
              },
            ]"
            :key="row.stage"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-ink">{{ row.stage }}</span>
              <div class="flex items-center gap-2 font-mono text-ink-muted">
                <span>{{ row.count }} candidates</span>
                <span class="text-ink-subtle">·</span>
                <span class="font-semibold text-ink">{{ row.pct }}%</span>
              </div>
            </div>
            <div class="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="row.color"
                :style="{ width: `${row.pct}%` }"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Agent Performance -->
    <div v-if="agents">
      <h2 class="section-label mb-4 mt-8">Agent Performance</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Costs by Agent</h3>
          <div
            v-if="!agents.stats.length"
            class="text-center py-4"
            style="color: var(--ink-subtle)"
          >
            No data yet
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="stat in agents.stats"
              :key="stat.agent"
              class="flex items-center justify-between"
            >
              <div>
                <p class="text-sm font-medium" style="color: var(--ink)">{{ stat.agent }}</p>
                <p class="text-xs" style="color: var(--ink-subtle)">{{ stat.count }} calls</p>
              </div>
              <p class="font-mono text-sm" style="color: var(--ink)">
                ${{ stat.totalCost.toFixed(4) }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Recent Activity</h3>
          <div
            v-if="!agents.recent.length"
            class="text-center py-4"
            style="color: var(--ink-subtle)"
          >
            No data yet
          </div>
          <div v-else class="space-y-3 max-h-62.5 overflow-y-auto pr-2">
            <div
              v-for="call in agents.recent"
              :key="call.id"
              class="flex items-start justify-between border-b pb-2 last:border-0"
              style="border-color: var(--line-soft)"
            >
              <div>
                <p class="text-sm" style="color: var(--ink)">{{ call.agent }}</p>
                <p class="text-xs" style="color: var(--ink-subtle)">{{ call.purpose }}</p>
              </div>
              <div class="text-right">
                <p class="font-mono text-xs" style="color: var(--ink)">
                  ${{ call.cost.toFixed(4) }}
                </p>
                <p class="text-xs" style="color: var(--ink-muted)">
                  {{ formatRelativeTime(call.at) }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- LLM Cost Breakdown -->
    <div v-if="llm">
      <h2 class="section-label mb-4 mt-8">AI Cost Breakdown</h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div
          class="rounded-lg p-4 lg:col-span-1"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-xs mb-1" style="color: var(--ink-subtle)">Total AI spend</p>
          <div
            style="
              font-family: 'Fraunces', serif;
              font-size: 36px;
              font-weight: 400;
              color: var(--ink);
              line-height: 1;
            "
          >
            ${{ llm.totalCostUsd.toFixed(4) }}
          </div>
        </div>
        <div
          class="rounded-lg p-4 lg:col-span-2"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-xs mb-3" style="color: var(--ink-subtle)">By model</p>
          <div class="space-y-2">
            <div
              v-for="row in llm.byModel"
              :key="row.model"
              class="flex items-center gap-3 text-sm"
            >
              <span
                class="font-mono text-xs w-48 truncate shrink-0"
                style="color: var(--ink-muted)"
                >{{ row.model }}</span
              >
              <span class="text-xs w-12 text-right shrink-0" style="color: var(--ink-subtle)"
                >{{ row._count }}×</span
              >
              <span class="font-mono text-xs w-20 text-right shrink-0" style="color: var(--ink)"
                >${{ (row._sum.costUsd ?? 0).toFixed(4) }}</span
              >
            </div>
          </div>
        </div>
      </div>
      <UCard>
        <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Cost by Purpose</h3>
        <div v-if="!llm.byPurpose.length" class="text-center py-6" style="color: var(--ink-subtle)">
          No data yet
        </div>
        <div v-else class="space-y-3">
          <div v-for="row in llm.byPurpose" :key="row.purpose" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span style="color: var(--ink-muted)">{{ row.purpose }}</span>
              <div class="flex items-center gap-3">
                <span style="color: var(--ink-subtle)"
                  >{{ row._count }} calls · {{ ((row._sum.totalTokens ?? 0) / 1000).toFixed(1) }}k
                  tokens</span
                >
                <span class="font-mono font-medium" style="color: var(--ink)"
                  >${{ (row._sum.costUsd ?? 0).toFixed(4) }}</span
                >
              </div>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: var(--bg-elevated)">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${((row._sum.costUsd ?? 0) / llmMaxCost) * 100}%`,
                  background: 'var(--accent)',
                }"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
