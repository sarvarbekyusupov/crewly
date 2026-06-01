<script setup lang="ts">
import type { Application } from '~/types/api'

const props = defineProps<{
  applications: Application[]
  total: number
  limit: number
  pending: boolean
}>()

const { t } = useI18n()

const page = defineModel<number>('page', { default: 1 })
const selectedIds = defineModel<Set<string>>('selectedIds', { default: () => new Set() })

const allSelected = computed(
  () =>
    props.applications.length > 0 && props.applications.every((a) => selectedIds.value.has(a.id)),
)

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.applications.map((a) => a.id))
  }
}

function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

const tableColumns: any[] = [
  { accessorKey: 'select', header: '' },
  { accessorKey: 'candidate', header: t('candidates.title') },
  { accessorKey: 'job', header: t('nav.jobs') },
  { accessorKey: 'matchScore', header: t('applications.matchScore') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'updatedAt', header: t('common.updatedAt') },
  { accessorKey: 'actions', header: '' },
]

function formatDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}
</script>

<template>
  <UCard :ui="{ body: 'p-0' }">
    <UTable
      v-if="applications.length"
      :data="applications"
      :columns="tableColumns"
      :loading="pending"
    >
      <template #select-header>
        <input
          type="checkbox"
          class="rounded"
          :checked="allSelected"
          :aria-label="t('applications.bulkSelected', { count: selectedIds.size })"
          @change="toggleAll"
        />
      </template>
      <template #select-cell="{ row: { original: row } }">
        <input
          type="checkbox"
          class="rounded"
          :checked="selectedIds.has(row.id)"
          :aria-label="row.candidate?.fullName ?? row.id"
          @change="toggleRow(row.id)"
          @click.stop
        />
      </template>
      <template #candidate-cell="{ row: { original: row } }">
        <div>
          <p class="font-medium text-ink">
            {{ row.candidate?.fullName ?? '—' }}
          </p>
          <p class="text-xs text-ink-subtle">
            {{ row.candidate?.currentPosition ?? '—' }}
          </p>
        </div>
      </template>
      <template #job-cell="{ row: { original: row } }">
        <NuxtLink
          :to="`/employer/jobs/${row.jobId}`"
          class="text-sm hover:underline text-ink-muted"
        >
          {{ row.job?.title ?? '—' }}
        </NuxtLink>
      </template>
      <template #matchScore-cell="{ row: { original: row } }">
        <span class="font-mono text-xs text-ink-muted">
          {{ row.matchScore ? Number(row.matchScore).toFixed(0) : '—' }}
        </span>
      </template>
      <template #status-cell="{ row: { original: row } }">
        <ApplicationStatusBadge :status="row.status" />
      </template>
      <template #updatedAt-cell="{ row: { original: row } }">
        <span class="text-sm text-ink-muted">{{ formatDate(row.updatedAt) }}</span>
      </template>
      <template #actions-cell="{ row: { original: row } }">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-eye"
          :to="`/employer/applications/${row.id}`"
          :aria-label="t('common.view')"
        />
      </template>
    </UTable>
    <CommonEmptyState
      v-else
      icon="i-heroicons-users"
      :title="t('applications.empty')"
      :description="t('applications.emptyDescription')"
      :action-label="t('nav.jobs')"
      action-to="/employer/jobs"
    />
    <div v-if="total > limit" class="flex justify-center px-4 pb-4 pt-2 border-t border-line-soft">
      <UPagination v-model="page" :total="total" :page-size="limit" />
    </div>
  </UCard>
</template>
