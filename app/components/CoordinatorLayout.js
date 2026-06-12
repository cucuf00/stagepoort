'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CoordinatorLayout({ children, profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function navigate(href) {
    if (href === '#') return
    window.location.href = href
  }

  const navItems = [
    { href: '/dashboard/coordinator', label: '📊 Dashboard', sectie: 'main' },
    { href: '/dashboard/coordinator/studenten', label: '👥 Studenten', sectie: 'main' },
    { href: '/dashboard/coordinator/koppelingen', label: '🔗 Koppelingen', sectie: 'main' },
    { href: '/dashboard/coordinator/opdrachten', label: '📋 Opdrachten', sectie: 'main' },
    { href: '/dashboard/coordinator/beheer', label: '⚙️ Beheer', sectie: 'beheer' },
    { href: '#', label: '📅 Schooljaren', sectie: 'beheer' },
  ]

  const NavLink = ({ item }) => {
    const active = pathname === item.href && item.href !== '#'
    return (
      <button
        onClick={() => navigate(item.href)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
          color: active ? '#fff' : 'rgba(255,255,255,.6)',
          fontSize: 14, fontWeight: 500, textDecoration: 'none',
          borderLeft: active ? '3px solid #F26B1D' : '3px solid transparent',
          background: active ? 'rgba(242,107,29,.18)' : 'transparent',
          border: 'none', cursor: item.href === '#' ? 'default' : 'pointer',
          width: '100%', textAlign: 'left',
          opacity: item.href === '#' ? 0.4 : 1,
        }}>{item.label}</button>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#F7F3EE;font-family:'Inter',sans-serif;color:#1A2633}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div style={{ width: 240, background: '#0E3A5C', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M11 14 L13 17 L15 14" stroke="#F26B1D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="13" cy="10" r="2" fill="#F26B1D"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 17, color: '#fff' }}>Stagepoort</span>
          </div>

          <nav style={{ padding: '16px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 20px 6px' }}>Hoofdmenu</div>
            {navItems.filter(i => i.sectie === 'main').map(item => <NavLink key={item.label} item={item} />)}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 1, padding: '16px 20px 6px' }}>Beheer</div>
            {navItems.filter(i => i.sectie === 'beheer').map(item => <NavLink key={item.label} item={item} />)}
            <div style={{ flex: 1 }} />
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 10 }}>
                Ingelogd als<br/>
                <strong style={{ color: 'rgba(255,255,255,.7)' }}>{profile?.name}</strong>
              </div>
              <button onClick={handleLogout} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                color: '#ff9999', fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(255,100,100,.25)', background: 'rgba(255,100,100,.1)',
                borderRadius: 8, cursor: 'pointer', width: '100%',
              }}>🚪 Uitloggen</button>
            </div>
          </nav>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {children}
        </div>
      </div>
    </>
  )
}
