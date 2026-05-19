'use client'

// 시설 가이드 알림 강도 3단 토글 — 5/22 사용자 명시 = 알랏 제거·모드 3종 변경
// verbose: 아이콘 + 위반사항 안내 (기본) / silent_icon: 위반사항 안내만 / off: 모두 끄기
// 어떤 모드든 다운로드 직전 일괄 요약은 안전망으로 유지

import { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, BellOff, ChevronDown, Check } from 'lucide-react'

export type FacilityCheckMode = 'verbose' | 'silent_icon' | 'off'

const MODES: Array<{ id: FacilityCheckMode; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'verbose',     label: '아이콘 + 위반사항 안내', description: '그리드 ⚠️ 아이콘 + 우측 패널 위반사항 안내 (기본)', icon: <BellRing className="w-3.5 h-3.5" /> },
  { id: 'silent_icon', label: '위반사항 안내만',        description: '아이콘 없이 우측 패널 안내만',                       icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'off',         label: '모두 끄기',              description: '아이콘·안내 모두 끄기 (요약만 1회)',                 icon: <BellOff className="w-3.5 h-3.5" /> },
]

interface Props {
  mode: FacilityCheckMode
  onChange: (mode: FacilityCheckMode) => void
}

export function FacilityCheckModeToggle({ mode, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const current = MODES.find(m => m.id === mode) ?? MODES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-2 py-1 transition hover:bg-amber-100"
        title="시설 가이드 알림 강도"
      >
        {current.icon}
        <span className="hidden sm:inline">시설 알림: {current.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border-2 border-amber-200 rounded-lg shadow-2xl z-[300] overflow-hidden">
          <div className="px-3 py-2 border-b border-amber-200 bg-amber-50">
            <p className="text-[11px] font-semibold text-amber-800">시설 가이드 알림 강도</p>
          </div>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition border-b border-slate-100 last:border-0 ${mode === m.id ? 'bg-indigo-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-600">{m.icon}</span>
                <span className="text-xs font-medium text-slate-800 flex-1">{m.label}</span>
                {mode === m.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 ml-5">{m.description}</p>
            </button>
          ))}
          <p className="px-3 py-2 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-200">
            ※ 다운로드 직전 일괄 요약은 모드와 무관하게 안전망으로 유지됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
