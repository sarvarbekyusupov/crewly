import { useEventBus } from '@vueuse/core'

export interface ScoringLogEntry {
  icon: string
  text: string
  ts: number
}

export const scoringActive = ref(false)
export const scoringProgress = ref({ done: 0, total: 0 })
export const scoringLog = ref<ScoringLogEntry[]>([])
export const resumeParseStatus = ref<'idle' | 'parsing' | 'done' | 'error'>('idle')
export const newMessageApplicationIds = ref<Set<string>>(new Set())

export function clearNewMessage(applicationId: string) {
  const next = new Set(newMessageApplicationIds.value)
  next.delete(applicationId)
  newMessageApplicationIds.value = next
}

export const scoringCompleteBus = useEventBus<void>('candidate:scoring-complete')

let es: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0

function candidateEventsUrl() {
  if (import.meta.dev) return '/api/v1/candidate-portal/events'
  const config = useRuntimeConfig()
  const base = (config.public.apiBase as string).replace(/\/$/, '')
  return `${base}/api/v1/candidate-portal/events`
}

function handleEvent(type: string, payload: Record<string, unknown>) {
  if (type === 'scoring_started') {
    scoringActive.value = true
    scoringProgress.value = { done: 0, total: Number(payload.total ?? 0) }
    scoringLog.value = [
      { icon: '🔍', text: `Scanning ${payload.total} jobs…`, ts: Date.now() },
    ]
  } else if (type === 'scoring_batch') {
    const { batchNum, batchTotal, scored } = payload as Record<string, number>
    const n = scored ?? 0
    scoringProgress.value.done += n
    scoringLog.value.push({
      icon: '✓',
      text: `Batch ${batchNum}/${batchTotal} — ${n} jobs scored`,
      ts: Date.now(),
    })
  } else if (type === 'new_message') {
    const appId = payload.applicationId as string | undefined
    if (appId) {
      const next = new Set(newMessageApplicationIds.value)
      next.add(appId)
      newMessageApplicationIds.value = next
    }
  } else if (type === 'resume_parse_progress') {
    const status = payload.status as 'parsing' | 'done' | 'error'
    resumeParseStatus.value = status
    if (status === 'done' || status === 'error') {
      setTimeout(() => { resumeParseStatus.value = 'idle' }, 5000)
    }
  } else if (type === 'scoring_complete') {
    scoringActive.value = false
    scoringLog.value.push({
      icon: '⚡',
      text: `Done — ${payload.total} jobs analyzed`,
      ts: Date.now(),
    })
    scoringCompleteBus.emit()
    setTimeout(() => {
      scoringLog.value = []
      scoringProgress.value = { done: 0, total: 0 }
    }, 8000)
  }
}

export function useCandidateEventStream() {
  function connect() {
    if (typeof EventSource === 'undefined') return
    if (es) return

    es = new EventSource(candidateEventsUrl(), { withCredentials: true })

    es.onopen = () => {
      reconnectAttempt = 0
    }

    es.onmessage = (e) => {
      if (!e.data) return
      try {
        const { type, payload } = JSON.parse(e.data)
        handleEvent(type, payload ?? {})
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es?.close()
      es = null
      const delay = Math.min(30_000, 1_000 * Math.pow(2, reconnectAttempt))
      reconnectAttempt++
      reconnectTimer = setTimeout(connect, delay)
    }
  }

  function disconnect() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    es?.close()
    es = null
  }

  return { connect, disconnect }
}
