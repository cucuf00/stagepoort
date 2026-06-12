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
  const [aanpassenModal, setAanpassenModal] = useState(null)
  const [aanpassenForm, setAanpassenForm] = useState({})
  const [csvBezig, setCsvBezig] = useState(false)
  const [plakTekst, setPlakTekst] = useState('')
  const [plakPreview, setPlakPreview] = useState([])
  const [plakBezig, setPlakBezig] = useState(false)
  const csvRef = useRef()

  // Parseer geplakte tekst naar leerlingen — herkent tab, komma, puntkomma
  function parseerPlakTekst(tekst) {
    const regels = tekst.trim().split('\n').filter(r => r.trim())
    if (regels.length === 0) return []

    // Detecteer scheidingsteken
    const eersteRegel = regels[0]
    const scheidingsteken = eersteRegel.includes('\t') ? '\t'
      : eersteRegel.includes(';') ? ';'
      : ','

    // Sla header over als die er is
    const start = regels[0].toLowerCase().includes('naam') ||
                  regels[0].toLowerCase().includes('name') ? 1 : 0

    return regels.slice(start).map(r => {
      const cols = r.split(scheidingsteken).map(c => c.trim().replace(/^"|"$/g, ''))
      // Zoek email kolom automatisch
      const emailIdx = cols.findIndex(c => c.includes('@'))
      const naamIdx = emailIdx === 0 ? 1 : 0
      const klasIdx = cols.findIndex((c, i) => i !== emailIdx && i !== naamIdx && c.length > 0)

      return {
        naam: cols[naamIdx] || '',
        email: emailIdx >= 0 ? cols[emailIdx] : '',
        klas: klasIdx >= 0 ? cols[klasIdx] : '',
      }
    }).filter(l => l.naam && l.email && l.email.includes('@'))
  }



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
  async function verwerkLeerlingen(leerlingen) {
    try {
      const res = await fetch('/api/import-studenten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leerlingen }),
      })
      const data = await res.json()
      console.log('Import response:', data)
      if (data.error) {
        showToast('❌ ' + data.error, false)
      } else {
        showToast(`✅ ${data.aangemaakt} leerlingen toegevoegd${data.overgeslagen > 0 ? `, ${data.overgeslagen} overgeslagen` : ''}`)
        await loadData()
      }
    } catch (err) {
      showToast('❌ ' + err.message, false)
      console.error('Import fetch fout:', err)
    }
  }

  async function handleCSV(e) {
    const supabase = createClient()
    const file = e.target.files[0]
    if (!file) return
    setCsvBezig(true)
    const text = await file.text()
    const regels = text.trim().split('\n').filter(r => r.trim())
    const start = regels[0].toLowerCase().includes('naam') ? 1 : 0
    const leerlingen = regels.slice(start).map(r => {
      const cols = r.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return { naam: cols[0], email: cols[1], klas: cols[2] }
    }).filter(l => l.naam && l.email)

    if (leerlingen.length === 0) {
      showToast('❌ Geen geldige leerlingen gevonden', false)
      setCsvBezig(false)
      return
    }
    await verwerkLeerlingen(leerlingen)
    setCsvBezig(false)
    csvRef.current.value = ''
  }

  async function handlePlakImport() {
    const leerlingen = plakPreview
    if (leerlingen.length === 0) return
    setPlakBezig(true)
    await verwerkLeerlingen(leerlingen)
    setPlakTekst('')
    setPlakPreview([])
    setPlakBezig(false)
  }

  async function stuurInvullink(placementId) {
    setBezig(prev => ({ ...prev, [placementId]: true }))
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('📨 Invullink verstuurd per email!')
        await loadData()
      } else {
        showToast('❌ ' + (data.error || 'Versturen mislukt'), false)
      }
    } catch (err) {
      showToast('❌ ' + err.message, false)
    }
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  async function stuurAlleLinks() {
    const pending = placements.filter(p => p.status === 'pending' || p.status === 'rejected')
    let verstuurd = 0
    for (const p of pending) {
      try {
        const res = await fetch('/api/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placementId: p.id }),
        })
        const data = await res.json()
        if (data.success) verstuurd++
      } catch {}
    }
    showToast(`📨 ${verstuurd} van ${pending.length} invullinks verstuurd!`)
    await loadData()
  }

  async function keurGoed(placementId) {
    setBezig(prev => ({ ...prev, [placementId]: true }))
    try {
      const res = await fetch('/api/send-supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Goedgekeurd! Stagebegeleider ontvangt automatisch een e-mail.')
        await loadData()
        setUitgeklapt(null)
      } else {
        showToast('❌ ' + (data.error || 'Goedkeuren mislukt'), false)
      }
    } catch (err) {
      showToast('❌ ' + err.message, false)
    }
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

  function openAanpassen(placement) {
    setAanpassenForm({
      first_name: placement.first_name || '',
      infix: placement.infix || '',
      last_name: placement.last_name || '',
      student_phone: placement.student_phone || '',
      company_name: placement.company_name || '',
      supervisor_name: placement.supervisor_name || '',
      company_address: placement.company_address || '',
      company_postcode: placement.company_postcode || '',
      company_city: placement.company_city || '',
      company_phone: placement.company_phone || '',
      company_email: placement.company_email || '',
      green_stage: placement.green_stage ? 'ja' : 'nee',
    })
    setAanpassenModal(placement)
  }

  async function slaAanpassing() {
    const supabase = createClient()
    const updates = {
      first_name: aanpassenForm.first_name,
      infix: aanpassenForm.infix || null,
      last_name: aanpassenForm.last_name,
      student_phone: aanpassenForm.student_phone,
      company_name: aanpassenForm.company_name,
      supervisor_name: aanpassenForm.supervisor_name,
      company_address: aanpassenForm.company_address,
      company_postcode: aanpassenForm.company_postcode,
      company_city: aanpassenForm.company_city,
      company_phone: aanpassenForm.company_phone,
      company_email: aanpassenForm.company_email,
      green_stage: aanpassenForm.green_stage === 'ja',
    }
    const { error } = await supabase.from('placements').update(updates).eq('id', aanpassenModal.id)
    if (!error) {
      setPlacements(prev => prev.map(p => p.id === aanpassenModal.id ? { ...p, ...updates } : p))
      setAanpassenModal(null)
      showToast('✅ Wijzigingen opgeslagen!')
    } else showToast('❌ ' + error.message, false)
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
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={e => { e.stopPropagation(); openAanpassen(placement) }}
                style={{ padding: '8px 18px', background: '#0E3A5C', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >✏️ Gegevens aanpassen</button>
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

      {/* Aanpassen modal */}
      {aanpassenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setAanpassenModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ✏️ Gegevens aanpassen
              <button onClick={() => setAanpassenModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#5C6B7A' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 10, marginBottom: 12 }}>
              {[['Voornaam','first_name'],['Tussenvoegsel','infix'],['Achternaam','last_name']].map(([label,key]) => (
                <div key={key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5C6B7A', marginBottom:4 }}>{label}</label>
                  <input value={aanpassenForm[key]||''} onChange={e => setAanpassenForm(p=>({...p,[key]:e.target.value}))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E4DDD4', borderRadius:8, fontFamily:'Inter,sans-serif', fontSize:13, outline:'none' }} />
                </div>
              ))}
            </div>
            {['Telefoonnummer leerling','Bedrijfsnaam','Bezoekadres','Postcode','Plaats','Tel. stagebedrijf','E-mail stagebedrijf','Naam stagebegeleider'].map((label, i) => {
              const keys = ['student_phone','company_name','company_address','company_postcode','company_city','company_phone','company_email','supervisor_name']
              const key = keys[i]
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5C6B7A', marginBottom:4 }}>{label}</label>
                  <input value={aanpassenForm[key]||''} onChange={e => setAanpassenForm(p=>({...p,[key]:e.target.value}))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E4DDD4', borderRadius:8, fontFamily:'Inter,sans-serif', fontSize:13, outline:'none' }} />
                </div>
              )
            })}
            <div style={{ display:'flex', gap:10, marginBottom:20, marginTop:4 }}>
              {['ja','nee'].map(opt => (
                <button key={opt} onClick={() => setAanpassenForm(p=>({...p,green_stage:opt}))} style={{ flex:1, padding:'10px', borderRadius:10, border:'2px solid', borderColor: aanpassenForm.green_stage===opt?(opt==='ja'?'#1A7F52':'#C03020'):'#E4DDD4', background: aanpassenForm.green_stage===opt?(opt==='ja'?'#E2F4EC':'#FAEAE7'):'#fff', color: aanpassenForm.green_stage===opt?(opt==='ja'?'#1A7F52':'#C03020'):'#5C6B7A', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {opt==='ja'?'🌱 Groene stage':'❌ Geen groene stage'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={slaAanpassing} style={{ flex:1, padding:'12px', background:'#F26B1D', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>💾 Wijzigingen opslaan</button>
              <button onClick={() => setAanpassenModal(null)} style={{ padding:'12px 20px', background:'#F0EDE8', border:'none', borderRadius:10, color:'#5C6B7A', fontWeight:600, fontSize:14, cursor:'pointer' }}>Annuleren</button>
            </div>
          </div>
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

        {/* Import sectie */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📥 Leerlingen importeren
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['plakken', 'csv'].map(tab => (
              <button
                key={tab}
                onClick={() => { setPlakTekst(''); setPlakPreview([]) }}
                style={{
                  padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1.5px solid',
                  background: tab === 'plakken' ? '#0E3A5C' : '#fff',
                  borderColor: tab === 'plakken' ? '#0E3A5C' : '#E4DDD4',
                  color: tab === 'plakken' ? '#fff' : '#5C6B7A',
                  cursor: 'pointer',
                }}
              >
                {tab === 'plakken' ? '📋 Kopiëren & plakken' : '📂 CSV uploaden'}
              </button>
            ))}
          </div>

          {/* Plak tekstvak */}
          <div>
            <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 10, lineHeight: 1.6 }}>
              Kopieer leerlingen uit Excel of een lijst en plak ze hier. Het systeem herkent automatisch naam, e-mail en klas — ongeacht de volgorde of het scheidingsteken (tab, komma, puntkomma).
            </p>
            <textarea
              value={plakTekst}
              onChange={e => {
                setPlakTekst(e.target.value)
                setPlakPreview(parseerPlakTekst(e.target.value))
              }}
              placeholder={'Yusuf Demir\ty.demir@student.nl\tSD4B\nLisa de Boer\tl.boer@student.nl\tSD4A\n...'}
              style={{
                width: '100%', minHeight: 120, padding: '10px 12px',
                border: '1.5px solid #E4DDD4', borderRadius: 10,
                fontFamily: 'monospace', fontSize: 12, color: '#1A2633',
                resize: 'vertical', outline: 'none', lineHeight: 1.6,
              }}
            />

            {/* Preview */}
            {plakPreview.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', marginBottom: 8 }}>
                  Gevonden: {plakPreview.length} leerling{plakPreview.length > 1 ? 'en' : ''}
                </div>
                <div style={{ background: '#F7F3EE', borderRadius: 8, overflow: 'hidden', border: '1px solid #E4DDD4', maxHeight: 200, overflowY: 'auto' }}>
                  {plakPreview.map((l, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 12, padding: '8px 12px', borderBottom: i < plakPreview.length - 1 ? '1px solid #E4DDD4' : 'none', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{l.naam}</div>
                      <div style={{ color: '#5C6B7A' }}>{l.email}</div>
                      <div><Badge kleur="blauw">{l.klas || '—'}</Badge></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={handlePlakImport}
                    disabled={plakBezig}
                    style={{ padding: '9px 20px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: plakBezig ? .6 : 1 }}
                  >
                    {plakBezig ? '⏳ Importeren...' : `✅ Importeer ${plakPreview.length} leerling${plakPreview.length > 1 ? 'en' : ''}`}
                  </button>
                  <button
                    onClick={() => { setPlakTekst(''); setPlakPreview([]) }}
                    style={{ padding: '9px 16px', background: '#F0EDE8', border: 'none', borderRadius: 10, color: '#5C6B7A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Wissen
                  </button>
                </div>
              </div>
            )}

            {/* CSV upload optie */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E4DDD4', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#5C6B7A' }}>Of upload een .csv bestand:</span>
              <input ref={csvRef} type="file" accept=".csv" onChange={handleCSV} disabled={csvBezig} style={{ display: 'none' }} id="csvInput" />
              <label htmlFor="csvInput" style={{ padding: '6px 14px', background: '#E8F0F6', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: csvBezig ? 'not-allowed' : 'pointer', opacity: csvBezig ? .6 : 1 }}>
                {csvBezig ? '⏳ Bezig...' : '📂 CSV uploaden'}
              </label>
            </div>
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
