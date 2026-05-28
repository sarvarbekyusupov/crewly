<script setup lang="ts">
import type { Application, Job } from '~/types/api'

const props = defineProps<{
  job: Job
  applications: Application[]
  stats?: Record<string, number> | null
  outreachLoading?: boolean
  hasMatchedCandidates?: boolean
}>()

defineEmits<{
  outreach: []
  viewAll: []
}>()

const { t } = useI18n()
const auth = useAuthStore()
const { appStatusLabel } = useStatusLabels()

const topApps = computed(() =>
  [...props.applications]
    .sort((a, b) => Number(b.matchScore ?? 0) - Number(a.matchScore ?? 0))
    .slice(0, 5),
)

const totalInPipeline = computed(() => props.applications.length)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 class="section-label">{{ t('jobs.pipelineHub') }}</h2>
          <p class="text-xs mt-1" style="color: var(--ink-muted)">
            {{ t('jobs.pipelineHubSubtitle', { count: totalInPipeline }) }}
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="auth.can('hiring_manager') && job.status === 'active' && hasMatchedCandidates"
            size="sm"
            icon="i-heroicons-paper-airplane"
            :loading="outreachLoading"
            @click="$emit('outreach')"
          >
            {{ t('jobs.startOutreach') }}
          </UButton>
          <UButton size="sm" variant="outline" :to="`/applications?jobId=${job.id}`">
            {{ t('jobs.viewFullPipeline') }}
          </UButton>
        </div>
      </div>
    </template>

    <div
      v-if="stats && Object.keys(stats).length"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
    >
      <div
        v-for="(count, status) in stats"
        :key="status"
        class="rounded-lg px-3 py-2"
        style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
      >
        <p class="text-xs mb-1" style="color: var(--ink-subtle)">
          {{ appStatusLabel(String(status)) }}
        </p>
        <p class="font-mono text-lg" style="color: var(--ink)">{{ count }}</p>
      </div>
    </div>

    <ApplicationKanban v-if="applications.length" :applications="applications.slice(0, 30)" />
    <EmptyState
      v-else
      icon="i-heroicons-users"
      :title="t('applications.empty')"
      :description="t('jobs.pipelineEmpty')"
      :action-label="job.status === 'draft' ? t('jobs.activate') : undefined"
    />

    <div v-if="topApps.length" class="mt-6 pt-4" style="border-top: 1px solid var(--line-soft)">
      <p class="section-label mb-3">{{ t('jobs.topMatches') }}</p>
      <ul class="space-y-2">
        <li v-for="app in topApps" :key="app.id">
          <NuxtLink
            :to="`/applications/${app.id}`"
            class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-(--bg-elevated)"
          >
            <span class="text-sm font-medium" style="color: var(--ink)">
              {{ app.candidate?.fullName ?? '—' }}
            </span>
            <ApplicationStatusBadge :status="app.status" />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </UCard>
</template>
