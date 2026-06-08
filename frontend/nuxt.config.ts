import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/app-icon-180.png' },
      ],
      meta: [{ name: 'theme-color', content: '#1A1815' }],
    },
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
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
    url: 'https://crewly.com',
    name: 'Crewly',
    description: 'AI-Native Recruiting Platform',
    defaultLocale: 'en',
  },

  schemaOrg: {
    enabled: false,
  },

  sitemap: {
    sources: ['/api/sitemap-urls'],
    urls: [
      { loc: '/', priority: 1.0, changefreq: 'weekly' },
      { loc: '/candidate', priority: 0.9, changefreq: 'weekly' },
      { loc: '/terms', priority: 0.3, changefreq: 'monthly' },
    ],
  },

  sentry: {
    sourceMapsUploadOptions: {
      enabled: false,
    },
  },

  fonts: {
    families: [
      { name: 'Fraunces', provider: 'google' },
      { name: 'Inter', provider: 'google' },
      { name: 'JetBrains Mono', provider: 'google' },
      { name: 'Source Serif 4', provider: 'google' },
      { name: 'DM Sans', provider: 'google' },
    ],
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
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ru', file: 'ru.json', name: 'Русский' },
      { code: 'uz', file: 'uz.json', name: "O'zbek" },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'prefix_except_default',
    baseUrl: 'https://crewly.com',
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
      routes: ['/', '/candidate', '/terms'],
    },
    routeRules: {
      '/api/**': {
        proxy: `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/**`,
      },
      '/candidate/messages': { redirect: { to: '/candidate/chat', statusCode: 301 } },
      '/candidate/job-discovery': { redirect: { to: '/candidate/jobs', statusCode: 301 } },
      // Private app routes — no SSR needed
      '/employer/**': { ssr: false },
      '/staff/**': { ssr: false },
      '/tma/**': { ssr: false },
      '/candidate/dashboard': { ssr: false },
      '/candidate/jobs': { ssr: false },
      '/candidate/profile': { ssr: false },
      '/candidate/offers': { ssr: false },
      '/candidate/preferences': { ssr: false },
      '/candidate/prep': { ssr: false },
      '/candidate/tracker': { ssr: false },
      '/candidate/chat/**': { ssr: false },
      '/candidate/onboarding': { ssr: false },
    },
  },
})
