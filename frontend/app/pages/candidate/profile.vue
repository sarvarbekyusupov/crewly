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
  yearsExperience?: number | string
  noticePeriodDays?: number | string
  telegramUsername?: string
  rawResumeText?: string
  blacklistedCompanies?: string[]
  parsedResume?: {
    summary?: string
    positions?: { title?: string; company?: string; start?: string; end?: string }[]
    education?: { degree?: string; field?: string; institution?: string }[]
    languages?: { name?: string; level?: string }[]
  }
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
let parsingTimeoutId: any = null

function setupSSE() {
  if (eventSource) return

  const config = useRuntimeConfig()
  const base = (config.public.apiBase as string).replace(/\/$/, '')

  // Connect directly to backend URL to bypass dev proxy buffering of SSE streams
  eventSource = new EventSource(`${base}/api/v1/candidate-portal/events`, {
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
          if (parsingTimeoutId) {
            clearTimeout(parsingTimeoutId)
            parsingTimeoutId = null
          }
          await refresh()
          toast.add({
            title: t('candidate.profile.resumeAnalysisComplete'),
            description: t('candidate.profile.resumeAnalysisDesc'),
            color: 'success',
          })
        } else if (data.payload.status === 'error') {
          isAnalyzingManual.value = false
          if (parsingTimeoutId) {
            clearTimeout(parsingTimeoutId)
            parsingTimeoutId = null
          }
          await refresh()
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
  if (parsingTimeoutId) {
    clearTimeout(parsingTimeoutId)
    parsingTimeoutId = null
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
const [yearsExperience, yearsExperienceProps] = defineField('yearsExperience') as any
const [noticePeriodDays, noticePeriodDaysProps] = defineField('noticePeriodDays') as any
const [telegramUsername, telegramUsernameProps] = defineField('telegramUsername')

const skills = ref<string[]>([])
const editingSkillIndex = ref<number | null>(null)

function addCustomSkill() {
  skills.value.push('')
  editingSkillIndex.value = skills.value.length - 1
}

function deleteCustomSkill(index: number) {
  skills.value.splice(index, 1)
  if (editingSkillIndex.value === index) {
    editingSkillIndex.value = null
  }
}

// Reactive editable arrays from parsedResume
const localPositions = ref<{ title?: string; company?: string; start?: string; end?: string }[]>([])
const localEducation = ref<{ degree?: string; field?: string; institution?: string }[]>([])
const localLanguages = ref<{ name?: string; level?: string }[]>([])

// Visibility privacy
const hideFromCurrentCompany = ref(false)

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
      yearsExperience: p.yearsExperience !== undefined && p.yearsExperience !== null && p.yearsExperience !== '' ? Number(p.yearsExperience) : undefined,
      noticePeriodDays: p.noticePeriodDays !== undefined && p.noticePeriodDays !== null && p.noticePeriodDays !== '' ? Number(p.noticePeriodDays) : undefined,
      telegramUsername: p.telegramUsername ?? '',
    })
    skills.value = p.skills ?? []

    // Populate positions, education, languages
    localPositions.value = JSON.parse(JSON.stringify(p.parsedResume?.positions || []))
    localEducation.value = JSON.parse(JSON.stringify(p.parsedResume?.education || []))
    localLanguages.value = JSON.parse(JSON.stringify(p.parsedResume?.languages || []))

    // Privacy logic
    const company = p.currentCompany ? p.currentCompany.toLowerCase().trim() : ''
    const blacklist = (p.blacklistedCompanies ?? []).map((c) => c.toLowerCase().trim())
    hideFromCurrentCompany.value = company !== '' && blacklist.includes(company)
  },
  { immediate: true },
)

const saving = ref(false)

