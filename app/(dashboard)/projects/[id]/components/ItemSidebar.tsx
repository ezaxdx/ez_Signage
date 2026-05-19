'use client'

import { useState } from 'react'
import { Plus, Image as ImageIcon, Trash2, AlertTriangle, Copy, CheckCircle2, Circle, Wand2, Filter, Crown } from 'lucide-react'
import { SeriesGenerator } from './SeriesGenerator'
import { createClient } from '@/lib/supabase/client'
import { insertDefaultSlotsForItem } from '@/lib/services/itemService'
import { nextDesignItemNo } from '@/lib/services/designItemNo'
import type { DesignItem } from '@/lib/types'

interface Props {
  items: DesignItem[]
  selectedItemId: string
  onSelect: (id: string) => void
  projectId: string
  onItemsChange: (items: DesignItem[]) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'X배너': 'bg-indigo-500/20 text-indigo-300',
  'X-배너': 'bg-indigo-500/20 text-indigo-300',  // 호환 = 5/19 SOT 정정 전 데이터
  'X-Banner': 'bg-indigo-500/20 text-indigo-300',
  '현수막': 'bg-emerald-500/20 text-emerald-300',
  '폼보드': 'bg-amber-500/20 text-amber-300',
  'L보드': 'bg-purple-500/20 text-purple-300',
  '포디움': 'bg-rose-500/20 text-rose-300',
  '통천': 'bg-cyan-500/20 text-cyan-300',
}

