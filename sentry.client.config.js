import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',

  // Vang alle crashes in de browser op
  tracesSampleRate: 0.1,

  // Replay: neem 100% op bij een error (geen video zonder error)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Geen debug output in productie
  debug: false,
})
