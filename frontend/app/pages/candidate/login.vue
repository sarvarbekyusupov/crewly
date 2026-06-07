<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema, candidateSignupSchema } from '~/schemas/auth'
import { getFetchStatus } from '~/types/api-error'

definePageMeta({ layout: 'empty', auth: 'guest' })

const { t } = useI18n()
const store = useCandidateAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const colorMode = useColorMode()

const mode = ref<'login' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'login')
const loading = ref(false)
const showLoginPassword = ref(false)
const showSignupPassword = ref(false)

const {
  errors: loginErrors,
  handleSubmit: loginHandleSubmit,
  defineField: loginDefineField,
  setFieldError: loginSetFieldError,
} = useForm({ validationSchema: toTypedSchema(loginSchema) })

const [loginEmail, loginEmailProps] = loginDefineField('email')
const [loginPassword, loginPasswordProps] = loginDefineField('password')

const {
  errors: signupErrors,
  handleSubmit: signupHandleSubmit,
  defineField: signupDefineField,
  setFieldError: signupSetFieldError,
} = useForm({ validationSchema: toTypedSchema(candidateSignupSchema) })

const [signupFullName, signupFullNameProps] = signupDefineField('fullName')
const [signupEmail, signupEmailProps] = signupDefineField('email')
const [signupPassword, signupPasswordProps] = signupDefineField('password')

const onLogin = loginHandleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    await store.login(values.email, values.password)
    router.push('/candidate/dashboard')
  } catch (e) {
    const status = getFetchStatus(e)
    if (status === 429) {
      toast.add({
        id: 'c-login-err',
        title: t('common.error'),
        description: t('auth.tooManyAttempts'),
        color: 'error',
      })
    } else if (status === 401) {
      const raw = extractApiErrorMessage(e, '')
      if (raw.includes('No account found')) loginSetFieldError('email', t('auth.emailNotFound'))
      else if (raw.includes('Incorrect password'))
        loginSetFieldError('password', t('auth.incorrectPassword'))
      else
        toast.add({
          id: 'c-login-err',
          title: t('common.error'),
          description: t('auth.invalidCredentials'),
          color: 'error',
        })
    } else {
      toast.add({
        id: 'c-login-err',
        title: t('common.error'),
        description: t('auth.invalidCredentials'),
        color: 'error',
      })
    }
  } finally {
    loading.value = false
  }
})

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

const signupPasswordStrength = computed(() => passwordStrength(signupPassword.value))

const strengthLabel = computed(() => {
  if (signupPasswordStrength.value === 1) return t('auth.passwordWeak')
  if (signupPasswordStrength.value === 2) return t('auth.passwordMedium')
  if (signupPasswordStrength.value === 3) return t('auth.passwordStrong')
  return ''
})

const strengthColor = computed(() => {
  if (signupPasswordStrength.value === 1) return 'var(--color-red-500)'
  if (signupPasswordStrength.value === 2) return 'var(--color-amber-400)'
  if (signupPasswordStrength.value === 3) return 'var(--color-green-500)'
  return 'var(--line)'
})

