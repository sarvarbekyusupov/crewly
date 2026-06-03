<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('candidate')

useHead({
  title: 'myHR | Find work and get hired',
  meta: [
    { name: 'description', content: 'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.' }
  ]
})
</script>

<template>
  <div>
    <LandingHero audience="candidate" />
    <LandingHowItWorks audience="candidate" />
    <LandingFaq audience="candidate" />
    <LandingFinalCta audience="candidate" />
  </div>
</template>
