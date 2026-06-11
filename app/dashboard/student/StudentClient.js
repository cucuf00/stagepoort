'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0D0D0F;
  --surface:  #17171A;
  --surface2: #1F1F24;
  --border:   #2A2A30;
  --oranje:   #F26B1D;
  --oranje-d: #D4500E;
  --oranje-l: rgba(242,107,29,.15);
  --groen:    #22C55E;
  --groen-l:  rgba(34,197,94,.15);
  --blauw:    #3B82F6;
  --blauw-l:  rgba(59,130,246,.15);
  --paars:    #A855F7;
  --paars-l:  rgba(168,85,247,.15);
  --tekst:    #F0F0F2;
  --tekst-2:  #8A8A94;
  --r:        14px;
}

body { background: var(--bg); font-family: 'Inter', sans-serif; color: var(--tekst); min-height: 100vh; }

/* Bottom nav */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border); display: flex; z-index: 100; padding-bottom: env(safe-area-inset-bottom); }
.nav-tab { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px 4px 8px; gap: 3px; cursor: pointer; transition: color .15s; color: var(--tekst-2); border: none; background: none; }
.nav-tab.active { color: var(--oranje); }
.nav-tab .icon { font-size: 20px; }
.nav-tab .label { font-size: 10px; font-weight: 600; }

/* Pagina's */
.pagina { display: none; padding: 20px 16px 90px; max-width: 480px; margin: 0 auto; }
.pagina.actief { display: block; }

/* Header */
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-top: 8px; }
.header-logo { display: flex; align-items: center; gap: 8px; }
.logo-box-dark { background: var(--oranje); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.logo-naam { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 16px; }
.avatar-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--surface2); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; }

/* Hero card */
.hero { background: linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #1a0a00 100%); border: 1px solid rgba(242,107,29,.3); border-radius: var(--r); padding: 20px; margin-bottom: 16px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -40px; right: -40px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(242,107,29,.3) 0%, transparent 70%); }
.hero-naam { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.hero-sub { color: var(--tekst-2); font-size: 13px; margin-bottom: 20px; }
.hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.hero-stat { background: rgba(0,0,0,.3); border-radius: 10px; padding: 12px; text-align: center; }
.hero-stat .val { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; color: var(--oranje); }
.hero-stat .lbl { font-size: 11px; color: var(--tekst-2); margin-top: 2px; font-weight: 600; }

/* Level bar */
.level-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 16px; }
.level-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.level-titel { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.level-badge { background: var(--oranje-l); color: var(--oranje); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.xp-tekst { font-size: 12px; color: var(--tekst-2); }
.balk { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.balk-fill { height: 100%; background: linear-gradient(90deg, var(--oranje), #ff9a3c); border-radius: 4px; transition: width .6s ease; }

/* Streak */
.streak-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 16px; }
.streak-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.streak-titel { font-size: 13px; font-weight: 700; }
.streak-vuur { font-size: 24px; }
.week-dots { display: flex; gap: 8px; justify-content: center; }
.dag-dot { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.dot { width: 36px; height: 36px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all .2s; }
.dot.klaar { background: var(--oranje); }
.dot.vandaag { background: var(--oranje-l); border: 2px solid var(--oranje); }
.dag-naam { font-size: 10px; color: var(--tekst-2); font-weight: 600; }

/* Sectie titel */
.sectie-titel { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 12px; margin-top: 20px; display: flex; align-items: center; gap: 8px; justify-content: space-between; }
.sectie-meer { font-size: 12px; color: var(--oranje); font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }

/* Badges grid */
.badges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
.badge-item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all .2s; }
.badge-item.behaald { border-color: var(--oranje); background: var(--oranje-l); }
.badge-item.behaald .badge-icon { filter: none; }
.badge-icon { font-size: 24px; filter: grayscale(1) opacity(.4); }
.badge-naam { font-size: 10px; font-weight: 600; text-align: center; color: var(--tekst-2); }
.badge-item.behaald .badge-naam { color: var(--tekst); }

/* Route */
.route-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 16px; }
.route-stappen { display: flex; flex-direction: column; gap: 0; }
.route-stap { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; position: relative; }
.route-stap:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 38px; width: 2px; height: calc(100% - 10px); background: var(--border); }
.stap-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; border: 2px solid var(--border); background: var(--surface2); margin-top: 2px; }
.stap-dot.klaar { background: var(--groen); border-color: var(--groen); }
.stap-dot.actief { background: var(--oranje); border-color: var(--oranje); animation: pulse 2s infinite; }
.stap-dot.wacht { background: var(--surface2); }
@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(242,107,29,.4)} 50%{box-shadow:0 0 0 6px rgba(242,107,29,0)} }
.stap-info { flex: 1; }
.stap-naam { font-size: 14px; font-weight: 600; }
.stap-sub { font-size: 12px; color: var(--tekst-2); margin-top: 2px; }
.stap-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-top: 4px; display: inline-block; }
.stap-badge.klaar { background: var(--groen-l); color: var(--groen); }
.stap-badge.actief { background: var(--oranje-l); color: var(--oranje); }
.stap-badge.wacht { background: var(--border); color: var(--tekst-2); }

