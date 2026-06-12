import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Gebruik altijd de harde site URL uit env, nooit request headers
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stagepoort.vercel.app'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${siteUrl}/`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth`)
}
