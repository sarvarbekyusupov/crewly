<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { candidateProfileSchema } from '~/schemas/candidate'

definePageMeta({ layout: 'candidate' })

const store = useCandidateAuthStore()
const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()

useHead({ title: t('candidate.profile.title') })

interface Profile {
  fullName?: string
  email?: string
  phone?: string
  city?: string
  country?: string
  currentPosition?: string
  currentCompany?: string
  linkedinUrl?: string
  githubUrl?: string
  preferredWorkMode?: string
  willingToRelocate?: boolean
  skills?: string[]
  resumeFileUrl?: string
  yearsExperience?: string
  rawResumeText?: string
  parsedResume?: Record<string, unknown>
}

const { data: profile, refresh } = await useAsyncData('candidate-profile', () =>
  api.get<Profile>('/api/v1/candidate-portal/profile'),
)

const isAnalyzingManual = ref(false)

const isParsing = computed(() => {
  return !!(
    isAnalyzingManual.value ||
    (profile.value?.rawResumeText && !profile.value?.parsedResume)
  )
})

let eventSource: EventSource | null = null

function setupSSE() {
  if (eventSource) return

  // Need to append credentials via withCredentials if not using a proxy,
  // but standard browser fetch via API proxy usually attaches cookies.
  eventSource = new EventSource('/api/v1/candidate-portal/events', {
    withCredentials: true,
  })

  eventSource.onmessage = async (event) => {
    if (!event.data) return // keepalive
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'resume_parse_progress') {
        if (data.payload.status === 'parsing') {
          isAnalyzingManual.value = true
        } else if (data.payload.status === 'done') {
          isAnalyzingManual.value = false
          await refresh()
          toast.add({
            title: t('candidate.profile.resumeAnalysisComplete'),
            description: t('candidate.profile.resumeAnalysisDesc'),
            color: 'success',
          })
        } else if (data.payload.status === 'error') {
          isAnalyzingManual.value = false
          toast.add({
            title: t('common.error'),
            description: t('candidate.profile.resumeAnalysisTimeout'), // Or a specific error message
            color: 'error',
          })
        }
      }
    } catch {
      // ignore JSON parse errors from keepalives
    }
  }

  eventSource.onerror = () => {
    // Attempted reconnection is automatic, but we can close it if we want to stop
    // For now, let EventSource handle reconnects.
  }
}

onMounted(() => {
  setupSSE()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
})

// --- VeeValidate form ---
const { errors, handleSubmit, defineField, setValues, setFieldError } = useForm({
  validationSchema: toTypedSchema(candidateProfileSchema),
})

const [fullName, fullNameProps] = defineField('fullName')
const [phone, phoneProps] = defineField('phone')
const [city, cityProps] = defineField('city')
const [country, countryProps] = defineField('country')
const [currentPosition, currentPositionProps] = defineField('currentPosition')
const [currentCompany, currentCompanyProps] = defineField('currentCompany')
const [linkedinUrl, linkedinUrlProps] = defineField('linkedinUrl')
const [githubUrl, githubUrlProps] = defineField('githubUrl')
const [preferredWorkMode, preferredWorkModeProps] = defineField('preferredWorkMode')
const [willingToRelocate, willingToRelocateProps] = defineField('willingToRelocate')

const skills = ref<string[]>([])
const skillInput = ref('')

watch(
  profile,
  (p) => {
    if (!p) return
    setValues({
      fullName: p.fullName ?? '',
      phone: p.phone ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
      currentPosition: p.currentPosition ?? '',
      currentCompany: p.currentCompany ?? '',
      linkedinUrl: p.linkedinUrl ?? '',
      githubUrl: p.githubUrl ?? '',
      preferredWorkMode: p.preferredWorkMode ?? '',
      willingToRelocate: p.willingToRelocate ?? false,
    })
    skills.value = p.skills ?? []
  },
  { immediate: true },
)

const saving = ref(false)

function addSkill() {
  const s = skillInput.value.trim()
  if (s && !skills.value.includes(s)) skills.value = [...skills.value, s]
  skillInput.value = ''
}

function removeSkill(skill: string) {
  skills.value = skills.value.filter((s) => s !== skill)
}

