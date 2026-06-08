<script setup lang="ts">
import type { StaffDashboard } from '~/types/api'

definePageMeta({ layout: 'staff' })

const api = useStaffApi()

const { data: stats } = await useAsyncData('staff-dashboard', () =>
  api.get<StaffDashboard>('/api/v1/staff/dashboard'),
)

const statCards = computed(() => [
  {
    label: 'Companies',
    value: stats.value?.totalCompanies ?? 0,
    icon: 'i-heroicons-building-office-2',
    to: '/staff/companies',
  },
  {
    label: 'Candidates',
    value: stats.value?.totalCandidates ?? 0,
    icon: 'i-heroicons-users',
    to: '/staff/candidates',
  },
  {
    label: 'Active jobs',
    value: stats.value?.activeJobs ?? 0,
    icon: 'i-heroicons-briefcase',
    to: null,
  },
  {
    label: 'Active applications',
    value: stats.value?.activeApplications ?? 0,
    icon: 'i-heroicons-clipboard-document-list',
    to: null,
  },
])

const llmCostToday = computed(() => {
  const v = stats.value?.llmCostTodayUsd
  if (!v) return '$0.00'
  return '$' + Number(v).toFixed(4)
})
</script>

<template>
  <div class="space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
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
            Staff · Overview
          </p>
          <h1
            style="
              font-family: 'Fraunces', serif;
              font-size: 32px;
              line-height: 1.05;
              letter-spacing: -0.035em;
              color: var(--ink);
              font-weight: 400;
            "
          >
            Dashboard
          </h1>
        </div>
        <div
          class="rounded-lg px-4 py-2 text-sm shrink-0"
          style="background: var(--bg-elevated); border: 1px solid var(--line)"
        >
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 2px;
            "
          >
            LLM cost today
          </p>
          <p class="font-bold" style="color: var(--warn)">{{ llmCostToday }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <component :is="s.to ? 'NuxtLink' : 'div'" v-for="s in statCards" :key="s.label" :to="s.to">
        <UCard class="transition-colors cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm" style="color: var(--ink-muted)">{{ s.label }}</p>
              <p
                class="text-3xl font-bold mt-1"
                style="font-family: 'Fraunces', serif; color: var(--ink); font-weight: 400"
              >
                {{ s.value.toLocaleString() }}
              </p>
            </div>
            <UIcon :name="s.icon" class="w-8 h-8" style="color: var(--ink-subtle)" />
          </div>
        </UCard>
      </component>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h2 class="section-label">Quick Actions</h2>
        </template>
        <div class="space-y-2">
          <NuxtLink to="/staff/ingestion">
            <UButton
              variant="outline"
              block
              icon="i-heroicons-arrow-down-tray"
              class="justify-start"
            >
              Trigger ingestion run
            </UButton>
          </NuxtLink>
          <NuxtLink to="/staff/llm-costs">
            <UButton variant="outline" block icon="i-heroicons-chart-bar" class="justify-start">
              View LLM costs
            </UButton>
          </NuxtLink>
          <NuxtLink to="/staff/candidates?dnc=true">
            <UButton
              variant="outline"
              block
              icon="i-heroicons-no-symbol"
              class="justify-start"
              color="error"
            >
              View DNC candidates
            </UButton>
          </NuxtLink>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="section-label">System Status</h2>
        </template>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span style="color: var(--ink-muted)">Queue inspector</span>
            <!-- eslint-disable link-checker/valid-route -->
            <a
              href="/admin/queues"
              target="_blank"
              class="flex items-center gap-1"
              style="color: var(--accent)"
            >
              Bull Board <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
            </a>
            <!-- eslint-enable link-checker/valid-route -->
          </div>
          <div class="flex items-center justify-between">
            <span style="color: var(--ink-muted)">API health</span>
            <a
              href="/health"
              target="_blank"
              class="flex items-center gap-1"
              style="color: var(--accent)"
            >
              /health <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
            </a>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
