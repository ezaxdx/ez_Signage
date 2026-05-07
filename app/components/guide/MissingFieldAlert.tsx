// 누락 항목 경고 (plan-v3 §Phase 6 #4)
// inline error + summary banner 두 형태. preflight 결과를 받아 표시.

'use client'

import { AlertCircle, AlertTriangle, X } from 'lucide-react'

export interface MissingItem {
  field: string         // "행사명" / "regulation 규격" 등
  message: string       // 사용자에게 보여줄 한국어 메시지
  level?: 'error' | 'warn'
}

interface InlineProps { message: string }
export function MissingFieldInline({ message }: InlineProps) {
  return (
    <div className="text-sm text-rose-400 flex items-center gap-1.5 mt-1">
      <AlertCircle className="w-3.5 h-3.5" />
      {message}
    </div>
  )
}

interface SummaryProps {
  items: MissingItem[]
  onClose?: () => void
  onJumpToField?: (field: string) => void
}
export function MissingFieldsSummary({ items, onClose, onJumpToField }: SummaryProps) {
  if (items.length === 0) return null
  const errors = items.filter(i => i.level !== 'warn')
  const warns = items.filter(i => i.level === 'warn')

  return (
    <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-rose-200">발주 전 점검 결과 — {items.length}건 확인 필요</div>
          <div className="text-xs text-rose-300/70 mt-0.5">{errors.length}건 필수 누락 · {warns.length}건 주의 권고</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-rose-300/60 hover:text-rose-200" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-rose-100/90 flex items-start gap-2">
            <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${it.level === 'warn' ? 'bg-amber-400' : 'bg-rose-400'}`} />
            <button
              onClick={() => onJumpToField?.(it.field)}
              className="text-left hover:text-white transition"
              disabled={!onJumpToField}
            >
              <span className="font-medium mr-2">{it.field}</span>
              <span className="text-rose-200/80">{it.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
