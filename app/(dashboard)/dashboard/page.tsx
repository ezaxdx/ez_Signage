import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutGrid, FolderOpen, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from './components/ProjectCard'
import { NewProjectButton } from './components/NewProjectButton'
import { LogoutButton } from './components/LogoutButton'
import { RecommenderWidget } from './components/RecommenderWidget'
import type { ProjectWithCount } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 소유 + 초대된 프로젝트 모두 가져오기 (RLS가 멤버 접근 허용)
  const { data: projects } = await supabase
    .from('projects')
    .select('*, design_items(count)')
    .order('created_at', { ascending: false })

  const typedProjects = (projects ?? []) as ProjectWithCount[]

  const stats = {
    total: typedProjects.length,
    active: typedProjects.filter((p) => p.status === '진행중').length,
    ready: typedProjects.filter((p) => p.status === '준비중').length,
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 네비게이션 */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-100 font-semibold text-sm tracking-tight">
              MICE 디자인 가이드
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/archive"
              className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 text-xs transition"
            >
              <Archive className="w-3.5 h-3.5" />
              저장된 제작물
            </Link>
            <div className="w-px h-4 bg-slate-800 hidden sm:block" />
            <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[200px]">
              {user.email}
            </span>
            <div className="w-px h-4 bg-slate-800 hidden sm:block" />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 페이지 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-slate-100 text-xl font-bold">내 프로젝트</h1>
            <p className="text-slate-500 text-sm mt-0.5">MICE 행사 제작물을 관리하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <NewProjectButton userId={user.id} userEmail={user.email ?? ''} />
          </div>
        </div>

        {/* 상황 기반 추천 위젯 */}
        <RecommenderWidget />

        {/* 통계 카드 */}
        {typedProjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: '전체 프로젝트', value: stats.total, color: 'text-slate-100' },
              { label: '진행중', value: stats.active, color: 'text-emerald-400' },
              { label: '준비중', value: stats.ready, color: 'text-amber-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
              >
                <p className="text-slate-500 text-xs mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 프로젝트 그리드 */}
        {typedProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {typedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} isOwner={project.owner_id === user.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
        <FolderOpen className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-slate-300 font-semibold mb-1.5">프로젝트가 없습니다</h3>
      <p className="text-slate-500 text-sm">
        첫 번째 MICE 행사 프로젝트를 만들어보세요.
      </p>
    </div>
  )
}
