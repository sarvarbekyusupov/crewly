<script setup lang="ts">
const i18nHead = useLocaleHead({ addSeoAttributes: true })
useHead(i18nHead)
useHead({ titleTemplate: '%s | Crewly' })

useSeoMeta({
  title: 'Crewly',
  ogTitle: 'Crewly - AI-Native Recruiting Platform',
  description:
    'AI-native recruiting platform — source, screen, and shortlist top candidates. Pay only on a successful hire.',
  ogDescription:
    'AI-native recruiting platform — source, screen, and shortlist top candidates. Pay only on a successful hire.',
  ogSiteName: 'Crewly',
  ogLocale: 'en_US',
  twitterCard: 'summary_large_image',
  twitterSite: '@crewly_recruiter',
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--accent)" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
