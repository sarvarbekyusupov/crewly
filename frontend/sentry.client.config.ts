import * as Sentry from '@sentry/nuxt'

const config = useRuntimeConfig()

Sentry.init({
  dsn: config.public.sentryDsn,
  environment: import.meta.env.MODE ?? 'production',
  tracesSampleRate: 0.1,
  enabled: !!config.public.sentryDsn,
})
