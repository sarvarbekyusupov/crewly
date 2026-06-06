import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventsStore, type AgentThought } from './events'

const makeThought = (overrides: Partial<AgentThought> = {}): AgentThought => ({
  agent: 'Matchmaker',
  action: 'started',
  purpose: 'match_rerank',
  ts: Date.now(),
  ...overrides,
})

describe('Events Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useEventsStore()
    expect(store.connectionState).toBe('idle')
    expect(store.eventCount).toBe(0)
    expect(store.lastEvent).toBeNull()
    expect(store.agentThoughts).toEqual([])
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

  it('pushAgentThought prepends thoughts (newest first)', () => {
    const store = useEventsStore()
    store.pushAgentThought(makeThought({ purpose: 'first' }))
    store.pushAgentThought(makeThought({ purpose: 'second' }))

    expect(store.agentThoughts[0].purpose).toBe('second')
    expect(store.agentThoughts[1].purpose).toBe('first')
  })

  it('pushAgentThought caps list at 6 entries', () => {
    const store = useEventsStore()
    for (let i = 0; i < 8; i++) {
      store.pushAgentThought(makeThought({ purpose: `call-${i}` }))
    }
    expect(store.agentThoughts).toHaveLength(6)
    expect(store.agentThoughts[0].purpose).toBe('call-7')
  })

  it('pushAgentThought stores all AgentThought fields', () => {
    const store = useEventsStore()
    const thought: AgentThought = {
      agent: 'SourcingHunter',
      action: 'completed',
      purpose: 'sourcing_queries',
      latency: 842,
      cost: 0.00032,
      provider: 'groq',
      ts: 1234567890,
    }
    store.pushAgentThought(thought)

    expect(store.agentThoughts[0]).toEqual(thought)
  })

  it('pushAgentThought works with minimal fields (no optional)', () => {
    const store = useEventsStore()
    store.pushAgentThought(makeThought({ action: 'failed' }))
    expect(store.agentThoughts[0].action).toBe('failed')
    expect(store.agentThoughts[0].latency).toBeUndefined()
    expect(store.agentThoughts[0].cost).toBeUndefined()
  })
})
