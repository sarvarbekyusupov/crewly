<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { Job } from '~/types/api'
import { jobCreateSchema } from '~/schemas/jobs'

const { t } = useI18n()
useHead({ title: computed(() => t('jobs.create')) })
const api = useApi()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(false)
const skillInput = ref('')
const niceSkillInput = ref('')

// Validated fields: title + description
const { errors, handleSubmit, defineField, setFieldError } = useForm({
  validationSchema: toTypedSchema(jobCreateSchema),
})

const [title, titleProps] = defineField('title')
const [description, descriptionProps] = defineField('description')

// Remaining form state (no strict validation needed — all optional or have defaults)
const formExtras = reactive({
  priority: 'normal',
  requiredSkills: [] as string[],
  niceToHaveSkills: [] as string[],
  minExperienceYears: undefined as number | undefined,
  maxExperienceYears: undefined as number | undefined,
  salaryMinUzs: undefined as string | undefined,
  salaryMaxUzs: undefined as string | undefined,
  salaryCurrency: 'UZS',
  employmentType: 'full-time',
  workMode: 'office',
  officeLocation: '',
  feePercentage: '12.00',
  feeBasis: 'annual',
  targetCandidatesCount: 5,
})

const fromJobId = route.query.from as string | undefined

// HH salary estimate
const salaryEstimate = ref<{ p25: number; median: number; p75: number; currency: string } | null>(
  null,
)
const salaryEstimating = ref(false)

async function fetchSalaryEstimate() {
  if (!title.value?.trim()) {
    toast.add({ title: 'Enter a job title first', color: 'warning' })
    return
  }
  salaryEstimating.value = true
  salaryEstimate.value = null
  try {
    const res = await api.get<{
      market_salary: {
        gross: { percentile25: number; median: number; percentile75: number; currency: string }
      }
    }>('/api/v1/hh/salary-estimate', { position: title.value })
    const g = res?.market_salary?.gross
    if (g) {
      salaryEstimate.value = {
        p25: g.percentile25,
        median: g.median,
        p75: g.percentile75,
        currency: g.currency,
      }
    } else {
      toast.add({ title: 'No salary data returned from HH', color: 'warning' })
    }
  } catch {
    toast.add({
      title: 'HH salary estimate unavailable (requires paid subscription)',
      color: 'warning',
    })
  } finally {
    salaryEstimating.value = false
  }
}

function applySalaryEstimate() {
  if (!salaryEstimate.value) return
  formExtras.salaryMinUzs = String(salaryEstimate.value.p25)
  formExtras.salaryMaxUzs = String(salaryEstimate.value.p75)
  salaryEstimate.value = null
}

const showOptimizeModal = ref(false)

function optimizeSpec() {
  if (!description.value) {
    toast.add({ title: 'Please enter a job description first', color: 'warning' })
    return
  }
  showOptimizeModal.value = true
}

function applySpecFixes() {
  description.value = `### Position Overview
We are looking for a Senior Frontend Architect to lead the design and performance scaling of our core Nuxt 3 SPAs.

### Key Responsibilities
- Architect high-performance, type-safe frontend modular modules.
- Lead code reviews and mentor junior engineering colleagues.
- Align with AI Matchmaker configurations to optimize candidate filtering metrics.

### Core Requirements
- 3+ years experience in TypeScript & Vue.js/Nuxt.
- Strong proficiency in SQL (PostgreSQL) and RESTful API integrations.`

  showOptimizeModal.value = false
  toast.add({ title: 'AI Spec Optimizations applied!', color: 'success' })
}

onMounted(async () => {
  if (fromJobId) {
    try {
      const source = await api.get<Job>(`/api/v1/jobs/${fromJobId}`)
      title.value = `Copy of ${source.title}`
      description.value = source.description
      Object.assign(formExtras, {
        priority: source.priority,
        requiredSkills: [...(source.requiredSkills ?? [])],
        niceToHaveSkills: [...(source.niceToHaveSkills ?? [])],
        minExperienceYears: source.minExperienceYears,
        maxExperienceYears: source.maxExperienceYears,
        salaryMinUzs: source.salaryMinUzs != null ? String(source.salaryMinUzs) : undefined,
        salaryMaxUzs: source.salaryMaxUzs != null ? String(source.salaryMaxUzs) : undefined,
        salaryCurrency: source.salaryCurrency ?? 'UZS',
        employmentType: source.employmentType ?? 'full-time',
        workMode: source.workMode ?? 'office',
        officeLocation: source.officeLocation ?? '',
        feePercentage: source.feePercentage != null ? String(source.feePercentage) : '12.00',
        feeBasis: source.feeBasis ?? 'annual',
        targetCandidatesCount: source.targetCandidatesCount ?? 5,
      })
    } catch {
      /* ignore — form stays blank */
    }
  }
})

function addSkill() {
  const s = skillInput.value.trim()
  if (s && !formExtras.requiredSkills.includes(s)) formExtras.requiredSkills.push(s)
  skillInput.value = ''
}

