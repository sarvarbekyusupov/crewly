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
      <button v-if="!isTma" class="btn" @click="retryAuth">Попробовать снова</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', auth: false, robots: 'noindex, nofollow' })

useHead({ title: 'Crewly TMA' })

const router = useRouter()
const { isTma, init, getInitData } = useTma()
const tmaStore = useTmaStore()

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
    await tmaStore.authenticate(initData)
    if (tmaStore.role === 'hr') {
      await router.replace('/tma/hr')
    } else {
      await router.replace('/tma/candidate')
    }
  } catch {
    loading.value = false
    errorMsg.value = tmaStore.error ?? 'Не удалось войти. Попробуйте ещё раз.'
  }
}

async function retryAuth() {
  await doAuth()
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
