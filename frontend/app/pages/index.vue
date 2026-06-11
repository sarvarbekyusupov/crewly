<script setup lang="ts">
definePageMeta({ layout: 'landing', auth: 'guest' })

defineOgImageComponent('Default', {
  title: 'Hire the right people, faster',
  description:
    'AI-native recruiting: source, screen, and shortlist — you only meet people worth hiring.',
})

const { set } = useAudience()
set('employer')
useFadeIn()

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
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://crewly.uz/' },
    { name: 'twitter:title', content: 'Hire the right people, faster | Crewly' },
    {
      name: 'twitter:description',
      content:
        'Crewly is an AI-native recruiting platform that sources, screens, and shortlists top candidates for you. Hire faster, pay only on success — no retainers, no wasted time.',
    },
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
              description:
                '15% of first-year salary, billed only on a successful hire. No setup fees.',
            },
            publisher: {
              '@id': 'https://crewly.uz/#organization',
            },
          },
        ],
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
            name: 'What does it cost?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: '15% of first-year salary, billed only on a signed offer. No setup fees, no monthly charge, no commitment.',
            },
          },
          {
            '@type': 'Question',
            name: 'Where do you find candidates?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Our pre-screened talent pool, your ATS or referral network, and the open web — searched in parallel and ranked into one shortlist.',
            },
          },
          {
            '@type': 'Question',
            name: 'How quickly will I see candidates?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Most companies receive their first shortlist within a few days of briefing us.',
            },
          },
          {
            '@type': 'Question',
            name: "What if we don't hire anyone?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You owe nothing. No hire, no invoice — ever.',
            },
          },
        ],
      }),
    },
  ],
})

const heroRef = ref<HTMLElement | null>(null)
const showFloatingCta = ref(false)
let heroObs: IntersectionObserver | null = null

onMounted(() => {
  heroObs = new IntersectionObserver(
    ([entry]) => {
      showFloatingCta.value = !entry!.isIntersecting
    },
    { threshold: 0.1 },
  )
  if (heroRef.value) heroObs.observe(heroRef.value)
})

onUnmounted(() => heroObs?.disconnect())
</script>

<template>
  <div>
    <div ref="heroRef">
      <LandingHero audience="employer" />
    </div>
    <LandingHowItWorks audience="employer" />
    <LandingTestimonials />
    <LandingFinalCta audience="employer" />
    <LandingFaq audience="employer" />

    <!-- Floating CTA — visible after hero scrolls out of view -->
    <Transition name="float-cta">
      <NuxtLink v-if="showFloatingCta" to="/employer/login" class="float-cta-btn">
        Start hiring →
      </NuxtLink>
    </Transition>
  </div>
</template>

<style scoped>
.float-cta-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 50;
  padding: 12px 22px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  background: var(--ink);
  color: var(--bg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.float-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
}
.float-cta-enter-active,
.float-cta-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.float-cta-enter-from,
.float-cta-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 480px) {
  .float-cta-btn {
    bottom: 20px;
    right: 16px;
    left: 16px;
    text-align: center;
    justify-content: center;
  }
}
</style>
