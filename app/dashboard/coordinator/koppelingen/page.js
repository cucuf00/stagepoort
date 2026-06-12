'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function Sidebar({ profile, onLogout }) {
  return (
    <div style={{width:240,background:'#0E3A5C',display:'flex',flexDirection:'column',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 20px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{background:'rgba(255,255,255,.15)',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
            <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M11 14 L13 17 L15 14" stroke="#F26B1D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="13" cy="10" r="2" fill="#F26B1D"/>
          </svg>
        </div>
        <span style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:17,color:'#fff'}}>Stagepoort</span>
      </div>
      <nav style={{padding:'16px 0',flex:1,display:'flex',flexDirection:'column'}}>
        {[
          {href:'/dashboard/coordinator',label:'📊 Dashboard'},
          {href:'/dashboard/coordinator/studenten',label:'👥 Studenten'},
          {href:'/dashboard/coordinator/koppelingen',label:'🔗 Koppelingen',active:true},
          {href:'#',label:'📋 Opdrachten'},
          {href:'#',label:'🏢 Bedrijven'},
        ].map(item => (
          <Link key={item.href+item.label} href={item.href} style={{
            display:'flex',alignItems:'center',gap:10,padding:'10px 20px',
            color: item.active ? '#fff' : 'rgba(255,255,255,.6)',
            fontSize:14,fontWeight:500,textDecoration:'none',
            borderLeft: item.active ? '3px solid #F26B1D' : '3px solid transparent',
            background: item.active ? 'rgba(242,107,29,.18)' : 'transparent',
          }}>{item.label}</Link>
        ))}
        <div style={{flex:1}} />
        <button onClick={onLogout} style={{
          display:'flex',alignItems:'center',gap:10,padding:'10px 20px',
          color:'rgba(255,100,100,.8)',fontSize:14,fontWeight:500,
          border:'none',background:'none',cursor:'pointer',width:'100%',textAlign:'left',
          borderLeft:'3px solid transparent',
        }}>🚪 Uitloggen</button>
      </nav>
    </div>
  )
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

  const loadData = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const { data: prof } = await supabase
      .from('profiles').select('id, name, role, school_id')
      .eq('user_id', session.user.id).limit(1).maybeSingle()

    if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
    setProfile(prof)

    const [{ data: s }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id, name, klas').eq('school_id', prof.school_id).eq('role', 'student').order('name'),
      supabase.from('companies').select('id, name, city').eq('school_id', prof.school_id).eq('active', true).order('name'),
      supabase.from('placements').select('id, student_id, company_id, status, companies(name,city)').eq('school_id', prof.school_id).in('status', ['pending','intake','active','halfway']),
    ])

    setStudenten(s ?? [])
    setBedrijven(b ?? [])
    setPlacements(p ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleKoppel(studentId) {
    const bedrijfId = selecties[studentId]
    if (!bedrijfId) return
    setBezig(prev => ({ ...prev, [studentId]: true }))
    const supabase = createClient()
    const { error } = await supabase.from('placements').insert({
      school_id: profile.school_id,
      student_id: studentId,
      company_id: bedrijfId,
      coordinator_id: profile.id,
      status: 'intake',
    })
    if (!error) { await loadData(); showToast('✅ Student gekoppeld!') }
    else showToast('❌ ' + error.message)
    setBezig(prev => ({ ...prev, [studentId]: false }))
  }

  async function handleOntkoppel(placementId) {
    const supabase = createClient()
    await supabase.from('placements').update({ status: 'cancelled' }).eq('id', placementId)
    await loadData()
    showToast('🔗 Koppeling verwijderd')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F7F3EE'}}>
      <div style={{width:40,height:40,border:'3px solid #E4DDD4',borderTop:'3px solid #F26B1D',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const gekoppeldeIds = new Set(placements.map(p => p.student_id))
  const ongekoppeld = studenten.filter(s => !gekoppeldeIds.has(s.id))
  const intake = placements.filter(p => p.status === 'intake' || p.status === 'pending')
  const actief = placements.filter(p => p.status === 'active' || p.status === 'halfway')

  const Card = ({student, rechts}) => (
    <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4DDD4',padding:'14px 20px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'#E8F0F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#0E3A5C',flexShrink:0}}>
          {getInitialen(student?.name)}
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>{student?.name}</div>
          <div style={{fontSize:12,color:'#5C6B7A'}}>{student?.klas || 'Geen klas'}</div>
        </div>
      </div>
      {rechts}
    </div>
  )

  const Sectie = ({emoji, titel, count, kleur, children}) => (
    <div style={{marginBottom:28}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
        {emoji} {titel}
        <span style={{fontSize:12,fontWeight:700,padding:'2px 10px',borderRadius:20,background:kleur[0],color:kleur[1]}}>{count}</span>
      </div>
      {children}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#F7F3EE;font-family:'Inter',sans-serif;color:#1A2633}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>

      {toast && <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'#1A7F52',color:'#fff',padding:'12px 24px',borderRadius:12,fontWeight:700,fontSize:14,zIndex:999,animation:'slideDown .3s ease'}}>{toast}</div>}

      <div style={{display:'flex',minHeight:'100vh'}}>
        <Sidebar profile={profile} onLogout={handleLogout} />

        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <div style={{background:'#fff',borderBottom:'1px solid #E4DDD4',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h1 style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:700}}>Koppelingen</h1>
            <div style={{background:'#E8F0F6',padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:600,color:'#0E3A5C'}}>👤 {profile?.name}</div>
          </div>

          <div style={{padding:'28px 32px',flex:1}}>

            <Sectie emoji="🔴" titel="Nog niet gekoppeld" count={ongekoppeld.length} kleur={['#FAEAE7','#C03020']}>
              {ongekoppeld.length === 0
                ? <div style={{textAlign:'center',padding:32,color:'#5C6B7A',fontSize:14,background:'#fff',borderRadius:12,border:'1px dashed #E4DDD4'}}>Alle studenten zijn gekoppeld 🎉</div>
                : ongekoppeld.map(student => (
                  <Card key={student.id} student={student} rechts={
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <select
                        value={selecties[student.id] || ''}
                        onChange={e => setSelecties(prev => ({...prev,[student.id]:e.target.value}))}
                        style={{padding:'7px 12px',border:'1.5px solid #E4DDD4',borderRadius:8,fontFamily:'Inter,sans-serif',fontSize:13,color:'#1A2633',background:'#fff',outline:'none',minWidth:200}}
                      >
                        <option value="">— Kies bedrijf —</option>
                        {bedrijven.map(b => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}
                      </select>
                      <button
                        onClick={() => handleKoppel(student.id)}
                        disabled={!selecties[student.id] || bezig[student.id]}
                        style={{padding:'7px 16px',background:'#F26B1D',border:'none',borderRadius:8,color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer',opacity:(!selecties[student.id]||bezig[student.id])?.5:1,whiteSpace:'nowrap'}}
                      >{bezig[student.id] ? 'Bezig...' : 'Koppelen →'}</button>
                    </div>
                  }/>
                ))
              }
            </Sectie>

            <Sectie emoji="🟡" titel="In intake" count={intake.length} kleur={['#FBF0D8','#A87010']}>
              {intake.length === 0
                ? <div style={{textAlign:'center',padding:32,color:'#5C6B7A',fontSize:14,background:'#fff',borderRadius:12,border:'1px dashed #E4DDD4'}}>Geen stages in intake</div>
                : intake.map(p => {
                  const student = studenten.find(s => s.id === p.student_id)
                  return <Card key={p.id} student={student} rechts={
                    <div style={{display:'flex',alignItems:'center',gap:16}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'#A87010'}}>🏢 {p.companies?.name}</div>
                        <div style={{fontSize:12,color:'#5C6B7A'}}>{p.companies?.city}</div>
                      </div>
                      <button onClick={() => handleOntkoppel(p.id)} style={{padding:'7px 14px',background:'#FAEAE7',border:'none',borderRadius:8,color:'#C03020',fontWeight:600,fontSize:13,cursor:'pointer'}}>Ontkoppelen</button>
                    </div>
                  }/>
                })
              }
            </Sectie>

            <Sectie emoji="🟢" titel="Actieve stages" count={actief.length} kleur={['#E2F4EC','#1A7F52']}>
              {actief.length === 0
                ? <div style={{textAlign:'center',padding:32,color:'#5C6B7A',fontSize:14,background:'#fff',borderRadius:12,border:'1px dashed #E4DDD4'}}>Nog geen actieve stages</div>
                : actief.map(p => {
                  const student = studenten.find(s => s.id === p.student_id)
                  return <Card key={p.id} student={student} rechts={
                    <div style={{display:'flex',alignItems:'center',gap:16}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#1A7F52',flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'#1A7F52'}}>🏢 {p.companies?.name}</div>
                        <div style={{fontSize:12,color:'#5C6B7A'}}>{p.companies?.city}</div>
                      </div>
                      <button onClick={() => handleOntkoppel(p.id)} style={{padding:'7px 14px',background:'#FAEAE7',border:'none',borderRadius:8,color:'#C03020',fontWeight:600,fontSize:13,cursor:'pointer'}}>Ontkoppelen</button>
                    </div>
                  }/>
                })
              }
            </Sectie>

          </div>
        </div>
      </div>
    </>
  )
}
