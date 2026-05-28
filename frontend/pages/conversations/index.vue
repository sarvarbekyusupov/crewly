<script setup lang="ts">
import type { Conversation, PaginatedResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const route = useRoute()

const applicationFilter = ref((route.query.applicationId as string) ?? '')
const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData('conversations', () =>
  api.get<PaginatedResponse<Conversation>>('/api/v1/conversations', {
    ...(applicationFilter.value && { applicationId: applicationFilter.value }),
    page: page.value,
    limit,
  }),
)

const conversations = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watch(applicationFilter, () => {
  page.value = 1
  refresh()
})
watch(page, () => refresh())

function stateColor(s: string) {
  const map: Record<string, string> = {
    initiated: 'neutral',
    awaiting_response: 'info',
    in_progress: 'warning',
    completed: 'success',
    abandoned: 'neutral',
  }
  return map[s] ?? 'neutral'
}

function formatDate(s?: string) {
  if (!s) return '—'
  const d = new Date(s)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 48) return 'Yesterday'
  return d.toLocaleDateString()
}

function lastMessage(conv: Conversation) {
  const msgs = conv.messages ?? []
  if (!msgs.length) return null
  return msgs[msgs.length - 1]
}
</script>

<template>
  <div class="space-y-5">
    <PageHead
      eyebrow="Outreach"
      title="Conversations"
      subtitle="AI-driven candidate conversations across all channels."
    />

    <!-- Loading skeletons -->
    <div v-if="pending" class="space-y-2">
      <div
        v-for="i in 6"
        :key="i"
        class="rounded-xl animate-pulse"
        style="height: 72px; background: var(--bg-elevated); border: 1px solid var(--line-soft)"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="!conversations.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon
        name="i-heroicons-chat-bubble-left-right"
        class="w-10 h-10"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 22px; color: var(--ink); font-weight: 400"
      >
        No conversations yet
      </p>
      <p style="font-size: 13px; color: var(--ink-muted)">
        AI outreach will appear here once campaigns are started.
      </p>
    </div>

    <!-- Card feed -->
    <div v-else class="space-y-2">
      <NuxtLink
        v-for="conv in conversations"
        :key="conv.id"
        :to="`/conversations/${conv.id}`"
        class="conv-card flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
        style="background: var(--paper); border: 1px solid var(--line)"
      >
        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
          style="
            background: var(--bg-elevated);
            color: var(--ink-muted);
            font-family: 'Fraunces', serif;
            font-style: italic;
            border: 1px solid var(--line-soft);
          "
        >
          {{ conv.candidate?.fullName?.[0] ?? '?' }}
        </div>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <p class="text-sm font-medium" style="color: var(--ink)">
              {{ conv.candidate?.fullName ?? conv.candidateId?.slice(0, 8) + '…' }}
            </p>
            <div class="flex items-center gap-1">
              <UIcon
                :name="
                  conv.channel === 'telegram' ? 'i-simple-icons-telegram' : 'i-heroicons-envelope'
                "
                class="w-3 h-3"
                style="color: var(--ink-subtle)"
              />
              <span
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: var(--ink-subtle);
                "
              >
                {{ conv.channel }}
              </span>
            </div>
          </div>
          <p class="text-xs truncate" style="color: var(--ink-muted)">
            {{ lastMessage(conv)?.content?.slice(0, 90) ?? 'No messages yet' }}
          </p>
        </div>

        <!-- Right side -->
        <div class="flex flex-col items-end gap-1.5 shrink-0">
          <UBadge :color="stateColor(conv.state)" variant="subtle" size="xs">{{
            conv.state
          }}</UBadge>
          <span
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              color: var(--ink-subtle);
            "
          >
            {{ formatDate(conv.lastMessageAt) }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <div v-if="total > limit" class="flex justify-center pt-2">
      <UPagination v-model="page" :total="total" :page-size="limit" />
    </div>
  </div>
</template>

<style scoped>
.conv-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  transform: translateY(-1px);
  border-color: var(--line-soft) !important;
}
</style>
