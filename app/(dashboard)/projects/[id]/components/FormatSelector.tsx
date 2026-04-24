'use client'

import { useState } from 'react'
import { ChevronDown, RotateCcw, Check } from 'lucide-react'
import { PRODUCTION_FORMATS, findFormatByDimensions } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { DesignItem } from '@/lib/types'

interface Props {
  item: DesignItem | null
  onItemUpdate: (patch: Partial<DesignItem>) => void
}

// 카테고리별 그룹핑
const GROUPS = [
  { label: '배너류', ids: ['x_banner', 'i_banner', 'streetlight_banner'] },
  { label: '현수막 / 통천', ids: ['horizontal_banner', 'vertical_banner', 'chunchen_banner'] },
  { label: '기타 제작물', ids: ['podium', 'a4_portrait', 'a4_landscape', 'a3_portrait', 'a3_landscape'] },
]

export function FormatSelector({ item, onItemUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (!item) return null

  const currentFormat = findFormatByDimensions(item.width_mm ?? 0, item.height_mm ?? 0)

  const applyFormat = async (widthMm: number, heightMm: number, category: string) => {
    const patch = { width_mm: widthMm, height_mm: heightMm, category }
    onItemUpdate(patch)
    setIsOpen(false)
    const supabase = createClient()
    await supabase.from('design_items').update(patch).eq('id', item.id)
  }

  const toggleOrientation = async () => {
    if (!item.width_mm || !item.height_mm) return
    const patch = { width_mm: item.height_mm, height_mm: item.width_mm }
    onItemUpdate(patch)
    const supabase = createClient()
    await supabase.from('design_items').update(patch).eq('id', item.id)
  }

  const handleCustomWidth = async (v: string) => {
    const widthMm = parseInt(v)
    if (!isNaN(widthMm) && widthMm > 0) {
      const patch = { width_mm: widthMm }
      onItemUpdate(patch)
      const supabase = createClient()
      await supabase.from('design_items').update(patch).eq('id', item.id)
    }
  }

  const handleCustomHeight = async (v: string) => {
    const heightMm = parseInt(v)
    if (!isNaN(heightMm) && heightMm > 0) {
      const patch = { height_mm: heightMm }
      onItemUpdate(patch)
      const supabase = createClient()
      await supabase.from('design_items').update(patch).eq('id', item.id)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {/* 규격 직접 입력 */}
      <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md">
        <input
          type="number"
          value={item.width_mm ?? ''}
          onChange={e => handleCustomWidth(e.target.value)}
          className="w-14 bg-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="W"
        />
        <span className="text-slate-500 text-[10px]">×</span>
        <input
          type="number"
          value={item.height_mm ?? ''}
          onChange={e => handleCustomHeight(e.target.value)}
          className="w-14 bg-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="H"
        />
        <span className="text-slate-500 text-[9px]">mm</span>
      </div>

      {/* 드롭다운 버튼 */}
      <div className="relative">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-md transition"
        >
          <span className="font-medium">{currentFormat?.label ?? '양식 선택'}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {isOpen && (
          <>
            {/* 배경 오버레이 (닫기용) */}
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

            {/* 드롭다운 패널 */}
            <div className="absolute top-full left-0 mt-1 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden">
              <div className="max-h-80 overflow-y-auto py-1">
                {GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 pt-2.5 pb-1 text-[9px] font-semibold text-slate-600 uppercase tracking-widest">
                      {group.label}
                    </div>
                    {PRODUCTION_FORMATS.filter((f) => group.ids.includes(f.id)).map((fmt) => {
                      const isActive = currentFormat?.id === fmt.id
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => applyFormat(fmt.width_mm, fmt.height_mm, fmt.category)}
                          className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-indigo-950/40 text-indigo-300'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isActive && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                              <p className="font-medium truncate">{fmt.label}</p>
                            </div>
                            <p className="text-slate-600 text-[10px] mt-0.5">{fmt.description}</p>
                          </div>
                          <span className="text-slate-600 font-mono text-[10px] flex-shrink-0">
                            {fmt.width_mm}×{fmt.height_mm}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 가로/세로 전환 버튼 */}
      <button
        onClick={toggleOrientation}
        title="가로 ↔ 세로 전환"
        className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-md transition"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
