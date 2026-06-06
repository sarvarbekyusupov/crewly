<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'empty', auth: 'guest' })

const { t } = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const currentStep = ref(1) // 1 to 5
const loading = ref(false)
const resendLoading = ref(false)
const done = ref(false)
const showPassword = ref(false)
const registeredEmail = ref('')

// Master Onboarding Wizard Form State
const wizardForm = ref({
  // Step 1: Account
  fullName: '',
  email: '',
  password: '',

  // Step 2: Company
  companyName: '',
  contactEmail: '',
  website: '',

  // Step 3: First Role
  jobTitle: '',
  requiredSkillsText: '', // raw comma-separated text
  requiredSkills: [] as string[],

  // Step 4: Sourcing Specs
  jobDescription: '',
  workMode: 'remote' as 'office' | 'hybrid' | 'remote',
  officeLocation: '',

  // Step 5: Compensation & Launch
  experienceBracket: 'mid', // 'junior' | 'mid' | 'senior' | 'expert'
  minExperienceYears: 3,
  maxExperienceYears: 5,
  salaryMin: undefined as number | undefined,
  salaryMax: undefined as number | undefined,
  salaryCurrency: 'USD' as 'USD' | 'UZS',
})

// Error tracking per field
const errors = ref<Record<string, string>>({})

// Helper to clear error when user types
function clearError(field: string) {
  if (errors.value[field]) {
    errors.value[field] = ''
  }
}

// Password strength calculator
function passwordStrength(pw: string | undefined): 0 | 1 | 2 | 3 {
  if (!pw || pw.length < 1) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return 1
  if (score <= 3) return 2
  return 3
}

const pwStrength = computed(() => passwordStrength(wizardForm.value.password))
const pwStrengthLabel = computed(() => {
  if (pwStrength.value === 1) return t('auth.passwordWeak')
  if (pwStrength.value === 2) return t('auth.passwordMedium')
  if (pwStrength.value === 3) return t('auth.passwordStrong')
  return ''
})
const pwStrengthColor = computed(() => {
  if (pwStrength.value === 1) return 'var(--color-red-500)'
  if (pwStrength.value === 2) return 'var(--color-amber-400)'
  if (pwStrength.value === 3) return 'var(--color-green-500)'
  return '#2a2a27'
})

// Validation constraints per step
function validateStep(step: number): boolean {
  errors.value = {}
  let valid = true

  if (step === 1) {
    if (!wizardForm.value.fullName.trim()) {
      errors.value.fullName = 'Full name is required'
      valid = false
    }
    if (!wizardForm.value.email.trim()) {
      errors.value.email = 'Email address is required'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardForm.value.email)) {
      errors.value.email = 'Invalid email address'
      valid = false
    }
    if (!wizardForm.value.password) {
      errors.value.password = 'Password is required'
      valid = false
    } else if (wizardForm.value.password.length < 8) {
      errors.value.password = 'Password must be at least 8 characters'
      valid = false
    }
  } else if (step === 2) {
    if (!wizardForm.value.companyName.trim()) {
      errors.value.companyName = 'Company name is required'
      valid = false
    }
    if (wizardForm.value.contactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardForm.value.contactEmail)) {
        errors.value.contactEmail = 'Invalid email address'
        valid = false
      }
    }
  } else if (step === 3) {
    if (!wizardForm.value.jobTitle.trim()) {
      errors.value.jobTitle = 'Job title is required'
      valid = false
    } else if (wizardForm.value.jobTitle.trim().length < 3) {
      errors.value.jobTitle = 'Job title must be at least 3 characters'
      valid = false
    }
    if (!wizardForm.value.requiredSkillsText.trim()) {
      errors.value.requiredSkillsText = 'At least one required skill is required'
      valid = false
    }
  } else if (step === 4) {
    if (!wizardForm.value.jobDescription.trim()) {
      errors.value.jobDescription = 'Job description is required'
      valid = false
    } else if (wizardForm.value.jobDescription.trim().length < 50) {
      errors.value.jobDescription =
        'Job description must be at least 50 characters to calibrate sourcing'
      valid = false
    }
    if (wizardForm.value.workMode !== 'remote' && !wizardForm.value.officeLocation.trim()) {
      errors.value.officeLocation = 'Office location is required for office and hybrid roles'
      valid = false
    }
  } else if (step === 5) {
    if (wizardForm.value.salaryMin !== undefined && wizardForm.value.salaryMin <= 0) {
      errors.value.salaryMin = 'Salary must be a positive number'
      valid = false
    }
    if (wizardForm.value.salaryMax !== undefined && wizardForm.value.salaryMax <= 0) {
      errors.value.salaryMax = 'Salary must be a positive number'
      valid = false
    }
    if (
      wizardForm.value.salaryMin !== undefined &&
      wizardForm.value.salaryMax !== undefined &&
      wizardForm.value.salaryMin > wizardForm.value.salaryMax
    ) {
      errors.value.salaryMax = 'Maximum salary cannot be less than minimum salary'
      valid = false
    }
  }

  return valid
}

