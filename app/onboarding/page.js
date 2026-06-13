'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DARK = {
  bg: '#0B0F14',
  card: '#141922',
  border: 'rgba(255,255,255,.07)',
  text: '#F0F4F8',
  sub: '#7A8A9A',
  orange: '#F26B1D',
  green: '#4ADE80',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [klassen, setKlassen] = useState([])
  const [periodes, setPeriodes] = useState([])
  const [periodClasses, setPeriodClasses] = useState([])
  const [gekozenKlas, setGekozenKlas] = useState('')
  const [loading, setLoading] = useState(true)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      // Profiel ophalen
      const { data: prof } = await supabase
        .from('profiles').select('*')
        .eq('user_id', session.user.id).limit(1).maybeSingle()

      if (!prof) { router.replace('/login'); return }

      // Coordinatoren horen niet hier — stuur door
      if (prof.role === 'coordinator') { router.replace('/dashboard/coordinator'); return }

      // Heeft al een klas? Stuur door naar dashboard
      if (prof.klas) {
        router.replace('/dashboard/student')
        return
      }

      setProfile(prof)

      // Beschikbare klassen ophalen
      const { data: pc } = await supabase
        .from('period_classes').select('*')
        .eq('school_id', prof.school_id)

      const { data: pers } = await supabase
        .from('stage_periods').select('*')
        .eq('school_id', prof.school_id)
        .order('start_date')

      setPeriodClasses(pc ?? [])
      setPeriodes(pers ?? [])
      setKlassen([...new Set((pc ?? []).map(p => p.klas))].sort())
      setLoading(false)
    }
    load()
  }, [router])

  // Bepaal welke periode bij de klas hoort
  function bepaalPeriode(klas) {
    const vandaag = new Date()
    const kandidaten = periodClasses
      .filter(pc => pc.klas === klas)
      .map(pc => periodes.find(p => p.id === pc.period_id))
      .filter(Boolean)

    if (kandidaten.length === 0) return null
    if (kandidaten.length === 1) return kandidaten[0]

    // Periodes die nog moeten beginnen → pak die met dichtste startdatum
    const toekomstig = kandidaten
      .filter(p => new Date(p.start_date) > vandaag)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    if (toekomstig.length > 0) return toekomstig[0]

    // Anders periodes die nu actief zijn
    const actief = kandidaten
      .filter(p => new Date(p.start_date) <= vandaag && new Date(p.end_date) >= vandaag)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    if (actief.length > 0) return actief[0]

    // Anders meest recent verlopen
    return kandidaten.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]
  }

  async function bevestig() {
    if (!gekozenKlas) return
    setBezig(true)
    setFout('')
    const supabase = createClient()

    const periode = bepaalPeriode(gekozenKlas)

    // 1. Klas op profiel zetten
    const { error: profErr } = await supabase
      .from('profiles').update({ klas: gekozenKlas })
      .eq('id', profile.id)

    if (profErr) { setFout(profErr.message); setBezig(false); return }

    // 2. Actieve of pending placement zoeken
    const { data: bestaande } = await supabase
      .from('placements').select('*')
      .eq('student_id', profile.id)
      .not('status', 'in', '("cancelled","completed")')
      .limit(1).maybeSingle()

    if (bestaande) {
      // Update bestaande met period_id
      if (periode) {
        await supabase.from('placements').update({ period_id: periode.id }).eq('id', bestaande.id)
      }
    } else {
      // Maak nieuwe pending placement
      await supabase.from('placements').insert({
        school_id: profile.school_id,
        student_id: profile.id,
        period_id: periode?.id || null,
        status: 'pending',
      })
    }

    setBezig(false)
    router.replace('/dashboard/student')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DARK.bg }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTop: `3px solid ${DARK.orange}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const periodeMatch = gekozenKlas ? bepaalPeriode(gekozenKlas) : null

  return (
    <div style={{ minHeight: '100vh', background: DARK.bg, color: DARK.text, fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        select{color-scheme:dark}
      `}</style>

      <div style={{ background: DARK.card, borderRadius: 20, padding: 36, maxWidth: 460, width: '100%', border: `1px solid ${DARK.border}` }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 26, fontWeight: 800, color: DARK.orange, marginBottom: 6 }}>Welkom! 👋</div>
        <div style={{ fontSize: 15, color: DARK.text, marginBottom: 4, fontWeight: 600 }}>{profile?.name}</div>
        <p style={{ color: DARK.sub, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Voordat we beginnen — in welke klas zit je? Zo koppelen we je aan de juiste stageperiode.
        </p>

        {klassen.length === 0 ? (
          <div style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#FBBF24', fontWeight: 700, marginBottom: 4 }}>⚠️ Geen klassen beschikbaar</div>
            <div style={{ fontSize: 12, color: DARK.sub, lineHeight: 1.5 }}>
              Je coördinator heeft nog geen klassen aangemaakt bij de stageperiodes. Neem contact op met je stagecoördinator.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: DARK.sub, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Jouw klas</label>
              <select
                value={gekozenKlas}
                onChange={e => setGekozenKlas(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,.05)', border: `1.5px solid ${DARK.border}`, borderRadius: 12, color: DARK.text, fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
              >
                <option value="">— Kies je klas —</option>
                {klassen.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {periodeMatch && (
              <div style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: DARK.green, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>📅 Stageperiode</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: DARK.text, marginBottom: 2 }}>{periodeMatch.name}</div>
                <div style={{ fontSize: 12, color: DARK.sub }}>
                  {new Date(periodeMatch.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – {new Date(periodeMatch.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} · {periodeMatch.hours_goal} uur
                </div>
              </div>
            )}

            {fout && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
                ❌ {fout}
              </div>
            )}

            <button
              onClick={bevestig}
              disabled={!gekozenKlas || bezig}
              style={{ width: '100%', padding: '14px', background: gekozenKlas && !bezig ? DARK.orange : 'rgba(255,255,255,.08)', border: 'none', borderRadius: 12, color: gekozenKlas ? '#fff' : DARK.sub, fontWeight: 700, fontSize: 15, cursor: gekozenKlas && !bezig ? 'pointer' : 'not-allowed' }}
            >
              {bezig ? '⏳ Bezig...' : 'Doorgaan naar mijn dashboard →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
