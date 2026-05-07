// 5단계 sticky 진행 표시기 (plan-v3 §Phase 6 #1)
// 페이지 상단에 고정해 사용자가 현재 어디에 있는지 시각화.

'use client'

import { Check } from 'lucide-react'

export interface StepDef {
  id: string
  label: string
  href?: string
}

export const DEFAULT_STEPS: StepDef[] = [
  { id: 'create',   label: '프로젝트 생성' },
  { id: 'master',   label: '마스터 시안' },
  { id: 'edit',     label: '제작물 편집' },
  { id: 'review',   label: '검수·확인' },
  { id: 'export',   label: '발주 출력' },
]

interface Props {
  steps?: StepDef[]
  current: number      // 0-based current step index
  className?: string
}

export function StepIndicator({ steps = DEFAULT_STEPS, current, className = '' }: Props) {
  return (
    <div className={`sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 ${className}`}>
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const done = idx < current
          const active = idx === current
          return (
            <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-2 ${active ? 'text-indigo-300' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </span>
                <span className="text-sm whitespace-nowrap">{step.label}</span>
              </div>
              {idx < steps.length - 1 && <div className={`h-px w-8 ${done ? 'bg-emerald-600/50' : 'bg-slate-800'}`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
