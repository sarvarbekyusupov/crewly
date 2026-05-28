<script setup lang="ts">
import type { Candidate } from '~/types/api'

definePageMeta({ layout: 'staff', middleware: 'staff-auth' })

const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const dncFilter = ref(route.query.dnc === 'true')
const search = ref('')

const {
  data: candidates,
  pending,
  refresh,
} = await useAsyncData('staff-candidates', () =>
  api.get<Candidate[]>('/api/v1/staff/candidates', dncFilter.value ? { dnc: 'true' } : undefined),
)

watch(dncFilter, () => {
  router.replace({ query: dncFilter.value ? { dnc: 'true' } : {} })
  refresh()
})

const filtered = computed(() => {
  if (!search.value) return candidates.value ?? []
  const q = search.value.toLowerCase()
  return (candidates.value ?? []).filter(
    (c) => c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q),
  )
})

async function markDnc(id: string) {
  try {
    await api.post(`/api/v1/staff/candidates/${id}/dnc`)
    toast.add({ title: 'Success', description: 'Marked as DNC', color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: 'Error', description: extractApiErrorMessage(e), color: 'error' })
  }
}

const columns = [
  { key: 'fullName', label: 'Name' },
  { key: 'source', label: 'Source' },
  { key: 'consent', label: 'Consent' },
  { key: 'lastActive', label: 'Last active' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <p
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ink-subtle);
          margin-bottom: 8px;
        "
      >
        Staff · Management
      </p>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 32px;
          line-height: 1.05;
          letter-spacing: -0.035em;
          color: var(--ink);
          font-weight: 400;
        "
      >
        All Candidates
      </h1>
    </div>

    <div class="flex gap-3 flex-wrap items-center">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search..."
        class="max-w-xs"
      />
      <div class="flex items-center gap-2">
        <USwitch v-model="dncFilter" />
        <label class="text-sm" style="color: var(--ink-muted)">DNC only</label>
      </div>
    </div>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable
        :rows="filtered"
        :columns="columns"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-users', label: 'No candidates' }"
      >
        <template #fullName-data="{ row }">
          <div>
            <div class="flex items-center gap-2">
              <p class="font-medium" style="color: var(--ink)">{{ row.fullName ?? '—' }}</p>
              <UBadge v-if="row.doNotContact" color="error" variant="subtle" size="xs">DNC</UBadge>
            </div>
            <p class="text-xs" style="color: var(--ink-muted)">
              {{ row.email ?? '' }} · {{ row.city ?? '' }}
            </p>
          </div>
        </template>
        <template #source-data="{ row }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            row.sourceId ? 'hh.ru' : 'Manual'
          }}</span>
        </template>
        <template #consent-data="{ row }">
          <UBadge
            :color="
              row.consentStatus === 'explicit'
                ? 'success'
                : row.consentStatus === 'withdrawn'
                  ? 'error'
                  : 'neutral'
            "
            variant="subtle"
            size="xs"
          >
            {{ row.consentStatus }}
          </UBadge>
        </template>
        <template #lastActive-data="{ row }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            formatDate(row.lastActiveAt)
          }}</span>
        </template>
        <template #actions-data="{ row }">
          <UButton
            v-if="!row.doNotContact"
            variant="ghost"
            size="xs"
            color="error"
            icon="i-heroicons-no-symbol"
            @click="markDnc(row.id)"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>
