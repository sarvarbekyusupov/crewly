<script setup lang="ts">
import type { Application } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const auth = useAuthStore()

const appId = route.params.id as string

const {
  data: app,
  pending,
  refresh,
} = await useAsyncData(`app-${appId}`, () => api.get<Application>(`/api/v1/applications/${appId}`))

const { screeningStatusLabel } = useStatusLabels()

useHead({ title: computed(() => app.value?.candidate?.fullName ?? t('applications.title')) })

const { setBreadcrumbLabel } = useBreadcrumb()
watch(
  () => app.value?.candidate?.fullName,
  (name) => {
    if (name) setBreadcrumbLabel(name)
  },
  { immediate: true },
)

const notesForm = reactive({ hiringManagerNotes: '' })
const isDirty = computed(
  () => notesForm.hiringManagerNotes !== (app.value?.hiringManagerNotes ?? ''),
)

const showUnsavedModal = ref(false)
const pendingNavTarget = ref<string | null>(null)
const confirmedLeave = ref(false)

onBeforeRouteLeave((to) => {
  if (isDirty.value && !confirmedLeave.value) {
    showUnsavedModal.value = true
    pendingNavTarget.value = to.fullPath
    return false
  }
})

function confirmLeave() {
  showUnsavedModal.value = false
  confirmedLeave.value = true
  if (pendingNavTarget.value) navigateTo(pendingNavTarget.value)
}
const hireForm = reactive({ agreedSalaryUzs: '', startDate: '' })
const rejectReason = ref('')
const showHireModal = ref(false)
const showRejectModal = ref(false)

watchEffect(() => {
  if (app.value?.hiringManagerNotes) {
    notesForm.hiringManagerNotes = app.value.hiringManagerNotes
  }
})

async function saveNotes() {
  await api.patch(`/api/v1/applications/${appId}`, {
    hiringManagerNotes: notesForm.hiringManagerNotes,
  })
  toast.add({ title: t('common.success'), color: 'success' })
  refresh()
}

