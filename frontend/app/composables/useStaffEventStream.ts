import type { StaffSseEventPayload, IngestionProgressPayload } from '~/types/sse'

export type { StaffSseEventPayload, IngestionProgressPayload }

export function useStaffSseConnectionState() {
  return storeToRefs(useStaffEventsStore()).connectionState
}

export function useLastStaffSseEvent() {
  return storeToRefs(useStaffEventsStore()).lastEvent
}

export function useStaffSseEventCount() {
  return { eventCount: readonly(storeToRefs(useStaffEventsStore()).eventCount) }
}

export function useStaffEventStream() {
  const store = useStaffEventsStore()
  const config = useRuntimeConfig()
  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0

  function eventsUrl() {
    const base = (config.public.apiBase as string).replace(/\/$/, '')
    if (import.meta.dev) {
      return '/api/v1/staff-events'
    }
    return `${base}/api/v1/staff-events`
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
      if (!e.data) return
      store.connectionState = 'connected'
      store.eventCount++
      try {
        const data = JSON.parse(e.data) as StaffSseEventPayload
        store.lastEvent = { ...data, timestamp: new Date().toISOString() }
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
