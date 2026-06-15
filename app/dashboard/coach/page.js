'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────── DESIGN TOKENS ───────────────────────────
const C = {
  bg: '#F7F3EE', white: '#FFFFFF', border: '#E4DDD4',
  ink: '#1A2633', sub: '#5C6B7A', light: '#9AA8B2',
  blue: '#0E3A5C', orange: '#F26B1D', green: '#1A7F52',
  red: '#C03020', yellow: '#A87010',
  blueBg: '#E8F0F6', greenBg: '#E2F4EC', redBg: '#FAEAE7', yellowBg: '#FBF0D8',
}
const card = { background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }
const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.sub }

// ─────────────────────────── HELPERS ─────────────────────────────────
function getInitialen(naam) {
  if (!naam) return '?'
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
function fmtDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
function weekGeleden(n) {
  const d = new Date(); d.setDate(d.getDate() - n * 7); return d
}

// ─────────────────────────── SUB-COMPONENTS ──────────────────────────
function AlertTag({ type }) {
  const map = {
    noHours: { label: '⚠️ Geen uren 2+ weken', bg: C.redBg, color: C.red },
    deadline: { label: '🗓️ Deadline gemist', bg: C.yellowBg, color: C.yellow },
    noStage: { label: '📭 Nog geen stage', bg: '#F0EDE8', color: C.sub },
  }
  const s = map[type]
  if (!s) return null
  return <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, marginRight: 6, marginBottom: 4 }}>{s.label}</span>
}

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Op koers', bg: C.greenBg, color: C.green },
    'op koers': { label: 'Op koers', bg: C.greenBg, color: C.green },
    aandacht: { label: '⚠️ Aandacht', bg: C.yellowBg, color: C.yellow },
    achterstand: { label: '🔴 Achterstand', bg: C.redBg, color: C.red },
    'geen stage': { label: 'Geen stage', bg: '#F0EDE8', color: C.sub },
  }
  const s = map[status] || { label: status, bg: '#F0EDE8', color: C.sub }
  return <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
}

function ProgressBar({ value, max, color = C.orange }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ fontWeight: 700, color: C.ink }}>{value} / {max} uur</span>
        <span style={{ color: C.sub }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? C.green : pct >= 40 ? color : C.red, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

function StageroUte({ fase }) {
  const stappen = ['Gestart', 'Uren & opdrachten', 'Tussenevaluatie', 'Eindgesprek']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
      {stappen.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= fase ? C.green : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i <= fase ? '#fff' : C.sub, flexShrink: 0 }}>
              {i <= fase ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 9, color: i <= fase ? C.green : C.sub, textAlign: 'center', maxWidth: 52, lineHeight: 1.2 }}>{s}</div>
          </div>
          {i < 3 && <div style={{ flex: 1, height: 2, background: i < fase ? C.green : C.border, margin: '0 3px', marginBottom: 16 }} />}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────── TAB: MIJN STUDENTEN ─────────────────────
