<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('candidate')

useHead({
  title: 'Find work and get hired',
  link: [{ rel: 'canonical', href: 'https://crewly.uz/candidate' }],
  meta: [
    {
      name: 'description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.uz/candidate' },
    { property: 'og:title', content: 'Find work and get hired | Crewly' },
    {
      property: 'og:description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    { property: 'og:image', content: 'https://crewly.uz/landing-light.png' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://crewly.uz/candidate' },
    { name: 'twitter:title', content: 'Find work and get hired | Crewly' },
    {
      name: 'twitter:description',
      content:
        'Your AI career partner. Build your profile, see roles that actually fit, and get reached out to when you are a match.',
    },
    { name: 'twitter:image', content: 'https://crewly.uz/landing-light.png' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': 'https://crewly.uz/candidate/#software',
        name: 'Crewly Candidate Career Pilot',
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
          name: 'Crewly',
          url: 'https://crewly.uz/',
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
