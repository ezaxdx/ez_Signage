'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, Brain, Users, GraduationCap, Database,
  LayoutGrid, ArrowLeft,
} from 'lucide-react'

// v9.33: 관리자 글로벌 좌측 사이드바 (5 메뉴)
// /admin · /admin/ai · /admin/users · /admin/learning · /data 5개 라우트 공통 적용.
// 기존 헤더 인라인 nav (각 페이지마다 중복) → 좌측 사이드바로 일원화.

interface MenuItem {
  href: string
  label: string
  icon: typeof Activity
  desc: string
  disabled?: boolean
  match: (path: string) => boolean
}

const MENU: MenuItem[] = [
  {
    href: '/admin',
    label: '운영 대시보드',
    icon: Activity,
    desc: 'KPI · 프로젝트 현황 · 일정',
    match: p => p === '/admin',
  },
  {
    href: '/admin/ai',
    label: 'AI 관리',
    icon: Brain,
    desc: '모델 · 사용량 · 환경 설정',
    match: p => p.startsWith('/admin/ai'),
  },
  {
    href: '/admin/users',
    label: '유저 관리',
    icon: Users,
    desc: '데이터허브 연동 대기',
    disabled: true,
    match: p => p.startsWith('/admin/users'),
  },
  {
    href: '/admin/learning',
    label: '데이터 학습',
    icon: GraduationCap,
    desc: '행사장 · 환경장식물 · 동의어',
    match: p => p.startsWith('/admin/learning'),
  },
  {
    href: '/data',
    label: '분석',
    icon: Database,
    desc: '과거 분석 자료 13탭',
    match: p => p.startsWith('/data'),
  },
]

export function AdminSidebar() {
  const pathname = usePathname() || ''

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white min-h-screen sticky top-0 h-screen overflow-y-auto">
      <div className="p-4 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 font-semibold text-sm tracking-tight">
            제작물 리스트 가이드
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 text-[11px] transition"
        >
          <ArrowLeft className="w-3 h-3" />
          내 프로젝트로
        </Link>
      </div>

      <nav className="p-2 space-y-0.5">
        <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          관리자
        </p>
        {MENU.map(m => {
          const Icon = m.icon
          const active = m.match(pathname)
          if (m.disabled) {
            return (
              <div
                key={m.href}
                className="flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg text-slate-300 cursor-not-allowed select-none"
                title="데이터허브 연동 결정 전 — 접근 차단"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {m.label}
                </span>
                <span className="text-[10px] text-slate-300 pl-5.5 truncate">{m.desc}</span>
              </div>
            )
          }
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg transition ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {m.label}
              </span>
              <span className={`text-[10px] pl-5.5 truncate ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                {m.desc}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
