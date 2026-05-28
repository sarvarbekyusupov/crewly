<script setup lang="ts">
import { type PaginatedAuditLogs, type AuditLog } from '~/types/api'

definePageMeta({ middleware: 'staff-auth', layout: 'staff' })

const api = useApi()
useHead({ title: 'Audit Log' })

const page = ref(1)
const limit = 50

const { data: result, pending, refresh } = await useAsyncData(
  'audit-logs',
  () => api.get<PaginatedAuditLogs>('/api/v1/staff/audit', { query: { page: String(page.value), limit: String(limit) } as any }).catch(() => null),
  { watch: [page] }
)

const rows = computed<AuditLog[]>(() => result.value?.data ?? [])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'createdAt', label: 'Timestamp' },
  { key: 'actor', label: 'Actor' },
  { key: 'action', label: 'Action' },
  { key: 'resource', label: 'Resource' },
  { key: 'ipAddress', label: 'IP Address' }
]

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'
  }).format(new Date(d))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-4" style="border-bottom: 1px solid var(--line)">
      <div>
        <h1 class="font-serif text-2xl font-normal" style="color: var(--ink); letter-spacing: -0.02em">
          Audit Log
        </h1>
        <p class="text-sm mt-1" style="color: var(--ink-muted)">System-wide immutable action log.</p>
      </div>
      <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-path" @click="() => refresh()" />
    </div>

    <UCard :ui="{ body: { padding: 'p-0' } as any }">
      <UTable :rows="rows as any[]" :columns="columns as any[]" :loading="pending">
        <template #id-data="{ row }">
          <span class="font-mono text-xs" style="color: var(--ink-subtle)">{{ (row as any).id }}</span>
        </template>
        <template #createdAt-data="{ row }">
          <span class="text-xs" style="color: var(--ink)">{{ formatDateTime((row as any).createdAt) }}</span>
        </template>
        <template #actor-data="{ row }">
          <div class="text-xs">
            <span class="font-medium" style="color: var(--ink)">{{ (row as any).actorType }}</span>
            <span v-if="(row as any).actorId" class="font-mono text-[10px] ml-1 block" style="color: var(--ink-muted)">{{ (row as any).actorId }}</span>
          </div>
        </template>
        <template #action-data="{ row }">
          <span class="font-mono text-xs" style="color: var(--accent)">{{ (row as any).action }}</span>
        </template>
        <template #resource-data="{ row }">
          <div class="text-xs">
            <span style="color: var(--ink)">{{ (row as any).resourceType }}</span>
            <span v-if="(row as any).resourceId" class="font-mono text-[10px] ml-1 block" style="color: var(--ink-muted)">{{ (row as any).resourceId }}</span>
          </div>
        </template>
        <template #ipAddress-data="{ row }">
          <span class="font-mono text-xs" style="color: var(--ink-muted)">{{ (row as any).ipAddress || '—' }}</span>
        </template>
      </UTable>

      <div v-if="result?.total && result.total > limit" class="p-4 border-t flex justify-end" style="border-color: var(--line)">
        <UPagination
          v-model="page"
          :total="result.total"
          :page-count="limit"
        />
      </div>
    </UCard>
  </div>
</template>
