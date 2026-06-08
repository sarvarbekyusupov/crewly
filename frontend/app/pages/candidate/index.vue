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
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.uz/candidate' },
    { property: 'og:title', content: 'Find work and get hired | Crewly' },
    {
      property: 'og:description',
      content:
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
    },
    { property: 'og:image', content: 'https://crewly.uz/landing-light.png' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://crewly.uz/candidate' },
    { name: 'twitter:title', content: 'Find work and get hired | Crewly' },
    {
      name: 'twitter:description',
      content:
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
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
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Is this free for candidates?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Always. Crewly is 100% free for candidates — employers pay when they make a hire.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does matching work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: "We score your profile against live roles from our network and the open web, then rank by fit. You only hear from us when there's a real match.",
            },
          },
          {
            '@type': 'Question',
            name: "What if I'm not actively looking right now?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: "Keep your profile active and we'll reach out when a role fits. No daily checking, no cold applications.",
            },
          },
          {
            '@type': 'Question',
            name: 'What kind of roles do you have?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tech, product, design, data, and ops — at startups and scale-ups, primarily in Central Asia and remote-friendly companies.',
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
    <LandingHero audience="candidate" />
    <LandingHowItWorks audience="candidate" />
    <LandingFaq audience="candidate" />
    <LandingFinalCta audience="candidate" />
  </div>
</template>
