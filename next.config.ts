import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {}

export default withSentryConfig(nextConfig, {
  // Geen source maps upload (dat vereist SENTRY_AUTH_TOKEN)
  sourcemaps: { disable: true },
  // Geen build output spam
  silent: true,
  disableLogger: true,
  // Geen automatische Vercel monitors
  automaticVercelMonitors: false,
})