function MijnStudentenTab({ profile, placements, studenten, uren, assignments, praise, onPraise, onShowStories, storiesPerStudent }) {
  const [openKaart, setOpenKaart] = useState(null)

  const mijnStudenten = placements.filter(pl => pl.coach_id === profile.id)
  const opKoers = mijnStudenten.filter(pl => pl.status === 'active' || pl.status === 'halfway').length
  const actieNodig = mijnStudenten.filter(pl => {
    const student = studenten.find(s => s.id === pl.student_id)
    return student && (berekenAlerts(pl, uren, assignments).length > 0)
  }).length

  function berekenAlerts(pl, uren, assignments) {
    const alerts = []
    if (!pl.company_name) { alerts.push('noStage'); return alerts }
    const studentUren = uren.filter(u => u.placement_id === pl.id)
    const laatste = studentUren.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    if (!laatste || new Date(laatste.created_at) < weekGeleden(2)) alerts.push('noHours')
    const gemist = assignments.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.period_id === pl.period_id)
    if (gemist.length > 0) alerts.push('deadline')
    return alerts
  }

  function getGoedBezig(studentId) {
    return praise.find(p => p.student_id === studentId)?.count || 0
  }

  if (mijnStudenten.length === 0) return (
    <div style={{ ...card, textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Nog geen studenten</div>
      <p style={{ fontSize: 14, color: C.sub }}>Ga naar het tabblad "Inschrijven" om jezelf te koppelen aan studenten.</p>
    </div>
  )

  return (
    <div>
      {/* KPI tegels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Mijn studenten', value: mijnStudenten.length, sub: 'toegewezen', kleur: C.blue },
          { label: 'Op koers', value: opKoers, sub: 'geen actie nodig', kleur: C.green },
          { label: 'Actie nodig', value: actieNodig, sub: 'check hieronder', kleur: actieNodig > 0 ? C.red : C.green },
        ].map(k => (
          <div key={k.label} style={{ ...card, borderTop: `3px solid ${k.kleur}`, padding: '16px 20px' }}>
            <div style={lbl}>{k.label}</div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800, margin: '6px 0 2px' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: C.sub }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Student kaarten */}
      {mijnStudenten.map(pl => {
        const student = studenten.find(s => s.id === pl.student_id)
        if (!student) return null
        const alerts = berekenAlerts(pl, uren, assignments)
        const goedBezig = getGoedBezig(student.id)
        const goedgekeurdUren = uren.filter(u => u.placement_id === pl.id && u.status === 'approved').reduce((t, u) => t + Number(u.hours), 0)
        const isOpen = openKaart === pl.id
        const stories = storiesPerStudent[student.id] || []

        return (
          <div key={pl.id} style={{ ...card, marginBottom: 14 }}>
            {/* Header rij */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: C.blue, flexShrink: 0 }}>
                  {getInitialen(student.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{student.name}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>{student.klas} {pl.company_name ? `· ${pl.company_name}` : ''}</div>
                  <div style={{ marginTop: 4 }}>
                    {alerts.map(a => <AlertTag key={a} type={a} />)}
                    {alerts.length === 0 && pl.company_name && <StatusBadge status="active" />}
                    {!pl.company_name && <StatusBadge status="geen stage" />}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpenKaart(isOpen ? null : pl.id)} style={{ padding: '6px 14px', background: isOpen ? C.blue : C.blueBg, border: 'none', borderRadius: 8, color: isOpen ? '#fff' : C.blue, fontWeight: 600, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                {isOpen ? 'Inklappen' : 'Bekijken'}
              </button>
            </div>

            {/* Voortgangsbalk altijd zichtbaar */}
            {pl.company_name && (
              <div style={{ marginTop: 14 }}>
                <ProgressBar value={goedgekeurdUren} max={pl.hours_required || 320} />
              </div>
            )}

            {/* Uitklapbaar detail */}
            {isOpen && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <StageroUte fase={pl.status === 'active' ? 1 : pl.status === 'halfway' ? 2 : 0} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  {/* Student info */}
                  <div style={{ background: C.blueBg, borderRadius: 10, padding: 14 }}>
                    <div style={{ ...lbl, marginBottom: 8 }}>🎒 Student</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{[pl.first_name, pl.infix, pl.last_name].filter(Boolean).join(' ') || student.name}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>📚 {student.klas}</div>
                    {pl.student_phone && <div style={{ fontSize: 12, marginTop: 2 }}>📞 <a href={`tel:${pl.student_phone}`} style={{ color: C.blue }}>{pl.student_phone}</a></div>}
                    <div style={{ fontSize: 12, marginTop: 2 }}>📧 <a href={`mailto:${student.email}`} style={{ color: C.blue }}>{student.email}</a></div>
                  </div>
                  {/* Bedrijf info */}
                  <div style={{ background: C.blueBg, borderRadius: 10, padding: 14 }}>
                    <div style={{ ...lbl, marginBottom: 8 }}>🏢 Stagebedrijf</div>
                    {pl.company_name ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{pl.company_name}</div>
                        {pl.supervisor_name && <div style={{ fontSize: 12, marginTop: 3 }}>👤 {pl.supervisor_name}</div>}
                        {pl.company_address && (
                          <div style={{ fontSize: 12, marginTop: 2 }}>
                            <a href={`https://maps.google.com?q=${encodeURIComponent(pl.company_address + ' ' + pl.company_city)}`} target="_blank" rel="noreferrer" style={{ color: C.orange }}>
                              📍 {pl.company_address}, {pl.company_city}
                            </a>
                          </div>
                        )}
                        {pl.company_phone && <div style={{ fontSize: 12, marginTop: 2 }}>📞 <a href={`tel:${pl.company_phone}`} style={{ color: C.blue }}>{pl.company_phone}</a></div>}
                        {pl.company_email && <div style={{ fontSize: 12, marginTop: 2 }}>📧 <a href={`mailto:${pl.company_email}`} style={{ color: C.blue }}>{pl.company_email}</a></div>}
                      </>
                    ) : <div style={{ fontSize: 13, color: C.sub }}>Nog niet ingevuld</div>}
                  </div>
                </div>

                {/* Weekstory preview */}
                {stories.length > 0 && (
                  <div style={{ marginTop: 14, background: '#FAFAF8', borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                    <div style={{ ...lbl, marginBottom: 10 }}>✨ Laatste weekstory — Week {stories[0].week_number}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22 }}>{stories[0].mood}</span>
                      {stories[0].answer_1 && <div style={{ flex: 1 }}><span style={{ fontWeight: 600, color: C.sub }}>Tofste moment: </span>{stories[0].answer_1}</div>}
                    </div>
                    {stories[0].answer_2 && <div style={{ fontSize: 13, marginTop: 6 }}><span style={{ fontWeight: 600, color: C.sub }}>Uitdaging: </span>{stories[0].answer_2}</div>}
                    {stories[0].answer_3 && <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ fontWeight: 600, color: C.sub }}>Volgende week: </span>{stories[0].answer_3}</div>}
                  </div>
                )}

                {/* Actieknoppen */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => onPraise(student.id)}
                    disabled={goedBezig >= 3}
                    style={{ padding: '8px 16px', background: goedBezig >= 3 ? C.border : C.orange, border: 'none', borderRadius: 8, color: goedBezig >= 3 ? C.sub : '#fff', fontWeight: 700, fontSize: 13, cursor: goedBezig >= 3 ? 'not-allowed' : 'pointer' }}
                  >
                    👊 Goed bezig! {goedBezig > 0 ? `(${goedBezig}/3)` : ''}
                  </button>
                  <a href={`mailto:${student.email}`} style={{ padding: '8px 16px', background: C.blueBg, border: 'none', borderRadius: 8, color: C.blue, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    📧 Mail student
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────── TAB: NAKIJKEN ───────────────────────────
function NakijkenTab({ profile, inleveringen, opdrachten, studenten, placements, onGraded }) {
  const [actief, setActief] = useState(null)
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState('')
  const [bezig, setBezig] = useState(false)

  const mijnStudentIds = new Set(placements.filter(pl => pl.coach_id === profile.id).map(pl => pl.student_id))
  const teNakijken = inleveringen.filter(inv => mijnStudentIds.has(inv.student_id))
  const actieveInlevering = teNakijken.find(i => i.id === actief)
  const actieveOpdracht = actieveInlevering ? opdrachten.find(o => o.id === actieveInlevering.assignment_id) : null
  const vragen = actieveOpdracht?.questions || []
  const maxPunten = vragen.reduce((t, v) => t + (v.punten || 0), 0) || actieveOpdracht?.max_points || 10
  const behaald = Object.values(scores).reduce((t, s) => t + (s || 0), 0)
  const cijfer = maxPunten > 0 ? Math.min(1 + 9 * (behaald / maxPunten), 10) : 0
  const allesBeoordeeld = vragen.length === 0 || vragen.every((_, i) => scores[i] !== undefined)

  async function vaststellenCijfer() {
    if (!allesBeoordeeld) return
    setBezig(true)
    const supabase = createClient()
    const { error } = await supabase.from('student_assignments').update({
      status: 'graded',
      grade: parseFloat(cijfer.toFixed(1)),
      points: behaald,
      feedback: feedback || null,
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    }).eq('id', actief)
    if (!error) {
      onGraded(actief)
      setActief(null)
      setScores({})
      setFeedback('')
    }
    setBezig(false)
  }

  if (!actief) return (
    <div>
      {teNakijken.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Alles nagekeken</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Geen ingeleverde opdrachten in de wachtrij.</div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            Nakijkstapel <span style={{ background: C.orange, color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 12, marginLeft: 6 }}>{teNakijken.length}</span>
          </div>
          <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Klik op "Nakijken" om een opdracht te openen en per vraag punten toe te kennen.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F3EE' }}>
                {['Student', 'Opdracht', 'Ingediend', 'Max punten', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teNakijken.map(inv => {
                const student = studenten.find(s => s.id === inv.student_id)
                const opdracht = opdrachten.find(o => o.id === inv.assignment_id)
                const max = (opdracht?.questions || []).reduce((t, v) => t + (v.punten || 0), 0) || opdracht?.max_points || 10
                return (
                  <tr key={inv.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{student?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{opdracht?.title || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.sub }}>{fmtDatum(inv.submitted_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{max} ptn</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button onClick={() => { setActief(inv.id); setScores({}) }} style={{ padding: '6px 14px', background: C.orange, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        ✏️ Nakijken
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const student = studenten.find(s => s.id === actieveInlevering?.student_id)
  return (
    <div>
      <button onClick={() => { setActief(null); setScores({}) }} style={{ marginBottom: 16, padding: '7px 14px', background: C.blueBg, border: 'none', borderRadius: 8, color: C.blue, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        ← Terug naar nakijkstapel
      </button>

      {/* Sticky score header */}
      <div style={{ ...card, position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{actieveOpdracht?.title} — {student?.name}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{behaald} van {maxPunten} punten toegekend</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 800, color: allesBeoordeeld ? (cijfer >= 5.5 ? C.green : C.red) : C.sub }}>
            {allesBeoordeeld ? cijfer.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 11, color: C.sub }}>cijfer (automatisch)</div>
        </div>
      </div>

      {/* Per vraag nakijken */}
      {vragen.length > 0 ? (() => {
        let antwoordenMap = {}
        try { antwoordenMap = JSON.parse(actieveInlevering?.answer || '{}') } catch {}
        return vragen.map((vr, i) => {
          const antwoord = antwoordenMap[vr.id] || antwoordenMap[String(vr.id)] || '(geen antwoord)'
          return (
        <div key={i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Vraag {i + 1} · max {vr.punten || 0} punten</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>{vr.v || vr.vraag}</div>
          <div style={{ background: '#F7F3EE', borderRadius: 8, padding: 12, fontSize: 13, color: C.ink, lineHeight: 1.6, marginBottom: 12 }}>
            💬 <em>{antwoord}</em>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.sub }}>Punten:</span>
            {Array.from({ length: (vr.punten || 0) + 1 }, (_, p) => (
              <button key={p} onClick={() => setScores(prev => ({ ...prev, [i]: p }))} style={{ minWidth: 36, padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: scores[i] === p ? C.orange : C.blueBg, color: scores[i] === p ? '#fff' : C.blue }}>
                {p}
              </button>
            ))}
          </div>
        </div>
          )
        })
      })() : (
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ ...lbl, marginBottom: 8 }}>Antwoord student</div>
          <div style={{ background: '#F7F3EE', borderRadius: 8, padding: 14, fontSize: 14, color: C.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {actieveInlevering?.answer || '—'}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ ...lbl, marginBottom: 6 }}>Cijfer (1-10)</label>
            <input type="number" min="1" max="10" step="0.1" value={scores[0] ?? ''} onChange={e => setScores({ 0: parseFloat(e.target.value) || 0 })} style={{ width: 90, padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
          </div>
        </div>
      )}

      {/* Feedback + vaststellen */}
      <div style={card}>
        <label style={{ ...lbl, marginBottom: 6 }}>Feedback (optioneel)</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Geef een toelichting voor de student..." style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none', resize: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <button onClick={vaststellenCijfer} disabled={!allesBeoordeeld || bezig} style={{ padding: '10px 22px', background: allesBeoordeeld ? C.orange : C.border, border: 'none', borderRadius: 10, color: allesBeoordeeld ? '#fff' : C.sub, fontWeight: 700, fontSize: 14, cursor: allesBeoordeeld ? 'pointer' : 'not-allowed' }}>
            {bezig ? '⏳ Opslaan...' : `✓ Cijfer vaststellen: ${allesBeoordeeld ? cijfer.toFixed(1) : '—'}`}
          </button>
          <span style={{ fontSize: 12, color: C.sub }}>Student en coördinator zien het cijfer direct.</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── TAB: EVALUATIES ─────────────────────────
function EvaluatiesTab({ profile, placements, studenten, evalMomenten, evalResponses, onSaveResponse }) {
  const [actiefPlacement, setActiefPlacement] = useState(null)
  const [actiefMoment, setActiefMoment] = useState(null)
  const [antwoorden, setAntwoorden] = useState({})
  const [bezig, setBezig] = useState(false)

  const mijnPlacements = placements.filter(pl => pl.coach_id === profile.id && pl.company_name)

  function laadAntwoorden(placementId, momentId) {
    const resp = evalResponses.find(r => r.placement_id === placementId && r.moment_id === momentId)
    setAntwoorden(resp?.responses || {})
    setActiefPlacement(placementId)
    setActiefMoment(momentId)
  }

  async function slaOp() {
    setBezig(true)
    const supabase = createClient()
    const bestaand = evalResponses.find(r => r.placement_id === actiefPlacement && r.moment_id === actiefMoment)
    let error
    if (bestaand) {
      const res = await supabase.from('evaluation_responses').update({ responses: antwoorden, coach_signed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', bestaand.id)
      error = res.error
    } else {
      const res = await supabase.from('evaluation_responses').insert({ school_id: profile.school_id, placement_id: actiefPlacement, moment_id: actiefMoment, coach_id: profile.id, responses: antwoorden, coach_signed_at: new Date().toISOString() })
      error = res.error
    }
    if (!error) {
      onSaveResponse({ placement_id: actiefPlacement, moment_id: actiefMoment, responses: antwoorden })
      setActiefPlacement(null)
      setActiefMoment(null)
    }
    setBezig(false)
  }

  const actiefMomentData = evalMomenten.find(m => m.id === actiefMoment)
  const actiefStudentData = studenten.find(s => {
    const pl = placements.find(p => p.id === actiefPlacement)
    return pl && s.id === pl.student_id
  })

  if (actiefMoment && actiefMomentData) return (
    <div>
      <button onClick={() => { setActiefPlacement(null); setActiefMoment(null) }} style={{ marginBottom: 16, padding: '7px 14px', background: C.blueBg, border: 'none', borderRadius: 8, color: C.blue, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        ← Terug
      </button>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700 }}>{actiefMomentData.name}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>Student: {actiefStudentData?.name} · {actiefMomentData.week_label}</div>
      </div>

      {(actiefMomentData.questions || []).map((vr, i) => (
        <div key={i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{vr.tekst}</div>
          {vr.type === 'slider' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.sub, marginBottom: 6 }}>
                <span>Onvoldoende</span><span>Uitstekend</span>
              </div>
              <input type="range" min="1" max="10" value={antwoorden[i] ?? 5} onChange={e => setAntwoorden(p => ({ ...p, [i]: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: C.orange }} />
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: C.orange, marginTop: 4 }}>{antwoorden[i] ?? 5}</div>
            </div>
          )}
          {vr.type === 'sterren' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['Onvoldoende', 'Voldoende', 'Goed', 'Uitstekend'].map((label, j) => (
                <button key={j} onClick={() => setAntwoorden(p => ({ ...p, [i]: j + 1 }))} style={{ flex: 1, padding: '10px 6px', borderRadius: 8, border: `2px solid ${antwoorden[i] === j + 1 ? C.orange : C.border}`, background: antwoorden[i] === j + 1 ? '#FDEADD' : '#fff', color: antwoorden[i] === j + 1 ? C.orange : C.sub, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {'⭐'.repeat(j + 1)}<br />{label}
                </button>
              ))}
            </div>
          )}
          {vr.type === 'tekst' && (
            <textarea value={antwoorden[i] ?? ''} onChange={e => setAntwoorden(p => ({ ...p, [i]: e.target.value }))} rows={3} placeholder="Typ hier je feedback..." style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none', resize: 'vertical' }} />
          )}
        </div>
      ))}

      <div style={{ ...card }}>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>
          Door te ondertekenen bevestig je dat dit formulier volledig en naar waarheid is ingevuld.
        </div>
        <button onClick={slaOp} disabled={bezig} style={{ padding: '11px 24px', background: C.green, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {bezig ? '⏳ Opslaan...' : '✅ Opslaan & Ondertekenen'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {mijnPlacements.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 14, color: C.sub }}>Geen actieve studenten om te evalueren.</div>
        </div>
      ) : mijnPlacements.map(pl => {
        const student = studenten.find(s => s.id === pl.student_id)
        return (
          <div key={pl.id} style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{student?.name} <span style={{ fontWeight: 400, fontSize: 13, color: C.sub }}>{student?.klas}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
              {evalMomenten.map(moment => {
                const ingevuld = evalResponses.some(r => r.placement_id === pl.id && r.moment_id === moment.id)
                return (
                  <div key={moment.id} style={{ background: ingevuld ? C.greenBg : '#F7F3EE', borderRadius: 10, padding: 14, border: `1px solid ${ingevuld ? '#A8D5BA' : C.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{moment.name}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>{moment.week_label} · {(moment.questions || []).length} vragen</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ingevuld ? C.green : C.sub, marginBottom: 10 }}>
                      {ingevuld ? '✅ Ingevuld & ondertekend' : '⏳ Nog niet ingevuld'}
                    </div>
                    <button onClick={() => laadAntwoorden(pl.id, moment.id)} style={{ width: '100%', padding: '7px', background: ingevuld ? C.white : C.orange, border: `1px solid ${ingevuld ? C.border : C.orange}`, borderRadius: 8, color: ingevuld ? C.blue : '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {ingevuld ? '✏️ Bekijken / Bewerken' : '📝 Invullen'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────── TAB: INSCHRIJVEN ────────────────────────
function InschrijvenTab({ profile, placements, studenten, onInschrijving }) {
  const [bezig, setBezigId] = useState(null)

  async function schrijfIn(placementId) {
    setBezigId(placementId)
    const supabase = createClient()
    const { error } = await supabase.from('placements').update({
      coach_id: profile.id,
      coach_name: profile.name,
      coach_email: profile.email,
    }).eq('id', placementId)
    if (!error) onInschrijving(placementId, profile.id)
    setBezigId(null)
  }

  async function schrijfUit(placementId) {
    setBezigId(placementId)
    const supabase = createClient()
    const { error } = await supabase.from('placements').update({ coach_id: null, coach_name: null, coach_email: null }).eq('id', placementId)
    if (!error) onInschrijving(placementId, null)
    setBezigId(null)
  }

  const actiefPlacements = placements.filter(pl => !['cancelled', 'completed', 'pending'].includes(pl.status))

  return (
    <div style={card}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Schrijf je in op studenten</div>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Kies zelf welke studenten jij begeleidt. Eén klik en de student staat op jouw lijst. Uitschrijven kan ook altijd.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F7F3EE' }}>
            {['Student', 'Klas', 'Stagebedrijf', 'Coach', ''].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {actiefPlacements.map(pl => {
            const student = studenten.find(s => s.id === pl.student_id)
            if (!student) return null
            const isMijn = pl.coach_id === profile.id
            const heeftCoach = !!pl.coach_id && !isMijn
            return (
              <tr key={pl.id} style={{ borderTop: `1px solid ${C.border}`, background: isMijn ? '#F0FFF8' : '#fff' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.blue }}>{getInitialen(student.name)}</div>
                    {student.name}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: C.sub }}>{student.klas}</td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{pl.company_name || '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  {isMijn
                    ? <span style={{ padding: '3px 10px', borderRadius: 20, background: '#FFE8D4', color: C.orange, fontSize: 12, fontWeight: 700 }}>✋ Jij</span>
                    : heeftCoach
                      ? <span style={{ padding: '3px 10px', borderRadius: 20, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 600 }}>{pl.coach_name}</span>
                      : <span style={{ padding: '3px 10px', borderRadius: 20, background: '#F0FFF4', color: C.green, fontSize: 12, fontWeight: 600 }}>Nog vrij</span>
                  }
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {isMijn
                    ? <button onClick={() => schrijfUit(pl.id)} disabled={bezig === pl.id} style={{ padding: '6px 14px', background: C.redBg, border: 'none', borderRadius: 8, color: C.red, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Uitschrijven</button>
                    : !heeftCoach
                      ? <button onClick={() => schrijfIn(pl.id)} disabled={bezig === pl.id} style={{ padding: '6px 14px', background: C.orange, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✋ Schrijf mij in</button>
                      : null
                  }
                </td>
              </tr>
            )
          })}
          {actiefPlacements.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.sub, fontSize: 14 }}>Geen actieve stages gevonden</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────── HOOFDCOMPONENT ──────────────────────────
export default function CoachDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [placements, setPlacements] = useState([])
  const [studenten, setStudenten] = useState([])
  const [uren, setUren] = useState([])
  const [opdrachten, setOpdrachten] = useState([])
  const [inleveringen, setInleveringen] = useState([])
  const [evalMomenten, setEvalMomenten] = useState([])
  const [evalResponses, setEvalResponses] = useState([])
  const [praise, setPraise] = useState([])
  const [storiesPerStudent, setStoriesPerStudent] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('studenten')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coach') { router.replace('/login'); return }
      setProfile(prof)

      const [{ data: pl }, { data: st }, { data: ur }, { data: opdr }, { data: inv }, { data: em }, { data: er }, { data: pr }, { data: ws }] = await Promise.all([
        supabase.from('placements').select('*').eq('school_id', prof.school_id).not('status', 'in', '("cancelled","completed")'),
        supabase.from('profiles').select('id,name,klas,email,xp,streak').eq('school_id', prof.school_id).eq('role', 'student'),
        supabase.from('hours').select('*').eq('school_id', prof.school_id),
        supabase.from('assignments').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('student_assignments').select('*').eq('school_id', prof.school_id).eq('status', 'submitted'),
        supabase.from('evaluation_moments').select('*').eq('school_id', prof.school_id).order('sort_order'),
        supabase.from('evaluation_responses').select('*').eq('school_id', prof.school_id),
        supabase.from('coach_praise').select('*').eq('school_id', prof.school_id).eq('coach_id', prof.id),
        supabase.from('week_stories').select('*').eq('school_id', prof.school_id).order('created_at', { ascending: false }),
      ])

      setPlacements(pl ?? [])
      setStudenten(st ?? [])
      setUren(ur ?? [])
      setOpdrachten(opdr ?? [])
      setInleveringen(inv ?? [])
      setEvalMomenten(em ?? [])
      setEvalResponses(er ?? [])
      setPraise(pr ?? [])

      // Groepeer stories per student
      const grouped = {}
      ;(ws ?? []).forEach(s => {
        if (!grouped[s.student_id]) grouped[s.student_id] = []
        grouped[s.student_id].push(s)
      })
      setStoriesPerStudent(grouped)
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handlePraise(studentId) {
    const supabase = createClient()
    const bestaand = praise.find(p => p.student_id === studentId)
    const huidigCount = bestaand?.count || 0
    if (huidigCount >= 3) return

    if (bestaand) {
      await supabase.from('coach_praise').update({ count: huidigCount + 1, last_given_at: new Date().toISOString() }).eq('id', bestaand.id)
      setPraise(prev => prev.map(p => p.student_id === studentId ? { ...p, count: huidigCount + 1 } : p))
    } else {
      const { data } = await supabase.from('coach_praise').insert({ school_id: profile.school_id, coach_id: profile.id, student_id: studentId, count: 1 }).select().single()
      if (data) setPraise(prev => [...prev, data])
    }
    showToast('👊 Goed bezig! De student ziet dit.')
  }

  function handleInschrijving(placementId, coachId) {
    setPlacements(prev => prev.map(pl => pl.id === placementId ? { ...pl, coach_id: coachId, coach_name: coachId ? profile.name : null } : pl))
    showToast(coachId ? '✅ Ingeschreven!' : '↩️ Uitgeschreven')
  }

  function handleGraded(invId) {
    setInleveringen(prev => prev.filter(i => i.id !== invId))
    showToast('✅ Cijfer vastgesteld!')
  }

  function handleSaveResponse(data) {
    setEvalResponses(prev => {
      const idx = prev.findIndex(r => r.placement_id === data.placement_id && r.moment_id === data.moment_id)
      if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, ...data } : r)
      return [...prev, data]
    })
    showToast('✅ Evaluatie opgeslagen!')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.orange}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
    </div>
  )

  const TABS = [
    { key: 'studenten', label: '🧭 Mijn studenten' },
    { key: 'nakijken', label: `✅ Nakijken${inleveringen.filter(i => placements.find(pl => pl.coach_id === profile.id && pl.student_id === i.student_id)).length > 0 ? ` (${inleveringen.filter(i => placements.find(pl => pl.coach_id === profile.id && pl.student_id === i.student_id)).length})` : ''}` },
    { key: 'evaluaties', label: '📋 Evaluaties' },
    { key: 'inschrijven', label: '📝 Inschrijven' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? C.green : C.red, color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 17, color: C.blue, padding: '16px 0' }}>Stagepoort</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '18px 16px', background: 'none', border: 'none', borderBottom: tab === t.key ? `3px solid ${C.orange}` : '3px solid transparent', color: tab === t.key ? C.orange : C.sub, fontWeight: tab === t.key ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: C.blueBg, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: C.blue }}>👤 {profile?.name}</div>
          <button onClick={async () => { const s = createClient(); await s.auth.signOut(); router.replace('/login') }} style={{ padding: '6px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.sub, cursor: 'pointer' }}>
            Uitloggen
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
        {tab === 'studenten' && (
          <MijnStudentenTab profile={profile} placements={placements} studenten={studenten} uren={uren} assignments={opdrachten} praise={praise} onPraise={handlePraise} onShowStories={() => {}} storiesPerStudent={storiesPerStudent} />
        )}
        {tab === 'nakijken' && (
          <NakijkenTab profile={profile} inleveringen={inleveringen} opdrachten={opdrachten} studenten={studenten} placements={placements} onGraded={handleGraded} />
        )}
        {tab === 'evaluaties' && (
          <EvaluatiesTab profile={profile} placements={placements} studenten={studenten} evalMomenten={evalMomenten} evalResponses={evalResponses} onSaveResponse={handleSaveResponse} />
        )}
        {tab === 'inschrijven' && (
          <InschrijvenTab profile={profile} placements={placements} studenten={studenten} onInschrijving={handleInschrijving} />
        )}
      </div>
    </div>
  )
}
