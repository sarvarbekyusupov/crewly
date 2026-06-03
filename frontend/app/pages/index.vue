<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('employer')

useHead({
  title: 'myHR | Hire the right people, faster',
  meta: [
    { name: 'description', content: 'Your AI hiring team. Source, screen, and shortlist top talent effortlessly.' }
  ]
})
</script>

<template>
  <div>
    <LandingHero audience="employer" />
    <LandingHowItWorks audience="employer" />
    <LandingFaq audience="employer" />
    <LandingFinalCta audience="employer" />
  </div>
</template>
