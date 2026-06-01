import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStaffEventStream } from './useStaffEventStream'

class MockEventSource {
  url: string
  options: any
  onopen: (() => void) | null = null
  onmessage: ((ev: any) => void) | null = null
  onerror: (() => void) | null = null
  constructor(url: string, options: any) {
    this.url = url
    this.options = options
    MockEventSource.instance = this
  }
  close = vi.fn()
  static instance: MockEventSource | null = null
}

const { mockStaffEventsStore } = vi.hoisted(() => {
  return {
    mockStaffEventsStore: {
      connectionState: 'idle',
      eventCount: 0,
      lastEvent: null,
    },
  }
})

mockNuxtImport('useStaffEventsStore', () => {
  return () => mockStaffEventsStore
})

mockNuxtImport('useRuntimeConfig', (original) => {
  return () => {
    const originalConfig = original()
    return {
      ...originalConfig,
      public: {
        ...originalConfig.public,
        apiBase: 'http://localhost:3000',
      },
    }
  }
})

describe('useStaffEventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.EventSource = MockEventSource as any
    mockStaffEventsStore.connectionState = 'idle'
    mockStaffEventsStore.eventCount = 0
    mockStaffEventsStore.lastEvent = null
  })

  afterEach(() => {
    const { disconnect } = useStaffEventStream()
    disconnect()
  })

  it('connects to Staff SSE and updates connectionState on open', () => {
    const { connect } = useStaffEventStream()
    connect()

    expect(MockEventSource.instance).not.toBeNull()
    expect(MockEventSource.instance?.url).toBe('http://localhost:3000/api/v1/staff-events')
    expect(mockStaffEventsStore.connectionState).toBe('reconnecting')

    MockEventSource.instance?.onopen?.()
    expect(mockStaffEventsStore.connectionState).toBe('connected')
  })

  it('processes incoming staff events', () => {
    const { connect } = useStaffEventStream()
    connect()
    MockEventSource.instance?.onopen?.()

    const mockEvent = {
      data: JSON.stringify({
        type: 'ingestion_progress',
        payload: { completed: 10, total: 100 },
      }),
    }

    MockEventSource.instance?.onmessage?.(mockEvent)

    expect(mockStaffEventsStore.eventCount).toBe(1)
    expect(mockStaffEventsStore.lastEvent).toEqual(
      expect.objectContaining({ type: 'ingestion_progress' }),
    )
  })
})
