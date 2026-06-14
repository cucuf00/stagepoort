import * as Sentry from '@sentry/nextjs'

// Tijdelijke test route — verwijder na verificatie
export async function GET() {
  Sentry.captureMessage('✅ Sentry test van Stagepoort — werkt!', 'info')
  Sentry.captureException(new Error('Test error van Stagepoort server'))
  return Response.json({ ok: true, message: 'Sentry test events verstuurd' })
}
