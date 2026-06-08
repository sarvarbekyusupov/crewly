<script setup lang="ts">
const i18nHead = useLocaleHead({ addSeoAttributes: true })
useHead(i18nHead)
useHead({ titleTemplate: '%s | Crewly' })

useSeoMeta({
  title: 'Crewly',
  ogTitle: 'Crewly - AI-Native Recruiting Platform',
  description: 'Automating the full recruitment lifecycle with smart, autonomous AI agents.',
  ogDescription: 'Automating the full recruitment lifecycle with smart, autonomous AI agents.',
  ogImage: '/landing-light.png', // Using the existing landing page screenshot as OG fallback image
  twitterCard: 'summary_large_image',
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
