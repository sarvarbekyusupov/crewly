<script setup lang="ts">
definePageMeta({ layout: 'landing' })

const config = useRuntimeConfig()

const { data: jobs } = await useFetch<any[]>('/api/v1/public/jobs', {
  baseURL: config.public.apiBase,
  default: () => [],
})

useHead({
  title: 'Tech & Product Jobs in Uzbekistan, Central Asia and Remote',
})

useSeoMeta({
  description:
    'Browse tech, product, design, and ops jobs in Uzbekistan, Central Asia, and remote-friendly companies. Roles matched and screened by Crewly AI — apply once, hear back fast.',
  ogTitle: 'Tech & Product Jobs in Uzbekistan, Central Asia and Remote | Crewly',
  ogDescription:
    'Tech, product, design, and ops jobs in Uzbekistan and Central Asia. Matched by Crewly AI — apply once, skip the noise.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Tech & Product Jobs in Uzbekistan, Central Asia and Remote | Crewly',
  twitterDescription:
    'Tech, product, design, and ops jobs in Uzbekistan and Central Asia. Matched by Crewly AI — apply once, skip the noise.',
})

defineOgImageComponent('Default', {
  title: 'Tech & Product Jobs in Uzbekistan, Central Asia and Remote',
  description: 'Browse roles matched by Crewly AI across Central Asia and beyond.',
})

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Tech & Product Jobs in Uzbekistan, Central Asia and Remote',
        url: 'https://crewly.uz/jobs',
        numberOfItems: jobs.value?.length ?? 0,
        itemListElement: (jobs.value ?? []).slice(0, 20).map((job: any, i: number) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://crewly.uz/jobs/${job.id}`,
          name: `${job.title} at ${job.company.name}`,
        })),
      }),
    },
  ],
}))

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://crewly.uz' },
          { '@type': 'ListItem', position: 2, name: 'Jobs', item: 'https://crewly.uz/jobs' },
        ],
      }),
    },
  ],
})

function formatSalary(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'UZS',
    maximumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <div class="mb-10">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-6"
      >
        <UIcon name="i-heroicons-arrow-left" class="size-4" />
        Back to Home
      </NuxtLink>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-3">
        Tech &amp; Product Jobs in Uzbekistan, Central Asia and Remote
      </h1>
      <p class="text-base text-gray-600 dark:text-gray-300 mb-2">
        Crewly sources and screens candidates for tech, product, design, and ops roles at companies
        across Uzbekistan, Central Asia, and remote-first teams worldwide. Every role below has been
        reviewed by our team and is actively hiring.
      </p>
      <p class="text-lg text-gray-500 dark:text-gray-400">
        {{ jobs.length }} role{{ jobs.length === 1 ? '' : 's' }} matched and screened by Crewly AI
      </p>
    </div>

    <div v-if="jobs.length === 0" class="text-center py-20">
      <p class="text-gray-400 text-lg">No open roles right now. Check back soon.</p>
    </div>

    <ul v-else class="space-y-4">
      <li v-for="job in jobs" :key="job.id">
        <NuxtLink :to="`/jobs/${job.id}`" class="block group">
          <UCard class="transition-shadow hover:shadow-md">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h2
                  class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 truncate"
                >
                  {{ job.title }}
                </h2>
                <p class="text-sm font-medium text-primary-600 dark:text-primary-400 mt-0.5">
                  {{ job.company.name }}
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                  <UBadge v-if="job.workMode" color="neutral" variant="subtle" size="sm">
                    {{ job.workMode }}
                  </UBadge>
                  <UBadge v-if="job.employmentType" color="neutral" variant="subtle" size="sm">
                    {{ job.employmentType.replace('_', ' ') }}
                  </UBadge>
                  <UBadge v-if="job.officeLocation" color="neutral" variant="subtle" size="sm">
                    <UIcon name="i-heroicons-map-pin" class="mr-1 size-3" />
                    {{ job.officeLocation }}
                  </UBadge>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <template v-if="job.salaryMinUzs || job.salaryMaxUzs">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    <template v-if="job.salaryMinUzs && job.salaryMaxUzs">
                      {{ formatSalary(job.salaryMinUzs, job.salaryCurrency) }} –
                      {{ formatSalary(job.salaryMaxUzs, job.salaryCurrency) }}
                    </template>
                    <template v-else-if="job.salaryMinUzs">
                      From {{ formatSalary(job.salaryMinUzs, job.salaryCurrency) }}
                    </template>
                    <template v-else>
                      Up to {{ formatSalary(job.salaryMaxUzs, job.salaryCurrency) }}
                    </template>
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">/ month</p>
                </template>
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="size-5 text-gray-400 group-hover:text-primary-500 mt-2"
                />
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </li>
    </ul>

    <div class="mt-12 text-center">
      <NuxtLink
        to="/candidate/login?mode=signup"
        class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600"
      >
        Don't see a fit? Build your profile and we'll reach out when one appears.
        <UIcon name="i-heroicons-arrow-right" class="size-4" />
      </NuxtLink>
    </div>
  </div>
</template>
