<script setup lang="ts">
import type { Application, PaginatedResponse } from '~/types/api'
import { APPLICATION_KANBAN_STAGES } from '~/utils/applicationPipeline'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const { appStatusLabel } = useStatusLabels()

useHead({ title: computed(() => t('applications.title')) })

const view = ref<'kanban' | 'table'>('kanban')
const statusFilter = ref('')
const page = ref(1)
const limit = 50
const jobIdFilter = computed(() => (route.query.jobId as string) || '')

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData(
  'applications-list',
  () =>
    api.get<PaginatedResponse<Application>>('/api/v1/applications', {
      ...(statusFilter.value && { status: statusFilter.value }),
      ...(jobIdFilter.value && { jobId: jobIdFilter.value }),
      page: page.value,
      limit,
    }),
  { watch: [statusFilter, page, jobIdFilter] },
)

const applications = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

const selectedIds = ref<Set<string>>(new Set())
const bulkLoading = ref(false)
const showRejectModal = ref(false)
const rejectReason = ref('')

const allSelected = computed(
  () =>
    applications.value.length > 0 && applications.value.every((a) => selectedIds.value.has(a.id)),
)

function toggleAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(applications.value.map((a) => a.id))
}

function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

watch(view, () => {
  selectedIds.value = new Set()
})
watch(statusFilter, () => {
  selectedIds.value = new Set()
})

function optimisticStatus(ids: string[], status: string) {
  if (!result.value?.data) return
  result.value = {
    ...result.value,
    data: result.value.data.map((a) => (ids.includes(a.id) ? { ...a, status } : a)),
  }
}

async function bulkApprove() {
  const ids = [...selectedIds.value]
  const prev = result.value?.data ? [...result.value.data] : []
  bulkLoading.value = true
  optimisticStatus(ids, 'delivered')
  selectedIds.value = new Set()
  try {
    await api.post('/api/v1/applications/bulk-approve', { ids })
    toast.add({
      title: t('common.success'),
      description: t('applications.bulkApproved', { count: ids.length }),
      color: 'success',
    })
    await refresh()
  } catch {
    if (result.value) result.value = { ...result.value, data: prev }
  } finally {
    bulkLoading.value = false
  }
}

async function bulkReject() {
  const ids = [...selectedIds.value]
  const prev = result.value?.data ? [...result.value.data] : []
  bulkLoading.value = true
  optimisticStatus(ids, 'rejected_by_client')
  try {
    await api.post('/api/v1/applications/bulk-reject', {
      ids,
      reason: rejectReason.value || undefined,
    })
    toast.add({
      title: t('common.success'),
      description: t('applications.bulkRejected', { count: ids.length }),
      color: 'success',
    })
    selectedIds.value = new Set()
    rejectReason.value = ''
    showRejectModal.value = false
    await refresh()
  } catch {
    if (result.value) result.value = { ...result.value, data: prev }
    selectedIds.value = new Set()
    rejectReason.value = ''
    showRejectModal.value = false
  } finally {
    bulkLoading.value = false
  }
}

const statusOptions = computed(() => [
  { label: t('common.all'), value: '' },
  ...APPLICATION_KANBAN_STAGES.map((s) => ({
    label: appStatusLabel(s.labelKey),
    value: s.key,
  })),
  { label: appStatusLabel('screened_fail'), value: 'screened_fail' },
  { label: appStatusLabel('rejected_by_client'), value: 'rejected_by_client' },
  { label: appStatusLabel('withdrew'), value: 'withdrew' },
])

