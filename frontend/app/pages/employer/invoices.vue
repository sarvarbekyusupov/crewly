<script setup lang="ts">
import type { Invoice, PaginatedResponse } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const route = useRoute()

const isDetailRoute = computed(() => !!route.params.id)

const statusFilter = ref('')
const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
  error,
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
  { accessorKey: 'invoiceNumber', header: t('invoices.number') },
  { accessorKey: 'candidate', header: t('common.candidate') },
  { accessorKey: 'job', header: t('nav.jobs') },
  { accessorKey: 'total', header: t('invoices.amount') },
  { accessorKey: 'dueDate', header: t('invoices.dueDate') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'actions', header: '' },
]

const totalPending = computed(() => Number(result.value?.pendingTotal ?? 0))
</script>

<template>
  <EmployerMasterDetailLayout
    :is-detail-route="isDetailRoute"
    eyebrow="Finance"
    :title="t('invoices.title')"
    :subtitle="`${totalPending.toLocaleString()} UZS pending`"
  >
    <template #header-actions>
      <div class="mt-4">
        <USelect v-model="statusFilter" :items="statusOptions" class="w-44" />
      </div>
    </template>

    <template #list>
      <CommonErrorState v-if="error" :retry="() => refresh()" />
      <UCard v-else :ui="{ body: 'p-0' }">
        <UTable :data="invoices" :columns="columns" :loading="pending">
          <template #empty>
            <CommonEmptyState
              icon="i-heroicons-document-text"
              title="No invoices found"
              description="Invoices are generated automatically from placements."
            />
          </template>

          <template #invoiceNumber-cell="{ row: { original: row } }">
            <NuxtLink
              :to="`/employer/invoices/${row.id}`"
              class="font-mono text-sm font-medium text-ink hover:underline"
            >
              {{ row.invoiceNumber }}
            </NuxtLink>
          </template>

          <template #candidate-cell="{ row: { original: row } }">
            <span class="text-sm text-ink">{{ row.placement?.candidate?.fullName ?? '—' }}</span>
          </template>

          <template #job-cell="{ row: { original: row } }">
            <span class="text-sm text-ink-muted">{{ row.placement?.job?.title ?? '—' }}</span>
          </template>

          <template #total-cell="{ row: { original: row } }">
            <span class="font-mono text-sm font-medium text-ink">{{
              formatSalary(row.totalUzs)
            }}</span>
          </template>

          <template #dueDate-cell="{ row: { original: row } }">
            <span
              class="text-sm"
              :class="{
                'text-accent font-medium': row.status === 'overdue',
                'text-ink-muted': row.status !== 'overdue',
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
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-eye"
              :to="`/employer/invoices/${row.id}`"
            />
          </template>
        </UTable>

        <div
          v-if="total > limit"
          class="flex justify-center px-4 pb-4 pt-2 border-t border-line-soft"
        >
          <UPagination v-model="page" :total="total" :page-size="limit" />
        </div>
      </UCard>
    </template>

    <NuxtPage />
  </EmployerMasterDetailLayout>
</template>
