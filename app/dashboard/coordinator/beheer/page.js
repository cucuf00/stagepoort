'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

const VARIABELEN = [
  { key: '{{begeleider_naam}}',   uitleg: 'Naam van de stagebegeleider' },
  { key: '{{leerling_naam}}',     uitleg: 'Volledige naam van de leerling' },
  { key: '{{bedrijfsnaam}}',      uitleg: 'Naam van het stagebedrijf' },
  { key: '{{startdatum}}',        uitleg: 'Startdatum van de stage' },
  { key: '{{link}}',              uitleg: 'Persoonlijke toegangslink begeleider' },
  { key: '{{coordinator_naam}}',  uitleg: 'Jouw naam als coördinator' },
  { key: '{{coordinator_email}}', uitleg: 'Jouw e-mailadres' },
  { key: '{{school_naam}}',       uitleg: 'Naam van de school' },
]

const VOORBEELD = {
  '{{begeleider_naam}}':   'R. Jansen',
  '{{leerling_naam}}':     'Yusuf Demir',
  '{{bedrijfsnaam}}':      'TechWerk B.V.',
  '{{startdatum}}':        '1 september 2026',
  '{{link}}':              'https://stagepoort.vercel.app/begeleider/voorbeeld',
  '{{coordinator_naam}}':  'K. Breedveld',
  '{{coordinator_email}}': 'k.breedveld@school.nl',
  '{{school_naam}}':       'ROC Rotterdam',
}

export default function BeheerPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState({ subject: '', body: '' })
  const [opgeslagen, setOpgeslagen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [preview, setPreview] = useState(false)
  const [templateId, setTemplateId] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('name,role,school_id')
        .eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)

      const { data: tmpl } = await supabase
        .from('email_templates')
        .select('*')
        .eq('school_id', prof.school_id)
        .eq('type', 'supervisor_welcome')
        .maybeSingle()

      if (tmpl) {
        setTemplate({ subject: tmpl.subject, body: tmpl.body })
        setTemplateId(tmpl.id)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function opslaan() {
    setBezig(true)
    const supabase = createClient()
    const { data: prof } = await supabase
      .from('profiles').select('school_id')
      .eq('name', profile.name).limit(1).maybeSingle()

    const schoolId = profile.school_id

    if (templateId) {
      await supabase.from('email_templates').update({
        subject: template.subject,
        body: template.body,
        updated_at: new Date().toISOString(),
      }).eq('id', templateId)
    } else {
      const { data: nieuw } = await supabase.from('email_templates').insert({
        school_id: schoolId,
        type: 'supervisor_welcome',
        subject: template.subject,
        body: template.body,
      }).select('id').single()
      setTemplateId(nieuw?.id)
    }

    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 3000)
    setBezig(false)
  }

  function vulPreview(tekst) {
    return Object.entries(VOORBEELD).reduce((t, [k, v]) => t.replaceAll(k, v), tekst)
  }

  function voegVariabeleToe(key, veld) {
    setTemplate(prev => ({
      ...prev,
      [veld]: prev[veld] + key,
    }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const previewBody = vulPreview(template.body)
  const previewSubject = vulPreview(template.subject)

  return (
    <CoordinatorLayout profile={profile}>
      {opgeslagen && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1A7F52', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999 }}>
          ✅ Template opgeslagen!
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Beheer</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{ padding: '8px 18px', background: '#0E3A5C', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#fff' }}>
            📧 E-mailtemplate
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

          {/* Editor */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                📧 Welkomstmail stagebegeleider
              </div>
              <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 20, lineHeight: 1.6 }}>
                Deze mail wordt automatisch verstuurd naar de stagebegeleider zodra jij een koppeling goedkeurt.
              </p>

              {/* Onderwerp */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>
                  Onderwerp
                </label>
                <input
                  value={template.subject}
                  onChange={e => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E4DDD4', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }}
                  placeholder="Bijv: Uw stagiair {{leerling_naam}} — toegang Stagepoort"
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>
                  Berichttekst
                </label>
                <textarea
                  value={template.body}
                  onChange={e => setTemplate(prev => ({ ...prev, body: e.target.value }))}
                  style={{ width: '100%', minHeight: 320, padding: '12px 14px', border: '1.5px solid #E4DDD4', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, lineHeight: 1.7, outline: 'none', resize: 'vertical' }}
                  placeholder="Schrijf hier de berichttekst..."
                />
              </div>

              {/* Knoppen */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={opslaan}
                  disabled={bezig}
                  style={{ padding: '10px 22px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? .7 : 1 }}
                >
                  {bezig ? '⏳ Opslaan...' : '💾 Opslaan'}
                </button>
                <button
                  onClick={() => setPreview(!preview)}
                  style={{ padding: '10px 22px', background: preview ? '#0E3A5C' : '#E8F0F6', border: 'none', borderRadius: 10, color: preview ? '#fff' : '#0E3A5C', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {preview ? '✏️ Terug naar editor' : '👁️ Preview bekijken'}
                </button>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div style={{ background: '#fff', border: '1.5px solid #0E3A5C', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 16 }}>
                  👁️ Preview — zo ziet de begeleider de mail
                </div>
                <div style={{ background: '#F7F3EE', borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 4 }}>Onderwerp:</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: '#1A2633' }}>{previewSubject}</div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 12px rgba(14,58,92,.08)' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 18, color: '#0E3A5C', marginBottom: 20 }}>Stagepoort</div>
                    {previewBody.split('\n').map((regel, i) =>
                      regel.trim() === ''
                        ? <br key={i} />
                        : regel.includes('stagepoort.vercel.app')
                          ? <div key={i} style={{ margin: '16px 0' }}><a href="#" style={{ display: 'inline-block', background: '#F26B1D', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Toegang Stagepoort →</a></div>
                          : <p key={i} style={{ fontSize: 14, color: '#1A2633', lineHeight: 1.7, margin: '4px 0' }}>{regel}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Variabelen sidebar */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, position: 'sticky', top: 24 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔧 Beschikbare variabelen</div>
              <p style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 16, lineHeight: 1.5 }}>
                Klik op een variabele om hem toe te voegen aan de berichttekst.
              </p>
              {VARIABELEN.map(v => (
                <div
                  key={v.key}
                  onClick={() => voegVariabeleToe(v.key, 'body')}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E4DDD4', marginBottom: 8, cursor: 'pointer', background: '#FAFAF8' }}
                >
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#F26B1D', marginBottom: 2 }}>{v.key}</div>
                  <div style={{ fontSize: 11, color: '#5C6B7A' }}>{v.uitleg}</div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, background: '#E8F0F6', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0E3A5C', marginBottom: 4 }}>💡 Tip</div>
                <div style={{ fontSize: 11, color: '#5C6B7A', lineHeight: 1.5 }}>
                  Zet <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>{'{{link}}'}</code> op een eigen regel — dat wordt automatisch een knop in de mail.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </CoordinatorLayout>
  )
}
