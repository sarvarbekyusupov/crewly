import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStaffEventsStore } from './staff-events'

describe('Staff Events Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useStaffEventsStore()
    expect(store.connectionState).toBe('idle')
    expect(store.eventCount).toBe(0)
    expect(store.lastEvent).toBeNull()
  })

  it('allows state updates', () => {
    const store = useStaffEventsStore()
    store.connectionState = 'reconnecting'
    store.eventCount = 12
    store.lastEvent = { type: 'ingestion_progress', data: {} } as any

    expect(store.connectionState).toBe('reconnecting')
    expect(store.eventCount).toBe(12)
    expect(store.lastEvent).toEqual({ type: 'ingestion_progress', data: {} })
  })
})