const onSignup = signupHandleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    await store.signup(values.email, values.password, values.fullName || undefined)
    router.push('/candidate/dashboard')
  } catch (e) {
    applyApiFieldErrors(e, signupSetFieldError)
    toast.add({
      id: 'c-signup-err',
      title: t('common.error'),
      description: extractApiErrorMessage(e, t('auth.signupError')),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
})
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
          {{ t('auth.candidateSubtitle') }}
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Your next role<br />
          <em style="font-style: italic; color: var(--accent)">is here</em>.
        </h2>

        <ul class="space-y-5">
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Track all your applications in one place
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                One dashboard for every role you've applied to
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                See your status in real time
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Know exactly where you stand at every stage
              </p>
            </div>
          </li>
          <li class="flex gap-3 items-start">
            <span style="color: var(--accent); flex-shrink: 0; margin-top: 2px">✓</span>
            <div>
              <p class="text-sm font-medium" style="color: rgba(255, 255, 255, 0.85)">
                Sign in with Google in seconds
              </p>
              <p class="text-sm mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                No passwords needed — just your Google account
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Bottom: testimonial + copyright -->
      <div class="relative z-10 space-y-6">
        <div class="pl-4" style="border-left: 2px solid #2a2a27">
          <p class="text-sm italic leading-relaxed" style="color: rgba(255, 255, 255, 0.55)">
            "Track my applications seamlessly. Best job portal I've used."
          </p>
          <p class="text-xs mt-2" style="color: rgba(255, 255, 255, 0.35)">
            A. Johnson, Software Engineer
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
            {{ t('auth.candidateSubtitle') }}
          </p>
        </div>

        <!-- Heading + subtitle -->
        <h2
          class="font-serif text-2xl font-normal mb-1.5"
          style="color: var(--ink-strong); letter-spacing: -0.02em"
        >
          {{ mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle') }}
        </h2>
        <p class="text-sm mb-7" style="color: var(--ink-muted)">
          {{ mode === 'login' ? 'Log in to your Crewly account' : 'Create your Crewly account' }}
        </p>

        <!-- ── LOGIN MODE ── -->
        <template v-if="mode === 'login'">
          <form class="space-y-4" @submit.prevent="onLogin">
            <!-- Email -->
            <UFormField :label="t('auth.email')" :error="loginErrors.email">
              <UInput
                v-model="loginEmail"
                v-bind="loginEmailProps"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
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
                  to="/candidate/forgot-password"
                  class="text-xs transition-opacity hover:opacity-80"
                  style="color: var(--ink-muted)"
                  >Forgot password?</NuxtLink
                >
              </div>
              <UFormField :error="loginErrors.password">
                <UInput
                  v-model="loginPassword"
                  v-bind="loginPasswordProps"
                  :type="showLoginPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full"
                >
                  <template #trailing>
                    <button
                      type="button"
                      tabindex="-1"
                      @click="showLoginPassword = !showLoginPassword"
                    >
                      <UIcon
                        :name="showLoginPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
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

          <!-- or divider -->
          <div class="flex items-center gap-3 my-5">
            <div style="flex: 1; height: 1px; background: var(--line)" />
            <span class="text-xs" style="color: var(--ink-subtle)">{{ t('common.or') }}</span>
            <div style="flex: 1; height: 1px; background: var(--line)" />
          </div>

          <!-- Google button — outlined pill -->
          <button
            class="w-full flex items-center justify-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all hover:bg-bg-deep active:scale-[0.98] mb-5 border border-line"
            style="background: transparent; color: var(--ink-strong); cursor: pointer"
            @click="store.initiateGoogleLogin()"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Log in with Google
          </button>

          <!-- Don't have account divider -->
          <div class="flex items-center gap-3 mb-4">
            <div style="flex: 1; height: 1px; background: var(--line)" />
            <span class="text-xs whitespace-nowrap" style="color: var(--ink-subtle)">
              {{ t('auth.noAccount') }}
            </span>
            <div style="flex: 1; height: 1px; background: var(--line)" />
          </div>

          <!-- Sign up outlined pill -->
          <button
            class="w-full rounded-full px-4 py-3 text-sm font-medium transition-all mb-4 border border-line hover:bg-bg-deep"
            style="background: transparent; color: var(--ink); cursor: pointer"
            @click="mode = 'signup'"
          >
            {{ t('auth.signup') }}
          </button>
        </template>

        <!-- ── SIGNUP MODE ── -->
        <template v-else>
          <form class="space-y-4" @submit.prevent="onSignup">
            <UFormField :label="t('auth.fullName')" :error="signupErrors.fullName">
              <UInput
                v-model="signupFullName"
                v-bind="signupFullNameProps"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('auth.email')" :error="signupErrors.email">
              <UInput
                v-model="signupEmail"
                v-bind="signupEmailProps"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('auth.password')" :error="signupErrors.password">
              <UInput
                v-model="signupPassword"
                v-bind="signupPasswordProps"
                :type="showSignupPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full"
              >
                <template #trailing>
                  <button
                    type="button"
                    tabindex="-1"
                    @click="showSignupPassword = !showSignupPassword"
                  >
                    <UIcon
                      :name="showSignupPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                      class="w-4 h-4"
                      style="color: var(--ink-subtle)"
                    />
                  </button>
                </template>
              </UInput>
              <template v-if="signupPasswordStrength > 0" #hint>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex gap-1">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="h-1 w-8 rounded-full transition-colors"
                      :style="{
                        background: i <= signupPasswordStrength ? strengthColor : 'var(--line)',
                      }"
                    />
                  </div>
                  <span class="text-xs" :style="{ color: strengthColor }">{{ strengthLabel }}</span>
                </div>
              </template>
            </UFormField>

            <UButton
              type="submit"
              color="primary"
              block
              size="xl"
              :loading="loading"
              :disabled="loading"
              class="rounded-full! mt-2"
            >
              {{ t('auth.createAccount') }}
            </UButton>
          </form>

          <!-- or divider -->
          <div class="flex items-center gap-3 my-5">
            <div style="flex: 1; height: 1px; background: var(--line)" />
            <span class="text-xs" style="color: var(--ink-subtle)">{{ t('common.or') }}</span>
            <div style="flex: 1; height: 1px; background: var(--line)" />
          </div>

          <!-- Google button -->
          <button
            class="w-full flex items-center justify-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all hover:bg-bg-deep active:scale-[0.98] mb-5 border border-line"
            style="background: transparent; color: var(--ink-strong); cursor: pointer"
            @click="store.initiateGoogleLogin()"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {{ t('auth.continueWithGoogle') }}
          </button>

          <!-- Have account divider + login button -->
          <div class="flex items-center gap-3 mb-4">
            <div style="flex: 1; height: 1px; background: var(--line)" />
            <span class="text-xs whitespace-nowrap" style="color: var(--ink-subtle)">
              {{ t('auth.haveAccount') }}
            </span>
            <div style="flex: 1; height: 1px; background: var(--line)" />
          </div>

          <button
            class="w-full rounded-full px-4 py-3 text-sm font-medium transition-all mb-4 border border-line hover:bg-bg-deep"
            style="background: transparent; color: var(--ink); cursor: pointer"
            @click="mode = 'login'"
          >
            {{ t('auth.login') }}
          </button>

          <p class="text-center text-xs" style="color: var(--ink-subtle)">
            {{ t('auth.tosPrefix') }}
            <NuxtLink to="/terms" class="hover:underline text-ink-subtle">{{
              t('auth.tosLink')
            }}</NuxtLink
            >.
          </p>
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
        <span>© 2026 Crewly</span>
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
