import { createClient } from '@supabase/supabase-js'

// Tijdelijke route om direct een magic link te genereren — verwijder na gebruik
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const secret = searchParams.get('secret')

  // Simpele beveiliging
  if (secret !== 'stagepoort2026') {
    return Response.json({ error: 'Niet toegestaan' }, { status: 403 })
  }

  if (!email) {
    return Response.json({ error: 'Email verplicht' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const baseURL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stagepoort.vercel.app'
  const loginUrl = `${baseURL}/auth/callback?token_hash=${data.properties.hashed_token}&type=email`

  return Response.json({ loginUrl })
}
