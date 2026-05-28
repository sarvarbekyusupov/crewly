<script setup lang="ts">
import { getFetchStatus } from '~/types/api-error'
definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const route = useRoute()
const mode = ref<'login' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'login')

const loginForm = reactive({ email: '', password: '' })
const signupForm = reactive({
  companyName: '',
  contactEmail: '',
  fullName: '',
  email: '',
  password: '',
})

const loading = ref(false)
const signupDone = ref(false)
const showResendVerification = ref(false)

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  showResendVerification.value = false
  try {
    await auth.login(loginForm.email, loginForm.password)
    router.push('/dashboard')
  } catch (e) {
    if (getFetchStatus(e) === 401) {
      const msg = extractApiErrorMessage(e, t('auth.invalidCredentials'))
      toast.add({ id: 'login-error', title: t('common.error'), description: msg, color: 'error' })
      if (msg.toLowerCase().includes('verify')) {
        showResendVerification.value = true
      }
    }
    // Non-401: useApi already showed toast
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  const api = useApi()
  try {
    await api.post('/api/v1/auth/resend-verification', { email: loginForm.email })
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

async function handleSignup() {
  if (loading.value) return
  loading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/signup', signupForm)
    signupDone.value = true
  } catch {
    // useApi handles error toast
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await auth.fetchMe()
  if (auth.isAuthenticated) router.push('/dashboard')
})
</script>

<template>
  <!-- Grid hero background -->
  <div class="grid-hero min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md" style="position: relative; z-index: 2">
      <div class="text-center mb-8">
        <h1
          class="font-serif text-4xl font-normal"
          style="letter-spacing: -0.04em; color: var(--ink)"
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
          {{ mode === 'login' ? t('auth.loginSubtitle') : t('auth.signupSubtitle') }}
        </p>
      </div>

      <div
        class="rounded-2xl p-6"
        style="
          background: var(--paper);
          border: 1px solid var(--line);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        "
      >
        <!-- Login form -->
        <template v-if="mode === 'login'">
          <h2
            class="font-serif text-xl font-normal mb-6"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.loginTitle') }}
          </h2>
          <form class="space-y-4" @submit.prevent="handleLogin">
            <UFormField :label="t('auth.email')" name="email">
              <UInput
                v-model="loginForm.email"
                type="email"
                required
                autocomplete="email"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('auth.password')" name="password">
              <UInput
                v-model="loginForm.password"
                type="password"
                required
                autocomplete="current-password"
                class="w-full"
              />
              <template #hint>
                <NuxtLink
                  to="/forgot-password"
                  class="text-xs hover:underline"
                  style="color: var(--ink-muted)"
                >
                  {{ t('auth.forgotPassword') }}
                </NuxtLink>
              </template>
            </UFormField>
            <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
              {{ t('auth.login') }}
            </UButton>
          </form>
          <div v-if="showResendVerification" class="mt-3 text-center">
            <button class="text-sm text-primary-600 hover:underline" @click="resendVerification">
              {{ t('auth.resendVerification') }}
            </button>
          </div>
          <p class="text-center text-sm mt-4" style="color: var(--ink-muted)">
            {{ t('auth.noAccount') }}
            <button class="text-primary-600 hover:underline ml-1" @click="mode = 'signup'">
              {{ t('auth.signup') }}
            </button>
          </p>
        </template>

        <!-- Signup form -->
        <template v-else>
          <template v-if="signupDone">
            <div class="text-center py-4">
              <div class="text-4xl mb-4">✉️</div>
              <h2
                class="font-serif text-xl font-normal mb-2"
                style="color: var(--ink); letter-spacing: -0.02em"
              >
                {{ t('auth.checkEmail') }}
              </h2>
              <p class="text-sm" style="color: var(--ink-muted)">{{ t('auth.verifyEmailSent') }}</p>
              <button
                class="text-primary-600 hover:underline text-sm mt-4"
                @click="
                  mode = 'login';
                  signupDone = false
                "
              >
                {{ t('auth.backToLogin') }}
              </button>
            </div>
          </template>
          <template v-else>
            <h2
              class="font-serif text-xl font-normal mb-6"
              style="color: var(--ink); letter-spacing: -0.02em"
            >
              {{ t('auth.signupTitle') }}
            </h2>
            <form class="space-y-4" @submit.prevent="handleSignup">
              <UFormField :label="t('auth.companyName')" name="companyName">
                <UInput v-model="signupForm.companyName" required class="w-full" />
              </UFormField>
              <UFormField :label="t('auth.contactEmail')" name="contactEmail">
                <UInput v-model="signupForm.contactEmail" type="email" required class="w-full" />
                <template #hint>
                  <span class="text-xs" style="color: var(--ink-subtle)">{{ t('auth.contactEmailHint') }}</span>
                </template>
              </UFormField>
              <UFormField :label="t('auth.fullName')" name="fullName">
                <UInput v-model="signupForm.fullName" required class="w-full" />
              </UFormField>
              <UFormField :label="t('auth.email')" name="email">
                <UInput
                  v-model="signupForm.email"
                  type="email"
                  required
                  autocomplete="email"
                  class="w-full"
                />
                <template #hint>
                  <span class="text-xs" style="color: var(--ink-subtle)">{{ t('auth.loginEmailHint') }}</span>
                </template>
              </UFormField>
              <UFormField :label="t('auth.password')" name="password">
                <UInput
                  v-model="signupForm.password"
                  type="password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  class="w-full"
                />
              </UFormField>
              <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
                {{ t('auth.signup') }}
              </UButton>
            </form>
            <p class="text-center text-sm mt-4" style="color: var(--ink-muted)">
              {{ t('auth.haveAccount') }}
              <button class="text-primary-600 hover:underline ml-1" @click="mode = 'login'">
                {{ t('auth.login') }}
              </button>
            </p>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-hero {
  position: relative;
  background: var(--bg);
}
.grid-hero::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 0;
}
.grid-hero::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 0%, var(--bg) 75%);
  pointer-events: none;
  z-index: 1;
}
</style>
