<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema } from '~/schemas/auth'
import { getFetchStatus } from '~/types/api-error'

definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const showResendVerification = ref(false)

const { errors, handleSubmit, defineField } = useForm({
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
    if (getFetchStatus(e) === 401) {
      const msg = extractApiErrorMessage(e, t('auth.invalidCredentials'))
      toast.add({ id: 'login-error', title: t('common.error'), description: msg, color: 'error' })
      if (msg.toLowerCase().includes('verify')) showResendVerification.value = true
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

onMounted(async () => {
  await auth.fetchMe()
  if (auth.isAuthenticated) router.push('/employer/dashboard')
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
          {{ t('auth.loginSubtitle') }}
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
        <h2
          class="font-serif text-xl font-normal mb-6"
          style="color: var(--ink); letter-spacing: -0.02em"
        >
          {{ t('auth.loginTitle') }}
        </h2>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <UFormField :label="t('auth.email')" :error="errors.email">
            <UInput
              v-model="email"
              v-bind="emailProps"
              type="email"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('auth.password')" :error="errors.password">
            <UInput
              v-model="password"
              v-bind="passwordProps"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
            <template #hint>
              <NuxtLink
                to="/employer/forgot-password"
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
          <NuxtLink to="/employer/signup" class="text-primary-600 hover:underline ml-1">
            {{ t('auth.signup') }}
          </NuxtLink>
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
