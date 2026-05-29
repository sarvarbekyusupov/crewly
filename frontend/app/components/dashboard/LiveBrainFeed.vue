<script setup lang="ts">
const { t } = useI18n()
const lastEvent = useLastSseEvent()

interface LogEntry {
  id: string
  timestamp: string
  agent: string
  message: string
  type: 'info' | 'success' | 'error' | 'thought'
}

const logs = ref<LogEntry[]>([])
const terminalRef = ref<HTMLElement | null>(null)

watch(lastEvent, (val) => {
  if (!val || val.type !== 'agent.thought') return

  const p = val.payload as any
  let message = ''
  let type: LogEntry['type'] = 'thought'

  if (p.action === 'started') {
    message = `${p.purpose.replace(/_/g, ' ')}...`
    type = 'info'
  } else if (p.action === 'completed') {
    message = `Finished ${p.purpose.replace(/_/g, ' ')} ($${Number(p.cost || 0).toFixed(4)})`
    type = 'success'
  } else if (p.action === 'failed') {
    message = `Failed: ${p.error || 'Unknown error'}`
    type = 'error'
  }

  logs.value.push({
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toLocaleTimeString(),
    agent: p.agent,
    message,
    type,
  })

  // Keep only last 50 logs
  if (logs.value.length > 50) {
    logs.value.shift()
  }

  // Auto-scroll
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="terminal-container">
    <div ref="terminalRef" class="terminal-body">
      <div v-if="!logs.length" class="terminal-empty">
        {{ t('dashboard.brainFeedEmpty') }}
      </div>
      <div v-for="log in logs" :key="log.id" class="terminal-line">
        <span class="line-time">[{{ log.timestamp }}]</span>
        <span class="line-agent">{{ log.agent }}:</span>
        <span class="line-msg" :class="`msg-${log.type}`">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-container {
  background: #0d0d0d;
  border-radius: 12px;
  border: 1px solid #333;
  padding: 12px;
  height: 200px;
  display: flex;
  flex-direction: column;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.terminal-body {
  flex: 1;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}

.terminal-body::-webkit-scrollbar {
  width: 4px;
}
.terminal-body::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

.terminal-empty {
  color: #444;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: italic;
}

.terminal-line {
  margin-bottom: 2px;
  white-space: pre-wrap;
  word-break: break-all;
}

.line-time {
  color: #555;
  margin-right: 8px;
}

.line-agent {
  color: #aaa;
  font-weight: 600;
  margin-right: 8px;
}

.line-msg {
  color: #eee;
}

.msg-info {
  color: #888;
}
.msg-success {
  color: #4ade80;
}
.msg-error {
  color: #f87171;
}
.msg-thought {
  color: #60a5fa;
}
</style>
