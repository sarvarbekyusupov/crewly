<template>
  <div class="page">
    <header class="top-bar">
      <button class="back-btn" @click="goBack">←</button>
      <h1>Вакансия</h1>
    </header>

    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <div v-else-if="error" class="empty">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="job" class="content">
      <div class="hero">
        <h2>{{ job.title }}</h2>
        <div class="company">{{ job.company }}</div>

        <div class="tags">
          <span v-if="job.location">📍 {{ job.location }}</span>
          <span v-if="job.workMode">🏠 {{ job.workMode }}</span>
          <span v-if="salaryStr">💰 {{ salaryStr }}</span>
        </div>

        <div v-if="job.match" class="match-box">
          <div class="match-score" :class="scoreClass(job.match.score)">
            {{ job.match.score }}% совпадение
          </div>
          <div v-if="job.match.reasons" class="match-reasons">
            <p v-for="(r, i) in matchReasons" :key="i">• {{ r }}</p>
          </div>
        </div>
      </div>

      <div v-if="job.requiredSkills?.length" class="section">
        <h3>Навыки</h3>
        <div class="skill-tags">
          <span v-for="s in job.requiredSkills" :key="s" class="skill">{{ s }}</span>
        </div>
      </div>

      <div v-if="job.description" class="section">
        <h3>Описание</h3>
        <p class="desc">{{ job.description }}</p>
      </div>

      <div class="apply-area">
        <div v-if="job.application" class="applied-notice">
          ✅ Вы уже откликнулись на эту вакансию
          <span class="app-status">{{ statusLabel(job.application.status) }}</span>
        </div>
        <button v-else class="apply-btn" :disabled="applying" @click="apply">
          <span v-if="applying">Отправляем...</span>
          <span v-else>Откликнуться</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', auth: false, robots: 'noindex, nofollow', middleware: ['tma-auth'] })

const route = useRoute()
const router = useRouter()
const tmaStore = useTmaStore()
const { hapticSuccess, hapticError } = useTma()

const jobId = route.params.id as string
const job = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const applying = ref(false)

const salaryStr = computed(() => {
  if (!job.value?.salaryMinUzs) return ''
  const min = (job.value.salaryMinUzs / 1_000_000).toFixed(1)
  const max = job.value.salaryMaxUzs ? ` – ${(job.value.salaryMaxUzs / 1_000_000).toFixed(1)}` : ''
  return `${min}${max} млн UZS`
})

const matchReasons = computed(() => {
  const r = job.value?.match?.reasons
  if (!r) return []
  if (Array.isArray(r)) return r
  if (typeof r === 'object') return Object.values(r)
  return []
})

function scoreClass(score: number) {
  if (score >= 85) return 'high'
  if (score >= 65) return 'med'
  return 'low'
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

function goBack() {
  router.back()
}

async function apply() {
  applying.value = true
  try {
    const res = await tmaStore.apiPost<any>(`/api/v1/tma/candidate/jobs/${jobId}/apply`)
    hapticSuccess()
    job.value = { ...job.value, application: { id: res.id, status: res.status } }
  } catch {
    hapticError()
  } finally {
    applying.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    job.value = await tmaStore.apiGet<any>(`/api/v1/tma/candidate/jobs/${jobId}`)
  } catch {
    error.value = 'Не удалось загрузить вакансию'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: 0 0 100px;
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
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hero {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

h2 {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
}

.company {
  font-size: 15px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 12px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 16px;
}

.match-box {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
  padding: 14px;
}

.match-score {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
}

.high {
  color: #34c759;
}
.med {
  color: #b89400;
}
.low {
  color: #ff3b30;
}

.match-reasons p {
  margin: 3px 0;
  font-size: 13px;
  color: var(--tg-theme-hint-color);
}

.section {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--tg-theme-hint-color);
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
}

.desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--tg-theme-text-color);
  white-space: pre-wrap;
}

.apply-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: var(--tg-theme-bg-color);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.apply-btn {
  width: 100%;
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 14px;
  padding: 16px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.apply-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.apply-btn:active:not(:disabled) {
  opacity: 0.85;
}

.applied-notice {
  text-align: center;
  font-size: 15px;
  color: #34c759;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-status {
  font-size: 12px;
  font-weight: 400;
  color: var(--tg-theme-hint-color);
}
</style>
