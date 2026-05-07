import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DataDashboard } from './DataDashboard'
import { isAdmin } from '@/lib/auth/role'

export const metadata = { title: '관리자 페이지 | 제작물 리스트 가이드' }

export default async function DataPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 관리자 페이지 정책 (사용자 결정 2026-05-07)
  // /archive + /data는 admin만 접근. 일반 사용자는 대시보드로 리다이렉트.
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  const [
    { data: signageTypes },
    { data: synonyms },
    { data: designers },
    { data: eventHistory },
    { data: venues },
  ] = await Promise.all([
    supabase.from('signage_types').select('*').order('sort_order'),
    supabase.from('signage_synonyms').select('*').order('canonical_name'),
    supabase.from('designers').select('*').order('name'),
    supabase.from('event_history').select('*').order('year', { ascending: false }),
    supabase.from('venue_info').select('*').order('name'),
  ])

  return (
    <DataDashboard
      signageTypes={signageTypes ?? []}
      synonyms={synonyms ?? []}
      designers={designers ?? []}
      eventHistory={eventHistory ?? []}
      venues={venues ?? []}
    />
  )
}
