<script setup lang="ts">
import type { CandidatePreferences } from '~/types/api'

definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const route = useRoute()

useHead({ title: 'Preferences' })

const { data: prefs, refresh } = await useAsyncData('candidate-preferences', () =>
  api.get<CandidatePreferences>('/api/v1/candidate-portal/preferences').catch(() => null),
)

// Handle redirect back from HH OAuth callback
onMounted(() => {
  if (route.query.hh_connected) {
    toast.add({ title: 'HH.ru account connected', color: 'success' })
    refresh()
  } else if (route.query.hh_error) {
    const msg =
      route.query.hh_error === 'access_denied'
        ? 'Access denied — please try again'
        : 'Failed to connect HH.ru account'
    toast.add({ title: msg, color: 'error' })
  }
})

const form = reactive({
  minMatchScore: 0,
  blacklistedCompanies: [] as string[],
  maxApplicationsPerDay: 5,
  preferredWorkMode: '' as string,
  expectedSalaryUzs: '' as string,
  hhResumeId: '',
})

const blacklistInput = ref('')

watch(
  prefs,
  (p) => {
    if (!p) return
    form.minMatchScore = p.minMatchScore ?? 0
    form.blacklistedCompanies = [...(p.blacklistedCompanies ?? [])]
    form.maxApplicationsPerDay = p.maxApplicationsPerDay ?? 5
    form.preferredWorkMode = p.preferredWorkMode ?? ''
    form.expectedSalaryUzs = p.expectedSalaryUzs ?? ''
    form.hhResumeId = p.hhResumeId ?? ''
  },
  { immediate: true },
)

function addBlacklist() {
  const c = blacklistInput.value.trim()
  if (c && !form.blacklistedCompanies.includes(c)) form.blacklistedCompanies.push(c)
  blacklistInput.value = ''
}

function removeBlacklist(c: string) {
  form.blacklistedCompanies = form.blacklistedCompanies.filter((x) => x !== c)
}

const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/preferences', {
      minMatchScore: form.minMatchScore || null,
      blacklistedCompanies: form.blacklistedCompanies,
      maxApplicationsPerDay: form.maxApplicationsPerDay,
      preferredWorkMode: form.preferredWorkMode || null,
      expectedSalaryUzs: form.expectedSalaryUzs ? Number(form.expectedSalaryUzs) : null,
      ...(form.hhResumeId && { hhResumeId: form.hhResumeId }),
    })
    toast.add({ title: 'Preferences saved', color: 'success' })
    refresh()
  } catch {
    toast.add({ title: 'Save failed', color: 'error' })
  } finally {
    saving.value = false
  }
}

// HH OAuth actions
function connectHh() {
  window.location.href = '/api/v1/candidate-portal/hh/connect'
}

const disconnecting = ref(false)

