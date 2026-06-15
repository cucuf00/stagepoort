'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DARK = {
  bg: '#0D1420',
  card: '#172032',
  card2: '#1D2840',
  border: 'rgba(255,255,255,.07)',
  text: '#F0F4F8',
  sub: '#9AACBE',
  orange: '#F26B1D',
  green: '#4ADE80',
  blue: '#60A5FA',
  purple: '#A78BFA',
}

const S = {
  page: { minHeight: '100vh', background: DARK.bg, color: DARK.text, fontFamily: 'Inter,sans-serif', paddingBottom: 80 },
  card: { background: DARK.card, borderRadius: 16, border: `1px solid ${DARK.border}`, padding: 20, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: DARK.sub, marginBottom: 8 },
}

function getWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return [Math.ceil((((date - yearStart) / 86400000) + 1) / 7), date.getUTCFullYear()]
}

function XPBalk({ xp, level }) {
  const xpPerLevel = 300
  const huidigeXP = xp % xpPerLevel
  const pct = Math.min((huidigeXP / xpPerLevel) * 100, 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DARK.sub, marginBottom: 6 }}>
        <span>Level {level}</span>
        <span>{xpPerLevel - huidigeXP} XP tot level {level + 1}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${DARK.orange}, #FF9A3C)`, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

