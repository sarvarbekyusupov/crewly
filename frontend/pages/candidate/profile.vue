<script setup lang="ts">
definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const store = useCandidateAuthStore()
const api = useCandidateApi()
const toast = useToast()

useHead({ title: 'Profile' })

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
  parsedResume?: any
}

const { data: profile, refresh } = await useAsyncData('candidate-profile', () =>
  api.get<Profile>('/api/v1/candidate-portal/profile'),
)

const isAnalyzingManual = ref(false)

const isParsing = computed(() => {
  return !!(isAnalyzingManual.value || (profile.value?.rawResumeText && !profile.value?.parsedResume))
})

let parsePollInterval: any = null

watch(isParsing, (val) => {
  if (val && !parsePollInterval) {
    console.log('Starting resume parse polling...')
    parsePollInterval = setInterval(async () => {
      try {
        await refresh()
        if (profile.value?.parsedResume) {
          console.log('Parse complete!')
          clearInterval(parsePollInterval)
          parsePollInterval = null
          isAnalyzingManual.value = false
          toast.add({ title: 'Resume analysis complete', description: 'Your profile has been updated.', color: 'success' })
        }
      } catch (err) {
        console.error('Polling failed', err)
      }
    }, 3000)
  } else if (!val && parsePollInterval) {
    clearInterval(parsePollInterval)
    parsePollInterval = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (parsePollInterval) clearInterval(parsePollInterval)
})

const form = reactive<Omit<Profile, 'email' | 'resumeFileUrl' | 'yearsExperience' | 'rawResumeText' | 'parsedResume'>>({
  fullName: '',
  phone: '',
  city: '',
  country: '',
  currentPosition: '',
  currentCompany: '',
  linkedinUrl: '',
  githubUrl: '',
  preferredWorkMode: '',
  willingToRelocate: false,
  skills: [],
})

watch(
  profile,
  (p) => {
    if (!p) return
    Object.assign(form, {
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
      skills: p.skills ?? [],
    })
  },
  { immediate: true },
)

const saving = ref(false)
const skillInput = ref('')

function addSkill() {
  const s = skillInput.value.trim()
  if (s && !form.skills?.includes(s)) form.skills = [...(form.skills ?? []), s]
  skillInput.value = ''
}

function removeSkill(skill: string) {
  form.skills = form.skills?.filter((s) => s !== skill) ?? []
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/profile', form)
    await refresh()
    await store.fetchMe()
    toast.add({ title: 'Profile saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save profile', color: 'error' })
  } finally {
    saving.value = false
  }
}

// CV upload
const cvUploading = ref(false)
const cvInput = ref<HTMLInputElement | null>(null)

async function uploadCv(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  cvUploading.value = true
  const body = new FormData()
  body.append('file', file)
  try {
    await api.post('/api/v1/candidate-portal/cv', body)
    toast.add({ title: 'CV uploaded', color: 'success' })
    isAnalyzingManual.value = true
    await refresh()
  } catch {
    toast.add({ title: 'CV upload failed', color: 'error' })
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
  const skills = (p.skills?.length ?? 0) > 0 ? 1 : 0
  const filled = fields.filter(Boolean).length + skills
  return Math.round((filled / (fields.length + 1)) * 100)
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <UAlert
      v-if="isParsing"
      icon="i-heroicons-sparkles"
      title="AI Analysis in Progress"
      description="Our AI is currently analyzing your resume to extract skills and experience. Your profile will update automatically in a few moments."
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
        Account
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
          Profile
        </h1>
        <!-- Completeness indicator -->
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
        <h3 class="section-label">Resume / CV</h3>
        <div v-if="isParsing" class="flex items-center gap-2 px-2 py-1 rounded bg-primary-50">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 animate-spin text-primary-500" />
          <span class="text-[11px] font-medium text-primary-700 uppercase tracking-wider">Analyzing with AI...</span>
        </div>
      </div>
      
      <div v-if="isParsing" class="mb-4">
        <div class="flex justify-between text-[10px] text-ink-subtle mb-1 uppercase font-mono">
          <span>Extracting skills & experience</span>
          <span>In progress</span>
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
            {{ profile?.resumeFileUrl ? 'CV on file' : 'No CV uploaded' }}
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
            {{ profile?.resumeFileUrl ? 'Replace CV' : 'Upload CV' }}
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
      <p class="text-xs mt-2" style="color: var(--ink-subtle)">PDF, DOC, or DOCX — max 10 MB</p>
    </UCard>

    <!-- Basic info -->
    <UCard>
      <h3 class="section-label mb-4">Personal Information</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Full name">
          <UInput v-model="form.fullName" class="w-full" />
        </UFormField>
        <UFormField label="Email">
          <UInput :value="profile?.email" disabled class="w-full opacity-60" />
        </UFormField>
        <UFormField label="Phone">
          <UInput v-model="form.phone" class="w-full" />
        </UFormField>
        <UFormField label="City">
          <UInput v-model="form.city" class="w-full" />
        </UFormField>
        <UFormField label="Current position">
          <UInput v-model="form.currentPosition" class="w-full" />
        </UFormField>
        <UFormField label="Current company">
          <UInput v-model="form.currentCompany" class="w-full" />
        </UFormField>
        <UFormField label="LinkedIn URL">
          <UInput
            v-model="form.linkedinUrl"
            placeholder="https://linkedin.com/in/…"
            class="w-full"
          />
        </UFormField>
        <UFormField label="GitHub URL">
          <UInput v-model="form.githubUrl" placeholder="https://github.com/…" class="w-full" />
        </UFormField>
        <UFormField label="Preferred work mode">
          <USelect
            v-model="form.preferredWorkMode"
            :options="[
              { label: 'Remote', value: 'remote' },
              { label: 'Office', value: 'office' },
              { label: 'Hybrid', value: 'hybrid' },
            ]"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Willing to relocate" class="flex items-center pt-6">
          <UCheckbox v-model="form.willingToRelocate" label="Yes, open to relocation" />
        </UFormField>
      </div>
    </UCard>

    <!-- Skills -->
    <UCard>
      <h3 class="section-label mb-3">Skills</h3>
      <div class="flex flex-wrap gap-2 mb-3">
        <UBadge v-for="skill in form.skills" :key="skill" color="primary" variant="subtle">
          {{ skill }}
          <button class="ml-1 hover:opacity-60" @click="removeSkill(skill)">×</button>
        </UBadge>
        <span v-if="!form.skills?.length" class="text-sm" style="color: var(--ink-subtle)"
          >Add skills to improve job matching</span
        >
      </div>
      <div class="flex gap-2">
        <UInput
          v-model="skillInput"
          placeholder="Add skill…"
          class="flex-1"
          @keydown.enter.prevent="addSkill"
        />
        <UButton variant="outline" icon="i-heroicons-plus" @click="addSkill" />
      </div>
    </UCard>

    <div class="flex justify-end">
      <UButton :loading="saving" icon="i-heroicons-check" @click="save">Save changes</UButton>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
.animate-progress-indeterminate {
  animation: progress-indeterminate 2s infinite linear;
}
</style>

