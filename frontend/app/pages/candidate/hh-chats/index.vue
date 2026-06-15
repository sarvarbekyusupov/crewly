<script setup lang="ts">
definePageMeta({ layout: 'candidate' })
useHead({ title: 'HH Messages' })

const api = useCandidateApi()

interface HhChat {
  id: string
  vacancy?: { id: string; name: string }
  last_message?: {
    text?: string
    created_at: string
    author: { participant_type: string; name: string }
  }
  unread_count: number
}

const forbidden = ref(false)
const { data, pending, refresh } = await useAsyncData('hh-chats-list', async () => {
  try {
    return await api.get<{ items: HhChat[]; found: number }>('/api/v1/candidate-portal/hh/chats')
  } catch (e: any) {
    if (e?.response?.status === 403 || e?.data?.statusCode === 403) {
      forbidden.value = true
      return { items: [], found: 0 }
    }
    throw e
  }
})

const chats = computed(() => data.value?.items ?? [])

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
        HH.uz
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
        Messages
      </h1>
      <p class="mt-1 text-sm" style="color: var(--ink-muted)">
        Your conversations with employers on HH.uz
      </p>
    </div>

    <div v-if="pending" class="text-center py-16">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-6 h-6"
        style="color: var(--ink-muted)"
      />
    </div>

    <div v-else-if="forbidden" class="flex flex-col items-center py-16 gap-3 text-center">
      <UIcon
        name="i-heroicons-lock-closed"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        Access pending
      </p>
      <p class="text-sm max-w-sm" style="color: var(--ink-muted)">
        HH.uz API permissions for message access are being reviewed. Conversations will appear here
        once approved.
      </p>
    </div>

    <div v-else-if="!chats.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon
        name="i-heroicons-chat-bubble-left-right"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        No conversations yet
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        Employer messages from HH.uz will appear here.
      </p>
    </div>

    <div v-else class="space-y-2">
      <NuxtLink
        v-for="chat in chats"
        :key="chat.id"
        :to="`/candidate/hh-chats/${chat.id}`"
        class="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:opacity-90"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style="background: var(--bg-elevated)"
        >
          <UIcon
            name="i-heroicons-building-office-2"
            class="w-4 h-4"
            style="color: var(--ink-muted)"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate" style="color: var(--ink)">
            {{ chat.vacancy?.name ?? 'Direct message' }}
          </p>
          <p class="text-xs truncate" style="color: var(--ink-muted)">
            {{
              chat.last_message?.text?.slice(0, 80) ??
              (chat.last_message ? '(attachment)' : 'No messages yet')
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
  </div>
</template>
