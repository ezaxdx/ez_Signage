'use client'

import { useState } from 'react'
import { X, Loader2, Wand2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { insertDefaultSlotsForItem } from '@/lib/services/itemService'
import type { DesignItem } from '@/lib/types'

interface Props {
  sourceItem: DesignItem
  currentItemCount: number
  projectId: string
  onClose: () => void
  onGenerated: (newItems: DesignItem[]) => void
}

type Axis = 'direction' | 'language' | 'keyword'

const DIRECTION_VALUES = [
  { key: '←', label: '왼쪽' },
  { key: '→', label: '오른쪽' },
  { key: '↑', label: '위' },
  { key: '↓', label: '아래' },
  { key: '↖', label: '왼쪽 위' },
  { key: '↗', label: '오른쪽 위' },
  { key: '↙', label: '왼쪽 아래' },
  { key: '↘', label: '오른쪽 아래' },
]
const LANGUAGE_VALUES: Array<'KOR' | 'EN' | 'EN/KOR'> = ['KOR', 'EN', 'EN/KOR']

export function SeriesGenerator({ sourceItem, currentItemCount, projectId, onClose, onGenerated }: Props) {
  const [axis, setAxis] = useState<Axis>('direction')
  const [selectedDirections, setSelectedDirections] = useState<Set<string>>(new Set(['←', '→', '↑', '↓']))
  const [selectedLanguages, setSelectedLanguages] = useState<Set<'KOR' | 'EN' | 'EN/KOR'>>(new Set<'KOR' | 'EN' | 'EN/KOR'>(['KOR', 'EN']))
  const [keywords, setKeywords] = useState<string[]>([''])
  const [targetSlot, setTargetSlot] = useState<string>('arrow')
  const [generating, setGenerating] = useState(false)

  const variations: { key: string; label: string }[] = (() => {
    if (axis === 'direction') {
      return Array.from(selectedDirections).map(k => ({
        key: k,
        label: DIRECTION_VALUES.find(d => d.key === k)?.label ?? k,
      }))
    }
    if (axis === 'language') {
      return Array.from(selectedLanguages).map(l => ({ key: l, label: l }))
    }
    return keywords.filter(k => k.trim()).map(k => ({ key: k.trim(), label: k.trim() }))
  })()

  const handleGenerate = async () => {
    if (variations.length === 0) return
    setGenerating(true)
    const supabase = createClient()

    try {
      // 원본 item_contents 가져오기
      const { data: srcContents } = await supabase
        .from('item_contents')
        .select('slot_key, slot_value')
        .eq('item_id', sourceItem.id)

      const newItems: DesignItem[] = []
      let nextNoIdx = currentItemCount + 1

      for (const v of variations) {
        const newNo = String(nextNoIdx++).padStart(2, '0')
        const patch: Partial<DesignItem> = {
          project_id: projectId,
          no: newNo,
          part: sourceItem.part,
          category: sourceItem.category,
          location: sourceItem.location,
          purpose: sourceItem.purpose,
          quantity: sourceItem.quantity,
          material: sourceItem.material,
          width_mm: sourceItem.width_mm,
          height_mm: sourceItem.height_mm,
          qr_required: sourceItem.qr_required,
          language: sourceItem.language,
        }

        // 언어 변형이면 language 컬럼 변경
        if (axis === 'language') {
          patch.language = v.key as 'KOR' | 'EN' | 'EN/KOR'
        }

        const { data: created } = await supabase.from('design_items').insert(patch).select().single()
        if (!created) continue
        newItems.push(created as DesignItem)

        // contents 복제 + 변형 적용
        const contentRows = (srcContents ?? []).map(c => {
          let slot: any = {}
          try { slot = JSON.parse(c.slot_value ?? '{}') } catch {}

          if (axis === 'direction' && c.slot_key === targetSlot) {
            // 화살표 슬롯에 방향 키워드 주입
            slot.ko = v.key
            slot.en = v.key
          } else if (axis === 'keyword' && c.slot_key === targetSlot) {
            // 특정 슬롯에 키워드 주입
            slot.ko = v.key
            slot.en = v.key
          } else if (axis === 'language') {
            // KOR만 또는 EN만 남기기
            if (v.key === 'KOR') slot.en = ''
            else if (v.key === 'EN') slot.ko = ''
          }
          return {
            item_id: created.id,
            slot_key: c.slot_key,
            slot_value: JSON.stringify(slot),
          }
        })

        if (contentRows.length > 0) {
          await supabase.from('item_contents').insert(contentRows)
        } else {
          // 원본 contents가 비어있으면 기본 슬롯 적용
          await insertDefaultSlotsForItem(supabase, created.id, projectId)
        }
      }

      onGenerated(newItems)
      onClose()
    } catch (err) {
      console.error('series generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  const slotOptions = ['arrow', 'hero_title', 'sub_title', 'body', 'header_brand']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            <div>
              <h2 className="text-slate-100 font-semibold text-sm">시리즈 자동 생성</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {sourceItem.no} {sourceItem.category}을 변형하여 N장 동시 생성
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 변형 축 선택 */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">변형 축</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'direction' as Axis, label: '방향', desc: '← → ↑ ↓' },
                { id: 'language' as Axis, label: '언어', desc: 'KOR / EN' },
                { id: 'keyword' as Axis, label: '키워드', desc: '체험존명 등' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAxis(opt.id)}
                  className={`px-2 py-2 rounded-lg text-xs transition border ${
                    axis === opt.id
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                      : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 방향 선택 */}
          {axis === 'direction' && (
            <>
              <div>
                <label className="block text-slate-400 text-xs mb-2">생성할 방향 (8방향 — 차후 화살표 스티커 부착용)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DIRECTION_VALUES.map(d => (
                    <button
                      key={d.key}
                      onClick={() => {
                        setSelectedDirections(prev => {
                          const next = new Set(prev)
                          if (next.has(d.key)) next.delete(d.key)
                          else next.add(d.key)
                          return next
                        })
                      }}
                      className={`px-2 py-2 rounded-lg text-xs transition border ${
                        selectedDirections.has(d.key)
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                          : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-base">{d.key}</div>
                      <div className="text-[9px] opacity-80">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">방향 입력 위치</label>
                <select value={targetSlot} onChange={e => setTargetSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500">
                  {slotOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {/* 언어 선택 */}
          {axis === 'language' && (
            <div>
              <label className="block text-slate-400 text-xs mb-2">생성할 언어</label>
              <div className="flex gap-2">
                {LANGUAGE_VALUES.map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setSelectedLanguages(prev => {
                        const next = new Set(prev)
                        if (next.has(l)) next.delete(l)
                        else next.add(l)
                        return next
                      })
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition border ${
                      selectedLanguages.has(l)
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 키워드 입력 */}
          {axis === 'keyword' && (
            <>
              <div>
                <label className="block text-slate-400 text-xs mb-2">키워드 목록 (각 키워드당 1장)</label>
                <div className="space-y-2">
                  {keywords.map((kw, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={kw}
                        onChange={e => setKeywords(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                        placeholder={`키워드 ${idx + 1} (예: 한복체험존)`}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      {keywords.length > 1 && (
                        <button onClick={() => setKeywords(prev => prev.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setKeywords(prev => [...prev, ''])} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs px-2 py-1 rounded hover:bg-indigo-900/30 transition">
                    <Plus className="w-3 h-3" /> 키워드 추가
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">키워드 적용 슬롯</label>
                <select value={targetSlot} onChange={e => setTargetSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500">
                  {slotOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {/* 미리보기 */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-2">생성 예정: <strong className="text-indigo-300">{variations.length}장</strong></p>
            <div className="flex flex-wrap gap-1">
              {variations.map(v => (
                <span key={v.key} className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                  {v.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded-lg transition">
            취소
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || variations.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm py-2 rounded-lg transition"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {generating ? '생성 중...' : `${variations.length}장 생성`}
          </button>
        </div>
      </div>
    </div>
  )
}
