'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
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
    }

    // Luister ook naar auth state changes (na magic link redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkSession()
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    checkSession()

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7F3EE',
      fontFamily: 'Inter, sans-serif',
      color: '#5C6B7A',
      fontSize: 14
    }}>
      Laden...
    </div>
  )
}
