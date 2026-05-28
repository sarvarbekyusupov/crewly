export default defineNuxtConfig({
  ssr: false,

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n', '@nuxt/fonts', '@nuxt/eslint', '@sentry/nuxt/module'],

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
    lazy: true,
    langDir: 'locales/',
    restructureDir: '',
    strategy: 'no_prefix',
  },

  imports: {
    dirs: ['stores'],
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        paths: {
          '@my-hr/types': ['../packages/types/src/index.ts'],
        },
      },
    },
  },

  devtools: { enabled: false },
  compatibilityDate: '2024-12-01',

  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
