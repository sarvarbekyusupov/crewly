<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'HH Chats' })

const api = useApi()
const route = useRoute()
const isDetailRoute = computed(() => !!route.params.chatId)

interface HhChat {
  id: string
  vacancy?: { id: string; name: string }
  resume?: { id: string; title: string }
  last_message?: {
    text?: string
    created_at: string
    author: { participant_type: string; name: string }
  }
  unread_count: number
}

const { data, pending, refresh, error } = await useAsyncData('employer-hh-chats', () =>
  api.get<{ items: HhChat[]; found: number }>('/api/v1/hh/chats', { per_page: 50 }).catch((e) => {
    if (e?.response?.status === 403) return { items: [], found: 0, _forbidden: true }
    throw e
  }),
)

const chats = computed(() => data.value?.items ?? [])
const isForbidden = computed(() => (data.value as any)?._forbidden)

function formatDate(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 1) return 'now'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'Yesterday'
  return d.toLocaleDateString()
}
</script>

<template>
  <EmployerMasterDetailLayout
    :is-detail-route="isDetailRoute"
    eyebrow="HH.uz"
    title="HH Chats"
    subtitle="Candidate conversations via HH.uz messaging."
  >
    <template #list>
      <div v-if="pending" class="space-y-2">
        <div
          v-for="i in 5"
          :key="i"
          class="rounded-xl animate-pulse h-16 bg-bg-elevated border border-line-soft"
        />
      </div>

      <CommonErrorState v-else-if="error" :retry="() => refresh()" />

      <div v-else-if="isForbidden" class="flex flex-col items-center py-12 gap-2 text-center px-4">
        <UIcon
          name="i-heroicons-lock-closed"
          class="w-10 h-10 opacity-40"
          style="color: var(--ink-subtle)"
        />
        <p class="text-sm font-medium" style="color: var(--ink)">HH permissions pending</p>
        <p class="text-xs" style="color: var(--ink-muted)">
          Awaiting HH API approval for chat access.
        </p>
      </div>

      <div v-else-if="!chats.length">
        <CommonEmptyState
          icon="i-heroicons-chat-bubble-left-right"
          title="No HH chats yet"
          description="Candidate conversations started on HH.uz will appear here."
        />
      </div>

      <div v-else class="space-y-2">
        <NuxtLink
          v-for="chat in chats"
          :key="chat.id"
          :to="`/employer/hh-chats/${chat.id}`"
          class="conv-card flex items-center gap-4 px-4 py-3 rounded-xl transition-all bg-paper border border-line hover:shadow-lg hover:border-line-soft hover:-translate-y-px"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style="background: var(--bg-elevated)"
          >
            <UIcon name="i-heroicons-user-circle" class="w-5 h-5" style="color: var(--ink-muted)" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" style="color: var(--ink)">
              {{ chat.resume?.title ?? chat.vacancy?.name ?? 'Conversation' }}
            </p>
            <p class="text-xs truncate" style="color: var(--ink-muted)">
              {{
                chat.last_message?.text?.slice(0, 80) ??
                (chat.last_message ? '(attachment)' : 'No messages')
              }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <UBadge v-if="chat.unread_count > 0" color="primary" variant="solid" size="xs">
              {{ chat.unread_count }}
            </UBadge>
            <span class="font-mono text-[10px]" style="color: var(--ink-subtle)">
              {{ formatDate(chat.last_message?.created_at) }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </template>

    <NuxtPage />
  </EmployerMasterDetailLayout>
</template>
