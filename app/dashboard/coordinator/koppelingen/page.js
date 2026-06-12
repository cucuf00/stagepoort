'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function KoppelingenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [studenten, setStudenten] = useState([])
  const [bedrijven, setBedrijven] = useState([])
  const [placements, setPlacements] = useState([])
  const [selecties, setSelecties] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [bezig, setBezig] = useState({})

  const getSupabase = () => createClient()

  const loadData = async () => {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('id,name,role,school_id').eq('user_id', session.user.id).limit(1).maybeSingle()
    if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
    setProfile(prof)
    const [{ data: s }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id,name,klas').eq('school_id', prof.school_id).eq('role', 'student').order('name'),
      supabase.from('companies').select('id,name,city').eq('school_id', prof.school_id).eq('active', true).order('name'),
      supabase.from('placements').select('id,student_id,company_id,status,companies(name,city)').eq('school_id', prof.school_id).in('status', ['pending','intake','active','halfway']),
    ])
    setStudenten(s ?? [])
    setBedrijven(b ?? [])
    setPlacements(p ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(''), 3000)
  }

  async function handleKoppel(studentId) {
    const bedrijfId = selecties[studentId]
    if (!bedrijfId) return
    setBezig(prev => ({ ...prev, [studentId]: true }))
    const supabase = getSupabase()
    const { error } = await supabase.from('placements').insert({
      school_id: profile.school_id, student_id: studentId,
      company_id: bedrijfId, coordinator_id: profile.id, status: 'intake',
    })
    if (!error) { await loadData(); showToast('✅ Student gekoppeld!') }
    else showToast('❌ ' + error.message, false)
    setBezig(prev => ({ ...prev, [studentId]: false }))
  }

  async function handleOntkoppel(placementId) {
    const supabase = getSupabase()
    await supabase.from('placements').update({ status: 'cancelled' }).eq('id', placementId)
    await loadData()
    showToast('🔗 Koppeling verwijderd')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const gekoppeldeIds = new Set(placements.map(p => p.student_id))
  const ongekoppeld = studenten.filter(s => !gekoppeldeIds.has(s.id))
  const intake = placements.filter(p => p.status === 'intake' || p.status === 'pending')
  const actief = placements.filter(p => p.status === 'active' || p.status === 'halfway')

  const StudentRij = ({ student, rechts }) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4DDD4', padding: '14px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
          {getInitialen(student?.name)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{student?.name}</div>
          <div style={{ fontSize: 12, color: '#5C6B7A' }}>{student?.klas || 'Geen klas'}</div>
        </div>
      </div>
      {rechts}
    </div>
  )

  const Sectie = ({ emoji, titel, count, kleur, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {emoji} {titel}
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: kleur[0], color: kleur[1] }}>{count}</span>
      </div>
      {count === 0
        ? <div style={{ textAlign: 'center', padding: 32, color: '#5C6B7A', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px dashed #E4DDD4' }}>Geen items</div>
        : children
      }
    </div>
  )

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Koppelingen</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>
      <div style={{ padding: '28px 32px' }}>

        <Sectie emoji="🔴" titel="Nog niet gekoppeld" count={ongekoppeld.length} kleur={['#FAEAE7', '#C03020']}>
          {ongekoppeld.map(student => (
            <StudentRij key={student.id} student={student} rechts={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={selecties[student.id] || ''}
                  onChange={e => setSelecties(prev => ({ ...prev, [student.id]: e.target.value }))}
                  style={{ padding: '7px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#1A2633', background: '#fff', outline: 'none', minWidth: 200 }}
                >
                  <option value="">— Kies bedrijf —</option>
                  {bedrijven.map(b => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}
                </select>
                <button
                  onClick={() => handleKoppel(student.id)}
                  disabled={!selecties[student.id] || bezig[student.id]}
                  style={{ padding: '7px 16px', background: '#F26B1D', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: (!selecties[student.id] || bezig[student.id]) ? .5 : 1, whiteSpace: 'nowrap' }}
                >{bezig[student.id] ? 'Bezig...' : 'Koppelen →'}</button>
              </div>
            } />
          ))}
        </Sectie>

        <Sectie emoji="🟡" titel="In intake" count={intake.length} kleur={['#FBF0D8', '#A87010']}>
          {intake.map(p => {
            const student = studenten.find(s => s.id === p.student_id)
            return <StudentRij key={p.id} student={student} rechts={
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#A87010' }}>🏢 {p.companies?.name}</div>
                  <div style={{ fontSize: 12, color: '#5C6B7A' }}>{p.companies?.city}</div>
                </div>
                <button onClick={() => handleOntkoppel(p.id)} style={{ padding: '7px 14px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Ontkoppelen</button>
              </div>
            } />
          })}
        </Sectie>

        <Sectie emoji="🟢" titel="Actieve stages" count={actief.length} kleur={['#E2F4EC', '#1A7F52']}>
          {actief.map(p => {
            const student = studenten.find(s => s.id === p.student_id)
            return <StudentRij key={p.id} student={student} rechts={
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A7F52', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A7F52' }}>🏢 {p.companies?.name}</div>
                  <div style={{ fontSize: 12, color: '#5C6B7A' }}>{p.companies?.city}</div>
                </div>
                <button onClick={() => handleOntkoppel(p.id)} style={{ padding: '7px 14px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Ontkoppelen</button>
              </div>
            } />
          })}
        </Sectie>

      </div>
    </CoordinatorLayout>
  )
}
