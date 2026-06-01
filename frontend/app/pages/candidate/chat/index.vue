<script setup lang="ts">
import { capitalizeStatus } from '~/utils/candidate'
import { appStatusColor } from '~/utils/statusColors'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const { t } = useI18n()

interface Application {
  id: string
  status: string
  job: {
    title: string
    company: { name: string }
  }
}

useHead({ title: t('candidate.chat.listTitle') })

const { data: applications, pending } = await useAsyncData('candidate-chats', () =>
  api.get<Application[]>('/api/v1/candidate-portal/applications').catch(() => [] as Application[]),
)

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
        {{ t('candidate.chat.eyebrow') }}
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
        {{ t('candidate.chat.listTitle') }}
      </h1>
      <p class="mt-1 text-sm" style="color: var(--ink-muted)">
        {{ t('candidate.chat.listSubtitle') }}
      </p>
    </div>

    <div v-if="pending" class="text-center py-16">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-6 h-6"
        style="color: var(--ink-muted)"
      />
    </div>

    <div v-else-if="!sortedApps?.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon
        name="i-heroicons-chat-bubble-left-right"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        {{ t('candidate.chat.noConversations') }}
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        {{ t('candidate.chat.noConversationsDesc') }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="app in sortedApps"
        :key="app.id"
        :to="`/candidate/chat/${app.id}`"
        class="rounded-xl p-5 flex items-center justify-between gap-4 transition-all hover:opacity-90"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
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
            <UBadge :color="appStatusColor(app.status)" variant="soft" size="xs">
              {{ capitalizeStatus(app.status) }}
            </UBadge>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 opacity-30" />
      </NuxtLink>
    </div>
  </div>
</template>