export function ItemSidebar({ items, selectedItemId, onSelect, projectId, onItemsChange }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [seriesSourceItem, setSeriesSourceItem] = useState<DesignItem | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'incomplete' | 'completed'>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'part' | 'category'>('none')

  const filteredItems = items.filter(item => {
    if (filterMode === 'completed') return item.completed
    if (filterMode === 'incomplete') return !item.completed
    return true
  })

  // 그룹화 (정렬용)
  const grouped = (() => {
    if (groupBy === 'none') return [{ label: '', items: filteredItems }]
    const map = new Map<string, DesignItem[]>()
    for (const it of filteredItems) {
      const key = (groupBy === 'part' ? it.part : it.category) ?? '미분류'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  })()

  const handleAddItem = async () => {
    setIsAdding(true)
    try {
      const supabase = createClient()
      // v10.4: items.length+1 = 삭제 후 추가 시 중복 위험. nextDesignItemNo(max+1) 사용.
      // 'X-배너' → 'X배너' = 노션 §6-2 SOT 정합 (대시 표기 5/19 SOT 정정).
      const nextNo = nextDesignItemNo(items)

      const { data, error } = await supabase
        .from('design_items')
        .insert({
          project_id: projectId,
          no: nextNo,
          category: 'X배너',
          width_mm: 600,
          height_mm: 1800,
          material: 'PET',
          quantity: 1,
          qr_required: false,
        })
        .select()
        .single()

      if (error) {
        console.error('항목 추가 실패:', error)
        const msg = error.message || ''
        if (/row.*level|policy|permission/i.test(msg)) {
          alert('권한 부족: 프로젝트 멤버가 아닙니다.\nmigration_all.sql 실행을 확인해주세요.')
        } else {
          alert('항목 추가 실패: ' + msg)
        }
        return
      }

      if (data) {
        try {
          await insertDefaultSlotsForItem(supabase, data.id, projectId)
        } catch (err) {
          console.warn('기본 슬롯 삽입 실패 (계속 진행):', err)
        }
        onItemsChange([...items, data as DesignItem])
        onSelect(data.id)
      }
    } finally {
      setIsAdding(false)
    }
  }

  // ══════════════════════════════════════════════════════
  // handleDuplicateItem — 단일 빠른 복제 (1클릭, 모달 없음)
  // 역할 구분:
  //   • 이 함수      : 1클릭 즉시 1장 복제 (item_contents 그대로)
  //   • SeriesGenerator (🪄 아이콘): 모달 → 변형 축(방향/언어/키워드) N장 생성
  //   • setAsMaster  (👑 아이콘): 이 아이템을 category 마스터로 지정 + 같은 category 전체에 서식 전파
  // ══════════════════════════════════════════════════════
  const handleDuplicateItem = async (sourceItem: DesignItem) => {
    setIsAdding(true)
    const supabase = createClient()
    // v10.4: items.length+1 → nextDesignItemNo (삭제 후 복제 시 중복 위험 해소)
    const nextNo = nextDesignItemNo(items)

    const { data: newItem } = await supabase
      .from('design_items')
      .insert({
        project_id: projectId,
        no: nextNo,
        part: sourceItem.part,
        category: sourceItem.category,
        location: sourceItem.location,
        purpose: sourceItem.purpose,
        language: sourceItem.language,
        quantity: sourceItem.quantity,
        material: sourceItem.material,
        width_mm: sourceItem.width_mm,
        height_mm: sourceItem.height_mm,
        qr_required: sourceItem.qr_required,
      })
      .select().single()

    if (newItem) {
      // 원본 item_contents 복제
      const { data: srcContents } = await supabase
        .from('item_contents')
        .select('slot_key, slot_value')
        .eq('item_id', sourceItem.id)

      if (srcContents && srcContents.length > 0) {
        await supabase.from('item_contents').insert(
          srcContents.map(c => ({
            item_id: newItem.id,
            slot_key: c.slot_key,
            slot_value: c.slot_value,
          }))
        )
      } else {
        // 원본 contents가 비어있으면 프로젝트 기본 슬롯 적용
        await insertDefaultSlotsForItem(supabase, newItem.id, projectId)
      }

      onItemsChange([...items, newItem as DesignItem])
      onSelect(newItem.id)
    }
    setIsAdding(false)
  }

  const handleToggleCompleted = async (itemId: string, current: boolean) => {
    const supabase = createClient()
    onItemsChange(items.map(i => i.id === itemId ? { ...i, completed: !current } : i))
    await supabase.from('design_items').update({ completed: !current }).eq('id', itemId)
  }

  const handleDeleteItem = async (itemId: string) => {
    setIsDeleting(true)
    const supabase = createClient()

    await supabase.from('design_items').delete().eq('id', itemId)

    const remaining = items.filter(i => i.id !== itemId)
    const renumbered = remaining.map((item, idx) => ({
      ...item,
      no: String(idx + 1).padStart(2, '0'),
    }))

    if (renumbered.length > 0) {
      await supabase
        .from('design_items')
        .upsert(
          renumbered.map(({ id, no }) => ({ id, no })),
          { onConflict: 'id' }
        )
    }

    onItemsChange(renumbered)
    if (selectedItemId === itemId) {
      onSelect(renumbered[0]?.id ?? '')
    }

    setConfirmDeleteId(null)
    setIsDeleting(false)
  }

  return (
    <aside className="w-[188px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
      {/* 헤더 + 필터/정렬 */}
      <div className="px-3 py-2 border-b border-slate-200 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">
            제작물 ({filteredItems.length}/{items.length})
          </p>
          <Filter className="w-3 h-3 text-slate-600" />
        </div>
        <div className="flex gap-1">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as 'all' | 'incomplete' | 'completed')}
            className="flex-1 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[9px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">전체</option>
            <option value="incomplete">미완료</option>
            <option value="completed">완료</option>
          </select>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as 'none' | 'part' | 'category')}
            className="flex-1 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[9px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="none">정렬 없음</option>
            <option value="part">파트별</option>
            <option value="category">품목별</option>
          </select>
        </div>
      </div>

      {/* 항목 리스트 */}
      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
            <ImageIcon className="w-7 h-7 text-slate-700 mb-2" />
            <p className="text-slate-600 text-xs">항목이 없습니다</p>
            <p className="text-slate-700 text-[10px] mt-0.5">아래 버튼으로 추가하세요</p>
          </div>
        ) : (
          grouped.flatMap(group => [
            ...(group.label ? [
              <div key={`group-${group.label}`} className="px-3 py-1 mt-1 text-[9px] font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">
                {group.label}
              </div>
            ] : []),
            ...group.items.map((item) => {
            const isSelected = item.id === selectedItemId
            const isConfirming = confirmDeleteId === item.id
            const colorClass =
              CATEGORY_COLORS[item.category ?? ''] ?? 'bg-slate-500/20 text-slate-400'

            return (
              <div key={item.id} className="relative group">
                {/* 삭제 확인 오버레이 */}
                {isConfirming && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 rounded-sm px-2 py-2 gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-[10px] text-slate-700 text-center leading-tight">
                      {item.no} 제작물을<br />삭제하시겠어요?
                    </p>
                    <div className="flex gap-1.5 w-full">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 text-[10px] text-slate-400 bg-slate-50 hover:bg-slate-700 py-1 rounded transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeleting}
                        className="flex-1 text-[10px] text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 py-1 rounded transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-none transition-colors relative ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-200'
                      : 'text-slate-400 hover:bg-slate-50/50 hover:text-slate-800'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
                  )}

                  <div className="flex items-center gap-2 pl-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleCompleted(item.id, item.completed ?? false)
                      }}
                      className="flex-shrink-0"
                      title={item.completed ? '편집 완료됨' : '완료 체크'}
                    >
                      {item.completed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : <Circle className="w-3.5 h-3.5 text-slate-700 hover:text-slate-500" />}
                    </button>
                    <span className="text-[10px] font-mono text-slate-600 w-5 flex-shrink-0">
                      {item.no}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${colorClass}`}
                        >
                          {item.category ?? '미분류'}
                        </span>
                        {item.is_master && (
                          <Crown className="w-3 h-3 text-amber-400" />
                        )}
                        {item.review_status && item.review_status !== '작업중' && (
                          <span className={`text-[8px] px-1 py-0 rounded ${
                            item.review_status === '검수완료' ? 'bg-emerald-900/50 text-emerald-400'
                            : item.review_status === '발주완료' ? 'bg-indigo-900/50 text-indigo-400'
                            : item.review_status === '수정요청' ? 'bg-rose-900/50 text-rose-400'
                            : 'bg-amber-900/50 text-amber-400'
                          }`}>
                            {item.review_status}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-tight truncate text-slate-400">
                        {item.location ?? item.purpose ?? '장소 미입력'}
                      </p>
                      {item.width_mm && item.height_mm && (
                        <p className="text-[10px] text-slate-600 font-mono">
                          {item.width_mm}×{item.height_mm}mm
                        </p>
                      )}
                      {item.last_edited_by && (
                        <p className="text-[9px] text-slate-600 truncate" title={item.last_edited_by}>
                          {item.last_edited_by.split('@')[0]}
                        </p>
                      )}
                    </div>

                    {/* 복제 + 삭제 버튼 — hover 시 표시 */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSeriesSourceItem(item)
                        }}
                        className="p-1 rounded hover:bg-purple-900/40 text-slate-600 hover:text-purple-400 transition"
                        title="시리즈 자동 생성 (방향/언어/키워드 변형)"
                      >
                        <Wand2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateItem(item)
                        }}
                        disabled={isAdding}
                        className="p-1 rounded hover:bg-indigo-900/40 text-slate-600 hover:text-indigo-400 transition"
                        title="단일 복제"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteId(item.id)
                        }}
                        className="p-1 rounded hover:bg-red-900/40 text-slate-600 hover:text-red-400 transition"
                        title="제작물 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </button>
              </div>
            )
            }),
          ])
        )}
      </div>

      {/* 시리즈 자동 생성 모달 */}
      {seriesSourceItem && (
        <SeriesGenerator
          sourceItem={seriesSourceItem}
          currentItemCount={items.length}
          projectId={projectId}
          onClose={() => setSeriesSourceItem(null)}
          onGenerated={(newItems) => onItemsChange([...items, ...newItems])}
        />
      )}

      {/* 항목 추가 버튼 */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={handleAddItem}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs py-2 rounded-md hover:bg-slate-50 transition disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? '추가 중...' : '항목 추가'}
        </button>
      </div>
    </aside>
  )
}
