const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099'
const TEST_PERIOD_ID = '00000000-0000-0000-0000-000000000991'

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL || 'https://vnarhxsxbbmbowtvzfaj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } }
  )
}

async function loginAs(page, email) {
  const supabase = getAdminClient()
  const baseURL = process.env.BASE_URL || 'https://stagepoort.vercel.app'
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`Magic link genereren mislukt voor ${email}: ${error.message}`)
  await page.goto(`${baseURL}/auth/callback?token_hash=${data.properties.hashed_token}&type=email`, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/(dashboard|onboarding)/, { timeout: 20_000 })
}

module.exports = { getAdminClient, loginAs, TEST_SCHOOL_ID, TEST_PERIOD_ID }
