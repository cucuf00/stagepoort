/**
 * Playwright Global Setup — draait één keer vóór alle tests.
 * Maakt test-auth-users en profielen aan in de TESTSCHOOL.
 * Raakt de productie-school (ROC Rotterdam) NOOIT aan.
 */
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
  // Zoek bestaande auth user op e-mail
  const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw new Error(`listUsers mislukt: ${listErr.message}`)
  
  const existing = users.find(u => u.email === email)
  if (existing) {
    console.log(`  ↩️  Auth user bestaat al: ${email} (${existing.id})`)
    return existing.id
  }

  // Maak nieuwe auth user aan
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: email.split('@')[0] },
  })
  if (error) throw new Error(`createUser mislukt voor ${email}: ${error.message}`)
  console.log(`  ✅ Auth user aangemaakt: ${email} (${data.user.id})`)
  return data.user.id
}

async function upsertProfile(sb, userId, email, role, extra = {}) {
  // Verwijder bestaand profiel in testschool als user_id anders is (veiligheidscheck)
  const { data: existing } = await sb.from('profiles')
    .select('id, user_id')
    .eq('email', email)
    .eq('school_id', TEST_SCHOOL_ID)
    .maybeSingle()

  if (existing && existing.user_id !== userId) {
    // Profiel bestaat maar met ander user_id — update het
    await sb.from('profiles').update({ user_id: userId }).eq('id', existing.id)
    console.log(`  🔄 Profiel user_id bijgewerkt voor ${email}`)
    return
  }

  if (existing) {
    console.log(`  ↩️  Profiel bestaat al voor ${email}`)
    return
  }

  const { error } = await sb.from('profiles').insert({
    user_id: userId,
    school_id: TEST_SCHOOL_ID,
    email,
    role,
    name: extra.name || email.split('@')[0],
    klas: extra.klas || null,
    xp: 0,
    level: 1,
    streak: 0,
  })

  if (error) throw new Error(`Profiel insert mislukt voor ${email}: ${error.message}`)
  console.log(`  ✅ Profiel aangemaakt: ${email} (${role})`)
}

async function upsertTestPlacement(sb, studentId) {
  const { data: existing } = await sb.from('placements')
    .select('id')
    .eq('student_id', studentId)
    .eq('school_id', TEST_SCHOOL_ID)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    process.env.TEST_PLACEMENT_ID = existing.id
    console.log(`  ↩️  Test-placement bestaat al: ${existing.id}`)
    return
  }

  const { data, error } = await sb.from('placements').insert({
    school_id: TEST_SCHOOL_ID,
    student_id: studentId,
    period_id: TEST_PERIOD_ID,
    status: 'active',
    first_name: 'Playwright',
    last_name: 'Testleerling',
    company_name: 'E2E Testbedrijf B.V.',
    company_address: 'Teststraat 1',
    company_postcode: '1234 AB',
    company_city: 'Rotterdam',
    supervisor_name: 'Dhr. Playwright',
    hours_required: 160,
  }).select('id').single()

  if (error) throw new Error(`Test-placement aanmaken mislukt: ${error.message}`)
  process.env.TEST_PLACEMENT_ID = data.id
  console.log(`  ✅ Test-placement aangemaakt: ${data.id}`)
}

module.exports = async function globalSetup() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY ontbreekt — globalSetup overgeslagen')
    return
  }

  const coordEmail = process.env.TEST_COORDINATOR_EMAIL
  const studEmail  = process.env.TEST_STUDENT_EMAIL

  if (!coordEmail || !studEmail) {
    throw new Error('TEST_COORDINATOR_EMAIL of TEST_STUDENT_EMAIL ontbreekt in env vars')
  }

  console.log('\n🔧 Playwright globalSetup — testschool klaarzetten...')
  console.log(`   School ID:   ${TEST_SCHOOL_ID}`)
  console.log(`   Coordinator: ${coordEmail}`)
  console.log(`   Student:     ${studEmail}\n`)

  const sb = getAdmin()

  // Coordinator
  console.log('📋 Coordinator:')
  const coordId = await upsertAuthUser(sb, coordEmail)
  await upsertProfile(sb, coordId, coordEmail, 'coordinator', { name: 'Playwright Coordinator' })

  // Student
  console.log('📋 Student:')
  const studId = await upsertAuthUser(sb, studEmail)
  await upsertProfile(sb, studId, studEmail, 'student', { name: 'Playwright Student', klas: 'TEST-A' })
  await upsertTestPlacement(sb, studId)

  console.log('\n🚀 Testschool klaar — tests starten...\n')
}
