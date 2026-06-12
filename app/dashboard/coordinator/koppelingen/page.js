'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function Badge({ children, kleur }) {
  const kleuren = {
    rood:   { bg: '#FAEAE7', color: '#C03020' },
    geel:   { bg: '#FBF0D8', color: '#A87010' },
    oranje: { bg: '#FDEADD', color: '#D4500E' },
    groen:  { bg: '#E2F4EC', color: '#1A7F52' },
    blauw:  { bg: '#E8F0F6', color: '#0E3A5C' },
  }
  const k = kleuren[kleur] || kleuren.blauw
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: k.bg, color: k.color }}>
      {children}
    </span>
  )
}

function Sectie({ emoji, titel, count, borderColor, bgColor, children, uitleg }) {
  return (
    <div style={{ background: bgColor || '#fff', border: `1px solid ${borderColor}`, borderRadius: 12, padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, color: '#1A2633', display: 'flex', alignItems: 'center', gap: 8 }}>
          {emoji} {titel}
          <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: borderColor + '30', color: borderColor }}>
            {count}
          </span>
        </h3>
      </div>
      {uitleg && <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 14, lineHeight: 1.6 }}>{uitleg}</p>}
      {children}
    </div>
  )
}

function LegeStaat({ tekst }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 20px', color: '#5C6B7A', fontSize: 13, background: '#fff', borderRadius: 10, border: '1px dashed #E4DDD4' }}>
      {tekst}
    </div>
  )
}