// Navigation functions
function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function goNext() {
  if (!validateStep(currentStep.value)) return

  // Progress steps
  if (currentStep.value < 5) {
    currentStep.value++
  } else {
    // Step 5 Submit (Final Launch Campaign)
    await handleLaunchCampaign()
  }
}

// Pre-fill quick skills helper
function addQuickSkill(skill: string) {
  const current = wizardForm.value.requiredSkillsText.trim()
  const skillsList = current ? current.split(',').map((s) => s.trim()) : []
  if (!skillsList.includes(skill)) {
    skillsList.push(skill)
    wizardForm.value.requiredSkillsText = skillsList.join(', ')
    clearError('requiredSkillsText')
  }
}

// Auto-populate boilerplate job description template to help users
function populateDescriptionTemplate() {
  const title = wizardForm.value.jobTitle.trim() || 'Role'
  wizardForm.value.jobDescription = `We are looking for an exceptional ${title} to join our growing team.

About the Role:
As a ${title}, you will take full ownership of designing, building, and scaling our core features. You will collaborate closely with other product and engineering leads to deliver robust solutions.

Key Responsibilities:
- Design and build clean, scalable features
- Partner with product managers and designer teams to translate briefs to codebase
- Maintain high code quality, test coverage, and documentation

Requirements:
- Strong experience working in professional tech teams
- Solid understanding of required technology frameworks
- Great communication, problem-solving, and collaboration skills`
  clearError('jobDescription')
}

