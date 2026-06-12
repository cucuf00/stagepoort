import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { placementId, data } = body

    if (!placementId || !data) {
      return Response.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check of de placement bestaat en de status klopt
    const { data: placement, error: fetchErr } = await supabase
      .from('placements').select('id, status')
      .eq('id', placementId)
      .maybeSingle()

    if (fetchErr || !placement) {
      return Response.json({ error: 'Placement niet gevonden' }, { status: 404 })
    }

    if (!['pending', 'invited', 'rejected'].includes(placement.status)) {
      return Response.json({ error: 'Deze link is niet meer geldig' }, { status: 403 })
    }

    // Update via service role (server-side)
    const { error } = await supabase.from('placements').update({
      status: 'review',
      submitted_at: new Date().toISOString(),
      first_name: data.voornaam,
      infix: data.tussenvoegsel || null,
      last_name: data.achternaam,
      student_phone: data.telefoon_leerling,
      company_name: data.bedrijfsnaam,
      company_address: data.bezoekadres,
      company_postcode: data.postcode,
      company_city: data.plaats,
      company_phone: data.telefoon_bedrijf,
      company_email: data.email_bedrijf,
      supervisor_name: data.stagebegeleider,
      green_stage: data.groene_stage === 'ja',
    }).eq('id', placementId)

    if (error) {
      console.error('Intake update fout:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Intake fout:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
