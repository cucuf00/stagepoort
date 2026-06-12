'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'

function fmtDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Badge({ children, kleur }) {
  const map = {
    oranje: { bg: '#FDEADD', color: '#D4500E' },
    groen:  { bg: '#E2F4EC', color: '#1A7F52' },
    rood:   { bg: '#FAEAE7', color: '#C03020' },
    blauw:  { bg: '#E8F0F6', color: '#0E3A5C' },
    grijs:  { bg: '#F0EDE8', color: '#5C6B7A' },
  }
  const k = map[kleur] || map.grijs
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: k.bg, color: k.color }}>{children}</span>
}

export default function BeoordelenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('uren')
  const [toast, setToast] = useState(null)

  // Uren state
  const [uren, setUren] = useState([])
  const [placements, setPlacements] = useState([])
  const [studenten, setStudenten] = useState([])
  const [afwijsReden, setAfwijsReden] = useState({})
  const [showAfwijs, setShowAfwijs] = useState(null)
  const [urenBezig, setUrenBezig] = useState({})

  // Opdrachten state
  const [inleveringen, setInleveringen] = useState([])
  const [opdrachten, setOpdrachten] = useState([])
  const [showBeoordeel, setShowBeoordeel] = useState(null)
  const [beoordeelForm, setBeoordeelForm] = useState({ grade: '', feedback: '' })
  const [opdrBezig, setOpdrBezig] = useState({})

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('*')
        .eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)

      const [{ data: u }, { data: p }, { data: s }, { data: inv }, { data: opdr }] = await Promise.all([
        supabase.from('hours').select('*')
          .eq('school_id', prof.school_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase.from('placements').select('id,student_id,company_name,first_name,last_name,infix')
          .eq('school_id', prof.school_id),
        supabase.from('profiles').select('id,name,klas,email')
          .eq('school_id', prof.school_id).eq('role', 'student'),
        supabase.from('student_assignments').select('*')
          .eq('school_id', prof.school_id)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false }),
        supabase.from('assignments').select('*')
          .eq('school_id', prof.school_id),
      ])

      setUren(u ?? [])
      setPlacements(p ?? [])
      setStudenten(s ?? [])
      setInleveringen(inv ?? [])
      setOpdrachten(opdr ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function getStudent(placementId) {
    const pl = placements.find(p => p.id === placementId)
    return studenten.find(s => s.id === pl?.student_id)
  }

  function getStudentById(id) {
    return studenten.find(s => s.id === id)
  }

  // ===== UREN KEUREN =====
  async function keurUrenGoed(urId) {
    setUrenBezig(prev => ({ ...prev, [urId]: true }))
    const supabase = createClient()
    const { error } = await supabase.from('hours').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).eq('id', urId)

    if (!error) {
      setUren(prev => prev.filter(u => u.id !== urId))
      showToast('✅ Uren goedgekeurd!')
    } else showToast('❌ ' + error.message, false)
    setUrenBezig(prev => ({ ...prev, [urId]: false }))
  }

  async function keurUrenAf(urId) {
    const reden = afwijsReden[urId]?.trim()
    if (!reden) { showToast('❌ Vul een reden in', false); return }
    setUrenBezig(prev => ({ ...prev, [urId]: true }))
    const supabase = createClient()
    const { error } = await supabase.from('hours').update({
      status: 'rejected',
      rejection_reason: reden,
    }).eq('id', urId)

    if (!error) {
      setUren(prev => prev.filter(u => u.id !== urId))
      setShowAfwijs(null)
      showToast('↩️ Uren afgekeurd — leerling kan opnieuw indienen')
    } else showToast('❌ ' + error.message, false)
    setUrenBezig(prev => ({ ...prev, [urId]: false }))
  }

  async function keurAlleGoed() {
    const supabase = createClient()
    const ids = uren.map(u => u.id)
    const { error } = await supabase.from('hours').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).in('id', ids)

    if (!error) {
      setUren([])
      showToast(`✅ Alle ${ids.length} urenregels goedgekeurd!`)
    } else showToast('❌ ' + error.message, false)
  }

  // ===== OPDRACHTEN BEOORDELEN =====
  async function beoordeelOpdracht(invId) {
    const grade = parseFloat(beoordeelForm.grade)
    if (!grade || grade < 1 || grade > 10) { showToast('❌ Vul een geldig cijfer in (1-10)', false); return }
    setOpdrBezig(prev => ({ ...prev, [invId]: true }))
    const supabase = createClient()

    const { error } = await supabase.from('student_assignments').update({
      status: 'graded',
      grade: grade,
      feedback: beoordeelForm.feedback || null,
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    }).eq('id', invId)

    if (!error) {
      setInleveringen(prev => prev.filter(i => i.id !== invId))
      setShowBeoordeel(null)
      setBeoordeelForm({ grade: '', feedback: '' })
      showToast(`✅ Beoordeeld — cijfer ${grade.toFixed(1)} opgeslagen!`)
    } else showToast('❌ ' + error.message, false)
    setOpdrBezig(prev => ({ ...prev, [invId]: false }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E4DDD4', borderRadius: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#1A2633', outline: 'none', background: '#fff' }

  return (
    <CoordinatorLayout profile={profile}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok !== false ? '#1A7F52' : '#C03020', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Beoordelen</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setActiveTab('uren')} style={{ padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: activeTab === 'uren' ? '#0E3A5C' : '#E8F0F6', color: activeTab === 'uren' ? '#fff' : '#0E3A5C' }}>
            ⏱ Uren keuren {uren.length > 0 && <span style={{ background: '#F26B1D', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{uren.length}</span>}
          </button>
          <button onClick={() => setActiveTab('opdrachten')} style={{ padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: activeTab === 'opdrachten' ? '#0E3A5C' : '#E8F0F6', color: activeTab === 'opdrachten' ? '#fff' : '#0E3A5C' }}>
            📁 Opdrachten beoordelen {inleveringen.length > 0 && <span style={{ background: '#F26B1D', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{inleveringen.length}</span>}
          </button>
        </div>

        {/* ===== UREN KEUREN ===== */}
        {activeTab === 'uren' && (
          <div>
            {uren.length === 0 ? (
              <div style={{ background: '#fff', border: '1px dashed #E4DDD4', borderRadius: 12, padding: 48, textAlign: 'center', color: '#5C6B7A' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Alles bijgewerkt</div>
                <div style={{ fontSize: 14 }}>Er zijn geen uren die wachten op goedkeuring.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: '#5C6B7A' }}>{uren.length} urenregel{uren.length > 1 ? 's' : ''} wacht op goedkeuring</div>
                  <button onClick={keurAlleGoed} style={{ padding: '8px 18px', background: '#1A7F52', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ✅ Keur alles goed
                  </button>
                </div>

                {uren.map(u => {
                  const student = getStudent(u.placement_id)
                  const pl = placements.find(p => p.id === u.placement_id)
                  return (
                    <div key={u.id} style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
                              {student?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{student?.name || 'Onbekend'}</span>
                              <span style={{ color: '#5C6B7A', fontSize: 12, marginLeft: 8 }}>{student?.klas} · {pl?.company_name || '—'}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: '#1A2633', marginLeft: 40 }}>{u.description}</div>
                          <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 2, marginLeft: 40 }}>
                            📅 {fmtDatum(u.date)} · <strong>{u.hours} uur</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => keurUrenGoed(u.id)}
                            disabled={urenBezig[u.id]}
                            style={{ padding: '7px 16px', background: '#1A7F52', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: urenBezig[u.id] ? .6 : 1 }}
                          >✅ Goedkeuren</button>
                          <button
                            onClick={() => setShowAfwijs(showAfwijs === u.id ? null : u.id)}
                            style={{ padding: '7px 16px', background: '#FAEAE7', border: 'none', borderRadius: 8, color: '#C03020', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                          >❌ Afwijzen</button>
                        </div>
                      </div>

                      {showAfwijs === u.id && (
                        <div style={{ padding: '0 20px 16px', borderTop: '1px solid #E4DDD4', background: '#FAFAF8' }}>
                          <div style={{ marginTop: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>Reden voor afwijzing (zichtbaar voor leerling)</label>
                            <textarea
                              value={afwijsReden[u.id] || ''}
                              onChange={e => setAfwijsReden(prev => ({ ...prev, [u.id]: e.target.value }))}
                              placeholder="Bijv: Uren komen niet overeen met aanwezigheid..."
                              rows={2}
                              style={{ ...inputStyle, resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button onClick={() => keurUrenAf(u.id)} disabled={urenBezig[u.id]} style={{ padding: '8px 16px', background: '#C03020', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                Afwijzen & terugsturen
                              </button>
                              <button onClick={() => setShowAfwijs(null)} style={{ padding: '8px 14px', background: '#F0EDE8', border: 'none', borderRadius: 8, color: '#5C6B7A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                Annuleren
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ===== OPDRACHTEN BEOORDELEN ===== */}
        {activeTab === 'opdrachten' && (
          <div>
            {inleveringen.length === 0 ? (
              <div style={{ background: '#fff', border: '1px dashed #E4DDD4', borderRadius: 12, padding: 48, textAlign: 'center', color: '#5C6B7A' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Niets te beoordelen</div>
                <div style={{ fontSize: 14 }}>Er zijn geen ingediende opdrachten die wachten op een beoordeling.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, color: '#5C6B7A', marginBottom: 16 }}>
                  {inleveringen.length} opdracht{inleveringen.length > 1 ? 'en' : ''} wacht op beoordeling
                </div>

                {inleveringen.map(inv => {
                  const student = getStudentById(inv.student_id)
                  const opdracht = opdrachten.find(o => o.id === inv.assignment_id)
                  const maxPunten = (opdracht?.questions || []).reduce((t, v) => t + (v.punten || 0), 0) || opdracht?.max_points || 10
                  const isOpen = showBeoordeel === inv.id

                  return (
                    <div key={inv.id} style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                      <div
                        onClick={() => setShowBeoordeel(isOpen ? null : inv.id)}
                        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8F0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0E3A5C', flexShrink: 0 }}>
                              {student?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{student?.name || 'Onbekend'}</span>
                              <span style={{ color: '#5C6B7A', fontSize: 12, marginLeft: 8 }}>{student?.klas}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0E3A5C', marginLeft: 40 }}>{opdracht?.title || 'Opdracht'}</div>
                          <div style={{ fontSize: 12, color: '#5C6B7A', marginLeft: 40, marginTop: 2 }}>
                            Ingediend op {fmtDatum(inv.submitted_at)} · max {maxPunten} punten
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge kleur="oranje">Ter beoordeling</Badge>
                          <span style={{ color: '#5C6B7A', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid #E4DDD4', padding: '16px 20px', background: '#FAFAF8' }}>
                          {/* Antwoord leerling */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Antwoord leerling</div>
                            <div style={{ background: '#fff', border: '1px solid #E4DDD4', borderRadius: 10, padding: 14, fontSize: 14, color: '#1A2633', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                              {inv.answer || '—'}
                            </div>
                          </div>

                          {/* Beoordeling invullen */}
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>
                                Cijfer (1–10)
                              </label>
                              <input
                                type="number" min="1" max="10" step="0.1"
                                value={beoordeelForm.grade}
                                onChange={e => setBeoordeelForm(p => ({ ...p, grade: e.target.value }))}
                                placeholder="7.5"
                                style={{ ...inputStyle, fontSize: 16, fontWeight: 700, textAlign: 'center' }}
                                onClick={e => e.stopPropagation()}
                              />
                              {beoordeelForm.grade && (
                                <div style={{ fontSize: 11, color: parseFloat(beoordeelForm.grade) >= 5.5 ? '#1A7F52' : '#C03020', marginTop: 4, textAlign: 'center', fontWeight: 700 }}>
                                  {parseFloat(beoordeelForm.grade) >= 5.5 ? '✅ Voldoende' : '❌ Onvoldoende'}
                                </div>
                              )}
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C6B7A', marginBottom: 6 }}>
                                Feedback (optioneel)
                              </label>
                              <textarea
                                value={beoordeelForm.feedback}
                                onChange={e => setBeoordeelForm(p => ({ ...p, feedback: e.target.value }))}
                                placeholder="Geef een toelichting op het cijfer..."
                                rows={3}
                                style={{ ...inputStyle, resize: 'none' }}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <button
                            onClick={e => { e.stopPropagation(); beoordeelOpdracht(inv.id) }}
                            disabled={!beoordeelForm.grade || opdrBezig[inv.id]}
                            style={{ padding: '10px 22px', background: beoordeelForm.grade ? '#F26B1D' : '#E4DDD4', border: 'none', borderRadius: 10, color: beoordeelForm.grade ? '#fff' : '#9AA8B2', fontWeight: 700, fontSize: 14, cursor: beoordeelForm.grade ? 'pointer' : 'not-allowed' }}
                          >
                            {opdrBezig[inv.id] ? '⏳ Opslaan...' : '💾 Beoordeling opslaan'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </CoordinatorLayout>
  )
}