// Launch campaign: perform signup and save pending job payload in localStorage
async function handleLaunchCampaign() {
  if (loading.value) return
  loading.value = true

  try {
    // 1. Convert skills string to array
    const rawSkills = wizardForm.value.requiredSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // 2. Map experience bracket
    let minExp = 3
    let maxExp = 5
    if (wizardForm.value.experienceBracket === 'junior') {
      minExp = 1
      maxExp = 3
    } else if (wizardForm.value.experienceBracket === 'mid') {
      minExp = 3
      maxExp = 5
    } else if (wizardForm.value.experienceBracket === 'senior') {
      minExp = 5
      maxExp = 8
    } else if (wizardForm.value.experienceBracket === 'expert') {
      minExp = 8
      maxExp = 20
    }

    // 3. Assemble job campaign payload
    const jobPayload = {
      title: wizardForm.value.jobTitle.trim(),
      description: wizardForm.value.jobDescription.trim(),
      priority: 'normal',
      requiredSkills: rawSkills,
      minExperienceYears: minExp,
      maxExperienceYears: maxExp,
      salaryMinUzs: wizardForm.value.salaryMin,
      salaryMaxUzs: wizardForm.value.salaryMax,
      salaryCurrency: wizardForm.value.salaryCurrency,
      workMode: wizardForm.value.workMode,
      officeLocation: wizardForm.value.officeLocation.trim() || undefined,
      feePercentage: 15,
      feeBasis: 'annual',
      targetCandidatesCount: 5,
    }

    // 4. Assemble auth signup payload
    const signupPayload = {
      companyName: wizardForm.value.companyName.trim(),
      contactEmail: wizardForm.value.contactEmail.trim() || wizardForm.value.email.trim(),
      fullName: wizardForm.value.fullName.trim(),
      email: wizardForm.value.email.trim(),
      password: wizardForm.value.password,
    }

    // 5. Submit account creation to backend
    const api = useApi()
    await api.post('/api/v1/auth/signup', signupPayload)

    // 6. If signup is successful, cache the job payload in localStorage
    // When they verify email and log in, the dashboard will auto-create this campaign
    localStorage.setItem('pending_first_job', JSON.stringify(jobPayload))

    registeredEmail.value = wizardForm.value.email.trim()
    done.value = true
  } catch (e) {
    applyApiFieldErrors(e, (field, msg) => {
      // Map API fields back to our wizard fields
      if (field === 'email' || field === 'password' || field === 'fullName') {
        currentStep.value = 1
      } else if (field === 'companyName' || field === 'contactEmail') {
        currentStep.value = 2
      }
      errors.value[field] = msg
    })
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(e, 'Failed to complete registration.'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  if (resendLoading.value) return
  resendLoading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/resend-verification', { email: registeredEmail.value })
    toast.add({
      title: t('common.success'),
      description: t('auth.verificationResent'),
      color: 'success',
    })
  } catch {
    // API shows error toast automatically
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen lg:grid" style="grid-template-columns: 42% 1fr">
    <!-- ── Left brand panel (desktop only) ── -->
    <div
      class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style="background: #15140f; border-right: 1px solid #24221c"
    >
      <!-- Subtle grid texture -->
      <div
        class="absolute inset-0 pointer-events-none"
        style="
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        "
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style="
          background: radial-gradient(
            ellipse at 20% 80%,
            transparent 20%,
            rgba(26, 26, 26, 0.75) 80%
          );
        "
      />

      <!-- Logo -->
      <NuxtLink to="/" class="relative z-10">
        <span class="font-serif text-3xl font-normal" style="letter-spacing: -0.04em; color: white">
          my<em style="font-style: italic; color: var(--accent)">hr</em>
        </span>
      </NuxtLink>

      <!-- Middle: headline + features -->
      <div class="relative z-10">
        <p
          class="text-xs uppercase tracking-widest mb-6"
          style="color: rgba(255, 255, 255, 0.35); font-family: 'JetBrains Mono', monospace"
        >
          Employer Briefing Wizard
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Let us source your<br />
          <em style="font-style: italic; color: var(--accent)">ideal team</em>.
        </h2>

        <ul class="space-y-5">
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Brief us in 5 simple steps
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Define company profile, role specifications, and budget in minutes
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Immediate Campaign Auto-Launch
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Our AI searches our pre-screened pool and the open web automatically
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                15% Success Fee. No Hire, No Bill.
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                You pay only on signed offer. Zero software platform monthly charges.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Bottom: testimonial + copyright -->
      <div class="relative z-10 space-y-6">
        <div class="pl-4" style="border-left: 2px solid #2a2a27">
          <p class="text-sm italic leading-relaxed" style="color: rgba(255, 255, 255, 0.55)">
            "We hired our key Product Managers 3x faster using myHR. The pre-screened list is
            incredibly accurate."
          </p>
          <p class="text-xs mt-2" style="color: rgba(255, 255, 255, 0.35)">
            Head of Talent, Stripe
          </p>
        </div>
        <p
          class="text-xs"
          style="
            color: rgba(255, 255, 255, 0.2);
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.06em;
          "
        >
          © 2026 myhr
        </p>
      </div>
    </div>

    <!-- ── Right form panel ── -->
    <div
      class="flex flex-col items-center justify-center min-h-screen p-8 lg:p-12 relative"
      style="background: var(--bg-elevated)"
    >
      <!-- Floating Theme Toggle -->
      <button
        type="button"
        class="absolute top-6 right-6 p-2 rounded-full border border-line transition-all duration-200"
        style="background: var(--paper); color: var(--ink); cursor: pointer"
        :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
      >
        <UIcon
          :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
          style="width: 18px; height: 18px"
        />
      </button>

      <div class="w-full max-w-md flex-1 flex flex-col justify-center">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <h1
            class="font-serif text-4xl font-normal"
            style="letter-spacing: -0.04em; color: var(--ink-strong)"
          >
            my<em style="font-style: italic; color: var(--accent)">hr</em>
          </h1>
          <p
            class="mt-2 text-sm"
            style="
              color: var(--ink-muted);
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: 0.04em;
            "
          >
            Employer Briefing Wizard
          </p>
        </div>

        <!-- ── DONE STATE (EMAIL VERIFICATION SENT) ── -->
        <template v-if="done">
          <div class="text-center py-8">
            <div class="text-5xl mb-6">✉️</div>
            <h2
              class="font-serif text-2xl font-normal mb-3"
              style="color: var(--ink-strong); letter-spacing: -0.02em"
            >
              {{ t('auth.checkEmail') }}
            </h2>
            <p class="text-sm mb-6" style="color: var(--ink-muted)">
              Campaign locked & ready! Verify your email to activate AI sourcing. We sent a
              verification link to **{{ registeredEmail }}**.
            </p>
            <div class="flex flex-col items-center gap-3">
              <UButton
                variant="solid"
                color="primary"
                class="rounded-full px-6 py-2"
                :loading="resendLoading"
                @click="resendVerification"
              >
                {{ t('auth.resendVerification') }}
              </UButton>
              <NuxtLink
                to="/employer/login"
                class="hover:underline text-sm font-medium mt-2"
                style="color: var(--accent)"
              >
                {{ t('auth.backToLogin') }}
              </NuxtLink>
            </div>
          </div>
        </template>

        <!-- ── ONBOARDING WIZARD ── -->
        <template v-else>
          <!-- Progress Tracker Bar -->
          <div class="mb-8 flex items-center justify-between gap-1 select-none">
            <div v-for="s in 5" :key="s" class="flex-1 flex items-center">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold font-mono border transition-all duration-300"
                :style="{
                  background:
                    s === currentStep
                      ? 'var(--accent)'
                      : s < currentStep
                        ? 'var(--paper)'
                        : 'transparent',
                  borderColor: s <= currentStep ? 'var(--accent)' : 'var(--line)',
                  color:
                    s === currentStep
                      ? '#ffffff'
                      : s < currentStep
                        ? 'var(--accent)'
                        : 'var(--ink-subtle)',
                }"
              >
                {{ s }}
              </div>
              <div
                v-if="s < 5"
                class="flex-1 h-0.5 mx-2 transition-colors duration-300"
                :style="{ background: s < currentStep ? 'var(--accent)' : 'var(--line)' }"
              />
            </div>
          </div>

          <!-- Step Header Titles -->
          <div class="mb-7">
            <h2
              class="font-serif text-2xl font-normal mb-1.5"
              style="color: var(--ink-strong); letter-spacing: -0.02em"
            >
              <template v-if="currentStep === 1">Create Admin Account</template>
              <template v-if="currentStep === 2">Company Details</template>
              <template v-if="currentStep === 3">Target Role & Core Skills</template>
              <template v-if="currentStep === 4">Sourcing Specifications</template>
              <template v-if="currentStep === 5">Calibration & Campaign Launch</template>
            </h2>
            <p class="text-sm" style="color: var(--ink-muted)">
              <template v-if="currentStep === 1"
                >Step 1 of 5: Setup credentials for the employer portal</template
              >
              <template v-if="currentStep === 2"
                >Step 2 of 5: Establish the hiring company profile</template
              >
              <template v-if="currentStep === 3"
                >Step 3 of 5: Define the first position you need to hire</template
              >
              <template v-if="currentStep === 4"
                >Step 4 of 5: Outline candidate criteria and workspace options</template
              >
              <template v-if="currentStep === 5"
                >Step 5 of 5: Complete budget setup and launch campaign</template
              >
            </p>
          </div>

          <!-- STEP CONTENTS -->
          <div class="flex-1">
            <!-- ── STEP 1: Account ── -->
            <div v-if="currentStep === 1" class="space-y-4">
              <UFormField :label="t('auth.fullName')" :error="errors.fullName">
                <UInput
                  v-model="wizardForm.fullName"
                  placeholder="John Doe"
                  class="w-full"
                  @input="clearError('fullName')"
                />
              </UFormField>
              <UFormField :label="t('auth.email')" :error="errors.email">
                <UInput
                  v-model="wizardForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="you@company.com"
                  class="w-full"
                  @input="clearError('email')"
                />
              </UFormField>
              <UFormField :label="t('auth.password')" :error="errors.password">
                <UInput
                  v-model="wizardForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="w-full"
                  @input="clearError('password')"
                >
                  <template #trailing>
                    <button type="button" tabindex="-1" @click="showPassword = !showPassword">
                      <UIcon
                        :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                        class="w-4 h-4"
                        style="color: var(--ink-subtle)"
                      />
                    </button>
                  </template>
                </UInput>
                <template v-if="pwStrength > 0" #hint>
                  <div class="flex items-center gap-2 mt-1">
                    <div class="flex gap-1">
                      <div
                        v-for="i in 3"
                        :key="i"
                        class="h-1 w-8 rounded-full transition-colors"
                        :style="{ background: i <= pwStrength ? pwStrengthColor : 'var(--line)' }"
                      />
                    </div>
                    <span class="text-xs" :style="{ color: pwStrengthColor }">{{
                      pwStrengthLabel
                    }}</span>
                  </div>
                </template>
              </UFormField>
            </div>

            <!-- ── STEP 2: Company ── -->
            <div v-else-if="currentStep === 2" class="space-y-4">
              <UFormField :label="t('auth.companyName')" :error="errors.companyName">
                <UInput
                  v-model="wizardForm.companyName"
                  placeholder="Stripe, Inc."
                  class="w-full"
                  @input="clearError('companyName')"
                />
              </UFormField>
              <UFormField :label="t('auth.contactEmail')" :error="errors.contactEmail">
                <UInput
                  v-model="wizardForm.contactEmail"
                  type="email"
                  placeholder="billing@company.com (optional)"
                  class="w-full"
                  @input="clearError('contactEmail')"
                />
                <template #hint>
                  <span class="text-xs" style="color: var(--ink-subtle)">
                    Defaults to your admin login email if left blank.
                  </span>
                </template>
              </UFormField>
              <UFormField label="Company Website URL" :error="errors.website">
                <UInput
                  v-model="wizardForm.website"
                  placeholder="https://company.com"
                  class="w-full"
                />
                <template #hint>
                  <span class="text-xs" style="color: var(--ink-subtle)">
                    We'll extract logo and company summary dynamically.
                  </span>
                </template>
              </UFormField>
            </div>

            <!-- ── STEP 3: Job Title & Skills ── -->
            <div v-else-if="currentStep === 3" class="space-y-4">
              <UFormField label="Target Job Title" :error="errors.jobTitle">
                <UInput
                  v-model="wizardForm.jobTitle"
                  placeholder="Senior Product Manager"
                  class="w-full"
                  @input="clearError('jobTitle')"
                />
              </UFormField>

              <UFormField label="Required Sourcing Skills" :error="errors.requiredSkillsText">
                <UInput
                  v-model="wizardForm.requiredSkillsText"
                  placeholder="TypeScript, Vue.js, Node.js, SQL"
                  class="w-full"
                  @input="clearError('requiredSkillsText')"
                />
                <template #hint>
                  <span class="text-xs" style="color: var(--ink-subtle)">
                    List up to 10 comma-separated skills required to source.
                  </span>
                </template>
              </UFormField>

              <!-- Quick add suggestions -->
              <div>
                <p class="text-xs uppercase tracking-wider mb-2" style="color: var(--ink-subtle)">
                  Quick Add Tech Suggestions:
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="s in [
                      'TypeScript',
                      'Vue.js',
                      'React',
                      'Node.js',
                      'Python',
                      'Product Management',
                      'Figma',
                      'SQL',
                      'PostgreSQL',
                      'Golang',
                    ]"
                    :key="s"
                    type="button"
                    class="text-xs px-2.5 py-1 rounded-full border border-line transition-all duration-200 hover:border-accent text-ink"
                    style="background: var(--paper)"
                    @click="addQuickSkill(s)"
                  >
                    + {{ s }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ── STEP 4: Sourcing Specs ── -->
            <div v-else-if="currentStep === 4" class="space-y-4">
              <UFormField label="Job Specifications" :error="errors.jobDescription">
                <!-- Helper: pre-fill button -->
                <template #hint>
                  <div class="flex justify-between items-center mt-1">
                    <span class="text-xs" style="color: var(--ink-subtle)">
                      Provide a minimum of 50 characters of role specifications.
                    </span>
                    <button
                      type="button"
                      class="text-xs hover:underline"
                      style="color: var(--accent)"
                      @click="populateDescriptionTemplate"
                    >
                      ✨ Populate Template
                    </button>
                  </div>
                </template>
                <UTextarea
                  v-model="wizardForm.jobDescription"
                  placeholder="Describe key candidate deliverables and expectations..."
                  :rows="6"
                  class="w-full text-sm rounded-xl"
                  style="
                    background: var(--paper) !important;
                    border-color: var(--line) !important;
                    color: var(--ink-strong);
                  "
                  @input="clearError('jobDescription')"
                />
              </UFormField>

              <!-- Work Mode Cards -->
              <div>
                <span class="text-sm font-medium block mb-2" style="color: var(--ink)"
                  >Work Arrangement</span
                >
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="mode in ['office', 'hybrid', 'remote']"
                    :key="mode"
                    class="border rounded-xl p-3 text-center cursor-pointer select-none transition-all"
                    :style="{
                      background:
                        wizardForm.workMode === mode ? 'var(--accent-soft)' : 'var(--paper)',
                      borderColor: wizardForm.workMode === mode ? 'var(--accent)' : 'var(--line)',
                    }"
                    @click="wizardForm.workMode = mode as any"
                  >
                    <div
                      class="text-sm font-semibold mb-0.5 capitalize"
                      :style="{
                        color: wizardForm.workMode === mode ? 'var(--accent)' : 'var(--ink)',
                      }"
                    >
                      {{ mode }}
                    </div>
                    <div class="text-[10px]" style="color: var(--ink-muted)">
                      {{
                        mode === 'remote' ? 'Worldwide' : mode === 'hybrid' ? 'Flex split' : 'At HQ'
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Office Location (Only shown if Office/Hybrid) -->
              <UFormField
                v-if="wizardForm.workMode !== 'remote'"
                label="Office Location Address"
                :error="errors.officeLocation"
              >
                <UInput
                  v-model="wizardForm.officeLocation"
                  placeholder="e.g. Tashkent, Uzbekistan"
                  class="w-full"
                  @input="clearError('officeLocation')"
                />
              </UFormField>
            </div>

            <!-- ── STEP 5: Compensation & Launch ── -->
            <div v-else-if="currentStep === 5" class="space-y-4">
              <!-- Experience Level Bracket -->
              <div>
                <span class="text-sm font-medium block mb-2" style="color: var(--ink)"
                  >Experience Level Bracket</span
                >
                <div class="grid grid-cols-4 gap-2">
                  <div
                    v-for="b in [
                      { key: 'junior', label: 'Junior', yrs: '1-3 yrs' },
                      { key: 'mid', label: 'Mid-level', yrs: '3-5 yrs' },
                      { key: 'senior', label: 'Senior', yrs: '5-8 yrs' },
                      { key: 'expert', label: 'Expert', yrs: '8+ yrs' },
                    ]"
                    :key="b.key"
                    class="border rounded-xl p-3 text-center cursor-pointer select-none transition-all"
                    :style="{
                      background:
                        wizardForm.experienceBracket === b.key
                          ? 'var(--accent-soft)'
                          : 'var(--paper)',
                      borderColor:
                        wizardForm.experienceBracket === b.key ? 'var(--accent)' : 'var(--line)',
                    }"
                    @click="wizardForm.experienceBracket = b.key"
                  >
                    <div
                      class="text-sm font-semibold mb-0.5"
                      :style="{
                        color:
                          wizardForm.experienceBracket === b.key ? 'var(--accent)' : 'var(--ink)',
                      }"
                    >
                      {{ b.label }}
                    </div>
                    <div class="text-[10px]" style="color: var(--ink-muted)">
                      {{ b.yrs }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Currency and budget range -->
              <div>
                <span class="text-sm font-medium block mb-2" style="color: var(--ink)"
                  >Compensation Budget Target</span
                >
                <div class="grid grid-cols-12 gap-2 items-center">
                  <!-- Currency Select -->
                  <div class="col-span-3">
                    <USelect
                      v-model="wizardForm.salaryCurrency"
                      :options="[
                        { label: 'USD', value: 'USD' },
                        { label: 'UZS', value: 'UZS' },
                      ]"
                      size="lg"
                      class="w-full text-center"
                      style="
                        background: var(--paper) !important;
                        border-color: var(--line) !important;
                        color: var(--ink-strong);
                        border-radius: 12px;
                      "
                    />
                  </div>
                  <!-- Min Salary -->
                  <div class="col-span-4">
                    <UInput
                      v-model="wizardForm.salaryMin"
                      type="number"
                      placeholder="Min"
                      class="w-full"
                      @input="clearError('salaryMin')"
                    />
                  </div>
                  <div class="col-span-1 text-center text-xs" style="color: var(--ink-muted)">
                    to
                  </div>
                  <!-- Max Salary -->
                  <div class="col-span-4">
                    <UInput
                      v-model="wizardForm.salaryMax"
                      type="number"
                      placeholder="Max"
                      class="w-full"
                      @input="clearError('salaryMax')"
                    />
                  </div>
                </div>
              </div>

              <!-- Agency Agreement Summary Notice -->
              <div
                class="p-4 rounded-xl border border-dashed border-line mt-4"
                style="background: var(--bg-elevated)"
              >
                <div class="flex items-start gap-2.5">
                  <span class="text-lg" style="color: var(--accent)">✓</span>
                  <div>
                    <span class="text-xs font-semibold block" style="color: var(--ink-strong)"
                      >Standard Success Fee Agreement</span
                    >
                    <span
                      class="text-[11px] leading-relaxed block mt-1"
                      style="color: var(--ink-muted)"
                    >
                      By launching this campaign, you authorize myHR to search, reach out to, and
                      pre-screen candidates. You pay a standard 15% success fee on signed offer base
                      salary. No hire, no bill.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BUTTON NAVIGATION -->
          <div class="mt-8 flex gap-3">
            <!-- Back button -->
            <UButton
              v-if="currentStep > 1"
              type="button"
              variant="outline"
              size="xl"
              class="flex-1 rounded-full! transition-all"
              style="border-color: var(--line); color: var(--ink)"
              @click="goBack"
            >
              Back
            </UButton>

            <!-- Next / Launch Campaign button -->
            <UButton
              type="button"
              color="primary"
              size="xl"
              class="flex-1 rounded-full!"
              :loading="loading"
              :disabled="loading"
              @click="goNext"
            >
              <template v-if="currentStep < 5">Continue</template>
              <template v-else>Launch Campaign 🚀</template>
            </UButton>
          </div>

          <!-- Bottom account toggle link -->
          <div v-if="currentStep === 1" class="text-center mt-6">
            <p class="text-xs" style="color: var(--ink-subtle)">
              {{ t('auth.haveAccount') }}
              <NuxtLink
                to="/employer/login"
                class="hover:underline font-semibold"
                style="color: var(--accent)"
              >
                {{ t('auth.login') }}
              </NuxtLink>
            </p>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <footer class="text-center text-xs mt-8 pb-2" style="color: var(--ink-subtle)">
        <NuxtLink to="/terms" class="hover:underline transition-opacity hover:opacity-80"
          >Terms</NuxtLink
        >
        <span class="mx-2">·</span>
        <NuxtLink to="/privacy" class="hover:underline transition-opacity hover:opacity-80"
          >Privacy</NuxtLink
        >
        <span class="mx-2">·</span>
        <span>© 2026 myhr</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ── Dark/Light input overrides for Nuxt UI UInput ── */

/* Nuxt UI v4 — cover all known wrapper slot names */
:deep([data-slot='input-root']),
:deep([data-slot='base']),
:deep([data-slot='input']) {
  background: var(--paper) !important;
  border-color: var(--line) !important;
  border-radius: 12px !important;
}

/* Fallback: any relative wrapper containing an input (UInput renders this pattern) */
:deep(.relative:has(> input)) {
  background: var(--paper) !important;
  border-color: var(--line) !important;
  border-radius: 12px !important;
}

/* The actual input element */
:deep(input) {
  background: transparent !important;
  color: var(--ink-strong) !important;
}

:deep(input::placeholder) {
  color: var(--ink-subtle) !important;
}

/* Focus state */
:deep([data-slot='input-root']:focus-within),
:deep([data-slot='base']:focus-within),
:deep(.relative:has(> input:focus)) {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px var(--accent-soft) !important;
}

/* UFormField label */
:deep([data-slot='form-field-label']) {
  color: var(--ink) !important;
}

/* Error messages */
:deep([data-slot='form-field-error']) {
  color: #f87171 !important;
}

/* Hint slot (password strength) */
:deep([data-slot='form-field-hint']) {
  color: var(--ink-muted) !important;
}
</style>
