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
    education?: {
      degree?: string
      field?: string
      institution?: string
      start?: string
      end?: string
    }[]
    languages?: { name?: string; level?: string }[]
    skillLevels?: Record<string, string>
  }
}

const {
  data: profile,
  pending: profilePending,
  refresh,
} = useAsyncData('candidate-profile', () => api.get<Profile>('/api/v1/candidate-portal/profile'))

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
  window.addEventListener('beforeunload', handleBeforeUnload)
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
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// --- VeeValidate form ---
const { errors, handleSubmit, defineField, setFieldError, resetForm } = useForm({
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

const { searchAreas, searchSkills } = useHhSuggests()
const cityItems = ref<string[]>([])
const citySearching = ref(false)
const skillItems = ref<string[]>([])

async function onCitySearch(text: string) {
  if (!text || text.length < 2) {
    cityItems.value = []
    return
  }
  citySearching.value = true
  const items = await searchAreas(text)
  cityItems.value = items.map((i) => i.text)
  citySearching.value = false
}

async function onSkillSearch(text: string) {
  if (!text || text.length < 2) {
    skillItems.value = []
    return
  }
  const items = await searchSkills(text)
  skillItems.value = items.map((i) => i.text)
}

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

function moveSkillUp(index: number) {
  if (index <= 0 || index >= skills.value.length) return
  const temp = skills.value[index] as string
  skills.value[index] = skills.value[index - 1] as string
  skills.value[index - 1] = temp
}

function moveSkillDown(index: number) {
  if (index < 0 || index >= skills.value.length - 1) return
  const temp = skills.value[index] as string
  skills.value[index] = skills.value[index + 1] as string
  skills.value[index + 1] = temp
}

// Reactive editable arrays from parsedResume
const localPositions = ref<{ title?: string; company?: string; start?: string; end?: string }[]>([])
const localEducation = ref<
  { degree?: string; field?: string; institution?: string; start?: string; end?: string }[]
>([])
const localLanguages = ref<{ name?: string; level?: string }[]>([])
const localSkillLevels = ref<Record<string, string>>({})
const localSummary = ref('')
const isEditingSummary = ref(false)

// Dirty-state tracking: flag set by user edits, cleared on profile load
const userHasEdited = ref(false)
let _resettingFromProfile = false

// Countries list for searchable SelectMenu
const countriesList = [
  { label: 'Uzbekistan', value: 'UZ' },
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Germany', value: 'DE' },
  { label: 'Russia', value: 'RU' },
  { label: 'Kazakhstan', value: 'KZ' },
  { label: 'Canada', value: 'CA' },
  { label: 'France', value: 'FR' },
  { label: 'Turkey', value: 'TR' },
  { label: 'United Arab Emirates', value: 'AE' },
  { label: 'India', value: 'IN' },
  { label: 'China', value: 'CN' },
  { label: 'Japan', value: 'JP' },
  { label: 'South Korea', value: 'KR' },
  { label: 'Australia', value: 'AU' },
  { label: 'Singapore', value: 'SG' },
  { label: 'Netherlands', value: 'NL' },
  { label: 'Spain', value: 'ES' },
  { label: 'Italy', value: 'IT' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Switzerland', value: 'CH' },
]

// Scroll and focus helper
function scrollToAndFocus(id: string) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const input = element.querySelector(
        'input, select, textarea, button',
      ) as HTMLInputElement | null
      if (input) {
        input.focus()
      }
    }, 300)
  }
}

// Visibility privacy — must be declared before the field watcher below
const hideFromCurrentCompany = ref(false)

const isFormDirty = computed(() => userHasEdited.value)

// Watch all editable fields and arrays — sets userHasEdited when the user (not the system) changes something
watch(
  [
    fullName,
    phone,
    city,
    country,
    currentPosition,
    currentCompany,
    linkedinUrl,
    githubUrl,
    preferredWorkMode,
    willingToRelocate,
    yearsExperience,
    noticePeriodDays,
    telegramUsername,
    localPositions,
    localEducation,
    localLanguages,
    skills,
    localSkillLevels,
    localSummary,
    hideFromCurrentCompany,
  ],
  () => {
    if (!_resettingFromProfile) userHasEdited.value = true
  },
  { deep: true },
)

// Unsaved changes window unload guard
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isFormDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Navigation guard for route change
onBeforeRouteLeave(() => {
  if (isFormDirty.value) {
    const confirmLeave = confirm(
      'You have unsaved changes. Are you sure you want to leave this page?',
    )
    if (!confirmLeave) return false
  }
})

