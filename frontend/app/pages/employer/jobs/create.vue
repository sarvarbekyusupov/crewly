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
const { errors, handleSubmit, defineField } = useForm({
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
  } catch (e) {
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
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('jobs.fields.priority')">
              <USelect
                v-model="formExtras.priority"
                :options="[
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
      </UCard>

      <UCard>
        <h3 class="section-label">{{ t('jobs.sections.workFee') }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('jobs.fields.employmentType')">
            <USelect
              v-model="formExtras.employmentType"
              :options="[
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
              :options="[
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
              :options="[
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
</template>
