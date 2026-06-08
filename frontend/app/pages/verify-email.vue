<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: false })

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const status = ref<'verifying' | 'success' | 'error'>('verifying')

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'error'
    return
  }
  try {
    const api = useApi()
    await api.get('/api/v1/auth/verify-email', { token })
    status.value = 'success'
    setTimeout(() => router.push('/employer/login'), 3000)
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <div class="grid-hero min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md" style="position: relative; z-index: 2">
      <div class="text-center mb-8">
        <NuxtLink to="/employer/login">
          <img
            src="/crewly-logo-horizontal.svg"
            alt="Crewly"
            style="height: 26px; width: auto; display: inline-block"
          />
        </NuxtLink>
      </div>

      <div
        class="rounded-2xl p-6 text-center"
        style="
          background: var(--paper);
          border: 1px solid var(--line);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        "
      >
        <template v-if="status === 'verifying'">
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-3xl mb-4"
            style="color: var(--accent)"
          />
          <p class="text-sm" style="color: var(--ink-muted)">{{ t('auth.verifyingEmail') }}</p>
        </template>

        <template v-else-if="status === 'success'">
          <div class="text-4xl mb-4">✅</div>
          <h2
            class="font-serif text-xl font-normal mb-2"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.emailVerified') }}
          </h2>
          <p class="text-sm" style="color: var(--ink-muted)">Redirecting to login...</p>
          <NuxtLink
            to="/employer/login"
            class="block text-primary-600 hover:underline text-sm mt-4"
          >
            {{ t('auth.backToLogin') }}
          </NuxtLink>
        </template>

        <template v-else>
          <div class="text-4xl mb-4">❌</div>
          <h2
            class="font-serif text-xl font-normal mb-2"
            style="color: var(--ink); letter-spacing: -0.02em"
          >
            {{ t('auth.emailVerifyFailed') }}
          </h2>
          <NuxtLink
            to="/employer/login"
            class="block text-primary-600 hover:underline text-sm mt-4"
          >
            {{ t('auth.backToLogin') }}
          </NuxtLink>
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
