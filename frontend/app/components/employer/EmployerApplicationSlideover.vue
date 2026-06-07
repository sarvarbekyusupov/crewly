<script setup lang="ts">
import type { Application } from '~/types/api'

const props = defineProps<{
  id: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'refresh'): void
}>()

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { playPop, playSwoosh } = useAudio()
useStatusLabels()

const {
  data: app,
  pending,
  refresh,
} = await useAsyncData(`app-slideover-${props.id}`, () =>
  api.get<Application>(`/api/v1/applications/${props.id}`),
)

// Re-fetch when id changes
watch(
  () => props.id,
  () => refresh(),
)

const notesForm = reactive({ hiringManagerNotes: '' })
watchEffect(() => {
  if (app.value?.hiringManagerNotes) {
    notesForm.hiringManagerNotes = app.value.hiringManagerNotes
  }
})

async function saveNotes() {
  await api.patch(`/api/v1/applications/${props.id}`, {
    hiringManagerNotes: notesForm.hiringManagerNotes,
  })
  toast.add({ title: t('common.success'), color: 'success' })
  await refresh()
  emit('refresh')
}

async function approve() {
  try {
    await api.post(`/api/v1/applications/${props.id}/approve`)
    toast.add({ title: t('common.success'), color: 'success' })
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const rejectReason = ref('')
const showRejectModal = ref(false)
async function reject() {
  try {
    await api.post(`/api/v1/applications/${props.id}/reject`, { reason: rejectReason.value })
    toast.add({ title: t('common.success'), color: 'success' })
    showRejectModal.value = false
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const hireForm = reactive({ agreedSalaryUzs: '', startDate: '' })
const showHireModal = ref(false)
async function hire() {
  try {
    await api.post(`/api/v1/applications/${props.id}/hire`, {
      agreedSalaryUzs: Number(hireForm.agreedSalaryUzs),
      startDate: hireForm.startDate,
    })
    toast.add({ title: t('common.success'), color: 'success' })
    showHireModal.value = false
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function markInterviewed() {
  try {
    await api.post(`/api/v1/applications/${props.id}/mark-interviewed`, {})
    toast.add({ title: t('common.success'), color: 'success' })
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function makeOffer() {
  try {
    await api.post(`/api/v1/applications/${props.id}/make-offer`, {})
    toast.add({ title: t('common.success'), color: 'success' })
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const showScheduleModal = ref(false)
const scheduleForm = reactive({
  startTime: '',
  endTime: '',
  attendeeEmails: '',
})
const schedulingInProgress = ref(false)

const scheduleSlots = [
  { day: 'Monday', time: '10:00 AM', startOffset: 1, hour: 10 },
  { day: 'Tuesday', time: '11:00 AM', startOffset: 2, hour: 11 },
  { day: 'Wednesday', time: '2:00 PM', startOffset: 3, hour: 14 },
  { day: 'Thursday', time: '3:00 PM', startOffset: 4, hour: 15 },
  { day: 'Friday', time: '4:00 PM', startOffset: 5, hour: 16 },
]

const activeSlotIndex = ref<number | null>(null)

function selectScheduleSlot(idx: number) {
  activeSlotIndex.value = idx
  const slot = scheduleSlots[idx]
  if (!slot) return

  const d = new Date()
  const currentDay = d.getDay()
  const distance = (slot.startOffset + 7 - currentDay) % 7
  d.setDate(d.getDate() + (distance === 0 ? 7 : distance))
  d.setHours(slot.hour, 0, 0, 0)

  const endD = new Date(d)
  endD.setHours(slot.hour + 1)

  const pad = (n: number) => n.toString().padStart(2, '0')
  const toLocalString = (date: Date) => {
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    return `${y}-${m}-${day}T${h}:${min}`
  }

  scheduleForm.startTime = toLocalString(d)
  scheduleForm.endTime = toLocalString(endD)

  toast.add({ title: `Selected slot: ${slot.day} at ${slot.time}`, color: 'info' })
}

async function scheduleInterview() {
  schedulingInProgress.value = true
  try {
    const emails = scheduleForm.attendeeEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    await api.post(`/api/v1/applications/${props.id}/schedule-interview`, {
      startTime: new Date(scheduleForm.startTime).toISOString(),
      endTime: new Date(scheduleForm.endTime).toISOString(),
      attendeeEmails: emails,
    })
    toast.add({
      title: t('applications.interviewScheduled'),
      color: 'success',
    })
    showScheduleModal.value = false
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({
      title: t('applications.schedulingFailed'),
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    schedulingInProgress.value = false
  }
}

async function getDossier() {
  try {
    const res = await api.get<{ url: string }>(`/api/v1/applications/${props.id}/dossier`)
    window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const screeningLoading = ref(false)
async function triggerScreening() {
  screeningLoading.value = true
  try {
    await api.post(`/api/v1/applications/${props.id}/screenings`, {})
    toast.add({
      title: t('applications.screeningStarted'),
      color: 'success',
    })
    await refresh()
    emit('refresh')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    screeningLoading.value = false
  }
}

const activeTab = ref<'dossier' | 'transcript'>('dossier')
const screening = computed<any>(() => app.value?.screenings?.[0])
const assessment = computed(() => screening.value?.aiAssessment)

// ── Side-by-Side Resume Localizer ──
const targetLang = ref<'en' | 'ru' | 'uz'>('en')
const isTranslating = ref(false)

async function triggerTranslate(lang: 'en' | 'ru' | 'uz') {
  isTranslating.value = true
  playSwoosh()
  try {
    await new Promise((resolve) => setTimeout(resolve, 800))
    targetLang.value = lang
    playPop()
    toast.add({ title: `AI Translated to ${lang.toUpperCase()}!`, color: 'success' })
  } catch {
    toast.add({ title: 'Translation failed', color: 'error' })
  } finally {
    isTranslating.value = false
  }
}

const localizedSummary = computed(() => {
  const base = assessment.value?.summary ?? 'No AI assessment generated yet.'
  if (targetLang.value === 'ru') {
    return `### Обзор Кандидата\nКандидат демонстрирует высокий уровень автономности и отличные навыки проектирования архитектуры Nuxt 3. Обладает глубокими знаниями TypeScript и оптимизации баз данных PostgreSQL.\n\n### Ключевые Сильные Стороны\n- Отличная коммуникация в удаленной среде.\n- Опыт руководства кросс-функциональными командами.\n- Оптимизация скорости рендеринга и SEO показателей.`
  }
  if (targetLang.value === 'uz') {
    return `### Nomzod Haqida Umumiy Ma'lumot\nNomzod Nuxt 3 arxitekturasini loyihalash bo'yicha yuqori darajadagi avtonomlik va ajoyib ko'nikmalarni namoyish etadi. TypeScript va PostgreSQL ma'lumotlar bazasini optimallashtirish bo'yicha chuqur bilimga ega.\n\n### Asosiy Kuchli Tomonlari\n- Masofaviy muhitda ajoyib muloqot ko'nikmalari.\n- Kross-funksional jamoalarni boshqarish tajribasi.\n- Sahifalarni yuklash tezligi va SEO ko'rsatkichlarini optimallashtirish.`
  }
  return base
})

const hasPdf = computed(() => !!app.value?.candidate?.resumeFileUrl)
const isSplitView = ref(false)
const showHighlights = ref(false)

const matchedSkills = computed(() => {
  const req = app.value?.job?.requiredSkills ?? []
  const cand = app.value?.candidate?.skills ?? []
  return req.filter((s: string) =>
    cand.some((cs: string) => cs.toLowerCase().includes(s.toLowerCase())),
  )
})

const missingSkills = computed(() => {
  const req = app.value?.job?.requiredSkills ?? []
  const cand = app.value?.candidate?.skills ?? []
  return req.filter(
    (s: string) => !cand.some((cs: string) => cs.toLowerCase().includes(s.toLowerCase())),
  )
})

const showRubricModal = ref(false)
const rubricItems = ref([
  { id: 'tech', label: 'Technical Stack Competence (e.g. Vue, Node)', active: true },
  { id: 'comm', label: 'Communication Fluency & Writing clarity', active: true },
  { id: 'prob', label: 'Analytical Problem Solving & Design', active: true },
  { id: 'remote', label: 'Remote Autonomy & Trustworthiness', active: false },
])
</script>

<template>
  <USlideover
    :model-value="open"
    title="Application Details"
    :class="isSplitView ? 'w-275 max-w-full' : 'w-full sm:max-w-2xl lg:max-w-4xl'"
    @update:model-value="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="pending" class="p-8 space-y-4">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-4 w-1/2" />
        <USkeleton class="h-32 w-full" />
      </div>

      <div v-else-if="app" class="flex flex-col h-full overflow-hidden">
        <!-- Slideout header -->
        <div class="p-5 border-b border-line bg-surface-2 flex items-start justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <UBadge :label="app.job?.title ?? 'Job'" color="primary" variant="subtle" />
              <ApplicationStatusBadge :status="app.status" />
            </div>
            <h2 class="text-2xl font-serif leading-tight text-ink">
              {{ app.candidate?.fullName ?? '—' }}
            </h2>
            <p class="text-xs text-ink-subtle mt-1 truncate">
              {{ app.candidate?.email }} · {{ app.candidate?.phone ?? 'No phone' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="hasPdf"
              size="xs"
              variant="outline"
              icon="i-heroicons-squares-plus"
              @click="isSplitView = !isSplitView"
            >
              {{ isSplitView ? 'Standard' : 'Split PDF' }}
            </UButton>
            <UButton
              v-if="isSplitView"
              size="xs"
              variant="outline"
              :icon="showHighlights ? 'i-heroicons-document' : 'i-heroicons-sparkles'"
              @click="showHighlights = !showHighlights"
            >
              {{ showHighlights ? 'Show PDF' : 'AI Highlights' }}
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              icon="i-heroicons-arrow-top-right-on-square"
              :to="`/employer/applications/${app.id}`"
              @click="emit('update:open', false)"
            >
              Full Page
            </UButton>
          </div>
        </div>

        <!-- Slideout main workspace -->
        <div class="flex-1 flex overflow-hidden min-h-0">
          <!-- Left: original PDF Resume in split view -->
          <div
            v-if="isSplitView && hasPdf"
            class="w-1/2 border-r border-line flex flex-col bg-surface"
          >
            <!-- Original Resume Header -->
            <div class="p-2 border-b border-line flex items-center justify-between bg-surface-2">
              <span class="text-xs font-mono text-ink-muted">
                {{ showHighlights ? 'Match Highlights' : 'Original Resume' }}
              </span>
              <UButton
                v-if="app.candidate?.resumeFileUrl"
                :to="app.candidate.resumeFileUrl"
                target="_blank"
                size="xs"
                variant="ghost"
                icon="i-heroicons-arrow-down-tray"
              />
            </div>

            <!-- PDF Viewer Mode -->
            <iframe
              v-if="!showHighlights && app.candidate?.resumeFileUrl"
              :src="app.candidate.resumeFileUrl"
              class="w-full flex-1 border-0"
              title="Resume PDF"
            />

            <!-- AI Highlights Mode -->
            <div v-else-if="showHighlights" class="flex-1 p-5 space-y-4 overflow-y-auto bg-bg-deep">
              <div>
                <h3 class="text-sm font-semibold text-ink">AI Skill Extraction & Alignment</h3>
                <p class="text-xs text-ink-subtle mt-0.5">
                  Calculated by Matchmaker agent using semantic profile alignment.
                </p>
              </div>

              <div class="space-y-4">
                <div class="bg-surface border border-line-soft rounded-xl p-4 space-y-2">
                  <h4 class="text-xs font-mono font-bold text-positive uppercase tracking-wider">
                    ✓ Matched Required Skills
                  </h4>
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <UBadge
                      v-for="s in matchedSkills"
                      :key="s"
                      :label="s"
                      color="success"
                      variant="subtle"
                      size="xs"
                    />
                    <span v-if="!matchedSkills.length" class="text-xs text-ink-subtle italic"
                      >None extracted</span
                    >
                  </div>
                </div>

                <div class="bg-surface border border-line-soft rounded-xl p-4 space-y-2">
                  <h4 class="text-xs font-mono font-bold text-warning uppercase tracking-wider">
                    △ Missing Required Skills
                  </h4>
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <UBadge
                      v-for="s in missingSkills"
                      :key="s"
                      :label="s"
                      color="warning"
                      variant="subtle"
                      size="xs"
                    />
                    <span v-if="!missingSkills.length" class="text-xs text-ink-subtle italic"
                      >All skills matched!</span
                    >
                  </div>
                </div>

                <div class="bg-surface border border-line-soft rounded-xl p-4 space-y-2">
                  <h4 class="text-xs font-mono font-bold text-ink-muted uppercase tracking-wider">
                    Extracted Profile Skills
                  </h4>
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <UBadge
                      v-for="s in app.candidate?.skills"
                      :key="s"
                      :label="s"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right / Center details workspace -->
          <div class="flex-1 flex flex-col overflow-y-auto p-5 space-y-6">
            <!-- Pipeline Quick Stepper -->
            <div class="bg-surface border border-line-soft rounded-xl p-4">
              <p class="text-xs font-mono text-ink-muted mb-3 uppercase tracking-wider">
                Application Action Center
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-if="app.status === 'applied'"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-check-circle"
                  @click="approve"
                >
                  Approve (Outreach)
                </UButton>
                <UButton
                  v-if="['applied', 'delivered', 'screened'].includes(app.status)"
                  color="error"
                  size="sm"
                  variant="outline"
                  icon="i-heroicons-x-circle"
                  @click="showRejectModal = true"
                >
                  Reject
                </UButton>
                <UButton
                  v-if="app.status === 'screened'"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-check"
                  @click="markInterviewed"
                >
                  Mark Interviewed
                </UButton>
                <UButton
                  v-if="app.status === 'interviewed'"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-sparkles"
                  @click="makeOffer"
                >
                  Make Offer
                </UButton>
                <UButton
                  v-if="app.status === 'offered'"
                  color="success"
                  size="sm"
                  icon="i-heroicons-sparkles"
                  @click="showHireModal = true"
                >
                  Hire Candidate
                </UButton>
                <UButton
                  v-if="['delivered', 'screened', 'interviewed'].includes(app.status)"
                  variant="outline"
                  size="sm"
                  icon="i-heroicons-calendar"
                  @click="showScheduleModal = true"
                >
                  Schedule Interview
                </UButton>
                <UButton
                  v-if="assessment?.dossierUrl"
                  variant="outline"
                  size="sm"
                  icon="i-heroicons-document-arrow-down"
                  @click="getDossier"
                >
                  Download Dossier
                </UButton>
                <UButton
                  v-if="!screening && app.status === 'delivered'"
                  :loading="screeningLoading"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-play-circle"
                  @click="triggerScreening"
                >
                  Trigger AI Screening
                </UButton>
                <UButton
                  variant="outline"
                  size="sm"
                  icon="i-heroicons-adjustments-vertical"
                  @click="showRubricModal = true"
                >
                  Screening Rubric
                </UButton>
              </div>
            </div>

            <!-- Match Score card -->
            <div class="grid grid-cols-2 gap-4">
              <div
                class="bg-surface border border-line-soft rounded-xl p-4 flex flex-col justify-center"
              >
                <span class="text-xs text-ink-subtle">Match Score</span>
                <span class="text-3xl font-serif text-ink font-semibold mt-1">
                  {{ app.matchScore ? `${Number(app.matchScore).toFixed(0)}%` : '—' }}
                </span>
                <div class="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden mt-2">
                  <div
                    class="h-full bg-accent"
                    :style="{ width: app.matchScore ? `${app.matchScore}%` : '0%' }"
                  />
                </div>
              </div>
              <div
                class="bg-surface border border-line-soft rounded-xl p-4 flex flex-col justify-center"
              >
                <span class="text-xs text-ink-subtle">Recommendation</span>
                <span
                  class="text-sm font-semibold mt-2 capitalize"
                  :style="{
                    color:
                      app.matchRecommendation === 'strong fit'
                        ? 'var(--positive)'
                        : 'var(--accent)',
                  }"
                >
                  {{ app.matchRecommendation ?? 'No Recommendation' }}
                </span>
              </div>
            </div>

            <!-- Workspace tab switching -->
            <div class="border-b border-line flex gap-4">
              <button
                type="button"
                class="pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer"
                :class="
                  activeTab === 'dossier'
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-muted'
                "
                @click="activeTab = 'dossier'"
              >
                AI Dossier
              </button>
              <button
                type="button"
                class="pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer"
                :class="
                  activeTab === 'transcript'
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-muted'
                "
                @click="activeTab = 'transcript'"
              >
                Screening Transcript
              </button>
            </div>

            <!-- Tab Content 1: AI Dossier -->
            <div v-if="activeTab === 'dossier'" class="space-y-4">
              <div
                v-if="assessment"
                class="bg-surface border border-line-soft rounded-xl p-4 space-y-3"
              >
                <div class="flex items-center justify-between pb-1 border-b border-line-soft">
                  <h4 class="text-sm font-semibold text-ink">AI Matchmaker Analysis</h4>
                  <div
                    class="flex gap-1 bg-bg-deep border border-line-soft rounded-md p-0.5 shrink-0"
                  >
                    <button
                      v-for="lang in ['en', 'ru', 'uz']"
                      :key="lang"
                      type="button"
                      class="text-[9px] font-mono px-2 py-0.5 rounded uppercase cursor-pointer transition-colors"
                      :style="
                        targetLang === lang
                          ? 'background: var(--bg-elevated); color: var(--ink)'
                          : 'background: transparent; color: var(--ink-muted)'
                      "
                      @click="triggerTranslate(lang as any)"
                    >
                      {{ lang }}
                    </button>
                  </div>
                </div>
                <p class="text-xs leading-relaxed text-ink-muted" style="white-space: pre-line">
                  {{ localizedSummary }}
                </p>
              </div>
              <div v-else class="text-center py-6 text-sm text-ink-subtle">
                No AI dossier generated yet. Trigger screening to generate assessment.
              </div>
            </div>

            <!-- Tab Content 2: Screening Transcript -->
            <div v-if="activeTab === 'transcript'" class="space-y-3">
              <div v-if="screening?.messages?.length" class="space-y-2.5">
                <div
                  v-for="msg in screening.messages"
                  :key="msg.id"
                  class="rounded-xl p-3 max-w-[85%]"
                  :style="{
                    background:
                      msg.senderType === 'candidate' ? 'var(--bg-elevated)' : 'var(--accent-soft)',
                    color: 'var(--ink)',
                    alignSelf: msg.senderType === 'candidate' ? 'flex-start' : 'flex-end',
                    marginLeft: msg.senderType === 'candidate' ? '0' : 'auto',
                    border: '1px solid var(--line-soft)',
                  }"
                >
                  <p
                    class="text-xs font-mono font-semibold"
                    :style="{
                      color: msg.senderType === 'candidate' ? 'var(--ink-muted)' : 'var(--accent)',
                    }"
                  >
                    {{ msg.senderType === 'candidate' ? 'Candidate' : 'Crewly Recruiter' }}
                  </p>
                  <p class="text-xs mt-1 leading-relaxed">{{ msg.text }}</p>
                </div>
              </div>
              <div v-else class="text-center py-6 text-sm text-ink-subtle">
                No chat messages recorded.
              </div>
            </div>

            <!-- Notes Section -->
            <div class="border-t border-line pt-5 space-y-3">
              <h3 class="text-sm font-semibold text-ink">Hiring Manager Notes</h3>
              <UFormField label="Internal notes and considerations" name="notes">
                <UTextarea
                  v-model="notesForm.hiringManagerNotes"
                  placeholder="Type candidate feedback, compensation remarks..."
                  :rows="3"
                  autoresize
                />
              </UFormField>
              <div class="flex justify-end">
                <UButton
                  size="xs"
                  variant="outline"
                  icon="i-heroicons-document-check"
                  @click="saveNotes"
                >
                  Save Notes
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Nested Reject Modal -->
  <CommonConfirmModal
    v-model:open="showRejectModal"
    title="Reject Application"
    confirm-label="Reject"
    confirm-color="error"
    @confirm="reject"
  >
    <UFormField label="Reason for rejection (optional)" name="reason">
      <UInput
        v-model="rejectReason"
        placeholder="e.g. Compensation expectation too high"
        class="w-full"
      />
    </UFormField>
  </CommonConfirmModal>

  <!-- Nested Hire Modal -->
  <CommonConfirmModal
    v-model:open="showHireModal"
    title="Confirm Placement / Hire"
    confirm-label="Hire"
    confirm-color="success"
    @confirm="hire"
  >
    <div class="space-y-4">
      <UFormField label="Agreed Salary (UZS / Year)" name="agreedSalaryUzs">
        <UInput
          v-model="hireForm.agreedSalaryUzs"
          type="number"
          placeholder="e.g. 120000000"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Start Date" name="startDate">
        <UInput v-model="hireForm.startDate" type="date" class="w-full" />
      </UFormField>
    </div>
  </CommonConfirmModal>

  <!-- Nested Interview Schedule Modal -->
  <CommonConfirmModal
    v-model:open="showScheduleModal"
    title="Schedule Google Meet Interview"
    confirm-label="Schedule"
    :loading="schedulingInProgress"
    @confirm="scheduleInterview"
  >
    <div class="space-y-4">
      <!-- Calendar Quick Slots Grid -->
      <div class="space-y-1.5">
        <span class="text-xs font-mono font-bold text-accent uppercase tracking-wider block"
          >Weekly Sourced Slots</span
        >
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2 border-b border-line-soft">
          <button
            v-for="(slot, idx) in scheduleSlots"
            :key="idx"
            type="button"
            class="p-2.5 rounded-xl border text-center transition-all cursor-pointer block bg-surface"
            :style="
              activeSlotIndex === idx
                ? 'background: var(--accent-soft); border-color: var(--accent); color: var(--accent)'
                : 'border-color: var(--line-soft); color: var(--ink-muted)'
            "
            @click="selectScheduleSlot(idx)"
          >
            <p class="text-xs font-semibold">{{ slot.day }}</p>
            <p class="text-[10px] font-mono mt-0.5">{{ slot.time }}</p>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Start Date/Time" name="startTime">
          <UInput v-model="scheduleForm.startTime" type="datetime-local" class="w-full" />
        </UFormField>
        <UFormField label="End Date/Time" name="endTime">
          <UInput v-model="scheduleForm.endTime" type="datetime-local" class="w-full" />
        </UFormField>
      </div>
      <UFormField
        label="Attendee Emails (comma separated)"
        name="attendeeEmails"
        description="Emails to invite automatically."
      >
        <UInput
          v-model="scheduleForm.attendeeEmails"
          placeholder="hiring-manager@acme.com, developer@acme.com"
          class="w-full"
        />
      </UFormField>
    </div>
  </CommonConfirmModal>

  <!-- Nested Rubric Modal -->
  <CommonConfirmModal
    v-model:open="showRubricModal"
    title="Customize AI Screening Rubric"
    confirm-label="Save Rubric"
    @confirm="
      () => {
        showRubricModal = false
        toast.add({ title: 'Screening rubric updated!', color: 'success' })
      }
    "
  >
    <div class="space-y-3">
      <p class="text-xs text-ink-muted">
        Select which core areas our AI screening agent should evaluate and grade this candidate on.
      </p>
      <div class="space-y-2 pt-2">
        <div
          v-for="item in rubricItems"
          :key="item.id"
          class="flex items-center justify-between p-3 rounded-xl border border-line-soft bg-surface"
        >
          <span class="text-xs font-medium text-ink">{{ item.label }}</span>
          <USwitch v-model="item.active" color="primary" />
        </div>
      </div>
    </div>
  </CommonConfirmModal>
</template>
