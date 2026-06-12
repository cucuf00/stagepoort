'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function StatusBadge({ status }) {
  const map = {
    'actief':      { label: 'Op koers',       bg: '#E2F4EC', color: '#1A7F52' },
    'active':      { label: 'Op koers',       bg: '#E2F4EC', color: '#1A7F52' },
    'op koers':    { label: 'Op koers',       bg: '#E2F4EC', color: '#1A7F52' },
    'bijna klaar': { label: 'Bijna klaar',    bg: '#E8F0F6', color: '#0E3A5C' },
    'aandacht':    { label: '⚠️ Aandacht',   bg: '#FBF0D8', color: '#A87010' },
    'achterstand': { label: '🔴 Achterstand', bg: '#FAEAE7', color: '#C03020' },
    'geen stage':  { label: 'Geen stage',     bg: '#F0EDE8', color: '#5C6B7A' },
    'pending':     { label: 'Geen stage',     bg: '#F0EDE8', color: '#5C6B7A' },
  }
  const s = map[status] || { label: status || 'Onbekend', bg: '#F0EDE8', color: '#5C6B7A' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
}

function bepaalStatus(student, placements) {
  const pl = placements.find(p => p.student_id === student.id && !['cancelled', 'completed'].includes(p.status))
  if (!pl || ['pending', 'cancelled', 'invited'].includes(pl.status)) return 'geen stage'
  if (pl.status === 'review') return 'aandacht'
  if (pl.status === 'active' || pl.status === 'halfway') return 'op koers'
  return 'geen stage'
}

