'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Anonieme client — begeleider is niet ingelogd, werkt via UUID-token in URL
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F7F3EE', white: '#FFFFFF', border: '#E4DDD4',
  ink: '#1A2633', sub: '#5C6B7A', light: '#9AA8B2',
  blue: '#0E3A5C', orange: '#F26B1D', green: '#1A7F52', red: '#C03020',
  blueBg: '#E8F0F6', greenBg: '#E2F4EC', redBg: '#FAEAE7', yellowBg: '#FBF0D8',
}
const card  = { background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }
const lbl   = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.sub }
const badge = (bg, color) => ({ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color })

function fmtDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Tab: Uren ────────────────────────────────────────────────────────────────
function UrenTab({ placementId, uren, setUren }) {
  const [afwijsReden, setAfwijsReden] = useState({})
  const [bezig, setBezig] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  async function verwerkUur(hourId, actie, reden = null) {
    setBezig(hourId)
    const sb = getClient()
    const { data, error } = await sb.rpc('begeleider_keur_uur', {
      p_placement_id: placementId,
      p_hour_id: hourId,
      p_actie: actie,
      p_reden: reden,
    })
    if (error || data?.error) {
      showToast(data?.error || 'Er ging iets mis', false)
    } else {
      setUren(prev => prev.map(u => u.id === hourId
        ? { ...u, status: actie === 'goedkeuren' ? 'approved' : 'rejected', rejection_reason: reden }
        : u
      ))
      showToast(actie === 'goedkeuren' ? '✅ Uren goedgekeurd!' : '❌ Uren afgewezen')
    }
    setBezig(null)
  }

  const pending   = uren.filter(u => u.status === 'pending')
  const verwerkt  = uren.filter(u => u.status !== 'pending')
  const totaalGoed = uren.filter(u => u.status === 'approved').reduce((t, u) => t + Number(u.hours), 0)

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok ? C.green : C.red, color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {/* Samenvatting */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Goedgekeurd', value: `${totaalGoed} u`, kleur: C.green },
          { label: 'Wacht op beoordeling', value: `${pending.length}`, kleur: C.orange },
          { label: 'Totaal ingediend', value: `${uren.length}`, kleur: C.blue },
        ].map(k => (
          <div key={k.label} style={{ ...card, borderTop: `3px solid ${k.kleur}`, padding: '14px 16px' }}>
            <div style={lbl}>{k.label}</div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 800, color: k.kleur, margin: '4px 0' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Pending uren */}
      {pending.length > 0 && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            ⏳ Te beoordelen
            <span style={{ ...badge(C.orange + '22', C.orange), marginLeft: 8 }}>{pending.length}</span>
          </div>
          {pending.map(uur => (
            <div key={uur.id} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDatum(uur.date)} · <span style={{ color: C.orange }}>{uur.hours} uur</span></div>
                  {uur.description && <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{uur.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => verwerkUur(uur.id, 'goedkeuren')} disabled={bezig === uur.id}
                    style={{ padding: '7px 14px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ✓ Goed
                  </button>
                  <button onClick={() => {
                    const reden = afwijsReden[uur.id]
                    if (!reden?.trim()) { setAfwijsReden(p => ({ ...p, [uur.id]: '' })); return }
                    verwerkUur(uur.id, 'afwijzen', reden)
                  }} disabled={bezig === uur.id}
                    style={{ padding: '7px 14px', background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, color: C.red, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ✕ Afwijzen
                  </button>
                </div>
              </div>
              {afwijsReden[uur.id] !== undefined && (
                <div style={{ marginTop: 10 }}>
                  <input
                    placeholder="Reden voor afwijzing (verplicht)..."
                    value={afwijsReden[uur.id]}
                    onChange={e => setAfwijsReden(p => ({ ...p, [uur.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && verwerkUur(uur.id, 'afwijzen', afwijsReden[uur.id])}
                    style={{ width: '100%', padding: '9px 14px', border: `1.5px solid ${C.red}`, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none' }}
                    autoFocus
                  />
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Druk Enter of klik nogmaals Afwijzen om te bevestigen</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Verwerkte uren */}
      {verwerkt.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📋 Eerder verwerkt</div>
          {verwerkt.map(uur => (
            <div key={uur.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDatum(uur.date)} · {uur.hours} uur</div>
                {uur.description && <div style={{ fontSize: 12, color: C.sub }}>{uur.description}</div>}
                {uur.rejection_reason && <div style={{ fontSize: 12, color: C.red, marginTop: 2 }}>Reden: {uur.rejection_reason}</div>}
              </div>
              <span style={badge(uur.status === 'approved' ? C.greenBg : C.redBg, uur.status === 'approved' ? C.green : C.red)}>
                {uur.status === 'approved' ? '✓ Goedgekeurd' : '✕ Afgewezen'}
              </span>
            </div>
          ))}
        </div>
      )}

      {uren.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, color: C.sub }}>De leerling heeft nog geen uren ingediend.</div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Evaluaties ──────────────────────────────────────────────────────────
function EvaluatiesTab({ placementId, evalMomenten, evalResponses, setEvalResponses }) {
  const [actief, setActief] = useState(null)
  const [antwoorden, setAntwoorden] = useState({})
  const [bezig, setBezig] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  function laadMoment(moment) {
    const bestaand = evalResponses.find(r => r.moment_id === moment.id)
    setAntwoorden(bestaand?.responses || {})
    setActief(moment)
  }

  async function slaOp() {
    setBezig(true)
    const sb = getClient()
    const { data, error } = await sb.rpc('begeleider_sla_evaluatie_op', {
      p_placement_id: placementId,
      p_moment_id: actief.id,
      p_responses: antwoorden,
    })
    if (error || data?.error) {
      showToast(data?.error || 'Opslaan mislukt', false)
    } else {
      setEvalResponses(prev => {
        const idx = prev.findIndex(r => r.moment_id === actief.id)
        const nieuw = { moment_id: actief.id, placement_id: placementId, responses: antwoorden }
        return idx >= 0 ? prev.map((r, i) => i === idx ? nieuw : r) : [...prev, nieuw]
      })
      showToast('✅ Evaluatie opgeslagen & ondertekend!')
      setActief(null)
    }
    setBezig(false)
  }

  if (actief) return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok ? C.green : C.red, color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999 }}>{toast.msg}</div>}
      <button onClick={() => setActief(null)} style={{ marginBottom: 16, padding: '7px 14px', background: C.blueBg, border: 'none', borderRadius: 8, color: C.blue, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>← Terug</button>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700 }}>{actief.name}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{actief.week_label} · {(actief.questions || []).length} vragen</div>
      </div>
      {(actief.questions || []).map((vr, i) => (
        <div key={i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{vr.tekst}</div>
          {vr.type === 'slider' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.sub, marginBottom: 6 }}><span>Onvoldoende</span><span>Uitstekend</span></div>
              <input type="range" min="1" max="10" value={antwoorden[i] ?? 5} onChange={e => setAntwoorden(p => ({ ...p, [i]: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: C.orange }} />
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, color: C.orange, marginTop: 4 }}>{antwoorden[i] ?? 5}</div>
            </div>
          )}
          {vr.type === 'sterren' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['Onvoldoende', 'Voldoende', 'Goed', 'Uitstekend'].map((label, j) => (
                <button key={j} onClick={() => setAntwoorden(p => ({ ...p, [i]: j + 1 }))}
                  style={{ flex: 1, padding: '10px 6px', borderRadius: 8, border: `2px solid ${antwoorden[i] === j + 1 ? C.orange : C.border}`, background: antwoorden[i] === j + 1 ? '#FDEADD' : '#fff', color: antwoorden[i] === j + 1 ? C.orange : C.sub, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
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
      <div style={card}>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Door te ondertekenen bevestig je dat dit formulier naar waarheid is ingevuld.</div>
        <button onClick={slaOp} disabled={bezig} style={{ padding: '11px 24px', background: C.green, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {bezig ? '⏳ Opslaan...' : '✅ Opslaan & Ondertekenen'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {evalMomenten.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: C.sub }}>Geen evaluatiemomenten geconfigureerd door de coördinator.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 14 }}>
          {evalMomenten.map(m => {
            const ingevuld = evalResponses.some(r => r.moment_id === m.id)
            return (
              <div key={m.id} style={{ ...card, border: `1px solid ${ingevuld ? '#A8D5BA' : C.border}`, background: ingevuld ? C.greenBg : C.white }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{m.week_label} · {(m.questions || []).length} vragen</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ingevuld ? C.green : C.sub, marginBottom: 12 }}>
                  {ingevuld ? '✅ Ingevuld & ondertekend' : '⏳ Nog niet ingevuld'}
                </div>
                <button onClick={() => laadMoment(m)}
                  style={{ width: '100%', padding: '8px', background: ingevuld ? C.white : C.orange, border: `1px solid ${ingevuld ? C.border : C.orange}`, borderRadius: 8, color: ingevuld ? C.blue : '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {ingevuld ? '✏️ Bekijken / Aanpassen' : '📝 Invullen'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Stageinfo ───────────────────────────────────────────────────────────
function InfoTab({ placement, uren }) {
  const goedgekeurd = uren.filter(u => u.status === 'approved').reduce((t, u) => t + Number(u.hours), 0)
  const vereist = placement.hours_required || 320
  const pct = Math.min(100, Math.round((goedgekeurd / vereist) * 100))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Voortgang */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom: 10 }}>⏱ Uren voortgang</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ fontWeight: 700 }}>{goedgekeurd} / {vereist} uur goedgekeurd</span>
          <span style={{ color: C.sub }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? C.green : pct >= 60 ? C.orange : C.red, borderRadius: 99, transition: 'width .4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Leerling */}
        <div style={card}>
          <div style={{ ...lbl, marginBottom: 10 }}>🎒 Leerling</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {[placement.first_name, placement.infix, placement.last_name].filter(Boolean).join(' ') || '—'}
          </div>
          {placement.student_phone && <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>📞 {placement.student_phone}</div>}
          {placement.status && (
            <span style={{ ...badge(C.greenBg, C.green), marginTop: 8 }}>
              {placement.status === 'active' ? '🟢 Actief' : placement.status === 'halfway' ? '🟡 Halverwege' : placement.status}
            </span>
          )}
        </div>

        {/* Bedrijf */}
        <div style={card}>
          <div style={{ ...lbl, marginBottom: 10 }}>🏢 Stagebedrijf</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{placement.company_name || '—'}</div>
          {placement.company_address && (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>
              📍 {placement.company_address}, {placement.company_postcode} {placement.company_city}
            </div>
          )}
          {placement.company_phone && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>📞 {placement.company_phone}</div>}
        </div>
      </div>

      {/* Stage details */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom: 10 }}>📅 Stage details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          {[
            ['Startdatum', fmtDatum(placement.approved_at)],
            ['Stagebegeleider', placement.supervisor_name],
            ['Groene stage', placement.green_stage ? '🌱 Ja' : '❌ Nee'],
            ['Uren doel', `${vereist} uur`],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ ...lbl, fontSize: 10, marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600 }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Hoofdpagina ──────────────────────────────────────────────────────────────
export default function BegeleiderDashboard() {
  const params = useParams()
  const placementId = params.placement_id
  const [placement, setPlacement] = useState(null)
  const [uren, setUren] = useState([])
  const [evalMomenten, setEvalMomenten] = useState([])
  const [evalResponses, setEvalResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [fout, setFout] = useState(null)
  const [tab, setTab] = useState('uren')

  useEffect(() => {
    const sb = getClient()
    const load = async () => {
      const { data: pl, error } = await sb
        .from('placements')
        .select('*')
        .eq('id', placementId)
        .single()

      if (error || !pl) { setFout('Deze link is ongeldig of niet meer actief.'); setLoading(false); return }
      if (!['active', 'halfway', 'completed'].includes(pl.status)) {
        setFout('Deze link is nog niet actief. De stage moet eerst goedgekeurd worden door de coördinator.')
        setLoading(false); return
      }

      setPlacement(pl)

      const [{ data: ur }, { data: em }, { data: er }] = await Promise.all([
        sb.from('hours').select('*').eq('placement_id', placementId).order('date', { ascending: false }),
        sb.from('evaluation_moments').select('*').eq('school_id', pl.school_id).order('sort_order'),
        sb.from('evaluation_responses').select('*').eq('placement_id', placementId),
      ])

      setUren(ur ?? [])
      setEvalMomenten(em ?? [])
      setEvalResponses(er ?? [])
      setLoading(false)
    }
    if (placementId) load()
  }, [placementId])

  const pendingCount = uren.filter(u => u.status === 'pending').length
  const TABS = [
    { key: 'uren', label: `⏱ Uren${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'evaluaties', label: '📋 Evaluaties' },
    { key: 'info', label: '📄 Stageinfo' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: 'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.orange}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: C.sub, fontSize: 14 }}>Laden...</div>
      </div>
    </div>
  )

  if (fout) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: 'Inter,sans-serif', padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ ...card, maxWidth: 440, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Geen toegang</div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>{fout}</div>
      </div>
    </div>
  )

  const leerlingNaam = [placement.first_name, placement.infix, placement.last_name].filter(Boolean).join(' ')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>

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
        <div style={{ padding: '6px 14px', background: C.blueBg, borderRadius: 20, fontSize: 13, fontWeight: 600, color: C.blue }}>
          🏢 Begeleider — {leerlingNaam || 'Stage'}
        </div>
      </div>

      {/* Student kaartje */}
      <div style={{ background: C.blue, padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
          {leerlingNaam ? leerlingNaam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
        </div>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>{leerlingNaam || '—'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{placement.company_name} · Begeleider: {placement.supervisor_name}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,.85)' }}>
          <span>⏱ {uren.filter(u => u.status === 'approved').reduce((t, u) => t + Number(u.hours), 0)} u goedgekeurd</span>
          {pendingCount > 0 && <span style={{ background: C.orange, padding: '3px 10px', borderRadius: 20, fontWeight: 700, color: '#fff' }}>⚠️ {pendingCount} wacht</span>}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px' }}>
        {tab === 'uren' && <UrenTab placementId={placementId} uren={uren} setUren={setUren} />}
        {tab === 'evaluaties' && <EvaluatiesTab placementId={placementId} evalMomenten={evalMomenten} evalResponses={evalResponses} setEvalResponses={setEvalResponses} />}
        {tab === 'info' && <InfoTab placement={placement} uren={uren} />}
      </div>
    </div>
  )
}
