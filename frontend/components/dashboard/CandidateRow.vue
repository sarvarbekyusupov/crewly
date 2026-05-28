<script setup lang="ts">
import type { Application } from '~/types/api'

defineProps<{
  app: Application
}>()
</script>

<template>
  <NuxtLink :to="`/applications/${app.id}`" class="cand-row">
    <div class="cand-avatar">{{ app.candidate?.fullName?.[0] ?? '?' }}</div>
    <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
      <span class="cand-name">{{ app.candidate?.fullName ?? '—' }}</span>
      <span class="cand-sub">{{
        app.candidate?.currentPosition ?? app.candidate?.currentCompany ?? app.job?.title ?? '—'
      }}</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
      <span
        style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--ink-subtle)"
        >for</span
      >
      <span
        style="font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
        >{{ app.job?.title ?? '—' }}</span
      >
    </div>
    <UBadge :color="appStatusColor(app.status)" variant="subtle" size="xs">
      {{ app.status.replace(/_/g, ' ') }}
    </UBadge>
    <UIcon
      name="i-heroicons-chevron-right"
      style="width: 14px; height: 14px; color: var(--ink-subtle); flex-shrink: 0"
    />
  </NuxtLink>
</template>

<style scoped>
.cand-row {
  display: grid;
  grid-template-columns: 36px 1.6fr 1fr auto 16px;
  gap: 14px;
  align-items: center;
  padding: 12px 20px;
  margin: 0 -20px;
  border-top: 1px solid var(--line-soft);
  text-decoration: none;
  color: inherit;
  transition: background 0.12s;
}
.cand-row:hover {
  background: var(--bg-elevated);
}
.cand-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-family: 'Fraunces', serif;
  font-size: 14px;
  font-style: italic;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.cand-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cand-sub {
  font-size: 12px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
