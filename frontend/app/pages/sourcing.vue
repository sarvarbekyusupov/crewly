<script setup lang="ts">
import type { LinkedInSearchResponse, LinkedInProfile } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const api = useApi()

onMounted(() => {
  if (!auth.can('admin')) {
    router.push('/dashboard')
  }
})

useHead({ title: t('nav.sourcing') })

const toast = useToast()
const query = ref('')
const location = ref('')
const isSearching = ref(false)
const searchError = ref('')
const results = ref<LinkedInProfile[]>([])
const hasSearched = ref(false)
const ingestingIds = ref(new Set<string>())

async function doSearch() {
  if (!query.value.trim()) return

  isSearching.value = true
  searchError.value = ''
  hasSearched.value = true
  results.value = []

  try {
    const queryParams: Record<string, string> = { q: query.value.trim() }
    if (location.value.trim()) {
      queryParams.location = location.value.trim()
    }
    const res = await api.get<LinkedInSearchResponse>('/api/v1/sourcing/linkedin', {
      query: queryParams,
    })
    results.value = res.data ?? []
  } catch (e) {
    searchError.value = extractApiErrorMessage(e, 'Failed to search LinkedIn')
  } finally {
    isSearching.value = false
  }
}

async function ingestCandidate(profile: LinkedInProfile) {
  const id = profile.profile_id || profile.linkedin_url || profile.full_name || 'unknown'
  if (ingestingIds.value.has(id)) return

  ingestingIds.value.add(id)
  try {
    await api.post('/api/v1/sourcing/linkedin/ingest', profile)
    toast.add({
      title: 'Candidate ingested',
      description: `${profile.full_name || 'Candidate'} has been added to the talent pool. Matchmaker will notify you if there is a match for your roles.`,
      color: 'success',
    })
  } catch (e) {
    toast.add({
      title: 'Ingestion failed',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    ingestingIds.value.delete(id)
  }
}
</script>

<template>
  <div v-if="auth.can('admin')" class="space-y-6">
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
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
        {{ t('nav.intelligence') }}
      </p>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--ink);
          font-weight: 400;
        "
      >
        {{ t('nav.sourcing') }}
      </h1>
    </div>

    <!-- Search Form -->
    <UCard>
      <form class="flex flex-col sm:flex-row gap-4 items-end" @submit.prevent="doSearch">
        <UFormGroup label="Keywords / Boolean String" class="flex-1">
          <UInput
            v-model="query"
            placeholder='e.g. "Senior React Developer" AND "Fintech"'
            icon="i-heroicons-magnifying-glass"
          />
        </UFormGroup>
        <UFormGroup label="Location (Optional)" class="w-full sm:w-64">
          <UInput
            v-model="location"
            placeholder="e.g. Tashkent, Uzbekistan"
            icon="i-heroicons-map-pin"
          />
        </UFormGroup>
        <UButton type="submit" color="primary" :loading="isSearching" :disabled="!query.trim()">
          {{ t('common.search') }}
        </UButton>
      </form>
    </UCard>

    <!-- Error State -->
    <UAlert
      v-if="searchError"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      variant="soft"
      :title="searchError"
    />

    <!-- Empty State -->
    <div v-else-if="hasSearched && !isSearching && results.length === 0" class="py-12 text-center">
      <UIcon
        name="i-heroicons-face-frown"
        class="w-12 h-12 mb-4 mx-auto"
        style="color: var(--ink-subtle)"
      />
      <h3 class="text-lg font-medium" style="color: var(--ink)">No candidates found</h3>
      <p class="text-sm mt-1" style="color: var(--ink-muted)">
        Try broadening your search terms or removing the location filter.
      </p>
    </div>

    <!-- Results Grid -->
    <div
      v-else-if="results.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <UCard
        v-for="(profile, idx) in results"
        :key="profile.profile_id || idx"
        class="flex flex-col h-full"
        :ui="{ body: 'p-4 flex-1 flex flex-col' }"
      >
        <div class="flex items-start gap-4 mb-4">
          <UAvatar
            :src="profile.profile_pic_url"
            :alt="profile.full_name || profile.first_name || 'Candidate'"
            size="lg"
            class="shrink-0 bg-gray-100"
          />
          <div class="min-w-0">
            <h3 class="font-medium truncate" style="color: var(--ink)">
              {{
                profile.full_name ||
                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                'LinkedIn Member'
              }}
            </h3>
            <p class="text-xs truncate mt-0.5" style="color: var(--ink-muted)">
              {{ profile.headline || profile.experiences?.[0]?.title || 'No title' }}
            </p>
            <p
              v-if="profile.location"
              class="text-xs truncate mt-1 flex items-center gap-1"
              style="color: var(--ink-subtle)"
            >
              <UIcon name="i-heroicons-map-pin" class="w-3 h-3" />
              {{ profile.location }}
            </p>
          </div>
        </div>

        <div class="flex-1 mt-2">
          <p v-if="profile.summary" class="text-sm line-clamp-3" style="color: var(--ink-subtle)">
            {{ profile.summary }}
          </p>
          <div
            v-else-if="profile.experiences?.length"
            class="space-y-2 mt-3 pt-3 border-t"
            style="border-color: var(--line-soft)"
          >
            <div
              v-for="exp in profile.experiences.slice(0, 2)"
              :key="(exp.company || '') + (exp.title || '')"
            >
              <p class="text-xs font-medium truncate" style="color: var(--ink)">{{ exp.title }}</p>
              <p class="text-xs truncate" style="color: var(--ink-muted)">{{ exp.company }}</p>
            </div>
          </div>
        </div>

        <div
          class="mt-4 pt-4 border-t flex items-center justify-between"
          style="border-color: var(--line-soft)"
        >
          <UButton
            v-if="profile.linkedin_url"
            :to="profile.linkedin_url"
            target="_blank"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-simple-icons-linkedin"
          >
            View Profile
          </UButton>
          <span v-else class="text-xs italic" style="color: var(--ink-subtle)">URL hidden</span>

          <UButton
            color="primary"
            variant="soft"
            size="xs"
            icon="i-heroicons-user-plus"
            :loading="
              ingestingIds.has(
                profile.profile_id || profile.linkedin_url || profile.full_name || 'unknown',
              )
            "
            @click="ingestCandidate(profile)"
          >
            Ingest
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
