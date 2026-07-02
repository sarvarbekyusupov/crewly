<template>
  <div class="tma-entry">
    <div v-if="loading" class="center">
      <div class="spinner" />
      <p>{{ t('tma.loading') }}</p>
    </div>

    <div v-else-if="errorMsg" class="center error-card">
      <span class="icon">⚠️</span>
      <h2>{{ t('tma.errorTitle') }}</h2>
      <p>{{ errorMsg }}</p>
      <button class="btn" @click="doAuth">{{ t('tma.retry') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', robots: 'noindex, nofollow' })
useHead({ title: 'Crewly TMA' })

const router = useRouter()
const route = useRoute()
const { isTma, init, getInitData } = useTma()
const candidateAuthStore = useCandidateAuthStore()
const config = useRuntimeConfig()
const { t, setLocale } = useI18n()

const loading = ref(true)
const errorMsg = ref<string | null>(null)

function detectAndSetLocale() {
  const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
  if (!code) return
  const lc = code.split('-')[0].toLowerCase()
  if (lc === 'ru') setLocale('ru')
  else if (lc === 'uz') setLocale('uz')
  else setLocale('en')
}

async function doAuth() {
  loading.value = true
  errorMsg.value = null

  detectAndSetLocale()
  init()
  const initData = getInitData()

  if (!initData) {
    loading.value = false
    errorMsg.value = t('tma.openFromBot')
    return
  }

  try {
    const result = await $fetch<{
      candidate: { isNewProfile: boolean; skills: string[]; currentPosition: string | null }
    }>('/api/v1/tma/session-login', {
      method: 'POST',
      body: { initData },
      baseURL: config.public.apiBase as string,
      credentials: 'include',
    })

    await candidateAuthStore.fetchMe()

    const isIncomplete =
      result.candidate.isNewProfile ||
      (!result.candidate.currentPosition && !result.candidate.skills.length)

    if (isIncomplete) {
      await router.replace('/candidate/onboarding')
      return
    }

    const to = route.query.to as string | undefined
    if (to?.startsWith('/candidate/')) {
      await router.replace(to)
    } else {
      await router.replace('/candidate/dashboard')
    }
  } catch (e: any) {
    const status = (e as any)?.response?.status ?? (e as any)?.statusCode
    if (status === 403) {
      await router.replace('/tma/hr')
      return
    }
    loading.value = false
    errorMsg.value = e?.data?.message ?? t('tma.loginFailed')
  }
}

function waitForTelegramSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp !== undefined) {
      resolve()
      return
    }
    const script = document.querySelector<HTMLScriptElement>('script[src*="telegram-web-app"]')
    if (script) {
      script.addEventListener('load', () => resolve(), { once: true })
      script.addEventListener('error', () => resolve(), { once: true })
    } else {
      setTimeout(resolve, 1000)
    }
  })
}

onMounted(async () => {
  await waitForTelegramSdk()
  await doAuth()
})
</script>

<style scoped>
.tma-entry {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--tg-theme-bg-color);
}

.center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--tg-theme-secondary-bg-color);
  border-top-color: var(--tg-theme-button-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-card {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
}

.icon {
  font-size: 48px;
}

h2 {
  margin: 0;
  font-size: 18px;
}

p {
  margin: 0;
  color: var(--tg-theme-hint-color);
  font-size: 14px;
}

.btn {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;
}

.btn:active {
  opacity: 0.8;
}
</style>
