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
      const code = searchParams.get('code')
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'magiclink'

      try {
        let error = null

        if (token_hash) {
          const result = await supabase.auth.verifyOtp({ token_hash, type })
          error = result.error
        } else if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code)
          error = result.error
        }

        if (error) {
          setStatus('Fout: ' + error.message)
          setTimeout(() => router.replace('/login?error=auth'), 2000)
          return
        }

        // Wacht even zodat sessie goed is opgeslagen
        await new Promise(r => setTimeout(r, 500))

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        setStatus(`Gebruiker: ${user?.email ?? 'niet gevonden'}`)

        if (!user) {
          setStatus('Geen gebruiker — terug naar login')
          setTimeout(() => router.replace('/login'), 2000)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        setStatus(`Rol: ${profile?.role ?? 'geen'} | Fout: ${profileError?.message ?? 'geen'}`)

        await new Promise(r => setTimeout(r, 1500))

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        if (!profile?.role) {
          // Geen profiel gevonden — stuur toch door naar coordinator als fallback
          router.replace('/dashboard/coordinator')
          return
        }

        router.replace(roleRoutes[profile.role] ?? '/dashboard/coordinator')

      } catch (err) {
        setStatus('Onverwachte fout: ' + err.message)
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    setTimeout(handleCallback, 200)
  }, [router, searchParams])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F7F3EE',
      fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #E4DDD4',
        borderTop: '3px solid #F26B1D', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#5C6B7A', fontSize: 14, maxWidth: 300, textAlign: 'center' }}>{status}</p>
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
