'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'magiclink'

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
          .select('role')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle()

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        router.replace(roleRoutes[profile?.role] ?? '/dashboard/coordinator')
      } catch {
        router.replace('/login')
      }
    }

    setTimeout(handleCallback, 100)
  }, [router, searchParams])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F7F3EE',
      flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #E4DDD4',
        borderTop: '3px solid #F26B1D', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#5C6B7A', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
        Inloggen...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F7F3EE' }} />
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
