<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

const { set } = useAudience()
set('employer')

useHead({
  title: 'myHR | Hire the right people, faster',
  link: [
    { rel: 'canonical', href: 'https://my-hr.com/' }
  ],
  meta: [
    {
      name: 'description',
      content: 'Your AI hiring team. Source, screen, and shortlist top talent effortlessly.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://my-hr.com/' },
    { property: 'og:title', content: 'myHR | Hire the right people, faster' },
    { property: 'og:description', content: 'Your AI hiring team. Source, screen, and shortlist top talent effortlessly.' },
    { property: 'og:image', content: 'https://my-hr.com/landing-dark.png' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://my-hr.com/' },
    { name: 'twitter:title', content: 'myHR | Hire the right people, faster' },
    { name: 'twitter:description', content: 'Your AI hiring team. Source, screen, and shortlist top talent effortlessly.' },
    { name: 'twitter:image', content: 'https://my-hr.com/landing-dark.png' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://my-hr.com/#organization',
            'name': 'myHR',
            'url': 'https://my-hr.com/',
            'logo': 'https://my-hr.com/landing-dark.png',
            'sameAs': [
              'https://twitter.com/myhr_recruiter',
              'https://www.linkedin.com/company/myhr-recruiting'
            ]
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://my-hr.com/#software',
            'name': 'myHR Recruiting Automation',
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'All',
            'offers': {
              '@type': 'Offer',
              'price': '15.00',
              'priceCurrency': 'Percent',
              'description': '15% success-only recruitment fee, billed only on hire.'
            },
            'aggregateRating': {
              '@type': 'AggregateRating',
              'ratingValue': '4.9',
              'reviewCount': '124'
            },
            'publisher': {
              '@id': 'https://my-hr.com/#organization'
            }
          }
        ]
      })
    }
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
