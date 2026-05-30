<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { resetPasswordSchema } from '~/schemas/auth'

definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const token = computed(() => route.query.token as string)
const loading = ref(false)

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: toTypedSchema(resetPasswordSchema),
})

const [password, passwordProps] = defineField('password')
const [confirmPassword, confirmPasswordProps] = defineField('confirmPassword')

const onSubmit = handleSubmit(async (values) => {
  loading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/auth/reset-password', { token: token.value, password: values.password })
    toast.add({
      title: t('common.success'),
      description: t('auth.resetPasswordSuccess'),
      color: 'success',
    })
    router.push('/employer/login')
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(e, t('auth.resetPasswordInvalidToken')),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="grid-hero min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md" style="position: relative; z-index: 2">
      <div class="text-center mb-8">
        <NuxtLink to="/employer/login">
          <h1
            class="font-serif text-4xl font-normal"
            style="letter-spacing: -0.04em; color: var(--ink)"
          >
            my<em style="font-style: italic; color: var(--accent)">hr</em>
          </h1>
        </NuxtLink>
        <p
          class="mt-2 text-sm"
          style="
            color: var(--ink-muted);
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.04em;
          "
        >
          {{ t('auth.resetPasswordSubtitle') }}
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
        <template v-if="!token">
          <div class="text-center py-4">
            <p class="text-sm" style="color: var(--ink-muted)">
              {{ t('auth.resetPasswordInvalidToken') }}
            </p>
            <NuxtLink
              to="/employer/forgot-password"
              class="block text-primary-600 hover:underline text-sm mt-4"
            >
              {{ t('auth.forgotPasswordTitle') }}
            </NuxtLink>
          </div>
        </template>
        <template v-else>
          <h2
            class="font-serif text-xl font-normal mb-6"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.resetPasswordTitle') }}
          </h2>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <UFormField :label="t('auth.newPassword')" :error="errors.password">
              <UInput
                v-model="password"
                v-bind="passwordProps"
                type="password"
                autocomplete="new-password"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('auth.confirmPassword')" :error="errors.confirmPassword">
              <UInput
                v-model="confirmPassword"
                v-bind="confirmPasswordProps"
                type="password"
                autocomplete="new-password"
                class="w-full"
              />
            </UFormField>
            <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
              {{ t('auth.resetPasswordTitle') }}
            </UButton>
          </form>
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
