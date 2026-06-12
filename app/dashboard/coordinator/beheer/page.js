'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

const VARIABELEN = [
  { key: '{{begeleider_naam}}', omschrijving: 'Naam van de stagebegeleider' },
  { key: '{{leerling_naam}}',   omschrijving: 'Volledige naam van de leerling' },
  { key: '{{bedrijfsnaam}}',    omschrijving: 'Naam van het stagebedrijf' },
  { key: '{{startdatum}}',      omschrijving: 'Startdatum van de stage' },
  { key: '{{link}}',            omschrijving: 'Persoonlijke toegangslink begeleider' },
  { key: '{{coordinator_naam}}',omschrijving: 'Jouw naam als coördinator' },
  { key: '{{coordinator_email}}',omschrijving: 'Jouw e-mailadres' },
  { key: '{{school_naam}}',     omschrijving: 'Naam van de school' },
]

const DEMO_WAARDEN = {
  '{{begeleider_naam}}':   'R. Jansen',
  '{{leerling_naam}}':     'Yusuf Demir',
  '{{bedrijfsnaam}}':      'TechWerk B.V.',
  '{{startdatum}}':        '1 september 2026',
  '{{link}}':              'https://stagepoort.vercel.app/begeleider/voorbeeld',
  '{{coordinator_naam}}':  'K. Breedveld',
  '{{coordinator_email}}': 'k.breedveld@school.nl',
  '{{school_naam}}':       'ROC Rotterdam',
}

function vulDemoIn(tekst) {
  let result = tekst
  for (const [key, val] of Object.entries(DEMO_WAARDEN)) {
    result = result.replaceAll(key, val)
  }
  return result
}

export default function BeheerPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [opgeslagen, setOpgeslagen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [tab, setTab] = useState('bewerken')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('id,name,role,school_id')
        .eq('user_id', session.user.id).limit(1).maybeSingle()

      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)

      // Haal template op
      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('school_id', prof.school_id)
        .eq('type', 'supervisor_welcome')
        .maybeSingle()

      if (template) {
        setSubject(template.subject)
        setBody(template.body)
      }
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function slaOp() {
    setBezig(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        school_id: profile.school_id,
        type: 'supervisor_welcome',
        subject,
        body,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'school_id,type' })

    if (!error) {
      showToast('✅ Template opgeslagen!')
      setOpgeslagen(true)
      setTimeout(() => setOpgeslagen(false), 3000)
    } else {
      showToast('❌ ' + error.message, false)
    }
    setBezig(false)
  }

  function voegVariabeleToe(key) {
    setBody(prev => prev + key)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const previewSubject = vulDemoIn(subject)
  const previewBody = vulDemoIn(body)

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Beheer</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Sectie titel */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📧 E-mailtemplate — Welkomstmail stagebegeleider</h2>
          <p style={{ fontSize: 13, color: '#5C6B7A', lineHeight: 1.6 }}>
            Deze mail wordt automatisch verstuurd naar de stagebegeleider zodra jij een koppeling goedkeurt.
            Gebruik de variabelen hieronder om persoonlijke gegevens automatisch in te vullen.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

          {/* Editor kolom */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F0EDE8', borderRadius: 10, padding: 4, width: 'fit-content' }}>
              {['bewerken', 'preview'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? '#1A2633' : '#5C6B7A',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                }}>
                  {t === 'bewerken' ? '✏️ Bewerken' : '👁️ Preview'}
                </button>
              ))}
            </div>

            {tab === 'bewerken' ? (
              <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, overflow: 'hidden' }}>
                {/* Onderwerp */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4DDD4' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>
                    Onderwerp
                  </label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, color: '#1A2633', outline: 'none' }}
                    placeholder="Onderwerp van de e-mail..."
                  />
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>
                    Berichttekst
                  </label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    style={{ width: '100%', minHeight: 340, padding: '12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#1A2633', outline: 'none', resize: 'vertical', lineHeight: 1.7 }}
                    placeholder="Typ hier de berichttekst..."
                  />
                </div>

                {/* Opslaan */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #E4DDD4', background: '#FAFAF8', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={slaOp}
                    disabled={bezig}
                    style={{ padding: '10px 24px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? .6 : 1 }}
                  >
                    {bezig ? '⏳ Opslaan...' : '💾 Opslaan'}
                  </button>
                  {opgeslagen && <span style={{ fontSize: 13, color: '#1A7F52', fontWeight: 600 }}>✓ Wijzigingen opgeslagen</span>}
                </div>
              </div>
            ) : (
              /* Preview */
              <div style={{ background: '#F7F3EE', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
                  Voorbeeldweergave met demogegevens
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 4px 16px rgba(14,58,92,.08)' }}>
                  <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 18, color: '#0E3A5C', marginBottom: 20 }}>Stagepoort</div>
                  <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 4 }}>
                    <strong>Aan:</strong> begeleider@techwerk.nl
                  </div>
                  <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 16 }}>
                    <strong>Onderwerp:</strong> {previewSubject}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #E4DDD4', marginBottom: 16 }} />
                  {previewBody.split('\n').map((regel, i) =>
                    regel.trim() === ''
                      ? <br key={i} />
                      : regel.includes('stagepoort.vercel.app/begeleider')
                        ? <div key={i} style={{ margin: '16px 0' }}>
                            <a href="#" style={{ display: 'inline-block', background: '#F26B1D', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
                              Toegang Stagepoort →
                            </a>
                          </div>
                        : <p key={i} style={{ fontSize: 14, color: '#1A2633', lineHeight: 1.7, margin: '4px 0' }}>{regel}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Variabelen sidebar */}
          <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, position: 'sticky', top: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📎 Beschikbare variabelen</div>
            <p style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 14, lineHeight: 1.5 }}>
              Klik op een variabele om hem toe te voegen aan de berichttekst.
            </p>
            {VARIABELEN.map(v => (
              <button
                key={v.key}
                onClick={() => voegVariabeleToe(v.key)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6, background: '#F7F3EE', border: '1px solid #E4DDD4', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0E3A5C', marginBottom: 2 }}>{v.key}</div>
                <div style={{ color: '#5C6B7A' }}>{v.omschrijving}</div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </CoordinatorLayout>
  )
}
