<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('employer')

useHead({
  title: 'Hire the right people, faster',
  link: [{ rel: 'canonical', href: 'https://crewly.uz/' }],
  meta: [
    {
      name: 'description',
      content:
        'Crewly is an AI-native recruiting platform that sources, screens, and shortlists top candidates for you. Hire faster, pay only on success — no retainers, no wasted time.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.uz/' },
    { property: 'og:title', content: 'Hire the right people, faster | Crewly' },
    {
      property: 'og:description',
      content:
        'Crewly is an AI-native recruiting platform that sources, screens, and shortlists top candidates for you. Hire faster, pay only on success — no retainers, no wasted time.',
    },
    { property: 'og:image', content: 'https://crewly.uz/landing-dark.png' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://crewly.uz/' },
    { name: 'twitter:title', content: 'Hire the right people, faster | Crewly' },
    {
      name: 'twitter:description',
      content:
        'Crewly is an AI-native recruiting platform that sources, screens, and shortlists top candidates for you. Hire faster, pay only on success — no retainers, no wasted time.',
    },
    { name: 'twitter:image', content: 'https://crewly.uz/landing-dark.png' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://crewly.uz/#organization',
            name: 'Crewly',
            url: 'https://crewly.uz/',
            logo: 'https://crewly.uz/app-icon-512.png',
            sameAs: [
              'https://twitter.com/crewly_recruiter',
              'https://www.linkedin.com/company/crewly-recruiting',
            ],
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://crewly.uz/#software',
            name: 'Crewly Recruiting Automation',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'All',
            offers: {
              '@type': 'Offer',
              price: '15.00',
              priceCurrency: 'Percent',
              description: '15% success-only recruitment fee, billed only on hire.',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '124',
            },
            publisher: {
              '@id': 'https://crewly.uz/#organization',
            },
          },
        ],
      }),
    },
  ],
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
