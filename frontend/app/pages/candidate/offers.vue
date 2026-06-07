<script setup lang="ts">
import { capitalizeStatus } from '~/utils/candidate'
import { appStatusColor } from '~/utils/statusColors'
import { formatRelativeTime } from '~/utils/formatters'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const { t } = useI18n()

interface Application {
  id: string
  status: string
  matchScore?: string
  matchedAt?: string
  job: {
    id: string
    title: string
    workMode?: string
    employmentType?: string
    officeLocation?: string
    company: { id: string; name: string }
  }
}

useHead({ title: t('candidate.offers.title') })

const { data: applications, pending } = await useAsyncData('candidate-applications-full', () =>
  api.get<Application[]>('/api/v1/candidate-portal/applications').catch(() => [] as Application[]),
)
</script>

<template>
  <div class="space-y-6">
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
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
        {{ t('candidate.offers.eyebrow') }}
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
        {{ t('candidate.offers.title') }}
      </h1>
      <p class="mt-1 text-sm" style="color: var(--ink-muted)">
        {{ t('candidate.offers.subtitle') }}
      </p>
      <NuxtLink
        to="/candidate/tracker"
        class="mt-3 inline-flex items-center gap-2 text-xs rounded-lg px-3 py-2"
        style="
          background: var(--bg-elevated);
          border: 1px solid var(--line);
          color: var(--ink-muted);
          text-decoration: none;
        "
      >
        <UIcon name="i-heroicons-paper-airplane" class="w-3.5 h-3.5 shrink-0" />
        Looking for jobs you applied to yourself?
        <span style="color: var(--accent)">View Job Tracker →</span>
      </NuxtLink>
    </div>

    <div v-if="pending" class="text-center py-16">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-6 h-6"
        style="color: var(--ink-muted)"
      />
    </div>

    <div v-else-if="!applications?.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon
        name="i-heroicons-briefcase"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        {{ t('candidate.offers.empty') }}
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">{{ t('candidate.offers.emptyDesc') }}</p>
      <UButton to="/candidate/jobs" variant="outline" size="sm">{{
        t('candidate.dashboard.browseJobs')
      }}</UButton>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="app in applications"
        :key="app.id"
        class="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <div class="flex-1 min-w-0">
          <div class="font-medium" style="color: var(--ink)">{{ app.job.title }}</div>
          <div class="text-sm mt-0.5" style="color: var(--ink-muted)">
            {{ app.job.company.name }}
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs" style="color: var(--ink-muted)">
            <span v-if="app.job.workMode">{{ app.job.workMode }}</span>
            <span v-if="app.job.employmentType">· {{ app.job.employmentType }}</span>
            <span v-if="app.job.officeLocation">· {{ app.job.officeLocation }}</span>
            <span v-if="app.matchedAt">· {{ formatRelativeTime(app.matchedAt) }}</span>
          </div>
        </div>
        <div class="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
          <div class="flex flex-col items-end gap-1">
            <UBadge :color="appStatusColor(app.status)" variant="soft" size="sm">
              {{ capitalizeStatus(app.status) }}
            </UBadge>
            <span v-if="app.matchScore" class="text-xs" style="color: var(--ink-muted)">
              {{ t('candidate.offers.match') }}: {{ Math.round(Number(app.matchScore)) }}%
            </span>
          </div>
          <UButton
            icon="i-heroicons-chat-bubble-left-ellipsis"
            :variant="app.status === 'screening' ? 'solid' : 'ghost'"
            :color="app.status === 'screening' ? 'primary' : 'neutral'"
            size="sm"
            :to="`/candidate/chat/${app.id}`"
          >
            {{ t('candidate.offers.chat') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
