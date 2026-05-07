import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutGrid, Archive, MapPin, Database } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NewProjectButton } from './components/NewProjectButton'
import { LogoutButton } from './components/LogoutButton'
import { DashboardContent } from './components/DashboardContent'
import { groupVenuesByRegion } from '@/lib/venueIntel'
import type { ProjectWithCount } from '@/lib/types'

function calcDdayDiff(eventDate: string | null): number {
  if (!eventDate) return Infinity
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate); event.setHours(0, 0, 0, 0)
  return Math.round((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, design_items(count)')
    .order('created_at', { ascending: false })

  const typedProjects = (projects ?? []) as ProjectWithCount[]

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const stats = {
    total: typedProjects.length,
    urgent: typedProjects.filter(p => {
      const d = calcDdayDiff(p.event_date)
      return d >= 0 && d <= 7
    }).length,
    thisMonth: typedProjects.filter(p => {
      if (!p.event_date) return false
      const ev = new Date(p.event_date)
      return ev >= monthStart && ev <= monthEnd
    }).length,
    inProgress: typedProjects.filter(p =>
      p.stage && ['발주완료', '시안검수', '수정중', '확정'].includes(p.stage)
    ).length,
  }

  const venueGroups = groupVenuesByRegion()

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
            <Link
              href="/data"
              className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 text-xs transition"
            >
              <Database className="w-3.5 h-3.5" />
              데이터 관리
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* 페이지 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-slate-100 text-xl font-bold">내 프로젝트</h1>
            <p className="text-slate-500 text-sm mt-0.5">MICE 행사 제작물을 관리하세요</p>
          </div>
          <NewProjectButton userId={user.id} userEmail={user.email ?? ''} />
        </div>

        {/* 통계 카드 */}
        {typedProjects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '전체 프로젝트', value: stats.total, color: 'text-slate-100', sub: null },
              { label: 'D-7 이내', value: stats.urgent, color: stats.urgent > 0 ? 'text-red-400' : 'text-slate-100', sub: '긴급 마감' },
              { label: '이번달 행사', value: stats.thisMonth, color: 'text-amber-400', sub: null },
              { label: '작업 진행중', value: stats.inProgress, color: 'text-emerald-400', sub: '발주~확정' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-slate-500 text-xs mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                {stat.sub && <p className="text-slate-600 text-[10px] mt-0.5">{stat.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* 프로젝트 목록 (단계 필터 + 정렬 포함) */}
        {typedProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <DashboardContent projects={typedProjects} userId={user.id} />
        )}

        {/* 참고 행사장 — 향후 샘플 데이터 기반 추천 예정 */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
            <div className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>참고 행사장 — 샘플 데이터 보유 ({Object.values(venueGroups).flat().length}개소)</span>
              <span className="text-slate-700 text-[10px]">▼ 클릭해서 보기</span>
            </div>
            <span className="ml-auto text-[9px] text-indigo-500/60 hidden sm:block">향후: 행사장별 표준 품목 추천 예정</span>
          </summary>

          <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] text-slate-600 mb-4">
              아래 행사장은 과거 제작물 샘플 폴더에 데이터가 있는 장소입니다.
              향후 분석 완료 시 프로젝트 생성 시 자동으로 권장 품목과 수량을 제안할 예정입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(venueGroups).map(([region, venues]) => (
                <div key={region}>
                  <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">{region}</p>
                  <div className="space-y-1">
                    {venues.map(v => (
                      <div key={v.displayName} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          v.type === '컨벤션' ? 'bg-indigo-500' :
                          v.type === '전시장' ? 'bg-violet-500' :
                          v.type === '호텔'   ? 'bg-amber-500' :
                          v.type === '야외'   ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                        <span className="truncate">{v.displayName}</span>
                        <span className="ml-auto text-slate-700 text-[9px] flex-shrink-0">{v.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800 text-[9px] text-slate-700 flex-wrap gap-y-1">
              {[
                { color: 'bg-indigo-500', label: '컨벤션' },
                { color: 'bg-violet-500', label: '전시장' },
                { color: 'bg-amber-500',  label: '호텔' },
                { color: 'bg-emerald-500',label: '야외' },
                { color: 'bg-slate-600',  label: '기타' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </details>

      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
        <LayoutGrid className="w-7 h-7 text-slate-600" />
      </div>
      <h3 className="text-slate-300 font-semibold mb-1.5">첫 프로젝트를 만들어보세요</h3>
      <p className="text-slate-500 text-sm max-w-xs">
        새 프로젝트 버튼으로 시작하세요
      </p>
    </div>
  )
}
