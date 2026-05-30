<script setup lang="ts">
import type { Application, PaginatedResponse, AgentActivityResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
useHead({ title: computed(() => t('nav.dashboard')) })
const api = useApi()
const auth = useAuthStore()
const { appStatusLabel } = useStatusLabels()

interface DashboardStats {
  activeJobs: number
  totalJobs: number
  inPipeline: number
  totalApplications: number
  activePlacements: number
  totalPlacements: number
  pendingInvoices: number
  totalInvoices: number
}

const { data: stats } = await useAsyncData('dashboard-stats', () =>
  api.get<DashboardStats>('/api/v1/dashboard/stats').catch(() => null),
)

const { data: applications, pending: appsLoading } = await useAsyncData('dashboard-apps', () =>
  api
    .get<PaginatedResponse<Application>>('/api/v1/applications', { limit: 50 })
    .then((r) => r.data)
    .catch(() => [] as Application[]),
)

const { data: agents, pending: agentsLoading } = await useAsyncData('dashboard-agents', () =>
  api.get<AgentActivityResponse>('/api/v1/analytics/agents').catch(() => null),
)

const kpis = computed(() => {
  const s = stats.value
  return [
    {
      label: t('dashboard.kpi.activeRoles'),
      value: s?.activeJobs ?? 0,
      delta: `${s?.totalJobs ?? 0} ${t('common.total').toLowerCase()}`,
      href: '/jobs',
    },
    {
      label: t('dashboard.kpi.inPipeline'),
      value: s?.inPipeline ?? 0,
      delta: `${s?.totalApplications ?? 0} ${t('common.total').toLowerCase()}`,
      href: '/applications',
    },
    {
      label: t('dashboard.kpi.activePlacements'),
      value: s?.activePlacements ?? 0,
      delta: `${s?.totalPlacements ?? 0} ${t('common.total').toLowerCase()}`,
      positive: true,
      href: '/placements',
    },
    {
      label: t('dashboard.kpi.pendingInvoices'),
      value: s?.pendingInvoices ?? 0,
      delta: `${s?.totalInvoices ?? 0} ${t('common.total').toLowerCase()}`,
      href: '/invoices',
    },
  ]
})

const needsAction = computed(() =>
  [...(applications.value ?? [])]
    .filter((a) => ['screening', 'delivered', 'interview_scheduled'].includes(a.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5),
)

const needsActionTotal = computed(
  () =>
    (applications.value ?? []).filter((a) =>
      ['screening', 'delivered', 'interview_scheduled'].includes(a.status),
    ).length,
)

const pipelineStages = computed(() => {
  const stageKeys = [
    'matched',
    'outreach_sent',
    'screening',
    'delivered',
    'interview_scheduled',
    'hired',
  ]
  const apps = applications.value ?? []
  return stageKeys.map((key) => ({
    key,
    label: appStatusLabel(key),
    count: apps.filter((a) => a.status === key).length,
  }))
})
</script>

<template>
  <div>
    <!-- Page head -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-7 pb-6 border-b border-line"
    >
      <div>
        <div class="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle mb-3.5">
          {{
            new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
          }}
        </div>
        <h1 class="page-title">
          {{ auth.user?.company?.name ?? 'Dashboard' }}.<br />
          <em>{{ t('nav.dashboard') }}</em>
        </h1>
      </div>
      <div class="flex gap-2 items-center w-full sm:w-auto">
        <UButton
          to="/jobs/create"
          variant="outline"
          icon="i-heroicons-plus"
          size="sm"
          class="flex-1 sm:flex-none justify-center"
          >{{ t('dashboard.newRole') }}</UButton
        >
        <UButton to="/jobs" size="sm" class="flex-1 sm:flex-none justify-center">{{
          t('dashboard.openRoles')
        }}</UButton>
      </div>
    </div>

    <!-- Onboarding: show only for brand-new accounts with zero jobs -->
    <UCard v-if="stats?.totalJobs === 0" class="mb-5">
      <CommonEmptyState
        icon="i-heroicons-briefcase"
        :title="t('dashboard.onboarding.title')"
        :description="t('dashboard.onboarding.description')"
        :action-label="t('dashboard.onboarding.cta')"
        action-to="/jobs/create"
      />
    </UCard>

    <!-- KPI strip -->
    <DashboardKpiStrip :kpis="kpis" />

    <!-- Two-column: left = needs-you + pipeline, right = agent stream -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
      <div class="flex flex-col gap-5">
        <!-- Needs your call -->
        <UCard>
          <template #header>
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="section-label mb-1">{{ t('dashboard.needsYourCall') }}</div>
                <h3 class="font-serif text-[22px] tracking-tight font-normal text-ink leading-snug">
                  {{ t('dashboard.candidatesReady', { count: needsAction.length }) }}
                </h3>
              </div>
              <UButton to="/applications" variant="ghost" size="xs">{{
                t('dashboard.reviewAll')
              }}</UButton>
            </div>
          </template>

          <div v-if="appsLoading" class="py-6 text-center text-ink-subtle text-sm">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin w-4 h-4 mx-auto" />
          </div>
          <div v-else-if="!needsAction.length" class="py-6 text-center text-sm text-ink-subtle">
            {{ t('dashboard.noCandidatesWaiting') }}
          </div>
          <div v-else>
            <DashboardCandidateRow v-for="app in needsAction" :key="app.id" :app="app" />
            <div v-if="needsActionTotal > 5" class="pt-3 border-t border-line-soft">
              <NuxtLink
                to="/applications"
                class="font-mono text-[11px] text-ink-muted hover:text-accent transition-colors"
              >
                {{ needsActionTotal - 5 }} {{ t('dashboard.moreApplications') }} →
              </NuxtLink>
            </div>
          </div>
        </UCard>

        <!-- Pipeline at a glance -->
        <UCard>
          <template #header>
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="section-label mb-1">{{ t('dashboard.pipelineSection') }}</div>
                <h3 class="font-serif text-[22px] tracking-tight font-normal text-ink leading-snug">
                  {{ t('dashboard.applicationStages') }}
                </h3>
              </div>
              <UButton to="/applications" variant="ghost" size="xs">{{
                t('dashboard.viewAll')
              }}</UButton>
            </div>
          </template>
          <DashboardPipelineOverview :stages="pipelineStages" />
        </UCard>
      </div>

      <!-- Agent stream -->
      <UCard class="flex flex-col gap-3.5 min-h-100">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="live-dot" />
              <span class="section-label" style="margin-bottom: 0">{{
                t('dashboard.agentActivity')
              }}</span>
            </div>
            <UButton to="/conversations" variant="ghost" size="xs">{{
              t('dashboard.openChat')
            }}</UButton>
          </div>
        </template>

        <div class="flex flex-col gap-6">
          <div>
            <div class="section-label mb-2">{{ t('dashboard.liveBrainFeed') }}</div>
            <DashboardLiveBrainFeed />
          </div>

          <div>
            <div class="section-label mb-2">{{ t('dashboard.agentActivity') }}</div>
            <DashboardAgentActivityStream :data="agents ?? null" :loading="agentsLoading" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
/* Cannot express in Tailwind: custom font-size + em italic accent */
.page-title {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-weight: 400;
  color: var(--ink);
}
@media (min-width: 640px) {
  .page-title {
    font-size: 44px;
    line-height: 1.02;
    letter-spacing: -0.035em;
  }
}
.page-title em {
  font-style: italic;
  color: var(--accent);
}
</style>
