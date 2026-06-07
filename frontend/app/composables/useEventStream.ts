import type { SseEventPayload } from '~/types/sse'

export type { SseEventPayload }

// Module-level singleton — prevents double connections if useEventStream() called multiple times
let es: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0

export function useSseConnectionState() {
  return storeToRefs(useEventsStore()).connectionState
}

export function useLastSseEvent() {
  return storeToRefs(useEventsStore()).lastEvent
}

export function useSseEventCount() {
  return { eventCount: readonly(storeToRefs(useEventsStore()).eventCount) }
}

export function useEventStream() {
  const store = useEventsStore()
  const config = useRuntimeConfig()
  const toast = useToast()
  const router = useRouter()
  const { t } = useI18n()

  function eventsUrl() {
    const base = (config.public.apiBase as string).replace(/\/$/, '')
    if (import.meta.dev) {
      return '/api/v1/events'
    }
    return `${base}/api/v1/events`
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function navigateForEvent(type: string, payload: Record<string, unknown>) {
    if (type === 'new_matches' && payload.jobId && UUID_RE.test(String(payload.jobId))) {
      router.push(`/jobs/${payload.jobId}`)
    } else if (
      type === 'screening_complete' &&
      payload.applicationId &&
      UUID_RE.test(String(payload.applicationId))
    ) {
      router.push(`/applications/${payload.applicationId}`)
    } else if (
      type === 'new_message' &&
      payload.conversationId &&
      UUID_RE.test(String(payload.conversationId))
    ) {
      router.push(`/conversations/${payload.conversationId}`)
    }
  }

  function connect() {
    if (typeof EventSource === 'undefined') return
    if (es) return

    store.connectionState = 'reconnecting'
    es = new EventSource(eventsUrl(), { withCredentials: true })

    es.onopen = () => {
      store.connectionState = 'connected'
      reconnectAttempt = 0
    }

    es.onmessage = (e) => {
      store.connectionState = 'connected'
      store.eventCount++
      try {
        const data = JSON.parse(e.data) as SseEventPayload
        store.lastEvent = { ...data, timestamp: new Date().toISOString() } as SseEventPayload & {
          timestamp: string
        }
        const { type, payload } = data
        const p = payload ?? {}

        if (type === 'new_matches') {
          toast.add({
            title: t('events.newMatches', { count: p.count ?? 0 }),
            description: String(p.jobTitle ?? ''),
            color: 'success',
            duration: 8000,
            actions: p.jobId
              ? [{ label: t('events.viewJob'), onClick: () => navigateForEvent(type, p) }]
              : [],
          })
        } else if (type === 'screening_complete') {
          toast.add({
            title: t('events.screeningComplete'),
            description: t('events.screeningReady'),
            color: 'info',
            duration: 8000,
            actions: p.applicationId
              ? [{ label: t('events.review'), onClick: () => navigateForEvent(type, p) }]
              : [],
          })
        } else if (type === 'new_message') {
          toast.add({
            title: t('events.newMessage'),
            color: 'info',
            duration: 5000,
            actions: p.conversationId
              ? [{ label: t('events.open'), onClick: () => navigateForEvent(type, p) }]
              : [],
          })
        } else if (type === 'agent.thought') {
          store.pushAgentThought({
            agent: String(p.agent ?? 'Agent'),
            action: (p.action as 'started' | 'completed' | 'failed') ?? 'started',
            purpose: String(p.purpose ?? ''),
            latency: p.latency as number | undefined,
            cost: p.cost as number | undefined,
            provider: p.provider as string | undefined,
            ts: Date.now(),
          })
        }
      } catch {
        /* ignore parse errors */
      }
    }

    es.onerror = () => {
      store.connectionState = 'reconnecting'
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
    store.connectionState = 'idle'
  }

  return { connect, disconnect }
}
