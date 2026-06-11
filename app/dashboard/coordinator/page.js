import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CoordinatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'coordinator') redirect('/login')

  // KPI data
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', profile.school_id)
    .eq('role', 'student')

  const { count: activePlacements } = await supabase
    .from('placements')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', profile.school_id)
    .eq('status', 'active')

  const { count: pendingHours } = await supabase
    .from('hours')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', profile.school_id)
    .eq('status', 'pending')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F3EE; font-family: 'Inter', sans-serif; color: #1A2633; }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: #0E3A5C; display: flex; flex-direction: column; flex-shrink: 0; }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 24px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
        .logo-box { background: rgba(255,255,255,.15); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px; color: #fff; }
        .nav { padding: 16px 0; flex: 1; }
        .nav-section { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: 1px; padding: 16px 20px 6px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: rgba(255,255,255,.6); font-size: 14px; font-weight: 500; text-decoration: none; border-left: 3px solid transparent; transition: all .15s; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,.08); }
        .nav-item.active { color: #fff; background: rgba(242,107,29,.18); border-left-color: #F26B1D; }
        .main { flex: 1; display: flex; flex-direction: column; }
        .topbar { background: #fff; border-bottom: 1px solid #E4DDD4; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
        .topbar h1 { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; }
        .user-pill { background: #E8F0F6; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #0E3A5C; }
        .content { padding: 32px; }
        .greeting { margin-bottom: 28px; }
        .greeting h2 { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .greeting p { color: #5C6B7A; font-size: 14px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .kpi { background: #fff; border-radius: 12px; padding: 20px; border-top: 3px solid #E4DDD4; }
        .kpi.oranje { border-top-color: #F26B1D; }
        .kpi.groen  { border-top-color: #1A7F52; }
        .kpi.rood   { border-top-color: #C03020; }
        .kpi.blauw  { border-top-color: #0E3A5C; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #5C6B7A; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .kpi-value { font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 800; }
        .kpi-sub { font-size: 12px; color: #5C6B7A; margin-top: 4px; }
        .panel { background: #fff; border-radius: 12px; padding: 24px; }
        .panel-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 16px; }
        .quick-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .quick-link { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: #F7F3EE; border-radius: 12px; text-decoration: none; color: #1A2633; transition: all .15s; border: 1.5px solid #E4DDD4; }
        .quick-link:hover { border-color: #F26B1D; background: #FDEADD; }
        .quick-link .icon { font-size: 28px; }
        .quick-link .label { font-size: 13px; font-weight: 600; }
      `}</style>
      <div className="layout">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-box">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M11 14 L13 17 L15 14" stroke="#F26B1D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="13" cy="10" r="2" fill="#F26B1D"/>
              </svg>
            </div>
            <span className="logo-text">Stagepoort</span>
          </div>
          <nav className="nav">
            <div className="nav-section">Hoofdmenu</div>
            <Link className="nav-item active" href="/dashboard/coordinator">📊 Dashboard</Link>
            <Link className="nav-item" href="/dashboard/coordinator/studenten">👥 Studenten</Link>
            <Link className="nav-item" href="#">🔗 Koppelingen</Link>
            <Link className="nav-item" href="#">📋 Opdrachten</Link>
            <div className="nav-section">Beheer</div>
            <Link className="nav-item" href="#">🏢 Bedrijven</Link>
            <Link className="nav-item" href="#">📅 Schooljaren</Link>
            <Link className="nav-item" href="#">⚙️ Instellingen</Link>
          </nav>
        </div>
        <div className="main">
          <div className="topbar">
            <h1>Dashboard</h1>
            <div className="user-pill">👤 {profile.name}</div>
          </div>
          <div className="content">
            <div className="greeting">
              <h2>Goedemiddag, {profile.name.split(' ')[0]} 👋</h2>
              <p>Hier is een overzicht van het stageproces vandaag.</p>
            </div>
            <div className="kpi-grid">
              <div className="kpi blauw">
                <div className="kpi-label">Studenten</div>
                <div className="kpi-value">{totalStudents ?? 0}</div>
                <div className="kpi-sub">Ingeschreven dit jaar</div>
              </div>
              <div className="kpi groen">
                <div className="kpi-label">Actieve stages</div>
                <div className="kpi-value">{activePlacements ?? 0}</div>
                <div className="kpi-sub">Momenteel bezig</div>
              </div>
              <div className="kpi oranje">
                <div className="kpi-label">Uren te keuren</div>
                <div className="kpi-value">{pendingHours ?? 0}</div>
                <div className="kpi-sub">Wacht op goedkeuring</div>
              </div>
              <div className="kpi rood">
                <div className="kpi-label">Aandacht nodig</div>
                <div className="kpi-value">0</div>
                <div className="kpi-sub">Achterstand of probleem</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">⚡ Snel navigeren</div>
              <div className="quick-links">
                <Link className="quick-link" href="/dashboard/coordinator/studenten">
                  <span className="icon">👥</span>
                  <span className="label">Studenten</span>
                </Link>
                <Link className="quick-link" href="#">
                  <span className="icon">🔗</span>
                  <span className="label">Koppelingen</span>
                </Link>
                <Link className="quick-link" href="#">
                  <span className="icon">📋</span>
                  <span className="label">Opdrachten</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
