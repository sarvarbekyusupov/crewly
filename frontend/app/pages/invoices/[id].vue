<script setup lang="ts">
import type { Invoice } from '~/types/api'
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const route = useRoute()
const auth = useAuthStore()

const id = route.params.id as string

const {
  data: invoice,
  pending,
  refresh,
} = await useAsyncData(`invoice-${id}`, () => api.get<Invoice>(`/api/v1/invoices/${id}`))

const showPaidModal = ref(false)
const paidForm = reactive({ paymentReference: '', notes: '' })

async function markPaid() {
  try {
    await api.patch(`/api/v1/invoices/${id}/paid`, paidForm)
    toast.add({ title: t('common.success'), color: 'success' })
    showPaidModal.value = false
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

async function payWithPayme() {
  try {
    const { url } = await api.post<{ url: string }>(`/api/v1/invoices/${id}/pay`)
    window.location.href = url
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const { invoiceStatusLabel } = useStatusLabels()

function printInvoice() {
  window.print()
}
</script>

<template>
  <CommonListSkeleton v-if="pending" />

  <div v-else-if="invoice" class="space-y-5 max-w-2xl">
    <!-- Hero header -->
    <div class="pb-5 print:hidden" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <NuxtLink to="/invoices" style="color: var(--ink-muted); margin-top: 4px">
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  color: var(--ink-subtle);
                "
              >
                {{ t('invoices.breadcrumb') }}
              </p>
              <UBadge :color="invoiceStatusColor(invoice.status)" variant="subtle" size="xs">
                {{ invoiceStatusLabel(invoice.status) }}
              </UBadge>
            </div>
            <h1
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 22px;
                letter-spacing: 0.02em;
                color: var(--ink);
                font-weight: 500;
              "
            >
              {{ invoice.invoiceNumber }}
            </h1>
            <p style="color: var(--ink-muted); font-size: 13px; margin-top: 4px">
              {{ invoice.placement?.candidate?.fullName ?? '—' }} ·
              {{ invoice.placement?.job?.title ?? '—' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton variant="ghost" icon="i-heroicons-printer" size="sm" @click="printInvoice">{{
            t('invoices.print')
          }}</UButton>
          <UButton
            v-if="['issued', 'overdue'].includes(invoice.status)"
            icon="i-heroicons-credit-card"
            color="primary"
            size="sm"
            @click="payWithPayme"
          >
            Pay with Payme
          </UButton>
          <UButton
            v-if="auth.can('admin') && ['issued', 'overdue'].includes(invoice.status)"
            icon="i-heroicons-check"
            size="sm"
            variant="outline"
            @click="showPaidModal = true"
          >
            {{ t('invoices.markPaid') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Invoice document -->
    <div
      class="rounded-2xl overflow-hidden"
      style="background: var(--paper); border: 1px solid var(--line)"
    >
      <!-- Letterhead -->
      <div class="px-8 py-6" style="border-bottom: 1px solid var(--line-soft)">
        <div class="flex items-start justify-between">
          <div>
            <p
              style="
                font-family: 'Fraunces', serif;
                font-size: 24px;
                letter-spacing: -0.04em;
                color: var(--ink);
                font-weight: 400;
              "
            >
              my<em style="font-style: italic; color: var(--accent)">hr</em>
            </p>
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--ink-subtle);
                margin-top: 4px;
              "
            >
              Recruiting Agency
            </p>
          </div>
          <div class="text-right">
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                color: var(--ink-subtle);
              "
            >
              INVOICE
            </p>
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 16px;
                font-weight: 500;
                color: var(--ink);
                margin-top: 2px;
              "
            >
              {{ invoice.invoiceNumber }}
            </p>
          </div>
        </div>
      </div>

      <!-- Amount hero -->
      <div
        class="px-8 py-8"
        style="border-bottom: 1px solid var(--line-soft); background: var(--bg-elevated)"
      >
        <div class="flex items-end justify-between">
          <div>
            <p
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--ink-subtle);
                margin-bottom: 6px;
              "
            >
              {{ t('invoices.totalDue') }}
            </p>
            <p
              style="
                font-family: 'Fraunces', serif;
                font-size: 48px;
                line-height: 1;
                letter-spacing: -0.04em;
                color: var(--ink);
                font-weight: 400;
              "
            >
              {{ formatSalary(invoice.totalUzs) }}
            </p>
          </div>
          <div class="text-right space-y-1">
            <div>
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--ink-subtle);
                "
              >
                {{ t('invoices.issuedLabel') }}
              </p>
              <p style="font-size: 13px; color: var(--ink)">{{ formatDate(invoice.issuedDate) }}</p>
            </div>
            <div>
              <p
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: var(--ink-subtle);
                "
              >
                {{ t('invoices.dueLabel') }}
              </p>
              <p
                style="font-size: 13px; font-weight: 500"
                :style="{ color: invoice.status === 'overdue' ? 'var(--accent)' : 'var(--ink)' }"
              >
                {{ formatDate(invoice.dueDate) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Paid banner -->
        <div
          v-if="invoice.paidAt"
          class="mt-5 rounded-lg px-4 py-3 flex items-center gap-3"
          style="background: rgba(47, 107, 63, 0.08); border: 1px solid rgba(47, 107, 63, 0.2)"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="w-4 h-4 shrink-0"
            style="color: var(--positive)"
          />
          <div>
            <p class="text-sm font-medium" style="color: var(--positive)">
              {{ t('invoices.paidOn', { date: formatDate(invoice.paidAt) }) }}
            </p>
            <p
              v-if="invoice.paymentReference"
              class="text-xs"
              style="color: var(--positive); opacity: 0.8"
            >
              Ref: {{ invoice.paymentReference }}
            </p>
          </div>
        </div>
      </div>

      <!-- Line items -->
      <div class="px-8 py-6" style="border-bottom: 1px solid var(--line-soft)">
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span style="color: var(--ink-muted)">{{ t('invoices.placementFee') }}</span>
            <span style="color: var(--ink)">{{ formatSalary(invoice.amountUzs) }}</span>
          </div>
          <div class="flex justify-between pt-3" style="border-top: 1px solid var(--line-soft)">
            <span
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--ink-subtle);
              "
              >{{ t('common.total') }}</span
            >
            <span class="font-medium" style="color: var(--ink)">{{
              formatSalary(invoice.totalUzs)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Placement details -->
      <div v-if="invoice.placement" class="px-8 py-6">
        <p class="section-label mb-4">{{ t('invoices.placementSection') }}</p>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
              {{ t('common.candidate') }}
            </dt>
            <dd style="color: var(--ink); font-weight: 500">
              {{ invoice.placement.candidate?.fullName ?? '—' }}
            </dd>
          </div>
          <div>
            <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
              {{ t('common.position') }}
            </dt>
            <dd style="color: var(--ink); font-weight: 500">
              {{ invoice.placement.job?.title ?? '—' }}
            </dd>
          </div>
          <div>
            <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
              {{ t('placements.startDate') }}
            </dt>
            <dd style="color: var(--ink)">{{ formatDate(invoice.placement.startDate) }}</dd>
          </div>
          <div>
            <dt style="color: var(--ink-subtle); font-size: 11px; margin-bottom: 2px">
              {{ t('invoices.guaranteeExpires') }}
            </dt>
            <dd style="color: var(--ink)">
              {{ formatDate(invoice.placement.guaranteeExpiresAt) }}
            </dd>
          </div>
        </dl>
        <p v-if="invoice.notes" class="mt-4 text-sm italic" style="color: var(--ink-muted)">
          {{ invoice.notes }}
        </p>
      </div>
    </div>

    <!-- Mark paid modal -->
    <UModal v-model:open="showPaidModal">
      <template #content>
        <UCard>
          <template #header>{{ t('invoices.markPaid') }}</template>
          <div class="space-y-4">
            <UFormField :label="t('invoices.paymentRef')">
              <UInput v-model="paidForm.paymentReference" class="w-full" />
            </UFormField>
            <UFormField :label="t('invoices.notes')">
              <UTextarea v-model="paidForm.notes" :rows="3" class="w-full" />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showPaidModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="success" @click="markPaid">{{ t('common.confirm') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>

  <div v-else class="py-24 text-center space-y-3">
    <p style="color: var(--ink-muted)">{{ t('common.notFound') }}</p>
    <UButton variant="outline" size="sm" @click="() => refresh()">{{ t('common.retry') }}</UButton>
  </div>
</template>
