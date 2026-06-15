<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { Company, User } from '~/types/api'
import { companySchema, inviteMemberSchema } from '~/schemas/settings'

const { t } = useI18n()
useHead({ title: computed(() => t('settings.title')) })
const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const { data: company, refresh: refreshCompany } = await useAsyncData('company', () =>
  api.get<Company>('/api/v1/companies/me'),
)

const { data: users, refresh: refreshUsers } = await useAsyncData('users', () =>
  api.get<User[]>('/api/v1/companies/me/users'),
)

// --- Company form ---
const {
  errors: companyErrors,
  handleSubmit: companyHandleSubmit,
  defineField: companyDefineField,
  setValues: setCompanyValues,
  setFieldError: setCompanyFieldError,
} = useForm({ validationSchema: toTypedSchema(companySchema) })

watchEffect(() => {
  if (company.value) {
    setCompanyValues({
      name: company.value.name ?? '',
      website: company.value.website ?? '',
      industry: company.value.industry ?? '',
      size: company.value.size ?? '',
      contactPhone: company.value.contactPhone ?? '',
      address: company.value.address ?? '',
    })
  }
})

const [companyName, companyNameProps] = companyDefineField('name')
const [companyWebsite, companyWebsiteProps] = companyDefineField('website')
const [companyIndustry, companyIndustryProps] = companyDefineField('industry')
const [companySize, companySizeProps] = companyDefineField('size')
const [companyPhone, companyPhoneProps] = companyDefineField('contactPhone')
const [companyAddress, companyAddressProps] = companyDefineField('address')

const saveCompany = companyHandleSubmit(async (values) => {
  try {
    await api.patch('/api/v1/companies/me', values)
    toast.add({ title: t('common.success'), color: 'success' })
    refreshCompany()
  } catch (e) {
    applyApiFieldErrors(e, setCompanyFieldError)
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  }
})

// --- Invite form ---
const showInviteModal = ref(false)

const {
  errors: inviteErrors,
  handleSubmit: inviteHandleSubmit,
  defineField: inviteDefineField,
  resetForm: resetInviteForm,
  setFieldError: setInviteFieldError,
} = useForm({
  validationSchema: toTypedSchema(inviteMemberSchema),
  initialValues: { role: 'hiring_manager' as const },
})

const [inviteFullName, inviteFullNameProps] = inviteDefineField('fullName')
const [inviteEmail, inviteEmailProps] = inviteDefineField('email')
const [inviteRole, inviteRoleProps] = inviteDefineField('role')

const inviteUser = inviteHandleSubmit(async (values) => {
  try {
    await api.post('/api/v1/companies/me/users', values)
    toast.add({ title: t('common.success'), color: 'success' })
    showInviteModal.value = false
    resetInviteForm({ values: { fullName: '', email: '', role: 'hiring_manager' } })
    refreshUsers()
  } catch (e) {
    applyApiFieldErrors(e, setInviteFieldError)
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  }
})

// --- Remove user ---
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

function roleColor(
  role: string,
): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  const map: Record<
    string,
    'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  > = {
    owner: 'primary',
    admin: 'info',
    hiring_manager: 'success',
    viewer: 'neutral',
  }
  return map[role] ?? 'neutral'
}

const userColumns: any[] = [
  { accessorKey: 'fullName', header: t('settings.fields.name') },
  { accessorKey: 'email', header: t('settings.fields.email') },
  { accessorKey: 'role', header: t('settings.fields.role') },
  { accessorKey: 'lastLoginAt', header: t('settings.fields.lastLogin') },
  { accessorKey: 'actions', header: '' },
]

// --- Telegram linking ---
const { data: meData, refresh: refreshMe } = await useAsyncData('me', () =>
  api.get<{ telegramChatId: string | null }>('/api/v1/auth/me'),
)

const telegramConnected = computed(() => !!meData.value?.telegramChatId)
const telegramLinkLoading = ref(false)
const telegramBotUrl = ref<string | null>(null)