const save = handleSubmit(async (values) => {
  if (saving.value) return
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/profile', { ...values, skills: skills.value })
    await refresh()
    await store.fetchMe()
    toast.add({ title: t('candidate.profile.saved'), color: 'success' })
  } catch (e) {
    applyApiFieldErrors(e, setFieldError)
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
})

// CV upload
const cvUploading = ref(false)
const cvInput = ref<HTMLInputElement | null>(null)

async function uploadCv(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!allowed.includes(file.type)) {
    toast.add({
      title: t('common.error'),
      description: t('candidate.profile.cvInvalidType'),
      color: 'error',
    })
    if (cvInput.value) cvInput.value.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.add({
      title: t('common.error'),
      description: t('candidate.profile.cvTooLarge'),
      color: 'error',
    })
    if (cvInput.value) cvInput.value.value = ''
    return
  }
  cvUploading.value = true
  const body = new FormData()
  body.append('file', file)
  try {
    await api.post('/api/v1/candidate-portal/cv', body)
    toast.add({ title: t('candidate.profile.cvUploaded'), color: 'success' })
    isAnalyzingManual.value = true
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    cvUploading.value = false
    if (cvInput.value) cvInput.value.value = ''
  }
}

// Profile completeness
const completeness = computed(() => {
  const p = profile.value
  if (!p) return 0
  const fields = [
    p.fullName,
    p.phone,
    p.city,
    p.currentPosition,
    p.currentCompany,
    p.preferredWorkMode,
    p.resumeFileUrl,
  ]
  const hasSkills = (p.skills?.length ?? 0) > 0 ? 1 : 0
  const filled = fields.filter(Boolean).length + hasSkills
  return Math.round((filled / (fields.length + 1)) * 100)
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <UAlert
      v-if="isParsing"
      icon="i-heroicons-sparkles"
      :title="t('candidate.profile.aiAnalysisTitle')"
      :description="t('candidate.profile.aiAnalysisDesc')"
      color="primary"
      variant="soft"
      class="animate-pulse"
    />

    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
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
        {{ t('candidate.profile.eyebrow') }}
      </p>
      <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
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
          {{ t('candidate.profile.title') }}
        </h1>
        <div class="text-left sm:text-right shrink-0">
          <span class="text-xs" style="color: var(--ink-subtle)">{{ completeness }}% complete</span>
          <div class="w-32 h-1.5 rounded-full mt-1 overflow-hidden" style="background: var(--line)">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: completeness + '%',
                background:
                  completeness >= 80
                    ? 'var(--positive)'
                    : completeness >= 50
                      ? 'var(--warning)'
                      : 'var(--accent)',
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- CV Upload -->
    <UCard>
      <div class="flex items-center justify-between mb-3">
        <h3 class="section-label">{{ t('candidate.profile.resumeSection') }}</h3>
        <div v-if="isParsing" class="flex items-center gap-2 px-2 py-1 rounded bg-primary-50">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 animate-spin text-primary-500" />
          <span class="text-[11px] font-medium text-primary-700 uppercase tracking-wider">{{
            t('candidate.profile.analyzingAi')
          }}</span>
        </div>
      </div>

      <div v-if="isParsing" class="mb-4">
        <div class="flex justify-between text-[10px] text-ink-subtle mb-1 uppercase font-mono">
          <span>{{ t('candidate.profile.extractingSkills') }}</span>
          <span>{{ t('candidate.profile.inProgress') }}</span>
        </div>
        <div class="w-full h-1 bg-line rounded-full overflow-hidden">
          <div class="h-full bg-primary-500 animate-progress-indeterminate w-1/3 rounded-full" />
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <UIcon
            :name="profile?.resumeFileUrl ? 'i-heroicons-document-check' : 'i-heroicons-document'"
            class="w-5 h-5"
            :style="{ color: profile?.resumeFileUrl ? 'var(--positive)' : 'var(--ink-subtle)' }"
          />
          <span
            class="text-sm"
            :style="{ color: profile?.resumeFileUrl ? 'var(--ink)' : 'var(--ink-muted)' }"
          >
            {{
              profile?.resumeFileUrl ? t('candidate.profile.cvOnFile') : t('candidate.profile.noCv')
            }}
          </span>
        </div>

        <label class="cursor-pointer">
          <input
            ref="cvInput"
            type="file"
            accept=".pdf,.doc,.docx"
            class="hidden"
            @change="uploadCv"
          />
          <UButton
            as="span"
            variant="outline"
            size="sm"
            icon="i-heroicons-arrow-up-tray"
            :loading="cvUploading"
            :disabled="!!isParsing"
          >
            {{
              profile?.resumeFileUrl
                ? t('candidate.profile.replaceCv')
                : t('candidate.profile.uploadCv')
            }}
          </UButton>
        </label>

        <a
          v-if="profile?.resumeFileUrl"
          :href="profile.resumeFileUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-down-tray">Download</UButton>
        </a>
      </div>
      <p class="text-xs mt-2" style="color: var(--ink-subtle)">
        {{ t('candidate.profile.cvFileHint') }}
      </p>
    </UCard>

    <!-- Basic info -->
    <UCard>
      <h3 class="section-label mb-4">{{ t('candidate.profile.personalInfo') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="t('candidate.profile.fullName')" :error="errors.fullName">
          <UInput v-model="fullName" v-bind="fullNameProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.email')">
          <UInput :value="profile?.email" disabled class="w-full opacity-60" />
        </UFormField>
        <UFormField :label="t('candidate.profile.phone')" :error="errors.phone">
          <UInput v-model="phone" v-bind="phoneProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.city')" :error="errors.city">
          <UInput v-model="city" v-bind="cityProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.currentPosition')" :error="errors.currentPosition">
          <UInput v-model="currentPosition" v-bind="currentPositionProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.currentCompany')" :error="errors.currentCompany">
          <UInput v-model="currentCompany" v-bind="currentCompanyProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.linkedinUrl')" :error="errors.linkedinUrl">
          <UInput
            v-model="linkedinUrl"
            v-bind="linkedinUrlProps"
            placeholder="https://linkedin.com/in/…"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('candidate.profile.githubUrl')" :error="errors.githubUrl">
          <UInput
            v-model="githubUrl"
            v-bind="githubUrlProps"
            placeholder="https://github.com/…"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('candidate.profile.preferredWorkMode')"
          :error="errors.preferredWorkMode"
        >
          <USelect
            v-model="preferredWorkMode"
            v-bind="preferredWorkModeProps"
            :options="[
              { label: t('jobs.workMode.remote'), value: 'remote' },
              { label: t('jobs.workMode.office'), value: 'office' },
              { label: t('jobs.workMode.hybrid'), value: 'hybrid' },
            ]"
            class="w-full"
          />
        </UFormField>
        <UFormField class="flex items-center pt-6">
          <UCheckbox
            v-model="willingToRelocate"
            v-bind="willingToRelocateProps"
            :label="t('candidate.profile.willingToRelocate')"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Skills -->
    <UCard>
      <h3 class="section-label mb-3">{{ t('candidate.profile.skills') }}</h3>
      <div class="flex flex-wrap gap-2 mb-3">
        <UBadge v-for="skill in skills" :key="skill" color="primary" variant="subtle">
          {{ skill }}
          <button class="ml-1 hover:opacity-60" @click="removeSkill(skill)">×</button>
        </UBadge>
        <span v-if="!skills.length" class="text-sm" style="color: var(--ink-subtle)"
          >Add skills to improve job matching</span
        >
      </div>
      <div class="flex gap-2">
        <UInput
          v-model="skillInput"
          :placeholder="t('candidate.profile.addSkill')"
          class="flex-1"
          @keydown.enter.prevent="addSkill"
        />
        <UButton variant="outline" icon="i-heroicons-plus" @click="addSkill" />
      </div>
    </UCard>

    <div class="flex justify-end">
      <UButton
        :loading="saving"
        icon="i-heroicons-check"
        @click="
          async () => {
            await save()
          }
        "
        >{{ t('candidate.profile.saveChanges') }}</UButton
      >
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}
.animate-progress-indeterminate {
  animation: progress-indeterminate 2s infinite linear;
}
</style>
