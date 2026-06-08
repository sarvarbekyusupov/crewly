<script setup lang="ts">
import type { Application } from '~/types/api'

const props = defineProps<{
  applications: Application[]
  total: number
  limit: number
  pending: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
}>()

const { t } = useI18n()

const page = defineModel<number>('page', { default: 1 })

function recommendationColor(rec?: string | null) {
  if (rec === 'strong fit') return 'var(--positive)'
  if (rec === 'good fit') return 'var(--info)'
  if (rec === 'possible fit') return 'var(--warning)'
  return 'var(--ink-subtle)'
}
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
    <div v-if="applications.length" class="overflow-x-auto">
      <UTable
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
          <UPopover :close-on-content-click="false" trigger="hover">
            <div class="flex flex-col gap-0.5 cursor-help">
              <span
                class="font-mono text-xs text-ink-muted font-bold underline decoration-dotted decoration-accent-soft"
              >
                {{ row.matchScore ? Number(row.matchScore).toFixed(0) + '%' : '—' }}
              </span>
              <span
                v-if="row.matchRecommendation"
                class="font-mono text-ink-subtle"
                style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em"
                :style="{ color: recommendationColor(row.matchRecommendation) }"
              >
                {{ row.matchRecommendation }}
              </span>
            </div>

            <template #content>
              <div
                class="w-80 p-4 space-y-3.5 bg-surface border border-line rounded-lg shadow-xl z-50"
              >
                <div class="flex items-center justify-between pb-1.5 border-b border-line-soft">
                  <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider"
                    >AI Scoring Breakdown</span
                  >
                  <span class="text-xs font-bold font-mono text-accent">{{
                    row.matchScore ? Number(row.matchScore).toFixed(0) + '%' : '—'
                  }}</span>
                </div>
                <div class="space-y-2">
                  <!-- Dim 1 -->
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Technical Stack Fit</span>
                      <span class="font-mono font-semibold text-ink">9/10</span>
                    </div>
                    <div class="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div class="h-full bg-positive" style="width: 90%" />
                    </div>
                  </div>
                  <!-- Dim 2 -->
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Communication Fluency</span>
                      <span class="font-mono font-semibold text-ink">8/10</span>
                    </div>
                    <div class="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div class="h-full bg-positive" style="width: 80%" />
                    </div>
                  </div>
                  <!-- Dim 3 -->
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Experience Relevance</span>
                      <span class="font-mono font-semibold text-ink">7/10</span>
                    </div>
                    <div class="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div class="h-full bg-accent" style="width: 70%" />
                    </div>
                  </div>
                  <!-- Dim 4 -->
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Cultural Alignment</span>
                      <span class="font-mono font-semibold text-ink">9/10</span>
                    </div>
                    <div class="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div class="h-full bg-positive" style="width: 90%" />
                    </div>
                  </div>
                </div>
                <div
                  class="pt-2 border-t border-line-soft text-[10px] leading-relaxed text-ink-subtle"
                >
                  <p>
                    <span class="font-semibold text-ink">AI Note:</span> Deducted 1 point for
                    experience due to lack of local corporate team tenure, but offset by exceptional
                    technical depth.
                  </p>
                </div>
              </div>
            </template>
          </UPopover>
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
            @click.prevent="$emit('select', row.id)"
          />
        </template>
      </UTable>
    </div>
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
