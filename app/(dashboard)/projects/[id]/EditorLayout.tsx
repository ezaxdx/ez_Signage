'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EditorGrid } from './components/EditorGrid'
import { CanvasBoard } from './components/CanvasBoard'
import { EditorToolbar } from './components/EditorToolbar'
import { PreflightModal } from './components/PreflightModal'
import { DEFAULT_SLOTS } from '@/lib/types'
import type { Project, DesignItem, SlotContent, ContentsMap, SlotStylesMap } from '@/lib/types'

interface Props {
  project: Project
  initialItems: DesignItem[]
  userEmail: string
}

function parseAllContentsRows(
  rows: { item_id: string; slot_key: string; slot_value: string | null }[]
): Record<string, ContentsMap> {
  const result: Record<string, ContentsMap> = {}
  for (const row of rows) {
    if (!row.slot_value) continue
    try {
      if (!result[row.item_id]) result[row.item_id] = {}
      result[row.item_id][row.slot_key] = JSON.parse(row.slot_value) as SlotContent
    } catch {}
  }
  return result
}

export function EditorLayout({ project, initialItems, userEmail }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [items, setItems] = useState<DesignItem[]>(initialItems)
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItems[0]?.id ?? '')
  const [allContents, setAllContents] = useState<Record<string, ContentsMap>>({})
  const [slotStyles, setSlotStyles] = useState<SlotStylesMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [slotPanelOpen, setSlotPanelOpen] = useState(false)
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [showPreflight, setShowPreflight] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const loadedItemIds = useRef(new Set<string>())

  // ── 프로젝트 기본 서식(slot_styles) 로드 + Realtime 구독 ──
  useEffect(() => {
    supabase
      .from('slot_styles')
      .select('slot_key, font_face, font_size, color, align')
      .eq('project_id', project.id)
      .then(({ data }) => {
        const map: SlotStylesMap = {}
        for (const row of data ?? []) {
          map[row.slot_key] = {
            font_face: row.font_face,
            font_size: row.font_size,
            color: row.color,
            align: row.align as 'center' | 'left' | 'right',
          }
        }
        setSlotStyles(map)
      })

    // 실시간 구독 — 총괄자가 서식 변경 시 즉시 반영
    const channel = supabase
      .channel(`slot-styles-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_styles', filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const { slot_key } = payload.old as { slot_key: string }
            setSlotStyles(prev => {
              const next = { ...prev }
              delete next[slot_key]
              return next
            })
          } else {
            const row = payload.new as any
            setSlotStyles(prev => ({
              ...prev,
              [row.slot_key]: {
                font_face: row.font_face,
                font_size: row.font_size,
                color: row.color,
                align: row.align,
              },
            }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, project.id])

  // ── 초기 bulk 로드 ────────────────────────────────────────
  const initialIds = useRef(initialItems.map(i => i.id))
  useEffect(() => {
    const ids = initialIds.current
    if (ids.length === 0) { setIsLoading(false); return }
    ids.forEach(id => loadedItemIds.current.add(id))

    supabase
      .from('item_contents')
      .select('item_id, slot_key, slot_value')
      .in('item_id', ids)
      .then(({ data }) => {
        setAllContents(parseAllContentsRows(data ?? []))
        setIsLoading(false)
      })
  }, [supabase])

  // ── 새로 추가된 아이템 on-demand 로드 ─────────────────────
  useEffect(() => {
    if (!selectedItemId || loadedItemIds.current.has(selectedItemId)) return
    loadedItemIds.current.add(selectedItemId)

    supabase
      .from('item_contents')
      .select('item_id, slot_key, slot_value')
      .eq('item_id', selectedItemId)
      .then(({ data }) => {
        const map: ContentsMap = {}
        for (const row of data ?? []) {
          if (!row.slot_value) continue
          try { map[row.slot_key] = JSON.parse(row.slot_value) as SlotContent } catch {}
        }
        setAllContents(prev => ({ ...prev, [selectedItemId]: map }))
      })
  }, [selectedItemId, supabase])

  // ── Realtime 구독: design_items 전체 (프로젝트 단위) ──────
  // 다른 기기에서 항목 추가/삭제/수정 시 동기화
  useEffect(() => {
    const channel = supabase
      .channel(`design-items-${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'design_items', filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as DesignItem
            setItems(prev => prev.some(i => i.id === row.id) ? prev : [...prev, row])
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as DesignItem
            setItems(prev => prev.map(i => i.id === row.id ? { ...i, ...row } : i))
          } else if (payload.eventType === 'DELETE') {
            const { id } = payload.old as { id: string }
            setItems(prev => prev.filter(i => i.id !== id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, project.id])

  // ── Realtime 구독 (선택된 아이템) ─────────────────────────
  useEffect(() => {
    if (!selectedItemId) return

    const channel = supabase
      .channel(`item-contents-${selectedItemId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_contents', filter: `item_id=eq.${selectedItemId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const { slot_key } = payload.old as { slot_key: string }
            setAllContents(prev => {
              const next = { ...(prev[selectedItemId] ?? {}) }
              delete next[slot_key]
              return { ...prev, [selectedItemId]: next }
            })
          } else {
            const { slot_key, slot_value } = payload.new as { slot_key: string; slot_value: string }
            try {
              setAllContents(prev => ({
                ...prev,
                [selectedItemId]: {
                  ...(prev[selectedItemId] ?? {}),
                  [slot_key]: JSON.parse(slot_value) as SlotContent,
                },
              }))
            } catch {}
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedItemId, supabase])

  // ── 슬롯 업데이트 (Optimistic UI + 감사 로그) ──────────
  const updateSlot = useCallback(
    async (slotKey: string, updated: SlotContent) => {
      const prevValue = allContents[selectedItemId]?.[slotKey]

      setAllContents(prev => ({
        ...prev,
        [selectedItemId]: { ...(prev[selectedItemId] ?? {}), [slotKey]: updated },
      }))
      setItems(prev => prev.map(i => i.id === selectedItemId ? { ...i, last_edited_by: userEmail } : i))
      setSaveStatus('saving')
      clearTimeout(saveTimerRef.current)

      const [{ error }] = await Promise.all([
        supabase.from('item_contents').upsert(
          { item_id: selectedItemId, slot_key: slotKey, slot_value: JSON.stringify(updated) },
          { onConflict: 'item_id,slot_key' }
        ),
        supabase.from('design_items').update({ last_edited_by: userEmail }).eq('id', selectedItemId),
        // 감사 로그 (실패해도 UX 영향 없음 — fire-and-forget)
        supabase.from('slot_history').insert({
          item_id: selectedItemId,
          slot_key: slotKey,
          prev_value: prevValue ? JSON.stringify(prevValue) : null,
          new_value: JSON.stringify(updated),
          edited_by: userEmail,
        }),
      ])

      if (!error) {
        setSaveStatus('saved')
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [allContents, selectedItemId, supabase, userEmail]
  )

  // ── 제작물 메타 업데이트 (Toolbar용) ─────────────────────
  const handleItemUpdate = useCallback(
    async (patch: Partial<DesignItem>) => {
      setItems(prev => prev.map(item => item.id === selectedItemId ? { ...item, ...patch } : item))
      const { error } = await supabase.from('design_items').update(patch).eq('id', selectedItemId)
      if (error) {
        console.error('제작물 업데이트 실패:', error)
        alert('DB 업데이트 실패: ' + error.message)
      }
    },
    [selectedItemId, supabase]
  )

  // ── 제작물 메타 업데이트 (Grid용) ────────────────────────
  const updateItem = useCallback(
    async (id: string, patch: Partial<DesignItem>) => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
      await supabase.from('design_items').update(patch).eq('id', id)
    },
    [supabase]
  )

  // ── 제작물 추가 (Grid용) — 종류 선택 시 카테고리·규격·재질 자동 채움 ────
  const handleAddItem = useCallback(async (preset?: { category: string; width_mm: number; height_mm: number; material: string }) => {
    const nextNo = String(items.length + 1).padStart(2, '0')
    const newItem: Partial<DesignItem> = {
      project_id: project.id,
      no: nextNo,
      category: preset?.category ?? '',
      quantity: 1,
      width_mm: preset?.width_mm ?? 600,
      height_mm: preset?.height_mm ?? 1800,
      material: preset?.material ?? null,
    }
    const { data, error } = await supabase.from('design_items').insert(newItem).select().single()
    if (error || !data) {
      alert('제작물 추가 실패: ' + (error?.message ?? ''))
      return
    }
    const created = data as DesignItem
    setItems(prev => [...prev, created])
    setSelectedItemId(created.id)
    // 종류가 지정된 경우 — 기본 슬롯도 자동 삽입 (SEED_LAYOUT_DNA 우선)
    if (preset?.category) {
      const { insertDefaultSlotsForItem } = await import('@/lib/services/itemService')
      await insertDefaultSlotsForItem(supabase, created.id, project.id)
    }
  }, [items.length, project.id, supabase])

  // ── 제작물 삭제 (Grid용) ──────────────────────────────────
  const handleDeleteItem = useCallback(async (id: string) => {
    const target = items.find(i => i.id === id)
    if (!target) return
    const ok = window.confirm(`'${target.no ?? ''} ${target.category ?? ''}' 제작물을 삭제할까요?\n관련 슬롯·이미지가 함께 사라지며 되돌릴 수 없습니다.`)
    if (!ok) return
    await supabase.from('item_contents').delete().eq('item_id', id)
    await supabase.from('design_items').delete().eq('id', id)
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      if (id === selectedItemId && next.length > 0) setSelectedItemId(next[0].id)
      return next
    })
  }, [items, selectedItemId, supabase])

  // ── 제작물 행 순서 변경 (Grid용) ───────────────────────────
  const handleReorderItems = useCallback((newOrder: DesignItem[]) => {
    setItems(newOrder)
    // 1차: 화면 순서만 변경 (DB 저장은 향후 sort_order 컬럼 추가 후)
    // localStorage에 순서 저장하면 새로고침 후에도 유지
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mice_item_order_${project.id}`, JSON.stringify(newOrder.map(i => i.id)))
    }
  }, [project.id])

  // 초기 로드 시 localStorage 순서 적용
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`mice_item_order_${project.id}`)
    if (!stored) return
    try {
      const ids = JSON.parse(stored) as string[]
      setItems(prev => {
        const map = new Map(prev.map(i => [i.id, i]))
        const reordered = ids.map(id => map.get(id)).filter((i): i is DesignItem => !!i)
        const newIds = prev.filter(i => !ids.includes(i.id))   // 새로 추가된 항목
        return [...reordered, ...newIds]
      })
    } catch {}
  }, [project.id])

  // ── 슬롯 추가 ────────────────────────────────────────────
  const handleSlotAdd = useCallback(
    async (label: string) => {
      const base = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const slotKey = base || `slot_${Date.now()}`
      const newSlot: SlotContent = {
        label,
        ko: '',
        en: '',
        x: 50,
        y: 50,
        fontSize: 16,
      }

      setAllContents(prev => ({
        ...prev,
        [selectedItemId]: { ...(prev[selectedItemId] ?? {}), [slotKey]: newSlot },
      }))
      setSaveStatus('saving')

      const { error } = await supabase.from('item_contents').upsert(
        { item_id: selectedItemId, slot_key: slotKey, slot_value: JSON.stringify(newSlot) },
        { onConflict: 'item_id,slot_key' }
      )

      if (!error) {
        setSaveStatus('saved')
        setSelectedSlotKey(slotKey)
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [selectedItemId, supabase]
  )

  // ── 슬롯 삭제 ────────────────────────────────────────────
  const handleSlotDelete = useCallback(
    async (slotKey: string) => {
      setAllContents(prev => {
        const next = { ...(prev[selectedItemId] ?? {}) }
        delete next[slotKey]
        return { ...prev, [selectedItemId]: next }
      })

      await supabase
        .from('item_contents')
        .delete()
        .eq('item_id', selectedItemId)
        .eq('slot_key', slotKey)

      if (selectedSlotKey === slotKey) setSelectedSlotKey(null)
    },
    [selectedItemId, selectedSlotKey, supabase]
  )

  // ── 슬롯 서식 업데이트 (현재 아이템) ─────────────────────
  const handleSlotStyleUpdate = useCallback(
    async (slotKey: string, patch: Partial<SlotContent>) => {
      const current = allContents[selectedItemId]?.[slotKey]
      if (!current) return
      const updated = { ...current, ...patch }
      await updateSlot(slotKey, updated)
    },
    [allContents, selectedItemId, updateSlot]
  )

  // ══════════════════════════════════════════════════════
  // handleApplyStyleToAll — SlotPanel의 "전체 제작물에 적용" 버튼
  // 역할 구분 (3가지 전파 함수 중 #1):
  //   • [#1] 이 함수 — 프로젝트 전체 같은 slot_key의 fontSize·y만 복사, 소스=현재 아이템
  //   • [#2] handleMasterBroadcast (/info 페이지, 🎯 버튼) — slot_styles 테이블이 소스, 전체 필드 적용
  //   • [#3] setAsMaster (에디터 툴바, 👑 버튼) — 같은 category만 범위, 이 아이템 전체 복제
  // 사용 시점: "이 슬롯의 크기 하나만 모든 배너에 통일하고 싶을 때"
  // ══════════════════════════════════════════════════════
  // ── 슬롯 서식 전체 제작물 적용 ───────────────────────────
  const handleApplyStyleToAll = useCallback(
    async (slotKey: string) => {
      const srcSlot = allContents[selectedItemId]?.[slotKey]
      if (!srcSlot) return

      const upsertRows = items.map(item => ({
        item_id: item.id,
        slot_key: slotKey,
        slot_value: JSON.stringify({
          ...(allContents[item.id]?.[slotKey] ?? srcSlot),
          fontSize: srcSlot.fontSize,
          y: srcSlot.y,
        }),
      }))

      await supabase
        .from('item_contents')
        .upsert(upsertRows, { onConflict: 'item_id,slot_key' })

      setAllContents(prev => {
        const next = { ...prev }
        for (const item of items) {
          next[item.id] = {
            ...(prev[item.id] ?? {}),
            [slotKey]: {
              ...(prev[item.id]?.[slotKey] ?? srcSlot),
              fontSize: srcSlot.fontSize,
              y: srcSlot.y,
            },
          }
        }
        return next
      })
    },
    [selectedItemId, allContents, items, supabase]
  )

  // ── 슬롯 이름(레이블) 변경 ───────────────────────────────
  const handleSlotRename = useCallback(
    async (slotKey: string, newLabel: string) => {
      const current = allContents[selectedItemId]?.[slotKey]
      if (!current) return
      const updated = { ...current, label: newLabel }
      setAllContents(prev => ({
        ...prev,
        [selectedItemId]: { ...(prev[selectedItemId] ?? {}), [slotKey]: updated },
      }))
      await supabase.from('item_contents').upsert(
        { item_id: selectedItemId, slot_key: slotKey, slot_value: JSON.stringify(updated) },
        { onConflict: 'item_id,slot_key' }
      )
    },
    [allContents, selectedItemId, supabase]
  )

  // ── 기본 슬롯 초기화 ─────────────────────────────────────
  const handleInitDefaultSlots = useCallback(async () => {
    const rows = Object.entries(DEFAULT_SLOTS).map(([slot_key, slot]) => ({
      item_id: selectedItemId,
      slot_key,
      slot_value: JSON.stringify(slot),
    }))

    await supabase
      .from('item_contents')
      .upsert(rows, { onConflict: 'item_id,slot_key' })

    setAllContents(prev => ({
      ...prev,
      [selectedItemId]: {
        ...(prev[selectedItemId] ?? {}),
        ...DEFAULT_SLOTS,
      },
    }))
  }, [selectedItemId, supabase])

  const selectedItem = items.find(i => i.id === selectedItemId) ?? null
  const contents = allContents[selectedItemId] ?? {}

  // ── Excel 전체 내보내기 ────────────────────────────────────
  const handleExcelExport = useCallback(async () => {
    const { exportToExcel } = await import('@/lib/services/ExportService')
    await exportToExcel(project, items, allContents)
  }, [items, project, allContents])

  // ── PPT 전체 내보내기 ──────────────────────────────────────
  const handlePPTExport = useCallback(async () => {
    const { exportToPPT } = await import('@/lib/services/ExportService')
    await exportToPPT(project, items, allContents)
  }, [items, project, allContents])

  // ── 단일 제작물 PPT ─────────────────────────────────────
  const handleSinglePPTExport = useCallback(async () => {
    const current = items.find(i => i.id === selectedItemId)
    if (!current) return
    const { exportSingleToPPT } = await import('@/lib/services/ExportService')
    await exportSingleToPPT(project, current, allContents)
  }, [items, selectedItemId, project, allContents])

  // ── 인쇄용 PDF (실물 mm 규격) ───────────────────────────
  const handlePDFExport = useCallback(async () => {
    const { exportToPDF } = await import('@/lib/services/ExportService')
    await exportToPDF(project, items, allContents)
  }, [project, items, allContents])

  // ── 마스터 지정 + 같은 category에 서식·위치 전파 ──────────
  const handleSetAsMaster = useCallback(async () => {
    const current = items.find(i => i.id === selectedItemId)
    if (!current) return
    if (!current.category) {
      alert('제작물 종류(category)가 설정되지 않았습니다.\n상단 양식 선택기에서 종류를 먼저 지정하세요.')
      return
    }
    const sameCatCount = items.filter(i => i.category === current.category && i.id !== current.id).length
    const confirmed = window.confirm(
      `이 제작물을 '${current.category}' 종류의 마스터 디자인으로 지정합니다.\n\n` +
      `같은 종류의 다른 제작물 ${sameCatCount}개에 이 디자인의 서식·위치·크기가 즉시 적용됩니다.\n` +
      `(각 제작물의 텍스트·이미지는 그대로 유지)\n\n계속하시겠습니까?`
    )
    if (!confirmed) return

    const { setAsMaster } = await import('@/lib/services/itemService')
    const res = await setAsMaster(supabase, current.id)
    if (res.error) {
      alert('마스터 지정 실패: ' + res.error)
      return
    }
    setItems(prev => prev.map(i => {
      if (i.category === current.category) {
        return { ...i, is_master: i.id === current.id }
      }
      return i
    }))
    alert(`✓ '${current.category}' 마스터로 지정됨.\n${res.propagated}개 제작물에 서식·위치 전파 완료.`)
  }, [items, selectedItemId, supabase])

  // 1차 출시는 좌측 제작물 사이드바 + 우측 구역 설정 패널 없이 제공
  // 슬롯 관련 핸들러는 향후 구역 설정 재도입 시 사용 (현재 비활성)
  void handleSlotAdd; void handleSlotDelete; void handleSlotRename
  void handleSlotStyleUpdate; void handleApplyStyleToAll; void handleInitDefaultSlots
  void slotPanelOpen; void setSlotPanelOpen

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <EditorToolbar
        project={project}
        selectedItem={selectedItem}
        saveStatus={saveStatus}
        slotPanelOpen={false}
        onItemUpdate={handleItemUpdate}
        onExcelExport={handleExcelExport}
        onPPTExport={handlePPTExport}
        onSinglePPTExport={handleSinglePPTExport}
        onPDFExport={handlePDFExport}
        onSetAsMaster={handleSetAsMaster}
        onToggleSlotPanel={() => { /* 1차 비활성 */ }}
        onPreflight={() => setShowPreflight(true)}
      />

      {showPreflight && (
        <PreflightModal
          items={items}
          allContents={allContents}
          onClose={() => setShowPreflight(false)}
          onGoToItem={(itemId) => {
            setSelectedItemId(itemId)
            setShowPreflight(false)
          }}
          onExportAll={async () => {
            await handleExcelExport()
            await handlePPTExport()
          }}
        />
      )}

      <div className="flex flex-1 min-h-0">
        {/* 좌측 제작물 사이드바 — 1차 제거됨 (향후 추가 진행 예정) */}
        {/* 우측 구역 설정 패널 — 1차 제거됨 (향후 추가 진행 예정) */}

        <div className="flex-1 flex flex-col min-w-0">
          {/* 데이터 그리드 — 50% (사이드바 제거로 비중 ↑) */}
          <div className="h-[50%] border-b border-slate-800 overflow-hidden">
            <EditorGrid
              items={items}
              allContents={allContents}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onUpdateItem={updateItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onReorderItems={handleReorderItems}
              isLoading={isLoading}
            />
          </div>

          {/* 디자인 캔버스 — 50% */}
          <div className="h-[50%]">
            <CanvasBoard
              item={selectedItem}
              contents={contents}
              slotStyles={slotStyles}
              selectedSlotKey={selectedSlotKey}
              onUpdate={updateSlot}
              onSlotSelect={setSelectedSlotKey}
              onSlotPanelOpen={() => { /* 1차 비활성 */ }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
