<script setup lang="ts">
import type { Job } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const toast = useToast()
const route = useRoute()

const jobId = route.params.id as string
const loading = ref(false)
const skillInput = ref('')
const niceSkillInput = ref('')

const { data: job } = await useAsyncData(`job-edit-${jobId}`, () =>
  api.get<Job>(`/api/v1/jobs/${jobId}`),
)

if (!job.value) {
  throw createError({ statusCode: 404, message: 'Job not found' })
}

const form = reactive({
  title: job.value.title ?? '',
  description: job.value.description ?? '',
  priority: job.value.priority ?? 'normal',
  requiredSkills: [...(job.value.requiredSkills ?? [])] as string[],
  niceToHaveSkills: [...(job.value.niceToHaveSkills ?? [])] as string[],
  minExperienceYears: job.value.minExperienceYears as number | undefined,
  maxExperienceYears: job.value.maxExperienceYears as number | undefined,
  salaryMinUzs: job.value.salaryMinUzs
    ? String(job.value.salaryMinUzs)
    : (undefined as string | undefined),
  salaryMaxUzs: job.value.salaryMaxUzs
    ? String(job.value.salaryMaxUzs)
    : (undefined as string | undefined),
  salaryCurrency: job.value.salaryCurrency ?? 'UZS',
  employmentType: job.value.employmentType ?? 'full-time',
  workMode: job.value.workMode ?? 'office',
  officeLocation: job.value.officeLocation ?? '',
  feePercentage: String(job.value.feePercentage ?? '12.00'),
  feeBasis: job.value.feeBasis ?? 'annual',
  targetCandidatesCount: job.value.targetCandidatesCount ?? 5,
})

function addSkill() {
  const s = skillInput.value.trim()
  if (s && !form.requiredSkills.includes(s)) form.requiredSkills.push(s)
  skillInput.value = ''
}

function removeSkill(s: string) {
  form.requiredSkills = form.requiredSkills.filter((x) => x !== s)
}

function addNiceSkill() {
  const s = niceSkillInput.value.trim()
  if (s && !form.niceToHaveSkills.includes(s)) form.niceToHaveSkills.push(s)
  niceSkillInput.value = ''
}

function removeNiceSkill(s: string) {
  form.niceToHaveSkills = form.niceToHaveSkills.filter((x) => x !== s)
}

async function handleSubmit() {
  if (!form.title || !form.description) {
    toast.add({
      title: t('common.error'),
      description: 'Title and description required',
      color: 'error',
    })
    return
  }
  loading.value = true
  try {
    await api.patch(`/api/v1/jobs/${jobId}`, {
      ...form,
      salaryMinUzs: form.salaryMinUzs ? Number(form.salaryMinUzs) : undefined,
      salaryMaxUzs: form.salaryMaxUzs ? Number(form.salaryMaxUzs) : undefined,
      feePercentage: Number(form.feePercentage),
    })
    toast.add({ title: t('common.success'), color: 'success' })
    router.push(`/jobs/${jobId}`)
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div class="pb-6" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-center gap-3 mb-2">
        <NuxtLink :to="`/jobs/${jobId}`" style="color: var(--ink-muted)">
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
          Recruiting · Edit Position
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
        {{ job?.title ?? 'Edit Job' }}
      </h1>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <UCard>
        <div class="space-y-4">
          <UFormField :label="t('jobs.fields.title')" required>
            <UInput v-model="form.title" class="w-full" required />
          </UFormField>

          <UFormField :label="t('jobs.fields.description')" required>
            <UTextarea v-model="form.description" :rows="4" class="w-full" required />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('jobs.fields.priority')">
              <USelect
                v-model="form.priority"
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
                v-model.number="form.targetCandidatesCount"
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
          <UBadge v-for="s in form.requiredSkills" :key="s" color="primary" variant="subtle">
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
          <UBadge v-for="s in form.niceToHaveSkills" :key="s" color="neutral" variant="subtle">
            {{ s }}
            <button class="ml-1 hover:text-(--accent)" @click="removeNiceSkill(s)">×</button>
          </UBadge>
        </div>
      </UCard>

      <UCard>
        <h3 class="section-label">Experience &amp; Salary</h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('jobs.fields.minExperience')">
            <UInput v-model.number="form.minExperienceYears" type="number" min="0" class="w-full" />
          </UFormField>
          <UFormField :label="t('jobs.fields.maxExperience')">
            <UInput v-model.number="form.maxExperienceYears" type="number" min="0" class="w-full" />
          </UFormField>
          <UFormField :label="t('jobs.fields.salaryMin')">
            <UInput v-model="form.salaryMinUzs" type="number" min="0" class="w-full" />
          </UFormField>
          <UFormField :label="t('jobs.fields.salaryMax')">
            <UInput v-model="form.salaryMaxUzs" type="number" min="0" class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <h3 class="section-label">Work &amp; Fee</h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('jobs.fields.employmentType')">
            <USelect
              v-model="form.employmentType"
              :items="[
                { label: 'Full-time', value: 'full-time' },
                { label: 'Part-time', value: 'part-time' },
                { label: 'Contract', value: 'contract' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.workMode')">
            <USelect
              v-model="form.workMode"
              :items="[
                { label: 'Office', value: 'office' },
                { label: 'Hybrid', value: 'hybrid' },
                { label: 'Remote', value: 'remote' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.feePercentage')">
            <UInput
              v-model="form.feePercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('jobs.fields.feeBasis')">
            <USelect
              v-model="form.feeBasis"
              :items="[
                { label: 'Annual', value: 'annual' },
                { label: 'Monthly', value: 'monthly' },
              ]"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <div class="flex justify-end gap-3">
        <UButton variant="outline" :to="`/jobs/${jobId}`">{{ t('common.cancel') }}</UButton>
        <UButton type="submit" :loading="loading">{{ t('common.save') }}</UButton>
      </div>
    </form>
  </div>
</template>
