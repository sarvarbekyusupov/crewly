<template>
  <div class="page">
    <header class="top-bar">
      <div>
        <h1>Pipeline</h1>
        <p class="sub">{{ profile?.name ?? profile?.email ?? 'HR' }}</p>
      </div>
      <span class="badge">HR</span>
    </header>

    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <div v-else-if="error" class="empty">
      <p>{{ error }}</p>
      <button class="btn" @click="load">Обновить</button>
    </div>

    <div v-else-if="!apps.length" class="empty">
      <p>Нет кандидатов в работе.</p>
    </div>

    <div v-else class="list">
      <div v-for="(group, jobTitle) in grouped" :key="jobTitle" class="job-group">
        <div class="group-title">{{ jobTitle }}</div>

        <div v-for="app in group" :key="app.id" class="card" @click="openCandidate(app)">
          <div class="card-top">
            <div class="cand-name">{{ app.candidate.fullName || 'Без имени' }}</div>
            <div class="score" :class="scoreClass(app.matchScore)">
              {{ app.matchScore ?? '—' }}%
            </div>
          </div>
          <div class="cand-meta">
            {{ app.candidate.currentPosition || '' }}
            <span v-if="app.candidate.city">• {{ app.candidate.city }}</span>
          </div>
          <div class="status-row">
            <span class="status-badge">{{ statusLabel(app.status) }}</span>
          </div>

          <div class="actions" @click.stop>
            <button
              class="action-btn approve"
              :disabled="!!actionLoading[app.id]"
              @click="approve(app)"
            >
              {{ actionLoading[app.id] === 'approve' ? '...' : '✓ Одобрить' }}
            </button>
            <button
              class="action-btn reject"
              :disabled="!!actionLoading[app.id]"
              @click="reject(app)"
            >
              {{ actionLoading[app.id] === 'reject' ? '...' : '✗ Отклонить' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tma', auth: false, robots: 'noindex, nofollow', middleware: ['tma-hr'] })

const router = useRouter()
const tmaStore = useTmaStore()
const { hapticSuccess, hapticError, hapticImpact } = useTma()

const profile = tmaStore.profile
const apps = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionLoading = ref<Record<string, 'approve' | 'reject' | false>>({})

const grouped = computed(() => {
  const g: Record<string, any[]> = {}
  for (const app of apps.value) {
    const key = app.job?.title ?? 'Без вакансии'
    if (!g[key]) g[key] = []
    g[key].push(app)
  }
  return g
})

const STATUS_LABELS: Record<string, string> = {
  matched: 'Подобрать',
  outreach_sent: 'Написали',
  responded: 'Ответил',
  screening: 'Скрининг',
  in_review: 'На рассмотрении',
  offered: 'Оффер',
}

function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s
}

function scoreClass(score: number | null) {
  if (!score) return 'gray'
  if (score >= 85) return 'high'
  if (score >= 65) return 'med'
  return 'low'
}

function openCandidate(app: any) {
  hapticImpact('light')
  router.push(`/tma/hr/candidate/${app.id}`)
}

async function approve(app: any) {
  actionLoading.value[app.id] = 'approve'
  try {
    await tmaStore.apiPost(`/api/v1/tma/hr/applications/${app.id}/approve`)
    hapticSuccess()
    apps.value = apps.value.filter((a) => a.id !== app.id)
  } catch {
    hapticError()
  } finally {
    actionLoading.value[app.id] = false
  }
}

async function reject(app: any) {
  actionLoading.value[app.id] = 'reject'
  try {
    await tmaStore.apiPost(`/api/v1/tma/hr/applications/${app.id}/reject`, {})
    hapticSuccess()
    apps.value = apps.value.filter((a) => a.id !== app.id)
  } catch {
    hapticError()
  } finally {
    actionLoading.value[app.id] = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    apps.value = await tmaStore.apiGet<any[]>('/api/v1/tma/hr/pipeline')
  } catch {
    error.value = 'Не удалось загрузить пайплайн'
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

.badge {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
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
  gap: 16px;
}

.group-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--tg-theme-hint-color);
  padding: 0 4px 8px;
}

.job-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
}

.card:active {
  opacity: 0.9;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.cand-name {
  font-weight: 600;
  font-size: 15px;
  flex: 1;
}

.score {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
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

.cand-meta {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 8px;
}

.status-row {
  margin-bottom: 12px;
}

.status-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(153, 153, 153, 0.12);
  color: var(--tg-theme-hint-color);
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
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
