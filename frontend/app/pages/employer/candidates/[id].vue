<script setup lang="ts">
import type { Candidate, Application, OutreachAttempt, PaginatedResponse } from '~/types/api'
import { safeUrl } from '~/utils/safeUrl'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()

const candidateId = route.params.id as string

const {
  data: candidate,
  pending,
  refresh: refreshCandidate,
} = await useAsyncData(`candidate-${candidateId}`, () =>
  api.get<Candidate>(`/api/v1/candidates/${candidateId}`),
)

useHead({ title: computed(() => candidate.value?.fullName ?? t('candidates.title')) })

const { setBreadcrumbLabel } = useBreadcrumb()
watch(
  () => candidate.value?.fullName,
  (name) => {
    if (name) setBreadcrumbLabel(name)
  },
  { immediate: true },
)

const { data: appsResult } = await useAsyncData(`candidate-${candidateId}-apps`, () =>
  api
    .get<PaginatedResponse<Application>>('/api/v1/applications', { candidateId })
    .catch(() => null),
)
const applications = computed(() => appsResult.value?.data ?? [])

const { data: outreachHistory, refresh: refreshOutreach } = await useAsyncData(
  `candidate-${candidateId}-outreach`,
  () =>
    api
      .get<OutreachAttempt[]>(`/api/v1/candidates/${candidateId}/outreach-history`)
      .catch(() => []),
)

