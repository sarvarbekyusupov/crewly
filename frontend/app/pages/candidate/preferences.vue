<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { CandidatePreferences } from '~/types/api'
import { candidatePreferencesSchema } from '~/schemas/candidate'

definePageMeta({ layout: 'candidate' })

const api = useCandidateApi()
const toast = useToast()
const { t } = useI18n()

useHead({ title: t('candidate.preferences.title') })

const { data: prefs, refresh } = await useAsyncData('candidate-preferences', () =>
  api.get<CandidatePreferences>('/api/v1/candidate-portal/preferences').catch(() => null),
)

// --- VeeValidate form ---
const { errors, handleSubmit, defineField, setValues } = useForm({
  validationSchema: toTypedSchema(candidatePreferencesSchema),
  initialValues: {
    minMatchScore: 0,
    maxApplicationsPerDay: 5,
    preferredWorkMode: '',
    expectedSalaryUzs: '',
  },
})

const [minMatchScore, minMatchScoreProps] = defineField('minMatchScore') as unknown as [
  import('vue').Ref<number>,
  object,
]
const [maxApplicationsPerDay, maxApplicationsPerDayProps] = defineField(
  'maxApplicationsPerDay',
) as unknown as [import('vue').Ref<number>, object]
const [preferredWorkMode] = defineField('preferredWorkMode')
const [expectedSalaryUzs, expectedSalaryUzsProps] = defineField('expectedSalaryUzs')

const blacklistedCompanies = ref<string[]>([])
const blacklistInput = ref('')

watch(
  prefs,
  (p) => {
    if (!p) return
    setValues({
      minMatchScore: p.minMatchScore ?? 0,
      maxApplicationsPerDay: p.maxApplicationsPerDay ?? 5,
      preferredWorkMode: p.preferredWorkMode ?? '',
      expectedSalaryUzs: p.expectedSalaryUzs ? String(p.expectedSalaryUzs) : '',
    })
    blacklistedCompanies.value = [...(p.blacklistedCompanies ?? [])]
  },
  { immediate: true },
)

function addBlacklist() {
  const c = blacklistInput.value.trim()
  if (c && !blacklistedCompanies.value.includes(c)) blacklistedCompanies.value.push(c)
  blacklistInput.value = ''
}

function removeBlacklist(c: string) {
  blacklistedCompanies.value = blacklistedCompanies.value.filter((x) => x !== c)
}

const saving = ref(false)

const save = handleSubmit(async (values) => {
  saving.value = true
  try {
    await api.patch('/api/v1/candidate-portal/preferences', {
      minMatchScore: values.minMatchScore || null,
      blacklistedCompanies: blacklistedCompanies.value,
      maxApplicationsPerDay: values.maxApplicationsPerDay,
      preferredWorkMode: values.preferredWorkMode || null,
      expectedSalaryUzs: values.expectedSalaryUzs ? Number(values.expectedSalaryUzs) : null,
    })
    toast.add({ title: t('candidate.preferences.saved'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
})
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
        {{ t('candidate.preferences.eyebrow') }}
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
        {{ t('candidate.preferences.title') }}
      </h1>
    </div>

    <!-- Live settings summary -->
    <div
      class="rounded-lg px-4 py-3"
      style="background: var(--bg-elevated); border: 1px solid var(--line)"
    >
      <p
        class="text-xs font-medium mb-2"
        style="color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.08em"
      >
        Current settings
      </p>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm" style="color: var(--ink)">
        <span>
          <span style="color: var(--ink-subtle)">Min match </span>
          <strong>{{ minMatchScore > 0 ? minMatchScore + '%' : 'None' }}</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Auto-apply </span>
          <strong>{{ maxApplicationsPerDay }}/day</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Salary </span>
          <strong>{{
            expectedSalaryUzs ? Number(expectedSalaryUzs).toLocaleString() + ' UZS' : 'Any'
          }}</strong>
        </span>
        <span>
          <span style="color: var(--ink-subtle)">Blocked </span>
          <strong
            >{{ blacklistedCompanies.length }}
            {{ blacklistedCompanies.length === 1 ? 'company' : 'companies' }}</strong
          >
        </span>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <UCard>
        <h3 class="section-label mb-4">{{ t('candidate.preferences.title') }}</h3>
        <div class="space-y-4">
          <UFormField
            :label="t('candidate.profile.preferredWorkMode')"
            :error="errors.preferredWorkMode"
          >
            <div class="flex gap-2">
              <button
                v-for="mode in [
                  { label: t('candidate.jobs.allModes'), value: '' },
                  { label: t('jobs.workMode.remote'), value: 'remote' },
                  { label: t('jobs.workMode.hybrid'), value: 'hybrid' },
                  { label: t('jobs.workMode.office'), value: 'office' },
                ]"
                :key="mode.value"
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                :style="
                  preferredWorkMode === mode.value
                    ? 'background: var(--ink); color: var(--bg);'
                    : 'background: var(--surface); color: var(--ink-muted); border: 1px solid var(--line);'
                "
                @click="preferredWorkMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.salaryLabel')"
            :hint="t('candidate.preferences.salaryHint')"
            :error="errors.expectedSalaryUzs"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model="expectedSalaryUzs"
                v-bind="expectedSalaryUzsProps"
                type="number"
                min="0"
                step="1000000"
                placeholder="e.g. 5000000"
                class="w-48"
              />
              <span v-if="expectedSalaryUzs" class="text-sm" style="color: var(--ink-muted)">
                {{ Number(expectedSalaryUzs).toLocaleString() }} UZS
              </span>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.minScoreLabel')"
            :hint="t('candidate.preferences.minScoreHint')"
            :error="errors.minMatchScore"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model="minMatchScore"
                v-bind="minMatchScoreProps"
                type="number"
                min="0"
                max="100"
                step="5"
                class="w-24"
              />
              <span class="text-sm" style="color: var(--ink-muted)">
                {{ minMatchScore || 'No' }} minimum
              </span>
            </div>
          </UFormField>

          <UFormField
            :label="t('candidate.preferences.maxAppsLabel')"
            :hint="t('candidate.preferences.maxAppsHint')"
            :error="errors.maxApplicationsPerDay"
          >
            <UInput
              v-model="maxApplicationsPerDay"
              v-bind="maxApplicationsPerDayProps"
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
        <h3 class="section-label mb-3">{{ t('candidate.preferences.blacklistTitle') }}</h3>
        <p class="text-sm mb-3" style="color: var(--ink-muted)">
          {{ t('candidate.preferences.blacklistDesc') }}
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
          <UBadge v-for="c in blacklistedCompanies" :key="c" color="error" variant="subtle">
            {{ c }}
            <button class="ml-1 hover:opacity-70" @click="removeBlacklist(c)">×</button>
          </UBadge>
          <span
            v-if="!blacklistedCompanies.length"
            class="text-sm"
            style="color: var(--ink-subtle)"
            >{{ t('candidate.preferences.noBlacklist') }}</span
          >
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton type="submit" :loading="saving" icon="i-heroicons-check">{{
          t('candidate.preferences.save')
        }}</UButton>
      </div>
    </form>
  </div>
</template>
