'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StudentenClient from './StudentenClient'

export default function StudentenPage() {
  const router = useRouter()
  const [data, setData] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('name, role, school_id')
        .eq('user_id', session.user.id).limit(1).maybeSingle()

      if (!prof || prof.role !== 'coordinator') { router.replace('/login'); return }

      const { data: studenten } = await supabase
        .from('profiles').select('*')
        .eq('school_id', prof.school_id)
        .eq('role', 'student')
        .order('name')

      setData({ studenten: studenten ?? [], coordinator: prof })
    }
    load()
  }, [router])

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EE' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E4DDD4', borderTop: '3px solid #F26B1D', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return <StudentenClient studenten={data.studenten} coordinator={data.coordinator} />
}
