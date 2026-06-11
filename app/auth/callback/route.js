import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Haal profiel op
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, school_id')
          .eq('user_id', user.id)
          .not('school_id', 'is', null)
          .maybeSingle()

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        const route = profile?.role ? (roleRoutes[profile.role] ?? '/dashboard/coordinator') : '/dashboard/coordinator'
        
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${route}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${route}`)
        } else {
          return NextResponse.redirect(`${origin}${route}`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
