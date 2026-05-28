<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const api = useCandidateApi()
const route = useRoute()
const applicationId = route.params.id as string

const messages = ref<any[]>([])
const content = ref('')
const isSending = ref(false)
const isLoading = ref(true)
let pollInterval: any = null
const messagesContainer = ref<HTMLElement | null>(null)

async function fetchMessages() {
  try {
    const res = await api.get<any[]>(`/api/v1/candidate-portal/applications/${applicationId}/messages`)
    const wasAtBottom = isScrolledToBottom()
    messages.value = res ?? []
    if (wasAtBottom) {
      await nextTick()
      scrollToBottom()
    }
  } catch (err) {
    console.error('Failed to fetch messages', err)
  } finally {
    isLoading.value = false
  }
}

async function sendMessage() {
  if (!content.value.trim() || isSending.value) return

  const text = content.value.trim()
  content.value = ''
  isSending.value = true

  // Optimistic UI update
  messages.value.push({
    id: 'temp-' + Date.now(),
    direction: 'inbound',
    sender: 'candidate',
    content: text,
    createdAt: new Date().toISOString()
  })
  
  await nextTick()
  scrollToBottom()

  try {
    await api.post(`/api/v1/candidate-portal/applications/${applicationId}/messages`, { content: text })
    await fetchMessages() // Refresh to get the actual message from DB
  } catch (err) {
    console.error('Failed to send message', err)
    // Could remove the optimistic message here or show an error
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
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(dateStr))
}
</script>

<template>
  <div class="max-w-3xl mx-auto h-[calc(100dvh-64px)] flex flex-col pt-6 pb-6 px-4">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-4 shrink-0">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        to="/candidate/applications"
      />
      <div>
        <h1 class="text-xl font-medium" style="color: var(--ink)">Screening Chat</h1>
        <p class="text-xs" style="color: var(--ink-subtle)">AI Recruiter</p>
      </div>
    </div>

    <!-- Messages Container -->
    <div 
      class="flex-1 overflow-y-auto rounded-xl p-4 flex flex-col gap-4"
      style="background: var(--paper); border: 1px solid var(--line)"
      ref="messagesContainer"
    >
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" style="color: var(--ink-subtle)" />
      </div>
      
      <div v-else-if="!messages.length" class="flex-1 flex flex-col items-center justify-center text-center">
        <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mb-3" style="color: var(--ink-subtle)" />
        <p class="text-sm font-medium" style="color: var(--ink)">No messages yet</p>
        <p class="text-xs" style="color: var(--ink-muted)">Send a message to start the screening process.</p>
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
              ? 'rounded-tr-sm bg-[var(--ink)] text-[var(--bg)]' 
              : 'rounded-tl-sm bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-soft)]'
          ]"
        >
          {{ msg.content }}
        </div>
        <span class="text-[10px] mt-1 px-1" style="color: var(--ink-subtle)" :class="msg.direction === 'inbound' ? 'text-right' : 'text-left'">
          {{ formatTime(msg.createdAt) }}
        </span>
      </div>
    </div>

    <!-- Input Area -->
    <div class="mt-4 shrink-0">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <UInput
          v-model="content"
          placeholder="Type your message..."
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
          Send
        </UButton>
      </form>
    </div>
  </div>
</template>
