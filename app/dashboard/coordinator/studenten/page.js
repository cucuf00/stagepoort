import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentenClient from './StudentenClient'

export default async function StudentenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, role')
    .eq('email', user.email)
    .single()

  if (userData?.role !== 'coordinator') redirect('/login')

  // Haal studenten op
  const { data: studenten } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('name')

  return <StudentenClient studenten={studenten || []} coordinator={userData} />
}
