<template>
  <div class="page">
    <header class="top-bar">
      <div>
        <h1>Вакансии для вас</h1>
        <p class="sub">{{ profile?.fullName || 'Кандидат' }}</p>
      </div>
      <NuxtLink to="/tma/candidate/applications" class="apps-link">Отклики</NuxtLink>
    </header>

    <div v-if="loading" class="loader">
      <div class="spinner" />
    </div>

    <div v-else-if="error" class="empty">
      <p>{{ error }}</p>
      <button class="btn" @click="load">Обновить</button>
    </div>

    <div v-else-if="!feed.length" class="empty">
      <p>Подходящих вакансий пока нет. Попробуйте позже.</p>
    </div>

    <div v-else class="feed">
      <NuxtLink
        v-for="item in feed"
        :key="item.matchId"
        :to="`/tma/candidate/job/${item.job.id}`"
        class="card"
      >
        <div class="card-top">
          <div class="job-title">{{ item.job.title }}</div>
          <div class="score-badge" :class="scoreClass(item.score)">{{ item.score }}%</div>
        </div>
        <div class="company">{{ item.job.company }}</div>
        <div class="meta-row">
          <span v-if="item.job.location">📍 {{ item.job.location }}</span>
          <span v-if="item.job.workMode">🏠 {{ item.job.workMode }}</span>
          <span v-if="item.job.salaryMinUzs">💰 {{ formatSalary(item.job.salaryMinUzs) }}</span>
        </div>
        <div v-if="item.applied" class="applied-tag">Отклик отправлен ✓</div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', auth: false, robots: 'noindex, nofollow', middleware: ['tma-auth'] })

const router = useRouter()
const tmaStore = useTmaStore()
const { init } = useTma()

const profile = tmaStore.profile
const feed = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function scoreClass(score: number) {
  if (score >= 85) return 'high'
  if (score >= 65) return 'med'
  return 'low'
}

function formatSalary(uzs: number) {
  return (uzs / 1_000_000).toFixed(1) + ' млн UZS'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    feed.value = await tmaStore.apiGet<any[]>('/api/v1/tma/candidate/feed')
  } catch {
    error.value = 'Не удалось загрузить вакансии'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  init()
  load()
})
</script>

<style scoped>
.page {
  padding: 0 0 80px;
  background: var(--tg-theme-bg-color);
  min-height: 100vh;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  position: sticky;
  top: 0;
  background: var(--tg-theme-bg-color);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 10;
}

h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--tg-theme-hint-color);
}

.apps-link {
  font-size: 14px;
  color: var(--tg-theme-link-color);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--tg-theme-secondary-bg-color);
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

.feed {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 14px;
  padding: 14px;
}

.card:active {
  opacity: 0.85;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.job-title {
  font-weight: 600;
  font-size: 15px;
  flex: 1;
}

.score-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.high {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}
.med {
  background: rgba(255, 204, 0, 0.15);
  color: #b89400;
}
.low {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.company {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 8px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--tg-theme-hint-color);
}

.applied-tag {
  margin-top: 8px;
  font-size: 12px;
  color: #34c759;
  font-weight: 600;
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
}
</style>
