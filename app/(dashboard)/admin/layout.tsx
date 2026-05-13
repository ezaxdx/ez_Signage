import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminSidebar } from './components/AdminSidebar'

// v9.33: 관리자 글로벌 좌측 사이드바 공통 layout.
// /admin · /admin/ai · /admin/users · /admin/learning 4개 라우트 공통 적용.
// /data 페이지는 /data/layout.tsx에서 같은 컴포넌트를 사용한다.

export default async function AdminLayout({
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
