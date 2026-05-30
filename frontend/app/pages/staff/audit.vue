<script setup lang="ts">
import type { PaginatedAuditLogs, AuditLog } from '~/types/api'

definePageMeta({ middleware: 'staff-auth', layout: 'staff' })

const api = useStaffApi()
useHead({ title: 'Audit Log' })

const page = ref(1)
const limit = 50

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData(
  'audit-logs',
  () =>
    api
      .get<PaginatedAuditLogs>('/api/v1/staff/audit', {
        query: { page: String(page.value), limit: String(limit) },
      })
      .catch(() => null),
  { watch: [page] },
)

const rows = computed<AuditLog[]>(() => result.value?.data ?? [])

const columns: any[] = [
  { key: 'id', label: 'ID' },
  { key: 'createdAt', label: 'Timestamp' },
  { key: 'actor', label: 'Actor' },
  { key: 'action', label: 'Action' },
  { key: 'resource', label: 'Resource' },
  { key: 'ipAddress', label: 'IP Address' },
]

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(d))
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex items-center justify-between pb-4"
      style="border-bottom: 1px solid var(--line)"
    >
      <div>
        <h1
          class="font-serif text-2xl font-normal"
          style="color: var(--ink); letter-spacing: -0.02em"
        >
          Audit Log
        </h1>
        <p class="text-sm mt-1" style="color: var(--ink-muted)">
          System-wide immutable action log.
        </p>
      </div>
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-path"
        @click="() => refresh()"
      />
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <UTable :data="rows" :columns="columns" :loading="pending">
        <template #id-cell="{ row: { original: row } }">
          <span class="font-mono text-xs" style="color: var(--ink-subtle)">{{ row.id }}</span>
        </template>
        <template #createdAt-cell="{ row: { original: row } }">
          <span class="text-xs" style="color: var(--ink)">{{ formatDateTime(row.createdAt) }}</span>
        </template>
        <template #actor-cell="{ row: { original: row } }">
          <div class="text-xs">
            <span class="font-medium" style="color: var(--ink)">{{ row.actorType }}</span>
            <span
              v-if="row.actorId"
              class="font-mono text-[10px] ml-1 block"
              style="color: var(--ink-muted)"
              >{{ row.actorId }}</span
            >
          </div>
        </template>
        <template #action-cell="{ row: { original: row } }">
          <span class="font-mono text-xs" style="color: var(--accent)">{{ row.action }}</span>
        </template>
        <template #resource-cell="{ row: { original: row } }">
          <div class="text-xs">
            <span style="color: var(--ink)">{{ row.resourceType }}</span>
            <span
              v-if="row.resourceId"
              class="font-mono text-[10px] ml-1 block"
              style="color: var(--ink-muted)"
              >{{ row.resourceId }}</span
            >
          </div>
        </template>
        <template #ipAddress-cell="{ row: { original: row } }">
          <span class="font-mono text-xs" style="color: var(--ink-muted)">{{
            row.ipAddress || '—'
          }}</span>
        </template>
      </UTable>

      <div
        v-if="result?.total && result.total > limit"
        class="p-4 border-t flex justify-end"
        style="border-color: var(--line)"
      >
        <UPagination v-model="page" :total="result.total" :page-count="limit" />
      </div>
    </UCard>
  </div>
</template>
