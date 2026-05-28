<script setup lang="ts">
import type { Placement, PaginatedResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()

const page = ref(1)
const limit = 20

const { data: result, pending } = await useAsyncData('placements', () =>
  api.get<PaginatedResponse<Placement>>('/api/v1/placements', { page: page.value, limit }),
)

const placements = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watch(page, () => refreshNuxtData('placements'))

const columns = [
  { key: 'candidate', label: 'Candidate' },
  { key: 'job', label: 'Job' },
  { key: 'salary', label: t('placements.salary') },
  { key: 'fee', label: t('placements.fee') },
  { key: 'startDate', label: t('placements.startDate') },
  { key: 'status', label: t('common.status') },
  { key: 'actions', label: '' },
]

function isGuaranteeExpired(p: Placement) {
  if (!p.guaranteeExpiresAt) return false
  return new Date(p.guaranteeExpiresAt) < new Date()
}
</script>

<template>
  <div class="space-y-5">
    <PageHead
      eyebrow="Outcomes"
      :title="t('placements.title')"
      subtitle="Confirmed hires and placement guarantee tracking."
    />

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable :rows="placements" :columns="columns" :loading="pending">
        <template #empty>
          <div class="flex flex-col items-center py-14 gap-3">
            <UIcon
              name="i-heroicons-check-badge"
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
              No placements yet
            </p>
            <p style="font-size: 13px; color: var(--ink-muted)">
              Confirmed hires will appear here once recorded.
            </p>
          </div>
        </template>

        <template #candidate-data="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
              style="
                background: var(--accent-soft);
                color: var(--accent);
                font-family: 'Fraunces', serif;
                font-style: italic;
                border: 1px solid var(--line-soft);
              "
            >
              {{ row.candidate?.fullName?.[0] ?? '?' }}
            </div>
            <NuxtLink
              :to="`/candidates/${row.candidateId}`"
              class="font-medium hover:underline"
              style="color: var(--ink)"
            >
              {{ row.candidate?.fullName ?? '—' }}
            </NuxtLink>
          </div>
        </template>

        <template #job-data="{ row }">
          <NuxtLink
            :to="`/jobs/${row.jobId}`"
            class="text-sm hover:underline"
            style="color: var(--ink-muted)"
          >
            {{ row.job?.title ?? '—' }}
          </NuxtLink>
        </template>

        <template #salary-data="{ row }">
          <span class="font-mono text-sm" style="color: var(--ink)">{{
            formatSalary(row.agreedSalaryUzs)
          }}</span>
        </template>

        <template #fee-data="{ row }">
          <span class="font-mono text-sm" style="color: var(--ink-muted)">{{
            formatSalary(row.totalFeeUzs)
          }}</span>
        </template>

        <template #startDate-data="{ row }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            formatDate(row.startDate)
          }}</span>
        </template>

        <template #status-data="{ row }">
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

        <template #actions-data="{ row }">
          <UButton variant="ghost" size="xs" icon="i-heroicons-eye" :to="`/placements/${row.id}`" />
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
