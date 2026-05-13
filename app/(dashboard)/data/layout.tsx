import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminSidebar } from '../admin/components/AdminSidebar'

// v9.33: /data 페이지도 관리자 사이드바 공통 적용 (5 메뉴 중 5번째)

export default async function DataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
