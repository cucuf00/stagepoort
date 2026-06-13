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

async function loginAs(page, email) {
  const supabase = getAdminClient()
  const baseURL = process.env.BASE_URL || 'https://stagepoort.vercel.app'

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${baseURL}/auth/callback`,
    },
  })

  if (error) throw new Error(`Magic link genereren mislukt voor ${email}: ${error.message}`)

  await page.goto(data.properties.action_link, { waitUntil: 'load' })
  await page.waitForURL(/(dashboard|onboarding)/, { timeout: 20_000 })
}

module.exports = { getAdminClient, loginAs }
