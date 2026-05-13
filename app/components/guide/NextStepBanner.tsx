// 다음 단계 CTA Bottom Banner (plan-v3 §Phase 6 #3)
// 사용자가 현재 단계를 끝낼 때마다 화면 하단에 다음 액션을 강조.

'use client'

import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  title: string
  description?: string
  ctaLabel: string
  ctaHref?: string
  onCta?: () => void
  dismissible?: boolean
}

export function NextStepBanner({ title, description, ctaLabel, ctaHref, onCta, dismissible = true }: Props) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null

  const Cta = ctaHref ? (
    <Link href={ctaHref} className="inline-flex items-center gap-1.5 rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-100 transition">
      {ctaLabel} <ArrowRight className="w-4 h-4" />
    </Link>
  ) : (
    <button onClick={onCta} className="inline-flex items-center gap-1.5 rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-100 transition">
      {ctaLabel} <ArrowRight className="w-4 h-4" />
    </button>
  )

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(90vw,640px)]">
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 shadow-2xl flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white">{title}</div>
          {description && <div className="text-sm text-white/85 mt-0.5">{description}</div>}
        </div>
        {Cta}
        {dismissible && (
          <button onClick={() => setHidden(true)} className="text-white/70 hover:text-white" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
