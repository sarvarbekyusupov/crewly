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
  const options = [{ id: '', title: 'All Jobs' }]
  if (jobs.value) {
    options.push(...jobs.value.map((j) => ({ id: j.id, title: j.title })))
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

const funnel = computed(() => funnelRes.value ?? [])
const timing = computed(() => timingRes.value)
const sourcing = computed(() => sourcingRes.value ?? [])
const outcomes = computed(() => outcomesRes.value)
const agents = computed(() => agentsRes.value)

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
    <div class="mt-8 space-y-4">
      <h2 class="section-label">Outreach Campaign Analytics</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Metric 1 -->
        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Automated Sourcing Emails Sent</span>
            <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-accent" />
          </div>
          <p class="text-3xl font-serif text-ink">1,428</p>
          <div class="flex items-center gap-1.5 text-xs text-positive">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            <span>+14.2% from last month</span>
          </div>
        </div>

        <!-- Metric 2 -->
        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Candidate Reply Rate</span>
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4 text-info" />
          </div>
          <p class="text-3xl font-serif text-ink">42.8%</p>
          <div class="flex items-center gap-1.5 text-xs text-positive">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            <span>+3.5% conversion increase</span>
          </div>
        </div>

        <!-- Metric 3 -->
        <div class="rounded-xl p-4 bg-surface border border-line-soft space-y-2">
          <div class="flex items-center justify-between text-xs" style="color: var(--ink-subtle)">
            <span>Interview Booking Rate</span>
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-positive" />
          </div>
          <p class="text-3xl font-serif text-ink">18.4%</p>
          <div class="flex items-center gap-1.5 text-xs text-positive">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            <span>+2.1% from baseline</span>
          </div>
        </div>
      </div>

      <!-- Sourcing & Outreach Funnel Chart -->
      <UCard>
        <h3 class="text-sm font-semibold mb-4" style="color: var(--ink-muted)">Outreach Funnel Progress</h3>
        <div class="space-y-4">
          <div v-for="fun in [
            { stage: 'Outreach Delivered', count: 1428, percent: 100, color: 'bg-accent' },
            { stage: 'Campaign Responded', count: 611, percent: 42.8, color: 'bg-info' },
            { stage: 'AI Screened (Qualified)', count: 263, percent: 18.4, color: 'bg-positive' },
            { stage: 'Offer Placed', count: 48, percent: 3.3, color: 'bg-indigo-500' }
          ]" :key="fun.stage" class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-ink">{{ fun.stage }}</span>
              <div class="flex items-center gap-2 font-mono text-ink-muted">
                <span>{{ fun.count }} candidates</span>
                <span class="text-ink-subtle">·</span>
                <span class="font-semibold text-ink">{{ fun.percent }}%</span>
              </div>
            </div>
            <div class="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="fun.color" :style="{ width: `${fun.percent}%` }" />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Campaign A/B Test Dashboard Card -->
      <UCard>
        <div class="flex items-center justify-between pb-3 border-b border-line-soft mb-4">
          <div>
            <h3 class="text-sm font-semibold text-ink">Outreach Campaign A/B Testing</h3>
            <p class="text-[11px] text-ink-subtle">Compare conversion reply rates across different messaging vectors head-to-head.</p>
          </div>
          <UBadge label="Active Experiment" size="xs" color="success" variant="subtle" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-line-soft">
          <!-- Column A -->
          <div class="space-y-3.5 pr-0 md:pr-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-accent uppercase tracking-wider">Template A: Tech-Focused</span>
              <span class="text-xs font-mono font-bold text-ink">42.8% Reply Rate</span>
            </div>
            <p class="text-[11px] text-ink-muted italic leading-normal p-3 bg-bg-deep rounded-lg border border-line-soft">
              "Hi {name}, I saw your impressive skills in {skills}... Let's chat."
            </p>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-ink-subtle">
                <span>Outreach Sent: 714</span>
                <span>Replies: 305</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-bg-deep overflow-hidden">
                <div class="h-full bg-accent rounded-full animate-all duration-500" style="width: 42.8%" />
              </div>
            </div>
          </div>

          <!-- Column B -->
          <div class="space-y-3.5 pt-4 md:pt-0 pl-0 md:pl-6">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-info uppercase tracking-wider">Template B: Culture-Focused</span>
              <span class="text-xs font-mono font-bold text-ink">28.4% Reply Rate</span>
            </div>
            <p class="text-[11px] text-ink-muted italic leading-normal p-3 bg-bg-deep rounded-lg border border-line-soft">
              "Hi {name}, we love your remote autonomy goals and fit for our culture..."
            </p>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-ink-subtle">
                <span>Outreach Sent: 714</span>
                <span>Replies: 202</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-bg-deep overflow-hidden">
                <div class="h-full bg-info rounded-full animate-all duration-500" style="width: 28.4%" />
              </div>
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
            style="font-family: 'Fraunces', serif; font-size: 36px; font-weight: 400; color: var(--ink); line-height: 1"
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
            <div v-for="row in llm.byModel" :key="row.model" class="flex items-center gap-3 text-sm">
              <span class="font-mono text-xs w-48 truncate shrink-0" style="color: var(--ink-muted)">{{ row.model }}</span>
              <span class="text-xs w-12 text-right shrink-0" style="color: var(--ink-subtle)">{{ row._count }}×</span>
              <span class="font-mono text-xs w-20 text-right shrink-0" style="color: var(--ink)">${{ (row._sum.costUsd ?? 0).toFixed(4) }}</span>
            </div>
          </div>
        </div>
      </div>
      <UCard>
        <h3 class="text-sm font-medium mb-4" style="color: var(--ink-subtle)">Cost by Purpose</h3>
        <div v-if="!llm.byPurpose.length" class="text-center py-6" style="color: var(--ink-subtle)">No data yet</div>
        <div v-else class="space-y-3">
          <div v-for="row in llm.byPurpose" :key="row.purpose" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span style="color: var(--ink-muted)">{{ row.purpose }}</span>
              <div class="flex items-center gap-3">
                <span style="color: var(--ink-subtle)">{{ row._count }} calls · {{ ((row._sum.totalTokens ?? 0) / 1000).toFixed(1) }}k tokens</span>
                <span class="font-mono font-medium" style="color: var(--ink)">${{ (row._sum.costUsd ?? 0).toFixed(4) }}</span>
              </div>
            </div>
            <div class="h-1.5 rounded-full overflow-hidden" style="background: var(--bg-elevated)">
              <div
                class="h-full rounded-full"
                :style="{ width: `${((row._sum.costUsd ?? 0) / llmMaxCost) * 100}%`, background: 'var(--accent)' }"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
