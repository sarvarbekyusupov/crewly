<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const store = useCandidateAuthStore()
const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()

useHead({ title: t('candidate.profile.title') })

interface ParsedResume {
  summary?: string
  positions?: Position[]
  education?: Education[]
  languages?: Language[]
  certifications?: Certification[]
  projects?: Project[]
  skillLevels?: Record<string, string>
}

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
  parsedResume?: ParsedResume
}

type Position = {
  title?: string
  company?: string
  start?: string
  end?: string
  bullets?: string[]
}
type Education = {
  institution?: string
  degree?: string
  field?: string
  start?: string
  end?: string
}
type Language = { name?: string; level?: string }
type Certification = { name?: string; issuer?: string; date?: string; url?: string }
type Project = { name?: string; description?: string; url?: string; tags?: string[] }

const {
  data: profile,
  pending: profilePending,
  refresh,
} = useAsyncData('candidate-profile', () => api.get<Profile>('/api/v1/candidate-portal/profile'))

const isAnalyzingManual = ref(false)
const isParsing = computed(
  () =>
    !!(isAnalyzingManual.value || (profile.value?.rawResumeText && !profile.value?.parsedResume)),
)

let eventSource: EventSource | null = null
let parsingTimeoutId: any = null

function setupSSE() {
  if (eventSource) return
  const config = useRuntimeConfig()
  const base = (config.public.apiBase as string).replace(/\/$/, '')
  eventSource = new EventSource(`${base}/api/v1/candidate-portal/events`, { withCredentials: true })
  eventSource.onmessage = async (event) => {
    if (!event.data) return
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
            description: t('candidate.profile.resumeAnalysisTimeout'),
            color: 'error',
          })
        }
      }
    } catch {
      /* ignore keepalives */
    }
  }
  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = null
  }
}

onMounted(() => setupSSE())
onUnmounted(() => {
  eventSource?.close()
  eventSource = null
  if (parsingTimeoutId) {
    clearTimeout(parsingTimeoutId)
    parsingTimeoutId = null
  }
})

// --- CV Upload ---
const cvUploading = ref(false)

async function handleCvUpload(file: File) {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
    toast.add({
      title: t('common.error'),
      description: t('candidate.profile.cvInvalidType'),
      color: 'error',
    })
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.add({
      title: t('common.error'),
      description: t('candidate.profile.cvTooLarge'),
      color: 'error',
    })
    return
  }
  cvUploading.value = true
  const body = new FormData()
  body.append('file', file)
  try {
    const res = await api.post<{
      url: string
      uploaded: boolean
      parsing?: boolean
      error?: string
    }>('/api/v1/candidate-portal/cv', body)
    if ((res as any).error) throw new Error((res as any).error)
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
    }
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    cvUploading.value = false
  }
}

// --- Profile Save ---
const saving = ref(false)

