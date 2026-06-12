'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Inloggen...')

  useEffect(() => {
    const supabase = createClient()

    const handleCallback = async () => {
      // Haal params op uit URL
      const code = searchParams.get('code')
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'magiclink'

      console.log('[callback-client] code=', !!code, 'token_hash=', !!token_hash)

      try {
        let error = null

        if (token_hash) {
          const result = await supabase.auth.verifyOtp({ token_hash, type })
          error = result.error
          console.log('[callback-client] verifyOtp error=', error?.message)
        } else if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code)
          error = result.error
          console.log('[callback-client] exchangeCode error=', error?.message)
        } else {
          // Geen params — check of sessie al bestaat via URL hash (#access_token)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('[callback-client] sessie via hash gevonden')
          }
        }

        if (error) {
          setStatus('Fout: ' + error.message)
          setTimeout(() => router.replace('/login?error=auth'), 2000)
          return
        }

        setStatus('Gelukt! Doorsturen...')

        // Haal rol op en stuur door
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        console.log('[callback-client] role=', profile?.role)

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        router.replace(roleRoutes[profile?.role] ?? '/dashboard/coordinator')

      } catch (err) {
        console.error('[callback-client] onverwachte fout:', err)
        setStatus('Er ging iets mis...')
        setTimeout(() => router.replace('/login'), 2000)
      }
    }

    // Wacht even zodat Supabase de URL hash kan verwerken
    const timer = setTimeout(handleCallback, 100)
    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7F3EE',
      fontFamily: 'Inter, sans-serif',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #E4DDD4',
        borderTop: '3px solid #F26B1D',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#5C6B7A', fontSize: 14 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
        <p style={{ color: '#5C6B7A', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Laden...</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
