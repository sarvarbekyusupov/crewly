<script setup lang="ts">
import type { Conversation, PaginatedResponse } from '~/types/api'

const { t } = useI18n()
useHead({ title: computed(() => t('conversations.title')) })
const api = useApi()
const route = useRoute()

const isDetailRoute = computed(() => !!route.params.id)

const applicationFilter = ref((route.query.applicationId as string) ?? '')
const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
  error,
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

function stateColor(
  s: string,
): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  const map: Record<
    string,
    'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  > = {
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
  <EmployerMasterDetailLayout
    :is-detail-route="isDetailRoute"
    eyebrow="Outreach"
    title="Conversations"
    subtitle="AI-driven candidate conversations across all channels."
  >
    <template #list>
      <!-- Loading skeletons -->
      <div v-if="pending" class="space-y-2">
        <div
          v-for="i in 6"
          :key="i"
          class="rounded-xl animate-pulse h-[72px] bg-bg-elevated border border-line-soft"
        />
      </div>

      <CommonErrorState v-else-if="error" :retry="() => refresh()" />

      <!-- Empty state -->
      <div v-else-if="!conversations.length">
        <CommonEmptyState
          icon="i-heroicons-chat-bubble-left-right"
          title="No conversations yet"
          description="AI outreach will appear here once campaigns are started."
        />
      </div>

      <!-- Card feed -->
      <div v-else class="space-y-2">
        <NuxtLink
          v-for="conv in conversations"
          :key="conv.id"
          :to="`/employer/conversations/${conv.id}`"
          class="conv-card flex items-center gap-4 px-4 py-3 rounded-xl transition-all bg-paper border border-line hover:shadow-lg hover:border-line-soft hover:-translate-y-px"
        >
          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base bg-bg-elevated text-ink-muted font-serif italic border border-line-soft"
          >
            {{ conv.candidate?.fullName?.[0] ?? '?' }}
          </div>

          <!-- Main content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <p class="text-sm font-medium text-ink">
                {{ conv.candidate?.fullName ?? conv.candidateId?.slice(0, 8) + '…' }}
              </p>
              <div class="flex items-center gap-1">
                <UIcon
                  :name="
                    conv.channel === 'telegram' ? 'i-simple-icons-telegram' : 'i-heroicons-envelope'
                  "
                  class="w-3 h-3 text-ink-subtle"
                />
                <span class="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-subtle">
                  {{ conv.channel }}
                </span>
              </div>
            </div>
            <p class="text-xs truncate text-ink-muted">
              {{ lastMessage(conv)?.content?.slice(0, 90) ?? 'No messages yet' }}
            </p>
          </div>

          <!-- Right side -->
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <UBadge :color="stateColor(conv.state)" variant="subtle" size="xs">{{
              conv.state
            }}</UBadge>
            <span class="font-mono text-[10px] text-ink-subtle">
              {{ formatDate(conv.lastMessageAt) }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="total > limit" class="flex justify-center pt-2">
        <UPagination v-model="page" :total="total" :page-size="limit" />
      </div>
    </template>

    <NuxtPage />
  </EmployerMasterDetailLayout>
</template>
