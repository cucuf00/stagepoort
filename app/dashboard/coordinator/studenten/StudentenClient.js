'use client'
import { useState } from 'react'
import Link from 'next/link'

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F7F3EE; font-family: 'Inter', sans-serif; color: #1A2633; }

.layout { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar { width: 240px; background: #0E3A5C; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 24px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
.logo-box { background: rgba(255,255,255,.15); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.logo-text { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px; color: #fff; }
.nav { padding: 16px 0; flex: 1; }
.nav-section { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: 1px; padding: 16px 20px 6px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: rgba(255,255,255,.6); font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; text-decoration: none; border-left: 3px solid transparent; }
.nav-item:hover { color: #fff; background: rgba(255,255,255,.08); }
.nav-item.active { color: #fff; background: rgba(242,107,29,.18); border-left-color: #F26B1D; }

/* Main */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar { background: #fff; border-bottom: 1px solid #E4DDD4; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.topbar h1 { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; }
.user-pill { display: flex; align-items: center; gap: 8px; background: #E8F0F6; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #0E3A5C; white-space: nowrap; }
.content { padding: 28px 32px; flex: 1; }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 10px 14px 10px 38px; border: 1.5px solid #E4DDD4; border-radius: 10px; font-size: 14px; font-family: 'Inter', sans-serif; color: #1A2633; background: #fff; outline: none; transition: border .2s; }
.search-wrap input:focus { border-color: #0E3A5C; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; pointer-events: none; }
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-tab { padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1.5px solid #E4DDD4; background: #fff; color: #5C6B7A; cursor: pointer; transition: all .15s; }
.filter-tab:hover { border-color: #0E3A5C; color: #0E3A5C; }
.filter-tab.active { background: #0E3A5C; border-color: #0E3A5C; color: #fff; }
.btn-oranje { padding: 9px 18px; background: #F26B1D; border: none; border-radius: 10px; color: #fff; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap; }
.btn-oranje:hover { background: #D4500E; }
.btn-oranje:active { transform: scale(.98); }

/* Stats row */
.stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-pill { background: #fff; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; color: #5C6B7A; border: 1.5px solid #E4DDD4; display: flex; align-items: center; gap: 8px; }
.stat-pill span.num { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800; color: #1A2633; }

/* Tabel */
.tabel-wrap { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #E4DDD4; }
.tabel-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 80px; gap: 0; padding: 12px 20px; background: #F7F3EE; border-bottom: 1px solid #E4DDD4; font-size: 12px; font-weight: 700; color: #5C6B7A; text-transform: uppercase; letter-spacing: .5px; }
.student-rij { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 80px; gap: 0; padding: 14px 20px; border-bottom: 1px solid #EDE8E2; align-items: center; transition: background .12s; cursor: pointer; }
.student-rij:last-child { border-bottom: none; }
.student-rij:hover { background: #F7F3EE; }
.student-rij.expanded { background: #F7F3EE; }

.student-naam { display: flex; align-items: center; gap: 10px; }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: #E8F0F6; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #0E3A5C; flex-shrink: 0; }
.naam-tekst { font-weight: 600; font-size: 14px; }
.email-tekst { font-size: 12px; color: #5C6B7A; margin-top: 1px; }

.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-groen { background: #E2F4EC; color: #1A7F52; }
.badge-oranje { background: #FDEADD; color: #F26B1D; }
.badge-rood { background: #FAEAE7; color: #C03020; }
.badge-grijs { background: #F0EDE8; color: #5C6B7A; }
.badge-blauw { background: #E8F0F6; color: #0E3A5C; }

.cel-tekst { font-size: 13px; color: #5C6B7A; }
.acties { display: flex; gap: 6px; }
.icon-btn { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid #E4DDD4; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: all .15s; }
.icon-btn:hover { border-color: #0E3A5C; background: #E8F0F6; }

/* Tijdlijn uitklap */
.tijdlijn-wrap { grid-column: 1 / -1; padding: 16px 20px 20px 64px; border-top: 1px solid #EDE8E2; background: #FAFAF8; }
.tijdlijn-titel { font-size: 12px; font-weight: 700; color: #5C6B7A; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.tijdlijn { display: flex; gap: 0; position: relative; }
.tijdlijn::before { content: ''; position: absolute; top: 14px; left: 14px; right: 14px; height: 2px; background: #E4DDD4; z-index: 0; }
.tijdlijn-stap { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
.stap-cirkel { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid #E4DDD4; background: #fff; }
.stap-cirkel.klaar { background: #1A7F52; border-color: #1A7F52; color: #fff; }
.stap-cirkel.actief { background: #F26B1D; border-color: #F26B1D; color: #fff; }
.stap-cirkel.wacht { background: #fff; border-color: #E4DDD4; color: #5C6B7A; }
.stap-label { font-size: 11px; color: #5C6B7A; margin-top: 6px; text-align: center; font-weight: 500; }

/* Leeg scherm */
.leeg { text-align: center; padding: 60px 20px; color: #5C6B7A; }
.leeg .icon { font-size: 40px; margin-bottom: 12px; }
.leeg p { font-size: 14px; }

/* Selectie bar */
.selectie-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1A2633; color: #fff; padding: 12px 24px; border-radius: 12px; display: flex; align-items: center; gap: 16px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 100; }
.selectie-bar button { padding: 7px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
.btn-remind { background: #F26B1D; color: #fff; }
.btn-remind:hover { background: #D4500E; }
.btn-cancel { background: rgba(255,255,255,.15); color: #fff; }
.btn-cancel:hover { background: rgba(255,255,255,.25); }
`

const STAPPEN = ['Intake', 'Gekoppeld', 'Gestart', 'Halverwege', 'Afgerond']

function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function StatusBadge({ status }) {
  const map = {
    actief:     { label: 'Actief',      cls: 'badge-groen' },
    gestart:    { label: 'Gestart',     cls: 'badge-blauw' },
    wacht:      { label: 'Wacht',       cls: 'badge-oranje' },
    aandacht:   { label: '⚠️ Aandacht', cls: 'badge-rood' },
    afgerond:   { label: 'Afgerond',    cls: 'badge-grijs' },
  }
  const s = map[status] || { label: 'Onbekend', cls: 'badge-grijs' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

function Tijdlijn({ stap = 2 }) {
  return (
    <div className="tijdlijn-wrap">
      <div className="tijdlijn-titel">Stagevoortgang</div>
      <div className="tijdlijn">
        {STAPPEN.map((naam, i) => {
          const cls = i < stap ? 'klaar' : i === stap ? 'actief' : 'wacht'
          return (
            <div key={naam} className="tijdlijn-stap">
              <div className={`stap-cirkel ${cls}`}>
                {i < stap ? '✓' : i + 1}
              </div>
              <div className="stap-label">{naam}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Demo studenten als er nog geen echte zijn
const DEMO = [
  { id: 'd1', name: 'Ayse Yilmaz',    email: 'ayse@school.nl',   klas: 'BBL-2A', status: 'actief',   stap: 3, uren: 120 },
  { id: 'd2', name: 'Kevin de Boer',  email: 'kevin@school.nl',  klas: 'BOL-3B', status: 'wacht',    stap: 1, uren: 0   },
  { id: 'd3', name: 'Sara Ahmadi',    email: 'sara@school.nl',   klas: 'BBL-2A', status: 'aandacht', stap: 2, uren: 40  },
  { id: 'd4', name: 'Daan Pietersen', email: 'daan@school.nl',   klas: 'BOL-4A', status: 'afgerond', stap: 5, uren: 240 },
  { id: 'd5', name: 'Fatima El Idrissi', email: 'fatima@school.nl', klas: 'BOL-3B', status: 'actief', stap: 3, uren: 98 },
  { id: 'd6', name: 'Thomas van Dijk', email: 'thomas@school.nl', klas: 'BBL-2B', status: 'gestart', stap: 2, uren: 16 },
]

export default function StudentenClient({ studenten, coordinator }) {
  const [zoek, setZoek] = useState('')
  const [klasFilter, setKlasFilter] = useState('alle')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [uitgeklapt, setUitgeklapt] = useState(null)
  const [geselecteerd, setGeselecteerd] = useState([])

  // Gebruik demo data als er nog geen echte studenten zijn
  const bronData = studenten.length > 0
    ? studenten.map(s => ({ ...s, klas: s.klas || 'Onbekend', status: s.status || 'wacht', stap: s.stap || 1, uren: s.uren || 0 }))
    : DEMO

  // Unieke klassen
  const klassen = ['alle', ...new Set(bronData.map(s => s.klas).filter(Boolean))]

  // Gefilterd
  const gefilterd = bronData.filter(s => {
    const zoekMatch = !zoek || s.name?.toLowerCase().includes(zoek.toLowerCase()) || s.email?.toLowerCase().includes(zoek.toLowerCase())
    const klasMatch = klasFilter === 'alle' || s.klas === klasFilter
    const statusMatch = statusFilter === 'alle' || s.status === statusFilter
    return zoekMatch && klasMatch && statusMatch
  })

  // Stats
  const totaal  = bronData.length
  const actief  = bronData.filter(s => s.status === 'actief' || s.status === 'gestart').length
  const aandacht = bronData.filter(s => s.status === 'aandacht').length

  function toggleSelecteer(id) {
    setGeselecteerd(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <>
      <style>{STYLES}</style>
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
            <Link className="nav-item" href="/dashboard/coordinator">📊 Dashboard</Link>
            <Link className="nav-item active" href="/dashboard/coordinator/studenten">👥 Studenten</Link>
            <Link className="nav-item" href="#">🔗 Koppelingen</Link>
            <Link className="nav-item" href="#">📋 Opdrachten</Link>
            <div className="nav-section">Beheer</div>
            <Link className="nav-item" href="#">⚙️ Instellingen</Link>
            <Link className="nav-item" href="#">📅 Periodes</Link>
          </nav>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <h1>Studenten</h1>
            <div className="user-pill">👤 {coordinator?.name || 'Coördinator'}</div>
          </div>

          <div className="content">
            {/* Toolbar */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Zoek op naam of e-mail..."
                  value={zoek}
                  onChange={e => setZoek(e.target.value)}
                />
              </div>
              <div className="filter-tabs">
                {klassen.map(k => (
                  <button key={k} className={`filter-tab ${klasFilter === k ? 'active' : ''}`} onClick={() => setKlasFilter(k)}>
                    {k === 'alle' ? 'Alle klassen' : k}
                  </button>
                ))}
              </div>
              <div className="filter-tabs">
                {['alle','actief','wacht','aandacht','afgerond'].map(s => (
                  <button key={s} className={`filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                    {s === 'alle' ? 'Alle statussen' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn-oranje">+ Student toevoegen</button>
            </div>

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-pill"><span className="num">{totaal}</span> studenten totaal</div>
              <div className="stat-pill"><span className="num" style={{color:'#1A7F52'}}>{actief}</span> actief bezig</div>
              <div className="stat-pill"><span className="num" style={{color:'#C03020'}}>{aandacht}</span> vereisen aandacht</div>
              <div className="stat-pill"><span className="num">{gefilterd.length}</span> resultaten zichtbaar</div>
            </div>

            {/* Tabel */}
            <div className="tabel-wrap">
              <div className="tabel-header">
                <div>Student</div>
                <div>Klas</div>
                <div>Status</div>
                <div>Uren</div>
                <div>Voortgang</div>
                <div></div>
              </div>

              {gefilterd.length === 0 ? (
                <div className="leeg">
                  <div className="icon">🔍</div>
                  <p>Geen studenten gevonden met deze filters.</p>
                </div>
              ) : (
                gefilterd.map(student => (
                  <>
                    <div
                      key={student.id}
                      className={`student-rij ${uitgeklapt === student.id ? 'expanded' : ''}`}
                      onClick={() => setUitgeklapt(uitgeklapt === student.id ? null : student.id)}
                    >
                      <div className="student-naam">
                        <input
                          type="checkbox"
                          checked={geselecteerd.includes(student.id)}
                          onClick={e => { e.stopPropagation(); toggleSelecteer(student.id) }}
                          style={{marginRight: 4, accentColor: '#0E3A5C'}}
                        />
                        <div className="avatar">{getInitialen(student.name)}</div>
                        <div>
                          <div className="naam-tekst">{student.name}</div>
                          <div className="email-tekst">{student.email}</div>
                        </div>
                      </div>
                      <div className="cel-tekst">{student.klas || '—'}</div>
                      <div><StatusBadge status={student.status} /></div>
                      <div className="cel-tekst">{student.uren || 0} uur</div>
                      <div className="cel-tekst">Stap {Math.min(student.stap || 1, 5)} / 5</div>
                      <div className="acties" onClick={e => e.stopPropagation()}>
                        <button className="icon-btn" title="Bewerken">✏️</button>
                        <button className="icon-btn" title="Mail sturen">📧</button>
                      </div>
                    </div>

                    {uitgeklapt === student.id && (
                      <div key={`tl-${student.id}`} style={{display:'grid', gridColumn:'1/-1'}}>
                        <Tijdlijn stap={(student.stap || 1) - 1} />
                      </div>
                    )}
                  </>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selectie bar */}
      {geselecteerd.length > 0 && (
        <div className="selectie-bar">
          <span>{geselecteerd.length} student{geselecteerd.length > 1 ? 'en' : ''} geselecteerd</span>
          <button className="btn-remind">📧 Herinnering sturen</button>
          <button className="btn-cancel" onClick={() => setGeselecteerd([])}>✕ Deselecteer</button>
        </div>
      )}
    </>
  )
}
