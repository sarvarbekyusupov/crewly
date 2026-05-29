<script setup lang="ts">
import type { Invoice, PaginatedResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
useHead({ title: computed(() => t('invoices.title')) })
const api = useApi()

const statusFilter = ref('')
const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData('invoices', () =>
  api.get<PaginatedResponse<Invoice>>('/api/v1/invoices', {
    ...(statusFilter.value && { status: statusFilter.value }),
    page: page.value,
    limit,
  }),
)

const invoices = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watch(statusFilter, () => {
  page.value = 1
  refresh()
})
watch(page, () => refresh())

const { invoiceStatusLabel } = useStatusLabels()

const statusOptions = [
  { label: t('common.all'), value: '' },
  ...['draft', 'issued', 'paid', 'overdue', 'cancelled'].map((s) => ({
    label: invoiceStatusLabel(s),
    value: s,
  })),
]

const columns: any[] = [
  { key: 'invoiceNumber', label: t('invoices.number') },
  { key: 'candidate', label: t('common.candidate') },
  { key: 'job', label: t('nav.jobs') },
  { key: 'total', label: t('invoices.amount') },
  { key: 'dueDate', label: t('invoices.dueDate') },
  { key: 'status', label: t('common.status') },
  { key: 'actions', label: '' },
]

const totalPending = computed(() => Number(result.value?.pendingTotal ?? 0))
</script>

<template>
  <div class="space-y-5">
    <CommonPageHead
      eyebrow="Finance"
      :title="t('invoices.title')"
      :subtitle="`${totalPending.toLocaleString()} UZS pending`"
    >
      <template #default>
        <div class="mt-4">
          <USelect v-model="statusFilter" :options="statusOptions" class="w-44" />
        </div>
      </template>
    </CommonPageHead>

    <UCard :ui="{ body: 'p-0' }">
      <UTable :data="(invoices) as any[]" :columns="columns" :loading="pending">
        <template #empty>
          <div class="flex flex-col items-center py-14 gap-3">
            <UIcon
              name="i-heroicons-document-text"
              class="w-10 h-10"
              style="color: var(--ink-subtle)"
            />
            <p
              style="
                font-family: 'Fraunces', serif;
                font-size: 22px;
                color: var(--ink);
                font-weight: 400;
              "
            >
              No invoices found
            </p>
            <p style="font-size: 13px; color: var(--ink-muted)">
              Invoices are generated automatically from placements.
            </p>
          </div>
        </template>

        <template #invoiceNumber-cell="{ row: { original: row } }">
          <span class="font-mono text-sm font-medium" style="color: var(--ink)">{{
            row.invoiceNumber
          }}</span>
        </template>

        <template #candidate-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink)">{{
            row.placement?.candidate?.fullName ?? '—'
          }}</span>
        </template>

        <template #job-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            row.placement?.job?.title ?? '—'
          }}</span>
        </template>

        <template #total-cell="{ row: { original: row } }">
          <span class="font-mono text-sm font-medium" style="color: var(--ink)">{{
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
          <UBadge :color="invoiceStatusColor(row.status)" variant="subtle" size="xs">
            {{ invoiceStatusLabel(row.status) }}
          </UBadge>
        </template>

        <template #actions-cell="{ row: { original: row } }">
          <UButton variant="ghost" size="xs" icon="i-heroicons-eye" :to="`/invoices/${row.id}`" />
        </template>
      </UTable>

      <div
        v-if="total > limit"
        class="flex justify-center px-4 pb-4 pt-2"
        style="border-top: 1px solid var(--line-soft)"
      >
        <UPagination v-model="page" :total="total" :page-size="limit" />
      </div>
    </UCard>
  </div>
</template>