watch(
  profile,
  async (p) => {
    if (!p) return
    resetForm({
      values: {
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
        yearsExperience:
          p.yearsExperience !== undefined && p.yearsExperience !== null && p.yearsExperience !== ''
            ? Number(p.yearsExperience)
            : undefined,
        noticePeriodDays:
          p.noticePeriodDays !== undefined &&
          p.noticePeriodDays !== null &&
          p.noticePeriodDays !== ''
            ? Number(p.noticePeriodDays)
            : undefined,
        telegramUsername: p.telegramUsername ?? '',
      },
    })
    skills.value = Array.isArray(p.skills) ? [...p.skills] : []

    // Populate positions, education, languages, summary
    localPositions.value = JSON.parse(JSON.stringify(p.parsedResume?.positions || []))
    localEducation.value = JSON.parse(JSON.stringify(p.parsedResume?.education || []))
    localLanguages.value = JSON.parse(JSON.stringify(p.parsedResume?.languages || []))
    localSummary.value = p.parsedResume?.summary ?? ''
    localSkillLevels.value = JSON.parse(JSON.stringify(p.parsedResume?.skillLevels || {}))

    // Privacy logic
    const company = p.currentCompany ? p.currentCompany.toLowerCase().trim() : ''
    const blacklist = (p.blacklistedCompanies ?? []).map((c) => c.toLowerCase().trim())
    hideFromCurrentCompany.value = company !== '' && blacklist.includes(company)

    // Block the field watcher during and immediately after the reset so it
    // doesn't mis-interpret system-driven value changes as user edits
    _resettingFromProfile = true
    await nextTick()
    userHasEdited.value = false
    _resettingFromProfile = false
  },
  { immediate: true },
)

const saving = ref(false)

const targetRole = ref('architect')
const rolesList = [
  { value: 'architect', label: 'Senior Full-Stack Architect' },
  { value: 'lead', label: 'Technical Team Lead' },
  { value: 'manager', label: 'Engineering Manager' },
]

const roadmapSteps = computed(() => {
  if (targetRole.value === 'architect') {
    return [
      {
        skill: 'TypeScript & Nuxt 3',
        desc: 'Core architecture and performance optimization.',
        status: 'matched',
      },
      {
        skill: 'PostgreSQL & Index Optimization',
        desc: 'Relational data design and scaling.',
        status: 'matched',
      },
      {
        skill: 'Docker & Kubernetes IaC',
        desc: 'Container orchestration and platform scaling.',
        status: 'missing',
      },
    ]
  }
  if (targetRole.value === 'lead') {
    return [
      {
        skill: 'System Design Patterns',
        desc: 'Cohesive modular architectural layouts.',
        status: 'matched',
      },
      {
        skill: 'Mentorship & Code Reviews',
        desc: 'Guiding junior engineers and assuring PR quality.',
        status: 'missing',
      },
      {
        skill: 'Agile Delivery Orchestration',
        desc: 'Scrum sprint sizing and scope estimations.',
        status: 'matched',
      },
    ]
  }
  return [
    {
      skill: 'Product Roadmap Sizing',
      desc: 'Mapping tech deliverables to product KPIs.',
      status: 'missing',
    },
    {
      skill: 'Resource Allocation & Budgets',
      desc: 'Hiring capacity plans and AWS cost optimization.',
      status: 'missing',
    },
    {
      skill: 'Cross-functional Coordination',
      desc: 'Aligning design, QA, and developer pipelines.',
      status: 'matched',
    },
  ]
})

