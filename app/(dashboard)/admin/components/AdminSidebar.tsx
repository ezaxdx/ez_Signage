'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Brain, GraduationCap, LayoutGrid, ArrowLeft } from 'lucide-react'

// v9.36: 시안 100% 매칭 IA — 사용자(조기흠 사원, 2026-05-13) 명시
//   관리자 페이지 (그룹, 2 메뉴)
//     ├─ 운영 대시보드 (/admin)
//     └─ AI 관리 (/admin/ai)
//   데이터 학습 관리자 (/admin/learning) — 형제 진입
//
// 유저 관리(/admin/users)·분석(/data)은 사이드바에서 제외 (라우트는 보존)

interface MenuItem {
  href: string
  label: string
  icon: typeof Activity
  match: (path: string) => boolean
}

const ADMIN_MENU: MenuItem[] = [
  { href: '/admin',    label: '운영 대시보드', icon: Activity, match: p => p === '/admin' },
  { href: '/admin/ai', label: 'AI 관리',       icon: Brain,    match: p => p.startsWith('/admin/ai') },
]

const SIBLING_MENU: MenuItem[] = [
  { href: '/admin/learning', label: '데이터 학습 관리자', icon: GraduationCap, match: p => p.startsWith('/admin/learning') },
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
          관리자 페이지
        </p>
        {ADMIN_MENU.map(m => {
          const Icon = m.icon
          const active = m.match(pathname)
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {m.label}
            </Link>
          )
        })}

        <div className="h-3" />

        {SIBLING_MENU.map(m => {
          const Icon = m.icon
          const active = m.match(pathname)
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {m.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
