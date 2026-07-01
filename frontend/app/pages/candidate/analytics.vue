<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const { t } = useI18n()

useHead({ title: 'Analytics' })

interface AnalyticsData {
  total: number
  applied: number
  interviewed: number
  offers: number
  rejected: number
  inboundCount: number
  responseRate: number
  byStatus: Record<string, number>
  bySources: Record<string, number>
  dailyActivity: Record<string, number>
}

const {
  data: analytics,
  pending,
  error,
} = await useAsyncData(
  'candidate-analytics',
  () => api.get<AnalyticsData>('/api/v1/candidate-portal/analytics'),
  { lazy: true },
)

const funnel = computed(() => {
  if (!analytics.value) return []
  return [
    { label: 'Total Applied', value: analytics.value.total, color: 'var(--accent)' },
    { label: 'Viewed / Reviewed', value: analytics.value.inboundCount, color: 'var(--ink-muted)' },
    { label: 'Interviewed', value: analytics.value.interviewed, color: 'var(--warning)' },
    { label: 'Offers', value: analytics.value.offers, color: 'var(--positive)' },
  ]
})

const maxFunnelValue = computed(() => Math.max(...funnel.value.map((f) => f.value), 1))

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  applying: 'Applying',
  applied: 'Applied',
  skipped: 'Skipped',
  failed: 'Failed',
  phone_interview: 'Phone Screen',
  interview: 'Interview',
  offer_made: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

const statusColor: Record<string, string> = {
  applied: 'var(--accent)',
  interview: 'var(--warning)',
  phone_interview: 'var(--warning)',
  offer_made: 'var(--positive)',
  hired: 'var(--positive)',
  rejected: 'var(--negative)',
  skipped: 'var(--ink-subtle)',
  failed: 'var(--negative)',
  queued: 'var(--accent)',
  applying: 'var(--accent)',
}

// Build daily activity chart data (last 30 days)
const chartDays = computed(() => {
  const days: { date: string; label: string; count: number }[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({
      date: key,
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count: analytics.value?.dailyActivity[key] ?? 0,
    })
  }
  return days
})

