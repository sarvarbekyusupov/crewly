<script setup lang="ts">
import type { Company } from '~/types/api'

definePageMeta({ layout: 'staff', middleware: 'staff-auth' })

const api = useStaffApi()
const search = ref('')

const { data: companies, pending } = await useAsyncData('staff-companies', () =>
  api.get<Company[]>('/api/v1/staff/companies'),
)

const filtered = computed(() => {
  if (!search.value) return companies.value ?? []
  const q = search.value.toLowerCase()
  return (companies.value ?? []).filter(
    (c) => c.name?.toLowerCase().includes(q) || c.contactEmail?.toLowerCase().includes(q),
  )
})

const columns: any[] = [
  { key: 'name', label: 'Company' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'pricingTier', label: 'Tier' },
  { key: 'counts', label: 'Users / Jobs' },
  { key: 'createdAt', label: 'Created' },
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
        Companies
      </h1>
    </div>

    <UInput
      v-model="search"
      icon="i-heroicons-magnifying-glass"
      placeholder="Search..."
      class="max-w-xs"
    />

    <UCard :ui="{ body: 'p-0' }">
      <UTable
        :data="(filtered) as any[]"
        :columns="columns"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-building-office-2', label: 'No companies' }"
      >
        <template #name-cell="{ row: { original: row } }">
          <div>
            <p class="font-medium" style="color: var(--ink)">{{ row.name }}</p>
            <p class="text-xs" style="color: var(--ink-muted)">{{ row.legalName ?? '' }}</p>
          </div>
        </template>
        <template #status-cell="{ row: { original: row } }">
          <UBadge :color="companyStatusColor(row.status)" variant="subtle" size="xs">{{
            row.status
          }}</UBadge>
        </template>
        <template #pricingTier-cell="{ row: { original: row } }">
          <UBadge color="neutral" variant="subtle" size="xs">{{ row.pricingTier }}</UBadge>
        </template>
        <template #counts-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">
            {{ row._count?.users ?? 0 }} / {{ row._count?.jobs ?? 0 }}
          </span>
        </template>
        <template #createdAt-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            formatDate(row.createdAt)
          }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