export default function KoppelingenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [studenten, setStudenten] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [bezig, setBezig] = useState({})
  const [uitgeklapt, setUitgeklapt] = useState(null)
  const [afwijsReden, setAfwijsReden] = useState({})
  const [showAfwijs, setShowAfwijs] = useState(null)
  const [csvBezig, setCsvBezig] = useState(false)
  const csvRef = useRef()



  const loadData = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const { data: prof } = await supabase
      .from('profiles').select('id,name,role,school_id')
      .eq('user_id', session.user.id).limit(1).maybeSingle()

    if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
    setProfile(prof)

    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id,name,email,klas').eq('school_id', prof.school_id).eq('role', 'student').order('name'),
      supabase.from('placements').select('*').eq('school_id', prof.school_id).not('status', 'in', '("completed","cancelled")').order('created_at', { ascending: false }),
    ])

    setStudenten(s ?? [])
    setPlacements(p ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // CSV Import
  async function handleCSV(e) {
    const supabase = createClient()
    const file = e.target.files[0]
    if (!file) return
    setCsvBezig(true)

    const text = await file.text()
    const regels = text.trim().split('\n').filter(r => r.trim())

    // Sla eerste rij over als het een header is
    const start = regels[0].toLowerCase().includes('naam') ? 1 : 0
    const leerlingen = regels.slice(start).map(r => {
      const cols = r.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return { naam: cols[0], email: cols[1], klas: cols[2] }
    }).filter(l => l.naam && l.email)

    if (leerlingen.length === 0) {
      showToast('❌ Geen geldige leerlingen gevonden in CSV', false)
      setCsvBezig(false)
      return
    }

    let aangemaakt = 0
    let overgeslagen = 0

    for (const ll of leerlingen) {
      // Check of student al bestaat
      const { data: bestaand } = await supabase
        .from('profiles').select('id')
        .eq('school_id', profile.school_id)
        .eq('email', ll.email)
        .maybeSingle()

      let studentId = bestaand?.id

      if (!studentId) {
        // Maak tijdelijk profiel aan zonder echte auth user
        // Wordt gekoppeld zodra student voor het eerst inlogt
        const tempUserId = crypto.randomUUID()
        const { data: nieuwProfiel } = await supabase
          .from('profiles').insert({
            user_id: tempUserId,
            school_id: profile.school_id,
            name: ll.naam,
            role: 'student',
            klas: ll.klas || null,
          }).select('id').single()
        studentId = nieuwProfiel?.id
      } else {
        // Update klas als die er is
        if (ll.klas) {
          await supabase.from('profiles').update({ klas: ll.klas, name: ll.naam }).eq('id', bestaand.id)
        }
      }

      if (!studentId) { overgeslagen++; continue }

      // Check of er al een actieve placement is
      const { data: bestaandePlacement } = await supabase
        .from('placements').select('id')
        .eq('student_id', studentId)
        .not('status', 'in', '("completed","cancelled")')
        .maybeSingle()

      if (bestaandePlacement) { overgeslagen++; continue }

      // Maak placement aan met status pending
      const { error } = await supabase.from('placements').insert({
        school_id: profile.school_id,
        student_id: studentId,
        coordinator_id: profile.id,
        status: 'pending',
      })

      if (!error) aangemaakt++
      else overgeslagen++
    }

    await loadData()
    showToast(`✅ ${aangemaakt} leerlingen toegevoegd${overgeslagen > 0 ? `, ${overgeslagen} overgeslagen` : ''}`)
    setCsvBezig(false)
    csvRef.current.value = ''
  }

  async function stuurInvullink(placementId, studentId) {
    const supabase = createClient()
    setBezig(prev => ({ ...prev, [placementId]: true }))
    const { error } = await supabase.from('placements').update({
      status: 'invited',
      invited_at: new Date().toISOString(),
    }).eq('id', placementId)

    if (!error) {
      showToast('📨 Invullink verstuurd!')
      await loadData()
    } else showToast('❌ ' + error.message, false)
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  async function stuurAlleLinks() {
    const supabase = createClient()
    const pending = placements.filter(p => p.status === 'pending' || p.status === 'rejected')
    for (const p of pending) {
      await supabase.from('placements').update({
        status: 'invited',
        invited_at: new Date().toISOString(),
      }).eq('id', p.id)
    }
    showToast(`📨 ${pending.length} invullinks verstuurd!`)
    await loadData()
  }

  async function keurGoed(placementId) {
    const supabase = createClient()
    setBezig(prev => ({ ...prev, [placementId]: true }))
    const { error } = await supabase.from('placements').update({
      status: 'active',
      approved_at: new Date().toISOString(),
    }).eq('id', placementId)

    if (!error) {
      showToast('✅ Koppeling goedgekeurd! Begeleider krijgt automatisch een e-mail.')
      await loadData()
      setUitgeklapt(null)
    } else showToast('❌ ' + error.message, false)
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  async function keurAf(placementId) {
    const supabase = createClient()
    const reden = afwijsReden[placementId]
    if (!reden?.trim()) { showToast('❌ Vul een reden in', false); return }
    setBezig(prev => ({ ...prev, [placementId]: true }))

    const { error } = await supabase.from('placements').update({
      status: 'rejected',
      rejection_reason: reden,
    }).eq('id', placementId)

    if (!error) {
      showToast('↩️ Koppeling afgewezen — student kan opnieuw invullen')
      setShowAfwijs(null)
      await loadData()
    } else showToast('❌ ' + error.message, false)
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pending   = placements.filter(p => p.status === 'pending' || p.status === 'rejected')
  const invited   = placements.filter(p => p.status === 'invited')
  const review    = placements.filter(p => p.status === 'review')
  const actief    = placements.filter(p => p.status === 'active' || p.status === 'halfway')

  const getStudent = (studentId) => studenten.find(s => s.id === studentId)

  const StudentRij = ({ placement, rechts }) => {
    const student = getStudent(placement.student_id)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #E4DDD4', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
            {getInitialen(student?.name || placement.first_name)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {student?.name || `${placement.first_name || ''} ${placement.last_name || ''}`.trim() || 'Onbekend'}
              {placement.status === 'rejected' && <Badge kleur="rood" style={{marginLeft: 8}}>Afgekeurd</Badge>}
            </div>
            <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 2 }}>
              {student?.email || '—'} · {student?.klas || placement.klas || 'Klas bekend na intake'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {rechts}
        </div>
      </div>
    )
  }

  const DetailKaart = ({ placement }) => {
    const student = getStudent(placement.student_id)
    const isOpen = uitgeklapt === placement.id
    return (
      <div style={{ border: '1px solid #C5E3D6', borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
          onClick={() => setUitgeklapt(isOpen ? null : placement.id)}
        >
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
            {getInitialen(placement.first_name || student?.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {[placement.first_name, placement.infix, placement.last_name].filter(Boolean).join(' ') || student?.name}
              <span style={{ fontWeight: 400, fontSize: 12, color: '#5C6B7A', marginLeft: 8 }}>{student?.klas}</span>
            </div>
            <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 2 }}>
              {placement.company_name || '—'} · {placement.supervisor_name || 'Begeleider onbekend'}
            </div>
          </div>
          {placement.status === 'review' && (
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => keurGoed(placement.id)}
                disabled={bezig[placement.id]}
                style={{ padding: '6px 14px', background: '#1A7F52', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >✅ Goedkeuren</button>
              <button
                onClick={() => setShowAfwijs(placement.id)}
                style={{ padding: '6px 14px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >❌ Afwijzen</button>
            </div>
          )}
          {placement.status === 'active' && (
            <Badge kleur="groen">Student ✓</Badge>
          )}
          <span style={{ color: '#5C6B7A', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
        </div>

        {/* Afwijs formulier */}
        {showAfwijs === placement.id && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #E4DDD4', background: '#FAFAF8' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', display: 'block', marginBottom: 6 }}>Reden voor afwijzing (zichtbaar voor student)</label>
              <textarea
                value={afwijsReden[placement.id] || ''}
                onChange={e => setAfwijsReden(prev => ({ ...prev, [placement.id]: e.target.value }))}
                placeholder="Bijv: Bedrijfsgegevens kloppen niet met de overeenkomst..."
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, resize: 'vertical', minHeight: 80, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => keurAf(placement.id)} disabled={bezig[placement.id]} style={{ padding: '8px 16px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Afwijzen & terugsturen
                </button>
                <button onClick={() => setShowAfwijs(null)} style={{ padding: '8px 16px', background: '#F0EDE8', border: 'none', borderRadius: 8, color: '#5C6B7A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail uitklap */}
        {isOpen && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #E4DDD4' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              {/* Student kolom */}
              <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 10 }}>🎒 Student</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {[placement.first_name, placement.infix, placement.last_name].filter(Boolean).join(' ') || student?.name}
                </div>
                <div style={{ fontSize: 12, color: '#5C6B7A' }}>{student?.klas || '—'}</div>
                {placement.student_phone && <div style={{ fontSize: 12, marginTop: 6 }}>📞 <a href={`tel:${placement.student_phone}`} style={{ color: '#0E3A5C' }}>{placement.student_phone}</a></div>}
                <div style={{ fontSize: 12, marginTop: 4 }}>📧 <a href={`mailto:${student?.email}`} style={{ color: '#0E3A5C' }}>{student?.email}</a></div>
                {placement.green_stage && <div style={{ marginTop: 8 }}><Badge kleur="groen">🌱 Groene stage</Badge></div>}
              </div>

              {/* Bedrijf kolom */}
              <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 10 }}>🏢 Stagebedrijf & begeleider</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{placement.company_name || '—'}</div>
                {placement.company_address && <div style={{ fontSize: 12, color: '#5C6B7A' }}>📍 {placement.company_address}, {placement.company_postcode} {placement.company_city}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 2 }}>{placement.supervisor_name || '—'}</div>
                {placement.company_email && <div style={{ fontSize: 12 }}>📧 <a href={`mailto:${placement.company_email}`} style={{ color: '#0E3A5C' }}>{placement.company_email}</a></div>}
                {placement.company_phone && <div style={{ fontSize: 12, marginTop: 2 }}>📞 <a href={`tel:${placement.company_phone}`} style={{ color: '#0E3A5C' }}>{placement.company_phone}</a></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Koppelingen</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Uitleg */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Hoe werkt de koppeling?</div>
          <p style={{ fontSize: 13, color: '#5C6B7A', lineHeight: 1.7 }}>
            Jij stuurt de leerling een invullink. De leerling vult zélf zijn stageplek in (bedrijf, begeleider, contactgegevens). 
            Jij vergelijkt dit met de papieren stageovereenkomst en keurt goed. Pas daarna krijgt de stagebegeleider automatisch een e-mail met zijn toegangslink.
          </p>
        </div>

        {/* CSV Import */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            📥 Leerlingen importeren via CSV
          </div>
          <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 14, lineHeight: 1.6 }}>
            Upload een CSV-bestand met kolommen: <code style={{ background: '#F0EDE8', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>naam, email, klas</code>. 
            Leerlingen verschijnen automatisch in "Link nog versturen".
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              onChange={handleCSV}
              disabled={csvBezig}
              style={{ display: 'none' }}
              id="csvInput"
            />
            <label
              htmlFor="csvInput"
              style={{ padding: '9px 18px', background: '#0E3A5C', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 13, cursor: csvBezig ? 'not-allowed' : 'pointer', opacity: csvBezig ? .6 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {csvBezig ? '⏳ Bezig...' : '📂 CSV uploaden'}
            </label>
            <span style={{ fontSize: 12, color: '#5C6B7A' }}>Ondersteunde formaten: .csv (UTF-8)</span>
          </div>
        </div>

        {/* SECTIE 1: ROOD — Link nog versturen */}
        <Sectie
          emoji="🔴"
          titel="Link nog versturen"
          count={pending.length}
          borderColor="#C03020"
          bgColor="#FEF7F6"
          uitleg="Deze leerlingen staan in het systeem maar hebben nog geen invullink ontvangen. Stuur ze een link zodat ze hun stageplek zelf kunnen invullen."
        >
          {pending.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={stuurAlleLinks}
                style={{ padding: '8px 16px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                📨 Stuur naar alle {pending.length}
              </button>
            </div>
          )}
          {pending.length === 0
            ? <LegeStaat tekst="✓ Alle leerlingen hebben een invullink ontvangen" />
            : pending.map(p => (
              <StudentRij key={p.id} placement={p} rechts={
                <>
                  {p.status === 'rejected' && (
                    <Badge kleur="rood">Afgekeurd</Badge>
                  )}
                  <button
                    onClick={() => stuurInvullink(p.id, p.student_id)}
                    disabled={bezig[p.id]}
                    style={{ padding: '7px 14px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: bezig[p.id] ? .6 : 1 }}
                  >
                    {bezig[p.id] ? 'Bezig...' : '📨 Stuur invullink'}
                  </button>
                </>
              } />
            ))
          }
        </Sectie>

        {/* SECTIE 2: GEEL — Wacht op leerling */}
        <Sectie
          emoji="🟡"
          titel="Wacht op leerling"
          count={invited.length}
          borderColor="#A87010"
          bgColor="#FDFBF1"
          uitleg="De invullink is verstuurd. Zodra de leerling zijn stageplek invult, verschijnt hij bij 'Ter beoordeling'."
        >
          {invited.length === 0
            ? <LegeStaat tekst="Geen leerlingen in afwachting van intake" />
            : invited.map(p => (
              <StudentRij key={p.id} placement={p} rechts={
                <Badge kleur="geel">Link verstuurd</Badge>
              } />
            ))
          }
        </Sectie>

        {/* SECTIE 3: ORANJE — Ter beoordeling */}
        <Sectie
          emoji="🟠"
          titel="Ter beoordeling"
          count={review.length}
          borderColor="#D4500E"
          bgColor="#FFF8F4"
          uitleg="De leerling heeft zijn stageplek ingevuld. Vergelijk de gegevens met de papieren stageovereenkomst en keur goed of wijs af."
        >
          {review.length === 0
            ? <LegeStaat tekst="Geen koppelingen ter beoordeling" />
            : review.map(p => <DetailKaart key={p.id} placement={p} />)
          }
        </Sectie>

        {/* SECTIE 4: GROEN — Actieve koppelingen */}
        <Sectie
          emoji="🟢"
          titel="Actieve koppelingen"
          count={actief.length}
          borderColor="#1A7F52"
          bgColor="#F4FBF8"
          uitleg="Koppeling goedgekeurd. Klik op een leerling om alle contactgegevens te zien."
        >
          {actief.length === 0
            ? <LegeStaat tekst="Nog geen actieve stages" />
            : actief.map(p => <DetailKaart key={p.id} placement={p} />)
          }
        </Sectie>

      </div>
    </CoordinatorLayout>
  )
}
