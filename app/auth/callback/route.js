import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, school_id')
          .eq('user_id', user.id)
          .not('school_id', 'is', null)
          .single()

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        const route = roleRoutes[profile?.role] || '/dashboard/coordinator'
        return NextResponse.redirect(new URL(route, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
