import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
  // Client aangemaakt binnen de functie — vermijdt top-level init problemen in Next.js
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

    // Stap 1: Controleer of placement bestaat en invulbaar is
    const { data: placement, error: selectError } = await supabaseAnon
      .from('placements')
      .select('id, status')
      .eq('id', placementId)
      .single()

    if (selectError || !placement) {
      return NextResponse.json(
        { error: 'Dit intakeformulier is niet beschikbaar of al verwerkt.' },
        { status: 404 }
      )
    }

    if (!['pending', 'invited', 'rejected'].includes(placement.status)) {
      return NextResponse.json(
        { error: 'Dit intakeformulier is niet meer beschikbaar.' },
        { status: 409 }
      )
    }

    // Stap 2: Schrijf intakedata + zet status naar 'review'
    const { error: updateError } = await supabaseAnon
      .from('placements')
      .update({
        first_name:       String(data.voornaam).trim(),
        infix:            data.tussenvoegsel ? String(data.tussenvoegsel).trim() : null,
        last_name:        String(data.achternaam).trim(),
        student_phone:    data.telefoon_leerling ? String(data.telefoon_leerling).trim() : null,
        company_name:     String(data.bedrijfsnaam).trim(),
        company_address:  String(data.bezoekadres).trim(),
        company_postcode: String(data.postcode).trim(),
        company_city:     String(data.plaats).trim(),
        company_phone:    data.telefoon_bedrijf ? String(data.telefoon_bedrijf).trim() : null,
        company_email:    data.email_bedrijf ? String(data.email_bedrijf).trim().toLowerCase() : null,
        supervisor_name:  String(data.stagebegeleider).trim(),
        green_stage:      data.groene_stage === true || data.groene_stage === 'ja',
        status:           'review',
        submitted_at:     new Date().toISOString(),
      })
      .eq('id', placementId)

    if (updateError) {
      console.error('[intake] Update mislukt:', updateError)
      if (updateError.code === '42501') {
        return NextResponse.json({ error: 'Dit formulier mag niet meer worden bijgewerkt.' }, { status: 403 })
      }
      return NextResponse.json({ error: 'Er is een fout opgetreden. Probeer het opnieuw.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Intakeformulier succesvol ontvangen.' })
  } catch (err) {
    console.error('[intake] Onverwachte fout:', err)
    return NextResponse.json({ error: 'Serverfout. Probeer het later opnieuw.' }, { status: 500 })
  }
}
