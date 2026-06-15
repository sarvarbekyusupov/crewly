<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'HH Hidden Vacancies' })

const api = useApi()
const toast = useToast()

interface HhHiddenVacancy {
  id: string
  name: string
  alternate_url: string
  area?: { name: string }
  archived_at?: string
}

const { data, pending, refresh, error } = await useAsyncData('hh-hidden-vacancies', () =>
  api
    .get<{ items: HhHiddenVacancy[]; found: number }>('/api/v1/hh/vacancies/hidden', {
      per_page: 100,
    })
    .catch((e) => {
      if (e?.response?.status === 403 || e?.data?.statusCode === 403)
        return { items: [], found: 0, _forbidden: true }
      throw e
    }),
)

const vacancies = computed(() => data.value?.items ?? [])
const isForbidden = computed(() => (data.value as any)?._forbidden)

const restoringId = ref<string | null>(null)

async function restore(hhId: string) {
  restoringId.value = hhId
  try {
    await api.del(`/api/v1/hh/vacancies/hidden/${hhId}`)
    toast.add({ title: 'Vacancy restored on HH', color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: extractApiErrorMessage(e, 'Restore failed'), color: 'error' })
  } finally {
    restoringId.value = null
  }
}

function formatDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
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
        HH.uz
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
        Hidden Vacancies
      </h1>
      <p class="mt-1 text-sm" style="color: var(--ink-muted)">
        Archived vacancies on HH.uz — restore to make them active again.
      </p>
    </div>

    <div v-if="pending" class="space-y-2">
      <div
        v-for="i in 5"
        :key="i"
        class="rounded-xl h-16 animate-pulse"
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
        HH API permissions for hidden vacancies are being reviewed.
      </p>
    </div>

    <div v-else-if="!vacancies.length" class="flex flex-col items-center py-20 gap-3">
      <UIcon
        name="i-heroicons-archive-box"
        class="w-12 h-12 opacity-40"
        style="color: var(--ink-subtle)"
      />
      <p
        style="font-family: 'Fraunces', serif; font-size: 22px; color: var(--ink); font-weight: 400"
      >
        No hidden vacancies
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">Archived HH vacancies will appear here.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="v in vacancies"
        :key="v.id"
        class="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
        style="background: var(--paper); border: 1px solid var(--line)"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate" style="color: var(--ink)">{{ v.name }}</p>
          <p class="text-xs mt-0.5" style="color: var(--ink-muted)">
            {{ v.area?.name ?? '—' }}
            <span v-if="v.archived_at">· archived {{ formatDate(v.archived_at) }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a
            :href="v.alternate_url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs hover:underline"
            style="color: var(--ink-muted)"
          >
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
          </a>
          <UButton
            size="xs"
            variant="outline"
            icon="i-heroicons-arrow-path"
            :loading="restoringId === v.id"
            @click="restore(v.id)"
          >
            Restore
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
