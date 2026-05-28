import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  enabled: !!process.env.NUXT_PUBLIC_SENTRY_DSN,
})
