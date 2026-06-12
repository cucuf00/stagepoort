'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function Badge({ label, kleur }) {
  const kleuren = {
    rood:   { bg: '#FAEAE7', color: '#C03020' },
    geel:   { bg: '#FBF0D8', color: '#A87010' },
    oranje: { bg: '#FDEADD', color: '#F26B1D' },
    groen:  { bg: '#E2F4EC', color: '#1A7F52' },
    blauw:  { bg: '#E8F0F6', color: '#0E3A5C' },
  }
  const k = kleuren[kleur] || kleuren.blauw
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: k.bg, color: k.color }}>
      {label}
    </span>
  )
}

function Sectie({ emoji, titel, kleur, count, children, uitleg }) {
  const kleuren = {
    rood:   { border: '#EABAB3', bg: '#FEF7F6', title: '#C03020' },
    geel:   { border: '#E8D090', bg: '#FDFBF1', title: '#A87010' },
    oranje: { border: '#F2C09A', bg: '#FFF8F3', title: '#F26B1D' },
    groen:  { border: '#9ACFB8', bg: '#F4FBF8', title: '#1A7F52' },
  }
  const k = kleuren[kleur] || kleuren.blauw
  return (
    <div style={{ border: `1px solid ${k.border}`, background: k.bg, borderRadius: 12, padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, color: k.title, display: 'flex', alignItems: 'center', gap: 8 }}>
          {emoji} {titel}
          <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'rgba(0,0,0,.08)', color: k.title }}>{count}</span>
        </div>
      </div>
      {uitleg && <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 14 }}>{uitleg}</p>}
      {children}
    </div>
  )
}

