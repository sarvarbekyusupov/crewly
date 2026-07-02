<template>
  <div class="tma-entry">
    <div v-if="loading" class="center">
      <div class="spinner" />
      <p>Загрузка...</p>
    </div>

    <div v-else-if="errorMsg" class="center error-card">
      <span class="icon">⚠️</span>
      <h2>Ошибка входа</h2>
      <p>{{ errorMsg }}</p>
      <button class="btn" @click="doAuth">Попробовать снова</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', robots: 'noindex, nofollow' })
useHead({ title: 'Crewly TMA' })

const router = useRouter()
const { isTma, init, getInitData } = useTma()
const candidateAuthStore = useCandidateAuthStore()
const config = useRuntimeConfig()

const loading = ref(true)
const errorMsg = ref<string | null>(null)

async function doAuth() {
  loading.value = true
  errorMsg.value = null

  init()
  const initData = getInitData()

  if (!initData) {
    loading.value = false
    errorMsg.value = 'Откройте приложение из Telegram бота.'
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

    if (
      result.candidate.isNewProfile ||
      (!result.candidate.currentPosition && !result.candidate.skills.length)
    ) {
      await router.replace('/candidate/onboarding')
    } else {
      await router.replace('/candidate/dashboard')
    }
  } catch (e: any) {
    loading.value = false
    errorMsg.value = e?.data?.message ?? 'Не удалось войти. Попробуйте ещё раз.'
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
