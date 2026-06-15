<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'HH Mail Templates' })

const api = useApi()
const toast = useToast()

interface HhMailTemplate {
  id: string
  name?: string
  text: string
}

const { data, pending, refresh, error } = await useAsyncData('hh-mail-templates', () =>
  api.get<{ items: HhMailTemplate[] }>('/api/v1/hh/mail-templates').catch((e) => {
    if (e?.response?.status === 403 || e?.data?.statusCode === 403)
      return { items: [], _forbidden: true }
    throw e
  }),
)

const templates = computed(() => data.value?.items ?? [])
const isForbidden = computed(() => (data.value as any)?._forbidden)

const editing = ref<string | null>(null)
const editText = ref('')
const saving = ref(false)

function startEdit(t: HhMailTemplate) {
  editing.value = t.id
  editText.value = t.text
}

function cancelEdit() {
  editing.value = null
  editText.value = ''
}

async function saveTemplate(templateId: string) {
  if (!editText.value.trim()) return
  saving.value = true
  try {
    await api.put(`/api/v1/hh/mail-templates/${templateId}`, { text: editText.value })
    toast.add({ title: 'Template saved', color: 'success' })
    editing.value = null
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Failed to save template'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
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
        HH.uz · Settings
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
        Mail Templates
      </h1>
      <p class="mt-1 text-sm" style="color: var(--ink-muted)">
        Customize email templates used when sending invitations and responses on HH.uz.
      </p>
    </div>

    <div v-if="pending" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-xl h-24 animate-pulse"
        style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
      />
    </div>

    <CommonErrorState v-else-if="error" :retry="() => refresh()" />

    <div v-else-if="isForbidden" class="flex flex-col items-center py-20 gap-3 text-center">
      <UIcon
        name="i-heroicons-lock-closed"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 22px; color: var(--ink); font-weight: 400"
      >
        Access pending
      </p>
      <p class="text-sm max-w-sm" style="color: var(--ink-muted)">
        HH API permissions for mail templates are being reviewed.
      </p>
    </div>

    <div v-else-if="!templates.length" class="flex flex-col items-center py-20 gap-3">
      <UIcon
        name="i-heroicons-envelope"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 22px; color: var(--ink); font-weight: 400"
      >
        No templates found
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        HH mail templates will appear here once available.
      </p>
    </div>

    <div v-else class="space-y-4 max-w-3xl">
      <UCard v-for="tmpl in templates" :key="tmpl.id">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <p class="text-sm font-medium" style="color: var(--ink)">
              {{ tmpl.name ?? `Template ${tmpl.id}` }}
            </p>
            <p class="text-[10px] font-mono" style="color: var(--ink-subtle)">ID: {{ tmpl.id }}</p>
          </div>
          <UButton
            v-if="editing !== tmpl.id"
            size="xs"
            variant="outline"
            icon="i-heroicons-pencil-square"
            @click="startEdit(tmpl)"
          >
            Edit
          </UButton>
        </div>

        <div v-if="editing === tmpl.id" class="space-y-2">
          <UTextarea
            v-model="editText"
            :rows="6"
            class="w-full font-mono text-sm"
            :maxlength="10000"
          />
          <div class="flex gap-2 justify-end">
            <UButton size="sm" variant="ghost" @click="cancelEdit">Cancel</UButton>
            <UButton size="sm" :loading="saving" @click="saveTemplate(tmpl.id)">Save</UButton>
          </div>
        </div>
        <p
          v-else
          class="text-sm whitespace-pre-wrap leading-relaxed"
          style="color: var(--ink-muted)"
        >
          {{ tmpl.text }}
        </p>
      </UCard>
    </div>
  </div>
</template>
