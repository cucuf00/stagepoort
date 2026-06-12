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
        // Haal het eerste profiel op van deze user
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, school_id, id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        // Schrijf school_id weg in user metadata zodat get_my_school_id() werkt
        if (profile?.school_id) {
          await supabase.auth.updateUser({
            data: { 
              current_school_id: profile.school_id,
              role: profile.role
            }
          })
        }

        const roleRoutes = {
          coordinator: '/dashboard/coordinator',
          student:     '/dashboard/student',
          coach:       '/dashboard/coach',
          company:     '/dashboard/company',
          super_admin: '/dashboard/admin',
        }

        const route = profile?.role 
          ? (roleRoutes[profile.role] ?? '/dashboard/coordinator') 
          : '/dashboard/coordinator'

        const forwardedHost = request.headers.get('x-forwarded-host')
        if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${route}`)
        }
        return NextResponse.redirect(`${origin}${route}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