async function getDossier(applicationId: string) {
  try {
    const res = await api.get<{ url: string }>(`/api/v1/applications/${applicationId}/dossier`)
    window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const resumeUploading = ref(false)
const resumeInput = ref<HTMLInputElement | null>(null)

async function uploadResume(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  resumeUploading.value = true
  const body = new FormData()
  body.append('file', file)
  try {
    await api.post(`/api/v1/candidates/${candidateId}/resume`, body)
    toast.add({
      title: t('common.success'),
      description: t('candidates.resumeUploaded'),
      color: 'success',
    })
    refreshCandidate()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    resumeUploading.value = false
    if (resumeInput.value) resumeInput.value.value = ''
  }
}

// Outreach action — send email via best application
const sendingOutreach = ref(false)
const bestApp = computed(() => applications.value[0])

async function triggerOutreach() {
  if (!bestApp.value) return
  sendingOutreach.value = true
  try {
    await api.post(`/api/v1/applications/${bestApp.value.id}/retry-outreach`, {})
    toast.add({
      title: 'Outreach queued',
      description: 'Email will be sent shortly.',
      color: 'success',
    })
    setTimeout(() => refreshOutreach(), 2000)
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Could not queue outreach'), color: 'error' })
  } finally {
    sendingOutreach.value = false
  }
}

// Copy LinkedIn message to clipboard
const linkedinMessage = computed(() => {
  if (!candidate.value || !bestApp.value) return ''
  return `Hi ${candidate.value.fullName?.split(' ')[0] ?? 'there'}, I came across your profile and think you'd be a great fit for a ${bestApp.value.job?.title ?? 'role'} we're hiring for. Would you be open to a quick chat?`
})

async function copyLinkedIn() {
  try {
    await navigator.clipboard.writeText(linkedinMessage.value)
    toast.add({
      title: 'Copied!',
      description: 'LinkedIn message copied to clipboard.',
      color: 'success',
    })
  } catch {
    toast.add({ title: 'Copy failed', description: 'Use Ctrl+C manually.', color: 'error' })
  }
}

function outreachStatusColor(status: string) {
  if (status === 'replied') return 'success'
  if (status === 'opened') return 'primary'
  if (status === 'sent') return 'neutral'
  if (status === 'failed' || status === 'rejected') return 'error'
  return 'neutral'
}
</script>

<template>
  <CommonListSkeleton v-if="pending" />

  <div v-else-if="candidate" class="space-y-6">
    <!-- Hero header -->
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex flex-col md:flex-row items-start justify-between gap-6">
        <div class="flex items-start gap-4">
          <NuxtLink
            to="/employer/candidates"
            style="color: var(--ink-muted); margin-top: 4px"
            class="shrink-0"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div class="min-w-0">
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--ink-subtle);
                margin-bottom: 8px;
              "
            >
              {{ t('candidates.breadcrumb') }}
            </p>
            <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-2xl"
                style="
                  background: var(--accent-soft);
                  color: var(--accent);
                  font-family: 'Fraunces', serif;
                  font-style: italic;
                  border: 1px solid var(--line);
                "
              >
                {{ candidate.fullName?.[0] ?? '?' }}
              </div>
              <div class="min-w-0">
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
                  {{ candidate.fullName ?? '—' }}
                </h1>
                <p
                  style="color: var(--ink-muted); font-size: 14px; margin-top: 2px"
                  class="truncate"
                >
                  {{ candidate.currentPosition ?? ''
                  }}<span v-if="candidate.currentCompany"> · {{ candidate.currentCompany }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Outreach actions -->
        <div v-if="bestApp" class="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <UButton
            variant="outline"
            size="sm"
            icon="i-heroicons-clipboard-document"
            :disabled="!linkedinMessage"
            class="flex-1 md:flex-none justify-center"
            @click="copyLinkedIn"
          >
            Copy LinkedIn msg
          </UButton>
          <UButton
            size="sm"
            icon="i-heroicons-paper-airplane"
            :loading="sendingOutreach"
            class="flex-1 md:flex-none justify-center"
            @click="triggerOutreach"
          >
            Send email
          </UButton>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <h3 class="section-label mb-4">{{ t('candidates.profile') }}</h3>
          <dl class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.email') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ candidate.email ?? '—' }}</dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.phone') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ candidate.phone ?? '—' }}</dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.city') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">{{ candidate.city ?? '—' }}</dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.experience') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ candidate.yearsExperience ?? '—' }} {{ t('candidates.experience') }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.expectedSalary') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ formatSalary(candidate.expectedSalaryUzs) }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.workMode') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ candidate.preferredWorkMode ?? '—' }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.willingToRelocate') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ candidate.willingToRelocate ? t('common.yes') : t('common.no') }}
              </dd>
            </div>
            <div>
              <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
                {{ t('candidates.fields.telegram') }}
              </dt>
              <dd class="font-medium" style="color: var(--ink)">
                {{ candidate.telegramUsername ? '@' + candidate.telegramUsername : '—' }}
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <h3 class="section-label mb-3">{{ t('candidates.resume') }}</h3>
          <div class="flex items-center gap-3">
            <div
              v-if="candidate.resumeFileUrl"
              class="flex items-center gap-2 text-sm"
              style="color: var(--ink-muted)"
            >
              <UIcon
                name="i-heroicons-document"
                class="w-4 h-4 shrink-0"
                style="color: var(--positive)"
              />
              {{ t('candidates.resumeOnFile') }}
            </div>
            <span v-else class="text-sm" style="color: var(--ink-subtle)">{{
              t('candidates.noResume')
            }}</span>
            <label class="cursor-pointer">
              <input
                ref="resumeInput"
                type="file"
                accept=".pdf,.doc,.docx"
                class="hidden"
                @change="uploadResume"
              />
              <UButton
                as="span"
                variant="outline"
                size="xs"
                icon="i-heroicons-arrow-up-tray"
                :loading="resumeUploading"
              >
                {{
                  candidate.resumeFileUrl
                    ? t('candidates.replaceResume')
                    : t('candidates.uploadResume')
                }}
              </UButton>
            </label>
          </div>
        </UCard>

        <!-- Social Proof (Sourcing Hunter) -->
        <div
          v-if="candidate.socialProof"
          class="rounded-2xl p-5"
          style="background: var(--paper); border: 1px solid var(--line)"
        >
          <div class="flex items-center gap-2 mb-4">
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--ink-subtle);
              "
            >
              Agent: Sourcing Hunter
            </p>
          </div>
          <h3
            style="
              font-family: 'Fraunces', serif;
              font-size: 18px;
              letter-spacing: -0.02em;
              color: var(--ink);
              font-weight: 400;
              margin-bottom: 12px;
            "
          >
            Verified Social Proof
          </h3>

          <div
            v-if="candidate.socialProof.social_proof_summary"
            class="mb-5 text-[13px] leading-relaxed italic"
            style="color: var(--ink-muted)"
          >
            "{{ candidate.socialProof.social_proof_summary }}"
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-3">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--ink-subtle);
                "
              >
                Profiles
              </p>
              <div class="flex flex-col gap-2">
                <a
                  v-if="candidate.socialProof.github_url"
                  :href="safeUrl(candidate.socialProof.github_url)"
                  target="_blank"
                  class="flex items-center gap-2 text-xs hover:underline"
                  style="color: var(--accent)"
                >
                  <UIcon name="i-simple-icons-github" class="w-3.5 h-3.5" />
                  GitHub Profile
                </a>
                <a
                  v-if="candidate.socialProof.linkedin_url"
                  :href="safeUrl(candidate.socialProof.linkedin_url)"
                  target="_blank"
                  class="flex items-center gap-2 text-xs hover:underline"
                  style="color: var(--accent)"
                >
                  <UIcon name="i-simple-icons-linkedin" class="w-3.5 h-3.5" />
                  LinkedIn Profile
                </a>
                <a
                  v-if="candidate.socialProof.portfolio_url"
                  :href="safeUrl(candidate.socialProof.portfolio_url)"
                  target="_blank"
                  class="flex items-center gap-2 text-xs hover:underline"
                  style="color: var(--accent)"
                >
                  <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
                  Personal Portfolio
                </a>
              </div>
            </div>

            <div v-if="candidate.socialProof.tech_talks?.length" class="space-y-3">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--ink-subtle);
                "
              >
                Talks & Publications
              </p>
              <ul class="space-y-2">
                <li v-for="talk in candidate.socialProof.tech_talks" :key="talk.url">
                  <a
                    :href="safeUrl(talk.url)"
                    target="_blank"
                    class="flex items-start gap-2 text-xs hover:underline leading-tight"
                    style="color: var(--ink-muted)"
                  >
                    <UIcon name="i-heroicons-microphone" class="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {{ talk.title }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <UCard>
          <h3 class="section-label mb-3">{{ t('candidates.skills') }}</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="s in candidate.skills ?? []" :key="s" color="primary" variant="subtle">{{
              s
            }}</UBadge>
            <span
              v-if="!candidate.skills?.length"
              class="text-sm"
              style="color: var(--ink-subtle)"
              >{{ t('candidates.noSkills') }}</span
            >
          </div>
        </UCard>

        <!-- Outreach history -->
        <UCard>
          <h3 class="section-label mb-3">Outreach history</h3>
          <div v-if="!outreachHistory?.length" class="flex flex-col items-center py-6 gap-2">
            <UIcon
              name="i-heroicons-paper-airplane"
              class="w-8 h-8"
              style="color: var(--ink-subtle)"
            />
            <p class="text-sm" style="color: var(--ink-muted)">No outreach attempts yet.</p>
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="attempt in outreachHistory"
              :key="attempt.id"
              class="flex items-center justify-between gap-3 py-2"
              style="border-bottom: 1px solid var(--line-soft)"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate" style="color: var(--ink)">
                  {{ attempt.jobTitle ?? '—' }}
                </p>
                <p class="text-xs mt-0.5" style="color: var(--ink-subtle)">
                  {{ attempt.channel }} · attempt {{ attempt.attemptNumber }} ·
                  {{ formatDateTime(attempt.sentAt) }}
                </p>
                <p v-if="attempt.openedAt" class="text-xs" style="color: var(--positive)">
                  Opened {{ formatDateTime(attempt.openedAt) }}
                </p>
                <p v-if="attempt.repliedAt" class="text-xs" style="color: var(--positive)">
                  Replied {{ formatDateTime(attempt.repliedAt) }}
                </p>
              </div>
              <UBadge
                :color="outreachStatusColor(attempt.status)"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                {{ attempt.status }}
              </UBadge>
            </li>
          </ul>
        </UCard>
      </div>

      <!-- Applications + scores sidebar -->
      <div class="space-y-4">
        <UCard>
          <h3 class="section-label mb-3">{{ t('candidates.applications') }}</h3>
          <div v-if="!applications?.length" class="flex flex-col items-center py-6 gap-2">
            <UIcon
              name="i-heroicons-clipboard-document-list"
              class="w-8 h-8"
              style="color: var(--ink-subtle)"
            />
            <p class="text-sm" style="color: var(--ink-muted)">
              {{ t('candidates.noApplications') }}
            </p>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="app in applications"
              :key="app.id"
              class="flex items-start justify-between gap-2 pb-3"
              style="border-bottom: 1px solid var(--line-soft)"
            >
              <div class="min-w-0">
                <NuxtLink
                  :to="`/employer/applications/${app.id}`"
                  class="text-sm font-medium hover:underline"
                  style="color: var(--ink)"
                >
                  {{ app.job?.title ?? '—' }}
                </NuxtLink>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge
                    v-if="app.matchScore != null"
                    :color="
                      Number(app.matchScore) >= 80
                        ? 'success'
                        : Number(app.matchScore) >= 60
                          ? 'warning'
                          : 'error'
                    "
                    variant="subtle"
                    size="xs"
                    class="font-mono tabular-nums"
                  >
                    {{ Number(app.matchScore).toFixed(0) }}
                  </UBadge>
                  <span
                    v-if="app.matchRecommendation"
                    class="text-xs"
                    style="color: var(--ink-subtle)"
                  >
                    {{ app.matchRecommendation }}
                  </span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <ApplicationStatusBadge :status="app.status" />
                <div class="flex gap-1">
                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-sparkles"
                    :to="`/employer/applications/${app.id}`"
                    :aria-label="`View AI assessment for ${app.job?.title}`"
                  />
                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-document-text"
                    @click="getDossier(app.id)"
                  />
                </div>
              </div>
            </li>
          </ul>
        </UCard>
      </div>
    </div>
  </div>

  <div v-else class="py-24 text-center space-y-3">
    <p style="color: var(--ink-muted)">{{ t('common.notFound') }}</p>
    <UButton variant="outline" size="sm" @click="() => refreshCandidate()">{{
      t('common.retry')
    }}</UButton>
  </div>
</template>