// ============================================================
// MIJN STAGE TAB
// ============================================================
function MijnStageTab({ profile, placement, badges, studentBadges, klassement, klasKlassement, uren }) {
  const [klassTab, setKlassTab] = useState('school')
  const [klassType, setKlassType] = useState('xp')

  const behaaldIds = new Set(studentBadges.map(b => b.badge_id))
  const goedgekeurdUren = uren.filter(u => u.status === 'approved').reduce((s, u) => s + Number(u.hours), 0)

  const getBadgeProgress = (badge) => {
    if (badge.type === 'hours') return { current: goedgekeurdUren, target: badge.threshold }
    if (badge.type === 'streak') return { current: profile.streak || 0, target: badge.threshold }
    if (badge.type === 'assignments') return { current: 0, target: badge.threshold }
    return null
  }

  const klasData = klassTab === 'school' ? klassement : klasKlassement
  const gesorteerd = [...(klasData || [])].sort((a, b) => {
    if (klassType === 'xp') return (b.xp || 0) - (a.xp || 0)
    if (klassType === 'streak') return (b.streak || 0) - (a.streak || 0)
    return 0
  })

  return (
    <div>
      {/* Hero */}
      <div style={{ ...S.card, background: 'linear-gradient(135deg, #1A2130 0%, #0F1820 100%)', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${DARK.orange}, #FF9A3C)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
            {profile?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800 }}>Yo {profile?.name?.split(' ')[0]} 👋</div>
            <div style={{ fontSize: 13, color: DARK.sub }}>
              {placement?.company_name ? `Stage bij ${placement.company_name}` : 'Stage nog niet gekoppeld'}
              {placement?.supervisor_name ? ` · begeleider ${placement.supervisor_name}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { val: `${profile?.streak || 0} 🔥`, label: 'weken streak' },
            { val: `${profile?.xp || 0}`, label: `XP · level ${profile?.level || 1}` },
            { val: `${goedgekeurdUren}`, label: `van ${placement?.hours_required || 320} uur` },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: DARK.orange }}>{s.val}</div>
              <div style={{ fontSize: 11, color: DARK.sub, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <XPBalk xp={profile?.xp || 0} level={profile?.level || 1} />
      </div>

      {/* Coach + Begeleider */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ ...S.card, margin: 0, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DARK.sub, marginBottom: 8 }}>👨‍🏫 Stagecoach</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{placement?.coach_name || '—'}</div>
          <div style={{ fontSize: 12, color: DARK.sub, marginBottom: 10 }}>{placement?.coach_email || ''}</div>
          {placement?.coach_email && (
            <a href={`mailto:${placement.coach_email}`} style={{ display: 'block', textAlign: 'center', padding: '7px', background: 'rgba(242,107,29,.15)', borderRadius: 8, color: DARK.orange, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>✉️ Mail coach</a>
          )}
        </div>
        <div style={{ ...S.card, margin: 0, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DARK.sub, marginBottom: 8 }}>🏢 Stagebegeleider</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{placement?.supervisor_name || '—'}</div>
          <div style={{ fontSize: 12, color: DARK.sub, marginBottom: 10 }}>{placement?.company_name || ''}</div>
          <div style={{ display: 'block', textAlign: 'center', padding: '7px', background: 'rgba(255,255,255,.05)', borderRadius: 8, color: DARK.sub, fontSize: 12, fontWeight: 700 }}>📨 Link opnieuw</div>
        </div>
      </div>

      {/* Route */}
      <div style={S.card}>
        <div style={S.label}>🧭 Jouw route</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['Gestart', 'Uren & opdrachten', 'Tussenevaluatie', 'Eindgesprek'].map((stap, i) => {
            const actief = i <= 1
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: actief ? DARK.green : 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: actief ? '#0B0F14' : DARK.sub, flexShrink: 0 }}>
                    {actief ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: actief ? DARK.green : DARK.sub, textAlign: 'center', maxWidth: 60 }}>{stap}</div>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 2, background: actief ? DARK.green : 'rgba(255,255,255,.15)', margin: '0 4px', marginBottom: 20 }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom: 4 }}>Badges — {behaaldIds.size} van {badges.length} behaald</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {badges.map(badge => {
            const behaald = behaaldIds.has(badge.id)
            const prog = getBadgeProgress(badge)
            return (
              <div key={badge.id} style={{ background: behaald ? 'rgba(242,107,29,.12)' : 'rgba(255,255,255,.03)', borderRadius: 12, padding: 12, border: `1px solid ${behaald ? 'rgba(242,107,29,.4)' : DARK.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4, filter: behaald ? 'none' : 'grayscale(1) opacity(.4)' }}>{badge.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: behaald ? DARK.text : DARK.sub, marginBottom: prog ? 6 : 0 }}>{badge.name}</div>
                {!behaald && prog && (
                  <div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ width: `${Math.min((prog.current / prog.target) * 100, 100)}%`, height: '100%', background: DARK.orange, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: DARK.sub, marginTop: 3 }}>{prog.current} / {prog.target}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Klassement */}
      <div style={S.card}>
        <div style={S.label}>🏆 Klassement</div>

        {/* School / Klas tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['school', '🏫 School'], ['klas', '👥 Mijn klas']].map(([k, l]) => (
            <button key={k} onClick={() => setKlassTab(k)} style={{ flex: 1, padding: '7px', borderRadius: 20, border: 'none', background: klassTab === k ? DARK.orange : 'rgba(255,255,255,.06)', color: klassTab === k ? '#fff' : DARK.sub, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['xp', '⚡ XP'], ['streak', '🔥 Streak']].map(([k, l]) => (
            <button key={k} onClick={() => setKlassType(k)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: klassType === k ? 'rgba(242,107,29,.2)' : 'rgba(255,255,255,.04)', color: klassType === k ? DARK.orange : DARK.sub, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {gesorteerd.map((s, i) => {
            const isJij = s.id === profile?.id
            const waarde = klassType === 'xp' ? `${s.xp || 0} XP` : `${s.streak || 0} weken 🔥`
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: isJij ? 'rgba(242,107,29,.12)' : 'transparent', border: isJij ? `1px solid rgba(242,107,29,.3)` : '1px solid transparent', marginBottom: 4 }}>
                <div style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: 13, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : DARK.sub }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: isJij ? 700 : 500 }}>
                  {isJij ? `${s.name} (jij)` : s.name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isJij ? DARK.orange : DARK.text }}>{waarde}</div>
              </div>
            )
          })}
          {gesorteerd.length === 0 && <div style={{ textAlign: 'center', color: DARK.sub, fontSize: 13, padding: 20 }}>Nog geen data</div>}
        </div>
        <div style={{ fontSize: 11, color: DARK.sub, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
          Alleen scores zijn zichtbaar — nooit cijfers of reflecties.
        </div>
      </div>

      {/* Laatste uren */}
      {uren.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Laatste uren</div>
          {uren.slice(0, 3).map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DARK.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.description?.slice(0, 40)}{u.description?.length > 40 ? '...' : ''}</div>
                <div style={{ fontSize: 11, color: DARK.sub }}>{new Date(u.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} · {u.hours}u</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: u.status === 'approved' ? 'rgba(74,222,128,.25)' : u.status === 'rejected' ? 'rgba(239,68,68,.25)' : 'rgba(251,191,36,.25)', color: u.status === 'approved' ? DARK.green : u.status === 'rejected' ? '#EF4444' : '#FBBf24' }}>
                {u.status === 'approved' ? 'Goedgekeurd' : u.status === 'rejected' ? 'Afgekeurd' : 'Wacht'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// UREN TAB
// ============================================================
function UrenTab({ profile, placement, uren, setUren }) {
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [aantal, setAantal] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [bezig, setBezig] = useState(false)
  const [toast, setToast] = useState('')

  const weekNr = (date) => {
    const d = new Date(date)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
  }

  async function indienen() {
    if (!aantal || !omschrijving || !placement?.id) return
    setBezig(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('hours').insert({
      school_id: profile.school_id,
      placement_id: placement.id,
      student_id: profile.id,
      date: datum,
      hours: parseFloat(aantal),
      description: omschrijving,
      status: 'pending',
    }).select().single()

    if (!error) {
      setUren(prev => [data, ...prev])
      setAantal('')
      setOmschrijving('')
      setToast('✅ Uren ingediend!')
      setTimeout(() => setToast(''), 3000)
    }
    setBezig(false)
  }

  const perWeek = uren.reduce((acc, u) => {
    const wk = `Week ${weekNr(u.date)}`
    if (!acc[wk]) acc[wk] = []
    acc[wk].push(u)
    return acc
  }, {})

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1A7F52', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999 }}>{toast}</div>
      )}

      <div style={S.card}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nieuwe uren registreren</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...S.label }}>Datum</label>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${DARK.border}`, borderRadius: 10, color: DARK.text, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Aantal uren</label>
          <input type="number" min="0.5" max="12" step="0.5" value={aantal} onChange={e => setAantal(e.target.value)} placeholder="8" style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${DARK.border}`, borderRadius: 10, color: DARK.text, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Wat heb je gedaan?</label>
          <textarea value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Bijv. meegewerkt aan sprintreview en testscripts geschreven" rows={3} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${DARK.border}`, borderRadius: 10, color: DARK.text, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', resize: 'none' }} />
        </div>
        <button onClick={indienen} disabled={!aantal || !omschrijving || bezig} style={{ width: '100%', padding: '14px', background: (aantal && omschrijving && !bezig) ? DARK.orange : 'rgba(255,255,255,.08)', border: 'none', borderRadius: 12, color: (aantal && omschrijving) ? '#fff' : DARK.sub, fontWeight: 700, fontSize: 15, cursor: (aantal && omschrijving && !bezig) ? 'pointer' : 'not-allowed' }}>
          {bezig ? '⏳ Bezig...' : 'Uren indienen ⚡'}
        </button>
      </div>

      {Object.entries(perWeek).map(([week, regels]) => (
        <div key={week} style={S.card}>
          <div style={S.label}>{week}</div>
          {regels.map(u => (
            <div key={u.id} style={{ borderBottom: `1px solid ${DARK.border}`, paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{u.description}</div>
                  <div style={{ fontSize: 11, color: DARK.sub }}>{new Date(u.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} · {u.hours} uur</div>
                  {u.status === 'rejected' && u.rejection_reason && (
                    <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>↳ {u.rejection_reason}</div>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, background: u.status === 'approved' ? 'rgba(74,222,128,.25)' : u.status === 'rejected' ? 'rgba(239,68,68,.25)' : 'rgba(251,191,36,.25)', color: u.status === 'approved' ? DARK.green : u.status === 'rejected' ? '#EF4444' : '#FBBF24' }}>
                  {u.status === 'approved' ? 'Goedgekeurd' : u.status === 'rejected' ? 'Afgekeurd' : 'Wacht op goedkeuring'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {uren.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: DARK.sub }}>
          <div style={{ fontSize: 40, marginBottom: 12, width: 72, height: 72, borderRadius: '50%', background: 'rgba(242,107,29,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>📋</div>
          <div style={{ fontSize: 14 }}>Nog geen uren ingediend</div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// OPDRACHTEN TAB
// ============================================================
function OpdrachtenTab({ profile, placement, opdrachten, inleveringen, setInleveringen, setProfile }) {
  const [actief, setActief] = useState(null)
  const [antwoord, setAntwoord] = useState('')
  const [bezig, setBezig] = useState(false)

  async function lever(assignmentId) {
    if (!antwoord.trim()) return
    setBezig(true)
    const supabase = createClient()
    const opdracht = opdrachten.find(o => o.id === assignmentId)
    const xpBeloning = opdracht?.xp_reward || 100

    const { data, error } = await supabase.from('student_assignments').upsert({
      school_id: profile.school_id,
      assignment_id: assignmentId,
      student_id: profile.id,
      placement_id: placement?.id,
      status: 'submitted',
      answer: antwoord,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'assignment_id,student_id' }).select().single()

    if (!error) {
      // XP toekennen
      const nieuweXP = (profile.xp || 0) + xpBeloning
      const nieuweLevel = Math.floor(nieuweXP / 300) + 1
      await supabase.from('profiles').update({ xp: nieuweXP, level: nieuweLevel }).eq('id', profile.id)
      setProfile(prev => ({ ...prev, xp: nieuweXP, level: nieuweLevel }))
      setInleveringen(prev => [...prev.filter(i => i.assignment_id !== assignmentId), data])
      setActief(null)
      setAntwoord('')
    }
    setBezig(false)
  }

  return (
    <div>
      {opdrachten.map(op => {
        const inlevering = inleveringen.find(i => i.assignment_id === op.id)
        const status = inlevering?.status || 'open'

        return (
          <div key={op.id} style={{ ...S.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{op.title}</div>
                {op.description && <div style={{ fontSize: 13, color: DARK.sub, lineHeight: 1.5 }}>{op.description}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {op.deadline && <span style={{ fontSize: 11, color: DARK.sub }}>📅 {new Date(op.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                  {inlevering?.grade && <span style={{ fontSize: 11, fontWeight: 700, color: inlevering.grade >= 5.5 ? DARK.green : '#EF4444' }}>cijfer {inlevering.grade.toFixed(1)}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {status === 'graded' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(74,222,128,.25)', color: DARK.green }}>Beoordeeld</span>}
                {status === 'submitted' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(251,191,36,.25)', color: '#FBBF24' }}>Ingeleverd</span>}
                {status === 'open' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,.07)', color: DARK.sub }}>Open</span>}
              </div>
            </div>

            {status === 'open' && (
              actief === op.id ? (
                <div style={{ marginTop: 12 }}>
                  <textarea value={antwoord} onChange={e => setAntwoord(e.target.value)} placeholder="Schrijf hier je antwoord..." rows={4} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${DARK.border}`, borderRadius: 10, color: DARK.text, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => lever(op.id)} disabled={!antwoord.trim() || bezig} style={{ flex: 1, padding: '11px', background: DARK.orange, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {bezig ? '⏳' : `Inleveren +${op.xp_reward || 100} XP ⚡`}
                    </button>
                    <button onClick={() => setActief(null)} style={{ padding: '11px 16px', background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 10, color: DARK.sub, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annuleer</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActief(op.id)} style={{ width: '100%', padding: '10px', background: 'rgba(242,107,29,.12)', border: `1px solid rgba(242,107,29,.3)`, borderRadius: 10, color: DARK.orange, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                  Start opdracht · +{op.xp_reward || 100} XP ⚡
                </button>
              )
            )}
          </div>
        )
      })}

      {opdrachten.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: DARK.sub }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 14 }}>Nog geen opdrachten klaargezet</div>
        </div>
      )}
    </div>
  )
}


// ============================================================
// ============================================================
// DAGSTORY TAB — Instagram/TikTok stijl
// ============================================================
function StoriesArchief({ stories, fmtDag }) {
  if (!stories || stories.length === 0) return null
  const moodKleur = { '😊': '#34D399', '😐': '#FBBF24', '😕': '#F87171' }
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: DARK.sub, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
        Eerdere dagen
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {stories.slice(0, 10).map(s => (
          <div key={s.id} style={{ flexShrink: 0, textAlign: 'center', width: 60 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `${moodKleur[s.mood] || '#7A8A9A'}20`,
              border: `2.5px solid ${moodKleur[s.mood] || '#7A8A9A'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 6px',
            }}>
              {s.mood || '📝'}
            </div>
            <div style={{ fontSize: 10, color: DARK.sub, lineHeight: 1.3 }}>{fmtDag(s.date)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DagstoryTab({ profile, placement, stories, setStories, setProfile }) {
  const [stap, setStap] = useState(0)
  const [antwoorden, setAntwoorden] = useState({ mood: '', a1: '', a2: '' })
  const [bezig, setBezig] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const vandaag = new Date().toISOString().split('T')[0]
  const heeftVandaag = stories.some(s => s.date === vandaag)

  const MOODS = [
    { emoji: '🔥', label: 'Top dag!', kleur: '#F97316' },
    { emoji: '😊', label: 'Goed!',    kleur: '#34D399' },
    { emoji: '😐', label: 'Oké',      kleur: '#FBBF24' },
    { emoji: '😕', label: 'Lastig',   kleur: '#F87171' },
    { emoji: '😴', label: 'Zwaar',    kleur: '#A78BFA' },
  ]

  const STAPPEN = [
    {
      emoji: '📝',
      vraag: 'Wat heb ik vandaag gedaan?',
      type: 'tekst', key: 'a1',
      placeholder: 'Vertel kort wat je vandaag hebt gedaan...',
      gradient: 'linear-gradient(160deg, #1a0533 0%, #2d1b69 45%, #0D1420 100%)',
      accent: '#A78BFA',
    },
    {
      emoji: '💭',
      vraag: 'Hoe voelde ik me vandaag?',
      type: 'mood', key: 'mood',
      gradient: 'linear-gradient(160deg, #33001a 0%, #6b1d4f 45%, #0D1420 100%)',
      accent: '#F472B6',
    },
    {
      emoji: '💡',
      vraag: 'Wat heb ik vandaag geleerd?',
      type: 'tekst', key: 'a2',
      placeholder: 'Wat heb je ontdekt of geleerd vandaag?',
      gradient: 'linear-gradient(160deg, #001a12 0%, #064e3b 45%, #0D1420 100%)',
      accent: '#34D399',
    },
  ]

  const huidig = STAPPEN[stap]

  const MIN_TEKENS = 50
  const stapGeldig = () => {
    if (huidig.type === 'mood') return antwoorden.mood !== ''
    return (antwoorden[huidig.key] || '').trim().length >= MIN_TEKENS
  }
  const aantalTekens = (huidig.type === 'tekst') ? (antwoorden[huidig.key] || '').trim().length : 0
  const nogNodig = Math.max(0, MIN_TEKENS - aantalTekens)

  const gaVerder = () => {
    if (!stapGeldig() || bezig) return
    if (stap < STAPPEN.length - 1) {
      setAnimKey(k => k + 1)
      setStap(s => s + 1)
    } else {
      verzend()
    }
  }

  const gaTerug = () => {
    setAnimKey(k => k + 1)
    setStap(s => s - 1)
  }

  const [foutmelding, setFoutmelding] = useState('')

  async function verzend() {
    setBezig(true)
    setFoutmelding('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('week_stories').insert({
        school_id: profile.school_id,
        student_id: profile.id,
        placement_id: placement?.id ?? null,
        date: vandaag,
        mood: antwoorden.mood,
        answer_1: antwoorden.a1,
        answer_2: antwoorden.a2,
        xp_awarded: 50,
      }).select().single()

      if (error) {
        console.error('Dagstory insert error:', error)
        setFoutmelding(`Fout: ${error.message}`)
        return
      }

      const nieuweXP = (profile.xp || 0) + 50
      const nieuweLevel = Math.floor(nieuweXP / 300) + 1
      const nieuweStreak = (profile.streak || 0) + 1
      await supabase.from('profiles').update({ xp: nieuweXP, level: nieuweLevel, streak: nieuweStreak }).eq('id', profile.id)
      setProfile(prev => ({ ...prev, xp: nieuweXP, level: nieuweLevel, streak: nieuweStreak }))
      setStories(prev => [data, ...prev])
      setKlaar(true)
    } catch (e) {
      console.error('Dagstory onverwachte fout:', e)
      setFoutmelding('Onverwachte fout, probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  const fmtDag = (d) => {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (klaar) return (
    <div>
      <style>{`@keyframes pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ borderRadius: 24, background: 'linear-gradient(160deg, #064e3b, #1a1040)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16, display: 'inline-block', animation: 'pop .5s ease' }}>🎉</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 8 }}>+50 XP!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}>Dagboek ingevuld · ga zo door 🔥</div>
      </div>
      <StoriesArchief stories={stories} fmtDag={fmtDag} />
    </div>
  )

  if (heeftVandaag) return (
    <div>
      <div style={{ borderRadius: 24, background: 'linear-gradient(160deg, #1a0533, #2d1b69)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Al ingevuld vandaag</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Kom morgen terug!</div>
      </div>
      <StoriesArchief stories={stories} fmtDag={fmtDag} />
    </div>
  )

  return (
    <div>
      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(32px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .dag-placeholder::placeholder{color:rgba(255,255,255,.35)}
      `}</style>

      <div key={animKey} style={{
        borderRadius: 24,
        background: huidig.gradient,
        padding: '20px 20px 26px',
        minHeight: 440,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn .28s ease',
      }}>
        {/* Progress bars — Instagram stijl */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
          {STAPPEN.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.15)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: s.accent,
                width: i < stap ? '100%' : i === stap ? '50%' : '0%',
                transition: 'width .5s ease',
              }} />
            </div>
          ))}
        </div>

        {/* Emoji */}
        <div style={{ textAlign: 'center', marginBottom: 14, animation: 'fadeUp .3s ease' }}>
          <span style={{ fontSize: 54, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.5))' }}>{huidig.emoji}</span>
        </div>

        {/* Vraag */}
        <div style={{
          fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900,
          color: '#fff', textAlign: 'center', lineHeight: 1.3,
          marginBottom: 28, letterSpacing: '-0.3px',
          animation: 'fadeUp .38s ease',
        }}>
          {huidig.vraag}
        </div>

        {/* Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {huidig.type === 'mood' ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '8px 0' }}>
              {MOODS.map(m => (
                <div key={m.emoji} onClick={() => setAntwoorden(prev => ({ ...prev, mood: m.emoji }))} style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{
                    width: 74, height: 74, borderRadius: '50%',
                    background: antwoorden.mood === m.emoji ? `${m.kleur}28` : 'rgba(255,255,255,.07)',
                    border: `3px solid ${antwoorden.mood === m.emoji ? m.kleur : 'rgba(255,255,255,.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, marginBottom: 8,
                    transform: antwoorden.mood === m.emoji ? 'scale(1.18)' : 'scale(1)',
                    transition: 'all .2s ease',
                    boxShadow: antwoorden.mood === m.emoji ? `0 0 22px ${m.kleur}55` : 'none',
                  }}>{m.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.4px', color: antwoorden.mood === m.emoji ? m.kleur : 'rgba(255,255,255,.35)', transition: 'color .2s' }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (<>
            <textarea
              className="dag-placeholder"
              value={antwoorden[huidig.key]}
              onChange={e => setAntwoorden(prev => ({ ...prev, [huidig.key]: e.target.value }))}
              placeholder={huidig.placeholder}
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '16px',
                background: 'rgba(255,255,255,.09)',
                backdropFilter: 'blur(8px)',
                border: `1.5px solid ${stapGeldig() ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.18)'}`,
                borderRadius: 16, color: '#fff',
                fontFamily: 'Inter,sans-serif', fontSize: 15,
                lineHeight: 1.6, outline: 'none', resize: 'none',
              }}
            />
            {/* Teller */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: nogNodig > 0 ? 'rgba(255,255,255,.5)' : huidig.accent }}>
                  {nogNodig > 0 ? `Schrijf nog ${nogNodig} tekens` : '✓ Genoeg geschreven!'}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{aantalTekens} / {MIN_TEKENS}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: nogNodig > 0 ? 'rgba(255,255,255,.3)' : huidig.accent,
                  width: `${Math.min(100, (aantalTekens / MIN_TEKENS) * 100)}%`,
                  transition: 'width .2s ease, background .3s ease',
                }} />
              </div>
            </div>
          </>) }
        </div>

        {/* Knoppen */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {stap > 0 && (
            <button onClick={gaTerug} style={{
              padding: '14px 18px', background: 'rgba(255,255,255,.1)',
              border: '1.5px solid rgba(255,255,255,.18)',
              borderRadius: 99, color: 'rgba(255,255,255,.75)',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}>←</button>
          )}
          <button
            onClick={gaVerder}
            disabled={!stapGeldig() || bezig}
            style={{
              flex: 1, padding: '14px',
              background: stapGeldig() ? huidig.accent : 'rgba(255,255,255,.08)',
              border: 'none', borderRadius: 99,
              color: stapGeldig() ? '#0D1420' : 'rgba(255,255,255,.25)',
              fontFamily: 'Sora,sans-serif', fontWeight: 900,
              fontSize: 16, cursor: stapGeldig() ? 'pointer' : 'not-allowed',
              transition: 'all .2s ease',
              boxShadow: stapGeldig() ? `0 4px 22px ${huidig.accent}55` : 'none',
            }}
          >
            {bezig ? '⏳' : stap < STAPPEN.length - 1 ? 'Volgende →' : '✅ Opslaan +50 XP'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,.3)', letterSpacing: '.5px' }}>
          {stap + 1} / {STAPPEN.length} · {fmtDag(vandaag)}
        </div>

        {foutmelding && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)', borderRadius: 10, fontSize: 13, color: '#FCA5A5', textAlign: 'center' }}>
            ⚠️ {foutmelding}
          </div>
        )}
      </div>

      <StoriesArchief stories={stories} fmtDag={fmtDag} />
    </div>
  )
}

// ============================================================
// HOOFD COMPONENT
// ============================================================
export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [badges, setBadges] = useState([])
  const [studentBadges, setStudentBadges] = useState([])
  const [uren, setUren] = useState([])
  const [opdrachten, setOpdrachten] = useState([])
  const [inleveringen, setInleveringen] = useState([])
  const [stories, setStories] = useState([])
  const [klassement, setKlassement] = useState([])
  const [klasKlassement, setKlasKlassement] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stage')

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*')
        .eq('user_id', session.user.id).limit(1).maybeSingle()

      if (!prof || prof.role !== 'student') { router.replace('/login'); return }

      // Student zonder klas → onboarding
      if (!prof.klas) { router.replace('/onboarding'); return }

      setProfile(prof)

      const [
        { data: pl },
        { data: b },
        { data: sb },
        { data: u },
        { data: a },
        { data: ia },
        { data: ws },
        { data: kl },
      ] = await Promise.all([
        supabase.from('placements').select('*').eq('student_id', prof.id).not('status', 'in', '("cancelled","completed")').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('badges').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('student_badges').select('*').eq('student_id', prof.id),
        supabase.from('hours').select('*').eq('student_id', prof.id).order('date', { ascending: false }),
        supabase.from('assignments').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('student_assignments').select('*').eq('student_id', prof.id),
        supabase.from('week_stories').select('*').eq('student_id', prof.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,name,xp,streak,klas').eq('school_id', prof.school_id).eq('role', 'student'),
      ])

      setPlacement(pl)
      setBadges(b ?? [])
      setStudentBadges(sb ?? [])
      setUren(u ?? [])
      setOpdrachten(a ?? [])
      setInleveringen(ia ?? [])
      setStories(ws ?? [])
      setKlassement(kl ?? [])
      setKlasKlassement((kl ?? []).filter(s => s.klas === prof.klas))
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DARK.bg }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.15)', borderTop: `3px solid ${DARK.orange}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const TABS = [
    { key: 'stage', label: '🧭', sub: 'Mijn stage' },
    { key: 'uren', label: '📋', sub: 'Uren' },
    { key: 'opdrachten', label: '📁', sub: 'Opdrachten' },
    { key: 'story', label: '📖', sub: 'Dagboek' },
  ]

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select{color-scheme:dark}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:99px}
      `}</style>

      {/* Header */}
      <div style={{ background: DARK.card, borderBottom: `1px solid ${DARK.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 17, color: DARK.orange }}>Stagepoort</div>
        <div style={{ fontSize: 12, color: DARK.sub }}>{profile?.name} · {profile?.klas}</div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 0' }}>
        {tab === 'stage' && <MijnStageTab profile={profile} placement={placement} badges={badges} studentBadges={studentBadges} klassement={klassement} klasKlassement={klasKlassement} uren={uren} />}
        {tab === 'uren' && <UrenTab profile={profile} placement={placement} uren={uren} setUren={setUren} />}
        {tab === 'opdrachten' && <OpdrachtenTab profile={profile} placement={placement} opdrachten={opdrachten} inleveringen={inleveringen} setInleveringen={setInleveringen} setProfile={setProfile} />}
        {tab === 'story' && <DagstoryTab profile={profile} placement={placement} stories={stories} setStories={setStories} setProfile={setProfile} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: DARK.card, borderTop: `1px solid ${DARK.border}`, display: 'flex', padding: '8px 0 12px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
            <span style={{ fontSize: 22 }}>{t.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: tab === t.key ? DARK.orange : DARK.sub }}>{t.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
