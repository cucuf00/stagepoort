'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Stap 1: params lezen...')

  useEffect(() => {
    const supabase = createClient()

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'magiclink'

      setStatus(`Stap 1: code=${!!code} token=${!!token_hash}`)
      await new Promise(r => setTimeout(r, 800))

      try {
        let exchError = null

        if (token_hash) {
          const result = await supabase.auth.verifyOtp({ token_hash, type })
          exchError = result.error
        } else if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code)
          exchError = result.error
        }

        setStatus(`Stap 2: exchange fout=${exchError?.message ?? 'geen'}`)
        await new Promise(r => setTimeout(r, 800))

        if (exchError) {
          setStatus('Exchange mislukt: ' + exchError.message)
          setTimeout(() => router.replace('/login?error=auth'), 3000)
          return
        }

        const { data: sessionData } = await supabase.auth.getSession()
        setStatus(`Stap 3: sessie=${sessionData?.session ? 'aanwezig' : 'LEEG'}`)
        await new Promise(r => setTimeout(r, 800))

        if (!sessionData?.session) {
          setStatus('Geen sessie na exchange — dit is het probleem')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        const userId = sessionData.session.user.id
        setStatus(`Stap 4: user=${sessionData.session.user.email}`)
        await new Promise(r => setTimeout(r, 800))

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()

        setStatus(`Stap 5: rol=${profile?.role ?? 'geen'} fout=${profileError?.message ?? 'geen'}`)
        await new Promise(r => setTimeout(r, 1500))

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student: '/dashboard/student',
          coach: '/dashboard/coach',
          company: '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        router.replace(roleRoutes[profile?.role] ?? '/dashboard/coordinator')

      } catch (err) {
        setStatus('Crash: ' + err.message)
      }
    }

    setTimeout(handleCallback, 300)
  }, [router, searchParams])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0D0D0F',
      fontFamily: 'monospace', flexDirection: 'column', gap: 12, padding: 20
    }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #333',
        borderTop: '3px solid #F26B1D', borderRadius: '50%',
        animation: 'spin 1s linear infinite', flexShrink: 0
      }} />
      <p style={{ color: '#F26B1D', fontSize: 13, textAlign: 'center', maxWidth: 400 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0D0D0F'}} />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
