<script setup lang="ts">
import type { Job, PaginatedResponse } from '~/types/api'
import { formatSalary } from '~/utils/formatters'

definePageMeta({ layout: 'default' })

const api = useApi()

useHead({ title: 'Jobs' })

const statusFilter = ref('')
const page = ref(1)
const limit = 20

const {
  data: result,
  pending,
  refresh,
  error,
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

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Filled', value: 'filled' },
  { label: 'Cancelled', value: 'cancelled' },
]

function statusColor(s: string): 'neutral' | 'success' | 'warning' | 'info' | 'error' {
  const map: Record<string, 'neutral' | 'success' | 'warning' | 'info' | 'error'> = {
    active: 'success',
    draft: 'neutral',
    paused: 'warning',
    filled: 'info',
    cancelled: 'error',
  }
  return map[s] ?? 'neutral'
}

function priorityColor(p?: string): 'neutral' | 'warning' | 'error' {
  if (p === 'urgent') return 'error'
  if (p === 'high') return 'warning'
  return 'neutral'
}

watch(statusFilter, () => {
  page.value = 1
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--ink-subtle);
              margin-bottom: 6px;
            "
          >
            Hiring
          </p>
          <h1
            style="
              font-family: 'Fraunces', serif;
              font-size: 28px;
              line-height: 1.05;
              letter-spacing: -0.03em;
              color: var(--ink);
              font-weight: 400;
            "
          >
            Open Roles
          </h1>
          <p class="mt-1 text-sm" style="color: var(--ink-muted)">
            {{ total }} role{{ total !== 1 ? 's' : '' }} total
          </p>
        </div>
        <UButton to="/employer/jobs/create" icon="i-heroicons-plus" size="sm"> New Role </UButton>
      </div>
    </div>

    <!-- Status filter tabs -->
    <div class="flex gap-1 flex-wrap">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="px-3 py-1.5 text-xs rounded-lg transition-colors"
        :style="
          statusFilter === tab.value
            ? 'background: var(--ink); color: var(--bg); font-weight: 600;'
            : 'background: var(--bg-elevated); color: var(--ink-muted); border: 1px solid var(--line-soft);'
        "
        @click="statusFilter = tab.value"
      >
        {{ tab.label }}
      </button>
      <UButton
        variant="ghost"
        size="xs"
        icon="i-heroicons-arrow-path"
        :loading="pending"
        class="ml-auto"
        @click="refresh()"
      />
    </div>

    <!-- Error state -->
    <CommonErrorState v-if="error" :retry="() => refresh()" />

    <!-- Loading skeleton -->
    <div v-else-if="pending && !jobs.length" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="h-24 rounded-xl animate-pulse"
        style="background: var(--bg-elevated)"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="!jobs.length" class="flex flex-col items-center py-20 gap-4">
      <UIcon
        name="i-heroicons-briefcase"
        class="w-14 h-14 opacity-30"
        style="color: var(--ink-subtle)"
      />
      <div class="text-center">
        <p
          style="
            font-family: 'Fraunces', serif;
            font-size: 20px;
            color: var(--ink);
            font-weight: 400;
          "
        >
          {{ statusFilter ? 'No jobs with this status' : 'No roles yet' }}
        </p>
        <p class="text-sm mt-1" style="color: var(--ink-muted)">
          {{
            statusFilter
              ? 'Try a different filter.'
              : 'Create your first role to start sourcing candidates.'
          }}
        </p>
      </div>
      <UButton
        v-if="!statusFilter"
        to="/employer/jobs/create"
        icon="i-heroicons-plus"
        size="sm"
        variant="outline"
      >
        Create Role
      </UButton>
    </div>

    <!-- Job list -->
    <div v-else class="space-y-3">
      <NuxtLink
        v-for="job in jobs"
        :key="job.id"
        :to="`/employer/jobs/${job.id}`"
        class="block rounded-xl p-4 transition-all hover:opacity-90"
        style="
          background: var(--surface);
          border: 1px solid var(--line-soft);
          text-decoration: none;
        "
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <!-- Title row -->
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-medium" style="color: var(--ink); font-size: 15px">
                {{ job.title }}
              </span>
              <UBadge :color="statusColor(job.status)" variant="subtle" size="xs">
                {{ job.status }}
              </UBadge>
              <UBadge
                v-if="job.priority && job.priority !== 'normal'"
                :color="priorityColor(job.priority)"
                variant="subtle"
                size="xs"
              >
                {{ job.priority }}
              </UBadge>
            </div>

            <!-- Meta row -->
            <div
              class="flex flex-wrap items-center gap-3 text-xs mb-2"
              style="color: var(--ink-subtle)"
            >
              <span v-if="job.workMode">{{ job.workMode }}</span>
              <span v-if="job.employmentType">{{ job.employmentType }}</span>
              <span v-if="job.officeLocation">{{ job.officeLocation }}</span>
              <span v-if="job.minExperienceYears != null || job.maxExperienceYears != null">
                {{ job.minExperienceYears ?? 0 }}–{{ job.maxExperienceYears ?? '∞' }} yrs exp
              </span>
              <span v-if="job.salaryMinUzs || job.salaryMaxUzs">
                {{ formatSalary(job.salaryMinUzs)
                }}<span v-if="job.salaryMaxUzs"> – {{ formatSalary(job.salaryMaxUzs) }}</span>
              </span>
            </div>

            <!-- Skills -->
            <div v-if="job.requiredSkills?.length" class="flex flex-wrap gap-1">
              <UBadge
                v-for="s in job.requiredSkills.slice(0, 5)"
                :key="s"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ s }}
              </UBadge>
              <span
                v-if="job.requiredSkills.length > 5"
                class="text-xs"
                style="color: var(--ink-subtle)"
              >
                +{{ job.requiredSkills.length - 5 }}
              </span>
            </div>
          </div>

          <!-- Right side -->
          <div class="flex flex-col items-end gap-2 shrink-0">
            <div class="flex items-center gap-2">
              <UButton
                variant="ghost"
                size="xs"
                icon="i-heroicons-plus"
                :to="`/employer/jobs/create?from=${job.id}`"
                aria-label="Duplicate job"
                @click.prevent.stop="$router.push(`/employer/jobs/create?from=${job.id}`)"
              />
              <UButton
                variant="outline"
                size="xs"
                icon="i-heroicons-arrow-right"
                :to="`/employer/jobs/${job.id}`"
                @click.stop
              >
                View
              </UButton>
            </div>
            <span
              class="text-xs"
              style="color: var(--ink-subtle); font-family: 'JetBrains Mono', monospace"
            >
              {{ job.targetCandidatesCount }} target
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="total > limit" class="flex justify-center pt-2">
      <UPagination v-model="page" :total="total" :page-size="limit" />
    </div>
  </div>
</template>
