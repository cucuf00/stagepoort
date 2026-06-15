/**
 * Playwright Global Setup — draait één keer vóór alle tests.
 * Maakt een complete testwereld aan in de TESTSCHOOL:
 *   - Coordinator, Student, Coach (auth + profiel)
 *   - Stageperiode + opdrachten (met en zonder vragen)
 *   - Badges
 *   - Actieve placement (student ↔ coach gekoppeld)
 *   - Uren (pending + approved)
 *   - Student_assignments (open + submitted met JSON-antwoorden)
 *   - Dagstory
 *
 * Raakt de productie-school NOOIT aan.
 */
const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const TEST_SCHOOL_ID  = '00000000-0000-0000-0000-000000000099'
const TEST_PERIOD_ID  = '00000000-0000-0000-0000-000000000991'
const TEST_ASSIGN_1   = '00000000-0000-0000-0000-000000000aa1' // opdracht met vragen
const TEST_ASSIGN_2   = '00000000-0000-0000-0000-000000000aa2' // opdracht zonder vragen
const TEST_BADGE_1    = '00000000-0000-0000-0000-000000000bb1'

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
  if (existing) {
    console.log(`  ↩️  Auth user bestaat al: ${email}`)
    return existing.id
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: email.split('@')[0] },
  })
  if (error) throw new Error(`createUser mislukt voor ${email}: ${error.message}`)
  console.log(`  ✅ Auth user aangemaakt: ${email}`)
  return data.user.id
}

async function upsertProfile(sb, userId, email, role, extra = {}) {
  const { data: existing } = await sb.from('profiles')
    .select('id, user_id, role, klas')
    .eq('email', email)
    .eq('school_id', TEST_SCHOOL_ID)
    .maybeSingle()

  if (existing) {
    const updates = {}
    if (existing.user_id !== userId)           updates.user_id = userId
    if (existing.role !== role)                updates.role = role
    if (existing.klas !== (extra.klas || null)) updates.klas = extra.klas || null
    if (Object.keys(updates).length > 0) {
      await sb.from('profiles').update(updates).eq('id', existing.id)
      console.log(`  🔄 Profiel bijgewerkt: ${email}`, updates)
    } else {
      console.log(`  ↩️  Profiel correct: ${email}`)
    }
    return existing.id
  }

  const { data, error } = await sb.from('profiles').insert({
    user_id: userId,
    school_id: TEST_SCHOOL_ID,
    email,
    role,
    name: extra.name || email.split('@')[0],
    klas: extra.klas || null,
    xp: extra.xp || 0,
    level: 1,
    streak: extra.streak || 0,
  }).select('id').single()

  if (error) throw new Error(`Profiel insert mislukt voor ${email}: ${error.message}`)
  console.log(`  ✅ Profiel aangemaakt: ${email} (${role})`)
  return data.id
}

async function upsertPeriode(sb) {
  const { data: existing } = await sb.from('stage_periods')
    .select('id').eq('id', TEST_PERIOD_ID).maybeSingle()
  if (existing) { console.log('  ↩️  Testperiode bestaat al'); return }

  const { error } = await sb.from('stage_periods').insert({
    id: TEST_PERIOD_ID,
    school_id: TEST_SCHOOL_ID,
    name: 'Playwright Testperiode',
    start_date: '2025-09-01',
    end_date: '2026-07-01',
    hours_goal: 160,
  })
  if (error) throw new Error(`Periode aanmaken mislukt: ${error.message}`)
  console.log('  ✅ Testperiode aangemaakt')
}

