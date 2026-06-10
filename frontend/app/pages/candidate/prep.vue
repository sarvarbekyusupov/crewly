<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { playPop, playSwoosh } = useAudio()

// ── Job picker + question loading ────────────────────────────────────────────

interface JobOption {
  id: string
  title: string
  company: string
  description?: string
}

const { data: recentJobs } = await useAsyncData('prep-jobs', () =>
  api
    .get<{
      data: {
        id: string
        discoveredJob: { title: string; company: string; description?: string }
      }[]
    }>('/api/v1/candidate-portal/seeker-applications', { limit: 20, sortBy: 'recent' })
    .then((r) =>
      (r.data ?? []).map(
        (a: any) =>
          ({
            id: a.id,
            title: a.discoveredJob?.title ?? 'Unknown role',
            company: a.discoveredJob?.company ?? '',
            description: a.discoveredJob?.description,
          }) as JobOption,
      ),
    )
    .catch(() => [] as JobOption[]),
)

const jobOptions = computed(() => [
  { id: '', title: 'Custom / no job', company: '' },
  ...(recentJobs.value ?? []),
])

const selectedJobId = ref('')
const customJobTitle = ref('')
const loadingQuestions = ref(false)
const questions = ref<string[]>([])
const sessionReady = ref(false)

const selectedJob = computed(
  () => jobOptions.value.find((j) => j.id === selectedJobId.value) ?? null,
)

async function loadQuestions() {
  const title =
    selectedJob.value?.title && selectedJob.value.id
      ? selectedJob.value.title
      : customJobTitle.value.trim()

  if (!title) {
    toast.add({ title: 'Enter a job title first', color: 'warning' })
    return
  }

  loadingQuestions.value = true
  try {
    const resp = await api.post<{ questions: string[] }>(
      '/api/v1/candidate-portal/prep/questions',
      {
        jobTitle: title,
        jobDescription: selectedJob.value?.description,
        count: 5,
      },
    )
    questions.value = resp.questions ?? []
    sessionReady.value = true
    activeQuestionIdx.value = 0
    evaluationComplete.value = false
    transcript.value = ''
  } catch {
    toast.add({ title: 'Failed to generate questions', color: 'error' })
  } finally {
    loadingQuestions.value = false
  }
}

const activeQuestions = computed(() =>
  questions.value.length
    ? questions.value
    : [
        'Tell me about yourself and your background.',
        'Describe a challenging project you worked on and how you handled it.',
        'Where do you see yourself in 3 years?',
        'What is your greatest professional strength?',
        'Why are you interested in this role?',
      ],
)

const isRecording = ref(false)
const timer = ref(0)
let intervalId: any = null
const activeQuestionIdx = ref(0)

const transcript = ref('')
const wpm = ref(0)
const fillerCount = ref(0)
const score = ref(0)
const evaluationComplete = ref(false)

let recognition: any = null

function initSpeech() {
  if (typeof window === 'undefined') return
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      if (finalTranscript) {
        transcript.value += finalTranscript
      }
    }

    recognition.onend = () => {
      isRecording.value = false
    }
  }
}

function startPractice() {
  if (typeof window === 'undefined') return
  if (!recognition) initSpeech()
  if (!recognition) {
    toast.add({ title: 'Speech recognition not supported', color: 'error' })
    return
  }

  playPop()
  isRecording.value = true
  evaluationComplete.value = false
  transcript.value = ''
  timer.value = 0

  recognition.start()

  intervalId = setInterval(() => {
    timer.value++
  }, 1000)
}

function stopPractice() {
  if (!isRecording.value) return
  playSwoosh()
  isRecording.value = false

  if (recognition) recognition.stop()
  if (intervalId) clearInterval(intervalId)

  evaluateTranscript()
}