async function disconnectHh() {
  disconnecting.value = true
  try {
    await api.del('/api/v1/candidate-portal/hh/disconnect')
    toast.add({ title: 'HH.ru account disconnected', color: 'success' })
    refresh()
  } catch {
    toast.add({ title: 'Disconnect failed', color: 'error' })
  } finally {
    disconnecting.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-6">
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
        Settings
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
        Job Preferences
      </h1>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <!-- Match score threshold -->
      <UCard>
        <h3 class="section-label mb-4">Job Preferences</h3>
        <div class="space-y-4">
          <UFormField label="Preferred work mode">
            <div class="flex gap-2">
              <button
                v-for="mode in [
                  { label: 'Any', value: '' },
                  { label: 'Remote', value: 'remote' },
                  { label: 'Hybrid', value: 'hybrid' },
                  { label: 'Office', value: 'office' },
                ]"
                :key="mode.value"
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                :style="
                  form.preferredWorkMode === mode.value
                    ? 'background: var(--ink); color: var(--bg);'
                    : 'background: var(--surface); color: var(--ink-muted); border: 1px solid var(--line);'
                "
                @click="form.preferredWorkMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
          </UFormField>

          <UFormField
            label="Expected salary (UZS/month)"
            hint="Used to filter jobs below your target"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model="form.expectedSalaryUzs"
                type="number"
                min="0"
                step="1000000"
                placeholder="e.g. 5000000"
                class="w-48"
              />
              <span v-if="form.expectedSalaryUzs" class="text-sm" style="color: var(--ink-muted)">
                {{ Number(form.expectedSalaryUzs).toLocaleString() }} UZS
              </span>
            </div>
          </UFormField>

          <UFormField
            label="Minimum match score"
            hint="Jobs below this score are hidden (0 = show all)"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model.number="form.minMatchScore"
                type="number"
                min="0"
                max="100"
                step="5"
                class="w-24"
              />
              <span class="text-sm" style="color: var(--ink-muted)"
                >{{ form.minMatchScore || 'No' }} minimum</span
              >
            </div>
          </UFormField>

          <UFormField label="Max applications per day" hint="Auto-apply will stop after this limit">
            <UInput
              v-model.number="form.maxApplicationsPerDay"
              type="number"
              min="1"
              max="50"
              class="w-24"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Blacklisted companies -->
      <UCard>
        <h3 class="section-label mb-3">Blacklisted Companies</h3>
        <p class="text-sm mb-3" style="color: var(--ink-muted)">
          Jobs from these companies will be hidden and never auto-applied.
        </p>
        <div class="flex gap-2 mb-3">
          <UInput
            v-model="blacklistInput"
            placeholder="Company name..."
            class="flex-1"
            @keydown.enter.prevent="addBlacklist"
          />
          <UButton type="button" variant="outline" icon="i-heroicons-plus" @click="addBlacklist" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="c in form.blacklistedCompanies" :key="c" color="error" variant="subtle">
            {{ c }}
            <button class="ml-1 hover:opacity-70" @click="removeBlacklist(c)">×</button>
          </UBadge>
          <span
            v-if="!form.blacklistedCompanies.length"
            class="text-sm"
            style="color: var(--ink-subtle)"
            >No blacklisted companies</span
          >
        </div>
      </UCard>

      <!-- HH.ru OAuth -->
      <UCard>
        <h3 class="section-label mb-3">HH.ru Auto-Apply</h3>
        <p class="text-sm mb-4" style="color: var(--ink-muted)">
          Connect your HH.ru account so the AI agent can apply to jobs on your behalf.
        </p>

        <!-- Connected state -->
        <div v-if="prefs?.hhOauthTokenSet" class="space-y-4">
          <div
            class="flex items-center gap-3 px-4 py-3 rounded-lg"
            style="background: color-mix(in srgb, var(--color-success-500) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-success-500) 25%, transparent)"
          >
            <UIcon name="i-heroicons-check-circle" class="text-green-500 shrink-0" />
            <div>
              <p class="text-sm font-medium" style="color: var(--ink)">HH.ru connected</p>
              <p class="text-xs" style="color: var(--ink-muted)">
                Auto-apply is active for HH.ru vacancies
              </p>
            </div>
            <UButton
              type="button"
              variant="ghost"
              color="error"
              size="xs"
              class="ml-auto"
              :loading="disconnecting"
              @click="disconnectHh"
            >
              Disconnect
            </UButton>
          </div>

          <UFormField
            label="HH.ru Resume ID"
            hint="Leave blank to auto-detect from your HH account"
          >
            <UInput
              v-model="form.hhResumeId"
              placeholder="e.g. abc123def456"
              class="w-full font-mono"
            />
          </UFormField>
        </div>

        <!-- Disconnected state -->
        <div v-else>
          <UButton
            type="button"
            variant="outline"
            icon="i-heroicons-link"
            @click="connectHh"
          >
            Connect HH.ru account
          </UButton>
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton type="submit" :loading="saving" icon="i-heroicons-check">Save preferences</UButton>
      </div>
    </form>
  </div>
</template>
