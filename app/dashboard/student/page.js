import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentClient from './StudentClient'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, role')
    .eq('email', user.email)
    .single()

  if (userData?.role !== 'student') redirect('/login')

  return <StudentClient user={userData} email={user.email} />
}