async function upsertOpdrachten(sb) {
  // Opdracht 1: met vragen (JSON-antwoorden)
  const { data: ex1 } = await sb.from('assignments').select('id').eq('id', TEST_ASSIGN_1).maybeSingle()
  if (!ex1) {
    const { error } = await sb.from('assignments').insert({
      id: TEST_ASSIGN_1,
      school_id: TEST_SCHOOL_ID,
      period_id: TEST_PERIOD_ID,
      title: 'E2E Testopdrcht — Bedrijfsoriëntatie',
      description: 'Leer het stagebedrijf kennen.',
      deadline: '2026-12-31',
      max_points: 10,
      xp_reward: 150,
      sort_order: 0,
      questions: JSON.stringify([
        { id: 9001, v: 'Wat doet het bedrijf?', hint: 'Beschrijf het', punten: 5 },
        { id: 9002, v: 'Hoeveel medewerkers?', hint: 'Schat het', punten: 5 },
      ]),
    })
    if (error) throw new Error(`Opdracht 1 aanmaken mislukt: ${error.message}`)
    console.log('  ✅ Testopdrcht 1 aangemaakt (met vragen)')
  } else {
    console.log('  ↩️  Testopdrcht 1 bestaat al')
  }

  // Opdracht 2: zonder vragen (vrije tekst)
  const { data: ex2 } = await sb.from('assignments').select('id').eq('id', TEST_ASSIGN_2).maybeSingle()
  if (!ex2) {
    const { error } = await sb.from('assignments').insert({
      id: TEST_ASSIGN_2,
      school_id: TEST_SCHOOL_ID,
      period_id: TEST_PERIOD_ID,
      title: 'E2E Testopdrcht — Vrije reflectie',
      description: 'Schrijf een vrije reflectie.',
      deadline: '2026-12-31',
      max_points: 10,
      xp_reward: 100,
      sort_order: 1,
      questions: JSON.stringify([]),
    })
    if (error) throw new Error(`Opdracht 2 aanmaken mislukt: ${error.message}`)
    console.log('  ✅ Testopdrcht 2 aangemaakt (vrije tekst)')
  } else {
    console.log('  ↩️  Testopdrcht 2 bestaat al')
  }
}

async function upsertBadge(sb) {
  const { data: existing } = await sb.from('badges').select('id').eq('id', TEST_BADGE_1).maybeSingle()
  if (existing) { console.log('  ↩️  Testbadge bestaat al'); return }

  const { error } = await sb.from('badges').insert({
    id: TEST_BADGE_1,
    school_id: TEST_SCHOOL_ID,
    emoji: '🧪',
    name: 'E2E Testbadge',
    type: 'hours',
    threshold: 10,
    xp_reward: 50,
    sort_order: 99,
  })
  if (error) throw new Error(`Badge aanmaken mislukt: ${error.message}`)
  console.log('  ✅ Testbadge aangemaakt')
}

