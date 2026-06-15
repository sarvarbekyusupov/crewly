<script setup lang="ts">
const api = useApi()
const toast = useToast()
const route = useRoute()
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

async function fetchMessages() {
  try {
    const res = await api.get<{ items: HhMessage[]; limit: number }>(
      `/api/v1/hh/chats/${chatId}/messages`,
      { order: 'prev', limit: 50 },
    )
    messages.value = (res?.items ?? []).slice().reverse()
    if (messages.value.length) {
      const last = messages.value[messages.value.length - 1]
      api.put(`/api/v1/hh/chats/${chatId}/messages/${last.id}/read`, {}).catch(() => {})
    }
  } catch {
    // silence — employer may see 403 on individual chats
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
    author: { participant_type: 'employer', name: 'You' },
  }
  messages.value.push(optimistic)
  await nextTick()
  scrollToBottom()

  try {
    await api.post(`/api/v1/hh/chats/${chatId}/messages`, { text: msg })
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
</script>

<template>
  <div class="h-full flex flex-col p-6">
    <div class="shrink-0 mb-4 pb-3" style="border-bottom: 1px solid var(--line-soft)">
      <p class="text-xs font-mono uppercase tracking-wider mb-0.5" style="color: var(--ink-subtle)">
        HH.uz
      </p>
      <h2 class="text-lg font-medium" style="color: var(--ink)">Conversation</h2>
    </div>

    <div
      ref="container"
      class="flex-1 overflow-y-auto rounded-xl p-4 flex flex-col gap-3"
      style="background: var(--paper); border: 1px solid var(--line)"
    >
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-5 h-5 animate-spin"
          style="color: var(--ink-subtle)"
        />
      </div>

      <div
        v-else-if="!messages.length"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-center"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="w-10 h-10 opacity-30"
          style="color: var(--ink-subtle)"
        />
        <p class="text-sm" style="color: var(--ink-muted)">No messages yet.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex flex-col max-w-[85%]"
        :class="msg.author.participant_type === 'employer' ? 'self-end' : 'self-start'"
      >
        <div
          class="px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm"
          :class="
            msg.author.participant_type === 'employer' ? 'rounded-tr-sm' : 'rounded-tl-sm border'
          "
          :style="
            msg.author.participant_type === 'employer'
              ? 'background: var(--ink); color: var(--bg)'
              : 'background: var(--surface); color: var(--ink); border-color: var(--line-soft)'
          "
        >
          {{ msg.text ?? '(attachment)' }}
        </div>
        <span
          class="text-[10px] mt-1 px-1"
          style="color: var(--ink-subtle)"
          :class="msg.author.participant_type === 'employer' ? 'text-right' : 'text-left'"
        >
          {{ msg.author.name }} · {{ formatTime(msg.created_at) }}
        </span>
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