const save = handleSubmit(async (values) => {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      ...values,
      skills: skills.value,
      yearsExperience: (values.yearsExperience === undefined || values.yearsExperience === null) ? null : Number(values.yearsExperience),
      noticePeriodDays: (values.noticePeriodDays === undefined || values.noticePeriodDays === null) ? null : Number(values.noticePeriodDays),
      telegramUsername: formatTelegramUsername(values.telegramUsername),
      parsedResume: {
        ...profile.value?.parsedResume,
        positions: localPositions.value,
        education: localEducation.value,
        languages: localLanguages.value,
      },
    }

    // Process Hide From Current Company blacklist
    if (hideFromCurrentCompany.value && values.currentCompany) {
      const company = values.currentCompany.trim()
      const currentList = profile.value?.blacklistedCompanies ?? []
      if (!currentList.includes(company)) {
        await api.patch('/api/v1/candidate-portal/preferences', {
          blacklistedCompanies: [...currentList, company],
        })
      }
    } else if (!hideFromCurrentCompany.value && values.currentCompany) {
      const company = values.currentCompany.trim()
      const currentList = profile.value?.blacklistedCompanies ?? []
      if (currentList.includes(company)) {
        await api.patch('/api/v1/candidate-portal/preferences', {
          blacklistedCompanies: currentList.filter((c) => c !== company),
        })
      }
    }

    await api.patch('/api/v1/candidate-portal/profile', payload)
    await refresh()
    await store.fetchMe()
    toast.add({ title: t('candidate.profile.saved'), color: 'success' })
  } catch (e) {
    applyApiFieldErrors(e, setFieldError as any)
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
    const res = await api.post<{ url: string; uploaded: boolean; parsing?: boolean }>('/api/v1/candidate-portal/cv', body)
    toast.add({ title: t('candidate.profile.cvUploaded'), color: 'success' })
    if (parsingTimeoutId) {
      clearTimeout(parsingTimeoutId)
      parsingTimeoutId = null
    }
    if (res.parsing) {
      isAnalyzingManual.value = true
      parsingTimeoutId = setTimeout(() => {
        if (isAnalyzingManual.value) {
          isAnalyzingManual.value = false
          toast.add({
            title: t('common.error'),
            description: t('candidate.profile.resumeAnalysisTimeout'),
            color: 'error',
          })
        }
      }, 60000)
    } else {
      isAnalyzingManual.value = false
    }
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    cvUploading.value = false
    if (cvInput.value) cvInput.value.value = ''
  }
}

// Inline lists editors
const editingPositionIndex = ref<number | null>(null)
const editingEducationIndex = ref<number | null>(null)
const editingLanguageIndex = ref<number | null>(null)

function addPosition() {
  localPositions.value.push({ title: '', company: '', start: '', end: '' })
  editingPositionIndex.value = localPositions.value.length - 1
}
function deletePosition(index: number) {
  localPositions.value.splice(index, 1)
  if (editingPositionIndex.value === index) editingPositionIndex.value = null
}

function addEducation() {
  localEducation.value.push({ degree: '', field: '', institution: '' })
  editingEducationIndex.value = localEducation.value.length - 1
}
function deleteEducation(index: number) {
  localEducation.value.splice(index, 1)
  if (editingEducationIndex.value === index) editingEducationIndex.value = null
}

function addLanguage() {
  localLanguages.value.push({ name: '', level: '' })
  editingLanguageIndex.value = localLanguages.value.length - 1
}
function deleteLanguage(index: number) {
  localLanguages.value.splice(index, 1)
  if (editingLanguageIndex.value === index) editingLanguageIndex.value = null
}

// Warnings & helpers
const overlappingPositionsWarning = computed(() => {
  const currentPositions = localPositions.value.filter(
    (p) => !p.end || p.end.toLowerCase().includes('present') || p.end.toLowerCase().includes('now'),
  )
  return currentPositions.length > 1
})

function formatTelegramUsername(val?: string) {
  if (!val) return ''
  let cleaned = val.trim()
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '')
  cleaned = cleaned.replace(/^@/, '')
  return cleaned
}

const isRegenerating = ref(false)
async function regenerateSummary() {
  isRegenerating.value = true
  try {
    await api.post('/api/v1/candidate-portal/cv/parse', {})
    toast.add({
      title: t('candidate.profile.cvUploaded'),
      description: t('candidate.profile.aiAnalysisTitle'),
      color: 'success',
    })
    isAnalyzingManual.value = true
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    isRegenerating.value = false
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
    p.telegramUsername,
    p.yearsExperience,
  ]
  const hasSkills = (p.skills?.length ?? 0) > 0 ? 1 : 0
  const filled = fields.filter((f) => f !== undefined && f !== null && f !== '').length + hasSkills
  return Math.round((filled / (fields.length + 1)) * 100)
})