/* Uren tab */
.uren-form { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 16px; }
.form-titel { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.form-row { margin-bottom: 14px; }
.form-label { font-size: 12px; font-weight: 700; color: var(--tekst-2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; display: block; }
.form-input { width: 100%; padding: 12px 14px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 10px; color: var(--tekst); font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border .2s; }
.form-input:focus { border-color: var(--oranje); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.btn-submit { width: 100%; padding: 14px; background: var(--oranje); border: none; border-radius: 12px; color: #fff; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; transition: background .15s, transform .1s; margin-top: 4px; }
.btn-submit:hover { background: var(--oranje-d); }
.btn-submit:active { transform: scale(.98); }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }

.uren-history { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.uren-rij { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.uren-rij:last-child { border-bottom: none; }
.uren-datum { font-size: 13px; font-weight: 600; }
.uren-omschr { font-size: 12px; color: var(--tekst-2); margin-top: 2px; }
.uren-aantal { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800; color: var(--oranje); }
.uren-status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-wacht { background: #F26B1D; }
.dot-ok { background: var(--groen); }

/* Opdrachten tab */
.opdracht-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all .2s; }
.opdracht-card:hover { border-color: var(--oranje); background: var(--surface2); }
.opdracht-card.open { border-color: var(--oranje); }
.opdracht-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.opdracht-naam { font-size: 15px; font-weight: 700; }
.opdracht-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.ob-open { background: var(--oranje-l); color: var(--oranje); }
.ob-klaar { background: var(--groen-l); color: var(--groen); }
.ob-te-laat { background: rgba(239,68,68,.15); color: #EF4444; }
.opdracht-deadline { font-size: 12px; color: var(--tekst-2); }
.opdracht-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
.opdracht-vraag { font-size: 13px; color: var(--tekst-2); margin-bottom: 8px; }
textarea.form-input { resize: vertical; min-height: 80px; }
.btn-inleveren { padding: 10px 20px; background: var(--oranje); border: none; border-radius: 10px; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; margin-top: 8px; }

/* Success toast */
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--groen); color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; z-index: 999; animation: slideDown .3s ease; }
@keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
`

const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const BADGES_DATA = [
  { icon: '🔥', naam: 'Eerste dag',  behaald: true },
  { icon: '⚡', naam: '7-daagse streak', behaald: true },
  { icon: '📋', naam: 'Eerste opdracht', behaald: true },
  { icon: '⏰', naam: '40 uur',      behaald: true },
  { icon: '🏆', naam: '100 uur',     behaald: false },
  { icon: '🌟', naam: 'Top student', behaald: false },
  { icon: '💼', naam: 'Pro stage',   behaald: false },
  { icon: '🎯', naam: 'Perfect week',behaald: false },
]

const ROUTE_STAPPEN = [
  { naam: 'Intake gesprek',     sub: 'Afgerond op 3 sep',      status: 'klaar' },
  { naam: 'Stage gekoppeld',    sub: 'Bakkerij De Boer, Amsterdam', status: 'klaar' },
  { naam: 'Stage gestart',      sub: 'Bezig — week 8 van 20', status: 'actief' },
  { naam: 'Tussentijdse beoordeling', sub: 'Over 6 weken',    status: 'wacht' },
  { naam: 'Eindbeoordeling',    sub: 'Nog niet gepland',       status: 'wacht' },
]

const UREN_HISTORY = [
  { datum: 'Gisteren', omschr: 'Ochtend shift, kassa en voorraad', uren: 8, status: 'ok' },
  { datum: 'Ma 9 jun', omschr: 'Bakkerij productie', uren: 8, status: 'ok' },
  { datum: 'Vr 6 jun', omschr: 'Klantcontact & administratie', uren: 6, status: 'wacht' },
  { datum: 'Do 5 jun', omschr: 'Voorraadbeheer', uren: 8, status: 'ok' },
]

const OPDRACHTEN = [
  { id: 1, naam: 'Werkproces beschrijving', deadline: '20 jun', status: 'open',   vraag: 'Beschrijf een werkproces dat je deze week hebt uitgevoerd. Wat ging goed en wat kon beter?' },
  { id: 2, naam: 'Reflectieverslag week 4', deadline: '13 jun', status: 'open',   vraag: 'Reflecteer op je ervaringen van de afgelopen week. Wat heb je geleerd?' },
  { id: 3, naam: 'Introductie bedrijf',     deadline: '1 mei',  status: 'klaar',  vraag: 'Beschrijf het bedrijf waar je stage loopt.' },
]

export default function StudentClient({ user, email }) {
  const [tab, setTab]           = useState('home')
  const [openOpdracht, setOpenOpdracht] = useState(null)
  const [urenForm, setUrenForm] = useState({ datum: '', van: '', tot: '', omschrijving: '' })
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState('')
  const router = useRouter()

  const naam = user?.name || email?.split('@')[0] || 'Student'
  const voornaam = naam.split(' ')[0]
  const xp = 340
  const xpMax = 500
  const streak = 5
  const uren = 120

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleUrenSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setUrenForm({ datum: '', van: '', tot: '', omschrijving: '' })
    showToast('✅ Uren ingediend!')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{STYLES}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* HOME TAB */}
      <div className={`pagina ${tab === 'home' ? 'actief' : ''}`}>
        <div className="header">
          <div className="header-logo">
            <div className="logo-box-dark">
              <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
                <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M11 14 L13 17 L15 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="13" cy="10" r="2" fill="white"/>
              </svg>
            </div>
            <span className="logo-naam">Stagepoort</span>
          </div>
          <button className="avatar-btn" onClick={handleLogout} title="Uitloggen">👤</button>
        </div>

        {/* Hero */}
        <div className="hero">
          <div className="hero-naam">Hey {voornaam}! 👋</div>
          <div className="hero-sub">Je doet het geweldig — ga zo door!</div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="val">🔥{streak}</div>
              <div className="lbl">Daagse streak</div>
            </div>
            <div className="hero-stat">
              <div className="val">{uren}</div>
              <div className="lbl">Uren gedaan</div>
            </div>
            <div className="hero-stat">
              <div className="val">{xp}</div>
              <div className="lbl">XP punten</div>
            </div>
          </div>
        </div>

        {/* Level */}
        <div className="level-wrap">
          <div className="level-header">
            <div className="level-titel">⚡ Level voortgang <span className="level-badge">Level 4</span></div>
            <div className="xp-tekst">{xp} / {xpMax} XP</div>
          </div>
          <div className="balk">
            <div className="balk-fill" style={{width: `${(xp/xpMax)*100}%`}} />
          </div>
        </div>

        {/* Streak week */}
        <div className="streak-card">
          <div className="streak-header">
            <div className="streak-titel">🔥 Streak deze week</div>
            <div className="streak-vuur">{streak} dagen</div>
          </div>
          <div className="week-dots">
            {DAGEN.map((dag, i) => (
              <div key={dag} className="dag-dot">
                <div className={`dot ${i < streak ? 'klaar' : i === streak ? 'vandaag' : ''}`}>
                  {i < streak ? '✓' : i === streak ? '👆' : ''}
                </div>
                <div className="dag-naam">{dag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="sectie-titel">
          🏅 Mijn badges
          <span className="sectie-meer">Alles zien →</span>
        </div>
        <div className="badges-grid">
          {BADGES_DATA.map(b => (
            <div key={b.naam} className={`badge-item ${b.behaald ? 'behaald' : ''}`}>
              <div className="badge-icon">{b.icon}</div>
              <div className="badge-naam">{b.naam}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ROUTE TAB */}
      <div className={`pagina ${tab === 'route' ? 'actief' : ''}`}>
        <div className="header">
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18}}>Mijn stageroute</div>
        </div>
        <div className="route-wrap">
          <div className="route-stappen">
            {ROUTE_STAPPEN.map((stap, i) => (
              <div key={i} className="route-stap">
                <div className={`stap-dot ${stap.status}`}>
                  {stap.status === 'klaar' ? '✓' : i + 1}
                </div>
                <div className="stap-info">
                  <div className="stap-naam">{stap.naam}</div>
                  <div className="stap-sub">{stap.sub}</div>
                  <span className={`stap-badge ${stap.status}`}>
                    {stap.status === 'klaar' ? 'Afgerond' : stap.status === 'actief' ? 'Bezig' : 'Nog niet'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UREN TAB */}
      <div className={`pagina ${tab === 'uren' ? 'actief' : ''}`}>
        <div className="header">
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18}}>Uren registreren</div>
        </div>

        <div className="uren-form">
          <div className="form-titel">➕ Nieuwe uren indienen</div>
          <form onSubmit={handleUrenSubmit}>
            <div className="form-row">
              <label className="form-label">Datum</label>
              <input type="date" className="form-input" value={urenForm.datum}
                onChange={e => setUrenForm({...urenForm, datum: e.target.value})} required />
            </div>
            <div className="form-row-2">
              <div>
                <label className="form-label">Van</label>
                <input type="time" className="form-input" value={urenForm.van}
                  onChange={e => setUrenForm({...urenForm, van: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Tot</label>
                <input type="time" className="form-input" value={urenForm.tot}
                  onChange={e => setUrenForm({...urenForm, tot: e.target.value})} required />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Wat heb je gedaan?</label>
              <textarea className="form-input" rows={3} placeholder="Bijv: voorraad beheren, klanten helpen..."
                value={urenForm.omschrijving}
                onChange={e => setUrenForm({...urenForm, omschrijving: e.target.value})} required />
            </div>
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? 'Versturen...' : '✅ Uren indienen'}
            </button>
          </form>
        </div>

        <div className="sectie-titel" style={{marginTop:0}}>📋 Ingediende uren</div>
        <div className="uren-history">
          {UREN_HISTORY.map((u, i) => (
            <div key={i} className="uren-rij">
              <div>
                <div className="uren-datum">{u.datum}</div>
                <div className="uren-omschr">{u.omschr}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div className={`uren-status-dot ${u.status === 'ok' ? 'dot-ok' : 'dot-wacht'}`} />
                <div className="uren-aantal">{u.uren}u</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OPDRACHTEN TAB */}
      <div className={`pagina ${tab === 'opdrachten' ? 'actief' : ''}`}>
        <div className="header">
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18}}>Mijn opdrachten</div>
        </div>
        {OPDRACHTEN.map(o => (
          <div key={o.id} className={`opdracht-card ${openOpdracht === o.id ? 'open' : ''}`}
            onClick={() => setOpenOpdracht(openOpdracht === o.id ? null : o.id)}>
            <div className="opdracht-top">
              <div className="opdracht-naam">{o.naam}</div>
              <span className={`opdracht-badge ${o.status === 'klaar' ? 'ob-klaar' : 'ob-open'}`}>
                {o.status === 'klaar' ? '✓ Ingeleverd' : '📝 Open'}
              </span>
            </div>
            <div className="opdracht-deadline">⏰ Deadline: {o.deadline}</div>
            {openOpdracht === o.id && o.status !== 'klaar' && (
              <div className="opdracht-body">
                <div className="opdracht-vraag">{o.vraag}</div>
                <textarea className="form-input" rows={4} placeholder="Schrijf hier je antwoord..." />
                <button className="btn-inleveren" onClick={e => { e.stopPropagation(); showToast('✅ Opdracht ingeleverd!') }}>
                  Inleveren →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="bottom-nav">
        {[
          { key: 'home',       icon: '🏠', label: 'Home' },
          { key: 'route',      icon: '🗺️',  label: 'Route' },
          { key: 'uren',       icon: '⏱️',  label: 'Uren' },
          { key: 'opdrachten', icon: '📋', label: 'Opdrachten' },
        ].map(t => (
          <button key={t.key} className={`nav-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="icon">{t.icon}</span>
            <span className="label">{t.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