// Aanpassen overlay
function AanpassenOverlay({ placement, studenten, onClose, onSave }) {
  const student = studenten.find(s => s.id === placement.student_id)
  const [form, setForm] = useState({
    student_firstname:  placement.student_firstname || '',
    student_infix:      placement.student_infix || '',
    student_lastname:   placement.student_lastname || '',
    student_phone:      placement.student_phone || '',
    company_name:       placement.company_name || '',
    company_supervisor: placement.company_supervisor || '',
    company_address:    placement.company_address || '',
    company_postcode:   placement.company_postcode || '',
    company_city:       placement.company_city || '',
    company_phone:      placement.company_phone || '',
    company_email:      placement.company_email || '',
    company_green:      placement.company_green || false,
  })

  const F = ({ label, field, type = 'text', half = false, required = false }) => (
    <div style={{ marginBottom: 12, gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>
        {label}{required ? ' *' : ''}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: type === 'checkbox' ? e.target.checked : e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>✏️ Koppeling aanpassen</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#5C6B7A' }}>✕</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>🎒 Leerling</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <F label="Voornaam" field="student_firstname" required />
          <F label="Tussenvoegsel" field="student_infix" half />
          <F label="Achternaam" field="student_lastname" required />
          <F label="Telefoonnummer leerling" field="student_phone" type="tel" required />
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>🏢 Stagebedrijf</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ gridColumn: 'span 2', marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Bedrijfsnaam *</label>
            <input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ gridColumn: 'span 2', marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Stagebegeleider *</label>
            <input value={form.company_supervisor} onChange={e => setForm(p => ({ ...p, company_supervisor: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ gridColumn: 'span 2', marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Bezoekadres *</label>
            <input value={form.company_address} onChange={e => setForm(p => ({ ...p, company_address: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Postcode *</label>
            <input value={form.company_postcode} onChange={e => setForm(p => ({ ...p, company_postcode: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Plaats *</label>
            <input value={form.company_city} onChange={e => setForm(p => ({ ...p, company_city: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>Tel. stagebedrijf *</label>
            <input value={form.company_phone} onChange={e => setForm(p => ({ ...p, company_phone: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 4 }}>E-mail stagebedrijf *</label>
            <input type="email" value={form.company_email} onChange={e => setForm(p => ({ ...p, company_email: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="green" checked={form.company_green} onChange={e => setForm(p => ({ ...p, company_green: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#1A7F52' }} />
            <label htmlFor="green" style={{ fontSize: 14, fontWeight: 500, color: '#1A2633', cursor: 'pointer' }}>🌱 Groene stage</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F0EDE8', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Annuleren</button>
          <button onClick={() => onSave(form)} style={{ padding: '10px 20px', background: '#F26B1D', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Opslaan</button>
        </div>
      </div>
    </div>
  )
}

// Afwijzen overlay
function AfwijzenOverlay({ onClose, onConfirm }) {
  const [reden, setReden] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>❌ Stage afwijzen</div>
        <p style={{ fontSize: 14, color: '#5C6B7A', marginBottom: 16 }}>Geef aan waarom de stage wordt afgewezen. De leerling kan daarna opnieuw een stageplek invullen.</p>
        <textarea
          value={reden}
          onChange={e => setReden(e.target.value)}
          placeholder="Bijv: Gegevens komen niet overeen met de stageovereenkomst..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F0EDE8', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Annuleren</button>
          <button onClick={() => onConfirm(reden)} disabled={!reden.trim()} style={{ padding: '10px 20px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: reden.trim() ? 1 : .5 }}>Afwijzen</button>
        </div>
      </div>
    </div>
  )
}

// Detail kaart voor review / actieve koppeling
function DetailKaart({ p, student }) {
  const naam = [p.student_firstname, p.student_infix, p.student_lastname].filter(Boolean).join(' ') || student?.name || '—'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, padding: '0 16px 16px' }}>
      <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#5C6B7A', marginBottom: 10 }}>🎒 Leerling</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{naam}</div>
        <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 6 }}>{student?.klas || '—'}</div>
        <div style={{ fontSize: 12 }}>📞 {p.student_phone || '—'}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>📧 {student?.email || '—'}</div>
      </div>
      <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#5C6B7A', marginBottom: 10 }}>🏢 Stagebedrijf</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.company_name || '—'}</div>
        <div style={{ fontSize: 12, color: '#5C6B7A', marginBottom: 6 }}>📍 {[p.company_address, p.company_postcode, p.company_city].filter(Boolean).join(', ') || '—'}</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{p.company_supervisor || '—'}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>📞 {p.company_phone || '—'}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>📧 {p.company_email || '—'}</div>
        {p.company_green && <div style={{ fontSize: 12, marginTop: 6, color: '#1A7F52', fontWeight: 600 }}>🌱 Groene stage</div>}
      </div>
    </div>
  )
}

export default function KoppelingenPage() {
  const router = useRouter()
  const fileRef = useRef()
  const [profile, setProfile] = useState(null)
  const [studenten, setStudenten] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [uitgeklapt, setUitgeklapt] = useState(null)
  const [aanpassenPlacement, setAanpassenPlacement] = useState(null)
  const [afwijzenPlacement, setAfwijzenPlacement] = useState(null)
  const [csvBezig, setCsvBezig] = useState(false)
  const [bezig, setBezig] = useState({})

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    const supabase = createClient()
    if (!session) { router.replace('/login'); return }

    const { data: prof } = await supabase
      .from('profiles').select('id,name,role,school_id')
      .eq('user_id', session.user.id).limit(1).maybeSingle()

    if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
    setProfile(prof)

    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id,name,email,klas,user_id').eq('school_id', prof.school_id).eq('role', 'student').order('name'),
      supabase.from('placements').select('*').eq('school_id', prof.school_id).not('status', 'in', '("cancelled","completed")').order('created_at'),
    ])

    setStudenten(s ?? [])
    setPlacements(p ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // CSV import
  async function handleCsvUpload(e) {
    const supabase = createClient()
    const file = e.target.files[0]
    if (!file) return
    setCsvBezig(true)

    const text = await file.text()
    const regels = text.trim().split('\n').slice(1) // skip header

    let aangemaakt = 0
    let fouten = 0

    for (const regel of regels) {
      const kolommen = regel.split(',').map(k => k.trim().replace(/^"|"$/g, ''))
      const [naam, email, klas] = kolommen
      if (!naam || !email) { fouten++; continue }

      // Maak auth user aan of zoek bestaande
      const { data: bestaand } = await supabase
        .from('profiles').select('id').eq('email', email).eq('school_id', profile.school_id).maybeSingle()

      if (bestaand) {
        // Update klas als die er niet is
        await supabase.from('profiles').update({ klas }).eq('id', bestaand.id)
        // Maak placement aan als die er nog niet is
        const { data: bestaandP } = await supabase
          .from('placements').select('id').eq('student_id', bestaand.id).eq('school_id', profile.school_id).maybeSingle()
        if (!bestaandP) {
          await supabase.from('placements').insert({
            school_id: profile.school_id,
            student_id: bestaand.id,
            coordinator_id: profile.id,
            status: 'pending',
          })
          aangemaakt++
        }
        continue
      }

      // Nieuw profiel aanmaken (zonder auth user — coordinator importeert)
      const { data: nieuwProfiel, error: profError } = await supabase
        .from('profiles').insert({
          user_id: '00000000-0000-0000-0000-000000000000', // placeholder
          school_id: profile.school_id,
          name: naam,
          email: email,
          klas: klas || null,
          role: 'student',
        }).select('id').maybeSingle()

      if (profError || !nieuwProfiel) { fouten++; continue }

      await supabase.from('placements').insert({
        school_id: profile.school_id,
        student_id: nieuwProfiel.id,
        coordinator_id: profile.id,
        status: 'pending',
      })
      aangemaakt++
    }

    await loadData()
    setCsvBezig(false)
    fileRef.current.value = ''
    showToast(`✅ ${aangemaakt} leerlingen geïmporteerd${fouten ? ` (${fouten} overgeslagen)` : ''}`)
  }

  const stuurInvullink = async (placementId, studentId) => {
    const supabase = createClient()
    setBezig(prev => ({ ...prev, [placementId]: true }))
    await supabase.from('placements').update({
      status: 'invited',
      invited_at: new Date().toISOString(),
    }).eq('id', placementId)
    // TODO: Resend email naar student
    await loadData()
    showToast('📨 Invullink verstuurd!')
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  const stuurAlleLinks = async () => {
    const supabase = createClient()
    const pending = placements.filter(p => p.status === 'pending' || p.status === 'rejected')
    for (const p of pending) {
      await supabase.from('placements').update({ status: 'invited', invited_at: new Date().toISOString() }).eq('id', p.id)
    }
    await loadData()
    showToast(`📨 Invullinks verstuurd naar ${pending.length} leerlingen!`)
  }

  const keurGoed = async (placementId) => {
    const supabase = createClient()
    setBezig(prev => ({ ...prev, [placementId]: true }))
    await supabase.from('placements').update({
      status: 'active',
      approved_at: new Date().toISOString(),
    }).eq('id', placementId)
    // TODO: Resend email naar stagebegeleider
    await loadData()
    setUitgeklapt(null)
    showToast('✅ Stage goedgekeurd! Begeleider krijgt automatisch een email.')
    setBezig(prev => ({ ...prev, [placementId]: false }))
  }

  const wijsAf = async (placementId, reden) => {
    const supabase = createClient()
    await supabase.from('placements').update({
      status: 'rejected',
      rejection_reason: reden,
    }).eq('id', placementId)
    await loadData()
    setAfwijzenPlacement(null)
    setUitgeklapt(null)
    showToast('❌ Stage afgewezen. Leerling kan opnieuw invullen.', false)
  }

  const slaAanpassingOp = async (placementId, form) => {
    const supabase = createClient()
    await supabase.from('placements').update(form).eq('id', placementId)
    await loadData()
    setAanpassenPlacement(null)
    showToast('✅ Gegevens opgeslagen!')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pending  = placements.filter(p => p.status === 'pending' || p.status === 'rejected')
  const invited  = placements.filter(p => p.status === 'invited')
  const review   = placements.filter(p => p.status === 'review')
  const actief   = placements.filter(p => p.status === 'active' || p.status === 'halfway')

  const StudentRij = ({ p, acties }) => {
    const student = studenten.find(s => s.id === p.student_id)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
          {getInitialen(student?.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{student?.name || '—'}</div>
          <div style={{ fontSize: 12, color: '#5C6B7A' }}>{student?.email || '—'} · {student?.klas || 'Klas bekend na intake'}</div>
          {p.status === 'rejected' && p.rejection_reason && (
            <div style={{ fontSize: 12, color: '#C03020', marginTop: 2 }}>Reden: {p.rejection_reason}</div>
          )}
        </div>
        {p.status === 'rejected' && <Badge label="Afgekeurd" kleur="rood" />}
        {acties}
      </div>
    )
  }

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {aanpassenPlacement && (
        <AanpassenOverlay
          placement={aanpassenPlacement}
          studenten={studenten}
          onClose={() => setAanpassenPlacement(null)}
          onSave={(form) => slaAanpassingOp(aanpassenPlacement.id, form)}
        />
      )}

      {afwijzenPlacement && (
        <AfwijzenOverlay
          onClose={() => setAfwijzenPlacement(null)}
          onConfirm={(reden) => wijsAf(afwijzenPlacement.id, reden)}
        />
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Koppelingen</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Uitleg */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Hoe werkt de koppeling?</div>
          <p style={{ fontSize: 13, color: '#5C6B7A', lineHeight: 1.6 }}>
            Importeer leerlingen via CSV → stuur ze een invullink → leerling vult zelf zijn stageplek in → jij controleert de gegevens met de papieren stageovereenkomst → goedkeuren of afwijzen → bij goedkeuring krijgt de stagebegeleider automatisch een e-mail met zijn toegangslink.
          </p>
        </div>

        {/* CSV Import */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📥 Leerlingen importeren via CSV</div>
          <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 14 }}>
            Upload een CSV-bestand met de kolommen: <strong>naam, email, klas</strong>. Leerlingen worden direct aangemaakt met status "Link nog versturen".
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-block' }}>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px',
                background: csvBezig ? '#E4DDD4' : '#0E3A5C', color: '#fff', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: csvBezig ? 'not-allowed' : 'pointer',
              }}>
                {csvBezig ? '⏳ Importeren...' : '📂 Kies CSV-bestand'}
              </span>
            </label>
            <div style={{ fontSize: 12, color: '#5C6B7A' }}>
              Verwacht formaat: <code style={{ background: '#F0EDE8', padding: '2px 6px', borderRadius: 4 }}>naam,email,klas</code>
            </div>
          </div>
        </div>

        {/* 🔴 Link nog versturen */}
        <Sectie
          emoji="🔴" titel="Link nog versturen" kleur="rood" count={pending.length}
          uitleg="Deze leerlingen staan in het systeem maar hebben nog geen invullink ontvangen. Stuur ze een link zodat ze hun stageplek zelf kunnen invullen."
        >
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#1A7F52', fontSize: 14 }}>✓ Alle leerlingen hebben een invullink ontvangen</div>
          ) : (
            <>
              <button onClick={stuurAlleLinks} style={{ marginBottom: 14, padding: '7px 16px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                📨 Stuur naar alle {pending.length} leerlingen
              </button>
              {pending.map(p => {
                const student = studenten.find(s => s.id === p.student_id)
                return (
                  <StudentRij key={p.id} p={p} acties={
                    <button
                      onClick={() => stuurInvullink(p.id, p.student_id)}
                      disabled={bezig[p.id]}
                      style={{ padding: '7px 14px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: bezig[p.id] ? .6 : 1 }}
                    >
                      {bezig[p.id] ? '...' : '📨 Stuur link'}
                    </button>
                  } />
                )
              })}
            </>
          )}
        </Sectie>

        {/* 🟡 Wacht op leerling */}
        <Sectie
          emoji="🟡" titel="Wacht op leerling" kleur="geel" count={invited.length}
          uitleg="Invullink is verstuurd. Zodra de leerling zijn stageplek invult, verschijnt hij bij 'Ter beoordeling'."
        >
          {invited.length === 0
            ? <div style={{ textAlign: 'center', padding: 24, color: '#5C6B7A', fontSize: 14 }}>Geen leerlingen in afwachting</div>
            : invited.map(p => <StudentRij key={p.id} p={p} acties={
              <Badge label="Link verstuurd" kleur="geel" />
            } />)
          }
        </Sectie>

        {/* 🟠 Ter beoordeling */}
        <Sectie
          emoji="🟠" titel="Ter beoordeling" kleur="oranje" count={review.length}
          uitleg="Leerling heeft stageplek ingevuld. Controleer de gegevens met de papieren stageovereenkomst en keur goed of wijs af."
        >
          {review.length === 0
            ? <div style={{ textAlign: 'center', padding: 24, color: '#5C6B7A', fontSize: 14 }}>Geen stagiaires ter beoordeling</div>
            : review.map(p => {
              const student = studenten.find(s => s.id === p.student_id)
              const open = uitgeklapt === p.id
              return (
                <div key={p.id} style={{ border: '1px solid #F2C09A', borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
                  <div
                    onClick={() => setUitgeklapt(open ? null : p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FDEADD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#F26B1D', flexShrink: 0 }}>
                      {getInitialen(student?.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{student?.name}</div>
                      <div style={{ fontSize: 12, color: '#5C6B7A' }}>{p.company_name || '—'} · {p.company_city || '—'}</div>
                    </div>
                    <Badge label="Wacht op beoordeling" kleur="oranje" />
                    <span style={{ color: '#5C6B7A', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
                  </div>

                  {open && (
                    <>
                      <DetailKaart p={p} student={student} />
                      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setAanpassenPlacement(p)}
                          style={{ padding: '8px 16px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        >✏️ Aanpassen</button>
                        <button
                          onClick={() => setAfwijzenPlacement(p)}
                          style={{ padding: '8px 16px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        >❌ Afwijzen</button>
                        <button
                          onClick={() => keurGoed(p.id)}
                          disabled={bezig[p.id]}
                          style={{ padding: '8px 16px', background: '#1A7F52', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: bezig[p.id] ? .6 : 1 }}
                        >✅ Goedkeuren</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          }
        </Sectie>

        {/* 🟢 Actieve koppelingen */}
        <Sectie
          emoji="🟢" titel="Actieve koppelingen" kleur="groen" count={actief.length}
          uitleg="Stage goedgekeurd. Stagebegeleider heeft een e-mail ontvangen met zijn toegangslink."
        >
          {actief.length === 0
            ? <div style={{ textAlign: 'center', padding: 24, color: '#5C6B7A', fontSize: 14 }}>Nog geen actieve stages</div>
            : actief.map(p => {
              const student = studenten.find(s => s.id === p.student_id)
              const open = uitgeklapt === p.id
              return (
                <div key={p.id} style={{ border: '1px solid #C5E3D6', borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
                  <div
                    onClick={() => setUitgeklapt(open ? null : p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A7F52', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{student?.name}</div>
                      <div style={{ fontSize: 12, color: '#5C6B7A' }}>{p.company_name || '—'} · {p.company_supervisor || '—'}</div>
                    </div>
                    {p.company_green && <Badge label="🌱 Groen" kleur="groen" />}
                    <button
                      onClick={e => { e.stopPropagation(); setAanpassenPlacement(p) }}
                      style={{ padding: '5px 12px', background: '#1A7F52', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >✏️ Aanpassen</button>
                    <span style={{ color: '#5C6B7A', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && <DetailKaart p={p} student={student} />}
                </div>
              )
            })
          }
        </Sectie>

      </div>
    </CoordinatorLayout>
  )
}
