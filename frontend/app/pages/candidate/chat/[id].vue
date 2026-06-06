<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { playPop, playSwoosh } = useAudio()
const applicationId = route.params.id as string
const MAX_LENGTH = 500

interface ApplicationContext {
  id: string
  status: string
  matchScore?: string
  job?: {
    title: string
    workMode?: string
    company: { name: string }
  }
}

const { clearNewMessage } = await import('~/composables/useCandidateEventStream')

const { data: application } = await useAsyncData(
  `chat-app-${applicationId}`,
  () =>
    api
      .get<ApplicationContext>(`/api/v1/candidate-portal/applications/${applicationId}`)
      .catch(() => null),
)

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
const messagesContainer = ref<HTMLElement | null>(null)

// ── Voice Mode Setup ──
const isVoiceMode = ref(false)
const isListening = ref(false)
let recognition: any = null

// ── Video Mode Setup ──
const isVideoMode = ref(false)
const localVideoStream = ref<MediaStream | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)

async function toggleVideoMode() {
  isVideoMode.value = !isVideoMode.value
  
  if (isVideoMode.value) {
    playPop()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      localVideoStream.value = stream
      nextTick(() => {
        if (videoElement.value) {
          videoElement.value.srcObject = stream
        }
      })
    } catch {
      toast.add({ title: 'Webcam permission denied or unavailable', color: 'error' })
      isVideoMode.value = false
    }
  } else {
    playSwoosh()
    stopVideo()
  }
}

function stopVideo() {
  if (localVideoStream.value) {
    localVideoStream.value.getTracks().forEach((track) => track.stop())
    localVideoStream.value = null
  }
}

function initSpeech() {
  if (typeof window === 'undefined') return
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      isListening.value = true
    }

    recognition.onend = () => {
      isListening.value = false
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      content.value = transcript
    }
  }
}

function toggleListening() {
  if (!recognition) initSpeech()
  if (!recognition) {
    toast.add({ title: 'Speech recognition not supported', color: 'error' })
    return
  }

  if (isListening.value) {
    recognition.stop()
  } else {
    recognition.start()
  }
}

function speakMessage(text: string) {
  if (typeof window === 'undefined' || !isVoiceMode.value) return
  try {
    const synth = window.speechSynthesis
    synth.cancel() // Stop active speech first
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    synth.speak(utterance)
  } catch {
    // Ignore synthesis failure
  }
}

async function fetchMessages() {
  try {
    const res = await api.get<ChatMessage[]>(
      `/api/v1/candidate-portal/applications/${applicationId}/messages`,
    )
    const wasAtBottom = isScrolledToBottom()
    const oldLength = messages.value.length
    messages.value = res ?? []

    // Voice feedback on new AI messages
    if (messages.value.length > oldLength) {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.direction === 'outbound') {
        speakMessage(lastMsg.content)
      }
    }

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
  if (!content.value.trim() || isSending.value || content.value.length > MAX_LENGTH) return

  const text = content.value.trim()
  content.value = ''
  isSending.value = true
  playSwoosh()

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

import { newMessageBus } from '~/composables/useCandidateEventStream'

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

let unsubscribe: (() => void) | null = null

onMounted(() => {
  clearNewMessage(applicationId)
  fetchMessages().then(() => {
    setTimeout(scrollToBottom, 100)
  })
  
  // Real-time message streaming subscription
  unsubscribe = newMessageBus.on((event) => {
    if (event.applicationId === applicationId) {
      fetchMessages()
    }
  })
})

onUnmounted(() => {
  stopVideo()
  if (unsubscribe) unsubscribe()
})

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(dateStr),
  )
}
</script>

