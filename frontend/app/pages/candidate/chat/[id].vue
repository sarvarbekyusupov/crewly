<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const applicationId = route.params.id as string

interface ChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  sender: string
  content: string
  createdAt: string
}

const messages = ref<ChatMessage[]>([])
const content = ref('')
const isSending = ref(false)
const isLoading = ref(true)
let pollInterval: ReturnType<typeof setInterval> | null = null
const messagesContainer = ref<HTMLElement | null>(null)

async function fetchMessages() {
  try {
    const res = await api.get<ChatMessage[]>(
      `/api/v1/candidate-portal/applications/${applicationId}/messages`,
    )
    const wasAtBottom = isScrolledToBottom()
    messages.value = res ?? []
    if (wasAtBottom) {
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(e, t('candidate.chat.fetchFailed')),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

async function sendMessage() {
  if (!content.value.trim() || isSending.value) return

  const text = content.value.trim()
  content.value = ''
  isSending.value = true

  messages.value.push({
    id: 'temp-' + Date.now(),
    direction: 'inbound',
    sender: 'candidate',
    content: text,
    createdAt: new Date().toISOString(),
  })

  await nextTick()
  scrollToBottom()

  try {
    await api.post(`/api/v1/candidate-portal/applications/${applicationId}/messages`, {
      content: text,
    })
    await fetchMessages()
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(e, t('candidate.chat.sendFailed')),
      color: 'error',
    })
    messages.value = messages.value.filter((m) => !m.id.startsWith('temp-'))
  } finally {
    isSending.value = false
  }
}

function isScrolledToBottom() {
  if (!messagesContainer.value) return false
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  return scrollHeight - scrollTop - clientHeight < 50
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onMounted(() => {
  fetchMessages().then(() => {
    setTimeout(scrollToBottom, 100)
  })
  pollInterval = setInterval(fetchMessages, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(dateStr),
  )
}
</script>

<template>
  <div class="max-w-3xl mx-auto h-[calc(100dvh-64px)] flex flex-col pt-6 pb-6 px-4">
    <div class="flex items-center gap-4 mb-4 shrink-0">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        to="/candidate/offers"
      />
      <div>
        <h1 class="text-xl font-medium" style="color: var(--ink)">
          {{ t('candidate.chat.title') }}
        </h1>
        <p class="text-xs" style="color: var(--ink-subtle)">{{ t('candidate.chat.subtitle') }}</p>
      </div>
    </div>

    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto rounded-xl p-4 flex flex-col gap-4"
      style="background: var(--paper); border: 1px solid var(--line)"
    >
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>

      <div
        v-else-if="!messages.length"
        class="flex-1 flex flex-col items-center justify-center text-center"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="w-12 h-12 mb-3"
          style="color: var(--ink-subtle)"
        />
        <p class="text-sm font-medium" style="color: var(--ink)">
          {{ t('candidate.chat.noMessages') }}
        </p>
        <p class="text-xs" style="color: var(--ink-muted)">{{ t('candidate.chat.startPrompt') }}</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex flex-col max-w-[85%]"
        :class="msg.direction === 'inbound' ? 'self-end' : 'self-start'"
      >
        <div
          class="px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm"
          :class="[
            msg.direction === 'inbound'
              ? 'rounded-tr-sm bg-(--ink) text-(--bg)'
              : 'rounded-tl-sm bg-(--surface) text-(--ink) border border-(--line-soft)',
          ]"
        >
          {{ msg.content }}
        </div>
        <span
          class="text-[10px] mt-1 px-1"
          style="color: var(--ink-subtle)"
          :class="msg.direction === 'inbound' ? 'text-right' : 'text-left'"
        >
          {{ formatTime(msg.createdAt) }}
        </span>
      </div>
    </div>

    <div class="mt-4 shrink-0">
      <form class="flex gap-2" @submit.prevent="sendMessage">
        <UInput
          v-model="content"
          :placeholder="t('candidate.chat.placeholder')"
          class="flex-1"
          :disabled="isSending"
          autocomplete="off"
        />
        <UButton
          type="submit"
          color="primary"
          :loading="isSending"
          :disabled="!content.trim()"
          icon="i-heroicons-paper-airplane"
        >
          {{ t('candidate.chat.send') }}
        </UButton>
      </form>
    </div>
  </div>
</template>