// Actionable Dropdown list for progress bar
const missingProfileItems = computed(() => {
  const p = profile.value
  const items = []
  if (!p) return []

  if (!p.fullName) items.push({ label: 'Add Full Name (+12%)', icon: 'i-heroicons-user' })
  if (!p.phone) items.push({ label: 'Add Phone Number (+12%)', icon: 'i-heroicons-phone' })
  if (!p.city) items.push({ label: 'Add City (+12%)', icon: 'i-heroicons-map-pin' })
  if (!p.currentPosition) items.push({ label: 'Add Current Position (+12%)', icon: 'i-heroicons-briefcase' })
  if (!p.currentCompany) items.push({ label: 'Add Current Company (+12%)', icon: 'i-heroicons-building-office' })
  if (!p.preferredWorkMode) items.push({ label: 'Select Preferred Work Mode (+12%)', icon: 'i-heroicons-globe-alt' })
  if (!p.resumeFileUrl) items.push({ label: 'Upload your Resume CV (+12%)', icon: 'i-heroicons-arrow-up-tray' })
  if (!p.telegramUsername) items.push({ label: 'Add Telegram handle (+12%)', icon: 'i-heroicons-paper-airplane' })
  if ((p.skills?.length ?? 0) === 0) items.push({ label: 'Add Skills (+12%)', icon: 'i-heroicons-command-line' })

  if (items.length === 0) {
    return [[{ label: 'Profile complete! 🎉', disabled: true }]]
  }

  return [
    items.map((item) => ({
      label: item.label,
      icon: item.icon,
      disabled: true,
    })),
  ]
})
</script>