const tableColumns: any[] = [
  { key: 'select', label: '' },
  { key: 'candidate', label: t('candidates.title') },
  { key: 'job', label: t('nav.jobs') },
  { key: 'matchScore', label: t('applications.matchScore') },
  { key: 'status', label: t('common.status') },
  { key: 'updatedAt', label: t('common.updatedAt') },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="space-y-5">
    <CommonPageHead
      eyebrow="Pipeline"
      :title="t('applications.title')"
      subtitle="Track every candidate through the hiring pipeline."
    >
      <template #default>
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 flex-wrap gap-4"
        >
          <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div
              class="flex rounded-lg overflow-hidden shrink-0"
              style="border: 1px solid var(--line); background: var(--bg-deep)"
            >
              <button
                type="button"
                class="flex-1 sm:flex-none px-3 py-1.5 text-xs flex items-center justify-center gap-1.5"
                :style="
                  view === 'kanban'
                    ? 'background: var(--paper); color: var(--ink);'
                    : 'color: var(--ink-muted);'
                "
                :aria-pressed="view === 'kanban'"
                @click="view = 'kanban'"
              >
                <UIcon name="i-heroicons-view-columns" class="w-3.5 h-3.5" />
                {{ t('applications.viewKanban') }}
              </button>
              <button
                type="button"
                class="flex-1 sm:flex-none px-3 py-1.5 text-xs flex items-center justify-center gap-1.5"
                :style="
                  view === 'table'
                    ? 'background: var(--paper); color: var(--ink);'
                    : 'color: var(--ink-muted);'
                "
                :aria-pressed="view === 'table'"
                @click="view = 'table'"
              >
                <UIcon name="i-heroicons-list-bullet" class="w-3.5 h-3.5" />
                {{ t('applications.viewTable') }}
              </button>
            </div>
            <USelect
              v-if="view === 'table'"
              v-model="statusFilter"
              :options="statusOptions"
              class="w-full sm:w-48"
            />
            <UButton
              v-if="jobIdFilter"
              size="sm"
              variant="ghost"
              :to="'/applications'"
              class="justify-center"
            >
              {{ t('applications.clearJobFilter') }}
            </UButton>
          </div>
          <span class="font-mono text-xs hidden sm:inline" style="color: var(--ink-subtle)"
            >{{ total }} total</span
          >
        </div>
      </template>
    </CommonPageHead>

    <template v-if="view === 'kanban'">
      <ApplicationKanban :applications="applications" :loading="pending" />
      <div
        v-if="!pending && total > applications.length"
        class="mt-3 text-center font-mono text-xs text-ink-subtle"
      >
        {{ t('applications.showingOf', { shown: applications.length, total }) }}
        <button class="ml-1 text-accent hover:underline" @click="view = 'table'">
          {{ t('applications.switchToTable') }}
        </button>
      </div>
      <CommonEmptyState
        v-if="!pending && !applications.length"
        icon="i-heroicons-users"
        :title="t('applications.empty')"
        :description="t('applications.emptyDescription')"
        :action-label="t('nav.jobs')"
        action-to="/jobs"
      />
    </template>

    <template v-else>
      <CommonBulkActionBar
        :count="selectedIds.size"
        :loading="bulkLoading"
        @approve="bulkApprove"
        @reject="showRejectModal = true"
        @clear="selectedIds = new Set()"
      />

      <CommonListSkeleton v-if="pending" variant="table" />
      <UCard v-else :ui="{ body: 'p-0' }">
        <UTable v-if="applications.length" :data="applications" :columns="tableColumns">
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
              <p class="font-medium" style="color: var(--ink)">
                {{ row.candidate?.fullName ?? '—' }}
              </p>
              <p class="text-xs" style="color: var(--ink-subtle)">
                {{ row.candidate?.currentPosition ?? '—' }}
              </p>
            </div>
          </template>
          <template #job-cell="{ row: { original: row } }">
            <NuxtLink
              :to="`/jobs/${row.jobId}`"
              class="text-sm hover:underline"
              style="color: var(--ink-muted)"
            >
              {{ row.job?.title ?? '—' }}
            </NuxtLink>
          </template>
          <template #matchScore-cell="{ row: { original: row } }">
            <span class="font-mono text-xs" style="color: var(--ink-muted)">
              {{ row.matchScore ? Number(row.matchScore).toFixed(0) : '—' }}
            </span>
          </template>
          <template #status-cell="{ row: { original: row } }">
            <ApplicationStatusBadge :status="row.status" />
          </template>
          <template #updatedAt-cell="{ row: { original: row } }">
            <span class="text-sm" style="color: var(--ink-muted)">{{
              formatDate(row.updatedAt)
            }}</span>
          </template>
          <template #actions-cell="{ row: { original: row } }">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-eye"
              :to="`/applications/${row.id}`"
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
          action-to="/jobs"
        />
        <div
          v-if="total > limit"
          class="flex justify-center px-4 pb-4 pt-2"
          style="border-top: 1px solid var(--line-soft)"
        >
          <UPagination v-model="page" :total="total" :page-size="limit" />
        </div>
      </UCard>

      <CommonConfirmModal
        v-model:open="showRejectModal"
        :title="`Reject ${selectedIds.size} application${selectedIds.size !== 1 ? 's' : ''}`"
        confirm-label="Reject"
        confirm-color="error"
        :loading="bulkLoading"
        @confirm="bulkReject"
      >
        <UFormField label="Reason (optional)" name="reason">
          <UInput v-model="rejectReason" placeholder="e.g. Not enough experience" class="w-full" />
        </UFormField>
      </CommonConfirmModal>
    </template>
  </div>
</template>