const maxDailyCount = computed(() => Math.max(...chartDays.value.map((d) => d.count), 1))
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="pb-4 border-b border-line">
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
        Analytics
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
        Job Search Analytics
      </h1>
      <p class="text-sm mt-1" style="color: var(--ink-muted)">
        Applications, interviews, and conversion — all in one view.
      </p>
    </div>

    <div v-if="pending" class="space-y-6">
      <!-- Stat cards skeleton -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="n in 4"
          :key="n"
          class="rounded-xl p-4 flex flex-col items-center gap-2"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <USkeleton class="h-9 w-16 rounded" />
          <USkeleton class="h-3 w-20 rounded" />
        </div>
      </div>
      <!-- Funnel skeleton -->
      <div
        class="rounded-xl p-5 space-y-3"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <USkeleton class="h-4 w-32 rounded mb-4" />
        <div v-for="n in 5" :key="n" class="flex items-center gap-3">
          <USkeleton class="h-3 w-24 rounded shrink-0" />
          <USkeleton class="h-3 rounded flex-1" :style="`width: ${80 - n * 12}%`" />
          <USkeleton class="h-3 w-8 rounded shrink-0" />
        </div>
      </div>
      <!-- Chart skeleton -->
      <div
        class="rounded-xl p-5"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <USkeleton class="h-4 w-28 rounded mb-4" />
        <div class="flex items-end gap-1 h-24">
          <USkeleton
            v-for="n in 20"
            :key="n"
            class="flex-1 rounded-t"
            :style="`height: ${20 + Math.abs(Math.sin(n) * 60)}%`"
          />
        </div>
      </div>
    </div>

    <template v-else-if="analytics">
      <!-- Top stat cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          class="rounded-xl p-4 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-3xl font-mono font-bold" style="color: var(--ink)">
            {{ analytics.total }}
          </p>
          <p class="text-xs mt-1" style="color: var(--ink-muted)">Total Applied</p>
        </div>
        <div
          class="rounded-xl p-4 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-3xl font-mono font-bold" style="color: var(--warning)">
            {{ analytics.interviewed }}
          </p>
          <p class="text-xs mt-1" style="color: var(--ink-muted)">Interviews</p>
        </div>
        <div
          class="rounded-xl p-4 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-3xl font-mono font-bold" style="color: var(--positive)">
            {{ analytics.offers }}
          </p>
          <p class="text-xs mt-1" style="color: var(--ink-muted)">Offers</p>
        </div>
        <div
          class="rounded-xl p-4 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p class="text-3xl font-mono font-bold" style="color: var(--accent)">
            {{ Math.round(analytics.responseRate) }}%
          </p>
          <p class="text-xs mt-1" style="color: var(--ink-muted)">Response Rate</p>
        </div>
      </div>

      <!-- Funnel + Chart side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Application funnel -->
        <div
          class="rounded-xl p-5 space-y-3"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p
            class="text-xs font-mono font-bold uppercase tracking-wider"
            style="color: var(--ink-subtle)"
          >
            Application Funnel
          </p>
          <div class="space-y-2.5">
            <div v-for="step in funnel" :key="step.label" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span style="color: var(--ink-muted)">{{ step.label }}</span>
                <span class="font-mono font-bold" style="color: var(--ink)">{{ step.value }}</span>
              </div>
              <div class="rounded-full h-2 overflow-hidden" style="background: var(--bg-deep)">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${Math.round((step.value / maxFunnelValue) * 100)}%`,
                    background: step.color,
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Daily activity bar chart -->
        <div
          class="rounded-xl p-5 space-y-3"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p
            class="text-xs font-mono font-bold uppercase tracking-wider"
            style="color: var(--ink-subtle)"
          >
            Applications (Last 30 Days)
          </p>
          <div class="flex items-end gap-0.5 h-20">
            <template v-for="day in chartDays" :key="day.date">
              <div
                class="flex-1 rounded-t transition-all duration-300"
                :title="`${day.label}: ${day.count}`"
                :style="{
                  height: `${Math.max(4, Math.round((day.count / maxDailyCount) * 100))}%`,
                  background: day.count > 0 ? 'var(--accent)' : 'var(--bg-deep)',
                  opacity: day.count > 0 ? '1' : '0.3',
                }"
              />
            </template>
          </div>
          <div class="flex justify-between text-xs" style="color: var(--ink-subtle)">
            <span>{{ chartDays[0]?.label }}</span>
            <span>{{ chartDays[chartDays.length - 1]?.label }}</span>
          </div>
        </div>
      </div>

      <!-- Status breakdown + sources row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- By status -->
        <div
          class="rounded-xl p-5 space-y-2"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <p
            class="text-xs font-mono font-bold uppercase tracking-wider"
            style="color: var(--ink-subtle)"
          >
            By Status
          </p>
          <div
            v-for="(count, status) in analytics.byStatus"
            :key="status"
            class="flex items-center justify-between py-1.5"
            style="border-bottom: 1px solid var(--line-soft)"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-2 h-2 rounded-full"
                :style="{ background: statusColor[status] ?? '#9ca3af' }"
              />
              <span class="text-sm" style="color: var(--ink-muted)">{{
                statusLabels[status] ?? status
              }}</span>
            </div>
            <span class="text-sm font-mono font-bold" style="color: var(--ink)">{{ count }}</span>
          </div>
        </div>

        <!-- By source + inbound -->
        <div
          class="rounded-xl p-5 space-y-4"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="space-y-2">
            <p
              class="text-xs font-mono font-bold uppercase tracking-wider"
              style="color: var(--ink-subtle)"
            >
              By Source
            </p>
            <div
              v-for="(count, source) in analytics.bySources"
              :key="source"
              class="flex items-center justify-between py-1"
            >
              <span class="text-sm" style="color: var(--ink-muted)">{{ source }}</span>
              <span class="text-sm font-mono font-bold" style="color: var(--ink)">{{ count }}</span>
            </div>
            <p
              v-if="!Object.keys(analytics.bySources).length"
              class="text-xs"
              style="color: var(--ink-subtle)"
            >
              No data yet
            </p>
          </div>
          <div class="pt-2" style="border-top: 1px solid var(--line-soft)">
            <p
              class="text-xs font-mono font-bold uppercase tracking-wider mb-1"
              style="color: var(--ink-subtle)"
            >
              Inbound (employers found you)
            </p>
            <p class="text-2xl font-mono font-bold" style="color: var(--ink)">
              {{ analytics.inboundCount }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="error" class="py-12 text-center text-sm" style="color: var(--ink-muted)">
      {{ (error as any)?.message ?? 'Failed to load analytics' }}
    </div>
  </div>
</template>
