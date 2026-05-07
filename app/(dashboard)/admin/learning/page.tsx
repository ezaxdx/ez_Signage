import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { LearningManagerClient } from './LearningManagerClient'

export const metadata = { title: '데이터 학습 관리자 | 제작물 리스트 가이드' }

export default async function LearningManagerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  // 초기 데이터 (병렬). v6 마이그레이션 미적용이면 빈 배열로 폴백.
  const [venuesRes, requestsRes, jobsRes] = await Promise.all([
    supabase.from('venues').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('venue_requests').select('*').order('requested_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('learning_jobs').select('*').order('triggered_at', { ascending: false }).limit(50).then(r => r, () => ({ data: [], error: null })),
  ])

  return (
    <LearningManagerClient
      userId={user.id}
      initialVenues={(venuesRes.data ?? []) as never[]}
      initialRequests={(requestsRes.data ?? []) as never[]}
      initialJobs={(jobsRes.data ?? []) as never[]}
    />
  )
}
