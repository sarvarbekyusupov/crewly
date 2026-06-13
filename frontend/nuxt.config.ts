import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/app-icon-180.png' },
      ],
      meta: [{ name: 'theme-color', content: '#1A1815' }],
    },
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  icon: {
    serverBundle: {
      collections: ['heroicons'],
    },
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@sentry/nuxt/module',
    '@nuxt/test-utils/module',
    '@nuxtjs/seo',
  ],

  site: {
    url: 'https://crewly.uz',
    name: 'Crewly',
    description: 'AI-Native Recruiting Platform',
    defaultLocale: 'en',
  },

  schemaOrg: {
    enabled: false,
  },

  sitemap: {
    sources: ['/sitemap-data'],
    urls: [
      { loc: '/', priority: 1.0, changefreq: 'weekly' },
      { loc: '/candidate', priority: 0.9, changefreq: 'weekly' },
      { loc: '/jobs', priority: 0.8, changefreq: 'daily' },
      { loc: '/terms', priority: 0.3, changefreq: 'monthly' },
      { loc: '/privacy', priority: 0.2, changefreq: 'monthly' },
    ],
    exclude: [
      '/employer',
      '/employer/**',
      '/staff',
      '/staff/**',
      '/tma',
      '/tma/**',
      '/candidate/dashboard',
      '/candidate/jobs',
      '/candidate/profile',
      '/candidate/offers',
      '/candidate/preferences',
      '/candidate/prep',
      '/candidate/tracker',
      '/candidate/analytics',
      '/candidate/inbox',
      '/candidate/chat',
      '/candidate/chat/**',
      '/candidate/onboarding',
      '/candidate/login',
      '/candidate/signup',
      '/candidate/forgot-password',
      '/candidate/reset-password',
      '/candidate/verify-email',
      '/verify-email',
      '/error',
    ],
  },

  sentry: {
    sourceMapsUploadOptions: {
      enabled: false,
    },
  },

  fonts: {
    families: [
      { name: 'Fraunces', provider: 'google', display: 'swap' },
      { name: 'JetBrains Mono', provider: 'google', display: 'swap' },
      { name: 'Manrope', provider: 'google', display: 'swap', preload: true },
    ],
  },

  ogImage: {
    fonts: ['Inter:400', 'Inter:700'],
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN ?? '',
      waitlistMode: process.env.NUXT_PUBLIC_WAITLIST_MODE === 'true',
    },
  },

  i18n: {
    locales: [
      { code: 'en', iso: 'en', language: 'en', file: 'en.json', name: 'English' },
      { code: 'ru', iso: 'ru', language: 'ru', file: 'ru.json', name: 'Русский' },
      { code: 'uz', iso: 'uz', language: 'uz', file: 'uz.json', name: "O'zbek" },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'prefix_except_default',
    baseUrl: 'https://crewly.uz',
  },

  imports: {
    dirs: ['app/stores', 'app/constants'],
  },

  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        paths: {
          '@crewly/types': ['../packages/types/src/index.ts'],
        },
      },
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2026-05-30',

  nitro: {
    prerender: {
      routes: ['/', '/candidate', '/terms', '/privacy', '/jobs'],
    },
    routeRules: {
      '/api/v1/**': {
        proxy: `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/v1/**`,
      },
      '/candidate/messages': { redirect: { to: '/candidate/chat', statusCode: 301 } },
      '/candidate/job-discovery': { redirect: { to: '/candidate/jobs', statusCode: 301 } },
      // Private app routes — no SSR, no indexing
      '/employer/**': { ssr: false, robots: false },
      '/staff/**': { ssr: false, robots: false },
      '/tma/**': { ssr: false, robots: false },
      '/candidate/dashboard': { ssr: false, robots: false },
      '/candidate/jobs': { ssr: false, robots: false },
      '/candidate/profile': { ssr: false, robots: false },
      '/candidate/offers': { ssr: false, robots: false },
      '/candidate/preferences': { ssr: false, robots: false },
      '/candidate/prep': { ssr: false, robots: false },
      '/candidate/tracker': { ssr: false, robots: false },
      '/candidate/analytics': { ssr: false, robots: false },
      '/candidate/inbox': { ssr: false, robots: false },
      '/candidate/chat': { ssr: false, robots: false },
      '/candidate/chat/**': { ssr: false, robots: false },
      '/candidate/onboarding': { ssr: false, robots: false },
      '/candidate/login': { ssr: false, robots: false },
      '/candidate/forgot-password': { ssr: false, robots: false },
      '/candidate/reset-password': { ssr: false, robots: false },
      '/verify-email': { ssr: false, robots: false },
      // Locale variants of job pages serve identical English content — noindex
      '/ru/jobs/**': { robots: false },
      '/uz/jobs/**': { robots: false },
    },
  },
})
