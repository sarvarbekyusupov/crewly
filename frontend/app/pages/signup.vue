<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { signupSchema } from '~/schemas/auth'

definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const loading = ref(false)
const done = ref(false)

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: toTypedSchema(signupSchema),
})

const [companyName, companyNameProps] = defineField('companyName')
const [contactEmail, contactEmailProps] = defineField('contactEmail')
const [fullName, fullNameProps] = defineField('fullName')
const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')

const onSubmit = handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/signup', values)
    done.value = true
  } catch {
    // useApi shows error toast
  } finally {
    loading.value = false
  }
})

onMounted(async () => {
  await auth.fetchMe()
  if (auth.isAuthenticated) router.push('/dashboard')
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
          {{ t('auth.signupSubtitle') }}
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
        <template v-if="done">
          <div class="text-center py-4">
            <div class="text-4xl mb-4">✉️</div>
            <h2
              class="font-serif text-xl font-normal mb-2"
              style="color: var(--ink); letter-spacing: -0.02em"
            >
              {{ t('auth.checkEmail') }}
            </h2>
            <p class="text-sm" style="color: var(--ink-muted)">{{ t('auth.verifyEmailSent') }}</p>
            <NuxtLink
              to="/login"
              class="text-primary-600 hover:underline text-sm mt-4 inline-block"
            >
              {{ t('auth.backToLogin') }}
            </NuxtLink>
          </div>
        </template>

        <template v-else>
          <h2
            class="font-serif text-xl font-normal mb-6"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.signupTitle') }}
          </h2>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <UFormField :label="t('auth.companyName')" :error="errors.companyName">
              <UInput v-model="companyName" v-bind="companyNameProps" class="w-full" />
            </UFormField>
            <UFormField :label="t('auth.contactEmail')" :error="errors.contactEmail">
              <UInput
                v-model="contactEmail"
                v-bind="contactEmailProps"
                type="email"
                autocomplete="email"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs" style="color: var(--ink-subtle)">{{
                  t('auth.contactEmailHint')
                }}</span>
              </template>
            </UFormField>
            <UFormField :label="t('auth.fullName')" :error="errors.fullName">
              <UInput
                v-model="fullName"
                v-bind="fullNameProps"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('auth.email')" :error="errors.email">
              <UInput
                v-model="email"
                v-bind="emailProps"
                type="email"
                autocomplete="email"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs" style="color: var(--ink-subtle)">{{
                  t('auth.loginEmailHint')
                }}</span>
              </template>
            </UFormField>
            <UFormField :label="t('auth.password')" :error="errors.password">
              <UInput
                v-model="password"
                v-bind="passwordProps"
                type="password"
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
            <NuxtLink to="/login" class="text-primary-600 hover:underline ml-1">
              {{ t('auth.login') }}
            </NuxtLink>
          </p>
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