<template>
  <div class="max-w-2xl space-y-6 pb-24">
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
        
        <!-- Actionable progress bar dropdown -->
        <UDropdown :items="missingProfileItems" :popper="{ placement: 'bottom-end' }">
          <div class="text-left sm:text-right shrink-0 cursor-pointer hover:opacity-80">
            <span class="text-xs font-semibold" style="color: var(--ink-subtle)">{{ completeness }}% complete</span>
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
        </UDropdown>
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

    <!-- Experience Review -->
    <UCard>
      <div class="flex items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
          <h3 class="section-label mb-0">{{ t('candidate.profile.experienceReview') }}</h3>
        </div>
        
        <!-- Regenerate summary with AI -->
        <UButton
          v-if="profile?.resumeFileUrl"
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          :loading="isRegenerating"
          @click="regenerateSummary"
        >
          Regenerate Summary
        </UButton>
      </div>

      <!-- AI Professional Summary (Feedback) -->
      <div v-if="profile?.parsedResume?.summary" class="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/30">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-4 h-4 text-primary-500" />
          <span class="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
            {{ t('candidate.profile.aiSummary') }}
          </span>
        </div>
        <p class="text-sm leading-relaxed text-primary-900 dark:text-primary-200 italic font-medium">
          "{{ profile.parsedResume.summary }}"
        </p>
      </div>

      <!-- Overlapping dates warning alert -->
      <UAlert
        v-if="overlappingPositionsWarning"
        icon="i-heroicons-exclamation-triangle"
        title="Overlapping Positions"
        description="You have multiple positions marked as current (Present). Please clarify dates to ensure recruiters see accurate experience timelines."
        color="warning"
        variant="subtle"
        class="mb-4"
      />

      <!-- Work History Timeline -->
      <div class="space-y-4">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-xs font-bold uppercase tracking-wider" style="color: var(--ink-muted)">
            {{ t('candidate.profile.workHistory') }}
          </h4>
          <UButton
            variant="outline"
            size="xs"
            icon="i-heroicons-plus"
            @click="addPosition"
          >
            Add Position
          </UButton>
        </div>

        <div class="relative border-l border-line ml-3 pl-5 space-y-6">
          <div v-for="(pos, i) in localPositions" :key="i" class="relative group">
            <div class="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-primary-500 dark:bg-slate-900" />
            
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 space-y-2">
                <!-- Read mode / Edit mode fields -->
                <div v-if="editingPositionIndex !== i">
                  <h5 class="text-sm font-semibold" style="color: var(--ink)">{{ pos.title || t('candidate.profile.unknown') }}</h5>
                  <p class="text-xs font-medium" style="color: var(--ink-muted)">{{ pos.company || t('candidate.profile.unknown') }}</p>
                  <p class="text-[11px] mt-1 font-mono" style="color: var(--ink-subtle)">
                    {{ pos.start || t('candidate.profile.unknown') }} — {{ pos.end || t('candidate.profile.present') }}
                  </p>
                </div>
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-line bg-slate-50 dark:bg-slate-900/50">
                  <UInput v-model="pos.title" placeholder="Title" size="xs" autofocus />
                  <UInput v-model="pos.company" placeholder="Company" size="xs" />
                  <UInput v-model="pos.start" type="month" placeholder="Start Date" size="xs" />
                  <UInput v-model="pos.end" type="month" placeholder="End Date (or empty for Present)" size="xs" />
                </div>
              </div>

              <!-- Item Actions -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton
                  v-if="editingPositionIndex !== i"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-pencil"
                  @click="editingPositionIndex = i"
                />
                <UButton
                  v-else
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-check"
                  color="success"
                  @click="editingPositionIndex = null"
                />
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  color="error"
                  @click="deletePosition(i)"
                />
              </div>
            </div>
          </div>

          <div v-if="!localPositions.length" class="text-sm py-4 text-center italic" style="color: var(--ink-subtle)">
            {{ t('candidate.profile.uploadToGenerate') }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- Education Section -->
    <UCard>
      <div class="flex justify-between items-center mb-4">
        <h3 class="section-label mb-0">Education</h3>
        <UButton
          variant="outline"
          size="xs"
          icon="i-heroicons-plus"
          @click="addEducation"
        >
          Add Education
        </UButton>
      </div>

      <div class="space-y-4">
        <div v-for="(edu, i) in localEducation" :key="i" class="group flex items-start justify-between gap-4 p-3 rounded-xl border border-line">
          <div class="flex-1 space-y-2">
            <div v-if="editingEducationIndex !== i">
              <h5 class="text-sm font-semibold" style="color: var(--ink)">
                {{ edu.degree }} <span v-if="edu.field">in {{ edu.field }}</span>
              </h5>
              <p class="text-xs" style="color: var(--ink-muted)">{{ edu.institution || t('candidate.profile.unknown') }}</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <UInput v-model="edu.degree" placeholder="Degree (e.g. Bachelor's)" size="xs" autofocus />
              <UInput v-model="edu.field" placeholder="Field of Study" size="xs" />
              <UInput v-model="edu.institution" placeholder="Institution" size="xs" />
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              v-if="editingEducationIndex !== i"
              variant="ghost"
              size="xs"
              icon="i-heroicons-pencil"
              @click="editingEducationIndex = i"
            />
            <UButton
              v-else
              variant="ghost"
              size="xs"
              icon="i-heroicons-check"
              color="success"
              @click="editingEducationIndex = null"
            />
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              color="error"
              @click="deleteEducation(i)"
            />
          </div>
        </div>

        <div v-if="!localEducation.length" class="text-sm py-4 text-center italic" style="color: var(--ink-subtle)">
          Add your education history here.
        </div>
      </div>
    </UCard>

    <!-- Languages Section -->
    <UCard>
      <div class="flex justify-between items-center mb-4">
        <h3 class="section-label mb-0">Languages</h3>
        <UButton
          variant="outline"
          size="xs"
          icon="i-heroicons-plus"
          @click="addLanguage"
        >
          Add Language
        </UButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="(lang, i) in localLanguages" :key="i" class="group flex items-start justify-between gap-4 p-3 rounded-xl border border-line">
          <div class="flex-1 space-y-2">
            <div v-if="editingLanguageIndex !== i">
              <h5 class="text-sm font-semibold" style="color: var(--ink)">
                {{ lang.name }} <span v-if="lang.level" class="text-xs font-mono ml-2 p-1 rounded bg-slate-100 dark:bg-slate-800">{{ lang.level }}</span>
              </h5>
            </div>
            <div v-else class="grid grid-cols-2 gap-2">
              <UInput v-model="lang.name" placeholder="Language (e.g. English)" size="xs" autofocus />
              <USelect
                v-model="lang.level"
                :options="['Native', 'Fluent', 'Intermediate', 'Beginner', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']"
                placeholder="Level"
                size="xs"
              />
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              v-if="editingLanguageIndex !== i"
              variant="ghost"
              size="xs"
              icon="i-heroicons-pencil"
              @click="editingLanguageIndex = i"
            />
            <UButton
              v-else
              variant="ghost"
              size="xs"
              icon="i-heroicons-check"
              color="success"
              @click="editingLanguageIndex = null"
            />
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              color="error"
              @click="deleteLanguage(i)"
            />
          </div>
        </div>

        <div v-if="!localLanguages.length" class="text-sm py-4 text-center italic col-span-2" style="color: var(--ink-subtle)">
          Add your spoken languages here.
        </div>
      </div>
    </UCard>

    <!-- Contact Information -->
    <UCard>
      <h3 class="section-label mb-4">{{ t('candidate.profile.contactInfo') }}</h3>
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
        <UFormField :label="t('candidate.profile.telegramUsername')" :error="errors.telegramUsername">
          <UInput
            v-model="telegramUsername"
            v-bind="telegramUsernameProps"
            placeholder="e.g. username"
            class="w-full"
            @blur="telegramUsername = formatTelegramUsername(telegramUsername)"
          />
        </UFormField>
        <UFormField :label="t('candidate.profile.city')" :error="errors.city">
          <UInput v-model="city" v-bind="cityProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.country')" :error="errors.country">
          <UInput v-model="country" v-bind="countryProps" placeholder="e.g. UZ" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <!-- Professional Summary -->
    <UCard>
      <h3 class="section-label mb-4">{{ t('candidate.profile.professionalSummary') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="t('candidate.profile.currentPosition')" :error="errors.currentPosition">
          <UInput v-model="currentPosition" v-bind="currentPositionProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.currentCompany')" :error="errors.currentCompany">
          <UInput v-model="currentCompany" v-bind="currentCompanyProps" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.yearsExperience')" :error="errors.yearsExperience">
          <UInput v-model="yearsExperience" v-bind="yearsExperienceProps" type="number" min="0" max="100" step="0.5" class="w-full" />
        </UFormField>
        <UFormField :label="t('candidate.profile.noticePeriodDays')" :error="errors.noticePeriodDays">
          <!-- notice period dropdown instead of raw number -->
          <USelect
            v-model="noticePeriodDays"
            v-bind="noticePeriodDaysProps"
            :options="[
              { label: 'Immediate / No notice', value: 0 },
              { label: '14 Days (2 weeks)', value: 14 },
              { label: '30 Days (1 month)', value: 30 },
              { label: '60 Days (2 months)', value: 60 },
              { label: '90 Days (3 months)', value: 90 }
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Links & Socials -->
    <UCard>
      <h3 class="section-label mb-4">{{ t('candidate.profile.linksAndSocials') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
    </UCard>

    <!-- Work Preferences & Privacy -->
    <UCard>
      <h3 class="section-label mb-4">{{ t('candidate.profile.workPreferences') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          :label="t('candidate.profile.preferredWorkMode')"
          :error="errors.preferredWorkMode"
        >
          <USelect
            v-model="preferredWorkMode"
            v-bind="preferredWorkModeProps"
            :options="[
              { label: t('candidate.jobs.remote') || 'Remote', value: 'remote' },
              { label: t('candidate.jobs.office') || 'Office', value: 'office' },
              { label: t('candidate.jobs.hybrid') || 'Hybrid', value: 'hybrid' },
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
        
        <!-- Profile Privacy Current Company Toggle -->
        <UFormField class="flex items-center pt-4 col-span-2">
          <UCheckbox
            v-model="hideFromCurrentCompany"
            label="Hide my profile and auto-applies from my current company"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Skills Card -->
    <UCard>
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-command-line" class="w-5 h-5 text-primary-500" />
          <h3 class="section-label mb-0">{{ t('candidate.profile.skills') }}</h3>
        </div>
        <UButton
          variant="outline"
          size="xs"
          icon="i-heroicons-plus"
          @click="addCustomSkill"
        >
          Add Skill
        </UButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="(skill, i) in skills" :key="i" class="group flex items-center justify-between gap-4 p-3 rounded-xl border border-line">
          <div class="flex-1">
            <div v-if="editingSkillIndex !== i" class="text-sm font-semibold" style="color: var(--ink)">
              {{ skill || 'Untitled Skill' }}
            </div>
            <div v-else>
              <UInput v-model="skills[i]" placeholder="Skill Name (e.g. Node.js)" size="xs" class="w-full" autofocus />
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              v-if="editingSkillIndex !== i"
              variant="ghost"
              size="xs"
              icon="i-heroicons-pencil"
              @click="editingSkillIndex = i"
            />
            <UButton
              v-else
              variant="ghost"
              size="xs"
              icon="i-heroicons-check"
              color="success"
              @click="editingSkillIndex = null"
            />
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              color="error"
              @click="deleteCustomSkill(i)"
            />
          </div>
        </div>

        <div v-if="!skills.length" class="text-sm py-6 text-center italic col-span-2 flex flex-col items-center gap-2" style="color: var(--ink-subtle)">
          <span>Add your professional skills here.</span>
          <UButton variant="outline" size="xs" icon="i-heroicons-plus" class="mt-1" @click="addCustomSkill">
            Add Your First Skill
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Sticky Bottom Save Changes Action Bar -->
    <div class="sticky bottom-4 z-10 p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-line shadow-lg flex justify-end">
      <UButton
        :loading="saving"
        icon="i-heroicons-check"
        size="md"
        @click="
          async () => {
            await save()
          }
        "
      >
        {{ t('candidate.profile.saveChanges') }}
      </UButton>
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