function evaluateTranscript() {
  const text = transcript.value.toLowerCase()
  if (!text.trim()) {
    toast.add({ title: 'No speech detected. Please try speaking into your mic.', color: 'warning' })
    return
  }

  // Count filler words
  const fillers = (text.match(/\b(um|uh|like|basically|actually|you know)\b/g) || []).length
  fillerCount.value = fillers

  // Estimate WPM
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = timer.value / 60 || 0.1
  wpm.value = Math.round(words / minutes)

  // Calculate Communication Score (0-100)
  let calcScore = 100

  // Deduct for too high filler density
  const fillerDensity = fillers / (words || 1)
  calcScore -= Math.min(40, Math.round(fillerDensity * 200))

  // Deduct for non-optimal speaking speed (optimal is 110-150 WPM)
  if (wpm.value < 100) calcScore -= Math.min(30, Math.round((100 - wpm.value) * 0.5))
  if (wpm.value > 160) calcScore -= Math.min(30, Math.round((wpm.value - 160) * 0.5))

  score.value = Math.max(20, calcScore)
  evaluationComplete.value = true
}

function nextQuestion() {
  if (activeQuestionIdx.value < activeQuestions.value.length - 1) {
    playPop()
    activeQuestionIdx.value++
    evaluationComplete.value = false
    transcript.value = ''
  }
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="pb-4 border-b border-line">
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
        Coaching
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
        Interview Prep Cockpit
      </h1>
      <p class="text-sm mt-1" style="color: var(--ink-muted)">
        Practice and perfect your conversational interview fluency with real-time AI speech
        analysis.
      </p>
    </div>

    <!-- Job picker + question loader -->
    <div
      class="rounded-xl p-5 space-y-4"
      style="background: var(--surface); border: 1px solid var(--line-soft)"
    >
      <p
        class="text-xs font-mono font-bold uppercase tracking-wider"
        style="color: var(--ink-subtle)"
      >
        Prep for
      </p>
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-0 space-y-1">
          <label class="text-xs" style="color: var(--ink-muted)">Recent application</label>
          <USelect
            v-model="selectedJobId"
            :items="
              jobOptions.map((j) => ({
                label: j.id ? `${j.title} — ${j.company}` : 'Custom / no job',
                value: j.id,
              }))
            "
            class="w-full"
          />
        </div>
        <div v-if="!selectedJobId" class="flex-1 min-w-0 space-y-1">
          <label class="text-xs" style="color: var(--ink-muted)">Or enter job title</label>
          <UInput v-model="customJobTitle" placeholder="e.g. Senior Backend Engineer" />
        </div>
        <UButton :loading="loadingQuestions" icon="i-heroicons-sparkles" @click="loadQuestions">
          Generate AI Questions
        </UButton>
      </div>
      <div v-if="sessionReady" class="flex flex-wrap gap-1.5 pt-1">
        <span
          v-for="(q, i) in activeQuestions"
          :key="i"
          class="px-2 py-0.5 rounded text-xs cursor-pointer transition-colors"
          :style="
            i === activeQuestionIdx
              ? 'background: var(--ink); color: var(--bg)'
              : 'background: var(--bg-deep); color: var(--ink-muted); border: 1px solid var(--line-soft)'
          "
          @click="
            activeQuestionIdx = i
            evaluationComplete = false
            transcript = ''
          "
        >
          Q{{ i + 1 }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left column: Teleprompter / Question deck -->
      <div class="md:col-span-2 space-y-4">
        <!-- Interactive Teleprompter Card -->
        <div
          class="rounded-xl p-6 bg-surface border border-line flex flex-col justify-between min-h-[300px] relative overflow-hidden"
        >
          <div
            class="absolute top-2 right-3 font-mono text-[9px] uppercase tracking-wider text-ink-subtle"
          >
            Question {{ activeQuestionIdx + 1 }} of {{ activeQuestions.length }}
          </div>

          <div class="space-y-4 my-auto">
            <span class="text-xs font-mono font-bold text-accent uppercase tracking-wider"
              >AI Recruiter asks:</span
            >
            <p class="text-xl font-serif text-ink leading-snug">
              "{{ activeQuestions[activeQuestionIdx] }}"
            </p>
          </div>

          <div class="pt-4 border-t border-line-soft flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UButton
                v-if="!isRecording"
                color="primary"
                size="sm"
                icon="i-heroicons-play"
                @click="startPractice"
              >
                Record Response
              </UButton>
              <UButton
                v-else
                color="error"
                size="sm"
                icon="i-heroicons-stop"
                class="animate-pulse"
                @click="stopPractice"
              >
                Stop & Evaluate
              </UButton>

              <span v-if="isRecording" class="text-xs font-mono text-ink-muted animate-pulse">
                Recording... {{ formatTimer(timer) }}
              </span>
            </div>

            <UButton
              v-if="activeQuestionIdx < activeQuestions.length - 1"
              variant="ghost"
              size="xs"
              icon="i-heroicons-arrow-right"
              @click="nextQuestion"
            >
              Next Question
            </UButton>
          </div>
        </div>

        <!-- Real-Time Speech transcription -->
        <div
          class="bg-surface border border-line-soft rounded-xl p-4 min-h-[120px] flex flex-col justify-between"
        >
          <span
            class="text-[10px] font-mono font-bold text-ink-subtle uppercase tracking-wider mb-2"
            >Live Transcript</span
          >
          <p class="text-xs text-ink-muted leading-relaxed italic flex-1">
            {{
              transcript || 'Your transcribed answers will stream here in real-time as you speak...'
            }}
          </p>
        </div>
      </div>

      <!-- Right column: Speech analytics metrics -->
      <div class="space-y-4">
        <!-- Communication Score widget -->
        <div
          class="bg-surface border border-line rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-[180px]"
        >
          <span class="text-xs font-mono font-bold text-ink-muted uppercase tracking-wider mb-3"
            >Speech Evaluation Score</span
          >

          <template v-if="evaluationComplete">
            <div
              class="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-line bg-bg-deep"
            >
              <span class="text-2xl font-bold font-mono" style="color: var(--accent)">
                {{ score }}
              </span>
            </div>
            <p
              class="text-xs font-semibold mt-3 capitalize"
              :class="score >= 80 ? 'text-positive' : 'text-amber-500'"
            >
              {{ score >= 80 ? 'Excellent Fluency!' : 'Average Alignment' }}
            </p>
          </template>
          <template v-else>
            <UIcon name="i-heroicons-chart-bar-square" class="w-12 h-12 text-ink-subtle mb-2" />
            <p class="text-xs text-ink-subtle leading-tight">
              Complete a response and click evaluate to receive your analytics reports.
            </p>
          </template>
        </div>

        <!-- Metric breakdowns -->
        <div class="bg-surface border border-line-soft rounded-xl p-4 space-y-3.5">
          <span class="text-xs font-mono font-bold text-ink-subtle uppercase tracking-wider"
            >Acoustic Insights</span
          >

          <div class="flex items-center justify-between text-xs py-1 border-b border-line-soft">
            <span class="text-ink-muted">Speaking Speed</span>
            <span class="font-mono font-bold text-ink">
              {{ evaluationComplete ? `${wpm} WPM` : '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs py-1 border-b border-line-soft">
            <span class="text-ink-muted">Filler Words ("um", "like")</span>
            <span
              class="font-mono font-bold text-ink"
              :class="evaluationComplete && fillerCount > 4 ? 'text-warning' : ''"
            >
              {{ evaluationComplete ? fillerCount : '—' }}
            </span>
          </div>

          <!-- Dynamic recommendation text -->
          <div
            v-if="evaluationComplete"
            class="p-3 bg-bg-deep border border-line-soft rounded-lg text-xs leading-relaxed text-ink-muted space-y-1.5"
          >
            <span class="font-bold text-ink">AI Speech Coach tip:</span>
            <p v-if="wpm < 110">
              You are speaking a bit too slowly. Try speeding up to sound more dynamic and
              conversational!
            </p>
            <p v-else-if="wpm > 150">
              You are speaking very fast. Practice pausing slightly between thoughts to emphasize
              your technical claims!
            </p>
            <p v-else-if="fillerCount > 3">
              You are using quite a few filler words. Take a deep breath instead of saying "um" or
              "like" to sound more confident!
            </p>
            <p v-else>
              Incredible pace and articulation! Your pacing and focus is completely structured for
              hiring managers.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
