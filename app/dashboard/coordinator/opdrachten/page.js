'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function fmtDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#1A2633', outline: 'none', background: '#fff' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5C6B7A', marginBottom: 4 }

export default function OpdrachtenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodes, setPeriodes] = useState([])
  const [actievePeriode, setActievePeriode] = useState(null)
  const [opdrachten, setOpdrachten] = useState([])
  const [evalMomenten, setEvalMomenten] = useState([])
  const [badges, setBadges] = useState([])
  const [openEditor, setOpenEditor] = useState(null)
  const [openEval, setOpenEval] = useState(null)
  const [bezig, setBezig] = useState({})
  const [toast, setToast] = useState(null)
  const [sjablonen, setSjablonen] = useState([])
  const [sjabloonBezig, setSjabloonBezig] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)

      const [{ data: pers }, { data: opdr }, { data: eval_ }, { data: bdgs }, { data: sjabl }] = await Promise.all([
        supabase.from('stage_periods').select('*').eq('school_id', prof.school_id).order('start_date'),
        supabase.from('assignments').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('evaluation_moments').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('badges').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('assignment_templates').select('*').order('sort_order'),
      ])

      setPeriodes(pers ?? [])
      setSjablonen(sjabl ?? [])
      setOpdrachten(opdr ?? [])
      setEvalMomenten(eval_ ?? [])
      setBadges(bdgs ?? [])
      if (pers?.length) { setActievePeriode(pers[0].id); setOpenEval(eval_?.[0]?.id) }
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function voegSjabloonToe(sjabloon) {
    if (!actievePeriode) { showToast('Selecteer eerst een stageblok', false); return }
    setSjabloonBezig(sjabloon.id)
    const supabase = createClient()
    const { data, error } = await supabase.from('assignments').insert({
      school_id: profile.school_id,
      period_id: actievePeriode,
      title: sjabloon.title,
      description: sjabloon.description,
      questions: sjabloon.questions,
      max_points: sjabloon.max_points,
      xp_reward: sjabloon.xp_reward,
      sort_order: opdrachten.filter(o => o.period_id === actievePeriode).length,
    }).select().single()
    if (!error) {
      setOpdrachten(prev => [...prev, data])
      showToast(`✅ "${sjabloon.title}" toegevoegd aan blok`)
    } else {
      showToast('Fout bij toevoegen', false)
    }
    setSjabloonBezig(null)
  }

  // ===== OPDRACHTEN =====
  async function nieuweOpdracht() {
    const supabase = createClient()
    const { data, error } = await supabase.from('assignments').insert({
      school_id: profile.school_id,
      period_id: actievePeriode,
      title: 'Nieuwe opdracht',
      description: '',
      deadline: null,
      max_points: 10,
      xp_reward: 100,
      weging: 1,
      questions: [],
      sort_order: opdrachten.filter(o => o.period_id === actievePeriode).length,
    }).select().single()
    if (!error) {
      setOpdrachten(prev => [...prev, data])
      setOpenEditor(data.id)
      showToast('✅ Opdracht aangemaakt')
    }
  }

  async function slaOpdracht(opdracht) {
    setBezig(prev => ({ ...prev, [opdracht.id]: true }))
    const supabase = createClient()
    const { error } = await supabase.from('assignments').update({
      title: opdracht.title,
      description: opdracht.description,
      deadline: opdracht.deadline || null,
      max_points: parseInt(opdracht.max_points) || 10,
      xp_reward: parseInt(opdracht.xp_reward) || 100,
      weging: parseInt(opdracht.weging) || 1,
      questions: opdracht.questions || [],
    }).eq('id', opdracht.id)
    if (!error) showToast('✅ Opdracht opgeslagen')
    else showToast('❌ ' + error.message, false)
    setBezig(prev => ({ ...prev, [opdracht.id]: false }))
  }

  async function verwijderOpdracht(id) {
    const supabase = createClient()
    await supabase.from('assignments').delete().eq('id', id)
    setOpdrachten(prev => prev.filter(o => o.id !== id))
    if (openEditor === id) setOpenEditor(null)
    showToast('🗑️ Opdracht verwijderd')
  }

  function updateOpdracht(id, veld, waarde) {
    setOpdrachten(prev => prev.map(o => o.id === id ? { ...o, [veld]: waarde } : o))
  }

  function voegVraagToe(opdrachtId) {
    setOpdrachten(prev => prev.map(o => o.id === opdrachtId ? {
      ...o,
      questions: [...(o.questions || []), { id: Date.now(), v: '', hint: '', punten: 1 }]
    } : o))
  }

  function updateVraag(opdrachtId, vraagIdx, veld, waarde) {
    setOpdrachten(prev => prev.map(o => o.id === opdrachtId ? {
      ...o,
      questions: o.questions.map((v, i) => i === vraagIdx ? { ...v, [veld]: waarde } : v)
    } : o))
  }

  function verwijderVraag(opdrachtId, vraagIdx) {
    setOpdrachten(prev => prev.map(o => o.id === opdrachtId ? {
      ...o,
      questions: o.questions.filter((_, i) => i !== vraagIdx)
    } : o))
  }

  // ===== EVALUATIEMOMENTEN =====
  async function slaEvaluatie(moment) {
    const supabase = createClient()
    const { error } = await supabase.from('evaluation_moments').update({
      name: moment.name,
      week_label: moment.week_label,
      questions: moment.questions,
    }).eq('id', moment.id)
    if (!error) showToast('✅ Evaluatie opgeslagen')
    else showToast('❌ ' + error.message, false)
  }

  function updateEval(id, veld, waarde) {
    setEvalMomenten(prev => prev.map(m => m.id === id ? { ...m, [veld]: waarde } : m))
  }

  function voegEvalVraagToe(momentId) {
    setEvalMomenten(prev => prev.map(m => m.id === momentId ? {
      ...m,
      questions: [...(m.questions || []), { id: Date.now(), type: 'slider', tekst: '' }]
    } : m))
  }

  function updateEvalVraag(momentId, idx, veld, waarde) {
    setEvalMomenten(prev => prev.map(m => m.id === momentId ? {
      ...m,
      questions: m.questions.map((v, i) => i === idx ? { ...v, [veld]: waarde } : v)
    } : m))
  }

  function verwijderEvalVraag(momentId, idx) {
    setEvalMomenten(prev => prev.map(m => m.id === momentId ? {
      ...m,
      questions: m.questions.filter((_, i) => i !== idx)
    } : m))
  }

  async function nieuwToetsmoment() {
    const supabase = createClient()
    const { data } = await supabase.from('evaluation_moments').insert({
      school_id: profile.school_id,
      name: 'Nieuw toetsmoment',
      week_label: 'Week —',
      type: 'custom',
      questions: [],
      sort_order: evalMomenten.length,
    }).select().single()
    if (data) { setEvalMomenten(prev => [...prev, data]); setOpenEval(data.id) }
  }

  async function verwijderToetsmoment(id) {
    const supabase = createClient()
    await supabase.from('evaluation_moments').delete().eq('id', id)
    setEvalMomenten(prev => prev.filter(m => m.id !== id))
    setOpenEval(evalMomenten.find(m => m.id !== id)?.id)
  }

  // ===== BADGES =====
  async function updateBadge(id, veld, waarde) {
    setBadges(prev => prev.map(b => b.id === id ? { ...b, [veld]: waarde } : b))
  }

  async function slaBadge(badge) {
    const supabase = createClient()
    await supabase.from('badges').update({ emoji: badge.emoji, name: badge.name, threshold: badge.threshold }).eq('id', badge.id)
    showToast('✅ Badge opgeslagen')
  }

  async function nieuweBadge() {
    const supabase = createClient()
    const { data } = await supabase.from('badges').insert({
      school_id: profile.school_id,
      emoji: '🏅',
      name: 'Nieuwe badge',
      type: 'manual',
      threshold: 1,
      xp_reward: 50,
      sort_order: badges.length,
    }).select().single()
    if (data) setBadges(prev => [...prev, data])
  }

  async function verwijderBadge(id) {
    const supabase = createClient()
    await supabase.from('badges').delete().eq('id', id)
    setBadges(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const periodeOpdrachten = opdrachten.filter(o => o.period_id === actievePeriode)
  const activePeriodeData = periodes.find(p => p.id === actievePeriode)
  const activeEval = evalMomenten.find(m => m.id === openEval)

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Opdrachten</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Periode tabs */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {periodes.map(p => (
              <button key={p.id} onClick={() => { setActievePeriode(p.id); setOpenEditor(null) }} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: actievePeriode === p.id ? '#0E3A5C' : '#E8F0F6', color: actievePeriode === p.id ? '#fff' : '#0E3A5C' }}>
                {p.name}
              </button>
            ))}
            {periodes.length === 0 && <span style={{ fontSize: 13, color: '#5C6B7A' }}>Geen periodes — maak ze aan onder ⚙️ Beheer</span>}
          </div>
          <button onClick={nieuweOpdracht} disabled={!actievePeriode} style={{ padding: '8px 16px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: actievePeriode ? 'pointer' : 'not-allowed', opacity: actievePeriode ? 1 : .5 }}>
            + Nieuwe opdracht
          </button>
        </div>

        {activePeriodeData && (
          <div style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 16 }}>
            📅 {fmtDatum(activePeriodeData.start_date)} t/m {fmtDatum(activePeriodeData.end_date)} · urendoel {activePeriodeData.hours_goal} uur
          </div>
        )}

        {/* ===== SJABLONEN BIBLIOTHEEK ===== */}
        {sjablonen.length > 0 && (
          <div style={{ background: '#F0F7FF', border: '1px solid #C7DFF7', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>📚</span>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, color: '#1A3C5E' }}>Sjablonen bibliotheek</span>
            </div>
            <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 14, lineHeight: 1.5 }}>
              Kant-en-klare opdrachten — klik op "Toevoegen" om ze aan het geselecteerde stageblok toe te voegen.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sjablonen.map(sj => {
                const alToegevoegd = opdrachten.some(o => o.title === sj.title && o.period_id === actievePeriode)
                return (
                  <div key={sj.id} style={{ background: '#fff', border: '1px solid #C7DFF7', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1A3C5E', marginBottom: 2 }}>{sj.title}</div>
                      <div style={{ fontSize: 12, color: '#5C6B7A' }}>{(sj.questions || []).length} vragen · {sj.xp_reward} XP</div>
                    </div>
                    {alToegevoegd ? (
                      <span style={{ fontSize: 12, color: '#1A7F52', fontWeight: 700, padding: '5px 12px', background: '#E6F7EF', borderRadius: 20 }}>✓ Al toegevoegd</span>
                    ) : (
                      <button
                        onClick={() => voegSjabloonToe(sj)}
                        disabled={sjabloonBezig === sj.id}
                        style={{ padding: '7px 14px', background: '#1A3C5E', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {sjabloonBezig === sj.id ? '⏳' : '+ Toevoegen'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== OPDRACHTEN LIJST ===== */}
        {periodeOpdrachten.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #E4DDD4', borderRadius: 12, padding: 40, textAlign: 'center', color: '#5C6B7A', fontSize: 14, marginBottom: 20 }}>
            Nog geen opdrachten in deze periode. Klik op "+ Nieuwe opdracht".
          </div>
        ) : periodeOpdrachten.map(op => (
          <div key={op.id} style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{op.title}</div>
                <div style={{ fontSize: 12, color: '#5C6B7A' }}>
                  {op.description && `${op.description.slice(0, 60)}${op.description.length > 60 ? '...' : ''} · `}
                  Deadline: {fmtDatum(op.deadline)} · {(op.questions || []).length} vragen · {op.xp_reward || 100} XP
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => setOpenEditor(openEditor === op.id ? null : op.id)} style={{ padding: '6px 14px', background: openEditor === op.id ? '#0E3A5C' : '#E8F0F6', border: 'none', borderRadius: 8, color: openEditor === op.id ? '#fff' : '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {openEditor === op.id ? 'Sluiten' : '✏️ Bewerken'}
                </button>
                <button onClick={() => verwijderOpdracht(op.id)} style={{ padding: '6px 12px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>

            {openEditor === op.id && (
              <div style={{ borderTop: '1px solid #E4DDD4', padding: '20px', background: '#FAFAF8' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Titel</label>
                    <input value={op.title} onChange={e => updateOpdracht(op.id, 'title', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Deadline</label>
                    <input type="date" value={op.deadline || ''} onChange={e => updateOpdracht(op.id, 'deadline', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>XP beloning</label>
                    <input type="number" value={op.xp_reward || 100} onChange={e => updateOpdracht(op.id, 'xp_reward', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Weging eindcijfer</label>
                    <input type="number" min="0" max="10" value={op.weging || 1} onChange={e => updateOpdracht(op.id, 'weging', e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Omschrijving</label>
                  <textarea value={op.description || ''} onChange={e => updateOpdracht(op.id, 'description', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Beschrijf de opdracht..." />
                </div>

                {/* Vragen editor */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Vragen voor de student</div>
                  {(op.questions || []).map((vr, i) => (
                    <div key={vr.id || i} style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid #E4DDD4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A' }}>Vraag {i + 1}</span>
                        <button onClick={() => verwijderVraag(op.id, i)} style={{ padding: '3px 8px', background: '#FAEAE7', border: 'none', borderRadius: 6, color: '#C03020', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Verwijder</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
                        <div>
                          <label style={labelStyle}>Vraag</label>
                          <input value={vr.v || ''} onChange={e => updateVraag(op.id, i, 'v', e.target.value)} placeholder="Vraagtekst" style={inputStyle} />
                        </div>
                        <div style={{ width: 180 }}>
                          <label style={labelStyle}>Hint (optioneel)</label>
                          <input value={vr.hint || ''} onChange={e => updateVraag(op.id, i, 'hint', e.target.value)} placeholder="💡 Hint..." style={inputStyle} />
                        </div>
                        <div style={{ width: 80 }}>
                          <label style={labelStyle}>Punten</label>
                          <input type="number" min="0" value={vr.punten || 1} onChange={e => updateVraag(op.id, i, 'punten', parseInt(e.target.value) || 0)} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => voegVraagToe(op.id)} style={{ padding: '7px 14px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginRight: 8 }}>
                    + Vraag toevoegen
                  </button>
                </div>

                <button onClick={() => slaOpdracht(op)} disabled={bezig[op.id]} style={{ padding: '9px 20px', background: '#F26B1D', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {bezig[op.id] ? '⏳ Opslaan...' : '💾 Opslaan'}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* ===== NORMERING ===== */}
        {periodeOpdrachten.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📐 Punten & normering</div>
            <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 16, lineHeight: 1.6 }}>
              Het cijfer wordt automatisch berekend: <strong>cijfer = 1 + 9 × (behaalde punten / max punten)</strong>. Met de weging bepaal je hoe zwaar elke opdracht meetelt.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7F3EE' }}>
                  {['Opdracht', 'Max punten', 'Weging eindcijfer'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodeOpdrachten.map(op => {
                  const maxPunten = (op.questions || []).reduce((t, v) => t + (v.punten || 0), 0)
                  return (
                    <tr key={op.id} style={{ borderTop: '1px solid #E4DDD4' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{op.title}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#5C6B7A' }}>{maxPunten || '—'} ptn</td>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="number" min="0" max="10" value={op.weging || 1}
                          onChange={e => updateOpdracht(op.id, 'weging', e.target.value)}
                          onBlur={() => slaOpdracht(op)}
                          style={{ width: 70, padding: '5px 8px', border: '1.5px solid #E4DDD4', borderRadius: 6, fontFamily: 'Inter,sans-serif', fontSize: 13, textAlign: 'center' }}
                        /> ×
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== EVALUATIEVRAGEN ===== */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📝 Evaluatievragen voor stagebegeleider</div>
          <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 16, lineHeight: 1.6 }}>
            De vragen die de stagebegeleider invult bij elk toetsmoment. Pas ze aan, voeg vragen toe of maak een nieuw toetsmoment aan.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {evalMomenten.map(m => (
              <button key={m.id} onClick={() => setOpenEval(m.id)} style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: openEval === m.id ? '#0E3A5C' : '#E8F0F6', color: openEval === m.id ? '#fff' : '#0E3A5C' }}>
                {m.name}
              </button>
            ))}
            <button onClick={nieuwToetsmoment} style={{ padding: '7px 14px', background: 'transparent', border: '1.5px dashed #E4DDD4', borderRadius: 20, color: '#5C6B7A', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              + Toetsmoment
            </button>
          </div>

          {activeEval && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, marginBottom: 16, padding: 14, background: '#F7F3EE', borderRadius: 10 }}>
                <div>
                  <label style={labelStyle}>Naam toetsmoment</label>
                  <input value={activeEval.name} onChange={e => updateEval(activeEval.id, 'name', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Week / datum</label>
                  <input value={activeEval.week_label || ''} onChange={e => updateEval(activeEval.id, 'week_label', e.target.value)} placeholder="Week 26" style={inputStyle} />
                </div>
                {activeEval.type === 'custom' && (
                  <button onClick={() => verwijderToetsmoment(activeEval.id)} style={{ padding: '7px 12px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end' }}>
                    Verwijder
                  </button>
                )}
              </div>

              {(activeEval.questions || []).map((v, i) => (
                <div key={v.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px', background: '#F7F3EE', borderRadius: 10, marginBottom: 8 }}>
                  <select value={v.type} onChange={e => updateEvalVraag(activeEval.id, i, 'type', e.target.value)} style={{ padding: '7px 8px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 12, background: '#fff', width: 120 }}>
                    <option value="slider">📊 Slider</option>
                    <option value="sterren">⭐ Sterren</option>
                    <option value="tekst">✏️ Tekst</option>
                  </select>
                  <input value={v.tekst || ''} onChange={e => updateEvalVraag(activeEval.id, i, 'tekst', e.target.value)} placeholder="Vraagtekst" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => verwijderEvalVraag(activeEval.id, i)} style={{ padding: '7px 10px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => voegEvalVraagToe(activeEval.id)} style={{ padding: '7px 14px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>+ Vraag toevoegen</button>
                <button onClick={() => slaEvaluatie(activeEval)} style={{ padding: '7px 16px', background: '#F26B1D', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>💾 Opslaan</button>
              </div>
            </div>
          )}
        </div>

        {/* ===== BADGES ===== */}
        <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700 }}>🏆 Badges</div>
            <button onClick={nieuweBadge} style={{ padding: '6px 14px', background: '#E8F0F6', border: 'none', borderRadius: 8, color: '#0E3A5C', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>+ Badge toevoegen</button>
          </div>
          <p style={{ fontSize: 13, color: '#5C6B7A', marginBottom: 16, lineHeight: 1.6 }}>
            Pas de naam, emoji of drempel aan. Studenten zien automatisch hun voortgang per badge.
          </p>
          {badges.map(b => (
            <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #E4DDD4', flexWrap: 'wrap' }}>
              <input value={b.emoji} onChange={e => updateBadge(b.id, 'emoji', e.target.value)} style={{ width: 50, padding: '6px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 20, textAlign: 'center' }} />
              <input value={b.name} onChange={e => updateBadge(b.id, 'name', e.target.value)} style={{ flex: 1, minWidth: 140, padding: '6px 10px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#5C6B7A' }}>Drempel:</span>
                <input type="number" value={b.threshold} onChange={e => updateBadge(b.id, 'threshold', parseInt(e.target.value) || 1)} style={{ width: 70, padding: '6px 8px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, textAlign: 'center' }} />
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E8F0F6', color: '#5C6B7A' }}>{b.type}</span>
              <button onClick={() => slaBadge(b)} style={{ padding: '6px 12px', background: '#F26B1D', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Opslaan</button>
              <button onClick={() => verwijderBadge(b.id)} style={{ padding: '6px 10px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>

      </div>
    </CoordinatorLayout>
  )
}
