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

function fmtDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BeheerPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('periodes')

  // Template state
  const [template, setTemplate] = useState({ subject: '', body: '' })
  const [templateId, setTemplateId] = useState(null)
  const [templateBezig, setTemplateBezig] = useState(false)
  const [templateOpgeslagen, setTemplateOpgeslagen] = useState(false)
  const [preview, setPreview] = useState(false)

  // Periodes state
  const [periodes, setPeriodes] = useState([])
  const [nieuwePeriode, setNieuwePeriode] = useState({ name: '', start_date: '', end_date: '', hours_goal: 160 })
  const [periodeBezig, setPeriodeBezig] = useState(false)

  // Mede-coordinatoren state
  const [invites, setInvites] = useState([])
  const [uitnodigEmail, setUitnodigEmail] = useState('')
  const [uitnodigPeriode, setUitnodigPeriode] = useState('')
  const [uitnodigBezig, setUitnodigBezig] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*')
        .eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)

      const [{ data: tmpl }, { data: pers }, { data: inv }] = await Promise.all([
        supabase.from('email_templates').select('*').eq('school_id', prof.school_id).eq('type', 'supervisor_welcome').maybeSingle(),
        supabase.from('stage_periods').select('*').eq('school_id', prof.school_id).order('start_date'),
        supabase.from('coordinator_invites').select('*, stage_periods(name)').eq('school_id', prof.school_id).order('invited_at', { ascending: false }),
      ])

      if (tmpl) { setTemplate({ subject: tmpl.subject, body: tmpl.body }); setTemplateId(tmpl.id) }
      setPeriodes(pers ?? [])
      setInvites(inv ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Template opslaan
  async function slaTemplateOp() {
    setTemplateBezig(true)
    const supabase = createClient()
    if (templateId) {
      await supabase.from('email_templates').update({ subject: template.subject, body: template.body, updated_at: new Date().toISOString() }).eq('id', templateId)
    } else {
      const { data } = await supabase.from('email_templates').insert({ school_id: profile.school_id, type: 'supervisor_welcome', subject: template.subject, body: template.body }).select('id').single()
      setTemplateId(data?.id)
    }
    setTemplateOpgeslagen(true)
    setTimeout(() => setTemplateOpgeslagen(false), 3000)
    setTemplateBezig(false)
  }

  // Periode aanmaken
  async function maakPeriode() {
    if (!nieuwePeriode.name || !nieuwePeriode.start_date || !nieuwePeriode.end_date) return
    setPeriodeBezig(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('stage_periods').insert({
      school_id: profile.school_id,
      name: nieuwePeriode.name,
      start_date: nieuwePeriode.start_date,
      end_date: nieuwePeriode.end_date,
      hours_goal: parseInt(nieuwePeriode.hours_goal) || 160,
      created_by: profile.id,
    }).select().single()
    if (!error) {
      setPeriodes(prev => [...prev, data])
      setNieuwePeriode({ name: '', start_date: '', end_date: '', hours_goal: 160 })
      showToast('✅ Periode aangemaakt!')
    } else showToast('❌ ' + error.message, false)
    setPeriodeBezig(false)
  }

  // Verwijder periode
  async function verwijderPeriode(id) {
    const supabase = createClient()
    await supabase.from('stage_periods').delete().eq('id', id)
    setPeriodes(prev => prev.filter(p => p.id !== id))
    showToast('🗑️ Periode verwijderd')
  }

  // Mede-coordinator uitnodigen
  async function uitnodigen() {
    if (!uitnodigEmail.includes('@')) return
    setUitnodigBezig(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('coordinator_invites').insert({
      school_id: profile.school_id,
      email: uitnodigEmail,
      period_id: uitnodigPeriode || null,
      invited_by: profile.id,
      status: 'invited',
    }).select('*, stage_periods(name)').single()
    if (!error) {
      setInvites(prev => [data, ...prev])
      setUitnodigEmail('')
      setUitnodigPeriode('')
      showToast('📨 Uitnodiging verstuurd!')
    } else if (error.code === '23505') {
      showToast('❌ Dit emailadres is al uitgenodigd', false)
    } else showToast('❌ ' + error.message, false)
    setUitnodigBezig(false)
  }

  function vulPreview(tekst) {
    return Object.entries(VOORBEELD).reduce((t, [k, v]) => t.replaceAll(k, v), tekst)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #E4DDD4', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 14, color: '#1A2633', outline: 'none', background: '#fff' }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
      {templateOpgeslagen && (
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
          {[
            { key: 'periodes', label: '📅 Stageperiodes' },
            { key: 'coordinatoren', label: '👥 Mede-coördinatoren' },
            { key: 'template', label: '📧 E-mailtemplate' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? '#0E3A5C' : '#E8F0F6',
              color: activeTab === tab.key ? '#fff' : '#0E3A5C',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ===== STAGEPERIODES ===== */}
        {activeTab === 'periodes' && (
          <div>
            {/* Overzicht */}
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4DDD4', fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700 }}>
                📅 Actieve stageperiodes
              </div>
              {periodes.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#5C6B7A', fontSize: 14 }}>Nog geen periodes aangemaakt</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F7F3EE' }}>
                      {['Periode', 'Looptijd', 'Urendoel', ''].map(h => (
                        <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodes.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid #E4DDD4' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#5C6B7A' }}>{fmtDatum(p.start_date)} – {fmtDatum(p.end_date)}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#0E3A5C' }}>{p.hours_goal} uur</td>
                        <td style={{ padding: '14px 20px' }}>
                          <button onClick={() => verwijderPeriode(p.id)} style={{ padding: '5px 12px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            Verwijderen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Nieuwe periode */}
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>+ Nieuwe periode aanmaken</div>
              <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 20, lineHeight: 1.6 }}>
                Elke periode heeft eigen datums, een eigen urendoel en een eigen opdrachtenset. Leerjaar 3 en 4 kunnen zo tegelijk naast elkaar lopen.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Naam periode</label>
                  <input value={nieuwePeriode.name} onChange={e => setNieuwePeriode(p => ({ ...p, name: e.target.value }))} placeholder="Bijv. Leerjaar 3 — 2027/2028" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Urendoel</label>
                  <input type="number" value={nieuwePeriode.hours_goal} onChange={e => setNieuwePeriode(p => ({ ...p, hours_goal: e.target.value }))} placeholder="160" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Startdatum</label>
                  <input type="date" value={nieuwePeriode.start_date} onChange={e => setNieuwePeriode(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Einddatum</label>
                  <input type="date" value={nieuwePeriode.end_date} onChange={e => setNieuwePeriode(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <button onClick={maakPeriode} disabled={!nieuwePeriode.name || !nieuwePeriode.start_date || !nieuwePeriode.end_date || periodeBezig} style={{ padding: '10px 22px', background: (!nieuwePeriode.name || !nieuwePeriode.start_date || !nieuwePeriode.end_date) ? '#E4DDD4' : '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {periodeBezig ? '⏳ Bezig...' : '+ Periode aanmaken'}
              </button>
            </div>
          </div>
        )}

        {/* ===== MEDE-COORDINATOREN ===== */}
        {activeTab === 'coordinatoren' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>👥 Mede-coördinator uitnodigen</div>
              <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 20, lineHeight: 1.6 }}>
                Heeft jullie school een aparte coördinator per leerjaar? Nodig die hier uit en kies welke periode diegene beheert. De mede-coördinator krijgt een magic link en kan direct aan de slag binnen zijn eigen periode — jij houdt het totaaloverzicht.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>E-mail collega-coördinator</label>
                  <input type="email" value={uitnodigEmail} onChange={e => setUitnodigEmail(e.target.value)} placeholder="p.devries@school.nl" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Beheert periode</label>
                  <select value={uitnodigPeriode} onChange={e => setUitnodigPeriode(e.target.value)} style={{ ...inputStyle }}>
                    <option value="">Alle periodes</option>
                    {periodes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={uitnodigen} disabled={!uitnodigEmail.includes('@') || uitnodigBezig} style={{ padding: '10px 22px', background: uitnodigEmail.includes('@') ? '#F26B1D' : '#E4DDD4', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {uitnodigBezig ? '⏳ Bezig...' : '📨 Uitnodigen als coördinator'}
              </button>
            </div>

            {/* Overzicht uitnodigingen */}
            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4DDD4', fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700 }}>
                Verstuurde uitnodigingen
              </div>
              {invites.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#5C6B7A', fontSize: 14 }}>Nog geen uitnodigingen verstuurd</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F7F3EE' }}>
                      {['E-mail', 'Periode', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(inv => (
                      <tr key={inv.id} style={{ borderTop: '1px solid #E4DDD4' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 14 }}>{inv.email}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#5C6B7A' }}>{inv.stage_periods?.name || 'Alle periodes'}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: inv.status === 'active' ? '#E2F4EC' : '#FBF0D8', color: inv.status === 'active' ? '#1A7F52' : '#A87010' }}>
                            {inv.status === 'active' ? 'Geactiveerd' : 'Verstuurd'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {inv.status === 'invited' && (
                            <button onClick={() => showToast('📨 Herinnering verstuurd!')} style={{ padding: '5px 12px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                              Herinnering
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== EMAIL TEMPLATE ===== */}
        {activeTab === 'template' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
            <div>
              <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📧 Welkomstmail stagebegeleider</div>
                <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 20, lineHeight: 1.6 }}>
                  Deze mail wordt automatisch verstuurd naar de stagebegeleider zodra jij een koppeling goedkeurt.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Onderwerp</label>
                  <input value={template.subject} onChange={e => setTemplate(p => ({ ...p, subject: e.target.value }))} style={inputStyle} placeholder="Uw stagiair {{leerling_naam}} — toegang Stagepoort" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Berichttekst</label>
                  <textarea value={template.body} onChange={e => setTemplate(p => ({ ...p, body: e.target.value }))} style={{ ...inputStyle, minHeight: 320, resize: 'vertical', lineHeight: 1.7 }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={slaTemplateOp} disabled={templateBezig} style={{ padding: '10px 22px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {templateBezig ? '⏳ Opslaan...' : '💾 Opslaan'}
                  </button>
                  <button onClick={() => setPreview(!preview)} style={{ padding: '10px 22px', background: preview ? '#0E3A5C' : '#E8F0F6', border: 'none', borderRadius: 10, color: preview ? '#fff' : '#0E3A5C', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {preview ? '✏️ Terug' : '👁️ Preview'}
                  </button>
                </div>
              </div>

              {preview && (
                <div style={{ background: '#fff', border: '1.5px solid #0E3A5C', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 16 }}>👁️ Preview</div>
                  <div style={{ background: '#F7F3EE', borderRadius: 10, padding: 20 }}>
                    <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 4 }}>Onderwerp:</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>{vulPreview(template.subject)}</div>
                    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 12px rgba(14,58,92,.08)' }}>
                      <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 18, color: '#0E3A5C', marginBottom: 20 }}>Stagepoort</div>
                      {vulPreview(template.body).split('\n').map((regel, i) =>
                        regel.trim() === '' ? <br key={i} /> :
                        regel.includes('stagepoort.vercel.app') ?
                          <div key={i} style={{ margin: '16px 0' }}><a href="#" style={{ display: 'inline-block', background: '#F26B1D', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Toegang Stagepoort →</a></div> :
                          <p key={i} style={{ fontSize: 14, color: '#1A2633', lineHeight: 1.7, margin: '4px 0' }}>{regel}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, position: 'sticky', top: 24, height: 'fit-content' }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔧 Variabelen</div>
              <p style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 16, lineHeight: 1.5 }}>Klik om toe te voegen aan de tekst.</p>
              {VARIABELEN.map(v => (
                <div key={v.key} onClick={() => setTemplate(p => ({ ...p, body: p.body + v.key }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E4DDD4', marginBottom: 8, cursor: 'pointer', background: '#FAFAF8' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#F26B1D', marginBottom: 2 }}>{v.key}</div>
                  <div style={{ fontSize: 11, color: '#5C6B7A' }}>{v.uitleg}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </CoordinatorLayout>
  )
}
