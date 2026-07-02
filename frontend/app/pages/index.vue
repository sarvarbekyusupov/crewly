<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

if (import.meta.client) {
  function waitForTelegramSdk(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Telegram?.WebApp !== undefined) {
        resolve()
        return
      }
      let script = document.querySelector<HTMLScriptElement>('script[src*="telegram-web-app"]')
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-web-app.js'
        document.head.appendChild(script)
      }
      script.addEventListener('load', () => resolve(), { once: true })
      script.addEventListener('error', () => resolve(), { once: true })
      setTimeout(resolve, 2000)
    })
  }

  onMounted(async () => {
    await waitForTelegramSdk()
    if (window.Telegram?.WebApp?.initData) {
      await navigateTo('/tma', { replace: true })
    }
  })
}

defineOgImageComponent('Default', {
  title: 'Find work and get hired',
  description:
    "Build your profile once. Crewly matches you to roles and reaches out when there's a real fit.",
})

const { set } = useAudience()
set('candidate')
useFadeIn()

useHead({
  title: 'Find work and get hired',
  meta: [
    {
      name: 'description',
      content:
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: 'Find work and get hired | Crewly' },
    {
      property: 'og:description',
      content:
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
    },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Find work and get hired | Crewly' },
    {
      name: 'twitter:description',
      content:
        'Crewly matches you with jobs that fit your skills and experience. Build your profile once, get discovered by top employers, and receive offers when you are a strong match — no endless applying.',
    },
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
        publisher: { '@id': 'https://crewly.uz/#organization' },
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
    <LandingWhy audience="candidate" />
    <LandingFinalCta audience="candidate" />
    <LandingFaq audience="candidate" />
  </div>
</template>
