'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const STAPPEN = ['Intake', 'Gekoppeld', 'Gestart', 'Halverwege', 'Afgerond']

function Tijdlijn({ stap = 0 }) {
  return (
    <div style={{ padding: '16px 20px 20px 64px', borderTop: '1px solid #EDE8E2', background: '#FAFAF8' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Stagevoortgang</div>
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 2, background: '#E4DDD4' }} />
        {STAPPEN.map((naam, i) => {
          const cls = i < stap ? 'klaar' : i === stap ? 'actief' : 'wacht'
          return (
            <div key={naam} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, border: '2px solid',
                background: cls === 'klaar' ? '#1A7F52' : cls === 'actief' ? '#F26B1D' : '#fff',
                borderColor: cls === 'klaar' ? '#1A7F52' : cls === 'actief' ? '#F26B1D' : '#E4DDD4',
                color: cls === 'wacht' ? '#5C6B7A' : '#fff',
              }}>{cls === 'klaar' ? '✓' : i + 1}</div>
              <div style={{ fontSize: 11, color: '#5C6B7A', marginTop: 6, textAlign: 'center', fontWeight: 500 }}>{naam}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DEMO = [
  { id: 'd1', name: 'Ayse Yilmaz',      email: 'ayse@school.nl',   klas: 'BBL-2A', status: 'actief',   stap: 3, uren: 120 },
  { id: 'd2', name: 'Kevin de Boer',    email: 'kevin@school.nl',  klas: 'BOL-3B', status: 'wacht',    stap: 1, uren: 0   },
  { id: 'd3', name: 'Sara Ahmadi',      email: 'sara@school.nl',   klas: 'BBL-2A', status: 'aandacht', stap: 2, uren: 40  },
  { id: 'd4', name: 'Daan Pietersen',   email: 'daan@school.nl',   klas: 'BOL-4A', status: 'afgerond', stap: 5, uren: 240 },
  { id: 'd5', name: 'Fatima El Idrissi',email: 'fatima@school.nl', klas: 'BOL-3B', status: 'actief',   stap: 3, uren: 98  },
]

function StatusBadge({ status }) {
  const map = {
    actief:   { label: 'Actief',      bg: '#E2F4EC', color: '#1A7F52' },
    gestart:  { label: 'Gestart',     bg: '#E8F0F6', color: '#0E3A5C' },
    wacht:    { label: 'Wacht',       bg: '#FDEADD', color: '#F26B1D' },
    aandacht: { label: '⚠️ Aandacht', bg: '#FAEAE7', color: '#C03020' },
    afgerond: { label: 'Afgerond',    bg: '#F0EDE8', color: '#5C6B7A' },
  }
  const s = map[status] || { label: 'Onbekend', bg: '#F0EDE8', color: '#5C6B7A' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
}

export default function StudentenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [studenten, setStudenten] = useState([])
  const [loading, setLoading] = useState(true)
  const [zoek, setZoek] = useState('')
  const [uitgeklapt, setUitgeklapt] = useState(null)
  const [geselecteerd, setGeselecteerd] = useState([])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('name,role,school_id').eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)
      const { data: s } = await supabase.from('profiles').select('*').eq('school_id', prof.school_id).eq('role', 'student').order('name')
      setStudenten(s?.length ? s : DEMO)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const gefilterd = studenten.filter(s =>
    !zoek || s.name?.toLowerCase().includes(zoek.toLowerCase()) || s.email?.toLowerCase().includes(zoek.toLowerCase())
  )

  return (
    <CoordinatorLayout profile={profile}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Studenten</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
            <input
              type="text" placeholder="Zoek op naam of e-mail..."
              value={zoek} onChange={e => setZoek(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1.5px solid #E4DDD4', borderRadius: 10, fontSize: 14, fontFamily: 'Inter,sans-serif', color: '#1A2633', outline: 'none' }}
            />
          </div>
          <button style={{ padding: '9px 18px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Student toevoegen
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { num: studenten.length, label: 'studenten totaal' },
            { num: studenten.filter(s => s.status === 'actief').length, label: 'actief bezig', color: '#1A7F52' },
            { num: studenten.filter(s => s.status === 'aandacht').length, label: 'vereisen aandacht', color: '#C03020' },
            { num: gefilterd.length, label: 'resultaten zichtbaar' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#5C6B7A', border: '1.5px solid #E4DDD4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: s.color || '#1A2633' }}>{s.num}</span>
              {s.label}
            </div>
          ))}
        </div>

        {/* Tabel */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E4DDD4' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '12px 20px', background: '#F7F3EE', borderBottom: '1px solid #E4DDD4', fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5 }}>
            <div>Student</div><div>Klas</div><div>Status</div><div>Uren</div><div>Voortgang</div><div></div>
          </div>

          {gefilterd.map(student => (
            <div key={student.id}>
              <div
                onClick={() => setUitgeklapt(uitgeklapt === student.id ? null : student.id)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '14px 20px', borderBottom: '1px solid #EDE8E2', alignItems: 'center', cursor: 'pointer', background: uitgeklapt === student.id ? '#F7F3EE' : '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={geselecteerd.includes(student.id)}
                    onClick={e => { e.stopPropagation(); setGeselecteerd(prev => prev.includes(student.id) ? prev.filter(x => x !== student.id) : [...prev, student.id]) }}
                    style={{ marginRight: 4, accentColor: '#0E3A5C' }} />
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
                    {getInitialen(student.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: '#5C6B7A' }}>{student.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#5C6B7A' }}>{student.klas || '—'}</div>
                <div><StatusBadge status={student.status || 'wacht'} /></div>
                <div style={{ fontSize: 13, color: '#5C6B7A' }}>{student.uren || 0} uur</div>
                <div style={{ fontSize: 13, color: '#5C6B7A' }}>Stap {Math.min(student.stap || 1, 5)} / 5</div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #E4DDD4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                  <button style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #E4DDD4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>📧</button>
                </div>
              </div>
              {uitgeklapt === student.id && <Tijdlijn stap={(student.stap || 1) - 1} />}
            </div>
          ))}
        </div>
      </div>

      {geselecteerd.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1A2633', color: '#fff', padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.25)', zIndex: 100 }}>
          <span>{geselecteerd.length} student{geselecteerd.length > 1 ? 'en' : ''} geselecteerd</span>
          <button style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: '#F26B1D', color: '#fff' }}>📧 Herinnering sturen</button>
          <button onClick={() => setGeselecteerd([])} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,.15)', color: '#fff' }}>✕ Deselecteer</button>
        </div>
      )}
    </CoordinatorLayout>
  )
}
