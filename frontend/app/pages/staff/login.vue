<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema } from '~/schemas/auth'
import { getFetchStatus } from '~/types/api-error'

definePageMeta({ layout: 'empty', auth: 'guest' })

const staffStore = useStaffStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const showPassword = ref(false)

const { errors, handleSubmit, defineField, setFieldError } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '' },
})

const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')

const handleLogin = handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    await staffStore.login(values.email, values.password)
    router.push('/staff/dashboard')
  } catch (e) {
    const status = getFetchStatus(e)
    if (status === 429) {
      toast.add({ title: t('common.error'), description: t('auth.tooManyAttempts'), color: 'error' })
    } else if (status === 401) {
      const raw = extractApiErrorMessage(e, '')
      if (raw.includes('No account found')) setFieldError('email', t('auth.emailNotFound'))
      else if (raw.includes('Incorrect password')) setFieldError('password', t('auth.incorrectPassword'))
      else toast.add({ title: t('common.error'), description: t('auth.invalidCredentials'), color: 'error' })
    } else {
      toast.add({ title: t('common.error'), description: extractApiErrorMessage(e, t('auth.invalidCredentials')), color: 'error' })
    }
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
          Staff Portal
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight"
          style="color: white; letter-spacing: -0.03em"
        >
          Internal<br>
          <em style="font-style: italic; color: var(--accent)">operations</em>.
        </h2>
      </div>

      <p
        class="relative z-10 text-xs"
        style="color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em"
      >
        my-hr / staff
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
          <p
            class="text-xs uppercase tracking-widest mb-2"
            style="color: var(--ink-subtle); font-family: 'JetBrains Mono', monospace"
          >
            Staff Portal
          </p>
          <h1
            class="font-serif text-4xl font-normal"
            style="letter-spacing: -0.04em; color: var(--ink)"
          >
            my<em style="font-style: italic; color: var(--accent)">hr</em>
          </h1>
        </div>

        <h2
          class="font-serif text-2xl font-normal mb-8"
          style="color: var(--ink); letter-spacing: -0.02em"
        >
          Staff login
        </h2>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <UFormField label="Email" :error="errors.email">
            <UInput
              v-model="email"
              v-bind="emailProps"
              type="email"
              autocomplete="email"
              placeholder="you@my-hr.com"
              autofocus
              class="w-full"
            />
          </UFormField>
          <UFormField label="Password" :error="errors.password">
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
          </UFormField>
          <UButton type="submit" color="primary" block :loading="loading" :disabled="loading" class="mt-2">
            Login
          </UButton>
        </form>

        <p class="text-center text-sm mt-5">
          <NuxtLink to="/employer/login" class="hover:underline text-sm" style="color: var(--ink-muted)">
            ← Client portal
          </NuxtLink>
        </p>

      </div>
    </div>
  </div>
</template>
