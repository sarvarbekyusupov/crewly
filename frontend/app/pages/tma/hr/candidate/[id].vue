<template>
  <div class="page">
    <header class="top-bar">
      <button class="back-btn" @click="goBack">←</button>
      <h1>Кандидат</h1>
    </header>

    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <div v-else-if="error" class="empty">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="data" class="content">
      <div class="hero">
        <div class="name-row">
          <h2>{{ data.candidate.fullName || 'Без имени' }}</h2>
          <div v-if="data.matchScore" class="match-score" :class="scoreClass(data.matchScore)">
            {{ data.matchScore }}%
          </div>
        </div>
        <div class="position">{{ data.candidate.currentPosition || '' }}</div>
        <div class="tags">
          <span v-if="data.candidate.city">📍 {{ data.candidate.city }}</span>
          <span v-if="data.candidate.yearsExperience">
            {{ data.candidate.yearsExperience }} лет опыта
          </span>
          <span v-if="data.candidate.expectedSalaryUzs">
            💰 {{ formatSalary(data.candidate.expectedSalaryUzs) }}
          </span>
        </div>

        <div v-if="data.job" class="job-tag">Вакансия: {{ data.job.title }}</div>
      </div>

      <div v-if="data.screening" class="section screening-box">
        <h3>Скрининг AI</h3>
        <div class="screen-score" :class="scoreClass(data.screening.score)">
          {{ data.screening.score ?? '—' }} / 100
        </div>
        <p class="screen-summary">{{ data.screening.summary || 'Результаты обрабатываются...' }}</p>
      </div>

      <div v-if="data.candidate.skills?.length" class="section">
        <h3>Навыки</h3>
        <div class="skill-tags">
          <span v-for="s in data.candidate.skills" :key="s" class="skill">{{ s }}</span>
        </div>
      </div>

      <div class="section contacts">
        <h3>Контакты</h3>
        <div v-if="data.candidate.email" class="contact-row">
          <span class="label">Email</span>
          <a :href="`mailto:${data.candidate.email}`" class="value link">{{
            data.candidate.email
          }}</a>
        </div>
        <div v-if="data.candidate.phone" class="contact-row">
          <span class="label">Телефон</span>
          <a :href="`tel:${data.candidate.phone}`" class="value link">{{ data.candidate.phone }}</a>
        </div>
        <div v-if="data.candidate.linkedinUrl" class="contact-row">
          <span class="label">LinkedIn</span>
          <a :href="data.candidate.linkedinUrl" target="_blank" class="value link">Открыть</a>
        </div>
        <div v-if="data.candidate.resumeFileUrl" class="contact-row">
          <span class="label">Резюме</span>
          <a :href="data.candidate.resumeFileUrl" target="_blank" class="value link">Скачать PDF</a>
        </div>
      </div>

      <div class="action-area">
        <button class="action-btn approve" :disabled="!!actionLoading" @click="approve">
          {{ actionLoading === 'approve' ? '...' : '✓ Одобрить кандидата' }}
        </button>
        <button class="action-btn reject" :disabled="!!actionLoading" @click="reject">
          {{ actionLoading === 'reject' ? '...' : '✗ Отклонить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', auth: false, robots: 'noindex, nofollow', middleware: ['tma-hr'] })

const route = useRoute()
const router = useRouter()
const tmaStore = useTmaStore()
const { hapticSuccess, hapticError } = useTma()

const appId = route.params.id as string
const data = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const actionLoading = ref<'approve' | 'reject' | false>(false)

const done = ref(false)

function goBack() {
  router.back()
}

function scoreClass(score: number | null) {
  if (!score) return 'gray'
  if (score >= 85) return 'high'
  if (score >= 65) return 'med'
  return 'low'
}

function formatSalary(uzs: number) {
  return (uzs / 1_000_000).toFixed(1) + ' млн UZS'
}

async function approve() {
  if (done.value) return
  actionLoading.value = 'approve'
  try {
    await tmaStore.apiPost(`/api/v1/tma/hr/applications/${appId}/approve`)
    hapticSuccess()
    done.value = true
    router.replace('/tma/hr')
  } catch {
    hapticError()
  } finally {
    actionLoading.value = false
  }
}

async function reject() {
  if (done.value) return
  actionLoading.value = 'reject'
  try {
    await tmaStore.apiPost(`/api/v1/tma/hr/applications/${appId}/reject`, {})
    hapticSuccess()
    done.value = true
    router.replace('/tma/hr')
  } catch {
    hapticError()
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    data.value = await tmaStore.apiGet<any>(`/api/v1/tma/hr/applications/${appId}/candidate`)
  } catch {
    error.value = 'Не удалось загрузить данные кандидата'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page {
  padding: 0 0 120px;
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
}

.hero {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  flex: 1;
}

.match-score {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
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
.gray {
  background: rgba(153, 153, 153, 0.15);
  color: #999;
}

.position {
  font-size: 15px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 12px;
}

.job-tag {
  display: inline-block;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
}

.section {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

h3 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--tg-theme-hint-color);
}

.screening-box .screen-score {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.screen-summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tg-theme-text-color);
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

.contacts {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.contact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.contact-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
}

.value {
  font-size: 14px;
  font-weight: 500;
}

.link {
  color: var(--tg-theme-link-color);
  text-decoration: none;
}

.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: var(--tg-theme-bg-color);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.approve {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.approve:active:not(:disabled) {
  background: rgba(52, 199, 89, 0.25);
}

.reject {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}

.reject:active:not(:disabled) {
  background: rgba(255, 59, 48, 0.22);
}
</style>
