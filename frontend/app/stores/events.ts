import type { SseEventPayload } from '~/types/sse'

export const useEventsStore = defineStore('events', () => {
  const connectionState = ref<'connected' | 'reconnecting' | 'idle'>('idle')
  const eventCount = ref(0)
  const lastEvent = ref<SseEventPayload | null>(null)

  return { connectionState, eventCount, lastEvent }
})
