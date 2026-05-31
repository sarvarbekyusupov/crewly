import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventsStore } from './events'

describe('Events Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useEventsStore()
    expect(store.connectionState).toBe('idle')
    expect(store.eventCount).toBe(0)
    expect(store.lastEvent).toBeNull()
  })

  it('allows state updates', () => {
    const store = useEventsStore()
    store.connectionState = 'connected'
    store.eventCount = 5
    store.lastEvent = { type: 'new_matches', data: {} } as any

    expect(store.connectionState).toBe('connected')
    expect(store.eventCount).toBe(5)
    expect(store.lastEvent).toEqual({ type: 'new_matches', data: {} })
  })
})
