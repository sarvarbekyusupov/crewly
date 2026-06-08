<template>
  <div class="tma-app">
    <!-- Telegram Loading State -->
    <div v-if="loading" class="tma-loading">
      <div class="spinner"></div>
      <p>Загрузка панели управления My-HR...</p>
    </div>

    <!-- Error/Unauthenticated State -->
    <div v-else-if="error" class="tma-error">
      <div class="error-card">
        <span class="error-icon">⚠️</span>
        <h2>Доступ ограничен</h2>
        <p>{{ errorMessage }}</p>

        <!-- Browser testing fallback -->
        <div v-if="!isTma" class="test-fallback">
          <p class="test-title">Режим отладки (в браузере):</p>
          <input
            v-model="testTelegramId"
            type="text"
            placeholder="Введите ваш Telegram Chat ID"
            class="test-input"
          />
          <button class="tma-btn" @click="loadPipeline(testTelegramId)">Войти по ID</button>
        </div>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div v-else class="tma-dashboard">
      <!-- Header -->
      <header class="tma-header">
        <div class="user-info">
          <h1>{{ managerName }}</h1>
          <p class="company">{{ companyName }}</p>
        </div>
        <div class="badge">My-HR Partner</div>
      </header>

      <!-- Stats overview -->
      <section class="tma-stats">
        <div class="stat-card">
          <span class="stat-num">{{ jobs.length }}</span>
          <span class="stat-lbl">Вакансии</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ totalCandidates }}</span>
          <span class="stat-lbl">Кандидаты</span>
        </div>
      </section>

      <!-- Active Jobs list -->
      <main class="tma-content">
        <h2>Активные вакансии</h2>

        <div v-if="jobs.length === 0" class="no-jobs">
          <p>У вас пока нет активных вакансий в системе My-HR.</p>
        </div>

        <div v-else class="jobs-list">
          <div v-for="job in jobs" :key="job.id" class="job-accordion">
            <div class="job-header" @click="toggleJob(job.id)">
              <h3>{{ job.title }}</h3>
              <div class="job-meta">
                <span class="candidate-count">
                  {{ job.applications.length }} {{ getCandidatePlural(job.applications.length) }}
                </span>
                <span class="chevron" :class="{ expanded: activeJobId === job.id }">▼</span>
              </div>
            </div>

            <!-- Candidate list for this Job -->
            <transition name="slide">
              <div v-if="activeJobId === job.id" class="job-candidates">
                <div v-if="job.applications.length === 0" class="no-candidates">
                  Нет кандидатов на согласовании для этой вакансии.
                </div>

                <div
                  v-for="app in job.applications"
                  v-else
                  :key="app.id"
                  class="candidate-row"
                  @click="openCandidate(app)"
                >
                  <div class="cand-info">
                    <h4>{{ app.candidate.fullName || 'Без имени' }}</h4>
                    <p class="cand-details">
                      {{ app.candidate.city || 'Узбекистан' }} •
                      {{
                        app.candidate.yearsExperience
                          ? app.candidate.yearsExperience + ' лет опыта'
                          : 'Без опыта'
                      }}
                    </p>
                  </div>

                  <!-- Match score badge -->
                  <div
                    v-if="app.matchScore"
                    class="score-badge"
                    :class="getScoreClass(app.matchScore)"
                  >
                    {{ app.matchScore }}%
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </main>
    </div>

    <!-- Candidate Detail Modal -->
    <transition name="fade">
      <div v-if="showModal && selectedApp" class="tma-modal" @click.self="closeCandidate">
        <div class="modal-card">
          <header class="modal-header">
            <h3>Карточка кандидата</h3>
            <button class="close-btn" @click="closeCandidate">&times;</button>
          </header>

          <main class="modal-body">
            <div class="modal-user">
              <h2>{{ selectedApp.candidate.fullName || 'Без имени' }}</h2>
              <span
                v-if="selectedApp.matchScore"
                class="score-badge"
                :class="getScoreClass(selectedApp.matchScore)"
              >
                Совпадение: {{ selectedApp.matchScore }}%
              </span>
            </div>

            <div class="modal-meta-grid">
              <div class="meta-item">
                <span class="label">Город</span>
                <span class="value">{{ selectedApp.candidate.city || 'Не указан' }}</span>
              </div>
              <div class="meta-item">
                <span class="label">Опыт работы</span>
                <span class="value">
                  {{
                    selectedApp.candidate.yearsExperience
                      ? selectedApp.candidate.yearsExperience + ' лет'
                      : 'Без опыта'
                  }}
                </span>
              </div>
              <div class="meta-item">
                <span class="label">Текущий статус</span>
                <span class="value status-val">{{ selectedApp.status }}</span>
              </div>
            </div>

            <div v-if="selectedApp.matchRecommendation" class="modal-rec">
              <h4>Рекомендация AI</h4>
              <p>{{ selectedApp.matchRecommendation }}</p>
            </div>
          </main>

          <footer class="modal-footer">
            <button class="tma-btn" @click="closeCandidate">Закрыть</button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

