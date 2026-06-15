<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const chatId = route.params.chatId as string

interface HhMessage {
  id: string
  text?: string
  created_at: string
  author: { participant_type: 'applicant' | 'employer'; name: string }
}

const messages = ref<HhMessage[]>([])
const text = ref('')
const sending = ref(false)
const loading = ref(true)
const container = ref<HTMLElement | null>(null)
const vacancyName = ref('')

async function fetchMessages() {
  try {
    const res = await api.get<{ items: HhMessage[]; limit: number }>(
      `/api/v1/candidate-portal/hh/chats/${chatId}/messages`,
      { order: 'prev', limit: 50 },
    )
    messages.value = (res?.items ?? []).slice().reverse()
    if (messages.value.length) {
      // mark last message as read
      const last = messages.value[messages.value.length - 1]
      api
        .put(`/api/v1/candidate-portal/hh/chats/${chatId}/messages/${last.id}/read`, {})
        .catch(() => {})
    }
  } catch (e: any) {
    if (e?.response?.status !== 403) {
      toast.add({ title: 'Failed to load messages', color: 'error' })
    }
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function send() {
  const msg = text.value.trim()
  if (!msg || sending.value) return
  text.value = ''
  sending.value = true

  const optimistic: HhMessage = {
    id: 'tmp-' + Date.now(),
    text: msg,
    created_at: new Date().toISOString(),
    author: { participant_type: 'applicant', name: 'You' },
  }
  messages.value.push(optimistic)
  await nextTick()
  scrollToBottom()

  try {
    await api.post(`/api/v1/candidate-portal/hh/chats/${chatId}/messages`, { text: msg })
    await fetchMessages()
  } catch (e: any) {
    toast.add({ title: 'Failed to send', description: extractApiErrorMessage(e), color: 'error' })
    messages.value = messages.value.filter((m) => m.id !== optimistic.id)
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (container.value) container.value.scrollTop = container.value.scrollHeight
}

function formatTime(s: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(s),
  )
}

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchMessages()
  pollTimer = setInterval(fetchMessages, 15_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

useHead({ title: computed(() => vacancyName.value || 'HH Chat') })
</script>

<template>
  <div class="max-w-3xl mx-auto h-[calc(100dvh-64px)] flex flex-col pt-6 pb-6 px-4">
    <div class="flex items-center gap-4 mb-4 shrink-0">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-xl font-medium" style="color: var(--ink)">
          {{ vacancyName || 'HH Conversation' }}
        </h1>
        <p class="text-xs font-mono" style="color: var(--ink-subtle)">hh.uz</p>
      </div>
    </div>

    <div
      ref="container"
      class="flex-1 overflow-y-auto rounded-xl p-4 flex flex-col gap-4"
      style="background: var(--paper); border: 1px solid var(--line)"
    >
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>

      <div
        v-else-if="!messages.length"
        class="flex-1 flex flex-col items-center justify-center text-center gap-3"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="w-12 h-12 opacity-30"
          style="color: var(--ink-subtle)"
        />
        <p class="text-sm" style="color: var(--ink-muted)">No messages in this conversation yet.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex flex-col max-w-[85%]"
        :class="msg.author.participant_type === 'applicant' ? 'self-end' : 'self-start'"
      >
        <div
          class="px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm"
          :class="
            msg.author.participant_type === 'applicant' ? 'rounded-tr-sm' : 'rounded-tl-sm border'
          "
          :style="
            msg.author.participant_type === 'applicant'
              ? 'background: var(--ink); color: var(--bg)'
              : 'background: var(--surface); color: var(--ink); border-color: var(--line-soft)'
          "
        >
          {{ msg.text ?? '(attachment)' }}
        </div>
        <div
          class="flex items-center gap-1 mt-1 px-1"
          :class="msg.author.participant_type === 'applicant' ? 'justify-end' : 'justify-start'"
        >
          <span class="text-[10px]" style="color: var(--ink-subtle)">
            {{ msg.author.name }} · {{ formatTime(msg.created_at) }}
          </span>
        </div>
      </div>
    </div>

    <form class="mt-4 flex gap-2 shrink-0" @submit.prevent="send">
      <UInput
        v-model="text"
        placeholder="Write a message…"
        class="flex-1"
        :disabled="sending"
        :maxlength="4000"
        autocomplete="off"
      />
      <UButton
        type="submit"
        color="primary"
        :loading="sending"
        :disabled="!text.trim()"
        icon="i-heroicons-paper-airplane"
      />
    </form>
  </div>
</template>
