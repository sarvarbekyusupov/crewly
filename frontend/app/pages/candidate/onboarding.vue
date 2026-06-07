<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: 'guest' })

const api = useCandidateApi()
const toast = useToast()
const router = useRouter()

const steps = [
  { title: 'Upload Resume', icon: 'i-heroicons-document-arrow-up' },
  { title: 'AI Parsing', icon: 'i-heroicons-cpu-chip' },
  { title: 'Confirm Profile', icon: 'i-heroicons-user' },
]

const currentStep = ref(0)
const isUploading = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Profile form state
const form = reactive({
  fullName: '',
  phone: '',
  city: '',
  preferredWorkMode: 'remote',
  skillsText: '',
})

async function onFileChange(e: any) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    toast.add({ title: 'Only PDF resumes are supported', color: 'error' })
    return
  }
  selectedFile.value = file
  await uploadAndParse()
}

async function uploadAndParse() {
  if (!selectedFile.value) return
  isUploading.value = true
  currentStep.value = 1 // Move to Parsing step

  const formData = new FormData()
  formData.append('resume', selectedFile.value)

  try {
    // Call resume upload/parse endpoint
    const res = await api.post<{
      fullName?: string
      phone?: string
      city?: string
      skills?: string[]
      preferredWorkMode?: string
    }>('/api/v1/candidate-portal/profile/resume', formData)

    // Pre-fill form from AI extraction results
    if (res) {
      form.fullName = res.fullName ?? ''
      form.phone = res.phone ?? ''
      form.city = res.city ?? ''
      form.preferredWorkMode = res.preferredWorkMode ?? 'remote'
      form.skillsText = res.skills?.join(', ') ?? ''
    }

    toast.add({ title: 'Resume parsed successfully', color: 'success' })
    currentStep.value = 2 // Move to Confirm step
  } catch {
    toast.add({
      title: 'AI extraction warning',
      description: 'Could not fully extract details. Please fill in your profile manually.',
      color: 'warning',
    })
    currentStep.value = 2 // Fallback to manual confirm
  } finally {
    isUploading.value = false
  }
}

async function saveProfile() {
  try {
    const skills = form.skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    await api.patch('/api/v1/candidate-portal/profile', {
      fullName: form.fullName,
      phone: form.phone,
      city: form.city,
      preferredWorkMode: form.preferredWorkMode,
      skills,
    })

    const { triggerConfetti } = useConfetti()
    triggerConfetti()

    toast.add({ title: 'Profile set up completed!', color: 'success' })
    router.push('/candidate/dashboard')
  } catch (e) {
    toast.add({
      title: 'Failed to complete setup',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div
      class="max-w-xl w-full mx-auto space-y-8 bg-surface border border-line p-8 rounded-2xl shadow-sm"
    >
      <!-- Brand logo -->
      <div class="text-center">
        <div
          class="inline-flex w-12 h-12 rounded-xl bg-accent text-white items-center justify-center font-serif text-2xl font-bold italic shadow-sm mb-4"
        >
          m
        </div>
        <h2 class="text-3xl font-serif text-ink tracking-tight">Set Up Your Career Pilot</h2>
        <p class="text-sm text-ink-muted mt-1">
          Our AI Matchmaker will help find the best job fits for your skill stack.
        </p>
      </div>

      <!-- Steps Stepper header -->
      <div class="flex items-center justify-between border-b border-line-soft pb-4">
        <div
          v-for="(step, idx) in steps"
          :key="step.title"
          class="flex flex-col items-center flex-1 relative"
        >
          <div
            class="w-8 h-8 rounded-full border flex items-center justify-center transition-colors"
            :style="
              currentStep === idx
                ? 'background: var(--accent); border-color: var(--accent); color: white'
                : currentStep > idx
                  ? 'background: var(--positive-soft); border-color: var(--positive); color: var(--positive)'
                  : 'background: var(--bg-deep); border-color: var(--line); color: var(--ink-subtle)'
            "
          >
            <UIcon :name="step.icon" class="w-4 h-4" />
          </div>
          <span
            class="text-[10px] font-mono mt-1 uppercase"
            :style="
              currentStep === idx
                ? 'color: var(--accent); font-weight: 600'
                : 'color: var(--ink-subtle)'
            "
          >
            {{ step.title }}
          </span>
        </div>
      </div>

      <!-- Step 0: Upload CV -->
      <div v-if="currentStep === 0" class="space-y-6">
        <div
          class="border-2 border-dashed border-line-soft rounded-xl p-8 text-center bg-bg-deep flex flex-col items-center gap-4 relative overflow-hidden"
        >
          <UIcon name="i-heroicons-document-arrow-up" class="w-12 h-12 text-accent" />
          <div>
            <p class="text-sm font-semibold text-ink">Upload your CV / Resume</p>
            <p class="text-xs text-ink-muted mt-1">
              Only PDF format is supported. Our AI Matchmaker will parse your skills automatically.
            </p>
          </div>

          <input
            id="file-upload"
            ref="fileInput"
            type="file"
            accept=".pdf"
            class="hidden"
            @change="onFileChange"
          />
          <UButton size="sm" class="font-medium cursor-pointer" @click="fileInput?.click()">
            Choose PDF file
          </UButton>
        </div>

        <div class="text-center">
          <button
            type="button"
            class="text-xs text-ink-subtle hover:underline cursor-pointer"
            @click="currentStep = 2"
          >
            Or skip upload and fill details manually →
          </button>
        </div>
      </div>

      <!-- Step 1: AI Parsing Loading -->
      <div
        v-else-if="currentStep === 1"
        class="py-12 flex flex-col items-center justify-center text-center gap-4"
      >
        <!-- Pulse animation -->
        <div class="relative w-16 h-14 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
          <div
            class="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-md"
          >
            <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 animate-spin" />
          </div>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink">AI Matchmaker is parsing your CV...</h3>
          <p class="text-xs text-ink-muted mt-1.5 max-w-sm leading-relaxed">
            Extracting professional experience, education, work modes, and matching alignments
            dynamically. This takes up to 10 seconds.
          </p>
        </div>
      </div>

      <!-- Step 2: Confirm profile form -->
      <div v-else-if="currentStep === 2" class="space-y-4">
        <div class="space-y-3">
          <UFormField label="Full Name" name="fullName">
            <UInput v-model="form.fullName" placeholder="e.g. John Doe" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Phone" name="phone">
              <UInput v-model="form.phone" placeholder="e.g. +998901234567" class="w-full" />
            </UFormField>
            <UFormField label="City" name="city">
              <UInput v-model="form.city" placeholder="e.g. Tashkent" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Preferred Work Mode" name="preferredWorkMode">
            <USelect
              v-model="form.preferredWorkMode"
              :items="[
                { label: 'Remote', value: 'remote' },
                { label: 'Hybrid', value: 'hybrid' },
                { label: 'On-site', value: 'office' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Core Skills (comma separated)"
            name="skills"
            description="These keywords are used to align matches."
          >
            <UTextarea
              v-model="form.skillsText"
              placeholder="TypeScript, Nuxt.js, Node.js, PostgreSQL"
              class="w-full"
              :rows="2"
            />
          </UFormField>
        </div>

        <div class="pt-4 border-t border-line-soft flex justify-between gap-3">
          <UButton variant="outline" size="sm" @click="currentStep = 0">Back</UButton>
          <UButton
            color="success"
            size="sm"
            :disabled="!form.fullName || !form.skillsText"
            @click="saveProfile"
          >
            Complete Setup
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
