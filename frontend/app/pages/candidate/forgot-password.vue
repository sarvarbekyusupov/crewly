<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { forgotPasswordSchema } from '~/schemas/auth'

definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const loading = ref(false)
const sent = ref(false)

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: toTypedSchema(forgotPasswordSchema),
})

const [email, emailProps] = defineField('email')

const onSubmit = handleSubmit(async (values) => {
  loading.value = true
  try {
    const api = useApi()
    await api.post('/api/v1/candidate-auth/forgot-password', { email: values.email })
    sent.value = true
  } catch {
    /* useApi shows error toast */
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

      <NuxtLink to="/candidate" class="relative z-10">
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
          Candidate Portal
        </p>
        <h2
          class="font-serif text-4xl font-normal leading-tight mb-8"
          style="color: white; letter-spacing: -0.03em"
        >
          Find your<br />
          <em style="font-style: italic; color: var(--accent)">next role</em>.
        </h2>
        <ul class="space-y-3">
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            One profile, matched to the right roles
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            We reach out when there's a real fit
          </li>
          <li class="flex items-start gap-3 text-sm" style="color: rgba(255, 255, 255, 0.6)">
            <span style="color: var(--accent); flex-shrink: 0">✓</span>
            Always free for candidates
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
        Crewly / candidates
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
          <NuxtLink to="/candidate/login">
            <img
              src="/crewly-logo-horizontal.svg"
              alt="Crewly"
              style="height: 26px; width: auto; display: inline-block"
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
            {{ t('auth.forgotPasswordSubtitle') }}
          </p>
        </div>

        <template v-if="sent">
          <div class="text-center py-8">
            <div class="text-5xl mb-6">✉️</div>
            <h2
              class="font-serif text-2xl font-normal mb-3"
              style="color: var(--ink); letter-spacing: -0.02em"
            >
              {{ t('auth.forgotPasswordSent') }}
            </h2>
            <p class="text-sm mb-6" style="color: var(--ink-muted)">
              {{ t('auth.forgotPasswordSentDesc') }}
            </p>
            <NuxtLink
              to="/candidate/login"
              class="hover:underline text-sm font-medium"
              style="color: var(--accent)"
            >
              {{ t('auth.backToLogin') }}
            </NuxtLink>
          </div>
        </template>
        <template v-else>
          <h2
            class="font-serif text-2xl font-normal mb-8"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.forgotPasswordTitle') }}
          </h2>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <UFormField :label="t('auth.email')" :error="errors.email">
              <UInput
                v-model="email"
                v-bind="emailProps"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                autofocus
                class="w-full"
              />
            </UFormField>
            <UButton
              type="submit"
              color="primary"
              block
              :loading="loading"
              :disabled="loading"
              class="mt-2"
            >
              {{ t('auth.sendResetLink') }}
            </UButton>
          </form>
          <p class="text-center text-sm mt-5" style="color: var(--ink-muted)">
            <NuxtLink
              to="/candidate/login"
              class="hover:underline font-medium"
              style="color: var(--accent)"
            >
              {{ t('auth.backToLogin') }}
            </NuxtLink>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
