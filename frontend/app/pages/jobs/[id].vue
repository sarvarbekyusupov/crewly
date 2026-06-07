<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const jobId = route.params.id as string

const { data: job, error } = await useFetch<any>(`/api/v1/public/jobs/${jobId}`, {
  baseURL: config.public.apiBase,
})

if (error.value || !job.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Job Not Found',
    fatal: true,
  })
}

// Dynamic SEO meta tags
useSeoMeta({
  title: () => `${job.value.title} at ${job.value.company.name} - crewly`,
  ogTitle: () => `${job.value.title} at ${job.value.company.name} - crewly`,
  description: () => `Apply for the ${job.value.title} position at ${job.value.company.name}. Learn more about requirements, salary, and benefits.`,
  ogDescription: () => `Apply for the ${job.value.title} position at ${job.value.company.name}. Learn more about requirements, salary, and benefits.`,
  ogImage: '/landing-light.png',
  twitterCard: 'summary_large_image',
})

// Schema.org Structured Data for Google Jobs
useSchemaOrg([
  defineJobPosting({
    title: job.value.title,
    description: job.value.description,
    datePosted: job.value.openedAt || job.value.createdAt,
    validThrough: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days validity
    employmentType: job.value.employmentType === 'full_time' ? 'FULL_TIME' : job.value.employmentType === 'part_time' ? 'PART_TIME' : 'CONTRACTOR',
    hiringOrganization: {
      name: job.value.company.name,
      sameAs: job.value.company.website || undefined,
    },
    jobLocation: {
      address: {
        addressLocality: job.value.officeLocation || 'Tashkent',
        addressRegion: 'Tashkent',
        addressCountry: 'UZ',
      },
    },
    baseSalary: job.value.salaryMinUzs ? {
      currency: job.value.salaryCurrency || 'UZS',
      value: {
        minValue: Number(job.value.salaryMinUzs),
        maxValue: job.value.salaryMaxUzs ? Number(job.value.salaryMaxUzs) : undefined,
        unitText: 'MONTH',
      },
    } : undefined,
  })
])
</script>

<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
        <UIcon name="i-heroicons-arrow-left" class="size-4" />
        Back to Home
      </NuxtLink>
    </div>

    <div v-if="job" class="space-y-8">
      <!-- Job Header Card -->
      <UCard class="overflow-hidden">
        <div class="md:flex md:items-center md:justify-between md:space-x-5">
          <div class="flex items-start space-x-5">
            <div class="pt-1.5">
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ job.title }}
              </h1>
              <p class="text-lg font-medium text-primary-600 dark:text-primary-400 mt-1">
                {{ job.company.name }}
              </p>

              <!-- Meta badges -->
              <div class="flex flex-wrap gap-2 mt-4">
                <UBadge v-if="job.workMode" color="neutral" variant="subtle">
                  <UIcon name="i-heroicons-briefcase" class="mr-1 size-3.5" />
                  {{ job.workMode }}
                </UBadge>
                <UBadge v-if="job.employmentType" color="neutral" variant="subtle">
                  <UIcon name="i-heroicons-clock" class="mr-1 size-3.5" />
                  {{ job.employmentType.replace('_', ' ') }}
                </UBadge>
                <UBadge v-if="job.officeLocation" color="neutral" variant="subtle">
                  <UIcon name="i-heroicons-map-pin" class="mr-1 size-3.5" />
                  {{ job.officeLocation }}
                </UBadge>
                <UBadge v-if="job.minExperienceYears !== undefined" color="neutral" variant="subtle">
                  <UIcon name="i-heroicons-academic-cap" class="mr-1 size-3.5" />
                  {{ job.minExperienceYears }}+ years exp
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span class="text-sm text-gray-500 dark:text-gray-400 block">Salary Range</span>
              <span class="text-xl font-bold text-gray-900 dark:text-white">
                <template v-if="job.salaryMinUzs && job.salaryMaxUzs">
                  {{ formatSalary(job.salaryMinUzs, job.salaryCurrency) }} - {{ formatSalary(job.salaryMaxUzs, job.salaryCurrency) }}
                </template>
                <template v-else-if="job.salaryMinUzs">
                  From {{ formatSalary(job.salaryMinUzs, job.salaryCurrency) }}
                </template>
                <template v-else-if="job.salaryMaxUzs">
                  Up to {{ formatSalary(job.salaryMaxUzs, job.salaryCurrency) }}
                </template>
                <template v-else>
                  Salary Competitive / Negotiable
                </template>
              </span>
            </div>

            <div>
              <UButton
                label="Apply for this Job"
                icon="i-heroicons-paper-airplane"
                color="primary"
                size="lg"
                to="/candidate/login"
              />
            </div>
          </div>
        </template>
      </UCard>

      <!-- Detailed Info -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <section>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Job Description
            </h2>
            <div class="text-gray-700 dark:text-gray-300 space-y-4 whitespace-pre-wrap leading-relaxed">
              {{ job.description }}
            </div>
          </section>
        </div>

        <!-- Sidebar (Requirements & Skills) -->
        <div class="space-y-6">
          <UCard v-if="job.requiredSkills?.length">
            <template #header>
              <h3 class="text-md font-bold text-gray-900 dark:text-white">
                Required Skills
              </h3>
            </template>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="skill in job.requiredSkills" :key="skill" color="primary" variant="subtle">
                {{ skill }}
              </UBadge>
            </div>
          </UCard>

          <UCard v-if="job.niceToHaveSkills?.length">
            <template #header>
              <h3 class="text-md font-bold text-gray-900 dark:text-white">
                Nice to Have Skills
              </h3>
            </template>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="skill in job.niceToHaveSkills" :key="skill" color="neutral" variant="outline">
                {{ skill }}
              </UBadge>
            </div>
          </UCard>

          <UCard v-if="job.company">
            <template #header>
              <h3 class="text-md font-bold text-gray-900 dark:text-white">
                About the Company
              </h3>
            </template>
            <div class="space-y-3 text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400 block">Industry</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ job.company.industry || '—' }}</span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400 block">Company Size</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ job.company.size || '—' }}</span>
              </div>
              <div v-if="job.company.website">
                <span class="text-gray-500 dark:text-gray-400 block">Website</span>
                <a :href="job.company.website" target="_blank" class="text-primary-600 hover:underline inline-flex items-center gap-1">
                  {{ job.company.website }}
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="size-3" />
                </a>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
