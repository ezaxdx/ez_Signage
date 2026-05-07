// /projects/new — 4가지 시작 케이스 선택 (plan-v3 #3)
// A 빈 상태 / B 엑셀 보유 / C 샘플 디자인 / D 텍스트만

'use client'

import Link from 'next/link'
import { Sparkles, FileSpreadsheet, Image as ImageIcon, FileText } from 'lucide-react'
import { StepIndicator } from '@/app/components/guide'

const CASES = [
  {
    id: 'a',
    title: 'A · 빈 상태에서 시작',
    sub: 'AI 추천으로 환경장식물 리스트 자동 생성',
    desc: '행사 정보를 입력하면 Claude가 표준 12종 중 적절한 항목을 추천합니다.',
    icon: Sparkles,
    href: '/projects/new/case-a',
    accent: 'from-indigo-500 to-violet-500',
    badge: '추천',
  },
  {
    id: 'b',
    title: 'B · 엑셀 보유',
    sub: '기존 발주서(.xlsx) 업로드해 17컬럼 매칭',
    desc: '담당자가 이미 작성한 엑셀을 올리면 표준 양식으로 변환합니다.',
    icon: FileSpreadsheet,
    href: '/projects/new/case-b',
    accent: 'from-emerald-500 to-teal-500',
    badge: '빠름',
  },
  {
    id: 'c',
    title: 'C · 샘플 디자인 보유',
    sub: '시안 이미지 → AI 슬롯 인식',
    desc: '완성된 디자인 이미지를 올리면 슬롯 위치를 자동 추출합니다.',
    icon: ImageIcon,
    href: '/projects/new/case-c',
    accent: 'from-amber-500 to-orange-500',
    badge: 'Vision',
  },
  {
    id: 'd',
    title: 'D · 텍스트만 있는 상태',
    sub: '행사명·로고만으로 빈 슬라이드 생성',
    desc: '나중에 디자이너가 채울 수 있는 표준 슬라이드만 만듭니다.',
    icon: FileText,
    href: '/projects/new/case-d',
    accent: 'from-slate-500 to-slate-600',
    badge: '단순',
  },
] as const

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StepIndicator current={0} />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">← 대시보드</Link>
          <h1 className="mt-4 text-3xl font-bold">새 프로젝트 시작하기</h1>
          <p className="mt-2 text-slate-400">시작 상태에 맞는 케이스를 선택하세요. 각 케이스는 다른 흐름으로 안내합니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CASES.map(c => {
            const Icon = c.icon
            return (
              <Link
                key={c.id}
                href={c.href}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 hover:bg-slate-900 transition"
              >
                <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${c.accent} opacity-20 blur-2xl group-hover:opacity-40 transition`} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${c.accent}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">{c.badge}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-50">{c.title}</h3>
                <p className="mt-1 text-sm text-indigo-300">{c.sub}</p>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{c.desc}</p>
                <div className="mt-5 text-sm text-slate-300 group-hover:text-indigo-300 transition">시작하기 →</div>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 rounded-lg border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200/90">
          <strong className="font-semibold">📌 참고:</strong> 1차안에서는 <span className="font-semibold">A 케이스가 권장</span>됩니다.
          B/C/D는 기본 폼만 제공되며 추후 단계에서 정교화될 예정입니다.
        </div>
      </div>
    </div>
  )
}
