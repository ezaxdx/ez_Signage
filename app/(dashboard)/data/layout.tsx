import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

// v9.36: 시안 IA에서 /data는 관리자 사이드바 메뉴에 없음 (라우트만 보존).
// 사이드바 없이 단독 페이지로 표시. 헤더·다른 진입 경로에서만 접근 가능.

export default async function DataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  return <div className="bg-slate-50 min-h-screen">{children}</div>
}
