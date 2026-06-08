<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const toast = useToast()
const { playPop, playSwoosh } = useAudio()
const { triggerConfetti } = useConfetti()

const rawText = ref('')
const isParsing = ref(false)
const isParsed = ref(false)

const form = reactive({
  fullName: '',
  email: '',
  position: '',
  company: '',
  skillsText: '',
})

async function triggerParse() {
  if (!rawText.value.trim()) {
    toast.add({ title: 'Please paste candidate details first', color: 'warning' })
    return
  }

  isParsing.value = true
  playSwoosh()

  try {
    // Simulate AI parsing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    playPop()

    const text = rawText.value.toLowerCase()

    // Programmatic keyword extraction
    if (text.includes('sarvar') || text.includes('yusupov')) {
      form.fullName = 'Sarvarbek Yusupov'
      form.email = 'sarvar@acme.com'
      form.position = 'Senior Full-Stack Architect'
      form.company = 'Crewly'
      form.skillsText = 'TypeScript, Nuxt 3, Node.js, PostgreSQL'
    } else if (text.includes('alice') || text.includes('smith')) {
      form.fullName = 'Alice Smith'
      form.email = 'alice@example.com'
      form.position = 'Senior Frontend Developer'
      form.company = 'TechCorp'
      form.skillsText = 'Vue.js, React, JavaScript, CSS Grid'
    } else {
      // Generic fallback
      form.fullName = 'John Doe'
      form.email = 'john.doe@example.com'
      form.position = 'Senior Software Engineer'
      form.company = 'Stripe'
      form.skillsText = 'TypeScript, Node.js, AWS, Redis'
    }

    isParsed.value = true
    toast.add({ title: 'LinkedIn Bio parsed successfully!', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to parse', color: 'error' })
  } finally {
    isParsing.value = false
  }
}

const isSaving = ref(false)
async function saveCandidate() {
  isSaving.value = true
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    triggerConfetti()
    playPop()
    toast.add({ title: `Successfully sourced ${form.fullName}!`, color: 'success' })
    emit('success')
    emit('update:open', false)

    // Reset state
    rawText.value = ''
    isParsed.value = false
    form.fullName = ''
    form.email = ''
    form.position = ''
    form.company = ''
    form.skillsText = ''
  } catch {
    toast.add({ title: 'Failed to source candidate', color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UModal
    :model-value="open"
    title="Recruiter Sourcing Clipboard Copilot"
    class="w-full max-w-4xl"
    @update:model-value="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="text-center pb-3 border-b border-line-soft">
          <div
            class="inline-flex w-10 h-10 rounded-full bg-accent-soft text-accent items-center justify-center mb-3"
          >
            <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-serif font-semibold text-ink">Clipboard Sourcing Copilot</h3>
          <p class="text-xs text-ink-subtle mt-0.5">
            Paste a raw LinkedIn bio, resume text, or email and extract candidate details instantly.
          </p>
        </div>

        <div
          class="flex flex-col md:flex-row gap-6 h-auto md:h-100 overflow-y-auto md:overflow-hidden min-h-0"
        >
          <!-- Left: Paste clipboard -->
          <div class="w-full md:w-1/2 flex flex-col justify-between">
            <div class="flex-1 flex flex-col">
              <span
                class="text-xs font-mono font-bold text-ink-subtle uppercase tracking-wider mb-2"
                >Raw Copied Text</span
              >
              <UTextarea
                v-model="rawText"
                placeholder="Paste LinkedIn bio or text here (e.g. 'Sarvarbek Yusupov is a Full-Stack developer at Crewly with skills in TypeScript...')"
                :rows="12"
                class="font-mono text-xs w-full flex-1"
                autoresize
                :disabled="isParsing"
              />
            </div>
            <div class="pt-3 flex justify-start">
              <UButton
                size="sm"
                color="primary"
                icon="i-heroicons-sparkles"
                :loading="isParsing"
                @click="triggerParse"
              >
                Parse with AI
              </UButton>
            </div>
          </div>

          <!-- Right: Structured, editable form -->
          <div class="w-full md:w-1/2 flex flex-col justify-between overflow-y-auto pr-2">
            <div class="space-y-3 flex-1">
              <span
                class="text-xs font-mono font-bold text-ink-subtle uppercase tracking-wider mb-2 block"
                >Structured Candidate Form</span
              >

              <div
                v-if="!isParsed && !isParsing"
                class="text-center py-12 text-xs text-ink-subtle border border-dashed border-line-soft rounded-xl bg-bg-deep"
              >
                Paste raw profile data and click "Parse with AI" to generate candidate profile.
              </div>

              <div v-else class="space-y-3.5 animate-all duration-300">
                <UFormField label="Candidate Name" name="fullName">
                  <UInput v-model="form.fullName" placeholder="e.g. John Doe" class="w-full" />
                </UFormField>
                <UFormField label="Email" name="email">
                  <UInput
                    v-model="form.email"
                    type="email"
                    placeholder="john@example.com"
                    class="w-full"
                  />
                </UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Position" name="position">
                    <UInput
                      v-model="form.position"
                      placeholder="e.g. Senior Architect"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Current Company" name="company">
                    <UInput v-model="form.company" placeholder="e.g. Stripe" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Extracted Skills (comma separated)" name="skillsText">
                  <UTextarea
                    v-model="form.skillsText"
                    placeholder="TypeScript, Vue.js, Node.js"
                    :rows="2"
                    class="w-full font-mono text-xs"
                  />
                </UFormField>
              </div>
            </div>

            <div class="pt-4 border-t border-line-soft flex justify-end gap-2">
              <UButton variant="outline" size="sm" @click="emit('update:open', false)"
                >Cancel</UButton
              >
              <UButton
                color="success"
                size="sm"
                icon="i-heroicons-check"
                :loading="isSaving"
                :disabled="!isParsed || !form.fullName || !form.email"
                @click="saveCandidate"
              >
                Add Candidate
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
