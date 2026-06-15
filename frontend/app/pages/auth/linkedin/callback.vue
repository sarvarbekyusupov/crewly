<template>
  <div class="callback-page">
    <div class="card">
      <div v-if="status === 'loading'" class="state">
        <div class="spinner" />
        <p>Connecting LinkedIn...</p>
      </div>
      <div v-else-if="status === 'success'" class="state success">
        <span class="icon">✅</span>
        <h2>LinkedIn connected!</h2>
        <p>Redirecting you back...</p>
      </div>
      <div v-else class="state error">
        <span class="icon">❌</span>
        <h2>Connection failed</h2>
        <p>{{ errorMsg }}</p>
        <NuxtLink to="/candidate/preferences" class="btn">Back to settings</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'empty' })

const route = useRoute()
const router = useRouter()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMsg = ref('')

onMounted(async () => {
  const code = route.query.code as string | undefined
  const state = route.query.state as string | undefined
  const error = route.query.error as string | undefined

  if (error || !code || !state) {
    await router.replace('/candidate/preferences?linkedin=denied')
    return
  }

  try {
    await $fetch('/api/v1/webhooks/linkedin/exchange', {
      method: 'POST',
      body: { code, state },
    })
    status.value = 'success'
    setTimeout(() => router.replace('/candidate/preferences?linkedin=success'), 1200)
  } catch (err: any) {
    const msg = err?.data?.message ?? 'LinkedIn exchange failed'
    await router.replace(`/candidate/preferences?linkedin=error&reason=${encodeURIComponent(msg)}`)
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #0077b5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon {
  font-size: 48px;
}

h2 {
  margin: 0;
  font-size: 20px;
}

p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.btn {
  display: inline-block;
  background: #0077b5;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  margin-top: 8px;
}
</style>
