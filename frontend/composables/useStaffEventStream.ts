import { readonly, ref } from 'vue'

export type StaffSseEventPayload = {
  type: string
  payload: Record<string, any>
  timestamp?: string
}

const connectionState = ref<'connected' | 'reconnecting' | 'idle'>('idle')
const eventCount = ref(0)
const lastEvent = ref<StaffSseEventPayload | null>(null)

export function useStaffSseConnectionState() {
  return connectionState
}

export function useLastStaffSseEvent() {
  return lastEvent
}

export function useStaffSseEventCount() {
  return { eventCount: readonly(eventCount) }
}

export function useStaffEventStream() {
  const config = useRuntimeConfig()
  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

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

    connectionState.value = 'reconnecting'
    es = new EventSource(eventsUrl(), { withCredentials: true })

    es.onopen = () => {
      connectionState.value = 'connected'
    }

    es.onmessage = (e) => {
      if (!e.data) return
      connectionState.value = 'connected'
      eventCount.value++
      try {
        const data = JSON.parse(e.data) as StaffSseEventPayload
        lastEvent.value = { ...data, timestamp: new Date().toISOString() }
      } catch {
        /* ignore parse errors */
      }
    }

    es.onerror = () => {
      connectionState.value = 'reconnecting'
      es?.close()
      es = null
      reconnectTimer = setTimeout(connect, 5000)
    }
  }

  function disconnect() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    es?.close()
    es = null
    connectionState.value = 'idle'
  }

  return { connect, disconnect }
}
