import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stagepoort.vercel.app'

  console.log(`[callback] code=${!!code} token_hash=${!!token_hash} type=${type}`)

  const supabase = await createClient()

  // Methode 1: token_hash (OTP flow — Safe Links proof)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    console.log(`[callback] verifyOtp error=${error?.message ?? 'geen'}`)
    if (!error) return NextResponse.redirect(`${siteUrl}/`)
  }

  // Methode 2: code (PKCE flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log(`[callback] exchangeCode error=${error?.message ?? 'geen'}`)
    if (!error) return NextResponse.redirect(`${siteUrl}/`)
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth`)
}
