'use client'

// 시설 가이드 알림 강도 3단 토글 (§11-6 - v7)
// verbose: 알랏 + 아이콘 / silent_icon: 아이콘만 / off: 둘 다 끄기
// 어떤 모드든 다운로드 직전 일괄 요약은 안전망으로 유지

import { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, BellOff, ChevronDown, Check } from 'lucide-react'

export type FacilityCheckMode = 'verbose' | 'silent_icon' | 'off'

const MODES: Array<{ id: FacilityCheckMode; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'verbose',     label: '알림 + 아이콘',  description: '첫 위반 알랏 + 그리드 ⚠️ 아이콘 (기본)', icon: <BellRing className="w-3.5 h-3.5" /> },
  { id: 'silent_icon', label: '아이콘만',       description: '알랏 끄기, 그리드 ⚠️ 아이콘만',           icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'off',         label: '모두 끄기',      description: '알랏·아이콘 모두 끄기 (요약만 1회)',      icon: <BellOff className="w-3.5 h-3.5" /> },
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
        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md px-2 py-1 transition"
        title="시설 가이드 알림 강도"
      >
        {current.icon}
        <span className="hidden sm:inline">시설 알림: {current.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <p className="text-[11px] text-slate-500">시설 가이드 알림 강도</p>
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
