import type { SseEventPayload } from '~/types/sse'

export interface AgentThought {
  agent: string
  action: 'started' | 'completed' | 'failed'
  purpose: string
  latency?: number
  cost?: number
  provider?: string
  ts: number
}

export const useEventsStore = defineStore('events', () => {
  const connectionState = ref<'connected' | 'reconnecting' | 'idle'>('idle')
  const eventCount = ref(0)
  const lastEvent = ref<SseEventPayload | null>(null)
  const agentThoughts = ref<AgentThought[]>([])

  function pushAgentThought(thought: AgentThought) {
    agentThoughts.value.unshift(thought)
    if (agentThoughts.value.length > 6) agentThoughts.value.pop()
  }

  return { connectionState, eventCount, lastEvent, agentThoughts, pushAgentThought }
})
