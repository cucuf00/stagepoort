const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099'
const TEST_PERIOD_ID = '00000000-0000-0000-0000-000000000991'

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL || 'https://vnarhxsxbbmbowtvzfaj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } }
  )
}

async function upsertAuthUser(sb, email) {
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find(u => u.email === email)
  if (existing) return existing.id
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true })
  if (error) throw new Error(`Auth user aanmaken mislukt voor ${email}: ${error.message}`)
  return data.user.id
}

async function upsertProfile(sb, userId, email, role, extra = {}) {
  await sb.from('profiles').upsert({
    user_id: userId, school_id: TEST_SCHOOL_ID, email, role,
    name: extra.name || email.split('@')[0],
    klas: extra.klas || null, xp: 0, level: 1, streak: 0,
  }, { onConflict: 'user_id,school_id', ignoreDuplicates: false })
}

async function upsertTestPlacement(sb, studentId) {
  const { data: existing } = await sb.from('placements').select('id')
    .eq('student_id', studentId).eq('school_id', TEST_SCHOOL_ID).eq('status', 'active').maybeSingle()
  if (existing) { process.env.TEST_PLACEMENT_ID = existing.id; return }
  const { data, error } = await sb.from('placements').insert({
    school_id: TEST_SCHOOL_ID, student_id: studentId, period_id: TEST_PERIOD_ID,
    status: 'active', first_name: 'Playwright', last_name: 'Testleerling',
    company_name: 'E2E Testbedrijf B.V.', company_address: 'Teststraat 1',
    company_postcode: '1234 AB', company_city: 'Rotterdam',
    supervisor_name: 'Dhr. Playwright', hours_required: 160,
  }).select('id').single()
  if (error) throw new Error(`Test-placement aanmaken mislukt: ${error.message}`)
  process.env.TEST_PLACEMENT_ID = data.id
}

module.exports = async function globalSetup() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY ontbreekt — globalSetup overgeslagen')
    return
  }
  console.log('🔧 Playwright globalSetup — testomgeving klaarzetten...')
  const sb = getAdmin()
  const coordId = await upsertAuthUser(sb, process.env.TEST_COORDINATOR_EMAIL)
  await upsertProfile(sb, coordId, process.env.TEST_COORDINATOR_EMAIL, 'coordinator', { name: 'Playwright Coordinator' })
  const studId = await upsertAuthUser(sb, process.env.TEST_STUDENT_EMAIL)
  await upsertProfile(sb, studId, process.env.TEST_STUDENT_EMAIL, 'student', { name: 'Playwright Student', klas: 'TEST-A' })
  await upsertTestPlacement(sb, studId)
  console.log('🚀 Testomgeving klaar!')
}
