<script setup lang="ts">
import type { Placement } from '~/types/api'
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const auth = useAuthStore()

const id = route.params.id as string

const {
  data: placement,
  pending,
  refresh,
} = await useAsyncData(`placement-${id}`, () => api.get<Placement>(`/api/v1/placements/${id}`))

const showSeparationModal = ref(false)
const sepForm = reactive({ separationDate: '', replacementRequired: false })

async function recordSeparation() {
  try {
    await api.post(`/api/v1/placements/${id}/separation`, sepForm)
    toast.add({ title: t('common.success'), color: 'success' })
    showSeparationModal.value = false
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const { invoiceStatusLabel } = useStatusLabels()
</script>

<template>
  <ListSkeleton v-if="pending" />

  <div v-else-if="placement" class="space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <NuxtLink to="/placements" style="color: var(--ink-muted); margin-top: 6px">
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div class="min-w-0">
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
              {{ t('placements.breadcrumb') }}
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
              {{ placement.candidate?.fullName ?? '—' }}
            </h1>
            <p style="color: var(--ink-muted); font-size: 14px; margin-top: 4px">
              {{ placement.job?.title ?? '—' }}
            </p>
          </div>
        </div>
        <div v-if="auth.can('admin') && placement.candidateStillEmployed" class="shrink-0">
          <UButton size="sm" color="warning" variant="outline" @click="showSeparationModal = true">
            {{ t('placements.separation') }}
          </UButton>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <h3 class="section-label mb-4">{{ t('placements.dealTerms') }}</h3>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">{{ t('placements.salary') }}</dt>
            <dd class="font-semibold" style="color: var(--ink)">
              {{ formatSalary(placement.agreedSalaryUzs) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.feePercent') }}
            </dt>
            <dd class="font-medium" style="color: var(--ink)">
              {{ placement.feePercentage }}% ({{ placement.feeBasis }})
            </dd>
          </div>
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.totalFee') }}
            </dt>
            <dd class="font-semibold" style="color: var(--ink)">
              {{ formatSalary(placement.totalFeeUzs) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.startDate') }}
            </dt>
            <dd class="font-medium" style="color: var(--ink)">
              {{ formatDate(placement.startDate) }}
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <h3 class="section-label mb-4">{{ t('placements.guaranteeSection') }}</h3>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.periodDays') }}
            </dt>
            <dd class="font-medium" style="color: var(--ink)">
              {{ placement.guaranteePeriodDays }} {{ t('common.days') }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">{{ t('placements.expires') }}</dt>
            <dd class="font-medium" style="color: var(--ink)">
              {{ formatDate(placement.guaranteeExpiresAt) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.employmentStatus') }}
            </dt>
            <dd>
              <UBadge
                :color="placement.candidateStillEmployed ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{
                  placement.candidateStillEmployed
                    ? t('placements.stillEmployed')
                    : t('placements.notEmployed')
                }}
              </UBadge>
            </dd>
          </div>
          <div v-if="placement.separationDate" class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.separationDateLabel') }}
            </dt>
            <dd class="font-medium" style="color: var(--ink)">
              {{ formatDate(placement.separationDate) }}
            </dd>
          </div>
          <div v-if="placement.replacementRequired" class="flex justify-between">
            <dt style="color: var(--ink-subtle); font-size: 11px">
              {{ t('placements.replacementLabel') }}
            </dt>
            <dd>
              <UBadge color="warning" variant="subtle" size="xs">{{
                t('placements.replacementRequired')
              }}</UBadge>
            </dd>
          </div>
        </dl>
      </UCard>
    </div>

    <!-- Invoices -->
    <UCard v-if="placement.invoices?.length">
      <h3 class="section-label mb-3">{{ t('invoices.title') }}</h3>
      <div class="space-y-2">
        <div
          v-for="inv in placement.invoices"
          :key="inv.id"
          class="flex items-center justify-between p-3 rounded-lg"
          style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
        >
          <div>
            <p class="font-medium text-sm" style="color: var(--ink)">{{ inv.invoiceNumber }}</p>
            <p class="text-xs" style="color: var(--ink-muted)">{{ formatSalary(inv.totalUzs) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="
                inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'info'
              "
              variant="subtle"
              size="xs"
            >
              {{ invoiceStatusLabel(inv.status) }}
            </UBadge>
            <UButton variant="ghost" size="xs" icon="i-heroicons-eye" :to="`/invoices/${inv.id}`" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Separation modal -->
    <UModal v-model:open="showSeparationModal">
      <template #content>
        <UCard>
          <template #header>{{ t('placements.separation') }}</template>
          <div class="space-y-4">
            <UFormField :label="t('placements.separationDateLabel')" required>
              <UInput v-model="sepForm.separationDate" type="date" class="w-full" required />
            </UFormField>
            <div class="flex items-center gap-2">
              <UCheckbox v-model="sepForm.replacementRequired" />
              <label class="text-sm">{{ t('placements.replacementRequired') }}</label>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showSeparationModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="warning" @click="recordSeparation">{{ t('common.confirm') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>

  <div v-else class="py-24 text-center space-y-3">
    <p style="color: var(--ink-muted)">{{ t('common.notFound') }}</p>
    <UButton variant="outline" size="sm" @click="refresh">{{ t('common.retry') }}</UButton>
  </div>
</template>
