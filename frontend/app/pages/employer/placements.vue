<script setup lang="ts">
import type { Placement, PaginatedResponse } from '~/types/api'

const { t } = useI18n()
useHead({ title: computed(() => t('placements.title')) })
const api = useApi()
const route = useRoute()

const isDetailRoute = computed(() => !!route.params.id)

const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
  error,
} = await useAsyncData('placements', () =>
  api.get<PaginatedResponse<Placement>>('/api/v1/placements', { page: page.value, limit }),
)

const placements = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watch(page, () => refresh())

const columns: any[] = [
  { accessorKey: 'candidate', header: 'Candidate' },
  { accessorKey: 'job', header: 'Job' },
  { accessorKey: 'salary', header: t('placements.salary') },
  { accessorKey: 'fee', header: t('placements.fee') },
  { accessorKey: 'startDate', header: t('placements.startDate') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'actions', header: '' },
]

function isGuaranteeExpired(p: Placement) {
  if (!p.guaranteeExpiresAt) return false
  return new Date(p.guaranteeExpiresAt) < new Date()
}
</script>

<template>
  <EmployerMasterDetailLayout
    :is-detail-route="isDetailRoute"
    eyebrow="Outcomes"
    :title="t('placements.title')"
    subtitle="Confirmed hires and placement guarantee tracking."
  >
    <template #list>
      <CommonErrorState v-if="error" :retry="() => refresh()" />
      <UCard v-else :ui="{ body: 'p-0' }">
        <UTable :data="placements" :columns="columns" :loading="pending">
          <template #empty>
            <CommonEmptyState
              icon="i-heroicons-check-badge"
              title="No placements yet"
              description="Confirmed hires will appear here once recorded."
            />
          </template>

          <template #candidate-cell="{ row: { original: row } }">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm bg-accent-soft text-accent font-serif italic border border-line-soft"
              >
                {{ row.candidate?.fullName?.[0] ?? '?' }}
              </div>
              <NuxtLink
                :to="`/employer/candidates/${row.candidateId}`"
                class="font-medium hover:underline text-ink"
              >
                {{ row.candidate?.fullName ?? '—' }}
              </NuxtLink>
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

          <template #salary-cell="{ row: { original: row } }">
            <span class="font-mono text-sm text-ink">{{ formatSalary(row.agreedSalaryUzs) }}</span>
          </template>

          <template #fee-cell="{ row: { original: row } }">
            <span class="font-mono text-sm text-ink-muted">{{
              formatSalary(row.totalFeeUzs)
            }}</span>
          </template>

          <template #startDate-cell="{ row: { original: row } }">
            <span class="text-sm text-ink-muted">{{ formatDate(row.startDate) }}</span>
          </template>

          <template #status-cell="{ row: { original: row } }">
            <div class="flex flex-col gap-1">
              <UBadge
                :color="row.candidateStillEmployed ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{
                  row.candidateStillEmployed
                    ? t('placements.stillEmployed')
                    : t('placements.notEmployed')
                }}
              </UBadge>
              <UBadge
                v-if="row.guaranteeExpiresAt && !isGuaranteeExpired(row)"
                color="info"
                variant="subtle"
                size="xs"
              >
                Guarantee: {{ formatDate(row.guaranteeExpiresAt) }}
              </UBadge>
              <UBadge v-if="row.replacementRequired" color="warning" variant="subtle" size="xs">
                Replacement needed
              </UBadge>
            </div>
          </template>

          <template #actions-cell="{ row: { original: row } }">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-eye"
              :to="`/employer/placements/${row.id}`"
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
