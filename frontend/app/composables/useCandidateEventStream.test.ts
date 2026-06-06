import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useEventBus } from '@vueuse/core'

class MockEventSource {
  url: string
  options: any
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string, options: any) {
    this.url = url
    this.options = options
    MockEventSource.instance = this
  }

  close = vi.fn()
  static instance: MockEventSource | null = null
}

mockNuxtImport('useRuntimeConfig', (original) => {
  return () => {
    const orig = original()
    return {
      ...orig,
      public: { ...orig.public, apiBase: 'http://localhost:3000' },
    }
  }
})

function send(type: string, payload: Record<string, unknown>) {
  MockEventSource.instance?.onmessage?.({ data: JSON.stringify({ type, payload }) })
}

describe('useCandidateEventStream', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    globalThis.EventSource = MockEventSource as any
    MockEventSource.instance = null

    // Reset module-level state between tests
    const mod = await import('./useCandidateEventStream')
    mod.scoringActive.value = false
    mod.scoringProgress.value = { done: 0, total: 0 }
    mod.scoringLog.value = []
    mod.resumeParseStatus.value = 'idle'
  })

  afterEach(async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    useCandidateEventStream().disconnect()
    vi.useRealTimers()
  })

  it('connect creates EventSource at candidate portal URL', async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    useCandidateEventStream().connect()
    expect(MockEventSource.instance?.url).toBe(
      'http://localhost:3000/api/v1/candidate-portal/events',
    )
    expect(MockEventSource.instance?.options).toMatchObject({ withCredentials: true })
  })

  it('does not create duplicate EventSource on second connect', async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    const { connect } = useCandidateEventStream()
    connect()
    const first = MockEventSource.instance
    connect()
    expect(MockEventSource.instance).toBe(first)
  })

  it('scoring_started sets scoringActive, total, and log entry', async () => {
    const { useCandidateEventStream, scoringActive, scoringProgress, scoringLog } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    send('scoring_started', { total: 20 })

    expect(scoringActive.value).toBe(true)
    expect(scoringProgress.value.total).toBe(20)
    expect(scoringProgress.value.done).toBe(0)
    expect(scoringLog.value).toHaveLength(1)
    expect(scoringLog.value[0].icon).toBe('🔍')
    expect(scoringLog.value[0].text).toContain('20')
  })

  it('scoring_batch increments done and appends log entry', async () => {
    const { useCandidateEventStream, scoringProgress, scoringLog } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    send('scoring_started', { total: 10 })
    send('scoring_batch', { batchNum: 1, batchTotal: 2, scored: 5 })

    expect(scoringProgress.value.done).toBe(5)
    expect(scoringLog.value).toHaveLength(2)
    expect(scoringLog.value[1].icon).toBe('✓')
    expect(scoringLog.value[1].text).toContain('1/2')

    send('scoring_batch', { batchNum: 2, batchTotal: 2, scored: 5 })
    expect(scoringProgress.value.done).toBe(10)
  })

  it('scoring_complete sets scoringActive=false and emits bus', async () => {
    const { useCandidateEventStream, scoringActive, scoringLog } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    const bus = useEventBus<void>('candidate:scoring-complete')
    const busEmitted = vi.fn()
    bus.on(busEmitted)

    send('scoring_started', { total: 5 })
    send('scoring_complete', { total: 5 })

    expect(scoringActive.value).toBe(false)
    expect(scoringLog.value.at(-1)?.icon).toBe('⚡')
    expect(busEmitted).toHaveBeenCalledOnce()

    // After 8s timer, log clears
    vi.advanceTimersByTime(8000)
    expect(scoringLog.value).toHaveLength(0)
  })

  it('resume_parse_progress sets resumeParseStatus', async () => {
    const { useCandidateEventStream, resumeParseStatus } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    send('resume_parse_progress', { status: 'parsing' })
    expect(resumeParseStatus.value).toBe('parsing')

    send('resume_parse_progress', { status: 'done' })
    expect(resumeParseStatus.value).toBe('done')

    // Resets to idle after 5s
    vi.advanceTimersByTime(5000)
    expect(resumeParseStatus.value).toBe('idle')
  })

  it('resume_parse_progress error resets to idle after 5s', async () => {
    const { useCandidateEventStream, resumeParseStatus } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    send('resume_parse_progress', { status: 'error' })
    expect(resumeParseStatus.value).toBe('error')
    vi.advanceTimersByTime(5000)
    expect(resumeParseStatus.value).toBe('idle')
  })

  it('ignores malformed JSON without throwing', async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    expect(() => {
      MockEventSource.instance?.onmessage?.({ data: 'not-json{{' })
    }).not.toThrow()
  })

  it('ignores empty data message', async () => {
    const { useCandidateEventStream, scoringActive } =
      await import('./useCandidateEventStream')
    useCandidateEventStream().connect()

    MockEventSource.instance?.onmessage?.({ data: '' })
    expect(scoringActive.value).toBe(false)
  })

  it('onerror closes and schedules reconnect', async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    useCandidateEventStream().connect()
    const first = MockEventSource.instance

    MockEventSource.instance?.onerror?.()

    expect(first?.close).toHaveBeenCalled()
    // After delay, reconnects
    vi.advanceTimersByTime(1000)
    expect(MockEventSource.instance).not.toBe(first)
    expect(MockEventSource.instance).not.toBeNull()
  })

  it('disconnect closes EventSource and clears timer', async () => {
    const { useCandidateEventStream } = await import('./useCandidateEventStream')
    const { connect, disconnect } = useCandidateEventStream()
    connect()
    const inst = MockEventSource.instance

    disconnect()
    expect(inst?.close).toHaveBeenCalled()
  })
})
