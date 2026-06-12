import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { placementId } = await request.json()
    if (!placementId) return Response.json({ error: 'placementId ontbreekt' }, { status: 400 })

    const supabase = await createClient()

    // Haal placement + student + school op
    const { data: placement, error: pErr } = await supabase
      .from('placements')
      .select(`
        *,
        profiles!placements_student_id_fkey(name, email, klas),
        schools(name, slug)
      `)
      .eq('id', placementId)
      .maybeSingle()

    if (pErr || !placement) {
      return Response.json({ error: 'Placement niet gevonden' }, { status: 404 })
    }

    const student = placement.profiles
    const school = placement.schools
    const intakeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/intake/${placementId}`

    if (!student?.email) {
      return Response.json({ error: 'Student heeft geen e-mailadres' }, { status: 400 })
    }

    // Stuur email naar student
    const { error: emailErr } = await resend.emails.send({
      from: `Stagepoort <noreply@stagepoort.nl>`,
      to: student.email,
      subject: `Jouw stageplek invullen — ${school?.name || 'Stagepoort'}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F7F3EE">
          <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(14,58,92,.08)">
            
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
              <div style="background:#0E3A5C;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
                <span style="color:#F26B1D;font-size:20px">●</span>
              </div>
              <div style="font-family:Georgia,serif;font-weight:700;font-size:20px;color:#0E3A5C">Stagepoort</div>
            </div>

            <h1 style="font-size:22px;font-weight:700;color:#1A2633;margin-bottom:8px">
              Hoi ${student.name?.split(' ')[0] || 'leerling'}! 👋
            </h1>
            <p style="color:#5C6B7A;font-size:14px;line-height:1.7;margin-bottom:20px">
              Je stagecoördinator heeft je gevraagd je stageplek in te vullen via Stagepoort. 
              Dit duurt ongeveer 3 minuten.
            </p>

            <div style="background:#F7F3EE;border-radius:10px;padding:16px;margin-bottom:24px">
              <div style="font-size:13px;color:#5C6B7A;margin-bottom:4px">Wat je nodig hebt:</div>
              <ul style="font-size:13px;color:#1A2633;line-height:1.8;margin:0;padding-left:16px">
                <li>Naam en adres van je stagebedrijf</li>
                <li>Naam en e-mail van je stagebegeleider</li>
                <li>Telefoonnummer van het bedrijf</li>
              </ul>
            </div>

            <a href="${intakeLink}" style="display:block;background:#F26B1D;color:#fff;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:20px">
              📋 Stageplek invullen →
            </a>

            <p style="font-size:12px;color:#9AA8B2;line-height:1.6;margin-bottom:0">
              Deze link is persoonlijk en alleen voor jou bedoeld.<br>
              Kun je de knop niet klikken? Kopieer dan deze link:<br>
              <a href="${intakeLink}" style="color:#0E3A5C;word-break:break-all">${intakeLink}</a>
            </p>

          </div>
          <p style="text-align:center;font-size:11px;color:#B0BAC4;margin-top:16px">
            ${school?.name || 'Stagepoort'} · Stagepoort.nl
          </p>
        </div>
      `,
    })

    if (emailErr) {
      console.error('Resend fout:', emailErr)
      return Response.json({ error: emailErr.message }, { status: 500 })
    }

    // Update placement status naar invited
    await supabase.from('placements').update({
      status: 'invited',
      invited_at: new Date().toISOString(),
    }).eq('id', placementId)

    return Response.json({ success: true })

  } catch (err) {
    console.error('Send-invite fout:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