async function getTelegramLinkCode() {
  telegramLinkLoading.value = true
  telegramBotUrl.value = null
  try {
    const res = await api.get<{ code: string; botUrl: string }>(
      '/api/v1/auth/me/telegram-link-code',
    )
    telegramBotUrl.value = res.botUrl
    // Poll for 2 min to detect when user completes linking
    const start = Date.now()
    const poll = setInterval(async () => {
      await refreshMe()
      if (telegramConnected.value || Date.now() - start > 120_000) {
        clearInterval(poll)
        if (telegramConnected.value) {
          telegramBotUrl.value = null
          toast.add({ title: 'Telegram привязан!', color: 'success' })
        }
      }
    }, 3000)
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e), color: 'error' })
  } finally {
    telegramLinkLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <CommonPageHead
      eyebrow="Account"
      :title="t('settings.title')"
      :subtitle="t('settings.subtitle')"
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
          <UFormField :label="t('settings.fields.companyName')" :error="companyErrors.name">
            <UInput v-model="companyName" v-bind="companyNameProps" class="w-full" />
          </UFormField>
          <UFormField :label="t('settings.fields.website')" :error="companyErrors.website">
            <UInput
              v-model="companyWebsite"
              v-bind="companyWebsiteProps"
              type="url"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('settings.fields.industry')" :error="companyErrors.industry">
            <UInput v-model="companyIndustry" v-bind="companyIndustryProps" class="w-full" />
          </UFormField>
          <UFormField :label="t('settings.fields.size')" :error="companyErrors.size">
            <USelect
              v-model="companySize"
              v-bind="companySizeProps"
              :items="[
                { label: '1-10', value: '1-10' },
                { label: '11-50', value: '11-50' },
                { label: '51-200', value: '51-200' },
                { label: '200+', value: '200+' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('settings.fields.phone')" :error="companyErrors.contactPhone">
            <UInput v-model="companyPhone" v-bind="companyPhoneProps" class="w-full" />
          </UFormField>
          <UFormField :label="t('settings.fields.address')" :error="companyErrors.address">
            <UInput v-model="companyAddress" v-bind="companyAddressProps" class="w-full" />
          </UFormField>
        </div>
        <div class="flex justify-end">
          <UButton v-if="auth.can('admin')" type="submit">{{ t('common.save') }}</UButton>
        </div>
      </form>
    </UCard>

    <!-- Users -->
    <UCard :ui="{ body: 'p-0' }">
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
      <UTable :data="users ?? []" :columns="userColumns">
        <template #role-cell="{ row: { original: row } }">
          <UBadge :color="roleColor(row.role)" variant="subtle" size="xs">
            {{ roleLabel(row.role) }}
          </UBadge>
        </template>
        <template #lastLoginAt-cell="{ row: { original: row } }">
          <span class="text-sm" style="color: var(--ink-muted)">{{
            formatDate(row.lastLoginAt)
          }}</span>
        </template>
        <template #actions-cell="{ row: { original: row } }">
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

    <!-- Telegram -->
    <UCard>
      <template #header>
        <h2 class="section-label">Telegram</h2>
      </template>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium">Уведомления в Telegram</p>
          <p class="text-sm" style="color: var(--ink-muted)">
            Привяжите аккаунт, чтобы получать алерты о кандидатах и одобрять заявки прямо в
            Telegram.
          </p>
        </div>
        <div class="shrink-0">
          <UBadge v-if="telegramConnected" color="success" variant="subtle"> ✓ Подключён </UBadge>
          <UBadge v-else color="neutral" variant="subtle">Не подключён</UBadge>
        </div>
      </div>

      <div v-if="telegramBotUrl" class="mt-4 p-4 rounded-lg" style="background: var(--ui-bg-muted)">
        <p class="text-sm mb-3" style="color: var(--ink-muted)">
          Нажмите кнопку ниже, чтобы открыть Telegram бота. Ссылка действует 15 минут.
        </p>
        <UButton
          :to="telegramBotUrl"
          target="_blank"
          icon="i-heroicons-paper-airplane"
          color="primary"
        >
          Открыть в Telegram
        </UButton>
      </div>

      <div class="mt-4">
        <UButton
          v-if="!telegramConnected"
          :loading="telegramLinkLoading"
          icon="i-heroicons-link"
          variant="outline"
          @click="getTelegramLinkCode"
        >
          {{ telegramBotUrl ? 'Обновить ссылку' : 'Привязать Telegram' }}
        </UButton>
      </div>
    </UCard>

    <!-- Invite modal -->
    <UModal v-model:open="showInviteModal">
      <template #content>
        <UCard>
          <template #header>{{ t('settings.inviteUser') }}</template>
          <div class="space-y-4">
            <UFormField :label="t('settings.fields.fullName')" :error="inviteErrors.fullName">
              <UInput v-model="inviteFullName" v-bind="inviteFullNameProps" class="w-full" />
            </UFormField>
            <UFormField :label="t('settings.fields.email')" :error="inviteErrors.email">
              <UInput v-model="inviteEmail" v-bind="inviteEmailProps" type="email" class="w-full" />
            </UFormField>
            <UFormField :label="t('settings.fields.role')" :error="inviteErrors.role">
              <USelect
                v-model="inviteRole"
                v-bind="inviteRoleProps"
                :items="roleOptions"
                class="w-full"
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showInviteModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton
                @click="
                  async () => {
                    await inviteUser()
                  }
                "
                >{{ t('common.create') }}</UButton
              >
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Remove user confirmation -->
    <UModal v-model:open="showRemoveModal">
      <template #content>
        <UCard>
          <template #header>{{ t('settings.removeUser') }}</template>
          <p class="text-sm" style="color: var(--ink-muted)">
            {{ t('settings.removeUserDesc') }}
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showRemoveModal = false">{{
                t('common.cancel')
              }}</UButton>
              <UButton color="error" @click="removeUser">{{ t('settings.remove') }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
