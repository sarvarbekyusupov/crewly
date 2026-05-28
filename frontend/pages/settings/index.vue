<script setup lang="ts">
import type { Company, User } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const { data: company, refresh: refreshCompany } = await useAsyncData('company', () =>
  api.get<Company>('/api/v1/companies/me'),
)

const { data: users, refresh: refreshUsers } = await useAsyncData('users', () =>
  api.get<User[]>('/api/v1/companies/me/users'),
)

const companyForm = reactive({
  name: '',
  website: '',
  industry: '',
  size: '',
  contactPhone: '',
  address: '',
})

watchEffect(() => {
  if (company.value) {
    Object.assign(companyForm, {
      name: company.value.name ?? '',
      website: company.value.website ?? '',
      industry: company.value.industry ?? '',
      size: company.value.size ?? '',
      contactPhone: company.value.contactPhone ?? '',
      address: company.value.address ?? '',
    })
  }
})

async function saveCompany() {
  try {
    await api.patch('/api/v1/companies/me', companyForm)
    toast.add({ title: t('common.success'), color: 'success' })
    refreshCompany()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const showInviteModal = ref(false)
const inviteForm = reactive({ email: '', fullName: '', role: 'hiring_manager' })

async function inviteUser() {
  try {
    await api.post('/api/v1/companies/me/users', inviteForm)
    toast.add({ title: t('common.success'), color: 'success' })
    showInviteModal.value = false
    Object.assign(inviteForm, { email: '', fullName: '', role: 'hiring_manager' })
    refreshUsers()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const showRemoveModal = ref(false)
const removeUserId = ref<string | null>(null)

function confirmRemoveUser(userId: string) {
  removeUserId.value = userId
  showRemoveModal.value = true
}

async function removeUser() {
  if (!removeUserId.value) return
  try {
    await api.del(`/api/v1/companies/me/users/${removeUserId.value}`)
    toast.add({ title: t('common.success'), color: 'success' })
    showRemoveModal.value = false
    removeUserId.value = null
    refreshUsers()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  }
}

const roleOptions = [
  { label: t('settings.roles.admin'), value: 'admin' },
  { label: t('settings.roles.hiring_manager'), value: 'hiring_manager' },
  { label: t('settings.roles.viewer'), value: 'viewer' },
]

const { roleLabel } = useStatusLabels()

function roleColor(role: string) {
  const map: Record<string, string> = {
    owner: 'primary',
    admin: 'info',
    hiring_manager: 'success',
    viewer: 'neutral',
  }
  return map[role] ?? 'neutral'
}

const userColumns = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'lastLoginAt', label: 'Last login' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <PageHead
      eyebrow="Account"
      :title="t('settings.title')"
      subtitle="Manage your company profile and preferences."
    />

    <UCard>
      <template #header>
        <h2 class="section-label">{{ t('settings.commercialTerms') }}</h2>
      </template>
      <p class="text-sm mb-4" style="color: var(--ink-muted)">
        {{ t('settings.commercialTermsHint') }}
      </p>
      <UButton to="/terms" variant="outline" size="sm" icon="i-heroicons-document-text">
        {{ t('landing.navPricing') }}
      </UButton>
    </UCard>

    <!-- Company settings -->
    <UCard>
      <template #header>
        <h2 class="section-label">{{ t('settings.company') }}</h2>
      </template>
      <form class="space-y-4" @submit.prevent="saveCompany">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Company name">
            <UInput v-model="companyForm.name" class="w-full" />
          </UFormField>
          <UFormField label="Website">
            <UInput v-model="companyForm.website" type="url" class="w-full" />
          </UFormField>
          <UFormField label="Industry">
            <UInput v-model="companyForm.industry" class="w-full" />
          </UFormField>
          <UFormField label="Size">
            <USelect
              v-model="companyForm.size"
              :options="[
                { label: '1-10', value: '1-10' },
                { label: '11-50', value: '11-50' },
                { label: '51-200', value: '51-200' },
                { label: '200+', value: '200+' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Phone">
            <UInput v-model="companyForm.contactPhone" class="w-full" />
          </UFormField>
          <UFormField label="Address">
            <UInput v-model="companyForm.address" class="w-full" />
          </UFormField>
        </div>
        <div class="flex justify-end">
          <UButton v-if="auth.can('admin')" type="submit">{{ t('common.save') }}</UButton>
        </div>
      </form>
    </UCard>

    <!-- Users -->
    <UCard :ui="{ body: { padding: 'p-0' } }">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="section-label">{{ t('settings.users') }}</h2>
          <UButton
            v-if="auth.can('admin')"
            size="sm"
            icon="i-heroicons-plus"
            @click="showInviteModal = true"
          >
            {{ t('settings.inviteUser') }}
          </UButton>
        </div>
      </template>
      <UTable :rows="users ?? []" :columns="userColumns">
        <template #role-data="{ row }">
          <UBadge :color="roleColor(row.role)" variant="subtle" size="xs">
            {{ roleLabel(row.role) }}
          </UBadge>
        </template>
        <template #lastLoginAt-data="{ row }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            formatDate(row.lastLoginAt)
          }}</span>
        </template>
        <template #actions-data="{ row }">
          <UButton
            v-if="auth.can('admin') && row.role !== 'owner' && row.id !== auth.user?.id"
            variant="ghost"
            size="xs"
            color="error"
            icon="i-heroicons-trash"
            @click="confirmRemoveUser(row.id)"
          />
        </template>
      </UTable>
    </UCard>

    <!-- Invite modal -->
    <UModal v-model:open="showInviteModal">
      <template #content>
        <UCard>
          <template #header>{{ t('settings.inviteUser') }}</template>
          <div class="space-y-4">
            <UFormField label="Full name" required>
              <UInput v-model="inviteForm.fullName" required class="w-full" />
            </UFormField>
            <UFormField label="Email" required>
              <UInput v-model="inviteForm.email" type="email" required class="w-full" />
            </UFormField>
            <UFormField label="Role">
              <USelect v-model="inviteForm.role" :options="roleOptions" class="w-full" />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showInviteModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton @click="inviteUser">{{ t('common.create') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Remove user confirmation -->
    <UModal v-model:open="showRemoveModal">
      <template #content>
        <UCard>
          <template #header>Remove team member</template>
          <p class="text-sm" style="color: var(--ink-muted)">
            This will permanently remove the user from your company. They will lose all access
            immediately.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showRemoveModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="error" @click="removeUser">Remove</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
