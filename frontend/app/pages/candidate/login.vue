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
      toast.add({ id: 'c-login-err', title: t('common.error'), description: t('auth.tooManyAttempts'), color: 'error' })
    } else if (status === 401) {
      const raw = extractApiErrorMessage(e, '')
      if (raw.includes('No account found')) loginSetFieldError('email', t('auth.emailNotFound'))
      else if (raw.includes('Incorrect password')) loginSetFieldError('password', t('auth.incorrectPassword'))
      else toast.add({ id: 'c-login-err', title: t('common.error'), description: t('auth.invalidCredentials'), color: 'error' })
    } else {
      toast.add({ id: 'c-login-err', title: t('common.error'), description: t('auth.invalidCredentials'), color: 'error' })
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
    const msg = extractApiErrorMessage(e, t('auth.signupError'))
    toast.add({ id: 'c-signup-err', title: t('common.error'), description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen lg:grid lg:grid-cols-2">

    <!-- Left brand panel (desktop only) -->
    <div
      class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style="background: var(--ink)"
    >
      <div
        class="absolute inset-0 pointer-events-none"
        style="background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 32px 32px;"
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse at 20% 80%, transparent 20%, rgba(26,26,26,0.75) 80%)"
      />

      <NuxtLink to="/" class="relative z-10">
        <span class="font-serif text-3xl font-normal" style="letter-spacing: -0.04em; color: white">
          my<em style="font-style: italic; color: var(--accent)">hr</em>
        </span>
      </NuxtLink>

      <div class="relative z-10">
        <p
          class="text-xs uppercase tracking-widest mb-6"
          style="color: rgba(255,255,255,0.35); font-family: 'JetBrains Mono', monospace"
        >
          {{ t('auth.candidateSubtitle') }}
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Your next role<br>
          <em style="font-style: italic; color: var(--accent)">is here</em>.
        </h2>
        <ul class="space-y-3">
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Track all your applications in one place
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            See your status in real time
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Sign in with Google in seconds
          </li>
        </ul>
      </div>

      <p
        class="relative z-10 text-xs"
        style="color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em"
      >
        my-hr / candidates
      </p>
    </div>

    <!-- Right form panel -->
    <div
      class="flex items-center justify-center min-h-screen p-8 lg:p-12"
      style="background: var(--paper)"
    >
      <div class="w-full max-w-sm">

        <!-- Logo: mobile only -->
        <div class="lg:hidden text-center mb-8">
          <h1
            class="font-serif text-4xl font-normal"
            style="letter-spacing: -0.04em; color: var(--ink)"
          >
            my<em style="font-style: italic; color: var(--accent)">hr</em>
          </h1>
          <p
            class="mt-2 text-sm"
            style="color: var(--ink-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em"
          >
            {{ t('auth.candidateSubtitle') }}
          </p>
        </div>

        <h2
          class="font-serif text-2xl font-normal mb-8"
          style="color: var(--ink); letter-spacing: -0.02em"
        >
          {{ mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle') }}
        </h2>

        <button
          class="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium transition-all hover:opacity-90 active:scale-[0.98] mb-4"
          style="background: var(--ink); color: var(--paper); border: none; cursor: pointer"
          @click="store.initiateGoogleLogin()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {{ t('auth.continueWithGoogle') }}
        </button>

        <div class="flex items-center gap-3 my-5">
          <div style="flex: 1; height: 1px; background: var(--line)" />
          <span
            class="text-xs"
            style="color: var(--ink-muted); font-family: 'JetBrains Mono', monospace"
          >{{ t('common.or') }}</span>
          <div style="flex: 1; height: 1px; background: var(--line)" />
        </div>

        <template v-if="mode === 'login'">
          <form class="space-y-4" @submit.prevent="onLogin">
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
            <UFormField :label="t('auth.password')" :error="loginErrors.password">
              <UInput
                v-model="loginPassword"
                v-bind="loginPasswordProps"
                :type="showLoginPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full"
              >
                <template #trailing>
                  <button type="button" tabindex="-1" @click="showLoginPassword = !showLoginPassword">
                    <UIcon :name="showLoginPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" style="color: var(--ink-muted)" />
                  </button>
                </template>
              </UInput>
            </UFormField>
            <UButton type="submit" color="primary" block :loading="loading" :disabled="loading" class="mt-2">
              {{ t('auth.login') }}
            </UButton>
          </form>
          <p class="text-center text-sm mt-5" style="color: var(--ink-muted)">
            {{ t('auth.noAccount') }}
            <button class="hover:underline ml-1 font-medium" style="color: var(--accent)" @click="mode = 'signup'">
              {{ t('auth.signup') }}
            </button>
          </p>
        </template>

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
                  <button type="button" tabindex="-1" @click="showSignupPassword = !showSignupPassword">
                    <UIcon :name="showSignupPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" style="color: var(--ink-muted)" />
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
                      :style="{ background: i <= signupPasswordStrength ? strengthColor : 'var(--line)' }"
                    />
                  </div>
                  <span class="text-xs" :style="{ color: strengthColor }">{{ strengthLabel }}</span>
                </div>
              </template>
            </UFormField>
            <UButton type="submit" color="primary" block :loading="loading" :disabled="loading" class="mt-2">
              {{ t('auth.createAccount') }}
            </UButton>
          </form>
          <p class="text-center text-sm mt-5" style="color: var(--ink-muted)">
            {{ t('auth.haveAccount') }}
            <button class="hover:underline ml-1 font-medium" style="color: var(--accent)" @click="mode = 'login'">
              {{ t('auth.login') }}
            </button>
          </p>
          <p class="text-center text-xs mt-4" style="color: var(--ink-muted)">
            {{ t('auth.tosPrefix') }}
            <NuxtLink to="/terms" class="hover:underline" style="color: var(--ink-muted)">{{ t('auth.tosLink') }}</NuxtLink>.
          </p>
        </template>

      </div>
    </div>
  </div>
</template>