async function saveProfile(partial: Partial<Profile>) {
  if (saving.value) return
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/profile', partial)
    await refresh()
    await store.fetchMe()
    toast.add({ title: t('candidate.profile.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

// --- Completion ---
const { percent: completeness, missing: completenessMissing } = useProfileCompletion(profile)

// --- Parsed resume helpers ---
const parsedResume = computed(() => profile.value?.parsedResume ?? {})

const positions = computed<Position[]>(() => parsedResume.value.positions ?? [])
const education = computed<Education[]>(() => parsedResume.value.education ?? [])
const languages = computed<Language[]>(() => parsedResume.value.languages ?? [])
const certifications = computed<Certification[]>(
  () => (parsedResume.value as any).certifications ?? [],
)
const projects = computed<Project[]>(() => (parsedResume.value as any).projects ?? [])

function buildUpdatedParsed(partial: Partial<ParsedResume>) {
  return { ...parsedResume.value, ...partial }
}

// --- Modal state ---
const showHeaderModal = ref(false)
const showSkillsModal = ref(false)
const showAppDefaultsModal = ref(false)
const showLangModal = ref(false)

const expModal = ref<{ open: boolean; index: number | null }>({ open: false, index: null })
const eduModal = ref<{ open: boolean; index: number | null }>({ open: false, index: null })
const certModal = ref<{ open: boolean; index: number | null }>({ open: false, index: null })
const projModal = ref<{ open: boolean; index: number | null }>({ open: false, index: null })

function openExpModal(index: number | null) {
  expModal.value = { open: true, index }
}
function openEduModal(index: number | null) {
  eduModal.value = { open: true, index }
}
function openCertModal(index: number | null) {
  certModal.value = { open: true, index }
}
function openProjModal(index: number | null) {
  projModal.value = { open: true, index }
}

// --- Save handlers ---
async function onHeaderSave(data: any) {
  showHeaderModal.value = false
  await saveProfile({
    fullName: data.fullName,
    phone: data.phone,
    telegramUsername: data.telegramUsername,
    linkedinUrl: data.linkedinUrl,
    githubUrl: data.githubUrl,
    city: data.city,
    country: data.country,
    parsedResume: buildUpdatedParsed({ summary: data.summary }),
  })
}

async function onExpSave(data: Position, index: number | null) {
  expModal.value.open = false
  const list = [...positions.value]
  if (index === null) list.push(data)
  else list[index] = data
  await saveProfile({ parsedResume: buildUpdatedParsed({ positions: list }) })
}

async function onExpDelete(index: number) {
  expModal.value.open = false
  const list = positions.value.filter((_, i) => i !== index)
  await saveProfile({ parsedResume: buildUpdatedParsed({ positions: list }) })
}

async function onEduSave(data: Education, index: number | null) {
  eduModal.value.open = false
  const list = [...education.value]
  if (index === null) list.push(data)
  else list[index] = data
  await saveProfile({ parsedResume: buildUpdatedParsed({ education: list }) })
}

async function onEduDelete(index: number) {
  eduModal.value.open = false
  const list = education.value.filter((_, i) => i !== index)
  await saveProfile({ parsedResume: buildUpdatedParsed({ education: list }) })
}

async function onSkillsSave(skills: string[]) {
  showSkillsModal.value = false
  await saveProfile({ skills })
}

async function onCertSave(data: Certification, index: number | null) {
  certModal.value.open = false
  const list = [...certifications.value]
  if (index === null) list.push(data)
  else list[index] = data
  await saveProfile({ parsedResume: buildUpdatedParsed({ certifications: list } as any) })
}

async function onCertDelete(index: number) {
  certModal.value.open = false
  const list = certifications.value.filter((_, i) => i !== index)
  await saveProfile({ parsedResume: buildUpdatedParsed({ certifications: list } as any) })
}

async function onProjSave(data: Project, index: number | null) {
  projModal.value.open = false
  const list = [...projects.value]
  if (index === null) list.push(data)
  else list[index] = data
  await saveProfile({ parsedResume: buildUpdatedParsed({ projects: list } as any) })
}

async function onProjDelete(index: number) {
  projModal.value.open = false
  const list = projects.value.filter((_, i) => i !== index)
  await saveProfile({ parsedResume: buildUpdatedParsed({ projects: list } as any) })
}

async function onAppDefaultsSave(data: any) {
  showAppDefaultsModal.value = false
  await saveProfile({
    preferredWorkMode: data.preferredWorkMode,
    willingToRelocate: data.willingToRelocate,
    noticePeriodDays: data.noticePeriodDays,
  })
}

async function onLangSave(langs: Language[]) {
  showLangModal.value = false
  await saveProfile({ parsedResume: buildUpdatedParsed({ languages: langs }) })
}

// --- Right nav sections ---
const NAV_SECTIONS = [
  { id: 'profile-header', label: 'Profil' },
  { id: 'documents', label: 'Hujjatlar' },
  { id: 'experience', label: 'Tajriba' },
  { id: 'education', label: "Ta'lim" },
  { id: 'skills', label: "Ko'nikmalar" },
  { id: 'certifications', label: 'Sertifikatlar' },
  { id: 'projects', label: 'Loyihalar' },
  { id: 'app-defaults', label: 'Sozlamalar' },
  { id: 'languages', label: 'Tillar' },
]
</script>

<template>
  <div class="profile-layout">
    <!-- Main content -->
    <div class="profile-main">
      <!-- Loading skeleton -->
      <template v-if="profilePending">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <USkeleton class="h-6 w-32 mb-3" />
          <USkeleton class="h-20 w-full rounded-lg" />
        </div>
      </template>

      <template v-else>
        <!-- Parsing alert -->
        <UAlert
          v-if="isParsing"
          icon="i-heroicons-sparkles"
          :title="t('candidate.profile.aiAnalysisTitle')"
          :description="t('candidate.profile.aiAnalysisDesc')"
          color="primary"
          variant="soft"
          class="animate-pulse"
        />

        <!-- Header card -->
        <CandidateProfileProfileHeader
          :full-name="profile?.fullName"
          :current-position="profile?.currentPosition"
          :current-company="profile?.currentCompany"
          :city="profile?.city"
          :country="profile?.country"
          :email="profile?.email"
          :phone="profile?.phone"
          :telegram-username="profile?.telegramUsername"
          :linkedin-url="profile?.linkedinUrl"
          :github-url="profile?.githubUrl"
          :summary="profile?.parsedResume?.summary"
          :completeness="completeness"
          :missing="completenessMissing"
          @edit="showHeaderModal = true"
        />

        <!-- Documents -->
        <CandidateProfileSectionsDocumentsSection
          :resume-file-url="profile?.resumeFileUrl"
          :uploading="cvUploading"
          @upload="handleCvUpload"
        />

        <!-- Experience -->
        <CandidateProfileSectionsExperienceSection
          :positions="positions"
          @add="openExpModal(null)"
          @edit="openExpModal"
        />

        <!-- Education -->
        <CandidateProfileSectionsEducationSection
          :education="education"
          @add="openEduModal(null)"
          @edit="openEduModal"
        />

        <!-- Skills -->
        <CandidateProfileSectionsSkillsSection
          :skills="profile?.skills ?? []"
          @edit="showSkillsModal = true"
        />

        <!-- Certifications -->
        <CandidateProfileSectionsCertificationsSection
          :certs="certifications"
          @add="openCertModal(null)"
          @edit="openCertModal"
        />

        <!-- Projects -->
        <CandidateProfileSectionsProjectsSection
          :projects="projects"
          @add="openProjModal(null)"
          @edit="openProjModal"
        />

        <!-- App Defaults -->
        <CandidateProfileSectionsAppDefaultsSection
          :preferred-work-mode="profile?.preferredWorkMode"
          :willing-to-relocate="profile?.willingToRelocate"
          :notice-period-days="profile?.noticePeriodDays"
          @edit="showAppDefaultsModal = true"
        />

        <!-- Languages -->
        <CandidateProfileSectionsLanguagesSection
          :languages="languages"
          @edit="showLangModal = true"
        />
      </template>
    </div>

    <!-- Right nav -->
    <CandidateProfileProfileRightNav :sections="NAV_SECTIONS" />

    <!-- Modals -->
    <CandidateProfileModalsEditHeaderModal
      :open="showHeaderModal"
      :full-name="profile?.fullName"
      :summary="profile?.parsedResume?.summary"
      :phone="profile?.phone"
      :telegram-username="profile?.telegramUsername"
      :linkedin-url="profile?.linkedinUrl"
      :github-url="profile?.githubUrl"
      :city="profile?.city"
      :country="profile?.country"
      @close="showHeaderModal = false"
      @save="onHeaderSave"
    />

    <CandidateProfileModalsEditExperienceModal
      :open="expModal.open"
      :position="expModal.index !== null ? (positions[expModal.index] ?? null) : null"
      :index="expModal.index"
      @close="expModal.open = false"
      @save="onExpSave"
      @delete="onExpDelete"
    />

    <CandidateProfileModalsEditEducationModal
      :open="eduModal.open"
      :education="eduModal.index !== null ? (education[eduModal.index] ?? null) : null"
      :index="eduModal.index"
      @close="eduModal.open = false"
      @save="onEduSave"
      @delete="onEduDelete"
    />

    <CandidateProfileModalsEditSkillsModal
      :open="showSkillsModal"
      :skills="profile?.skills ?? []"
      @close="showSkillsModal = false"
      @save="onSkillsSave"
    />

    <CandidateProfileModalsEditCertModal
      :open="certModal.open"
      :cert="certModal.index !== null ? (certifications[certModal.index] ?? null) : null"
      :index="certModal.index"
      @close="certModal.open = false"
      @save="onCertSave"
      @delete="onCertDelete"
    />

    <CandidateProfileModalsEditProjectModal
      :open="projModal.open"
      :project="projModal.index !== null ? (projects[projModal.index] ?? null) : null"
      :index="projModal.index"
      @close="projModal.open = false"
      @save="onProjSave"
      @delete="onProjDelete"
    />

    <CandidateProfileModalsEditAppDefaultsModal
      :open="showAppDefaultsModal"
      :preferred-work-mode="profile?.preferredWorkMode"
      :willing-to-relocate="profile?.willingToRelocate"
      :notice-period-days="profile?.noticePeriodDays"
      @close="showAppDefaultsModal = false"
      @save="onAppDefaultsSave"
    />

    <CandidateProfileModalsEditLanguagesModal
      :open="showLangModal"
      :languages="languages"
      @close="showLangModal = false"
      @save="onLangSave"
    />
  </div>
</template>

<style scoped>
.profile-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  padding-bottom: 60px;
}
.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-card {
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 20px;
}
@media (max-width: 1024px) {
  .profile-layout {
    flex-direction: column;
  }
}
</style>
