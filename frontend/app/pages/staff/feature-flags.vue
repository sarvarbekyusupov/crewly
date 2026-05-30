<script setup lang="ts">
definePageMeta({ layout: 'staff' })

const api = useStaffApi()
const toast = useToast()
const { t } = useI18n()

const {
  data: flags,
  pending,
  refresh,
} = await useAsyncData('feature-flags', () => api.get<any[]>('/api/v1/staff/feature-flags'))

const showModal = ref(false)
const isEditing = ref(false)
const form = reactive({
  name: '',
  enabled: false,
  rolloutPercentage: 0,
  companyOverridesJson: '{}',
})

function openCreate() {
  isEditing.value = false
  form.name = ''
  form.enabled = false
  form.rolloutPercentage = 0
  form.companyOverridesJson = '{}'
  showModal.value = true
}

function openEdit(flag: any) {
  isEditing.value = true
  form.name = flag.name
  form.enabled = flag.enabled
  form.rolloutPercentage = flag.rolloutPercentage
  form.companyOverridesJson = JSON.stringify(flag.companyOverrides || {}, null, 2)
  showModal.value = true
}

const saving = ref(false)
async function saveFlag() {
  saving.value = true
  try {
    let overrides = {}
    try {
      overrides = JSON.parse(form.companyOverridesJson)
    } catch (e) {
      toast.add({ title: 'Invalid JSON in overrides', color: 'error' })
      return
    }

    await api.post('/api/v1/staff/feature-flags', {
      name: form.name,
      enabled: form.enabled,
      rolloutPercentage: form.rolloutPercentage,
      companyOverrides: overrides,
    })

    toast.add({ title: 'Flag saved', color: 'success' })
    showModal.value = false
    refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

const showDeleteModal = ref(false)
const deletingFlagName = ref<string | null>(null)

function confirmDeleteFlag(name: string) {
  deletingFlagName.value = name
  showDeleteModal.value = true
}

async function deleteFlag() {
  if (!deletingFlagName.value) return
  try {
    await api.del(`/api/v1/staff/feature-flags/${deletingFlagName.value}`)
    toast.add({ title: t('common.success'), color: 'success' })
    showDeleteModal.value = false
    deletingFlagName.value = null
    refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  }
}

const columns: any[] = [
  { key: 'name', label: 'Name' },
  { key: 'enabled', label: 'Enabled' },
  { key: 'rolloutPercentage', label: 'Rollout %' },
  { key: 'updatedAt', label: 'Updated At' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex items-center justify-between pb-6"
      style="border-bottom: 1px solid var(--line)"
    >
      <div>
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
          Staff · Config
        </p>
        <h1
          style="
            font-family: 'Fraunces', serif;
            font-size: 28px;
            line-height: 1.05;
            letter-spacing: -0.035em;
            color: var(--ink);
            font-weight: 400;
          "
        >
          Feature Flags
        </h1>
      </div>
      <UButton icon="i-heroicons-plus" @click="openCreate">Create Flag</UButton>
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <UTable
        :data="flags ?? []"
        :columns="columns"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-flag', label: 'No feature flags defined' }"
      >
        <template #name-cell="{ row: { original: row } }">
          <span class="font-mono text-sm" style="color: var(--ink)">{{ row.name }}</span>
        </template>
        <template #enabled-cell="{ row: { original: row } }">
          <UBadge :color="row.enabled ? 'success' : 'neutral'" variant="subtle" size="xs">
            {{ row.enabled ? 'Enabled' : 'Disabled' }}
          </UBadge>
        </template>
        <template #rolloutPercentage-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{ row.rolloutPercentage }}%</span>
        </template>
        <template #updatedAt-cell="{ row: { original: row } }">
          <span class="text-xs" style="color: var(--ink-subtle)">{{
            formatDateTime(row.updatedAt)
          }}</span>
        </template>
        <template #actions-cell="{ row: { original: row } }">
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              icon="i-heroicons-pencil-square"
              size="xs"
              @click="openEdit(row)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              size="xs"
              @click="confirmDeleteFlag(row.name)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Upsert Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header> {{ isEditing ? 'Edit' : 'Create' }} Feature Flag </template>

          <form class="space-y-4" @submit.prevent="saveFlag">
            <UFormField label="Flag Name">
              <UInput
                v-model="form.name"
                placeholder="e.g. linkedin-sourcing"
                :disabled="isEditing"
                autofocus
              />
            </UFormField>

            <div class="flex items-center justify-between">
              <span class="text-sm" style="color: var(--ink)">Enable for everyone?</span>
              <UToggle v-model="form.enabled" />
            </div>

            <UFormField label="Rollout Percentage (0-100)">
              <div class="flex items-center gap-4">
                <URange v-model="form.rolloutPercentage" :min="0" :max="100" class="flex-1" />
                <span class="w-12 text-right font-mono text-sm">{{ form.rolloutPercentage }}%</span>
              </div>
            </UFormField>

            <UFormField label="Company Overrides (JSON)">
              <UTextarea
                v-model="form.companyOverridesJson"
                placeholder='{ "company-uuid": true }'
                :rows="5"
                class="font-mono text-xs"
              />
              <p class="text-[10px] mt-1" style="color: var(--ink-subtle)">
                Map company IDs to boolean values.
              </p>
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="outline" @click="showModal = false">Cancel</UButton>
              <UButton type="submit" color="primary" :loading="saving">Save Flag</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <CommonConfirmModal
      v-model:open="showDeleteModal"
      title="Delete feature flag"
      confirm-label="Delete"
      confirm-color="error"
      @confirm="deleteFlag"
    >
      <p class="text-sm" style="color: var(--ink-muted)">
        Delete flag <code class="font-mono">{{ deletingFlagName }}</code
        >? Cannot be undone.
      </p>
    </CommonConfirmModal>
  </div>
</template>
