// 인라인 가이드 박스 — WHY / HOW / TIP 3층 (plan-v3 §Phase 6 #2)
// 폼 필드 옆이나 위에 둬서 "왜 이 항목이 중요한가" + "어떻게 작성하나" + "현장 팁"을 보여줌.

'use client'

import { Lightbulb, HelpCircle, Sparkles } from 'lucide-react'

export interface GuideBoxProps {
  why?: string        // 왜 (목적·이유)
  how?: string        // 어떻게 (작성 방법)
  tip?: string        // 팁 (현장 노하우)
  variant?: 'inline' | 'card'
}

export function GuideBox({ why, how, tip, variant = 'inline' }: GuideBoxProps) {
  if (!why && !how && !tip) return null
  const wrapperCls = variant === 'card'
    ? 'rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3'
    : 'space-y-2 text-sm'

  return (
    <div className={wrapperCls}>
      {why && (
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-400" />
          <div className="text-slate-700"><span className="font-medium text-indigo-300 mr-1">WHY</span>{why}</div>
        </div>
      )}
      {how && (
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <div className="text-slate-700"><span className="font-medium text-emerald-300 mr-1">HOW</span>{how}</div>
        </div>
      )}
      {tip && (
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="text-slate-700"><span className="font-medium text-amber-300 mr-1">TIP</span>{tip}</div>
        </div>
      )}
    </div>
  )
}
