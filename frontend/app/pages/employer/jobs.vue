<script setup lang="ts">
import type { Job, PaginatedResponse } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const auth = useAuthStore()
const route = useRoute()

const isDetailRoute = computed(() => !!route.params.id)

const statusFilter = ref('')
const page = ref(1)
const limit = 20

const {
  data: result,
  refresh,
  pending,
} = await useAsyncData(
  'jobs-list',
  () =>
    api.get<PaginatedResponse<Job>>('/api/v1/jobs', {
      ...(statusFilter.value && { status: statusFilter.value }),
      page: page.value,
      limit,
    }),
  { watch: [statusFilter, page] },
)

const jobs = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

const { jobStatusLabel, jobPriorityLabel } = useStatusLabels()

useHead({ title: computed(() => t('jobs.title')) })

const statusOptions = [
  { label: t('common.all'), value: '' },
  { label: t('jobs.status.draft'), value: 'draft' },
  { label: t('jobs.status.active'), value: 'active' },
  { label: t('jobs.status.paused'), value: 'paused' },
  { label: t('jobs.status.filled'), value: 'filled' },
  { label: t('jobs.status.cancelled'), value: 'cancelled' },
]

function priorityColor(
  p: string,
): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  const map: Record<
    string,
    'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  > = {
    low: 'neutral',
    normal: 'info',
    high: 'warning',
    urgent: 'error',
  }
  return map[p] ?? 'neutral'
}

const columns: any[] = [
  { accessorKey: 'title', header: t('jobs.fields.title') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'priority', header: t('jobs.fields.priority') },
  { accessorKey: 'skills', header: t('jobs.fields.requiredSkills') },
  { accessorKey: 'createdAt', header: t('common.createdAt') },
  { accessorKey: 'actions', header: '' },
]

async function activateJob(id: string) {
  try {
    await api.post(`/api/v1/jobs/${id}/activate`)
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
    refreshNuxtData('nav-counts')
  } catch {
    /* useApi already shows error toast */
  }
}

async function pauseJob(id: string) {
  try {
    await api.post(`/api/v1/jobs/${id}/pause`)
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
    refreshNuxtData('nav-counts')
  } catch {
    /* useApi already shows error toast */
  }
}

async function closeJob(id: string) {
  try {
    await api.post(`/api/v1/jobs/${id}/close`)
    toast.add({ title: t('common.success'), color: 'success' })
    refresh()
    refreshNuxtData('nav-counts')
  } catch {
    /* useApi already shows error toast */
  }
}
</script>

<template>
  <EmployerMasterDetailLayout
    :is-detail-route="isDetailRoute"
    :eyebrow="t('jobs.eyebrow')"
    :title="t('jobs.title')"
    subtitle="Manage open positions and track hiring progress."
  >
    <template #header-actions>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
        <USelect v-model="statusFilter" :items="statusOptions" class="w-full sm:w-44" />
        <NuxtLink
          v-if="auth.can('hiring_manager')"
          to="/employer/jobs/create"
          class="w-full sm:w-auto"
        >
          <UButton icon="i-heroicons-plus" :label="t('jobs.create')" block />
        </NuxtLink>
      </div>
    </template>

    <template #list>
      <UCard :ui="{ body: 'p-0' }">
        <UTable :data="jobs" :columns="columns" :loading="pending">
          <template #empty>
            <CommonEmptyState
              icon="i-heroicons-briefcase"
              :title="t('jobs.emptyTitle')"
              :description="t('jobs.emptyDesc')"
              :action-label="auth.can('hiring_manager') ? t('jobs.create') : undefined"
              action-to="/employer/jobs/create"
            />
          </template>

          <template #title-cell="{ row: { original: row } }">
            <div>
              <NuxtLink
                :to="`/employer/jobs/${row.id}`"
                class="font-medium hover:underline text-ink"
              >
                {{ row.title }}
              </NuxtLink>
              <p class="text-xs mt-0.5 text-ink-subtle">
                {{ row.workMode ?? '' }}{{ row.officeLocation ? ' · ' + row.officeLocation : '' }}
              </p>
            </div>
          </template>

          <template #status-cell="{ row: { original: row } }">
            <UBadge :color="jobStatusColor(row.status)" variant="subtle" size="xs">
              {{ jobStatusLabel(row.status) }}
            </UBadge>
          </template>

          <template #priority-cell="{ row: { original: row } }">
            <UBadge
              v-if="row.priority"
              :color="priorityColor(row.priority)"
              variant="subtle"
              size="xs"
            >
              {{ jobPriorityLabel(row.priority) }}
            </UBadge>
          </template>

          <template #skills-cell="{ row: { original: row } }">
            <div class="flex flex-wrap gap-1 max-w-xs">
              <UBadge
                v-for="s in (row.requiredSkills ?? []).slice(0, 4)"
                :key="s"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ s }}
              </UBadge>
              <span v-if="(row.requiredSkills ?? []).length > 4" class="text-xs text-ink-subtle">
                +{{ row.requiredSkills.length - 4 }}
              </span>
            </div>
          </template>

          <template #createdAt-cell="{ row: { original: row } }">
            <span class="text-sm text-ink-muted">{{ formatDate(row.createdAt) }}</span>
          </template>

          <template #actions-cell="{ row: { original: row } }">
            <UDropdownMenu
              :items="[
                ...(row.status === 'draft'
                  ? [
                      {
                        label: t('jobs.activate'),
                        icon: 'i-heroicons-play',
                        click: () => activateJob(row.id),
                      },
                    ]
                  : []),
                ...(row.status === 'active'
                  ? [
                      {
                        label: t('jobs.pause'),
                        icon: 'i-heroicons-pause',
                        click: () => pauseJob(row.id),
                      },
                    ]
                  : []),
                ...(row.status !== 'cancelled' && row.status !== 'filled'
                  ? [
                      {
                        label: t('jobs.close'),
                        icon: 'i-heroicons-x-mark',
                        click: () => closeJob(row.id),
                      },
                    ]
                  : []),
                {
                  label: t('common.view'),
                  icon: 'i-heroicons-eye',
                  to: `/employer/jobs/${row.id}`,
                },
              ]"
            >
              <UButton variant="ghost" icon="i-heroicons-ellipsis-horizontal" size="xs" />
            </UDropdownMenu>
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