async function approve() {
  try {
    await api.post(`/api/v1/applications/${appId}/approve`)
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function reject() {
  try {
    await api.post(`/api/v1/applications/${appId}/reject`, { reason: rejectReason.value })
    toast.add({ title: t('common.success'), color: 'success' })
    showRejectModal.value = false
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function hire() {
  try {
    await api.post(`/api/v1/applications/${appId}/hire`, {
      agreedSalaryUzs: Number(hireForm.agreedSalaryUzs),
      startDate: hireForm.startDate,
    })
    toast.add({ title: t('common.success'), color: 'success' })
    showHireModal.value = false
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function markInterviewed() {
  try {
    await api.post(`/api/v1/applications/${appId}/mark-interviewed`, {})
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function makeOffer() {
  try {
    await api.post(`/api/v1/applications/${appId}/make-offer`, {})
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

// Interview scheduler
const showScheduleModal = ref(false)
const scheduleForm = reactive({
  startTime: '',
  endTime: '',
  attendeeEmails: '',
})
const schedulingInProgress = ref(false)
const lastMeetLink = ref<string | null>(null)

async function scheduleInterview() {
  schedulingInProgress.value = true
  try {
    const emails = scheduleForm.attendeeEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    const res = await api.post<{ meetLink?: string }>(
      `/api/v1/applications/${appId}/schedule-interview`,
      {
        startTime: new Date(scheduleForm.startTime).toISOString(),
        endTime: new Date(scheduleForm.endTime).toISOString(),
        attendeeEmails: emails,
      },
    )
    lastMeetLink.value = res.meetLink ?? null
    toast.add({
      title: t('applications.interviewScheduled'),
      description: t('applications.interviewCalendarDesc'),
      color: 'success',
    })
    showScheduleModal.value = false
    refresh()
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
    const res = await api.get<{ url: string }>(`/api/v1/applications/${appId}/dossier`)
    window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const screeningLoading = ref(false)
async function triggerScreening() {
  screeningLoading.value = true
  try {
    await api.post(`/api/v1/applications/${appId}/screenings`, {})
    toast.add({
      title: t('applications.screeningStarted'),
      description: t('applications.screeningStartedDesc'),
      color: 'success',
    })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    screeningLoading.value = false
  }
}

const screening = computed(() => app.value?.screenings?.[0])
const assessment = computed(() => screening.value?.aiAssessment)

const scoreFields = computed(() => {
  if (!assessment.value) return []
  const a = assessment.value
  return [
    { key: 'technical_score', score: a.technical_score, label: t('applications.scores.technical') },
    {
      key: 'communication_score',
      score: a.communication_score,
      label: t('applications.scores.communication'),
    },
    {
      key: 'experience_depth_score',
      score: a.experience_depth_score,
      label: t('applications.scores.experience'),
    },
    {
      key: 'availability_score',
      score: a.availability_score,
      label: t('applications.scores.availability'),
    },
    {
      key: 'salary_fit_score',
      score: a.salary_fit_score,
      label: t('applications.scores.salaryFit'),
    },
    { key: 'overall_score', score: a.overall_score, label: t('applications.scores.overall') },
  ]
})

function scoreBar(score?: number) {
  return score != null ? Math.round(score * 10) : 0
}

const shadowScoreFields = computed(() => {
  const sa = app.value?.shadowAnalysis
  if (!sa || !sa.dimensions) return []
  return [
    {
      key: 'technical_depth',
      score: sa.dimensions.technical_depth,
      label: t('applications.shadowAnalysis.dimensions.technical'),
    },
    {
      key: 'communication',
      score: sa.dimensions.communication,
      label: t('applications.shadowAnalysis.dimensions.comms'),
    },
    {
      key: 'cultural_fit',
      score: sa.dimensions.cultural_fit,
      label: t('applications.shadowAnalysis.dimensions.culture'),
    },
    {
      key: 'experience_relevance',
      score: sa.dimensions.experience_relevance,
      label: t('applications.shadowAnalysis.dimensions.experience'),
    },
    {
      key: 'enthusiasm',
      score: sa.dimensions.enthusiasm,
      label: t('applications.shadowAnalysis.dimensions.enthusiasm'),
    },
  ]
})
</script>

<template>
  <CommonListSkeleton v-if="pending" />

  <div v-else-if="app" class="space-y-6">
    <!-- Hero header -->
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex flex-col lg:flex-row items-start justify-between gap-6">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <NuxtLink
            to="/employer/applications"
            style="color: var(--ink-muted); margin-top: 6px"
            class="shrink-0"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div class="flex items-start gap-4 min-w-0">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl"
              style="
                background: var(--accent-soft);
                color: var(--accent);
                font-family: 'Fraunces', serif;
                font-style: italic;
                border: 1px solid var(--line);
              "
            >
              {{ app.candidate?.fullName?.[0] ?? '?' }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <p
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: var(--ink-subtle);
                  "
                >
                  {{ t('applications.breadcrumb') }}
                </p>
                <ApplicationStatusBadge :status="app.status" />
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
                class="sm:text-3xl"
              >
                {{ app.candidate?.fullName ?? '—' }}
              </h1>
              <p style="color: var(--ink-muted); font-size: 14px; margin-top: 4px" class="truncate">
                {{ app.job?.title ?? '—' }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-if="auth.can('hiring_manager')"
          class="flex gap-2 shrink-0 flex-wrap w-full lg:w-auto justify-start lg:justify-end"
        >
          <UButton
            size="sm"
            icon="i-heroicons-document-text"
            variant="outline"
            class="flex-1 lg:flex-none justify-center"
            @click="getDossier"
          >
            {{ t('candidates.dossier') }}
          </UButton>
          <UButton
            v-if="['outreach_sent', 'responded'].includes(app.status) && !screening"
            size="sm"
            variant="outline"
            icon="i-heroicons-chat-bubble-left-right"
            :loading="screeningLoading"
            class="flex-1 lg:flex-none justify-center"
            @click="triggerScreening"
          >
            {{ t('applications.startScreening') }}
          </UButton>
          <UButton
            v-if="!['hired', 'rejected_by_client', 'withdrew'].includes(app.status)"
            size="sm"
            color="success"
            class="flex-1 lg:flex-none justify-center"
            @click="approve"
          >
            {{ t('applications.approve') }}
          </UButton>
          <UButton
            v-if="!['hired', 'rejected_by_client', 'withdrew'].includes(app.status)"
            size="sm"
            color="error"
            variant="outline"
            class="flex-1 lg:flex-none justify-center"
            @click="showRejectModal = true"
          >
            {{ t('applications.reject') }}
          </UButton>
          <UButton
            v-if="!['hired', 'rejected_by_client', 'withdrew'].includes(app.status)"
            size="sm"
            variant="outline"
            icon="i-heroicons-calendar-days"
            class="flex-1 lg:flex-none justify-center"
            @click="showScheduleModal = true"
          >
            {{ t('applications.scheduleInterview') }}
          </UButton>
          <UButton
            v-if="app.status === 'interview_scheduled'"
            size="sm"
            variant="outline"
            icon="i-heroicons-calendar-days"
            class="flex-1 lg:flex-none justify-center"
            @click="markInterviewed"
          >
            {{ t('applications.markInterviewed') }}
          </UButton>
          <UButton
            v-if="app.status === 'interviewed'"
            size="sm"
            variant="outline"
            icon="i-heroicons-document-text"
            class="flex-1 lg:flex-none justify-center"
            @click="makeOffer"
          >
            {{ t('applications.makeOffer') }}
          </UButton>
          <UButton
            v-if="['interview_scheduled', 'interviewed', 'offered'].includes(app.status)"
            size="sm"
            color="primary"
            class="flex-1 lg:flex-none justify-center"
            @click="showHireModal = true"
          >
            {{ t('applications.hire') }}
          </UButton>
        </div>
      </div>
    </div>

    <ApplicationHiringStepper :status="app.status" />

    <!-- Meet link banner -->
    <div
      v-if="app.googleMeetLink"
      class="rounded-lg px-4 py-3 flex items-center gap-3"
      style="background: var(--accent-soft); border: 1px solid var(--accent)"
    >
      <UIcon
        name="i-heroicons-video-camera"
        class="w-5 h-5 shrink-0"
        style="color: var(--accent)"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium" style="color: var(--ink)">Interview scheduled</p>
        <a
          :href="app.googleMeetLink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs hover:underline"
          style="color: var(--accent)"
        >
          {{ app.googleMeetLink }}
        </a>
      </div>
      <UButton :href="app.googleMeetLink" target="_blank" size="xs" variant="outline">Join</UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Candidate info -->
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <h3 class="section-label mb-4">{{ t('common.candidate') }}</h3>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('common.position') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ app.candidate?.currentPosition ?? '—' }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.company') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ app.candidate?.currentCompany ?? '—' }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.experience') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ app.candidate?.yearsExperience ?? '—' }} {{ t('candidates.experience') }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.city') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ app.candidate?.city ?? '—' }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.email') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ app.candidate?.email ?? '—' }}
              </dd>
            </div>
          </dl>
          <div class="mt-4">
            <p class="section-label mb-2">{{ t('candidates.skills') }}</p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="s in app.candidate?.skills ?? []"
                :key="s"
                color="neutral"
                variant="subtle"
                size="xs"
                >{{ s }}</UBadge
              >
              <span
                v-if="!app.candidate?.skills?.length"
                class="text-sm"
                style="color: var(--ink-subtle)"
                >—</span
              >
            </div>
          </div>
        </UCard>

        <!-- Matchmaker's Analysis -->
        <div
          v-if="app.matchReasons"
          class="rounded-2xl p-5"
          style="background: var(--paper); border: 1px solid var(--line)"
        >
          <div class="flex items-center justify-between mb-5">
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
                Agent: Matchmaker
              </p>
              <h3
                style="
                  font-family: 'Fraunces', serif;
                  font-size: 18px;
                  letter-spacing: -0.02em;
                  color: var(--ink);
                  font-weight: 400;
                "
              >
                {{ t('applications.matchAnalysis') }}
              </h3>
            </div>
            <div class="flex flex-col items-end gap-1">
              <UBadge
                v-if="app.matchRecommendation"
                :color="
                  app.matchRecommendation === 'strong fit'
                    ? 'success'
                    : app.matchRecommendation === 'good fit'
                      ? 'primary'
                      : app.matchRecommendation === 'possible fit'
                        ? 'warning'
                        : 'error'
                "
                variant="subtle"
                size="sm"
              >
                {{ app.matchRecommendation?.toUpperCase() }}
              </UBadge>
              <span v-if="app.matchScore" class="font-mono text-[10px] text-ink-subtle">
                Match Score: {{ app.matchScore }}%
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-5">
            <div v-if="app.matchReasons.strengths?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--positive);
                  margin-bottom: 8px;
                "
              >
                {{ t('applications.matchedLabel') }}
              </p>
              <ul class="space-y-2">
                <li
                  v-for="r in app.matchReasons.strengths"
                  :key="r"
                  class="flex items-start gap-2 text-[13px]"
                  style="color: var(--ink-muted)"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-4 h-4 mt-0.5 shrink-0"
                    style="color: var(--positive)"
                  />
                  {{ r }}
                </li>
              </ul>
            </div>
            <div v-if="app.matchReasons.gaps?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--accent);
                  margin-bottom: 8px;
                "
              >
                {{ t('applications.gapsLabel') }}
              </p>
              <ul class="space-y-2">
                <li
                  v-for="r in app.matchReasons.gaps"
                  :key="r"
                  class="flex items-start gap-2 text-[13px]"
                  style="color: var(--ink-muted)"
                >
                  <UIcon
                    name="i-heroicons-minus-circle"
                    class="w-4 h-4 mt-0.5 shrink-0"
                    style="color: var(--accent)"
                  />
                  {{ r }}
                </li>
              </ul>
            </div>
          </div>

          <div
            v-if="app.matchReasons.notes"
            class="rounded-xl p-4 italic text-[13px] leading-relaxed"
            style="
              background: var(--bg-deep);
              color: var(--ink-muted);
              border-left: 3px solid var(--line);
            "
          >
            "{{ app.matchReasons.notes }}"
          </div>
        </div>

        <!-- Shadow Analysis (Debrief Expert) -->
        <div
          v-if="app.shadowAnalysis"
          class="rounded-2xl p-5 mt-5"
          style="background: var(--paper); border: 1px solid var(--line)"
        >
          <div class="flex items-center justify-between mb-5">
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
                {{ t('applications.shadowAnalysis.agent') }}
              </p>
              <h3
                style="
                  font-family: 'Fraunces', serif;
                  font-size: 18px;
                  letter-spacing: -0.02em;
                  color: var(--ink);
                  font-weight: 400;
                "
              >
                {{ t('applications.shadowAnalysis.title') }}
              </h3>
            </div>
            <div class="flex flex-col items-end gap-1">
              <UBadge
                v-if="app.shadowAnalysis.sentiment"
                :color="
                  app.shadowAnalysis.sentiment === 'positive'
                    ? 'success'
                    : app.shadowAnalysis.sentiment === 'neutral'
                      ? 'primary'
                      : 'error'
                "
                variant="subtle"
                size="sm"
              >
                {{ app.shadowAnalysis.sentiment.toUpperCase() }}
              </UBadge>
              <span class="font-mono text-[10px] text-ink-subtle">
                {{ t('applications.shadowAnalysis.humanScore') || 'Human Interview Score' }}:
                {{ app.shadowAnalysis.overall_score || app.shadowAnalysis.score }}%
              </span>
            </div>
          </div>

          <div
            class="mb-6 rounded-xl p-4 text-[13px] leading-relaxed border-l-3 border-accent"
            style="background: var(--bg-deep); color: var(--ink-muted)"
          >
            {{ app.shadowAnalysis.summary }}
          </div>

          <!-- Shadow Dimension Scores -->
          <div v-if="shadowScoreFields.length" class="grid grid-cols-5 gap-2 mb-8">
            <div
              v-for="field in shadowScoreFields"
              :key="field.key"
              class="rounded-xl p-2 flex flex-col items-center gap-1.5"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <div
                class="score-ring"
                style="width: 32px; height: 32px"
                :style="`--p: ${scoreBar(field.score)}; --c: var(--accent);`"
              >
                <span style="font-size: 9px">{{ field.score ?? '?' }}</span>
              </div>
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 8px;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  color: var(--ink-subtle);
                  text-align: center;
                "
              >
                {{ field.label }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div v-if="app.shadowAnalysis.confirmations?.length">
              <p class="section-label-tiny text-positive mb-3">
                {{ t('applications.shadowAnalysis.confirmations') }}
              </p>
              <ul class="space-y-2">
                <li
                  v-for="c in app.shadowAnalysis.confirmations"
                  :key="c"
                  class="flex items-start gap-2 text-[12.5px] text-ink-muted"
                >
                  <UIcon name="i-heroicons-check-badge" class="w-4 h-4 text-positive shrink-0" />
                  {{ c }}
                </li>
              </ul>
            </div>
            <div v-if="app.shadowAnalysis.discrepancies?.length">
              <p class="section-label-tiny text-warn mb-3">
                {{ t('applications.shadowAnalysis.discrepancies') }}
              </p>
              <ul class="space-y-2">
                <li
                  v-for="d in app.shadowAnalysis.discrepancies"
                  :key="d"
                  class="flex items-start gap-2 text-[12.5px] text-ink-muted"
                >
                  <UIcon
                    name="i-heroicons-exclamation-triangle"
                    class="w-4 h-4 text-warn shrink-0"
                  />
                  {{ d }}
                </li>
              </ul>
            </div>
            <div v-if="app.shadowAnalysis.red_flags?.length" class="md:col-span-2">
              <p class="section-label-tiny text-error mb-3">
                {{ t('applications.shadowAnalysis.redFlags') }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="f in app.shadowAnalysis.red_flags"
                  :key="f"
                  color="error"
                  variant="soft"
                  size="sm"
                >
                  {{ f }}
                </UBadge>
              </div>
            </div>
            <div v-if="app.shadowAnalysis.recruiter_advice" class="md:col-span-2">
              <p class="section-label-tiny text-primary mb-3">
                {{ t('applications.shadowAnalysis.recruiterMemo') }}
              </p>
              <div
                class="rounded-lg p-3 text-xs italic leading-relaxed"
                style="
                  background: var(--bg-elevated);
                  color: var(--ink-muted);
                  border-left: 2px solid var(--primary);
                "
              >
                "{{ app.shadowAnalysis.recruiter_advice }}"
              </div>
            </div>
          </div>
        </div>

        <!-- AI Assessment -->
        <div
          v-if="assessment"
          class="rounded-2xl p-5"
          style="background: var(--paper); border: 1px solid var(--line)"
        >
          <div class="flex items-center justify-between mb-5">
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
                Agent: Screening Bot
              </p>
              <h3
                style="
                  font-family: 'Fraunces', serif;
                  font-size: 18px;
                  letter-spacing: -0.02em;
                  color: var(--ink);
                  font-weight: 400;
                "
              >
                {{ t('applications.assessmentSection') }}
              </h3>
            </div>
            <UBadge
              v-if="assessment.recommendation"
              :color="
                assessment.recommendation === 'advance'
                  ? 'success'
                  : assessment.recommendation === 'reject'
                    ? 'error'
                    : 'warning'
              "
              variant="subtle"
              size="sm"
            >
              {{ assessment.recommendation?.toUpperCase() }}
            </UBadge>
          </div>

          <!-- Score rings grid -->
          <div class="grid grid-cols-3 gap-3 mb-5">
            <div
              v-for="field in scoreFields"
              :key="field.key"
              class="rounded-xl p-3 flex flex-col items-center gap-2"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <div
                class="score-ring"
                :style="`--p: ${scoreBar(field.score)}; --c: ${field.key === 'overall_score' ? 'var(--accent)' : 'var(--ink-muted)'};`"
              >
                <span>{{ field.score ?? '?' }}</span>
              </div>
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: var(--ink-subtle);
                  text-align: center;
                "
              >
                {{ field.label }}
              </p>
            </div>
          </div>

          <p
            v-if="assessment.summary"
            class="text-sm mb-4 leading-relaxed"
            style="color: var(--ink-muted)"
          >
            {{ assessment.summary }}
          </p>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div v-if="assessment.strengths?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--positive);
                  margin-bottom: 6px;
                "
              >
                {{ t('applications.strengths') }}
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="s in assessment.strengths"
                  :key="s"
                  class="flex items-start gap-1.5 text-xs"
                  style="color: var(--ink-muted)"
                >
                  <UIcon
                    name="i-heroicons-check"
                    class="w-3.5 h-3.5 mt-0.5 shrink-0"
                    style="color: var(--positive)"
                  />
                  {{ s }}
                </li>
              </ul>
            </div>
            <div v-if="assessment.concerns?.length">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--accent);
                  margin-bottom: 6px;
                "
              >
                {{ t('applications.concerns') }}
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="c in assessment.concerns"
                  :key="c"
                  class="flex items-start gap-1.5 text-xs"
                  style="color: var(--ink-muted)"
                >
                  <UIcon
                    name="i-heroicons-x-mark"
                    class="w-3.5 h-3.5 mt-0.5 shrink-0"
                    style="color: var(--accent)"
                  />
                  {{ c }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="space-y-4">
        <UCard>
          <h3 class="section-label mb-3">{{ t('applications.notes') }}</h3>
          <UTextarea v-model="notesForm.hiringManagerNotes" :rows="5" class="w-full mb-3" />
          <UButton size="sm" block @click="saveNotes">{{ t('common.save') }}</UButton>
        </UCard>

        <UCard v-if="screening">
          <h3 class="section-label mb-3">{{ t('applications.screeningSection') }}</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">{{ t('common.status') }}</dt>
              <dd>
                <UBadge
                  :color="
                    screening.status === 'completed'
                      ? 'success'
                      : screening.status === 'failed'
                        ? 'error'
                        : 'warning'
                  "
                  variant="subtle"
                  size="xs"
                  >{{ screeningStatusLabel(screening.status) }}</UBadge
                >
              </dd>
            </div>
            <div class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">
                {{ t('applications.questionsAsked') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ screening.questionsAsked }}</dd>
            </div>
            <div v-if="screening.completedAt" class="flex justify-between">
              <dt style="color: var(--ink-subtle); font-size: 11px">Completed</dt>
              <dd class="font-medium" style="color: var(--ink); font-size: 11px">
                {{ new Date(screening.completedAt).toLocaleDateString() }}
              </dd>
            </div>
            <div v-if="screening.escalationReason" class="pt-1">
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 3px">
                Escalation reason
              </dt>
              <dd class="text-xs" style="color: var(--warn)">{{ screening.escalationReason }}</dd>
            </div>
          </dl>
          <div
            v-if="assessment?.dossierUrl"
            class="mt-3 pt-3"
            style="border-top: 1px solid var(--line-soft)"
          >
            <a
              :href="assessment.dossierUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 text-xs hover:underline"
              style="color: var(--accent)"
            >
              <UIcon name="i-heroicons-document-arrow-down" class="w-3.5 h-3.5" />
              Download Dossier
            </a>
          </div>
        </UCard>

        <UCard v-else-if="['outreach_sent', 'responded', 'screening'].includes(app.status)">
          <h3 class="section-label mb-2">{{ t('applications.screeningSection') }}</h3>
          <p class="text-xs mb-3" style="color: var(--ink-subtle)">
            {{ t('applications.noScreeningYet') }}
          </p>
          <UButton
            size="xs"
            block
            variant="outline"
            icon="i-heroicons-chat-bubble-left-right"
            :loading="screeningLoading"
            @click="triggerScreening"
          >
            {{ t('applications.startAiScreening') }}
          </UButton>
        </UCard>
      </div>
    </div>

    <!-- Reject modal -->
    <UModal v-model:open="showRejectModal">
      <template #content>
        <UCard>
          <template #header>{{ t('applications.reject') }}</template>
          <UFormField :label="t('applications.rejectReason')">
            <UTextarea v-model="rejectReason" :rows="3" class="w-full" />
          </UFormField>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showRejectModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="error" @click="reject">{{ t('applications.reject') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Schedule Interview modal -->
    <UModal v-model:open="showScheduleModal">
      <template #content>
        <UCard>
          <template #header>{{ t('applications.scheduleInterviewModal') }}</template>
          <div class="space-y-4">
            <UFormField :label="t('applications.startTime')" required>
              <UInput v-model="scheduleForm.startTime" type="datetime-local" class="w-full" />
            </UFormField>
            <UFormField :label="t('applications.endTime')" required>
              <UInput v-model="scheduleForm.endTime" type="datetime-local" class="w-full" />
            </UFormField>
            <UFormField
              :label="t('applications.attendees')"
              :hint="t('applications.attendeesHint')"
            >
              <UInput
                v-model="scheduleForm.attendeeEmails"
                placeholder="recruiter@company.com, manager@company.com"
                class="w-full"
              />
            </UFormField>
            <div
              v-if="lastMeetLink"
              class="rounded-lg p-3 text-sm"
              style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
            >
              <p style="color: var(--ink-subtle)">Last scheduled:</p>
              <a
                :href="lastMeetLink"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--accent)"
                class="hover:underline"
              >
                {{ lastMeetLink }}
              </a>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showScheduleModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton
                color="primary"
                icon="i-heroicons-calendar-days"
                :loading="schedulingInProgress"
                :disabled="!scheduleForm.startTime || !scheduleForm.endTime"
                @click="scheduleInterview"
              >
                {{ t('applications.createCalendarEvent') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Hire modal -->
    <UModal v-model:open="showHireModal">
      <template #content>
        <UCard>
          <template #header>{{ t('applications.hire') }}</template>
          <div class="space-y-4">
            <UFormField :label="t('applications.agreedSalary')" required>
              <UInput
                v-model="hireForm.agreedSalaryUzs"
                type="number"
                min="0"
                class="w-full"
                required
              />
            </UFormField>
            <UFormField :label="t('common.date')" required>
              <UInput
                v-model="hireForm.startDate"
                type="date"
                :min="new Date().toISOString().slice(0, 10)"
                class="w-full"
                required
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showHireModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="success" @click="hire">{{ t('applications.hire') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>

  <div v-else class="py-24 text-center space-y-3">
    <p style="color: var(--ink-muted)">{{ t('common.notFound') }}</p>
    <UButton variant="outline" size="sm" @click="() => refresh()">{{ t('common.retry') }}</UButton>
  </div>

  <!-- Unsaved notes confirmation -->
  <CommonConfirmModal
    v-model:open="showUnsavedModal"
    :title="t('applications.unsavedNotesTitle')"
    confirm-label="Leave"
    confirm-color="error"
    @confirm="confirmLeave"
  >
    <p class="text-sm" style="color: var(--ink-muted)">{{ t('applications.unsavedNotesDesc') }}</p>
  </CommonConfirmModal>
</template>

<style scoped>
.score-ring {
  --p: 0;
  --c: var(--accent);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--line-soft) 0);
  display: grid;
  place-items: center;
  position: relative;
}
.score-ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--bg-elevated);
}
.score-ring span {
  position: relative;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-muted);
}
</style>
