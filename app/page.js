import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
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

  redirect(roleRoutes[profile?.role] || '/login')
}
