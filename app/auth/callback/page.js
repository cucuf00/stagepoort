'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = { bg: '#F7F3EE', orange: '#F26B1D', blue: '#1A3C5E', sub: '#5C6B7A', border: '#E4DDD4', white: '#FFFFFF' }

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('wachten') // wachten | bezig | fout
  const [fout, setFout] = useState('')

  const handleLogin = async () => {
    setStatus('bezig')
    const supabase = createClient()
    const code       = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type       = searchParams.get('type') || 'magiclink'

    try {
      if (token_hash) {
        await supabase.auth.verifyOtp({ token_hash, type })
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, klas')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle()

      if (profile?.role === 'student' && !profile.klas) {
        router.replace('/onboarding')
        return
      }

      const roleRoutes = {
        coordinator: '/dashboard/coordinator',
        student:     '/dashboard/student',
        coach:       '/dashboard/coach',
        company:     '/dashboard/company',
        super_admin: '/dashboard/admin',
      }

      router.replace(roleRoutes[profile?.role] ?? '/dashboard/coordinator')
    } catch {
      setStatus('fout')
      setFout('De link is verlopen of al gebruikt. Vraag een nieuwe link aan.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg, padding: 24,
    }}>
      <div style={{
        background: C.white, borderRadius: 16, padding: 40,
        maxWidth: 360, width: '100%', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${C.border}`,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: 'Sora, sans-serif', fontWeight: 800,
          fontSize: 22, color: C.orange, marginBottom: 24,
        }}>
          Stagepoort
        </div>

        {status === 'wachten' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
            <h2 style={{
              fontFamily: 'Sora, sans-serif', fontWeight: 700,
              fontSize: 18, color: C.blue, marginBottom: 8,
            }}>
              Klik om in te loggen
            </h2>
            <p style={{
              color: C.sub, fontSize: 14, marginBottom: 28, lineHeight: 1.5,
            }}>
              Klik op de knop hieronder om je inloglink te bevestigen.
            </p>
            <button
              onClick={handleLogin}
              style={{
                width: '100%', padding: '14px 0',
                background: C.orange, color: C.white,
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 16,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Inloggen bevestigen →
            </button>
          </>
        )}

        {status === 'bezig' && (
          <>
            <div style={{
              width: 40, height: 40, border: `3px solid ${C.border}`,
              borderTop: `3px solid ${C.orange}`, borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: C.sub, fontSize: 14 }}>Inloggen...</p>
          </>
        )}

        {status === 'fout' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <p style={{ color: '#E53E3E', fontSize: 14, marginBottom: 20 }}>{fout}</p>
            <button
              onClick={() => router.replace('/login')}
              style={{
                width: '100%', padding: '12px 0',
                background: C.orange, color: C.white,
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}
            >
              Nieuwe link aanvragen
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F3EE' }} />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
