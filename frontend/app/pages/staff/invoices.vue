<script setup lang="ts">
import type { Invoice } from '~/types/api'

definePageMeta({ layout: 'staff' })

const api = useStaffApi()
const statusFilter = ref('')

const {
  data: invoices,
  pending,
  refresh,
} = await useAsyncData('staff-invoices', () =>
  api.get<Invoice[]>(
    '/api/v1/staff/invoices',
    statusFilter.value ? { status: statusFilter.value } : undefined,
  ),
)

watch(statusFilter, () => refresh())

const statusOptions = [
  { label: 'All', value: '' },
  ...['draft', 'issued', 'paid', 'overdue', 'cancelled'].map((s) => ({ label: s, value: s })),
]

const totalPending = computed(() =>
  (invoices.value ?? [])
    .filter((i) => ['issued', 'overdue'].includes(i.status))
    .reduce((acc: number, i) => acc + Number(i.totalUzs ?? 0), 0),
)

const columns: any[] = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'company', label: 'Company' },
  { key: 'candidate', label: 'Candidate / Job' },
  { key: 'total', label: 'Total' },
  { key: 'dueDate', label: 'Due' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--ink-subtle);
              margin-bottom: 8px;
            "
          >
            Staff · Finance
          </p>
          <h1
            style="
              font-family: 'Fraunces', serif;
              font-size: 32px;
              line-height: 1.05;
              letter-spacing: -0.035em;
              color: var(--ink);
              font-weight: 400;
            "
          >
            Invoices
          </h1>
        </div>
        <div
          class="rounded-lg px-4 py-2 text-sm shrink-0"
          style="background: var(--bg-elevated); border: 1px solid var(--line)"
        >
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--ink-subtle);
              margin-bottom: 2px;
            "
          >
            Pending
          </p>
          <p class="font-bold" style="color: var(--warn)">
            {{ totalPending.toLocaleString() }} UZS
          </p>
        </div>
      </div>
    </div>

    <USelect v-model="statusFilter" :options="statusOptions" class="w-44" />

    <UCard :ui="{ body: 'p-0' }">
      <UTable
        :data="invoices ?? []"
        :columns="columns"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-document-text', label: 'No invoices' }"
      >
        <template #invoiceNumber-cell="{ row: { original: row } }">
          <span class="font-mono text-sm font-medium" style="color: var(--ink)">{{
            row.invoiceNumber
          }}</span>
        </template>
        <template #company-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            row.company?.name ?? '—'
          }}</span>
        </template>
        <template #candidate-cell="{ row: { original: row } }">
          <div>
            <p class="text-sm" style="color: var(--ink)">
              {{ row.placement?.candidate?.fullName ?? '—' }}
            </p>
            <p class="text-xs" style="color: var(--ink-subtle)">
              {{ row.placement?.job?.title ?? '—' }}
            </p>
          </div>
        </template>
        <template #total-cell="{ row: { original: row } }">
          <span class="font-mono text-sm" style="color: var(--ink)">{{
            formatSalary(row.totalUzs)
          }}</span>
        </template>
        <template #dueDate-cell="{ row: { original: row } }">
          <span
            class="text-sm"
            :style="{
              color: row.status === 'overdue' ? 'var(--accent)' : 'var(--ink-muted)',
              fontWeight: row.status === 'overdue' ? '500' : 'normal',
            }"
          >
            {{ formatDate(row.dueDate) }}
          </span>
        </template>
        <template #status-cell="{ row: { original: row } }">
          <UBadge :color="invoiceStatusColor(row.status)" variant="subtle" size="xs">{{
            row.status
          }}</UBadge>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
