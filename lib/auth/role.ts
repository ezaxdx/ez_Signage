// 역할 분기 헬퍼. Phase 3 (admin/user 2분할).
// 서버·클라이언트 어디서든 createClient()로 받은 supabase 인스턴스를 넘기면 됨.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'

export async function fetchUserRole(supabase: SupabaseClient): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return 'user'
  return (data.role as UserRole) ?? 'user'
}

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const role = await fetchUserRole(supabase)
  return role === 'admin'
}