useHead({
  title: 'My-HR Telegram Dashboard',
  script: [{ src: 'https://telegram.org/js/telegram-web-app.js', defer: true }],
})

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const isTma = ref(false)
const testTelegramId = ref('')

const managerName = ref('')
const companyName = ref('')
const jobs = ref<any[]>([])

const activeJobId = ref<string | null>(null)
const showModal = ref(false)
const selectedApp = ref<any>(null)

const totalCandidates = computed(() => {
  return jobs.value.reduce((sum, job) => sum + job.applications.length, 0)
})

const getCandidatePlural = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'кандидат'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'кандидата'
  return 'кандидатов'
}

const getScoreClass = (score: number) => {
  if (score >= 85) return 'score-high'
  if (score >= 65) return 'score-medium'
  return 'score-low'
}

const toggleJob = (jobId: string) => {
  activeJobId.value = activeJobId.value === jobId ? null : jobId
}

const openCandidate = (app: any) => {
  selectedApp.value = app
  showModal.value = true
}

const closeCandidate = () => {
  showModal.value = false
  selectedApp.value = null
}

const loadPipeline = async (telegramId: string) => {
  loading.value = true
  error.value = false
  try {
    const data = await $fetch<any>(`/api/v1/webhooks/tma/pipeline?telegramId=${telegramId}`)
    managerName.value = data.manager.fullName
    companyName.value = data.manager.companyName
    jobs.value = data.jobs
    if (jobs.value.length > 0) {
      activeJobId.value = jobs.value[0].id
    }
  } catch (err: any) {
    error.value = true
    errorMessage.value =
      err.data?.message ||
      'Не удалось загрузить данные. Пожалуйста, убедитесь, что вы зарегистрированы в My-HR.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Wait a small delay to ensure Telegram script loads
  setTimeout(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp

      if (tg.initDataUnsafe?.user?.id) {
        isTma.value = true
        tg.ready()
        tg.expand()

        // Set CSS theme variables matching Telegram
        const theme = tg.themeParams
        document.documentElement.style.setProperty('--tg-bg', theme.bg_color || '#ffffff')
        document.documentElement.style.setProperty('--tg-text', theme.text_color || '#222222')
        document.documentElement.style.setProperty('--tg-hint', theme.hint_color || '#999999')
        document.documentElement.style.setProperty('--tg-link', theme.link_color || '#248b1d')
        document.documentElement.style.setProperty(
          '--tg-button-bg',
          theme.button_color || '#40a7e3',
        )
        document.documentElement.style.setProperty(
          '--tg-button-text',
          theme.button_text_color || '#ffffff',
        )
        document.documentElement.style.setProperty(
          '--tg-secondary-bg',
          theme.secondary_bg_color || '#f4f4f5',
        )

        loadPipeline(String(tg.initDataUnsafe.user.id))
      } else {
        // Fallback for regular browser debugging
        loading.value = false
        error.value = true
        errorMessage.value =
          'Пожалуйста, откройте это приложение из Telegram бота или введите ID для отладки:'
      }
    } else {
      loading.value = false
      error.value = true
      errorMessage.value =
        'Пожалуйста, откройте это приложение из Telegram бота или введите ID для отладки:'
    }
  }, 300)
})
</script>

<style scoped>
:root {
  --tg-bg: #ffffff;
  --tg-text: #222222;
  --tg-hint: #999999;
  --tg-link: #248b1d;
  --tg-button-bg: #40a7e3;
  --tg-button-text: #ffffff;
  --tg-secondary-bg: #f4f4f5;
  --app-green: #34c759;
  --app-yellow: #ffcc00;
  --app-red: #ff3b30;
}

