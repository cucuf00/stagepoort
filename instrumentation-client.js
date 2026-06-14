// Next.js 15+ laadt dit bestand automatisch aan de client-kant
// Oplossing voor Turbopack die withSentryConfig's automatische injectie niet ondersteunt
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
})
