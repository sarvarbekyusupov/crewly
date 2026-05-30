<script setup lang="ts">
import type { Conversation } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const { conversationStateLabel } = useStatusLabels()

const id = route.params.id as string

const {
  data: conversation,
  pending,
  refresh,
} = await useAsyncData(`conversation-${id}`, () =>
  api.get<Conversation>(`/api/v1/conversations/${id}`),
)

const isActive = computed(
  () => !['completed', 'abandoned'].includes(conversation.value?.state ?? 'completed'),
)

const replyContent = ref('')
const replySending = ref(false)

async function sendReply() {
  if (!replyContent.value.trim()) return
  replySending.value = true
  try {
    await api.post(`/api/v1/conversations/${id}/messages`, { content: replyContent.value })
    replyContent.value = ''
    refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    replySending.value = false
  }
}

// 30s fallback poll — SSE (company.event → new_message) is the primary update mechanism
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  pollTimer = setInterval(() => {
    if (isActive.value) refresh()
  }, 30_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

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

const messages = computed(() => conversation.value?.messages ?? [])

const isMac = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
})

const sendShortcut = computed(() => (isMac.value ? '⌘↵' : 'Ctrl+Enter'))
</script>

<template>
  <div class="space-y-5">
    <!-- Hero header -->
    <div class="pb-5" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-center gap-3 mb-2">
        <NuxtLink to="/conversations" style="color: var(--ink-muted)">
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <p
          style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--ink-subtle);
          "
        >
          {{ t('conversations.breadcrumb') }}
        </p>
        <UBadge
          v-if="conversation"
          :color="stateColor(conversation.state)"
          variant="subtle"
          size="xs"
        >
          {{ conversationStateLabel(conversation.state) }}
        </UBadge>
      </div>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -0.035em;
          color: var(--ink);
          font-weight: 400;
        "
      >
        {{ conversation?.candidate?.fullName ?? 'Conversation' }}
      </h1>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin"
        style="color: var(--ink-subtle)"
      />
    </div>

    <template v-else-if="conversation">
      <!-- Meta strip -->
      <div
        class="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl p-4"
        style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
      >
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 4px;
            "
          >
            {{ t('conversations.candidate') }}
          </p>
          <NuxtLink
            :to="`/candidates/${conversation.candidateId}`"
            style="font-size: 13px; font-weight: 500; color: var(--accent)"
          >
            {{ conversation.candidate?.fullName ?? conversation.candidateId.slice(0, 8) + '…' }}
          </NuxtLink>
        </div>
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 4px;
            "
          >
            {{ t('conversations.channel') }}
          </p>
          <div class="flex items-center gap-1.5">
            <UIcon
              :name="
                conversation.channel === 'telegram'
                  ? 'i-simple-icons-telegram'
                  : 'i-heroicons-envelope'
              "
              class="w-4 h-4"
              style="color: var(--ink-muted)"
            />
            <span class="capitalize text-sm font-medium" style="color: var(--ink)">{{
              conversation.channel
            }}</span>
          </div>
        </div>
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 4px;
            "
          >
            {{ t('conversations.started') }}
          </p>
          <p class="text-sm font-medium" style="color: var(--ink)">
            {{ formatDateTime(conversation.createdAt) }}
          </p>
        </div>
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 4px;
            "
          >
            {{ t('conversations.lastMessage') }}
          </p>
          <p class="text-sm font-medium" style="color: var(--ink)">
            {{ formatDateTime(conversation.lastMessageAt) }}
          </p>
        </div>
      </div>

      <!-- Chat -->
      <div
        class="rounded-2xl overflow-hidden"
        style="background: var(--paper); border: 1px solid var(--line)"
      >
        <div
          class="flex items-center justify-between px-5 py-3"
          style="border-bottom: 1px solid var(--line-soft); background: var(--bg-elevated)"
        >
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-muted);
            "
          >
            {{ t('conversations.messages') }}
          </p>
          <span
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              color: var(--ink-subtle);
            "
            >{{ messages.length }}</span
          >
        </div>

        <div
          v-if="messages.length === 0"
          class="py-16 text-center"
          style="color: var(--ink-subtle)"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="w-10 h-10 mx-auto mb-3 opacity-30"
          />
          <p class="text-sm">{{ t('conversations.noMessages') }}</p>
        </div>

        <div v-else class="p-5 flex flex-col gap-4 max-h-150 overflow-y-auto">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex gap-3"
            :class="msg.sender === 'candidate' ? 'flex-row-reverse' : ''"
          >
            <!-- Avatar -->
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
              :style="
                msg.sender === 'ai'
                  ? 'background: var(--accent-soft); color: var(--accent); border: 1px solid var(--line);'
                  : msg.sender === 'recruiter'
                    ? 'background: var(--positive-soft); color: var(--positive); border: 1px solid var(--line-soft);'
                    : 'background: var(--bg-deep); color: var(--ink-muted); border: 1px solid var(--line-soft);'
              "
            >
              <UIcon
                :name="
                  msg.sender === 'ai'
                    ? 'i-heroicons-cpu-chip'
                    : msg.sender === 'recruiter'
                      ? 'i-heroicons-briefcase'
                      : 'i-heroicons-user'
                "
                class="w-3.5 h-3.5"
              />
            </div>

            <!-- Bubble -->
            <div
              class="max-w-[75%]"
              :class="msg.sender === 'candidate' ? 'items-end' : 'items-start'"
              style="display: flex; flex-direction: column; gap: 4px"
            >
              <div
                class="flex items-center gap-2"
                :class="msg.sender === 'candidate' ? 'flex-row-reverse' : ''"
              >
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                  "
                  :style="
                    msg.sender === 'ai'
                      ? 'color: var(--accent);'
                      : msg.sender === 'recruiter'
                        ? 'color: var(--positive);'
                        : 'color: var(--ink-subtle);'
                  "
                >
                  {{
                    msg.sender === 'ai'
                      ? t('conversations.senderAi')
                      : msg.sender === 'recruiter'
                        ? t('conversations.senderRecruiter')
                        : t('conversations.senderCandidate')
                  }}
                </span>
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    color: var(--ink-subtle);
                  "
                >
                  {{ formatDateTime(msg.createdAt) }}
                </span>
              </div>
              <div
                class="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                :style="
                  msg.sender === 'ai'
                    ? 'background: var(--bg-elevated); border: 1px solid var(--line-soft); color: var(--ink); border-top-left-radius: 4px;'
                    : msg.sender === 'recruiter'
                      ? 'background: var(--bg-elevated); border: 1px solid var(--line); color: var(--ink); border-top-left-radius: 4px;'
                      : 'background: var(--ink); color: var(--bg); border-top-right-radius: 4px;'
                "
              >
                {{ msg.content }}
              </div>
            </div>
          </div>
        </div>

        <!-- Recruiter reply -->
        <div v-if="isActive" class="px-5 pb-5 pt-4" style="border-top: 1px solid var(--line-soft)">
          <div class="flex gap-3 items-end">
            <UTextarea
              v-model="replyContent"
              :placeholder="t('conversations.sendPlaceholder')"
              :rows="2"
              class="flex-1"
              @keydown.ctrl.enter="sendReply"
              @keydown.meta.enter="sendReply"
            />
            <UButton
              icon="i-heroicons-paper-airplane"
              :loading="replySending"
              :disabled="!replyContent.trim()"
              @click="sendReply"
              >{{ t('conversations.send') }}</UButton
            >
          </div>
          <p class="text-xs mt-1.5" style="color: var(--ink-subtle)">
            {{
              t('conversations.sendHint', { shortcut: sendShortcut, channel: conversation.channel })
            }}
          </p>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-12 space-y-3">
      <p style="color: var(--ink-muted)">{{ t('conversations.notFound') }}</p>
      <UButton variant="outline" size="sm" @click="() => refresh()">{{
        t('common.retry')
      }}</UButton>
    </div>
  </div>
</template>