export default function CoordinatorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [studenten, setStudenten] = useState([])
  const [placements, setPlacements] = useState([])
  const [periodes, setPeriodes] = useState([])
  const [stats, setStats] = useState({ studenten: 0, actief: 0, uren: 0, aandacht: 0 })
  const [loading, setLoading] = useState(true)
  const [zoek, setZoek] = useState('')
  const [filterPeriode, setFilterPeriode] = useState('alle')
  const [filterKlas, setFilterKlas] = useState('alle')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [uitgeklapt, setUitgeklapt] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editBezig, setEditBezig] = useState(false)
  const [verwijderConfirm, setVerwijderConfirm] = useState(null)
  const [toast, setToast] = useState(null)

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

      const [{ data: s }, { data: p }, { data: pers }, { count: actief }, { count: uren }] = await Promise.all([
        supabase.from('profiles').select('*').eq('school_id', prof.school_id).eq('role', 'student').order('name'),
        supabase.from('placements').select('*').eq('school_id', prof.school_id).order('created_at', { ascending: false }),
        supabase.from('stage_periods').select('*').eq('school_id', prof.school_id).order('start_date'),
        supabase.from('placements').select('*', { count: 'exact', head: true }).eq('school_id', prof.school_id).eq('status', 'active'),
        supabase.from('hours').select('*', { count: 'exact', head: true }).eq('school_id', prof.school_id).eq('status', 'pending'),
      ])

      setStudenten(s ?? [])
      setPlacements(p ?? [])
      setPeriodes(pers ?? [])

      const studList = s ?? []
      const plList = p ?? []
      const aandacht = studList.filter(st => bepaalStatus(st, plList) === 'aandacht').length
      setStats({ studenten: studList.length, actief: actief ?? 0, uren: uren ?? 0, aandacht })
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function openEdit(student) {
    setEditForm({ name: student.name || '', email: student.email || '', klas: student.klas || '' })
    setEditModal(student)
  }

  async function slaEditOp() {
    setEditBezig(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      name: editForm.name,
      email: editForm.email,
      klas: editForm.klas,
    }).eq('id', editModal.id)

    if (!error) {
      setStudenten(prev => prev.map(s => s.id === editModal.id ? { ...s, ...editForm } : s))
      setEditModal(null)
      showToast('✅ Leerling bijgewerkt!')
    } else showToast('❌ ' + error.message, false)
    setEditBezig(false)
  }

  async function verwijderStudent(student) {
    const supabase = createClient()
    // Verwijder eerst placements van deze student
    await supabase.from('placements').delete().eq('student_id', student.id)
    // Dan het profiel
    const { error } = await supabase.from('profiles').delete().eq('id', student.id)
    if (!error) {
      setStudenten(prev => prev.filter(s => s.id !== student.id))
      setPlacements(prev => prev.filter(p => p.student_id !== student.id))
      setStats(prev => ({ ...prev, studenten: prev.studenten - 1 }))
      setVerwijderConfirm(null)
      showToast('🗑️ Leerling verwijderd')
    } else showToast('❌ ' + error.message, false)
  }

  function exportCSV() {
    const headers = ['Naam', 'Email', 'Klas', 'Status', 'Bedrijf', 'Begeleider']
    const rows = gefilterd.map(s => {
      const pl = placements.find(p => p.student_id === s.id)
      return [s.name, s.email || '', s.klas || '', s._status, pl?.company_name || '—', pl?.supervisor_name || '—']
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'studenten.csv'; a.click()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const klassen = [...new Set(studenten.map(s => s.klas).filter(Boolean))].sort()
  const metStatus = studenten.map(s => ({ ...s, _status: bepaalStatus(s, placements) }))

  const counts = {
    alle:          metStatus.length,
    'geen stage':  metStatus.filter(s => s._status === 'geen stage').length,
    'achterstand': metStatus.filter(s => s._status === 'achterstand').length,
    'aandacht':    metStatus.filter(s => s._status === 'aandacht').length,
    'op koers':    metStatus.filter(s => s._status === 'op koers').length,
    'bijna klaar': metStatus.filter(s => s._status === 'bijna klaar').length,
  }

  const gefilterd = metStatus.filter(s => {
    if (zoek && !s.name?.toLowerCase().includes(zoek.toLowerCase()) && !s.email?.toLowerCase().includes(zoek.toLowerCase())) return false
    if (filterKlas !== 'alle' && s.klas !== filterKlas) return false
    if (filterStatus !== 'alle' && s._status !== filterStatus) return false
    return true
  })

  const tabKleuren = {
    'alle': '#0E3A5C', 'geen stage': '#5C6B7A', 'achterstand': '#C03020',
    'aandacht': '#A87010', 'op koers': '#1A7F52', 'bijna klaar': '#0E3A5C',
  }

  const uur = new Date().getHours()
  const groet = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond'

  return (
    <CoordinatorLayout profile={profile}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setEditModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ✏️ Leerling bewerken
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#5C6B7A' }}>✕</button>
            </div>
            {[['Naam', 'name', 'text'], ['E-mail', 'email', 'email'], ['Klas', 'klas', 'text']].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C6B7A', marginBottom: 5 }}>{label}</label>
                <input type={type} value={editForm[key] || ''} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E4DDD4', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={slaEditOp} disabled={editBezig} style={{ flex: 1, padding: '12px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {editBezig ? '⏳ Opslaan...' : '💾 Opslaan'}
              </button>
              <button onClick={() => setEditModal(null)} style={{ padding: '12px 20px', background: '#F0EDE8', border: 'none', borderRadius: 10, color: '#5C6B7A', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verwijder bevestiging */}
      {verwijderConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setVerwijderConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Leerling verwijderen?</div>
            <p style={{ fontSize: 14, color: '#5C6B7A', marginBottom: 24, lineHeight: 1.6 }}>
              <strong>{verwijderConfirm.name}</strong> wordt permanent verwijderd, inclusief alle stagekoppelingen. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => verwijderStudent(verwijderConfirm)} style={{ flex: 1, padding: '12px', background: '#C03020', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Definitief verwijderen
              </button>
              <button onClick={() => setVerwijderConfirm(null)} style={{ padding: '12px 20px', background: '#F0EDE8', border: 'none', borderRadius: 10, color: '#5C6B7A', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Dashboard</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Begroeting */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {groet}, {profile?.name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: '#5C6B7A', fontSize: 14 }}>Hier is een overzicht van het stageproces.</p>
        </div>

        {/* KPI tegels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Studenten', value: stats.studenten, sub: 'Ingeschreven', kleur: '#0E3A5C' },
            { label: 'Actieve stages', value: stats.actief, sub: 'Momenteel bezig', kleur: '#1A7F52' },
            { label: 'Uren te keuren', value: stats.uren, sub: 'Wacht op goedkeuring', kleur: '#F26B1D' },
            { label: 'Aandacht nodig', value: stats.aandacht, sub: 'Ter beoordeling', kleur: '#C03020' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: 20, borderTop: `3px solid ${kpi.kleur}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{kpi.label}</div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters toolbar */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: '14px 20px', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="Zoek op naam of email..." value={zoek} onChange={e => setZoek(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none' }} />
          </div>
          <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, background: '#fff', outline: 'none' }}>
            <option value="alle">Alle stageperiodes</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterKlas} onChange={e => setFilterKlas(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, background: '#fff', outline: 'none' }}>
            <option value="alle">Alle klassen</option>
            {klassen.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={exportCSV} style={{ padding: '8px 14px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ⬇ Exporteer CSV
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'alle', label: 'Alle' },
            { key: 'geen stage', label: 'Geen stage' },
            { key: 'achterstand', label: 'Achterstand' },
            { key: 'aandacht', label: 'Aandacht' },
            { key: 'op koers', label: 'Op koers' },
            { key: 'bijna klaar', label: 'Bijna klaar' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: filterStatus === tab.key ? tabKleuren[tab.key] : '#F0EDE8',
              color: filterStatus === tab.key ? '#fff' : '#5C6B7A',
            }}>
              {tab.label} ({counts[tab.key] ?? 0})
            </button>
          ))}
        </div>

        {/* Studenten tabel */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E4DDD4' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr 100px', padding: '11px 20px', background: '#F7F3EE', borderBottom: '1px solid #E4DDD4', fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            <div>Student</div><div>Klas</div><div>Status</div><div>Bedrijf</div><div>Uren</div><div></div>
          </div>

          {gefilterd.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#5C6B7A', fontSize: 14 }}>Geen studenten gevonden</div>
          )}

          {gefilterd.map(student => {
            const pl = placements.find(p => p.student_id === student.id && !['cancelled', 'completed'].includes(p.status))
            const isOpen = uitgeklapt === student.id

            return (
              <div key={student.id} style={{ borderBottom: '1px solid #EDE8E2' }}>
                <div
                  onClick={() => setUitgeklapt(isOpen ? null : student.id)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr 100px', padding: '13px 20px', alignItems: 'center', cursor: 'pointer', background: isOpen ? '#F7F3EE' : '#fff' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
                      {getInitialen(student.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</div>
                      <div style={{ fontSize: 12, color: '#5C6B7A' }}>{student.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#5C6B7A' }}>{student.klas || '—'}</div>
                  <div><StatusBadge status={student._status} /></div>
                  <div style={{ fontSize: 13 }}>
                    {pl?.company_name
                      ? <div><div style={{ fontWeight: 600 }}>{pl.company_name}</div><div style={{ fontSize: 12, color: '#5C6B7A' }}>{pl.supervisor_name || '—'}</div></div>
                      : <span style={{ color: '#5C6B7A' }}>—</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#5C6B7A' }}>0 / {pl?.hours_required || 320} u</div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(student)} title="Bewerken"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #E4DDD4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    {student.email && (
                      <button onClick={() => window.location.href = `mailto:${student.email}`} title="Mail sturen"
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #E4DDD4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>📧</button>
                    )}
                    <button onClick={() => setVerwijderConfirm(student)} title="Verwijderen"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #FAEAE7', background: '#FAEAE7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                  </div>
                </div>

                {/* Uitklapbaar detail */}
                {isOpen && (
                  <div style={{ padding: '0 20px 16px', background: '#FAFAF8', borderTop: '1px solid #EDE8E2' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                      <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 8 }}>🎒 Student</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {pl ? [pl.first_name, pl.infix, pl.last_name].filter(Boolean).join(' ') || student.name : student.name}
                        </div>
                        {pl?.student_phone && <div style={{ fontSize: 12, marginTop: 4 }}>📞 {pl.student_phone}</div>}
                        <div style={{ fontSize: 12, marginTop: 2 }}>📧 {student.email || '—'}</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>📚 Klas: {student.klas || '—'}</div>
                        {pl?.green_stage && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#1A7F52' }}>🌱 Groene stage</div>}
                      </div>
                      <div style={{ background: '#EAF1F6', borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5C6B7A', marginBottom: 8 }}>🏢 Stagebedrijf</div>
                        {pl?.company_name ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{pl.company_name}</div>
                            {pl.company_address && <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 2 }}>📍 {pl.company_address}, {pl.company_postcode} {pl.company_city}</div>}
                            {pl.supervisor_name && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{pl.supervisor_name}</div>}
                            {pl.company_email && <div style={{ fontSize: 12 }}>📧 {pl.company_email}</div>}
                            {pl.company_phone && <div style={{ fontSize: 12 }}>📞 {pl.company_phone}</div>}
                          </>
                        ) : <div style={{ fontSize: 13, color: '#5C6B7A' }}>Nog niet gekoppeld</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: '#5C6B7A' }}>
          {gefilterd.length} van {studenten.length} studenten
        </div>
      </div>
    </CoordinatorLayout>
  )
}
