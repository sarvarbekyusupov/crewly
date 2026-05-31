<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import type { Candidate, PaginatedResponse } from '~/types/api'

const { t } = useI18n()
useHead({ title: computed(() => t('candidates.title')) })
const api = useApi()
const route = useRoute()

const isDetailRoute = computed(() => !!route.params.id)

const search = ref('')
const page = ref(1)
const sortBy = ref<'recent' | 'score'>('recent')
const limit = 20

const {
  data: result,
  pending,
  refresh,
} = await useAsyncData(
  'candidates-list',
  () =>
    api.get<PaginatedResponse<Candidate>>('/api/v1/candidates', {
      ...(search.value && { search: search.value }),
      page: page.value,
      limit,
      sortBy: sortBy.value,
    }),
  { watch: [search, page, sortBy] },
)

const candidates = computed(() => result.value?.data ?? [])
const total = computed(() => result.value?.total ?? 0)

watchDebounced(
  search,
  () => {
    page.value = 1
  },
  { debounce: 300 },
)
watch(sortBy, () => {
  page.value = 1
})

function scoreColor(
  score: number | string | undefined | null,
): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  if (score == null) return 'neutral'
  const n = Number(score)
  if (n >= 80) return 'success'
  if (n >= 60) return 'warning'
  return 'error'
}

const columns: any[] = [
  { accessorKey: 'fullName', header: 'Name' },
  { accessorKey: 'experience', header: t('candidates.experience') },
  { accessorKey: 'skills', header: t('candidates.skills') },
  { accessorKey: 'score', header: 'Score' },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'actions', header: '' },
]

const sortOptions = [
  { label: 'Most recent', value: 'recent' },
  { label: 'Highest score', value: 'score' },
]
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- Left panel (master list) -->
    <div class="lg:col-span-5 flex flex-col space-y-5" :class="{ 'hidden lg:flex': isDetailRoute }">
      <CommonPageHead
        eyebrow="Talent Pool"
        :title="t('candidates.title')"
        subtitle="Search and manage candidate database."
      >
        <template #default>
          <div class="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              :placeholder="t('common.search')"
              class="w-full sm:max-w-xs"
            />
            <USelect v-model="sortBy" :options="sortOptions" size="sm" class="w-full sm:w-44" />
          </div>
        </template>
      </CommonPageHead>

      <UCard :ui="{ body: 'p-0' }">
        <UTable :data="candidates" :columns="columns" :loading="pending">
          <template #empty>
            <div class="flex flex-col items-center py-14 gap-3">
              <UIcon
                name="i-heroicons-user-circle"
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
                {{ t('candidates.empty') }}
              </p>
              <p style="font-size: 13px; color: var(--ink-muted)">
                {{ t('candidates.emptyDesc') }}
              </p>
            </div>
          </template>
          <template #fullName-cell="{ row: { original: row } }">
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
                {{ row.fullName?.[0] ?? '?' }}
              </div>
              <div>
                <p class="font-medium" style="color: var(--ink)">{{ row.fullName ?? '—' }}</p>
                <p class="text-xs" style="color: var(--ink-subtle)">
                  {{ [row.currentCompany, row.city].filter(Boolean).join(' · ') || '—' }}
                </p>
              </div>
            </div>
          </template>
          <template #experience-cell="{ row: { original: row } }">
            <span style="color: var(--ink-muted)">
              {{ row.yearsExperience != null ? row.yearsExperience + ' yrs' : '—' }}
            </span>
          </template>
          <template #skills-cell="{ row: { original: row } }">
            <div class="flex flex-wrap gap-1 max-w-xs">
              <UBadge
                v-for="s in (row.skills ?? []).slice(0, 3)"
                :key="s"
                color="neutral"
                variant="subtle"
                size="xs"
                >{{ s }}</UBadge
              >
              <span
                v-if="(row.skills ?? []).length > 3"
                class="text-xs"
                style="color: var(--ink-subtle)"
                >+{{ row.skills.length - 3 }}</span
              >
            </div>
          </template>
          <template #score-cell="{ row: { original: row } }">
            <UBadge
              v-if="row.matchScore != null"
              :color="scoreColor(row.matchScore)"
              variant="subtle"
              size="sm"
              class="font-mono tabular-nums"
            >
              {{ Number(row.matchScore).toFixed(0) }}
            </UBadge>
            <span v-else class="text-xs" style="color: var(--ink-subtle)">—</span>
          </template>
          <template #status-cell="{ row: { original: row } }">
            <ApplicationStatusBadge v-if="row.status" :status="row.status" />
            <span v-else style="color: var(--ink-subtle)">—</span>
          </template>
          <template #actions-cell="{ row: { original: row } }">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-eye"
              :to="`/employer/candidates/${row.id}`"
            />
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

    <!-- Right panel (detail view) -->
    <div class="lg:col-span-7 h-full" :class="{ 'hidden lg:block': !isDetailRoute }">
      <NuxtPage />
    </div>
  </div>
</template>
