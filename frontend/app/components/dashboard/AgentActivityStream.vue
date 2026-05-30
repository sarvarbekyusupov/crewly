<script setup lang="ts">
import type { AgentActivityResponse } from '~/types/api'

const props = defineProps<{
  data: AgentActivityResponse | null
  loading: boolean
}>()

const { t, te } = useI18n()

function streamIcon(agent: string) {
  const m: Record<string, string> = {
    Matchmaker: 'i-heroicons-sparkles',
    ScreeningBot: 'i-heroicons-microphone',
    SourcingHunter: 'i-heroicons-magnifying-glass-circle',
    Coordinator: 'i-heroicons-bolt',
    System: 'i-heroicons-cpu-chip',
  }
  return m[agent] ?? 'i-heroicons-ellipsis-horizontal'
}

function streamLabel(agent: string) {
  const key = `dashboard.agents.${agent}`
  return te(key) ? t(key) : agent
}

const items = computed(() => {
  if (!props.data?.recent) return []
  return props.data.recent.map((c) => ({
    id: c.id,
    icon: streamIcon(c.agent),
    agentName: streamLabel(c.agent),
    purpose: c.purpose.replace(/_/g, ' '),
    cost: c.cost > 0 ? `$${c.cost.toFixed(4)}` : null,
    at: formatRelativeTime(c.at),
    accent: c.agent === 'Coordinator',
  }))
})
</script>

<template>
  <div>
    <div v-if="loading" class="empty-state">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin w-4 h-4 mx-auto" />
    </div>
    <div v-else-if="!items.length" class="empty-state">
      {{ t('dashboard.agentNoActivity') }}
    </div>
    <div v-else class="stream">
      <div
        v-for="item in items"
        :key="item.id"
        class="stream-item"
        :class="item.accent ? 'stream-accent' : ''"
      >
        <div class="stream-ico">
          <UIcon :name="item.icon" style="width: 13px; height: 13px" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
          <div style="display: flex; align-items: center; gap: 6px">
            <span style="font-size: 13px; color: var(--ink); line-height: 1.4; font-weight: 500">
              {{ item.agentName }}
            </span>
            <UBadge
              v-if="item.cost"
              size="xs"
              variant="soft"
              color="neutral"
              style="font-size: 9px"
            >
              {{ item.cost }}
            </UBadge>
          </div>
          <span
            style="
              font-size: 12px;
              color: var(--ink-muted);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              text-transform: capitalize;
            "
          >
            {{ item.purpose }}
          </span>
        </div>
        <span class="stream-time">{{ item.at }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stream-item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 12px;
  align-items: flex-start;
}
.stream-ico {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-deep);
  display: grid;
  place-items: center;
  color: var(--ink-muted);
  border: 1px solid var(--line-soft);
  flex-shrink: 0;
}
.stream-accent .stream-ico {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: transparent;
}
.stream-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  padding-top: 4px;
  white-space: nowrap;
}
.empty-state {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-subtle);
}
</style>