async function upsertPlacement(sb, studentProfileId, coachProfileId) {
  // Kijk of er al een actieve placement is voor deze student in testschool
  const { data: existing } = await sb.from('placements')
    .select('id')
    .eq('student_id', studentProfileId)
    .eq('school_id', TEST_SCHOOL_ID)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    // Zorg dat coach altijd gekoppeld is
    await sb.from('placements').update({
      coach_id: coachProfileId,
      coach_name: 'Playwright Coach',
      coach_email: process.env.TEST_COACH_EMAIL,
    }).eq('id', existing.id)
    process.env.TEST_PLACEMENT_ID = existing.id
    console.log(`  ↩️  Testplacement bestaat al: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await sb.from('placements').insert({
    school_id: TEST_SCHOOL_ID,
    student_id: studentProfileId,
    coach_id: coachProfileId,
    period_id: TEST_PERIOD_ID,
    status: 'active',
    first_name: 'Playwright',
    last_name: 'Testleerling',
    company_name: 'E2E Testbedrijf B.V.',
    company_address: 'Teststraat 1',
    company_postcode: '1234 AB',
    company_city: 'Rotterdam',
    company_phone: '0101234567',
    company_email: 'test@e2e.nl',
    supervisor_name: 'Dhr. E2E Begeleider',
    coach_name: 'Playwright Coach',
    coach_email: process.env.TEST_COACH_EMAIL,
    hours_required: 160,
    green_stage: false,
  }).select('id').single()

  if (error) throw new Error(`Placement aanmaken mislukt: ${error.message}`)
  process.env.TEST_PLACEMENT_ID = data.id
  console.log(`  ✅ Testplacement aangemaakt: ${data.id}`)
  return data.id
}

async function upsertUren(sb, studentProfileId, placementId) {
  const { count } = await sb.from('hours')
    .select('id', { count: 'exact', head: true })
    .eq('placement_id', placementId)
    .eq('school_id', TEST_SCHOOL_ID)

  if (count > 0) { console.log(`  ↩️  Testuren bestaan al (${count} regels)`); return }

  const uren = [
    // Goedgekeurde uren
    { date: '2026-01-06', hours: 8, description: 'E2E test — maandag introductie', status: 'approved' },
    { date: '2026-01-07', hours: 8, description: 'E2E test — dinsdag administratie', status: 'approved' },
    { date: '2026-01-08', hours: 4, description: 'E2E test — woensdag halve dag', status: 'approved' },
    // Afgewezen uren
    { date: '2026-01-09', hours: 10, description: 'E2E test — te veel uren', status: 'rejected', rejection_reason: 'Meer dan 8 uur per dag is niet toegestaan' },
    // Wachtend uren (voor coordinator beoordeling)
    { date: '2026-01-13', hours: 8, description: 'E2E test — maandag week 2', status: 'pending' },
    { date: '2026-01-14', hours: 7, description: 'E2E test — dinsdag week 2', status: 'pending' },
  ]

  const rows = uren.map(u => ({
    school_id: TEST_SCHOOL_ID,
    placement_id: placementId,
    student_id: studentProfileId,
    ...u,
  }))

  const { error } = await sb.from('hours').insert(rows)
  if (error) throw new Error(`Uren aanmaken mislukt: ${error.message}`)
  console.log(`  ✅ ${rows.length} testuren aangemaakt (approved + pending + rejected)`)
}

async function upsertStudentAssignments(sb, studentProfileId, placementId) {
  // Check of al bestaat
  const { count } = await sb.from('student_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('placement_id', placementId)
    .eq('school_id', TEST_SCHOOL_ID)

  if (count > 0) { console.log(`  ↩️  Student assignments bestaan al (${count})`); return }

  const rows = [
    // Opdracht 1 (met vragen): ingediend met JSON-antwoorden — wacht op beoordeling
    {
      school_id: TEST_SCHOOL_ID,
      assignment_id: TEST_ASSIGN_1,
      student_id: studentProfileId,
      placement_id: placementId,
      status: 'submitted',
      answer: JSON.stringify({
        '9001': 'Het bedrijf maakt software voor scholen. Ze hebben een team van 15 developers en designers.',
        '9002': 'Ongeveer 50 medewerkers verdeeld over 3 vestigingen.',
      }),
      submitted_at: new Date().toISOString(),
    },
    // Opdracht 2 (vrije tekst): open — nog niet ingediend
    {
      school_id: TEST_SCHOOL_ID,
      assignment_id: TEST_ASSIGN_2,
      student_id: studentProfileId,
      placement_id: placementId,
      status: 'open',
      answer: null,
    },
  ]

  const { error } = await sb.from('student_assignments').insert(rows)
  if (error) throw new Error(`Student assignments aanmaken mislukt: ${error.message}`)
  console.log('  ✅ Student assignments aangemaakt (submitted + open)')
}

async function upsertDagstory(sb, studentProfileId, placementId) {
  const gisteren = new Date()
  gisteren.setDate(gisteren.getDate() - 1)
  const datumStr = gisteren.toISOString().split('T')[0]

  const { data: existing } = await sb.from('week_stories')
    .select('id')
    .eq('student_id', studentProfileId)
    .eq('date', datumStr)
    .maybeSingle()

  if (existing) { console.log('  ↩️  Testdagstory bestaat al'); return }

  const { error } = await sb.from('week_stories').insert({
    school_id: TEST_SCHOOL_ID,
    student_id: studentProfileId,
    placement_id: placementId,
    date: datumStr,
    mood: '😊',
    answer_1: 'Ik heb vandaag kennisgemaakt met het team en de werkzaamheden leren kennen.',
    answer_2: 'Ik heb geleerd hoe het bedrijf is georganiseerd en wie verantwoordelijk is voor wat.',
    xp_awarded: 50,
  })
  if (error) throw new Error(`Dagstory aanmaken mislukt: ${error.message}`)
  console.log('  ✅ Testdagstory aangemaakt')
}

module.exports = async function globalSetup() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY ontbreekt — globalSetup overgeslagen')
    return
  }

  const coordEmail = process.env.TEST_COORDINATOR_EMAIL
  const studEmail  = process.env.TEST_STUDENT_EMAIL
  const coachEmail = process.env.TEST_COACH_EMAIL

  if (!coordEmail || !studEmail || !coachEmail)
    throw new Error('TEST_COORDINATOR_EMAIL, TEST_STUDENT_EMAIL of TEST_COACH_EMAIL ontbreekt')

  if (new Set([coordEmail, studEmail, coachEmail]).size !== 3)
    throw new Error('❌ Test e-mailadressen moeten allemaal verschillend zijn!')

  console.log('\n🔧 Playwright globalSetup — volledige testwereld klaarzetten...')
  console.log(`   School:      ${TEST_SCHOOL_ID}`)
  console.log(`   Coordinator: ${coordEmail}`)
  console.log(`   Student:     ${studEmail}`)
  console.log(`   Coach:       ${coachEmail}\n`)

  const sb = getAdmin()

  // 1. Auth users + profielen
  console.log('👤 Auth users & profielen:')
  const coordAuthId = await upsertAuthUser(sb, coordEmail)
  await upsertProfile(sb, coordAuthId, coordEmail, 'coordinator', { name: 'Playwright Coordinator' })

  const studAuthId = await upsertAuthUser(sb, studEmail)
  const studProfileId = await upsertProfile(sb, studAuthId, studEmail, 'student', {
    name: 'Playwright Student', klas: 'TEST-A', xp: 350, streak: 3,
  })

  const coachAuthId = await upsertAuthUser(sb, coachEmail)
  const coachProfileId = await upsertProfile(sb, coachAuthId, coachEmail, 'coach', { name: 'Playwright Coach' })

  // 2. Stageperiode
  console.log('\n📅 Stageperiode:')
  await upsertPeriode(sb)

  // 3. Opdrachten
  console.log('\n📚 Opdrachten:')
  await upsertOpdrachten(sb)

  // 4. Badge
  console.log('\n🏆 Badge:')
  await upsertBadge(sb)

  // 5. Placement (student ↔ coach)
  console.log('\n🔗 Placement:')
  const placementId = await upsertPlacement(sb, studProfileId, coachProfileId)

  // 6. Uren
  console.log('\n⏱ Uren:')
  await upsertUren(sb, studProfileId, placementId)

  // 7. Student assignments
  console.log('\n📋 Student assignments:')
  await upsertStudentAssignments(sb, studProfileId, placementId)

  // 8. Dagstory
  console.log('\n📖 Dagstory:')
  await upsertDagstory(sb, studProfileId, placementId)

  // Exporteer IDs als env vars voor de tests
  process.env.TEST_PLACEMENT_ID = placementId
  process.env.TEST_SCHOOL_ID    = TEST_SCHOOL_ID
  process.env.TEST_PERIOD_ID    = TEST_PERIOD_ID
  process.env.TEST_ASSIGN_1     = TEST_ASSIGN_1
  process.env.TEST_ASSIGN_2     = TEST_ASSIGN_2

  console.log('\n🚀 Testwereld klaar — tests starten...\n')
}
