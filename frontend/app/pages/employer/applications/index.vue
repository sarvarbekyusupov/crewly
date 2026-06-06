<script setup lang="ts">
import type { Application, PaginatedResponse } from '~/types/api'
import { APPLICATION_KANBAN_STAGES } from '~/utils/applicationPipeline'

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
  error,
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
const showBulkOutreachModal = ref(false)

const copilotQuery = ref('')

watch(copilotQuery, (val) => {
  const q = val.toLowerCase()
  if (q.includes('all') || q.includes('clear') || q.includes('reset')) {
    statusFilter.value = ''
    copilotQuery.value = ''
    return
  }

  if (q.includes('applied')) {
    statusFilter.value = 'applied'
  } else if (q.includes('screening') || q.includes('chat') || q.includes('delivered')) {
    statusFilter.value = 'delivered'
  } else if (q.includes('interview')) {
    statusFilter.value = 'interview'
  } else if (q.includes('offer')) {
    statusFilter.value = 'offered'
  } else if (q.includes('hire') || q.includes('placed')) {
    statusFilter.value = 'hired'
  } else if (q.includes('reject') || q.includes('pass')) {
    statusFilter.value = 'rejected'
  }
})

const activeSlideoverId = ref<string | null>(null)
const isSlideoverOpen = ref(false)

function openSlideover(id: string) {
  activeSlideoverId.value = id
  isSlideoverOpen.value = true
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
    if (result.value) {
      result.value = { ...result.value, data: prev }
    }
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
    if (result.value) {
      result.value = { ...result.value, data: prev }
    }
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
</script>

<template>
  <div class="space-y-5">
    <CommonPageHead
      eyebrow="Pipeline"
      :title="t('applications.title')"
      subtitle="Track every candidate through the hiring pipeline."
    />

    <!-- AI Copilot Filter Command Bar -->
    <div class="bg-accent-soft border border-line-soft rounded-xl p-3 flex items-center gap-3">
      <div class="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 animate-pulse" />
      </div>
      <UInput
        v-model="copilotQuery"
        placeholder="Ask Recruiter AI to filter candidates (e.g. 'Show screened candidates' or 'Clear filters')..."
        class="flex-1 font-mono text-xs"
        autocomplete="off"
      />
    </div>

    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 flex-wrap gap-4"
    >
      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <div class="flex rounded-lg overflow-hidden shrink-0 border border-line bg-bg-deep">
              <button
                type="button"
                class="flex-1 sm:flex-none px-3 py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                :class="{
                  'bg-paper text-ink': view === 'kanban',
                  'text-ink-muted': view !== 'kanban',
                }"
                :aria-pressed="view === 'kanban'"
                @click="view = 'kanban'"
              >
                <UIcon name="i-heroicons-view-columns" class="w-3.5 h-3.5" />
                {{ t('applications.viewKanban') }}
              </button>
              <button
                type="button"
                class="flex-1 sm:flex-none px-3 py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                :class="{
                  'bg-paper text-ink': view === 'table',
                  'text-ink-muted': view !== 'table',
                }"
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
              to="/employer/applications"
              class="justify-center"
            >
              {{ t('applications.clearJobFilter') }}
            </UButton>
          </div>
          <span class="font-mono text-xs hidden sm:inline text-ink-subtle">{{ total }} total</span>
        </div>

    <template v-if="view === 'kanban'">
      <ApplicationKanban :applications="applications" :loading="pending" @select="openSlideover" />
      <div
        v-if="!pending && total > applications.length"
        class="mt-3 text-center font-mono text-xs text-ink-subtle"
      >
        {{ t('applications.showingOf', { shown: applications.length, total }) }}
        <button class="ml-1 text-accent hover:underline cursor-pointer" @click="view = 'table'">
          {{ t('applications.switchToTable') }}
        </button>
      </div>
      <CommonEmptyState
        v-if="!pending && !applications.length"
        icon="i-heroicons-users"
        :title="t('applications.empty')"
        :description="t('applications.emptyDescription')"
        :action-label="t('nav.jobs')"
        action-to="/employer/jobs"
      />
    </template>

    <template v-else>
      <CommonBulkActionBar
        :count="selectedIds.size"
        :loading="bulkLoading"
        @approve="bulkApprove"
        @reject="showRejectModal = true"
        @personalize="showBulkOutreachModal = true"
        @clear="selectedIds = new Set()"
      />

      <CommonListSkeleton v-if="pending" variant="table" />
      <CommonErrorState v-else-if="error" :retry="() => refresh()" />
      <EmployerApplicationsTable
        v-else
        v-model:page="page"
        v-model:selected-ids="selectedIds"
        :applications="applications"
        :total="total"
        :limit="limit"
        :pending="pending"
        @select="openSlideover"
      />

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

    <!-- Application details slideover -->
    <EmployerApplicationSlideover
      v-if="activeSlideoverId"
      :id="activeSlideoverId"
      v-model:open="isSlideoverOpen"
      @refresh="() => refresh()"
    />

    <!-- Bulk Outreach Editor Modal -->
    <BulkOutreachEditorModal
      v-model:open="showBulkOutreachModal"
      :selected-ids="Array.from(selectedIds)"
      @success="() => { refresh(); selectedIds = new Set() }"
    />
  </div>
</template>