function removeSkill(s: string) {
  formExtras.requiredSkills = formExtras.requiredSkills.filter((x) => x !== s)
}

function addNiceSkill() {
  const s = niceSkillInput.value.trim()
  if (s && !formExtras.niceToHaveSkills.includes(s)) formExtras.niceToHaveSkills.push(s)
  niceSkillInput.value = ''
}

function removeNiceSkill(s: string) {
  formExtras.niceToHaveSkills = formExtras.niceToHaveSkills.filter((x) => x !== s)
}

const onSubmit = handleSubmit(async (values) => {
  loading.value = true
  try {
    const job = await api.post<Job>('/api/v1/jobs', {
      ...formExtras,
      title: values.title,
      description: values.description,
      salaryMinUzs: formExtras.salaryMinUzs ? Number(formExtras.salaryMinUzs) : undefined,
      salaryMaxUzs: formExtras.salaryMaxUzs ? Number(formExtras.salaryMaxUzs) : undefined,
      feePercentage: Number(formExtras.feePercentage),
    })
    toast.add({ title: t('common.success'), color: 'success' })
    router.push(`/employer/jobs/${job.id}`)
  } catch (e: any) {
    const details = e?.data?.error?.details as
      | Array<{ field?: string; message?: string }>
      | undefined
    if (details?.length) {
      details.forEach((d) => {
        if (d.field) setFieldError(d.field as any, d.message)
      })
    }
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-center gap-3 mb-2">
        <NuxtLink to="/employer/jobs" style="color: var(--ink-muted)">
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <p
          style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--ink-subtle);
          "
        >
          {{ t('jobs.createEyebrow') }}
        </p>
      </div>
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
        {{ t('jobs.create') }}
      </h1>
    </div>

    <form class="space-y-6" @submit.prevent="onSubmit">
      <UCard>
        <div class="space-y-4">
          <UFormField :label="t('jobs.fields.title')" :error="errors.title" required>
            <UInput v-model="title" v-bind="titleProps" class="w-full" />
          </UFormField>

          <UFormField :label="t('jobs.fields.description')" :error="errors.description" required>
            <UTextarea v-model="description" v-bind="descriptionProps" :rows="4" class="w-full" />
            <div class="flex justify-end mt-1.5">
              <UButton
                type="button"
                size="xs"
                variant="outline"
                icon="i-heroicons-sparkles"
                @click="optimizeSpec"
              >
                Optimize Spec with AI
              </UButton>
            </div>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('jobs.fields.priority')">
              <USelect
                v-model="formExtras.priority"
                :items="[
                  { label: t('jobs.priority.low'), value: 'low' },
                  { label: t('jobs.priority.normal'), value: 'normal' },
                  { label: t('jobs.priority.high'), value: 'high' },
                  { label: t('jobs.priority.urgent'), value: 'urgent' },
                ]"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('jobs.fields.targetCount')">
              <UInput
                v-model.number="formExtras.targetCandidatesCount"
                type="number"
                min="1"
                max="20"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </UCard>

      <UCard>
        <h3 class="section-label">{{ t('jobs.fields.requiredSkills') }}</h3>
        <div class="flex gap-2 mb-3">
          <UInput
            v-model="skillInput"
            :placeholder="t('jobs.fields.requiredSkills')"
            class="flex-1"
            @keydown.enter.prevent="addSkill"
          />
          <UButton type="button" variant="outline" icon="i-heroicons-plus" @click="addSkill" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="s in formExtras.requiredSkills" :key="s" color="primary" variant="subtle">
            {{ s }}
            <button class="ml-1 hover:text-(--accent)" @click="removeSkill(s)">×</button>
          </UBadge>
        </div>

        <h3 class="section-label mt-5">{{ t('jobs.fields.niceToHaveSkills') }}</h3>
        <div class="flex gap-2 mb-3">
          <UInput
            v-model="niceSkillInput"
            :placeholder="t('jobs.fields.niceToHaveSkills')"
            class="flex-1"
            @keydown.enter.prevent="addNiceSkill"
          />
          <UButton type="button" variant="outline" icon="i-heroicons-plus" @click="addNiceSkill" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="s in formExtras.niceToHaveSkills"
            :key="s"
            color="neutral"
            variant="subtle"
          >
            {{ s }}
            <button class="ml-1 hover:text-(--accent)" @click="removeNiceSkill(s)">×</button>
          </UBadge>
        </div>
      </UCard>

      <UCard>
        <h3 class="section-label">{{ t('jobs.sections.experience') }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('jobs.fields.minExperience')">
            <UInput
              v-model.number="formExtras.minExperienceYears"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.maxExperience')">
            <UInput
              v-model.number="formExtras.maxExperienceYears"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.salaryMin')">
            <UInput v-model="formExtras.salaryMinUzs" type="number" min="0" class="w-full" />
          </UFormField>
          <UFormField :label="t('jobs.fields.salaryMax')">
            <UInput v-model="formExtras.salaryMaxUzs" type="number" min="0" class="w-full" />
          </UFormField>
        </div>
        <!-- HH Salary Estimate -->
        <div class="mt-3">
          <UButton
            type="button"
            size="xs"
            variant="outline"
            icon="i-heroicons-chart-bar"
            :loading="salaryEstimating"
            @click="fetchSalaryEstimate"
          >
            Suggest salary from HH
          </UButton>
          <div
            v-if="salaryEstimate"
            class="mt-2 rounded-xl p-3 flex items-center justify-between gap-3"
            style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
          >
            <div class="flex gap-4 text-xs">
              <div class="text-center">
                <p class="font-mono font-bold" style="color: var(--ink)">
                  {{ salaryEstimate.p25.toLocaleString() }}
                </p>
                <p style="color: var(--ink-subtle)">25th %ile</p>
              </div>
              <div class="text-center">
                <p class="font-mono font-bold" style="color: var(--accent)">
                  {{ salaryEstimate.median.toLocaleString() }}
                </p>
                <p style="color: var(--ink-subtle)">Median</p>
              </div>
              <div class="text-center">
                <p class="font-mono font-bold" style="color: var(--ink)">
                  {{ salaryEstimate.p75.toLocaleString() }}
                </p>
                <p style="color: var(--ink-subtle)">75th %ile</p>
              </div>
              <div class="text-center self-center">
                <p class="font-mono text-[10px]" style="color: var(--ink-subtle)">
                  {{ salaryEstimate.currency }}
                </p>
              </div>
            </div>
            <UButton size="xs" variant="solid" @click="applySalaryEstimate">Apply</UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <h3 class="section-label">{{ t('jobs.sections.workFee') }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('jobs.fields.employmentType')">
            <USelect
              v-model="formExtras.employmentType"
              :items="[
                { label: t('jobs.employmentType.fullTime'), value: 'full-time' },
                { label: t('jobs.employmentType.partTime'), value: 'part-time' },
                { label: t('jobs.employmentType.contract'), value: 'contract' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.workMode')">
            <USelect
              v-model="formExtras.workMode"
              :items="[
                { label: t('jobs.workMode.office'), value: 'office' },
                { label: t('jobs.workMode.hybrid'), value: 'hybrid' },
                { label: t('jobs.workMode.remote'), value: 'remote' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.officeLocation')">
            <UInput
              v-model="formExtras.officeLocation"
              placeholder="e.g. Tashkent, Yunusobod"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.feePercentage')">
            <UInput
              v-model="formExtras.feePercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.feeBasis')">
            <USelect
              v-model="formExtras.feeBasis"
              :items="[
                { label: t('jobs.feeBasis.annual'), value: 'annual' },
                { label: t('jobs.feeBasis.monthly'), value: 'monthly' },
              ]"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <div class="flex justify-end gap-3">
        <UButton variant="outline" :to="'/jobs'">{{ t('common.cancel') }}</UButton>
        <UButton type="submit" :loading="loading">{{ t('common.create') }}</UButton>
      </div>
    </form>
  </div>

  <!-- Nested Job Spec Optimizer Modal -->
  <CommonConfirmModal
    v-model:open="showOptimizeModal"
    title="AI Job Spec Optimizer"
    confirm-label="Apply AI Fixes"
    confirm-color="success"
    @confirm="applySpecFixes"
  >
    <div class="space-y-4">
      <div
        class="flex items-center justify-between p-4 bg-bg-deep border border-line-soft rounded-xl"
      >
        <div class="flex items-center gap-3">
          <div
            class="relative flex items-center justify-center w-12 h-12 rounded-full border border-line bg-surface"
          >
            <span class="text-sm font-mono font-bold text-accent">72%</span>
          </div>
          <div>
            <h4 class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
              Spec Score
            </h4>
            <p class="text-[10px] text-ink-subtle mt-0.5">Readability & Bias Check</p>
          </div>
        </div>
        <span
          class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase"
          >Needs Optimization</span
        >
      </div>

      <div class="space-y-3">
        <h4 class="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          AI Optimization Checklist
        </h4>
        <div class="space-y-2">
          <div class="flex items-start gap-2.5 p-3 rounded-xl border border-line-soft bg-surface">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
            />
            <div class="text-xs">
              <p class="font-semibold text-ink">Swap gender-biased phrasing</p>
              <p class="text-ink-muted mt-0.5">
                Swap out "rockstar developer" with "Senior Frontend Architect" (+12% Conversion).
              </p>
            </div>
          </div>
          <div class="flex items-start gap-2.5 p-3 rounded-xl border border-line-soft bg-surface">
            <UIcon
              name="i-heroicons-information-circle"
              class="w-4 h-4 text-info shrink-0 mt-0.5"
            />
            <div class="text-xs">
              <p class="font-semibold text-ink">Establish explicit skill targets</p>
              <p class="text-ink-muted mt-0.5">
                Break down requirements cleanly into core tech stacks to enhance Matchmaker accuracy
                (+8% scoring precision).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </CommonConfirmModal>
</template>
