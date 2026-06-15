<template>
  <div class="page">
    <header class="top-bar">
      <button class="back-btn" @click="goBack">←</button>
      <h1>Мои отклики</h1>
    </header>

    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <div v-else-if="error" class="empty">
      <p>{{ error }}</p>
      <button class="btn" @click="load">Обновить</button>
    </div>

    <div v-else-if="!apps.length" class="empty">
      <p>Откликов пока нет. Найдите вакансии на главной.</p>
      <NuxtLink to="/tma/candidate" class="btn">К вакансиям</NuxtLink>
    </div>

    <div v-else class="list">
      <div v-for="app in apps" :key="app.id" class="card">
        <div class="card-top">
          <div class="job-title">{{ app.job?.title ?? '—' }}</div>
          <span class="status-badge" :class="statusClass(app.status)">{{
            statusLabel(app.status)
          }}</span>
        </div>
        <div class="company">{{ app.job?.company ?? '' }}</div>
        <div class="date">{{ formatDate(app.appliedAt ?? app.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', robots: 'noindex, nofollow' })

const router = useRouter()
const tmaStore = useTmaStore()

if (!tmaStore.isAuthenticated) router.replace('/tma')

const apps = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function goBack() {
  router.back()
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди',
  applied: 'Отправлен',
  failed: 'Ошибка',
  skipped: 'Пропущен',
}

function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s
}

function statusClass(s: string) {
  if (s === 'applied') return 'green'
  if (s === 'failed') return 'red'
  return 'gray'
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    apps.value = await tmaStore.apiGet<any[]>('/api/v1/tma/candidate/applications')
  } catch {
    error.value = 'Не удалось загрузить отклики'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: 0 0 80px;
  background: var(--tg-theme-bg-color);
  min-height: 100vh;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  position: sticky;
  top: 0;
  background: var(--tg-theme-bg-color);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--tg-theme-link-color);
  padding: 0;
  line-height: 1;
}

h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.loader {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--tg-theme-secondary-bg-color);
  border-top-color: var(--tg-theme-button-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--tg-theme-hint-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
  padding: 14px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.job-title {
  font-weight: 600;
  font-size: 15px;
  flex: 1;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.green {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}
.red {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}
.gray {
  background: rgba(153, 153, 153, 0.15);
  color: #999;
}

.company {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
}

.date {
  font-size: 12px;
  color: var(--tg-theme-hint-color);
  margin-top: 6px;
}

.btn {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
</style>
