<script setup lang="ts">
import type { LlmCall, LlmCallSummary, PaginatedResponse } from '~/types/api'

definePageMeta({ layout: 'staff', middleware: 'staff-auth' })

const api = useApi()

const { data: summary } = await useAsyncData('llm-summary', () =>
  api.get<LlmCallSummary>('/api/v1/llm-calls/summary'),
)

const { data: calls, pending } = await useAsyncData('llm-calls', () =>
  api.get<PaginatedResponse<LlmCall>>('/api/v1/llm-calls', { limit: '50' }),
)

const totalCost = computed(() =>
  summary.value?.totalCostUsd ? '$' + Number(summary.value.totalCostUsd).toFixed(4) : '$0',
)

function fmtCost(v?: string | number | null) {
  if (v == null) return '—'
  return '$' + Number(v).toFixed(4)
}

function fmtMs(v?: number) {
  if (!v) return '—'
  return v + 'ms'
}

const columns: any[] = [
  { key: 'purpose', label: 'Purpose' },
  { key: 'model', label: 'Model' },
  { key: 'tokens', label: 'Tokens' },
  { key: 'cost', label: 'Cost' },
  { key: 'latency', label: 'Latency' },
  { key: 'createdAt', label: 'Time' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
        <div>
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
            Staff · Observability
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
            LLM Costs
          </h1>
        </div>
        <div
          class="rounded-lg px-4 py-2 shrink-0 w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2"
          style="background: var(--bg-elevated); border: 1px solid var(--line)"
        >
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 0px;
            "
            class="sm:mb-0.5"
          >
            Total
          </p>
          <p class="font-bold text-lg" style="color: var(--warn)">{{ totalCost }}</p>
        </div>
      </div>
    </div>

    <!-- Summary by purpose -->
    <div v-if="summary" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h2 class="section-label">By Purpose</h2>
        </template>
        <div class="space-y-2">
          <div
            v-for="row in summary.byPurpose ?? []"
            :key="row.purpose"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-mono" style="color: var(--ink)">{{ row.purpose }}</span>
            <div class="flex gap-4 text-right">
              <span style="color: var(--ink-muted)">{{ row._count }} calls</span>
              <span class="font-medium w-20 text-right" style="color: var(--warn)">{{
                fmtCost(row._sum?.costUsd)
              }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="section-label">By Model</h2>
        </template>
        <div class="space-y-2">
          <div
            v-for="row in summary.byModel ?? []"
            :key="row.model"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-mono text-xs" style="color: var(--ink)">{{ row.model }}</span>
            <div class="flex gap-4 text-right">
              <span style="color: var(--ink-muted)">{{ row._count }} calls</span>
              <span class="font-medium w-20 text-right" style="color: var(--warn)">{{
                fmtCost(row._sum?.costUsd)
              }}</span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Recent calls -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <h2 class="section-label">Recent calls ({{ calls?.total ?? 0 }})</h2>
      </template>
      <UTable :data="(calls?.data ?? []) as any[]" :columns="columns" :loading="pending">
        <template #purpose-cell="{ row: { original: row } }">
          <span class="font-mono text-xs" style="color: var(--ink)">{{ row.purpose }}</span>
        </template>
        <template #model-cell="{ row: { original: row } }">
          <span class="text-xs font-mono" style="color: var(--ink-muted)">{{ row.model }}</span>
        </template>
        <template #tokens-cell="{ row: { original: row } }">
          <span class="text-sm font-mono" style="color: var(--ink)">{{
            row.totalTokens?.toLocaleString() ?? '—'
          }}</span>
        </template>
        <template #cost-cell="{ row: { original: row } }">
          <span class="text-sm font-mono" style="color: var(--warn)">{{
            fmtCost(row.costUsd)
          }}</span>
        </template>
        <template #latency-cell="{ row: { original: row } }">
          <span class="text-sm font-mono" style="color: var(--ink-muted)">{{
            fmtMs(row.latencyMs)
          }}</span>
        </template>
        <template #createdAt-cell="{ row: { original: row } }">
          <span class="text-xs" style="color: var(--ink-subtle)">{{
            formatDateTime(row.createdAt)
          }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
