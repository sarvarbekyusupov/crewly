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
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const { errors, handleSubmit, defineField, setFieldError } = useForm({
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
    applyApiFieldErrors(e, setFieldError)
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
  <div class="min-h-screen lg:grid lg:grid-cols-2">
    <!-- Left brand panel (desktop only) -->
    <div
      class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style="background: var(--ink)"
    >
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

      <NuxtLink to="/employer" class="relative z-10">
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          style="height: 24px; width: auto; display: block"
        />
      </NuxtLink>

      <div class="relative z-10">
        <p
          class="text-xs uppercase tracking-widest mb-6"
          style="color: rgba(255, 255, 255, 0.35); font-family: 'JetBrains Mono', monospace"
        >
          HR Portal
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Recruit with<br />
          <em style="font-style: italic; color: var(--accent)">clarity</em>.
        </h2>
        <ul class="space-y-3">
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Post jobs and track every applicant
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Automate offers and invoicing
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Invite your team and collaborate
          </li>
        </ul>
      </div>

      <p
        class="relative z-10 text-xs"
        style="
          color: rgba(255, 255, 255, 0.2);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.06em;
        "
      >
        Crewly / employers
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
          <NuxtLink to="/employer/login">
            <img
              class="block dark:hidden"
              src="/crewly-logo-horizontal.svg"
              alt="Crewly"
              style="height: 26px; width: auto"
            />
            <img
              class="hidden dark:block"
              src="/crewly-logo-horizontal-white.svg"
              alt="Crewly"
              style="height: 26px; width: auto"
            />
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

        <template v-if="!token">
          <div class="py-4">
            <p class="text-sm mb-4" style="color: var(--ink-muted)">
              {{ t('auth.resetPasswordInvalidToken') }}
            </p>
            <NuxtLink
              to="/employer/forgot-password"
              class="hover:underline text-sm font-medium"
              style="color: var(--accent)"
            >
              {{ t('auth.forgotPasswordTitle') }}
            </NuxtLink>
          </div>
        </template>
        <template v-else>
          <h2
            class="font-serif text-2xl font-normal mb-8"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.resetPasswordTitle') }}
          </h2>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <UFormField :label="t('auth.newPassword')" :error="errors.password">
              <UInput
                v-model="password"
                v-bind="passwordProps"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                autofocus
                class="w-full"
              >
                <template #trailing>
                  <button type="button" tabindex="-1" @click="showPassword = !showPassword">
                    <UIcon
                      :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                      class="w-4 h-4"
                      style="color: var(--ink-muted)"
                    />
                  </button>
                </template>
              </UInput>
            </UFormField>
            <UFormField :label="t('auth.confirmPassword')" :error="errors.confirmPassword">
              <UInput
                v-model="confirmPassword"
                v-bind="confirmPasswordProps"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full"
              >
                <template #trailing>
                  <button
                    type="button"
                    tabindex="-1"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <UIcon
                      :name="showConfirmPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                      class="w-4 h-4"
                      style="color: var(--ink-muted)"
                    />
                  </button>
                </template>
              </UInput>
            </UFormField>
            <UButton
              type="submit"
              color="primary"
              block
              :loading="loading"
              :disabled="loading"
              class="mt-2"
            >
              {{ t('auth.resetPasswordTitle') }}
            </UButton>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
