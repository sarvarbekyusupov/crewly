<script setup lang="ts">
import { type PaginatedConsentRecords, type ConsentRecord } from '~/types/api'

definePageMeta({ middleware: 'staff-auth', layout: 'staff' })

const api = useApi()
useHead({ title: 'Consent Records' })

const page = ref(1)
const limit = 50

const { data: result, pending, refresh } = await useAsyncData(
  'consent-records',
  () => api.get<PaginatedConsentRecords>('/api/v1/staff/consent', { query: { page: String(page.value), limit: String(limit) } as any }).catch(() => null),
  { watch: [page] }
)

const rows = computed<ConsentRecord[]>(() => result.value?.data ?? [])

const columns = [
  { key: 'recordedAt', label: 'Timestamp' },
  { key: 'candidate', label: 'Candidate' },
  { key: 'action', label: 'Action' },
  { key: 'basis', label: 'Basis' },
  { key: 'ipAddress', label: 'IP Address' }
]

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(d))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-4" style="border-bottom: 1px solid var(--line)">
      <div>
        <h1 class="font-serif text-2xl font-normal" style="color: var(--ink); letter-spacing: -0.02em">
          Consent Records
        </h1>
        <p class="text-sm mt-1" style="color: var(--ink-muted)">Candidate data processing consent log.</p>
      </div>
      <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-path" @click="() => refresh()" />
    </div>

    <UCard :ui="{ body: { padding: 'p-0' } as any }">
      <UTable :rows="rows as any[]" :columns="columns as any[]" :loading="pending">
        <template #recordedAt-data="{ row }">
          <span class="text-xs" style="color: var(--ink)">{{ formatDateTime((row as any).recordedAt) }}</span>
        </template>
        <template #candidate-data="{ row }">
          <div class="text-xs">
            <span class="font-medium" style="color: var(--ink)">{{ (row as any).candidate?.fullName || 'Unknown' }}</span>
            <span v-if="(row as any).candidate?.email" class="block" style="color: var(--ink-muted)">{{ (row as any).candidate.email }}</span>
            <span class="font-mono text-[10px] block" style="color: var(--ink-subtle)">{{ (row as any).candidateId }}</span>
          </div>
        </template>
        <template #action-data="{ row }">
          <UBadge 
            :color="(row as any).action === 'withdrawn' ? 'error' : (row as any).action === 'granted' ? 'success' : 'neutral'" 
            variant="subtle" 
            size="xs"
          >
            {{ (row as any).action }}
          </UBadge>
        </template>
        <template #basis-data="{ row }">
          <span class="font-mono text-xs" style="color: var(--ink-muted)">{{ (row as any).basis }}</span>
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