const save = handleSubmit(async (values) => {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      ...values,
      skills: skills.value,
      yearsExperience:
        values.yearsExperience === undefined || values.yearsExperience === null
          ? null
          : Number(values.yearsExperience),
      noticePeriodDays:
        values.noticePeriodDays === undefined || values.noticePeriodDays === null
          ? null
          : Number(values.noticePeriodDays),
      telegramUsername: formatTelegramUsername(values.telegramUsername),
      parsedResume: {
        ...profile.value?.parsedResume,
        positions: localPositions.value,
        education: localEducation.value,
        languages: localLanguages.value,
        summary: localSummary.value,
        skillLevels: localSkillLevels.value,
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
    const res = await api.post<{ url: string; uploaded: boolean; parsing?: boolean }>(
      '/api/v1/candidate-portal/cv',
      body,
    )
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
  localEducation.value.push({ degree: '', field: '', institution: '', start: '', end: '' })
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
const isCurrentPosition = (p: { end?: string }) =>
  !p.end || p.end.toLowerCase().includes('present') || p.end.toLowerCase().includes('now')

const overlappingPositionsWarning = computed(() => {
  return localPositions.value.filter(isCurrentPosition).length > 1
})

const firstOverlappingIndex = computed(() => localPositions.value.findIndex(isCurrentPosition))

function fixFirstOverlap() {
  editingPositionIndex.value = firstOverlappingIndex.value
  nextTick(() => scrollToAndFocus(`position-${firstOverlappingIndex.value}`))
}

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

const { percent: completeness, missing: completenessMissing } = useProfileCompletion(profile)

// Actionable Dropdown list for progress bar
const missingProfileItems = computed(() => {
  const gaps = completenessMissing.value
  if (gaps.length === 0) {
    return [[{ label: 'Profile complete! 🎉', disabled: true }]]
  }

  const labelToFieldMap: Record<string, { id: string; icon: string }> = {
    'Full name': { id: 'field-fullName', icon: 'i-heroicons-user' },
    Phone: { id: 'field-phone', icon: 'i-heroicons-phone' },
    City: { id: 'field-city', icon: 'i-heroicons-map-pin' },
    'Current role': { id: 'field-currentPosition', icon: 'i-heroicons-briefcase' },
    'Current company': { id: 'field-currentCompany', icon: 'i-heroicons-building-office' },
    'Work mode': { id: 'field-preferredWorkMode', icon: 'i-heroicons-globe-alt' },
    'CV / Resume': { id: 'field-resumeSection', icon: 'i-heroicons-arrow-up-tray' },
    Telegram: { id: 'field-telegramUsername', icon: 'i-heroicons-paper-airplane' },
    'Years experience': { id: 'field-yearsExperience', icon: 'i-heroicons-clock' },
    Skills: { id: 'field-skillsCard', icon: 'i-heroicons-command-line' },
  }

  return [
    gaps.map((gap) => {
      const field = labelToFieldMap[gap]
      return {
        label: `Add ${gap} (+10%)`,
        icon: field?.icon || 'i-heroicons-question-mark-circle',
        click: () => {
          if (field) {
            scrollToAndFocus(field.id)
          }
        },
      }
    }),
  ]
})
</script>

<template>
  <div class="max-w-2xl space-y-6 pb-24">
    <!-- Loading skeleton -->
    <template v-if="profilePending">
      <div class="pb-4" style="border-bottom: 1px solid var(--line)">
        <USkeleton class="h-3 w-24 mb-2" />
        <USkeleton class="h-8 w-48 mb-3" />
        <USkeleton class="h-4 w-64" />
      </div>
      <div class="space-y-3">
        <USkeleton class="h-32 w-full rounded-lg" />
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-24 w-full rounded-lg" />
      </div>
    </template>

    <template v-else>
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
          <UDropdownMenu :items="missingProfileItems" :content="{ side: 'bottom', align: 'end' }">
            <button
              type="button"
              tabindex="-1"
              class="block text-left sm:text-right shrink-0 hover:opacity-80 appearance-none bg-transparent border-0 p-0 cursor-pointer"
            >
              <span class="text-xs font-semibold" style="color: var(--ink-subtle)"
                >{{ completeness }}% complete</span
              >
              <div
                class="w-32 h-1.5 rounded-full mt-1 overflow-hidden"
                style="background: var(--line)"
              >
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
              <p
                v-if="completenessMissing.length > 0"
                class="text-[10px] mt-1"
                style="color: var(--ink-subtle)"
              >
                ↑ click to see what's missing
              </p>
            </button>
          </UDropdownMenu>
        </div>
      </div>

      <!-- Contact Information -->
      <UCard>
        <h3 class="section-label mb-4">{{ t('candidate.profile.contactInfo') }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            id="field-fullName"
            :label="t('candidate.profile.fullName')"
            :error="errors.fullName"
          >
            <UInput
              v-model="fullName"
              v-bind="fullNameProps"
              name="fullName"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('candidate.profile.email')" hint="Cannot be changed">
            <UInput
              :value="profile?.email"
              disabled
              class="w-full"
              style="opacity: 0.55; cursor: not-allowed"
            >
              <template #trailing>
                <UIcon
                  name="i-heroicons-lock-closed"
                  class="w-3.5 h-3.5"
                  style="color: var(--ink-subtle)"
                />
              </template>
            </UInput>
          </UFormField>
          <UFormField id="field-phone" :label="t('candidate.profile.phone')" :error="errors.phone">
            <UInput
              v-model="phone"
              v-bind="phoneProps"
              name="phone"
              autocomplete="tel"
              class="w-full"
            />
          </UFormField>
          <UFormField
            id="field-telegramUsername"
            :label="t('candidate.profile.telegramUsername')"
            :error="errors.telegramUsername"
          >
            <UInput
              v-model="telegramUsername"
              v-bind="telegramUsernameProps"
              name="telegramUsername"
              placeholder="e.g. username"
              class="w-full"
              @blur="telegramUsername = formatTelegramUsername(telegramUsername)"
            />
          </UFormField>
          <UFormField id="field-city" :label="t('candidate.profile.city')" :error="errors.city">
            <UInputMenu
              v-model="city"
              v-bind="cityProps"
              name="city"
              :items="cityItems"
              :loading="citySearching"
              create-option
              class="w-full"
              @update:query="onCitySearch"
            />
          </UFormField>
          <UFormField
            id="field-country"
            :label="t('candidate.profile.country')"
            :error="errors.country"
          >
            <USelect
              v-model="country"
              v-bind="countryProps"
              name="country"
              placeholder="Select country..."
              :items="countriesList"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Professional Summary -->
      <UCard>
        <h3 class="section-label mb-4">{{ t('candidate.profile.professionalSummary') }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            id="field-currentPosition"
            :label="t('candidate.profile.currentPosition')"
            :error="errors.currentPosition"
          >
            <UInput
              v-model="currentPosition"
              v-bind="currentPositionProps"
              name="currentPosition"
              class="w-full"
            />
          </UFormField>
          <UFormField
            id="field-currentCompany"
            :label="t('candidate.profile.currentCompany')"
            :error="errors.currentCompany"
          >
            <UInput
              v-model="currentCompany"
              v-bind="currentCompanyProps"
              name="currentCompany"
              class="w-full"
            />
          </UFormField>
          <UFormField
            id="field-yearsExperience"
            :label="t('candidate.profile.yearsExperience')"
            :error="errors.yearsExperience"
          >
            <UInput
              v-model="yearsExperience"
              v-bind="yearsExperienceProps"
              name="yearsExperience"
              type="number"
              min="0"
              max="100"
              step="0.5"
              class="w-full"
            />
          </UFormField>
          <UFormField
            id="field-noticePeriodDays"
            :label="t('candidate.profile.noticePeriodDays')"
            :error="errors.noticePeriodDays"
          >
            <USelect
              v-model="noticePeriodDays"
              v-bind="noticePeriodDaysProps"
              aria-label="Notice period"
              placeholder="Select notice period"
              :items="[
                { label: 'Immediate / No notice', value: 0 },
                { label: '14 Days (2 weeks)', value: 14 },
                { label: '30 Days (1 month)', value: 30 },
                { label: '60 Days (2 months)', value: 60 },
                { label: '90 Days (3 months)', value: 90 },
              ]"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- CV Upload -->
      <UCard id="field-resumeSection">
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
                profile?.resumeFileUrl
                  ? t('candidate.profile.cvOnFile')
                  : t('candidate.profile.noCv')
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

        <!-- AI Professional Summary -->
        <div
          v-if="localSummary || isEditingSummary"
          class="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/30"
        >
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="w-4 h-4 text-primary-500"
              />
              <span
                class="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider"
              >
                {{ t('candidate.profile.aiSummary') }}
              </span>
            </div>
            <UButton
              variant="ghost"
              size="xs"
              :icon="isEditingSummary ? 'i-heroicons-check' : 'i-heroicons-pencil'"
              class="text-primary-600 dark:text-primary-400"
              @click="isEditingSummary = !isEditingSummary"
            >
              {{ isEditingSummary ? 'Done' : 'Edit' }}
            </UButton>
          </div>
          <div v-if="isEditingSummary" class="mt-2">
            <UTextarea
              v-model="localSummary"
              placeholder="Write your professional summary..."
              class="w-full bg-white dark:bg-slate-900"
              :rows="4"
            />
          </div>
          <p
            v-else
            class="text-sm leading-relaxed text-primary-900 dark:text-primary-200 italic font-medium"
          >
            "{{ localSummary }}"
          </p>
        </div>

        <!-- Empty state: no summary yet -->
        <div
          v-else-if="!isParsing"
          class="mb-6 p-5 rounded-xl border border-dashed border-line flex flex-col items-center gap-3 text-center"
        >
          <UIcon name="i-heroicons-sparkles" class="w-8 h-8 text-primary-300" />
          <div>
            <p class="text-sm font-medium" style="color: var(--ink)">No AI summary yet</p>
            <p class="text-xs mt-1" style="color: var(--ink-muted)">
              Upload your CV to auto-generate one, or write it manually.
            </p>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="profile?.resumeFileUrl"
              size="xs"
              icon="i-heroicons-sparkles"
              :loading="isRegenerating"
              @click="regenerateSummary"
            >
              Generate with AI
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              icon="i-heroicons-pencil"
              @click="isEditingSummary = true"
            >
              Write manually
            </UButton>
          </div>
        </div>

        <!-- Overlapping dates warning alert -->
        <UAlert
          v-if="overlappingPositionsWarning"
          icon="i-heroicons-exclamation-triangle"
          title="Overlapping Positions"
          color="warning"
          variant="subtle"
          class="mb-4"
        >
          <template #description>
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <span>Multiple positions marked as current. Set an end date on one of them.</span>
              <UButton size="xs" color="warning" variant="solid" @click="fixFirstOverlap">
                Fix first
              </UButton>
            </div>
          </template>
        </UAlert>

        <!-- Work History Timeline -->
        <div class="space-y-4">
          <div class="flex justify-between items-center mb-1">
            <h4 class="text-xs font-bold uppercase tracking-wider" style="color: var(--ink-muted)">
              {{ t('candidate.profile.workHistory') }}
            </h4>
            <UButton variant="outline" size="xs" icon="i-heroicons-plus" @click="addPosition">
              Add Position
            </UButton>
          </div>

          <!-- Timeline Legend -->
          <div class="flex items-center gap-4 text-[10px] text-ink-subtle pb-2 ml-3">
            <div class="flex items-center gap-1">
              <span
                class="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-400 inline-block"
              />
              <span>Current Position</span>
            </div>
            <div class="flex items-center gap-1">
              <span
                class="w-2.5 h-2.5 rounded-full bg-white border-2 border-primary-500 dark:bg-slate-900 inline-block"
              />
              <span>Past Position</span>
            </div>
          </div>

          <div class="relative border-l border-line ml-3 pl-5 space-y-6">
            <div
              v-for="(pos, i) in localPositions"
              :id="`position-${i}`"
              :key="i"
              class="relative group"
            >
              <!-- Conditional Timeline Dot styling -->
              <div
                class="absolute -left-6.5 top-1.5 w-3 h-3 rounded-full border-2 transition-all duration-200"
                :class="
                  isCurrentPosition(pos)
                    ? 'bg-primary-500 border-primary-500 dark:bg-primary-400 dark:border-primary-400'
                    : 'bg-white border-primary-500 dark:bg-slate-900 dark:border-primary-500'
                "
              />

              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 space-y-2">
                  <!-- Read mode / Edit mode fields -->
                  <div v-if="editingPositionIndex !== i">
                    <h5 class="text-sm font-semibold" style="color: var(--ink)">
                      {{ pos.title || t('candidate.profile.unknown') }}
                    </h5>
                    <p class="text-xs font-medium" style="color: var(--ink-muted)">
                      {{ pos.company || t('candidate.profile.unknown') }}
                    </p>
                    <p class="text-[11px] mt-1 font-mono" style="color: var(--ink-subtle)">
                      {{ pos.start || t('candidate.profile.unknown') }} —
                      {{ pos.end || t('candidate.profile.present') }}
                    </p>

                    <!-- Inline warning with Set End Date CTA -->
                    <div
                      v-if="overlappingPositionsWarning && isCurrentPosition(pos)"
                      class="mt-2 text-[11px] text-warning-700 dark:text-warning-300 flex items-center gap-1.5 p-1.5 rounded-lg bg-warning-50 dark:bg-warning-950/20 border border-warning-200/50"
                    >
                      <UIcon
                        name="i-heroicons-exclamation-triangle"
                        class="w-3.5 h-3.5 text-warning-500 shrink-0"
                      />
                      <span>Overlapping current position.</span>
                      <button
                        type="button"
                        class="underline font-bold text-warning-700 dark:text-warning-300 ml-auto hover:opacity-80"
                        @click="editingPositionIndex = i"
                      >
                        Set end date
                      </button>
                    </div>
                  </div>
                  <div
                    v-else
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-line bg-slate-50 dark:bg-slate-900/50"
                  >
                    <UInput v-model="pos.title" placeholder="Title" size="xs" autofocus />
                    <UInput v-model="pos.company" placeholder="Company" size="xs" />
                    <UInput v-model="pos.start" type="month" placeholder="Start Date" size="xs" />
                    <UInput
                      v-model="pos.end"
                      type="month"
                      placeholder="End Date (or empty for Present)"
                      size="xs"
                    />
                  </div>
                </div>

                <!-- Item Actions -->
                <div class="flex items-center gap-1 shrink-0">
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

            <div
              v-if="!localPositions.length"
              class="text-sm py-4 text-center italic"
              style="color: var(--ink-subtle)"
            >
              {{ t('candidate.profile.uploadToGenerate') }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Skills Card -->
      <UCard id="field-skillsCard">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-command-line" class="w-5 h-5 text-primary-500" />
            <h3 class="section-label mb-0">{{ t('candidate.profile.skills') }}</h3>
          </div>
          <UButton variant="outline" size="xs" icon="i-heroicons-plus" @click="addCustomSkill">
            Add Skill
          </UButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="(skill, i) in skills"
            :key="i"
            class="group flex items-center justify-between gap-4 p-3 rounded-xl border border-line"
          >
            <div class="flex-1 min-w-0">
              <div v-if="editingSkillIndex !== i" class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold" style="color: var(--ink)">
                  {{ skill || 'Untitled Skill' }}
                </span>
                <span
                  v-if="localSkillLevels[skill]"
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  :style="{
                    background:
                      localSkillLevels[skill] === 'Expert'
                        ? 'var(--positive-soft)'
                        : localSkillLevels[skill] === 'Advanced'
                          ? 'var(--accent-soft)'
                          : 'var(--bg-elevated)',
                    color:
                      localSkillLevels[skill] === 'Expert'
                        ? 'var(--positive)'
                        : localSkillLevels[skill] === 'Advanced'
                          ? 'var(--accent)'
                          : 'var(--ink-muted)',
                  }"
                  >{{ localSkillLevels[skill] }}</span
                >
              </div>
              <div v-else class="flex flex-col gap-1.5">
                <UInputMenu
                  v-model="skills[i]"
                  :items="skillItems"
                  placeholder="Skill Name (e.g. Node.js)"
                  size="xs"
                  create-option
                  class="w-full"
                  autofocus
                  @update:query="onSkillSearch"
                />
                <USelect
                  :model-value="localSkillLevels[skill] ?? ''"
                  :items="['Beginner', 'Intermediate', 'Advanced', 'Expert']"
                  placeholder="Proficiency (optional)"
                  size="xs"
                  class="w-full"
                  @update:model-value="
                    (v: string) => {
                      if (v) localSkillLevels[skill] = v
                      else delete localSkillLevels[skill]
                    }
                  "
                />
              </div>
            </div>

            <!-- Skills Actions - Reordering + Edit/Remove -->
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                v-if="editingSkillIndex !== i && i > 0"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-up"
                title="Move Up"
                @click="moveSkillUp(i)"
              />
              <UButton
                v-if="editingSkillIndex !== i && i < skills.length - 1"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-down"
                title="Move Down"
                @click="moveSkillDown(i)"
              />
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

          <div
            v-if="!skills.length"
            class="text-sm py-6 text-center italic col-span-2 flex flex-col items-center gap-2"
            style="color: var(--ink-subtle)"
          >
            <span>Add your professional skills here.</span>
            <UButton
              variant="outline"
              size="xs"
              icon="i-heroicons-plus"
              class="mt-1"
              @click="addCustomSkill"
            >
              Add Your First Skill
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Education Section -->
      <UCard>
        <div class="flex justify-between items-center mb-4">
          <h3 class="section-label mb-0">Education</h3>
          <UButton variant="outline" size="xs" icon="i-heroicons-plus" @click="addEducation">
            Add Education
          </UButton>
        </div>

        <div class="space-y-4">
          <div
            v-for="(edu, i) in localEducation"
            :key="i"
            :class="[
              'group flex items-start justify-between gap-4 p-3 rounded-xl border',
              !edu.start && !edu.end && editingEducationIndex !== i
                ? 'border-amber-400/60 bg-amber-50/20 dark:bg-amber-900/10'
                : 'border-line',
            ]"
          >
            <div class="flex-1 space-y-2">
              <div v-if="editingEducationIndex !== i">
                <h5 class="text-sm font-semibold" style="color: var(--ink)">
                  {{ edu.degree }} <span v-if="edu.field">in {{ edu.field }}</span>
                </h5>
                <p class="text-xs" style="color: var(--ink-muted)">
                  {{ edu.institution || t('candidate.profile.unknown') }}
                </p>
                <p class="text-[11px] mt-1 font-mono" style="color: var(--ink-subtle)">
                  <template v-if="edu.start || edu.end">
                    {{ edu.start || '?' }} — {{ edu.end || t('candidate.profile.present') }}
                  </template>
                  <button
                    v-else
                    type="button"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                    @click="editingEducationIndex = i"
                  >
                    <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                    Add dates
                  </button>
                </p>
              </div>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <UInput
                  v-model="edu.degree"
                  placeholder="Degree (e.g. Bachelor's)"
                  size="xs"
                  autofocus
                />
                <UInput v-model="edu.field" placeholder="Field of Study" size="xs" />
                <UInput
                  v-model="edu.institution"
                  placeholder="Institution"
                  size="xs"
                  class="sm:col-span-2"
                />
                <UInput v-model="edu.start" type="month" placeholder="Start Date" size="xs" />
                <UInput
                  v-model="edu.end"
                  type="month"
                  placeholder="End Date (empty = Present)"
                  size="xs"
                />
              </div>
            </div>

            <div
              class="flex items-center gap-1 transition-opacity"
              :class="
                !edu.start && !edu.end && editingEducationIndex !== i
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              "
            >
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

          <div
            v-if="!localEducation.length"
            class="text-sm py-4 text-center italic"
            style="color: var(--ink-subtle)"
          >
            Add your education history here.
          </div>
        </div>
      </UCard>

      <!-- Languages Section -->
      <UCard>
        <div class="flex justify-between items-center mb-4">
          <h3 class="section-label mb-0">Languages</h3>
          <UButton variant="outline" size="xs" icon="i-heroicons-plus" @click="addLanguage">
            Add Language
          </UButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="(lang, i) in localLanguages"
            :key="i"
            class="group flex items-start justify-between gap-4 p-3 rounded-xl border border-line"
          >
            <div class="flex-1 space-y-2">
              <div v-if="editingLanguageIndex !== i">
                <h5 class="text-sm font-semibold" style="color: var(--ink)">
                  {{ lang.name }}
                  <span
                    v-if="lang.level"
                    class="text-xs font-mono ml-2 p-1 rounded bg-slate-100 dark:bg-slate-800"
                    >{{ lang.level }}</span
                  >
                </h5>
              </div>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <UInput
                  v-model="lang.name"
                  placeholder="Language (e.g. English)"
                  size="xs"
                  autofocus
                />
                <USelect
                  v-model="lang.level"
                  :items="[
                    'Native',
                    'Fluent',
                    'Intermediate',
                    'Beginner',
                    'A1',
                    'A2',
                    'B1',
                    'B2',
                    'C1',
                    'C2',
                  ]"
                  placeholder="Level"
                  size="xs"
                />
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
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

          <div
            v-if="!localLanguages.length"
            class="text-sm py-4 text-center italic col-span-2"
            style="color: var(--ink-subtle)"
          >
            Add your spoken languages here.
          </div>
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
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/…"
              class="w-full"
            >
              <template v-if="linkedinUrl" #trailing>
                <a :href="linkedinUrl" target="_blank" rel="noopener noreferrer" tabindex="-1">
                  <UIcon
                    name="i-heroicons-arrow-top-right-on-square"
                    class="w-4 h-4"
                    style="color: var(--ink-subtle)"
                  />
                </a>
              </template>
            </UInput>
          </UFormField>
          <UFormField :label="t('candidate.profile.githubUrl')" :error="errors.githubUrl">
            <UInput
              v-model="githubUrl"
              v-bind="githubUrlProps"
              name="githubUrl"
              placeholder="https://github.com/…"
              class="w-full"
            >
              <template v-if="githubUrl" #trailing>
                <a :href="githubUrl" target="_blank" rel="noopener noreferrer" tabindex="-1">
                  <UIcon
                    name="i-heroicons-arrow-top-right-on-square"
                    class="w-4 h-4"
                    style="color: var(--ink-subtle)"
                  />
                </a>
              </template>
            </UInput>
          </UFormField>
        </div>
      </UCard>

      <!-- Work Preferences & Privacy -->
      <UCard>
        <h3 class="section-label mb-4">Work Preferences & Privacy</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            id="field-preferredWorkMode"
            :label="t('candidate.profile.preferredWorkMode')"
            :error="errors.preferredWorkMode"
          >
            <USelect
              v-model="preferredWorkMode"
              v-bind="preferredWorkModeProps"
              aria-label="Preferred work mode"
              placeholder="Select work mode"
              :items="[
                { label: t('candidate.jobs.remote') || 'Remote', value: 'remote' },
                { label: t('candidate.jobs.office') || 'Office', value: 'office' },
                { label: t('candidate.jobs.hybrid') || 'Hybrid', value: 'hybrid' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField class="flex items-center sm:col-span-2">
            <UCheckbox
              v-model="willingToRelocate"
              v-bind="willingToRelocateProps"
              :label="t('candidate.profile.willingToRelocate')"
            />
          </UFormField>
          <UFormField class="flex items-center sm:col-span-2">
            <UCheckbox
              v-model="hideFromCurrentCompany"
              label="Hide my profile and auto-applies from my current company"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- AI Career Path Navigator & Skill Badges Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Skill Badges Card -->
        <UCard>
          <div class="flex items-center gap-2 mb-4">
            <UIcon name="i-heroicons-academic-cap" class="w-5 h-5 text-accent animate-bounce" />
            <h3 class="section-label mb-0">Verified Skill Badges</h3>
          </div>
          <p class="text-xs text-ink-muted mb-4 leading-relaxed">
            Earned by submitting certified repositories or answering AI screening questions.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              class="relative overflow-hidden rounded-xl border border-positive/30 bg-bg-deep p-4 text-center group hover:shadow-md transition-shadow"
            >
              <div
                class="absolute inset-0 bg-positive/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl pointer-events-none"
              />
              <UIcon name="i-heroicons-sparkles" class="w-7 h-7 text-positive mx-auto mb-2" />
              <p class="text-xs font-semibold text-ink leading-tight">Nuxt 3 Architecture</p>
              <span class="text-[9px] font-mono text-positive font-bold uppercase mt-1.5 block"
                >Level: Advanced</span
              >
            </div>
            <div
              class="relative overflow-hidden rounded-xl border border-accent/30 bg-bg-deep p-4 text-center group hover:shadow-md transition-shadow"
            >
              <div
                class="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl pointer-events-none"
              />
              <UIcon name="i-heroicons-bolt" class="w-7 h-7 text-accent mx-auto mb-2" />
              <p class="text-xs font-semibold text-ink leading-tight">State Orchestration</p>
              <span class="text-[9px] font-mono text-accent font-bold uppercase mt-1.5 block"
                >Level: Intermediate</span
              >
            </div>
          </div>
        </UCard>

        <!-- Career Path Navigator Card -->
        <UCard>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-map" class="w-5 h-5 text-accent" />
              <h3 class="section-label mb-0">AI Career Navigator</h3>
            </div>
            <USelect
              v-model="targetRole"
              :items="rolesList"
              size="xs"
              class="w-44 font-mono text-[10px]"
            />
          </div>

          <!-- Roadmap timeline steps -->
          <div class="space-y-3.5">
            <div v-for="step in roadmapSteps" :key="step.skill" class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                :style="
                  step.status === 'matched'
                    ? 'background: var(--positive-soft); border-color: var(--positive); color: var(--positive)'
                    : 'background: var(--accent-soft); border-color: var(--accent); color: var(--accent)'
                "
              >
                <UIcon
                  :name="
                    step.status === 'matched' ? 'i-heroicons-check' : 'i-heroicons-plus-circle'
                  "
                  class="w-3 h-3"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-ink leading-none">{{ step.skill }}</span>
                  <span
                    class="text-[9px] font-mono font-bold uppercase"
                    :class="step.status === 'matched' ? 'text-positive' : 'text-accent'"
                    >{{ step.status }}</span
                  >
                </div>
                <p class="text-[10px] text-ink-muted leading-snug mt-1">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Sticky Bottom Save Changes Action Bar -->
      <div
        class="sticky bottom-4 z-10 p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-line shadow-lg flex justify-end"
      >
        <UButton
          :loading="saving"
          :disabled="!isFormDirty"
          icon="i-heroicons-check"
          size="md"
          @click="
            () => {
              save()
            }
          "
        >
          {{ t('candidate.profile.saveChanges') }}
        </UButton>
      </div>
    </template>
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
