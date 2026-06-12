import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { placementId } = await request.json()
    if (!placementId) return Response.json({ error: 'placementId ontbreekt' }, { status: 400 })

    const supabase = await createClient()

    // Verificeer coordinator
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: coordinator } = await supabase
      .from('profiles').select('name, email, role, school_id')
      .eq('user_id', user.id).limit(1).maybeSingle()

    if (coordinator?.role !== 'coordinator') {
      return Response.json({ error: 'Geen toegang' }, { status: 403 })
    }

    // Haal placement + school op
    const { data: placement } = await supabase
      .from('placements')
      .select('*, schools(name)')
      .eq('id', placementId)
      .maybeSingle()

    if (!placement) return Response.json({ error: 'Placement niet gevonden' }, { status: 404 })
    if (!placement.company_email) return Response.json({ error: 'Geen e-mail van stagebegeleider bekend' }, { status: 400 })

    const school = placement.schools
    const leerlingNaam = [placement.first_name, placement.infix, placement.last_name].filter(Boolean).join(' ')
    const supervisorLink = `${process.env.NEXT_PUBLIC_SITE_URL}/begeleider/${placementId}`

    // Haal email template op
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('school_id', coordinator.school_id)
      .eq('type', 'supervisor_welcome')
      .maybeSingle()

    // Vul variabelen in
    const vulIn = (tekst) => tekst
      .replace(/{{begeleider_naam}}/g, placement.supervisor_name || 'Begeleider')
      .replace(/{{leerling_naam}}/g, leerlingNaam)
      .replace(/{{bedrijfsnaam}}/g, placement.company_name || '')
      .replace(/{{startdatum}}/g, placement.start_date ? new Date(placement.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'nader te bepalen')
      .replace(/{{link}}/g, supervisorLink)
      .replace(/{{coordinator_naam}}/g, coordinator.name || '')
      .replace(/{{coordinator_email}}/g, coordinator.email || '')
      .replace(/{{school_naam}}/g, school?.name || 'Stagepoort')

    const subject = vulIn(template?.subject || 'Uw stagiair {{leerling_naam}} — toegang Stagepoort')
    const bodyTekst = vulIn(template?.body || `Geachte {{begeleider_naam}},\n\nBinnenkort start {{leerling_naam}} zijn/haar stage bij {{bedrijfsnaam}}.\n\nUw persoonlijke toegangslink:\n{{link}}\n\nMet vriendelijke groet,\n{{coordinator_naam}}\n{{school_naam}}`)

    // Zet tekst om naar HTML
    const bodyHtml = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F7F3EE">
        <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(14,58,92,.08)">
          <div style="font-family:Georgia,serif;font-weight:700;font-size:20px;color:#0E3A5C;margin-bottom:24px">
            Stagepoort
          </div>
          ${bodyTekst.split('\n').map(regel => 
            regel.trim() === '' 
              ? '<br>' 
              : regel.includes(supervisorLink)
                ? `<p style="margin:16px 0"><a href="${supervisorLink}" style="display:inline-block;background:#F26B1D;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">Toegang Stagepoort →</a></p>`
                : `<p style="color:#1A2633;font-size:14px;line-height:1.7;margin:6px 0">${regel}</p>`
          ).join('')}
          <hr style="border:none;border-top:1px solid #E4DDD4;margin:24px 0">
          <p style="font-size:12px;color:#9AA8B2">
            ${school?.name || 'Stagepoort'} · Via Stagepoort.nl
          </p>
        </div>
      </div>
    `

    // Verstuur email
    const { error: emailErr } = await resend.emails.send({
      from: `${coordinator.name || 'Stagepoort'} <noreply@stagepoort.nl>`,
      to: placement.company_email,
      subject,
      html: bodyHtml,
    })

    if (emailErr) {
      console.error('Resend fout:', emailErr)
      return Response.json({ error: emailErr.message }, { status: 500 })
    }

    // Update placement naar active
    await supabase.from('placements').update({
      status: 'active',
      approved_at: new Date().toISOString(),
    }).eq('id', placementId)

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: coordinator.school_id,
      actor_id: user.id,
      placement_id: placementId,
      entity_type: 'placement',
      entity_id: placementId,
      action: 'placement.approved',
      new_value: { status: 'active', approved_by: coordinator.name },
    })

    return Response.json({ success: true })

  } catch (err) {
    console.error('Send-supervisor fout:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
