'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoordinatorLayout from '@/app/components/CoordinatorLayout'
import Link from 'next/link'

export default function CoordinatorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ studenten: 0, actief: 0, uren: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('name,role,school_id').eq('user_id', session.user.id).limit(1).maybeSingle()
      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }
      setProfile(prof)
      const [{ count: s }, { count: a }, { count: u }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', prof.school_id).eq('role', 'student'),
        supabase.from('placements').select('*', { count: 'exact', head: true }).eq('school_id', prof.school_id).eq('status', 'active'),
        supabase.from('hours').select('*', { count: 'exact', head: true }).eq('school_id', prof.school_id).eq('status', 'pending'),
      ])
      setStats({ studenten: s ?? 0, actief: a ?? 0, uren: u ?? 0 })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const KPI = ({ label, value, sub, kleur }) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, borderTop: `3px solid ${kleur}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#5C6B7A', marginTop: 4 }}>{sub}</div>
    </div>
  )

  return (
    <CoordinatorLayout profile={profile}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4DDD4', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>Dashboard</h1>
        <div style={{ background: '#E8F0F6', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0E3A5C' }}>👤 {profile?.name}</div>
      </div>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Goedemiddag, {profile?.name?.split(' ')[0]} 👋</h2>
          <p style={{ color: '#5C6B7A', fontSize: 14 }}>Hier is een overzicht van het stageproces vandaag.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <KPI label="Studenten" value={stats.studenten} sub="Ingeschreven dit jaar" kleur="#0E3A5C" />
          <KPI label="Actieve stages" value={stats.actief} sub="Momenteel bezig" kleur="#1A7F52" />
          <KPI label="Uren te keuren" value={stats.uren} sub="Wacht op goedkeuring" kleur="#F26B1D" />
          <KPI label="Aandacht nodig" value={0} sub="Achterstand of probleem" kleur="#C03020" />
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚡ Snel navigeren</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { href: '/dashboard/coordinator/studenten', icon: '👥', label: 'Studenten' },
              { href: '/dashboard/coordinator/koppelingen', icon: '🔗', label: 'Koppelingen' },
              { href: '#', icon: '📋', label: 'Opdrachten' },
            ].map(item => (
              <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, background: '#F7F3EE', borderRadius: 12, textDecoration: 'none', color: '#1A2633', border: '1.5px solid #E4DDD4' }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </CoordinatorLayout>
  )
}
