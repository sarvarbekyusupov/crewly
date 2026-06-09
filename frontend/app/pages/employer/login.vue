<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema } from '~/schemas/auth'
import { getFetchStatus } from '~/types/api-error'

definePageMeta({ layout: 'empty', auth: 'guest' })

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const colorMode = useColorMode()

const loading = ref(false)
const showResendVerification = ref(false)
const showPassword = ref(false)

const { errors, handleSubmit, defineField, setFieldError } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: {
    email: '',
    password: '',
  },
})

const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')

const handleLogin = handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  showResendVerification.value = false
  try {
    await auth.login(values.email, values.password)
    router.push('/employer/dashboard')
  } catch (e) {
    const status = getFetchStatus(e)
    if (status === 429) {
      toast.add({
        id: 'login-error',
        title: t('common.error'),
        description: t('auth.tooManyAttempts'),
        color: 'error',
      })
    } else if (status === 401) {
      const raw = extractApiErrorMessage(e, '')
      if (raw.includes('No account found')) {
        setFieldError('email', t('auth.emailNotFound'))
      } else if (raw.includes('Incorrect password')) {
        setFieldError('password', t('auth.incorrectPassword'))
      } else if (raw.includes('verify')) {
        toast.add({ id: 'login-error', title: t('common.error'), description: raw, color: 'error' })
        showResendVerification.value = true
      } else {
        toast.add({
          id: 'login-error',
          title: t('common.error'),
          description: t('auth.invalidCredentials'),
          color: 'error',
        })
      }
    }
  } finally {
    loading.value = false
  }
})

async function resendVerification() {
  const api = useApi()
  try {
    await api.post('/api/v1/auth/resend-verification', { email: email.value })
    toast.add({
      title: t('common.success'),
      description: t('auth.verificationResent'),
      color: 'success',
    })
    showResendVerification.value = false
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}
</script>

<template>
  <div class="min-h-screen lg:grid" style="grid-template-columns: 42% 1fr">
    <!-- ── Left brand panel (desktop only) ── -->
    <div
      class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style="background: #0c0d0f; border-right: 1px solid #242630"
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
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          style="height: 24px; width: auto; display: block"
        />
      </NuxtLink>

      <!-- Middle: headline + features -->
      <div class="relative z-10">
        <p
          class="text-xs uppercase tracking-widest mb-6"
          style="color: rgba(255, 255, 255, 0.35); font-family: 'JetBrains Mono', monospace"
        >
          HR Portal
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Recruit with<br />
          <em style="font-style: italic; color: var(--accent)">clarity</em>.
        </h2>

        <ul class="space-y-5">
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Post jobs and track every applicant
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Manage your talent funnel end-to-end
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Automate offers and invoicing
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Seamless onboarding and professional workflows
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Invite your team and collaborate
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Unified workspace for hiring managers and recruiters
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Bottom: testimonial + copyright -->
      <div class="relative z-10 space-y-6">
        <div class="pl-4" style="border-left: 2px solid #2a2a27">
          <p class="text-sm italic leading-relaxed" style="color: rgba(255, 255, 255, 0.55)">
            "We hired our key Product Managers 3x faster using Crewly. The pre-screened list is
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
          © 2026 Crewly
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

      <div class="w-full max-w-sm flex-1 flex flex-col justify-center">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <img
            class="block dark:hidden"
            src="/crewly-logo-horizontal.svg"
            alt="Crewly"
            style="height: 26px; width: auto"
          />
          <img
            class="hidden dark:block"
            src="/crewly-logo-horizontal-white.svg"
            alt="Crewly"
            style="height: 26px; width: auto"
          />
          <p
            class="mt-2 text-sm"
            style="
              color: var(--ink-muted);
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: 0.04em;
            "
          >
            {{ t('auth.loginSubtitle') }}
          </p>
        </div>

        <!-- Heading + subtitle -->
        <h2
          class="font-serif text-2xl font-normal mb-1.5"
          style="color: var(--ink-strong); letter-spacing: -0.02em"
        >
          {{ t('auth.loginTitle') }}
        </h2>
        <p class="text-sm mb-7" style="color: var(--ink-muted)">
          Log in to your Crewly employer portal
        </p>

        <!-- ── LOGIN FORM ── -->
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Email -->
          <UFormField :label="t('auth.email')" :error="errors.email">
            <UInput
              v-model="email"
              v-bind="emailProps"
              type="email"
              autocomplete="email"
              placeholder="you@company.com"
              autofocus
              class="w-full"
            />
          </UFormField>

          <!-- Password + forgot password -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-medium" style="color: var(--ink)">{{
                t('auth.password')
              }}</span>
              <NuxtLink
                to="/employer/forgot-password"
                class="text-xs transition-opacity hover:opacity-80"
                style="color: var(--ink-muted)"
              >
                {{ t('auth.forgotPassword') }}
              </NuxtLink>
            </div>
            <UFormField :error="errors.password">
              <UInput
                v-model="password"
                v-bind="passwordProps"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full"
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
            </UFormField>
          </div>

          <!-- Login button -->
          <UButton
            type="submit"
            color="primary"
            block
            size="xl"
            :loading="loading"
            :disabled="loading"
            class="rounded-full! mt-2"
          >
            {{ t('auth.login') }}
          </UButton>
        </form>

        <!-- Verification link fallback -->
        <div v-if="showResendVerification" class="mt-3 text-center">
          <UButton variant="link" size="sm" @click="resendVerification">
            {{ t('auth.resendVerification') }}
          </UButton>
        </div>

        <!-- Don't have account divider -->
        <div class="flex items-center gap-3 my-5">
          <div style="flex: 1; height: 1px; background: var(--line)" />
          <span class="text-xs whitespace-nowrap" style="color: var(--ink-subtle)">
            {{ t('auth.noAccount') }}
          </span>
          <div style="flex: 1; height: 1px; background: var(--line)" />
        </div>

        <!-- Sign up outlined pill -->
        <NuxtLink
          to="/employer/signup"
          class="w-full rounded-full px-4 py-3 text-sm font-medium transition-all inline-flex items-center justify-center text-center border border-line hover:bg-bg-deep text-ink"
          style="text-decoration: none; cursor: pointer"
        >
          {{ t('auth.signup') }}
        </NuxtLink>
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
        <span>© 2026 Crewly</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ── Dark/Light input overrides for Nuxt UI UInput ── */

/* Nuxt UI v4 — input wrappers only (not UButton which also has data-slot=base) */
:deep([data-slot='input-root']),
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
