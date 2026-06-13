import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    const body = await request.json()
    const { placementId, data } = body

    if (!placementId || typeof placementId !== 'string') {
      return NextResponse.json({ error: 'Ongeldig verzoek: placementId ontbreekt.' }, { status: 400 })
    }
    if (!UUID_REGEX.test(placementId)) {
      return NextResponse.json({ error: 'Ongeldig verzoek: placementId heeft geen geldig formaat.' }, { status: 400 })
    }

    const vereistevelden = ['voornaam', 'achternaam', 'bedrijfsnaam', 'bezoekadres', 'postcode', 'plaats', 'stagebegeleider']
    for (const veld of vereistevelden) {
      if (!data?.[veld] || String(data[veld]).trim() === '') {
        return NextResponse.json({ error: `Verplicht veld ontbreekt: ${veld}` }, { status: 400 })
      }
    }

    // Roep de SECURITY DEFINER functie aan — valideert en update atomisch
    const { data: result, error } = await supabaseAnon.rpc('submit_intake', {
      p_placement_id:    placementId,
      p_first_name:      String(data.voornaam).trim(),
      p_infix:           data.tussenvoegsel ? String(data.tussenvoegsel).trim() : null,
      p_last_name:       String(data.achternaam).trim(),
      p_student_phone:   data.telefoon_leerling ? String(data.telefoon_leerling).trim() : null,
      p_company_name:    String(data.bedrijfsnaam).trim(),
      p_company_address: String(data.bezoekadres).trim(),
      p_company_postcode: String(data.postcode).trim(),
      p_company_city:    String(data.plaats).trim(),
      p_company_phone:   data.telefoon_bedrijf ? String(data.telefoon_bedrijf).trim() : null,
      p_company_email:   data.email_bedrijf ? String(data.email_bedrijf).trim().toLowerCase() : null,
      p_supervisor_name: String(data.stagebegeleider).trim(),
      p_green_stage:     data.groene_stage === true || data.groene_stage === 'ja',
    })

    if (error) {
      console.error('[intake] RPC fout:', error)
      return NextResponse.json({ error: 'Er is een fout opgetreden. Probeer het opnieuw.' }, { status: 500 })
    }

    // Functie geeft zelf een JSON object terug met success of error
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.code || 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[intake] Onverwachte fout:', err)
    return NextResponse.json({ error: 'Serverfout. Probeer het later opnieuw.' }, { status: 500 })
  }
}
