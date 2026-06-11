import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Haal rol op en stuur door naar juiste dashboard
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single()

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student: '/dashboard/student',
          coach: '/dashboard/coach',
          company: '/dashboard/company',
        }

        const route = roleRoutes[userData?.role] || '/dashboard/coordinator'
        return NextResponse.redirect(new URL(route, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