<template>
  <div class="max-w-3xl mx-auto h-[calc(100dvh-64px)] flex flex-col pt-6 pb-6 px-4">
    <div class="flex items-center gap-4 mb-4 shrink-0 justify-between">
      <div class="flex items-center gap-4 min-w-0">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          size="sm"
          @click="router.back()"
        />
        <div>
          <h1 class="text-xl font-medium truncate" style="color: var(--ink)">
            {{ application?.job?.title ?? t('candidate.chat.title') }}
          </h1>
          <p class="text-xs" style="color: var(--ink-subtle)">
            {{ application?.job?.company?.name ?? t('candidate.chat.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Voice & Video Mode Switches -->
      <div class="flex items-center gap-1.5 shrink-0">
        <UButton
          :color="isVideoMode ? 'success' : 'neutral'"
          :variant="isVideoMode ? 'subtle' : 'outline'"
          size="xs"
          :icon="isVideoMode ? 'i-heroicons-video-camera' : 'i-heroicons-video-camera-slash'"
          @click="toggleVideoMode"
        >
          {{ isVideoMode ? 'Video: On' : 'Video: Off' }}
        </UButton>
        <UButton
          :color="isVoiceMode ? 'success' : 'neutral'"
          :variant="isVoiceMode ? 'subtle' : 'outline'"
          size="xs"
          :icon="isVoiceMode ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
          @click="isVoiceMode = !isVoiceMode"
        >
          {{ isVoiceMode ? 'Voice: On' : 'Voice: Off' }}
        </UButton>
      </div>
    </div>

    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto rounded-xl p-4 flex flex-col gap-4"
      style="background: var(--paper); border: 1px solid var(--line)"
    >
      <!-- Live Video Screening Simulator Cockpit -->
      <div v-if="isVideoMode" class="flex gap-4 shrink-0 animate-fade-in pb-3 border-b border-line-soft">
        <!-- Left Pane: Candidate Webcam stream -->
        <div class="relative w-1/2 aspect-video rounded-xl border border-line overflow-hidden bg-black shadow-inner flex items-center justify-center">
          <video ref="videoElement" autoplay playsinline class="w-full h-full object-cover" />
          <span class="absolute bottom-2 left-2 text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-black/60 text-white">LIVE FEED (YOU)</span>
        </div>
        <!-- Right Pane: Recruiter AI Avatar -->
        <div class="relative w-1/2 aspect-video rounded-xl border border-line overflow-hidden bg-bg-deep flex flex-col items-center justify-center shadow-inner">
          <div class="relative w-12 h-12 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full bg-accent/25" :class="{ 'animate-ping': isSending }" />
            <div class="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-md" :class="{ 'animate-pulse': !isSending }">
              <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-white" />
            </div>
          </div>
          <p class="text-[9px] font-mono font-bold text-accent uppercase mt-2.5 tracking-wider">myHR AI Recruiter</p>
        </div>
      </div>

      <!-- Job context card -->
      <div
        v-if="application?.job"
        class="shrink-0 rounded-xl px-4 py-3 flex items-start gap-3"
        style="background: var(--accent-soft); border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent)"
      >
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 mt-0.5 shrink-0" style="color: var(--accent)" />
        <div class="text-xs" style="color: var(--ink-muted); line-height: 1.6">
          <p>
            <strong style="color: var(--ink)">AI screening</strong> for
            <strong style="color: var(--ink)">{{ application.job.title }}</strong>
            at {{ application.job.company.name }}.
          </p>
          <p>Answer naturally — you can return to this conversation anytime.</p>
        </div>
      </div>

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
          :class="msg.direction === 'inbound' ? 'rounded-tr-sm' : 'rounded-tl-sm border'"
          :style="
            msg.direction === 'inbound'
              ? 'background: var(--ink); color: var(--bg)'
              : 'background: var(--surface); color: var(--ink); border-color: var(--line-soft)'
          "
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

      <!-- AI Typing Indicator -->
      <div v-if="isSending" class="flex flex-col max-w-[85%] self-start animate-fade-in">
        <div
          class="px-4 py-3 rounded-2xl rounded-tl-sm border flex items-center gap-1.5"
          style="background: var(--surface); color: var(--ink); border-color: var(--line-soft)"
        >
          <span class="typing-dot animate-bounce" style="animation-delay: 0s" />
          <span class="typing-dot animate-bounce" style="animation-delay: 0.2s" />
          <span class="typing-dot animate-bounce" style="animation-delay: 0.4s" />
        </div>
        <span class="text-[10px] mt-1 px-1 text-ink-subtle text-left">
          myHR Recruiter is thinking...
        </span>
      </div>
    </div>

    <div class="mt-4 shrink-0">
      <form class="space-y-1" @submit.prevent="sendMessage">
        <div class="flex gap-2">
          <!-- Mic Dictation Button -->
          <UButton
            v-if="isVoiceMode"
            type="button"
            :color="isListening ? 'error' : 'neutral'"
            :variant="isListening ? 'solid' : 'outline'"
            icon="i-heroicons-microphone"
            class="relative shrink-0"
            :class="{ 'animate-pulse bg-red-500 text-white': isListening }"
            @click="toggleListening"
          />
          <UInput
            v-model="content"
            :placeholder="isListening ? 'Listening...' : t('candidate.chat.placeholder')"
            class="flex-1"
            :disabled="isSending"
            :maxlength="MAX_LENGTH"
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
        </div>
        <div
          v-if="content.length > MAX_LENGTH * 0.8"
          class="text-right text-xs"
          :style="
            content.length >= MAX_LENGTH ? 'color: var(--negative)' : 'color: var(--ink-subtle)'
          "
        >
          {{ content.length }}/{{ MAX_LENGTH }}
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-muted);
  display: inline-block;
}
</style>
