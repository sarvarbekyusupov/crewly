<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()

interface Application {
  id: string
  status: string
  job: {
    title: string
    company: { name: string }
  }
}

const { data: applications, pending } = await useAsyncData('candidate-chats', () =>
  api.get<Application[]>('/api/v1/candidate-portal/applications').catch(() => [] as Application[]),
)

// We filter applications that are in outreach or screening status to prioritize active chats
const sortedApps = computed(() => {
  if (!applications.value) return []
  return [...applications.value].sort((a, b) => {
    const priority = ['screening', 'responded', 'outreach_sent']
    const aIdx = priority.indexOf(a.status)
    const bIdx = priority.indexOf(b.status)
    if (aIdx !== bIdx) {
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    }
    return 0
  })
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <h1
        class="font-serif text-2xl font-normal"
        style="color: var(--ink); letter-spacing: -0.02em"
      >
        Messages
      </h1>
      <p class="text-sm mt-1" style="color: var(--ink-muted)">
        Chat with AI recruiters about your applications.
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
      v-else-if="!sortedApps?.length"
      class="text-center py-16 text-sm"
      style="color: var(--ink-muted)"
    >
      <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mb-3 mx-auto opacity-20" />
      <p>No active conversations yet.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="app in sortedApps"
        :key="app.id"
        :to="`/candidate/chat/${app.id}`"
        class="rounded-xl p-5 flex items-center justify-between gap-4 transition-all hover:scale-[1.01]"
        style="background: var(--paper); border: 1px solid var(--line)"
      >
        <div class="min-w-0">
          <div
            class="text-xs font-mono uppercase tracking-wider mb-1"
            style="color: var(--ink-subtle)"
          >
            {{ app.job.company.name }}
          </div>
          <div class="font-medium text-lg truncate" style="color: var(--ink)">
            {{ app.job.title }}
          </div>
          <div class="flex items-center gap-2 mt-2">
            <UBadge
              :color="app.status === 'screening' ? 'primary' : 'neutral'"
              variant="soft"
              size="xs"
            >
              {{ app.status.replace(/_/g, ' ') }}
            </UBadge>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 opacity-30" />
      </NuxtLink>
    </div>
  </div>
</template>
