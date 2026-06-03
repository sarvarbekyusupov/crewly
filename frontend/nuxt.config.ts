export default defineNuxtConfig({
  ssr: false,

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@sentry/nuxt/module',
    '@nuxt/test-utils/module',
  ],

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
    strategy: 'no_prefix',
  },

  imports: {
    dirs: ['app/stores', 'app/constants'],
  },

  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        paths: {
          '@my-hr/types': ['../packages/types/src/index.ts'],
        },
      },
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2026-05-30',

  nitro: {
    routeRules: {
      '/api/**': {
        proxy: `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/**`,
      },
      '/candidate/messages': { redirect: { to: '/candidate/chat', statusCode: 301 } },
      '/candidate/job-discovery': { redirect: { to: '/candidate/jobs', statusCode: 301 } },
    },
  },
})
