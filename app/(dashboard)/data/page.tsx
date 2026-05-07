import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DataDashboard } from './DataDashboard'

export const metadata = { title: '데이터 관리 | MICE 디자인 가이드' }

export default async function DataPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
