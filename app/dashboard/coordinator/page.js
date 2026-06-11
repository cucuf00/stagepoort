import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoordinatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, role')
    .eq('email', user.email)
    .single()

  if (userData?.role !== 'coordinator') redirect('/login')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F3EE; font-family: 'Inter', sans-serif; color: #1A2633; }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: #0E3A5C; display: flex; flex-direction: column; padding: 0; flex-shrink: 0; }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 24px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
        .logo-box { background: rgba(255,255,255,.15); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px; color: #fff; }
        .nav { padding: 16px 0; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: rgba(255,255,255,.6); font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; text-decoration: none; border-left: 3px solid transparent; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,.08); }
        .nav-item.active { color: #fff; background: rgba(242,107,29,.18); border-left: 3px solid #F26B1D; }
        .nav-section { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: 1px; padding: 16px 20px 6px; }
        .main { flex: 1; display: flex; flex-direction: column; overflow: auto; }
        .topbar { background: #fff; border-bottom: 1px solid #E4DDD4; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
        .topbar h1 { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; }
        .user-pill { display: flex; align-items: center; gap: 8px; background: #E8F0F6; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #0E3A5C; }
        .content { padding: 32px; }
        .greeting { margin-bottom: 28px; }
        .greeting h2 { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .greeting p { color: #5C6B7A; font-size: 14px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .kpi { background: #fff; border-radius: 12px; padding: 20px; border-top: 3px solid #E4DDD4; }
        .kpi.oranje { border-top-color: #F26B1D; }
        .kpi.groen { border-top-color: #1A7F52; }
        .kpi.rood { border-top-color: #C03020; }
        .kpi.blauw { border-top-color: #0E3A5C; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #5C6B7A; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .kpi-value { font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 800; color: #1A2633; }
        .kpi-sub { font-size: 12px; color: #5C6B7A; margin-top: 4px; }
        .panel { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .panel-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-oranje { background: #FDEADD; color: #F26B1D; }
        .badge-groen { background: #E2F4EC; color: #1A7F52; }
        .badge-rood { background: #FAEAE7; color: #C03020; }
        .badge-blauw { background: #E8F0F6; color: #0E3A5C; }
        .coming-soon { text-align: center; padding: 48px 20px; color: #5C6B7A; }
        .coming-soon .icon { font-size: 40px; margin-bottom: 12px; }
        .coming-soon p { font-size: 14px; }
      `}</style>
      <div className="layout">
        {/* Sidebar */}
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
            <a className="nav-item active" href="/dashboard/coordinator">📊 Dashboard</a>
            <a className="nav-item" href="#">👥 Studenten</a>
            <a className="nav-item" href="#">🔗 Koppelingen</a>
            <a className="nav-item" href="#">📋 Opdrachten</a>
            <div className="nav-section">Beheer</div>
            <a className="nav-item" href="#">⚙️ Instellingen</a>
            <a className="nav-item" href="#">📅 Periodes</a>
          </nav>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <h1>Dashboard</h1>
            <div className="user-pill">👤 {userData?.name || user.email}</div>
          </div>
          <div className="content">
            <div className="greeting">
              <h2>Goedemorgen, {userData?.name?.split(' ')[0] || 'Coördinator'} 👋</h2>
              <p>Hier is een overzicht van het stageproces vandaag.</p>
            </div>

            {/* KPI tiles */}
            <div className="kpi-grid">
              <div className="kpi blauw">
                <div className="kpi-label">Actieve studenten</div>
                <div className="kpi-value">—</div>
                <div className="kpi-sub">Nog geen data</div>
              </div>
              <div className="kpi oranje">
                <div className="kpi-label">Openstaande uren</div>
                <div className="kpi-value">—</div>
                <div className="kpi-sub">Wacht op goedkeuring</div>
              </div>
              <div className="kpi groen">
                <div className="kpi-label">Goedgekeurd</div>
                <div className="kpi-value">—</div>
                <div className="kpi-sub">Deze periode</div>
              </div>
              <div className="kpi rood">
                <div className="kpi-label">Aandacht nodig</div>
                <div className="kpi-value">—</div>
                <div className="kpi-sub">Achterstand of probleem</div>
              </div>
            </div>

            {/* Panels */}
            <div className="panel">
              <div className="panel-title">🚀 Platform in opbouw</div>
              <div className="coming-soon">
                <div className="icon">🏗️</div>
                <p>De eerste versie van Stagepoort is live!<br/>De volgende modules worden stap voor stap gebouwd.</p>
                <div style={{marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center'}}>
                  <span className="badge badge-groen">✅ Auth & login</span>
                  <span className="badge badge-groen">✅ Rol-routing</span>
                  <span className="badge badge-oranje">🔜 Studentenoverzicht</span>
                  <span className="badge badge-oranje">🔜 Koppelingen</span>
                  <span className="badge badge-blauw">📋 Opdrachten</span>
                  <span className="badge badge-blauw">📋 Urenregistratie</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
