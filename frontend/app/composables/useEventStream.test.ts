import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useEventStream } from './useEventStream'

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

const { mockToastAdd, mockPush, mockPushAgentThought, mockEventsStore } = vi.hoisted(() => {
  const mockPushAgentThought = vi.fn()
  return {
    mockToastAdd: vi.fn(),
    mockPush: vi.fn(),
    mockPushAgentThought,
    mockEventsStore: {
      connectionState: 'idle',
      eventCount: 0,
      lastEvent: null,
      agentThoughts: [] as any[],
      pushAgentThought: mockPushAgentThought,
    },
  }
})

mockNuxtImport('useEventsStore', () => {
  return () => mockEventsStore
})

mockNuxtImport('useToast', () => {
  return () => ({
    add: mockToastAdd,
  })
})

mockNuxtImport('useRouter', (original) => {
  return () => {
    const originalRouter = original()
    return {
      ...originalRouter,
      push: mockPush,
    }
  }
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
  })
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

describe('useEventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.EventSource = MockEventSource as any
    mockEventsStore.connectionState = 'idle'
    mockEventsStore.eventCount = 0
    mockEventsStore.lastEvent = null
    mockEventsStore.agentThoughts = []
  })

  afterEach(() => {
    const { disconnect } = useEventStream()
    disconnect()
  })

  it('connects to SSE and updates connectionState on open', () => {
    const { connect } = useEventStream()
    connect()

    expect(MockEventSource.instance).not.toBeNull()
    expect(MockEventSource.instance?.url).toBe('http://localhost:3000/api/v1/events')
    expect(mockEventsStore.connectionState).toBe('reconnecting')

    MockEventSource.instance?.onopen?.()
    expect(mockEventsStore.connectionState).toBe('connected')
  })

  it('processes incoming matches messages and triggers toast', () => {
    const { connect } = useEventStream()
    connect()
    MockEventSource.instance?.onopen?.()

    const mockEvent = {
      data: JSON.stringify({
        type: 'new_matches',
        payload: { jobId: '12345678-1234-1234-1234-1234567890ab', count: 3, jobTitle: 'Developer' },
      }),
    }

    MockEventSource.instance?.onmessage?.(mockEvent)

    expect(mockEventsStore.eventCount).toBe(1)
    expect(mockEventsStore.lastEvent).toEqual(expect.objectContaining({ type: 'new_matches' }))
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'events.newMatches',
        color: 'success',
      }),
    )
  })

  it('disconnects and closes EventSource', () => {
    const { connect, disconnect } = useEventStream()
    connect()
    const esInstance = MockEventSource.instance
    disconnect()

    expect(esInstance?.close).toHaveBeenCalled()
    expect(mockEventsStore.connectionState).toBe('idle')
  })

  it('agent.thought started event calls pushAgentThought with correct shape', () => {
    const { connect } = useEventStream()
    connect()
    MockEventSource.instance?.onopen?.()

    MockEventSource.instance?.onmessage?.({
      data: JSON.stringify({
        type: 'agent.thought',
        payload: {
          agent: 'Matchmaker',
          action: 'started',
          purpose: 'match_rerank',
        },
      }),
    })

    expect(mockPushAgentThought).toHaveBeenCalledOnce()
    expect(mockPushAgentThought).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'Matchmaker',
        action: 'started',
        purpose: 'match_rerank',
        ts: expect.any(Number),
      }),
    )
  })

  it('agent.thought completed event includes latency and cost', () => {
    const { connect } = useEventStream()
    connect()
    MockEventSource.instance?.onopen?.()

    MockEventSource.instance?.onmessage?.({
      data: JSON.stringify({
        type: 'agent.thought',
        payload: {
          agent: 'SourcingHunter',
          action: 'completed',
          purpose: 'sourcing_queries',
          latency: 1240,
          cost: 0.00041,
          provider: 'groq',
        },
      }),
    })

    expect(mockPushAgentThought).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'SourcingHunter',
        action: 'completed',
        latency: 1240,
        cost: 0.00041,
        provider: 'groq',
      }),
    )
  })

  it('agent.thought with missing fields falls back to defaults', () => {
    const { connect } = useEventStream()
    connect()
    MockEventSource.instance?.onopen?.()

    MockEventSource.instance?.onmessage?.({
      data: JSON.stringify({
        type: 'agent.thought',
        payload: {},
      }),
    })

    expect(mockPushAgentThought).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'Agent',
        action: 'started',
        purpose: '',
      }),
    )
  })
})