.tma-app {
  background-color: var(--tg-bg, #ffffff);
  color: var(--tg-text, #222222);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding: 16px;
  box-sizing: border-box;
}

/* Loading Spinner */
.tma-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--tg-secondary-bg, #f4f4f5);
  border-top: 4px solid var(--tg-button-bg, #40a7e3);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Error card */
.tma-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
.error-card {
  background-color: var(--tg-secondary-bg, #f4f4f5);
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  max-width: 320px;
  width: 100%;
}
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
  display: block;
}
.error-card h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}
.error-card p {
  color: var(--tg-hint, #999999);
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

/* Debug mode input */
.test-fallback {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 16px;
  margin-top: 16px;
}
.test-title {
  font-size: 12px !important;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px !important;
}
.test-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

/* Button */
.tma-btn {
  background-color: var(--tg-button-bg, #40a7e3);
  color: var(--tg-button-text, #ffffff);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: bold;
  width: 100%;
  cursor: pointer;
  transition: opacity 0.2s;
}
.tma-btn:active {
  opacity: 0.8;
}

/* Dashboard */
.tma-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.user-info h1 {
  margin: 0;
  font-size: 22px;
  font-weight: bold;
}
.company {
  margin: 4px 0 0 0;
  color: var(--tg-hint, #999999);
  font-size: 14px;
}
.badge {
  background-color: var(--tg-button-bg, #40a7e3);
  color: var(--tg-button-text, #ffffff);
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

/* Stats overview */
.tma-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background-color: var(--tg-secondary-bg, #f4f4f5);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 24px;
  font-weight: bold;
}
.stat-lbl {
  font-size: 12px;
  color: var(--tg-hint, #999999);
  margin-top: 4px;
}

/* Job accordions */
.tma-content h2 {
  font-size: 18px;
  margin: 0 0 12px 0;
}
.job-accordion {
  background-color: var(--tg-secondary-bg, #f4f4f5);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}
.job-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.job-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.job-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.candidate-count {
  font-size: 12px;
  color: var(--tg-hint, #999999);
}
.chevron {
  font-size: 10px;
  transition: transform 0.2s;
  color: var(--tg-hint, #999999);
}
.chevron.expanded {
  transform: rotate(180deg);
}

/* Candidates within Job */
.job-candidates {
  background-color: var(--tg-bg, #ffffff);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}
.no-candidates {
  padding: 16px;
  font-size: 13px;
  color: var(--tg-hint, #999999);
  text-align: center;
}
.candidate-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
.candidate-row:last-child {
  border-bottom: none;
}
.candidate-row:active {
  background-color: var(--tg-secondary-bg, #f4f4f5);
}
.cand-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}
.cand-details {
  margin: 4px 0 0 0;
  font-size: 11px;
  color: var(--tg-hint, #999999);
}

/* Score Badge */
.score-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 6px;
}
.score-high {
  background-color: rgba(52, 199, 89, 0.15);
  color: #34c759;
}
.score-medium {
  background-color: rgba(255, 204, 0, 0.15);
  color: #b89400;
}
.score-low {
  background-color: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

/* Modals */
.tma-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background-color: var(--tg-bg, #ffffff);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 20px;
  box-sizing: border-box;
  animation: slide-up 0.25s ease-out;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--tg-hint, #999999);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--tg-hint, #999999);
  padding: 0;
  line-height: 1;
}
.modal-body {
  overflow-y: auto;
  flex: 1;
  padding-bottom: 16px;
}
.modal-user h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
}
.modal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
}
.meta-item {
  background-color: var(--tg-secondary-bg, #f4f4f5);
  padding: 10px 12px;
  border-radius: 8px;
}
.meta-item .label {
  display: block;
  font-size: 11px;
  color: var(--tg-hint, #999999);
}
.meta-item .value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-top: 4px;
}
.status-val {
  text-transform: capitalize;
}
.modal-rec {
  background-color: rgba(64, 167, 227, 0.08);
  border-left: 4px solid var(--tg-button-bg, #40a7e3);
  padding: 14px;
  border-radius: 4px 8px 8px 4px;
  margin-top: 20px;
}
.modal-rec h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
}
.modal-rec p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}
.modal-footer {
  padding-top: 12px;
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.25s ease-out;
  max-height: 500px;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  overflow: hidden;
}
</style>
