<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('candidate')

useHead({
  title: 'myHR | Find work and get hired',
  link: [{ rel: 'canonical', href: 'https://crewly.com/candidate' }],
  meta: [
    {
      name: 'description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.com/candidate' },
    { property: 'og:title', content: 'myHR | Find work and get hired' },
    {
      property: 'og:description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    { property: 'og:image', content: 'https://crewly.com/landing-light.png' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://crewly.com/candidate' },
    { name: 'twitter:title', content: 'myHR | Find work and get hired' },
    {
      name: 'twitter:description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    { name: 'twitter:image', content: 'https://crewly.com/landing-light.png' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': 'https://crewly.com/candidate/#software',
        name: 'myHR Candidate Career Pilot',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
          description: 'Free career companion and job search pilot.',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '124',
        },
        publisher: {
          '@type': 'Organization',
          name: 'myHR',
          url: 'https://crewly.com/',
        },
      }),
    },
  ],
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
