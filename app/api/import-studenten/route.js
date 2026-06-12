import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { leerlingen, schoolId, coordinatorId } = await request.json()
    if (!leerlingen?.length) return Response.json({ error: 'Geen leerlingen' }, { status: 400 })

    const supabase = await createClient()

    // Verificeer dat de aanvrager een coordinator is
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: prof, error: profCheckErr } = await supabase
      .from('profiles').select('role, school_id, id')
      .eq('user_id', user.id).limit(1).maybeSingle()

    console.log('Prof check:', JSON.stringify(prof), 'Error:', profCheckErr?.message)

    if (prof?.role !== 'coordinator') return Response.json({ error: `Geen toegang — rol: ${prof?.role}, user: ${user.id}` }, { status: 403 })

    let aangemaakt = 0
    let overgeslagen = 0

    for (const ll of leerlingen) {
      if (!ll.naam || !ll.email) { overgeslagen++; continue }

      // Check bestaand profiel op email
      const { data: bestaand } = await supabase
        .from('profiles').select('id')
        .eq('school_id', prof.school_id)
        .eq('email', ll.email)
        .maybeSingle()

      let studentId = bestaand?.id

      if (!studentId) {
        // Maak profiel aan zonder user_id (wordt gekoppeld als student inlogt)
        const { data: nieuw, error: profErr } = await supabase
          .from('profiles').insert({
            school_id: prof.school_id,
            name: ll.naam,
            email: ll.email,
            role: 'student',
            klas: ll.klas || null,
          }).select('id').maybeSingle()

        if (profErr) {
          console.error('Profiel fout:', profErr.message)
          overgeslagen++
          continue
        }
        studentId = nieuw?.id
      } else {
        await supabase.from('profiles').update({
          name: ll.naam,
          email: ll.email,
          ...(ll.klas ? { klas: ll.klas } : {}),
        }).eq('id', bestaand.id)
      }

      if (!studentId) { overgeslagen++; continue }

      // Check bestaande placement
      const { data: bestaandePlacement } = await supabase
        .from('placements').select('id')
        .eq('student_id', studentId)
        .not('status', 'in', '("completed","cancelled")')
        .maybeSingle()

      if (bestaandePlacement) { overgeslagen++; continue }

      // Maak placement aan
      const { error: plErr } = await supabase.from('placements').insert({
        school_id: prof.school_id,
        student_id: studentId,
        coordinator_id: prof.id,
        status: 'pending',
      })

      if (!plErr) aangemaakt++
      else { console.error('Placement fout:', plErr.message); overgeslagen++ }
    }

    return Response.json({ aangemaakt, overgeslagen })
  } catch (err) {
    console.error('Import fout:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
