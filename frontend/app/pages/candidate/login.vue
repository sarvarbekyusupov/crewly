<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema, candidateSignupSchema } from '~/schemas/auth'

definePageMeta({ layout: 'empty', auth: false })

const store = useCandidateAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const mode = ref<'login' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'login')
const loading = ref(false)

const {
  errors: loginErrors,
  handleSubmit: loginHandleSubmit,
  defineField: loginDefineField,
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
    const msg = extractApiErrorMessage(e, 'Invalid credentials')
    toast.add({ id: 'c-login-err', title: 'Error', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
})

const onSignup = signupHandleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    await store.signup(values.email, values.password, values.fullName || undefined)
    router.push('/candidate/dashboard')
  } catch (e) {
    const msg = extractApiErrorMessage(e, 'Could not create account')
    toast.add({ id: 'c-signup-err', title: 'Error', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
})

onMounted(async () => {
  await store.fetchMe()
  if (store.isAuthenticated) router.push('/candidate/dashboard')
})
</script>

<template>
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
          Job Seeker Portal
        </p>
      </div>

      <div
        class="rounded-2xl p-8"
        style="
          background: var(--paper);
          border: 1px solid var(--line);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        "
      >
        <h2
          class="font-serif text-xl font-normal mb-6"
          style="color: var(--ink); letter-spacing: -0.02em"
        >
          {{ mode === 'login' ? 'Sign in to your account' : 'Create your account' }}
        </h2>

        <button
          class="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium transition-all hover:opacity-90 active:scale-[0.98] mb-4"
          style="background: var(--ink); color: var(--paper); border: none; cursor: pointer"
          @click="store.initiateGoogleLogin()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
          Continue with Google
        </button>

        <div class="flex items-center gap-3 my-5">
          <div style="flex: 1; height: 1px; background: var(--line)"></div>
          <span
            class="text-xs"
            style="color: var(--ink-muted); font-family: 'JetBrains Mono', monospace"
            >or</span
          >
          <div style="flex: 1; height: 1px; background: var(--line)"></div>
        </div>

        <template v-if="mode === 'login'">
          <form class="space-y-4" @submit.prevent="onLogin">
            <UFormField label="Email" :error="loginErrors.email">
              <UInput
                v-model="loginEmail"
                v-bind="loginEmailProps"
                type="email"
                autocomplete="email"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Password" :error="loginErrors.password">
              <UInput
                v-model="loginPassword"
                v-bind="loginPasswordProps"
                type="password"
                autocomplete="current-password"
                class="w-full"
              />
            </UFormField>
            <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
              Sign in
            </UButton>
          </form>
          <p class="text-center text-sm mt-4" style="color: var(--ink-muted)">
            No account?
            <button
              class="hover:underline ml-1"
              style="color: var(--accent)"
              @click="mode = 'signup'"
            >
              Create one
            </button>
          </p>
        </template>

        <template v-else>
          <form class="space-y-4" @submit.prevent="onSignup">
            <UFormField label="Full name" :error="signupErrors.fullName">
              <UInput
                v-model="signupFullName"
                v-bind="signupFullNameProps"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Email" :error="signupErrors.email">
              <UInput
                v-model="signupEmail"
                v-bind="signupEmailProps"
                type="email"
                autocomplete="email"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Password" :error="signupErrors.password">
              <UInput
                v-model="signupPassword"
                v-bind="signupPasswordProps"
                type="password"
                autocomplete="new-password"
                class="w-full"
              />
            </UFormField>
            <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
              Create account
            </UButton>
          </form>
          <p class="text-center text-sm mt-4" style="color: var(--ink-muted)">
            Already have an account?
            <button
              class="hover:underline ml-1"
              style="color: var(--accent)"
              @click="mode = 'login'"
            >
              Sign in
            </button>
          </p>
        </template>

        <p class="text-center text-xs mt-6" style="color: var(--ink-muted)">
          By signing in you agree to our
          <NuxtLink to="/terms" class="hover:underline" style="color: var(--ink-muted)"
            >Terms of Service</NuxtLink
          >.
        </p>
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
