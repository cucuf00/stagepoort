const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL || 'https://vnarhxsxbbmbowtvzfaj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    }
  )
}

/**
 * Login via hashed_token direct in onze auth callback.
 * Dit omzeilt het PKCE probleem waarbij de code_verifier ontbreekt in de browser.
 */
async function loginAs(page, email) {
  const supabase = getAdminClient()
  const baseURL = process.env.BASE_URL || 'https://stagepoort.vercel.app'

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    // Geen redirectTo — we gaan direct naar de callback
  })

  if (error) throw new Error(`Magic link genereren mislukt voor ${email}: ${error.message}`)

  // Ga direct naar onze callback met de hashed_token
  // Dit roept verifyOtp aan zonder PKCE flow
  const hashedToken = data.properties.hashed_token
  await page.goto(
    `${baseURL}/auth/callback?token_hash=${hashedToken}&type=email`,
    { waitUntil: 'domcontentloaded' }
  )

  // Wacht tot we op het dashboard of onboarding zijn
  await page.waitForURL(/(dashboard|onboarding)/, { timeout: 20_000 })
}

module.exports = { getAdminClient, loginAs }
