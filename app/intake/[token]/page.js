'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STAPPEN = ['Jouw gegevens', 'Stagebedrijf', 'Begeleider', 'Controleren']

function Voortgangsbalk({ stap }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STAPPEN.map((naam, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STAPPEN.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
              background: i < stap ? '#1A7F52' : i === stap ? '#F26B1D' : '#E4DDD4',
              color: i <= stap ? '#fff' : '#5C6B7A',
            }}>
              {i < stap ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: i === stap ? '#F26B1D' : i < stap ? '#1A7F52' : '#5C6B7A', whiteSpace: 'nowrap' }}>
              {naam}
            </div>
          </div>
          {i < STAPPEN.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < stap ? '#1A7F52' : '#E4DDD4', margin: '0 8px', marginBottom: 20 }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Veld({ label, verplicht, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>
        {label} {verplicht && <span style={{ color: '#C03020' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E4DDD4',
  borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 14,
  color: '#1A2633', outline: 'none', background: '#fff',
}

export default function IntakePage() {
  const { token } = useParams()
  const [placement, setPlacement] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fout, setFout] = useState(null)
  const [stap, setStap] = useState(0)
  const [verzonden, setVerzonden] = useState(false)
  const [bezig, setBezig] = useState(false)

  const [form, setForm] = useState({
    voornaam: '', tussenvoegsel: '', achternaam: '', klas: '',
    telefoon_leerling: '',
    bedrijfsnaam: '', bezoekadres: '', postcode: '', plaats: '',
    telefoon_bedrijf: '', email_bedrijf: '',
    stagebegeleider: '',
    groene_stage: '',
  })

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: p, error } = await supabase
        .from('placements')
        .select('*, profiles!placements_student_id_fkey(name, email, klas)')
        .eq('id', token)
        .maybeSingle()

      if (error || !p) { setFout('Deze link is ongeldig of verlopen.'); setLoading(false); return }
      if (!['pending', 'invited', 'rejected'].includes(p.status)) {
        setFout(p.status === 'review' ? 'Je hebt je gegevens al ingediend. De coördinator beoordeelt ze nu.' :
                p.status === 'active' ? 'Je stageplek is al goedgekeurd.' : 'Deze link is niet meer geldig.')
        setLoading(false); return
      }

      setPlacement(p)
      setStudent(p.profiles)

      // Vul al ingevulde gegevens in (bij rejected)
      if (p.first_name) {
        setForm({
          voornaam: p.first_name || '',
          tussenvoegsel: p.infix || '',
          achternaam: p.last_name || '',
          klas: p.profiles?.klas || '',
          telefoon_leerling: p.student_phone || '',
          bedrijfsnaam: p.company_name || '',
          bezoekadres: p.company_address || '',
          postcode: p.company_postcode || '',
          plaats: p.company_city || '',
          telefoon_bedrijf: p.company_phone || '',
          email_bedrijf: p.company_email || '',
          stagebegeleider: p.supervisor_name || '',
          groene_stage: p.green_stage === true ? 'ja' : p.green_stage === false ? 'nee' : '',
        })
      } else if (p.profiles?.name) {
        // Vul naam automatisch in vanuit profiel
        const delen = p.profiles.name.split(' ')
        setForm(prev => ({
          ...prev,
          voornaam: delen[0] || '',
          achternaam: delen[delen.length - 1] || '',
          klas: p.profiles?.klas || '',
        }))
      }

      setLoading(false)
    }
    load()
  }, [token])

  function setF(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function stapGeldig() {
    if (stap === 0) return form.voornaam && form.achternaam && form.klas && form.telefoon_leerling
    if (stap === 1) return form.bedrijfsnaam && form.bezoekadres && form.postcode && form.plaats && form.telefoon_bedrijf && form.email_bedrijf
    if (stap === 2) return form.stagebegeleider && form.groene_stage
    return true
  }

  async function verzend() {
    setBezig(true)
    const supabase = createClient()
    const { error } = await supabase.from('placements').update({
      status: 'review',
      submitted_at: new Date().toISOString(),
      first_name: form.voornaam,
      infix: form.tussenvoegsel || null,
      last_name: form.achternaam,
      student_phone: form.telefoon_leerling,
      company_name: form.bedrijfsnaam,
      company_address: form.bezoekadres,
      company_postcode: form.postcode,
      company_city: form.plaats,
      company_phone: form.telefoon_bedrijf,
      company_email: form.email_bedrijf,
      supervisor_name: form.stagebegeleider,
      green_stage: form.groene_stage === 'ja',
    }).eq('id', token)

    if (!error) {
      setVerzonden(true)
    } else {
      alert('Er ging iets mis: ' + error.message)
    }
    setBezig(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (fout) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(14,58,92,.08)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1A2633' }}>Link niet beschikbaar</h2>
        <p style={{ color: '#5C6B7A', fontSize: 14, lineHeight: 1.6 }}>{fout}</p>
      </div>
    </div>
  )

  if (verzonden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(14,58,92,.08)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1A2633' }}>Ingediend!</h2>
        <p style={{ color: '#5C6B7A', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Je stagegegevens zijn ontvangen. Je stagecoördinator vergelijkt ze met de papieren stageovereenkomst en keurt goed.
          Je hoeft verder niets te doen — je ontvangt bericht zodra alles is goedgekeurd.
        </p>
        <div style={{ background: '#E2F4EC', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1A7F52', fontWeight: 600 }}>
          📋 Ingediend voor: {form.bedrijfsnaam}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#F7F3EE;font-family:'Inter',sans-serif;color:#1A2633}
        input:focus,select:focus,textarea:focus{border-color:#F26B1D!important;outline:none}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F7F3EE', padding: '32px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ background: '#0E3A5C', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M11 14 L13 17 L15 14" stroke="#F26B1D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="13" cy="10" r="2" fill="#F26B1D"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: '#0E3A5C' }}>Stagepoort</div>
              <div style={{ fontSize: 12, color: '#5C6B7A' }}>Stageplek invullen</div>
            </div>
          </div>

          {/* Afwijzing bericht */}
          {placement?.status === 'rejected' && placement?.rejection_reason && (
            <div style={{ background: '#FAEAE7', border: '1px solid #C03020', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#C03020', fontSize: 14, marginBottom: 4 }}>⚠️ Je gegevens zijn teruggestuurd</div>
              <div style={{ fontSize: 13, color: '#1A2633', lineHeight: 1.6 }}>{placement.rejection_reason}</div>
            </div>
          )}

          {/* Kaart */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(14,58,92,.08)' }}>
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              {stap < STAPPEN.length ? STAPPEN[stap] : 'Controleren'}
            </h1>
            <p style={{ color: '#5C6B7A', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
              {stap === 0 && 'Vul jouw persoonlijke gegevens in.'}
              {stap === 1 && 'Vul de gegevens in van het bedrijf waar je stage loopt.'}
              {stap === 2 && 'Vul de gegevens in van je stagebegeleider bij het bedrijf.'}
              {stap === 3 && 'Controleer je gegevens voordat je instuurt.'}
            </p>

            <Voortgangsbalk stap={stap} />

            {/* STAP 0: Jouw gegevens */}
            {stap === 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12 }}>
                  <Veld label="Voornaam" verplicht>
                    <input style={inputStyle} value={form.voornaam} onChange={e => setF('voornaam', e.target.value)} placeholder="Yusuf" />
                  </Veld>
                  <Veld label="Tussenvoegsel">
                    <input style={inputStyle} value={form.tussenvoegsel} onChange={e => setF('tussenvoegsel', e.target.value)} placeholder="van" />
                  </Veld>
                  <Veld label="Achternaam" verplicht>
                    <input style={inputStyle} value={form.achternaam} onChange={e => setF('achternaam', e.target.value)} placeholder="Demir" />
                  </Veld>
                </div>
                <Veld label="Klas" verplicht>
                  <input style={inputStyle} value={form.klas} onChange={e => setF('klas', e.target.value)} placeholder="bijv. SD4B" />
                </Veld>
                <Veld label="Telefoonnummer leerling" verplicht>
                  <input style={inputStyle} type="tel" value={form.telefoon_leerling} onChange={e => setF('telefoon_leerling', e.target.value)} placeholder="06 12 34 56 78" />
                </Veld>
              </div>
            )}

            {/* STAP 1: Stagebedrijf */}
            {stap === 1 && (
              <div>
                <Veld label="Bedrijfsnaam" verplicht>
                  <input style={inputStyle} value={form.bedrijfsnaam} onChange={e => setF('bedrijfsnaam', e.target.value)} placeholder="TechWerk B.V." />
                </Veld>
                <Veld label="Bezoekadres" verplicht>
                  <input style={inputStyle} value={form.bezoekadres} onChange={e => setF('bezoekadres', e.target.value)} placeholder="Schiekade 34" />
                </Veld>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <Veld label="Postcode" verplicht>
                    <input style={inputStyle} value={form.postcode} onChange={e => setF('postcode', e.target.value)} placeholder="3013 BB" />
                  </Veld>
                  <Veld label="Plaats" verplicht>
                    <input style={inputStyle} value={form.plaats} onChange={e => setF('plaats', e.target.value)} placeholder="Rotterdam" />
                  </Veld>
                </div>
                <Veld label="Telefoonnummer stagebedrijf" verplicht>
                  <input style={inputStyle} type="tel" value={form.telefoon_bedrijf} onChange={e => setF('telefoon_bedrijf', e.target.value)} placeholder="010 123 45 67" />
                </Veld>
                <Veld label="E-mail stagebedrijf" verplicht>
                  <input style={inputStyle} type="email" value={form.email_bedrijf} onChange={e => setF('email_bedrijf', e.target.value)} placeholder="info@techwerk.nl" />
                </Veld>
              </div>
            )}

            {/* STAP 2: Begeleider */}
            {stap === 2 && (
              <div>
                <Veld label="Naam stagebegeleider" verplicht>
                  <input style={inputStyle} value={form.stagebegeleider} onChange={e => setF('stagebegeleider', e.target.value)} placeholder="R. Jansen" />
                </Veld>
                <Veld label="Is dit een groene stage?" verplicht>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    {['ja', 'nee'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setF('groene_stage', opt)}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          border: '2px solid',
                          borderColor: form.groene_stage === opt ? (opt === 'ja' ? '#1A7F52' : '#C03020') : '#E4DDD4',
                          background: form.groene_stage === opt ? (opt === 'ja' ? '#E2F4EC' : '#FAEAE7') : '#fff',
                          color: form.groene_stage === opt ? (opt === 'ja' ? '#1A7F52' : '#C03020') : '#5C6B7A',
                        }}
                      >
                        {opt === 'ja' ? '🌱 Ja, groene stage' : '❌ Nee'}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#5C6B7A', marginTop: 8, lineHeight: 1.5 }}>
                    Een groene stage is een stage bij een organisatie die actief bijdraagt aan duurzaamheid of milieu.
                  </p>
                </Veld>
              </div>
            )}

            {/* STAP 3: Controleren */}
            {stap === 3 && (
              <div>
                {[
                  { titel: '🎒 Jouw gegevens', items: [
                    ['Naam', [form.voornaam, form.tussenvoegsel, form.achternaam].filter(Boolean).join(' ')],
                    ['Klas', form.klas],
                    ['Telefoonnummer', form.telefoon_leerling],
                  ]},
                  { titel: '🏢 Stagebedrijf', items: [
                    ['Bedrijfsnaam', form.bedrijfsnaam],
                    ['Adres', `${form.bezoekadres}, ${form.postcode} ${form.plaats}`],
                    ['Telefoon', form.telefoon_bedrijf],
                    ['E-mail', form.email_bedrijf],
                  ]},
                  { titel: '👤 Stagebegeleider', items: [
                    ['Naam', form.stagebegeleider],
                    ['Groene stage', form.groene_stage === 'ja' ? '🌱 Ja' : '❌ Nee'],
                  ]},
                ].map(sectie => (
                  <div key={sectie.titel} style={{ marginBottom: 16, background: '#F7F3EE', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{sectie.titel}</div>
                    {sectie.items.map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, color: '#5C6B7A', minWidth: 120 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Navigatie knoppen */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {stap > 0 && (
                <button
                  onClick={() => setStap(s => s - 1)}
                  style={{ padding: '12px 20px', background: '#F0EDE8', border: 'none', borderRadius: 10, color: '#5C6B7A', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  ← Vorige
                </button>
              )}
              {stap < 3 ? (
                <button
                  onClick={() => { if (stapGeldig()) setStap(s => s + 1) }}
                  disabled={!stapGeldig()}
                  style={{ flex: 1, padding: '12px 20px', background: stapGeldig() ? '#F26B1D' : '#E4DDD4', border: 'none', borderRadius: 10, color: stapGeldig() ? '#fff' : '#9AA8B2', fontWeight: 700, fontSize: 14, cursor: stapGeldig() ? 'pointer' : 'not-allowed' }}
                >
                  Volgende →
                </button>
              ) : (
                <button
                  onClick={verzend}
                  disabled={bezig}
                  style={{ flex: 1, padding: '12px 20px', background: '#1A7F52', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? .7 : 1 }}
                >
                  {bezig ? '⏳ Versturen...' : '✅ Indienen bij coördinator'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
