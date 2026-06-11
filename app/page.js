import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

  redirect(roleRoutes[userData?.role] || '/dashboard/coordinator')
}
