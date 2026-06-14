import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',

  // Vang server-side crashes op (API routes, server components)
  tracesSampleRate: 0.1,

  debug: false,
})
