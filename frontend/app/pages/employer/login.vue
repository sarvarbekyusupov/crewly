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
      toast.add({ id: 'login-error', title: t('common.error'), description: t('auth.tooManyAttempts'), color: 'error' })
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
        toast.add({ id: 'login-error', title: t('common.error'), description: t('auth.invalidCredentials'), color: 'error' })
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
          HR Portal
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Recruit with<br>
          <em style="font-style: italic; color: var(--accent)">clarity</em>.
        </h2>
        <ul class="space-y-3">
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Post jobs and track every applicant
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Automate offers and invoicing
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255,255,255,0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Invite your team and collaborate
          </li>
        </ul>
      </div>

      <p
        class="relative z-10 text-xs"
        style="color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em"
      >
        my-hr / employers
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
            {{ t('auth.loginSubtitle') }}
          </p>
        </div>

        <h2
          class="font-serif text-2xl font-normal mb-8"
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
              placeholder="you@company.com"
              autofocus
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('auth.password')" :error="errors.password">
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
                  <UIcon :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" style="color: var(--ink-muted)" />
                </button>
              </template>
            </UInput>
            <template #hint>
              <NuxtLink to="/employer/forgot-password" class="text-xs hover:underline" style="color: var(--ink-muted)">
                {{ t('auth.forgotPassword') }}
              </NuxtLink>
            </template>
          </UFormField>
          <UButton type="submit" color="primary" block :loading="loading" :disabled="loading" class="mt-2">
            {{ t('auth.login') }}
          </UButton>
        </form>

        <div v-if="showResendVerification" class="mt-3 text-center">
          <UButton variant="link" size="sm" @click="resendVerification">
            {{ t('auth.resendVerification') }}
          </UButton>
        </div>

        <p class="text-center text-sm mt-5" style="color: var(--ink-muted)">
          {{ t('auth.noAccount') }}
          <NuxtLink to="/employer/signup" class="hover:underline ml-1 font-medium" style="color: var(--accent)">
            {{ t('auth.signup') }}
          </NuxtLink>
        </p>

      </div>
    </div>
  </div>
</template>
