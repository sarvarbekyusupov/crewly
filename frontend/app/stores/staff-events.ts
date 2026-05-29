import type { StaffSseEventPayload } from '~/types/sse'

export const useStaffEventsStore = defineStore('staff-events', () => {
  const connectionState = ref<'connected' | 'reconnecting' | 'idle'>('idle')
  const eventCount = ref(0)
  const lastEvent = ref<StaffSseEventPayload | null>(null)

  return { connectionState, eventCount, lastEvent }
})
