<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { signupSchema } from '~/schemas/auth'

definePageMeta({ layout: 'empty', auth: 'guest' })

const { t } = useI18n()
const toast = useToast()
const loading = ref(false)
const resendLoading = ref(false)
const done = ref(false)
const showPassword = ref(false)
const registeredEmail = ref('')

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: toTypedSchema(signupSchema),
})

const [companyName, companyNameProps] = defineField('companyName')
const [contactEmail, contactEmailProps] = defineField('contactEmail')
const [fullName, fullNameProps] = defineField('fullName')
const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')

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

const pwStrength = computed(() => passwordStrength(password.value))
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
  return 'var(--line)'
})

const onSubmit = handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/signup', values)
    registeredEmail.value = values.email
    done.value = true
  } catch {
    // useApi shows error toast
  } finally {
    loading.value = false
  }
})

async function resendVerification() {
  if (resendLoading.value) return
  resendLoading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/resend-verification', { email: registeredEmail.value })
    toast.add({ title: t('common.success'), description: t('auth.verificationResent'), color: 'success' })
  } catch {
    // useApi shows error toast
  } finally {
    resendLoading.value = false
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
      <div class="w-full max-w-md">

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
            {{ t('auth.signupSubtitle') }}
          </p>
        </div>

        <template v-if="done">
          <div class="text-center py-8">
            <div class="text-5xl mb-6">✉️</div>
            <h2
              class="font-serif text-2xl font-normal mb-3"
              style="color: var(--ink); letter-spacing: -0.02em"
            >
              {{ t('auth.checkEmail') }}
            </h2>
            <p class="text-sm mb-6" style="color: var(--ink-muted)">{{ t('auth.verifyEmailSent') }}</p>
            <div class="flex flex-col items-center gap-3">
              <UButton variant="link" size="sm" :loading="resendLoading" @click="resendVerification">
                {{ t('auth.resendVerification') }}
              </UButton>
              <NuxtLink to="/employer/login" class="hover:underline text-sm font-medium" style="color: var(--accent)">
                {{ t('auth.backToLogin') }}
              </NuxtLink>
            </div>
          </div>
        </template>

        <template v-else>
          <h2
            class="font-serif text-2xl font-normal mb-8"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.signupTitle') }}
          </h2>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <p class="text-xs font-medium uppercase tracking-wider" style="color: var(--ink-subtle)">{{ t('auth.sectionCompany') }}</p>
            <UFormField :label="t('auth.companyName')" :error="errors.companyName">
              <UInput v-model="companyName" v-bind="companyNameProps" autofocus class="w-full" />
            </UFormField>
            <UFormField :label="t('auth.contactEmail')" :error="errors.contactEmail">
              <UInput
                v-model="contactEmail"
                v-bind="contactEmailProps"
                type="email"
                autocomplete="email"
                placeholder="billing@company.com"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs" style="color: var(--ink-subtle)">{{ t('auth.contactEmailHint') }}</span>
              </template>
            </UFormField>
            <p class="text-xs font-medium uppercase tracking-wider pt-2" style="color: var(--ink-subtle)">{{ t('auth.sectionAccount') }}</p>
            <UFormField :label="t('auth.fullName')" :error="errors.fullName">
              <UInput v-model="fullName" v-bind="fullNameProps" autocomplete="name" class="w-full" />
            </UFormField>
            <UFormField :label="t('auth.email')" :error="errors.email">
              <UInput
                v-model="email"
                v-bind="emailProps"
                type="email"
                autocomplete="email"
                placeholder="you@company.com"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs" style="color: var(--ink-subtle)">{{ t('auth.loginEmailHint') }}</span>
              </template>
            </UFormField>
            <UFormField :label="t('auth.password')" :error="errors.password">
              <UInput
                v-model="password"
                v-bind="passwordProps"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full"
              >
                <template #trailing>
                  <button type="button" tabindex="-1" @click="showPassword = !showPassword">
                    <UIcon :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" style="color: var(--ink-muted)" />
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
                  <span class="text-xs" :style="{ color: pwStrengthColor }">{{ pwStrengthLabel }}</span>
                </div>
              </template>
            </UFormField>
            <UButton type="submit" color="primary" block :loading="loading" :disabled="loading" class="mt-2">
              {{ t('auth.signup') }}
            </UButton>
          </form>

          <p class="text-center text-sm mt-5" style="color: var(--ink-muted)">
            {{ t('auth.haveAccount') }}
            <NuxtLink to="/employer/login" class="hover:underline ml-1 font-medium" style="color: var(--accent)">
              {{ t('auth.login') }}
            </NuxtLink>
          </p>
          <p class="text-center text-xs mt-3" style="color: var(--ink-muted)">
            {{ t('auth.tosPrefix') }}
            <NuxtLink to="/terms" class="hover:underline" style="color: var(--ink-muted)">{{ t('auth.tosLink') }}</NuxtLink>.
          </p>
        </template>

      </div>
    </div>
  </div>
</template>
