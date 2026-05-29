<script setup lang="ts">
definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const api = useCandidateApi()

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

const { data: applications, pending } = await useAsyncData('candidate-applications-full', () =>
  api.get<Application[]>('/api/v1/candidate-portal/applications').catch(() => [] as Application[]),
)

const statusColor: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'> = {
  matched: 'info',
  outreach_sent: 'warning',
  responded: 'primary',
  screened: 'primary',
  delivered: 'success',
  interviewed: 'success',
  hired: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <h1
        class="font-serif text-2xl font-normal"
        style="color: var(--ink); letter-spacing: -0.02em"
      >
        Applications
      </h1>
      <p class="text-sm mt-1" style="color: var(--ink-muted)">
        All your job applications in one place.
      </p>
    </div>

    <div v-if="pending" class="text-center py-16">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-6 h-6"
        style="color: var(--ink-muted)"
      />
    </div>
    <div
      v-else-if="!applications?.length"
      class="text-center py-16 text-sm"
      style="color: var(--ink-muted)"
    >
      No applications yet.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="app in applications"
        :key="app.id"
        class="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style="background: var(--paper); border: 1px solid var(--line)"
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
          </div>
        </div>
        <div class="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
          <div class="flex flex-col items-end gap-1">
            <UBadge :color="statusColor[app.status] ?? 'neutral'" variant="soft" size="sm">
              {{ app.status.replace(/_/g, ' ') }}
            </UBadge>
            <span v-if="app.matchScore" class="text-xs" style="color: var(--ink-muted)">
              Match: {{ Math.round(Number(app.matchScore)) }}%
            </span>
          </div>
          <UButton
            icon="i-heroicons-chat-bubble-left-ellipsis"
            :variant="app.status === 'screening' ? 'solid' : 'ghost'"
            :color="app.status === 'screening' ? 'primary' : 'neutral'"
            size="sm"
            :to="`/candidate/chat/${app.id}`"
          >
            Chat
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
