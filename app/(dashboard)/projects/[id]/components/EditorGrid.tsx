'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Settings2, X, GripVertical, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react'
import type { DesignItem, ContentsMap } from '@/lib/types'
import type { ValidationIssue } from '@/lib/services/facilityValidator'

const DEFAULT_SLOT_ORDER = ['header_brand', 'hero_title', 'sub_title', 'body', 'arrow', 'qr_code', 'footer_credits']

function gatherText(contents: ContentsMap, field: 'ko' | 'en'): string {
  const allKeys = Object.keys(contents)
  const orderedKeys = [
    ...DEFAULT_SLOT_ORDER.filter(k => allKeys.includes(k)),
    ...allKeys.filter(k => !DEFAULT_SLOT_ORDER.includes(k)),
  ]
  return orderedKeys.map(key => contents[key]?.[field] ?? '').filter(Boolean).join(' / ')
}

/** 국문·영문 통합 (사용자 요청: 내용 한 컬럼) */
function gatherCombinedText(contents: ContentsMap): string {
  const ko = gatherText(contents, 'ko')
  const en = gatherText(contents, 'en')
  if (ko && en) return `${ko}\n${en}`
  return ko || en || ''
}

function detectLanguage(ko: string, en: string): 'KOR' | 'EN' | 'EN/KOR' | null {
  const all = ko + en
  const hasKo = /[가-힣]/.test(all)
  const hasEn = /[a-zA-Z]/.test(all)
  if (hasKo && hasEn) return 'EN/KOR'
  if (hasKo) return 'KOR'
  if (hasEn) return 'EN'
  return null
}

type EditableField = 'no' | 'part' | 'location' | 'purpose' | 'language' | 'quantity' | 'material' | 'category' | 'size'
interface EditCell { itemId: string; field: EditableField | string }

interface Props {
  items: DesignItem[]
  allContents: Record<string, ContentsMap>
  selectedItemId: string
  onSelectItem: (id: string) => void
  onUpdateItem: (id: string, patch: Partial<DesignItem>) => void
  onAddItem?: (preset?: { category: string; width_mm: number; height_mm: number; material: string }) => void
  onDeleteItem?: (id: string) => void
  onReorderItems?: (newOrder: DesignItem[]) => void
  isLoading: boolean
  // v8: 시설 가이드 위반 항목 맵 (§11-6 ⚠️ 아이콘)
  facilityIssueMap?: Record<string, ValidationIssue[]>
  facilityCheckMode?: 'verbose' | 'silent_icon' | 'off'
}

// 행 추가 시 선택 가능한 환경장식물 종류 (NewProjectButton FORMAT_PRESETS와 동일)
const SIGNAGE_PRESETS = [
  { id: 'x_banner',           name: 'X-배너',        width: 600,  height: 1800, material: 'PET' },
  { id: 'i_banner',           name: 'I-배너',        width: 600,  height: 1600, material: 'PET' },
  { id: 'streetlight_banner', name: '가로등 배너',   width: 600,  height: 1800, material: '현수막' },
  { id: 'horizontal_banner',  name: '가로 현수막',   width: 5000, height: 900,  material: '현수막' },
  { id: 'vertical_banner',    name: '세로 현수막',   width: 900,  height: 5000, material: '현수막' },
  { id: 'chunchen_banner',    name: '통천',          width: 1000, height: 5000, material: '현수막' },
  { id: 'podium',             name: '포디움 타이틀', width: 600,  height: 200,  material: '스티커' },
  { id: 'foamboard',          name: '폼보드',        width: 600,  height: 900,  material: '폼보드 5T' },
  { id: 'a4_portrait',        name: 'A4 세로',       width: 210,  height: 297,  material: '인쇄' },
  { id: 'a4_landscape',       name: 'A4 가로',       width: 297,  height: 210,  material: '인쇄' },
  { id: 'a3_portrait',        name: 'A3 세로',       width: 297,  height: 420,  material: '인쇄' },
  { id: 'a3_landscape',       name: 'A3 가로',       width: 420,  height: 297,  material: '인쇄' },
] as const

const LANGUAGE_OPTIONS = ['KOR', 'EN', 'EN/KOR'] as const

type ColumnId = string

interface ColumnDef {
  id: ColumnId
  label: string
  width: string
  field: EditableField | string | null
  custom?: boolean
}

// v8 (2026-05-11): 1차안 17컬럼 복원
// - '사용 목적'은 purpose 필드로 환원, '내용'은 content_text 필드로 분리
// - 디자인업체·출력업체·설치시간·철거시간 4개 컬럼은 편집 초기 숨김 (4컬럼 기본 hidden)
const DEFAULT_COLS: ColumnDef[] = [
  { id: 'no',             label: 'NO',         width: '44px', field: 'no' },
  { id: 'part',           label: '파트',       width: '72px', field: 'part' },
  { id: 'bigarea',        label: '구분',       width: '74px', field: 'location' },
  { id: 'location',       label: '장소',       width: '90px', field: 'location' },
  { id: 'purpose',        label: '사용 목적',  width: '90px', field: 'purpose' },
  { id: 'category',       label: '품목',       width: '84px', field: 'category' },
  { id: 'language',       label: '언어',       width: '68px', field: 'language' },
  { id: 'size',           label: '규격(mm)',   width: '86px', field: 'size' },
  { id: 'material',       label: '재질',       width: '70px', field: 'material' },
  { id: 'quantity',       label: '수량',       width: '44px', field: 'quantity' },
  { id: 'content',        label: '내용',       width: '1.5fr', field: 'content_text' },
  { id: 'note',           label: '비고',       width: '76px', field: null },
  { id: 'editor',         label: '담당자',     width: '88px', field: null },
  { id: 'design_vendor',  label: '디자인업체', width: '96px', field: 'design_vendor' },
  { id: 'print_vendor',   label: '출력업체',   width: '96px', field: 'print_vendor' },
  { id: 'install_time',   label: '설치시간',   width: '96px', field: 'install_time' },
  { id: 'uninstall_time', label: '철거시간',   width: '96px', field: 'uninstall_time' },
]

// v8: 4개 컬럼은 편집 초기 숨김 (1차안 17컬럼 복원의 어지러움 방지 — §14-2)
const DEFAULT_HIDDEN_COLS: ColumnId[] = ['design_vendor', 'print_vendor', 'install_time', 'uninstall_time']
// v9: PPT 기본 제외 3개 (§14-3 기본값 — 담당자·디자인업체·출력업체)
const DEFAULT_PPT_EXCLUDED: ColumnId[] = ['editor', 'design_vendor', 'print_vendor']

const COLS_STORAGE_KEY = 'mice_editor_grid_cols_v9'

interface SavedColState {
  order: ColumnId[]
  hidden: ColumnId[]
  excludedFromExcel: ColumnId[]   // §14-3 include_in_excel=false
  excludedFromPpt: ColumnId[]     // §14-3 include_in_ppt=false
  customCols: ColumnDef[]
  customValues: Record<string, Record<string, string>>
}

function loadColState(): SavedColState {
  // v9: 17컬럼 + 4개 기본 숨김 + PPT 기본 제외 3개
  const defaultState: SavedColState = {
    order: DEFAULT_COLS.map(c => c.id),
    hidden: [...DEFAULT_HIDDEN_COLS],
    excludedFromExcel: [],
    excludedFromPpt: [...DEFAULT_PPT_EXCLUDED],
    customCols: [],
    customValues: {},
  }
  if (typeof window === 'undefined') return defaultState
  try {
    let raw = localStorage.getItem(COLS_STORAGE_KEY)
    // v8 → v9 1회성 마이그레이션 (기존 order·hidden·customCols 그대로 가져옴)
    if (!raw) {
      const legacy = localStorage.getItem('mice_editor_grid_cols_v8')
      if (legacy) {
        try {
          const parsedV8 = JSON.parse(legacy) as Partial<SavedColState>
          const migrated: SavedColState = {
            order: parsedV8.order ?? defaultState.order,
            hidden: parsedV8.hidden ?? defaultState.hidden,
            excludedFromExcel: [],
            excludedFromPpt: [...DEFAULT_PPT_EXCLUDED],
            customCols: parsedV8.customCols ?? [],
            customValues: parsedV8.customValues ?? {},
          }
          localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(migrated))
          raw = JSON.stringify(migrated)
        } catch { /* parse 실패 시 기본값으로 */ }
      }
    }
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as Partial<SavedColState>
    return {
      order: parsed.order ?? defaultState.order,
      hidden: parsed.hidden ?? defaultState.hidden,
      excludedFromExcel: parsed.excludedFromExcel ?? defaultState.excludedFromExcel,
      excludedFromPpt: parsed.excludedFromPpt ?? defaultState.excludedFromPpt,
      customCols: parsed.customCols ?? [],
      customValues: parsed.customValues ?? {},
    }
  } catch {
    return defaultState
  }
}

function persistColState(state: SavedColState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(state))
}

const BASE_CELL = 'px-2 py-1.5 border-r border-slate-200/40 last:border-r-0 overflow-hidden whitespace-nowrap'

export function EditorGrid({ items, allContents, selectedItemId, onSelectItem, onUpdateItem, onAddItem, onDeleteItem, onReorderItems, isLoading, facilityIssueMap, facilityCheckMode = 'verbose' }: Props) {
  const showFacilityIcon = facilityCheckMode !== 'off' && facilityIssueMap && Object.keys(facilityIssueMap).length > 0
  const [editCell, setEditCell] = useState<EditCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [colState, setColState] = useState<SavedColState>(() => ({ order: DEFAULT_COLS.map(c => c.id), hidden: [], excludedFromExcel: [], excludedFromPpt: [], customCols: [], customValues: {} }))
  const [contextMenu, setContextMenu] = useState<{ colId: ColumnId; x: number; y: number } | null>(null)
  const [showColMenu, setShowColMenu] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [draggedColId, setDraggedColId] = useState<ColumnId | null>(null)
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<ColumnId | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)
  const [newColLabel, setNewColLabel] = useState('')

  useEffect(() => { setColState(loadColState()) }, [])

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus()
  }, [editCell])

  const startEdit = (itemId: string, field: EditableField | string, current: string) => {
    setEditCell({ itemId, field })
    setEditValue(current)
  }

  const commitEdit = () => {
    if (!editCell) return
    const { itemId, field } = editCell
    const isCustom = colState.customCols.some(c => c.id === field)
    if (isCustom) {
      const next: SavedColState = {
        ...colState,
        customValues: { ...colState.customValues, [itemId]: { ...(colState.customValues[itemId] ?? {}), [field]: editValue } },
      }
      setColState(next); persistColState(next); setEditCell(null); return
    }
    if (field === 'quantity') {
      onUpdateItem(itemId, { quantity: parseInt(editValue, 10) || 1 })
    } else if (field === 'size') {
      const m = editValue.match(/(\d+)\s*[x×*×]\s*(\d+)/i)
      if (m) onUpdateItem(itemId, { width_mm: parseInt(m[1]), height_mm: parseInt(m[2]) })
    } else {
      onUpdateItem(itemId, { [field]: editValue } as Partial<DesignItem>)
    }
    setEditCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditCell(null)
  }

  // ── 컬럼 관리 ─────────────────────────────────────────────
  const allCols = [...DEFAULT_COLS, ...colState.customCols]
  const visibleCols = colState.order
    .map(id => allCols.find(c => c.id === id))
    .filter((c): c is ColumnDef => !!c && !colState.hidden.includes(c.id))

  const toggleHidden = (colId: ColumnId) => {
    const next = colState.hidden.includes(colId)
      ? { ...colState, hidden: colState.hidden.filter(id => id !== colId) }
      : { ...colState, hidden: [...colState.hidden, colId] }
    setColState(next); persistColState(next)
  }

  const toggleExcelExclude = (colId: ColumnId) => {
    const next = colState.excludedFromExcel.includes(colId)
      ? { ...colState, excludedFromExcel: colState.excludedFromExcel.filter(id => id !== colId) }
      : { ...colState, excludedFromExcel: [...colState.excludedFromExcel, colId] }
    setColState(next); persistColState(next)
  }

  const togglePptExclude = (colId: ColumnId) => {
    const next = colState.excludedFromPpt.includes(colId)
      ? { ...colState, excludedFromPpt: colState.excludedFromPpt.filter(id => id !== colId) }
      : { ...colState, excludedFromPpt: [...colState.excludedFromPpt, colId] }
    setColState(next); persistColState(next)
  }

  useEffect(() => {
    if (!contextMenu) return
    const onClick = () => setContextMenu(null)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [contextMenu])

  const removeColumn = (colId: ColumnId) => {
    // 표준 컬럼 / 커스텀 컬럼 모두 order에서 제거 (= 진짜 삭제). 4개 배열 모두 정리.
    const next: SavedColState = {
      ...colState,
      customCols: colState.customCols.filter(c => c.id !== colId),
      order: colState.order.filter(id => id !== colId),
      hidden: colState.hidden.filter(id => id !== colId),
      excludedFromExcel: colState.excludedFromExcel.filter(id => id !== colId),
      excludedFromPpt: colState.excludedFromPpt.filter(id => id !== colId),
    }
    setColState(next); persistColState(next)
  }

  const addCustomCol = () => {
    const label = newColLabel.trim()
    if (!label) return
    const id = `custom_${Date.now()}`
    const newCol: ColumnDef = { id, label, width: '120px', field: id, custom: true }
    const next: SavedColState = { ...colState, customCols: [...colState.customCols, newCol], order: [...colState.order, id] }
    setColState(next); persistColState(next)
    setNewColLabel('')
  }

  const resetCols = () => {
    const next: SavedColState = {
      order: DEFAULT_COLS.map(c => c.id),
      hidden: [...DEFAULT_HIDDEN_COLS],
      excludedFromExcel: [],
      excludedFromPpt: [...DEFAULT_PPT_EXCLUDED],
      customCols: [],
      customValues: colState.customValues,
    }
    setColState(next); persistColState(next)
  }

  // ── 컬럼 드래그 ──
  const handleColDragStart = (e: React.DragEvent, colId: ColumnId) => {
    setDraggedColId(colId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/col', colId)
  }
  const handleColDragOver = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (colId !== dragOverColId) setDragOverColId(colId)
  }
  const handleColDragLeave = () => setDragOverColId(null)
  const handleColDrop = (e: React.DragEvent, targetColId: ColumnId) => {
    e.preventDefault()
    const fromId = draggedColId ?? e.dataTransfer.getData('text/col')
    if (!fromId || fromId === targetColId) { setDraggedColId(null); setDragOverColId(null); return }
    const order = [...colState.order]
    const fromIdx = order.indexOf(fromId)
    const toIdx = order.indexOf(targetColId)
    if (fromIdx === -1 || toIdx === -1) { setDraggedColId(null); setDragOverColId(null); return }
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, fromId)
    const next = { ...colState, order }
    setColState(next); persistColState(next)
    setDraggedColId(null); setDragOverColId(null)
  }

  // ── 행 드래그 ──
  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/row', rowId)
  }
  const handleRowDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (rowId !== dragOverRowId) setDragOverRowId(rowId)
  }
  const handleRowDragLeave = () => setDragOverRowId(null)
  const handleRowDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault()
    const fromId = draggedRowId ?? e.dataTransfer.getData('text/row')
    if (!fromId || fromId === targetRowId || !onReorderItems) { setDraggedRowId(null); setDragOverRowId(null); return }
    const next = [...items]
    const fromIdx = next.findIndex(i => i.id === fromId)
    const toIdx = next.findIndex(i => i.id === targetRowId)
    if (fromIdx === -1 || toIdx === -1) { setDraggedRowId(null); setDragOverRowId(null); return }
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onReorderItems(next)
    setDraggedRowId(null); setDragOverRowId(null)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <span className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          데이터 로드 중...
        </div>
      </div>
    )
  }

  // 행 좌측 핸들 컬럼 + 우측 삭제 버튼 컬럼 추가
  const gridCols = `28px ${visibleCols.map(c => c.width).join(' ')} 36px`

  // ── 셀 렌더 ──
  const renderCell = (col: ColumnDef, item: DesignItem, contents: ContentsMap) => {
    const isEditing = editCell?.itemId === item.id && editCell?.field === col.id

    if (col.custom) {
      const val = colState.customValues[item.id]?.[col.id] ?? ''
      if (isEditing) {
        return <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown} className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs caret-indigo-300" />
      }
      return <span className={val ? 'text-slate-400' : 'text-slate-400 italic text-[10px]'}>{val || '—'}</span>
    }

    switch (col.id) {
      case 'no':       return renderEditable(item.no ?? '', isEditing)
      case 'part':     return renderEditable(item.part ?? '', isEditing)
      case 'bigarea': {
        // v4.1 단위 4: 같은 카테고리 항목이 2개 이상이면 자동 #N prefix
        if (!item.category) return <span className="text-slate-400 italic text-[10px]">—</span>
        const sameCat = items.filter(it => it.category === item.category)
        const sameIdx = sameCat.findIndex(it => it.id === item.id) + 1
        const showHashtag = sameCat.length >= 2
        return (
          <span className="text-slate-500 text-[11px] truncate" title={`${item.category} — ${sameCat.length}개`}>
            {item.category}{showHashtag && <span className="text-slate-400 ml-0.5">#{sameIdx}</span>}
          </span>
        )
      }
      case 'location': return renderEditable(item.location ?? '', isEditing)
      case 'purpose':  return renderEditable(item.purpose ?? '', isEditing)
      case 'category': return renderEditable(item.category ?? '', isEditing)
      case 'language': {
        const koText = gatherText(contents, 'ko')
        const enText = gatherText(contents, 'en')
        const detectedLang = detectLanguage(koText, enText)
        const langDisplay = item.language || detectedLang || ''
        if (isEditing) {
          return (
            <select autoFocus value={editValue} onChange={(e) => { onUpdateItem(item.id, { language: e.target.value as 'KOR' | 'EN' | 'EN/KOR' }); setEditCell(null) }} onBlur={() => setEditCell(null)} className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs">
              {LANGUAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )
        }
        return (
          <>
            <span className={langDisplay ? 'text-slate-800' : 'text-slate-400 italic text-[10px]'}>{langDisplay || '—'}</span>
            {detectedLang && !item.language && <span className="ml-1 text-indigo-500 text-[9px]">*자동</span>}
          </>
        )
      }
      case 'size': {
        const dims = item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : '—'
        if (isEditing) {
          return <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown} placeholder="600×1800" className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs caret-indigo-300" />
        }
        return <span className={dims !== '—' ? 'text-slate-500' : 'text-slate-400 italic text-[10px]'}>{dims}</span>
      }
      case 'material': return renderEditable(item.material ?? '', isEditing)
      case 'quantity': return renderEditable(String(item.quantity ?? 1), isEditing, 'number')
      case 'content': {
        // v4.1 단위 4: "내용" 컬럼은 같은 종류 X배너끼리 구분하기 위한 자유 텍스트.
        // - 데이터 저장: design_items.purpose 재활용 (마이그레이션 불필요)
        // - prefix: 같은 category 항목이 2개 이상이면 "#N" 자동 표시
        // - placeholder: "예: 등록 안내 배너, 화살표"
        const sameCat = items.filter(it => it.category === item.category)
        const sameIdx = sameCat.findIndex(it => it.id === item.id) + 1
        const showHashtag = sameCat.length >= 2
        const purpose = item.purpose ?? ''
        if (isEditing) {
          return (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              placeholder="예: 등록 안내 배너, 화살표"
              className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs caret-indigo-300 placeholder-indigo-400/60"
            />
          )
        }
        if (!purpose) {
          return (
            <span className="text-slate-400 italic text-[10px] truncate">
              {showHashtag && <span className="text-slate-500 not-italic mr-1">#{sameIdx}</span>}
              예: 등록 안내 배너, 화살표
            </span>
          )
        }
        return (
          <span className="text-slate-400 text-[11px] truncate" title={`${item.category} #${sameIdx} — ${purpose}`}>
            {showHashtag && <span className="text-slate-500 mr-1">#{sameIdx}</span>}
            {purpose}
          </span>
        )
      }
      case 'note': {
        const tags: string[] = []
        const ar = contents['arrow']
        if (ar && (ar.ko || ar.en)) tags.push('화살표')
        const qr = contents['qr_code']
        if (qr && (qr.ko || qr.en || (qr.images && qr.images.length > 0))) tags.push('QR')
        // v8: 시설 가이드 위반 ⚠️ 아이콘 (§11-6 - silent_icon·verbose 모드에서 표시)
        const itemIssues = facilityCheckMode !== 'off' ? facilityIssueMap?.[item.id] : undefined
        const hasWarn = itemIssues?.some(i => i.severity === 'warn')
        return (
          <span className="text-[10px] flex items-center gap-1 flex-wrap">
            {itemIssues && itemIssues.length > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 ${hasWarn ? 'text-red-600' : 'text-amber-600'} font-medium`}
                title={itemIssues.map(i => `[${i.severity}] ${i.message}`).join('\n')}
              >
                <AlertTriangle className="w-3 h-3" />
                시설{hasWarn ? '!' : '?'}
              </span>
            )}
            {tags.length > 0 ? tags.map(t => <span key={t} className="text-amber-700">{t}</span>) : null}
            {(item.revision_count ?? 0) > 0 && (
              <span className={`font-medium ${(item.revision_count ?? 0) >= 3 ? 'text-red-600' : 'text-slate-500'}`} title={`수정 ${item.revision_count}회`}>
                수정{item.revision_count}{(item.revision_count ?? 0) >= 3 && ' ⚠'}
              </span>
            )}
            {(item.revision_count ?? 0) === 0 && tags.length === 0 && !itemIssues?.length && '—'}
          </span>
        )
      }
      case 'editor': {
        const editorShort = item.last_edited_by ? item.last_edited_by.split('@')[0] : ''
        return <span className="text-slate-500 text-[10px] truncate" title={item.last_edited_by ?? ''}>{editorShort || <span className="text-slate-400 italic">미편집</span>}</span>
      }
      // v8 (2026-05-11): 1차안 17컬럼 복원 신규 4컬럼
      case 'design_vendor':  return renderEditable(item.design_vendor ?? '', isEditing)
      case 'print_vendor':   return renderEditable(item.print_vendor ?? '', isEditing)
      case 'install_time':   return renderEditable(item.install_time ?? '', isEditing)
      case 'uninstall_time': return renderEditable(item.uninstall_time ?? '', isEditing)
      default: return null
    }
  }

  const renderEditable = (display: string, isEditing: boolean, type: 'text' | 'number' = 'text') => {
    if (!isEditing) return <span className={display ? 'text-slate-800' : 'text-slate-400 italic text-[10px]'}>{display || '—'}</span>
    return <input ref={inputRef} type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown} className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs caret-indigo-300" />
  }

  return (
    <div className="h-full flex flex-col font-mono text-xs select-none relative">
      {/* 상단 액션바 */}
      <div className="bg-white border-b border-slate-200 px-2 py-1 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setShowColMenu(v => !v)}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition ${showColMenu ? 'bg-indigo-700/40 text-indigo-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Settings2 className="w-3 h-3" />컬럼 관리 <span className="text-slate-400 ml-1">({visibleCols.length}/{allCols.length})</span>
        </button>

        <span className="text-slate-400 text-[9px] ml-auto">
          헤더 드래그: 열 이동 / 좌측 핸들 드래그: 행 이동 / 우측 X: 행 삭제 / 더블클릭: 셀 편집
        </span>
      </div>

      {/* 컬럼 관리 패널 */}
      {showColMenu && (
        <div className="absolute top-9 left-2 z-30 bg-white border border-slate-300 rounded-lg shadow-2xl p-3 w-[460px] space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs font-semibold">컬럼 관리</p>
            <button onClick={() => setShowColMenu(false)} className="text-slate-400 hover:text-slate-500 p-0.5"><X className="w-3 h-3" /></button>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {colState.order.map(colId => {
              const col = allCols.find(c => c.id === colId)
              if (!col) return null
              const isHidden = colState.hidden.includes(col.id)
              return (
                <div key={col.id} className="flex items-center gap-2 bg-slate-50/40 rounded px-2 py-1.5 group">
                  <GripVertical className="w-3 h-3 text-slate-400" />
                  <span className={`text-xs flex-1 ${isHidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {col.label}
                    {col.custom && <span className="ml-1 text-emerald-500 text-[9px]">사용자</span>}
                  </span>
                  <button onClick={() => toggleHidden(col.id)} className="text-slate-500 hover:text-slate-800 p-0.5 rounded transition" title={isHidden ? '표시' : '숨김'}>
                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button onClick={() => { if (window.confirm(`'${col.label}' 컬럼을 삭제할까요?`)) removeColumn(col.id) }}
                          className="text-slate-400 hover:text-red-400 p-0.5 rounded transition" title="컬럼 삭제">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-200 pt-2 space-y-1.5">
            <p className="text-[10px] text-slate-500">사용자 컬럼 추가 (1차: 로컬 저장만)</p>
            <div className="flex gap-1.5">
              <input value={newColLabel} onChange={e => setNewColLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomCol()} placeholder="예: 디자인업체, 출력업체, 설치시간"
                     className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button onClick={addCustomCol} disabled={!newColLabel.trim()} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-[10px] transition">
                <Plus className="w-3 h-3" />추가
              </button>
            </div>
            <button onClick={resetCols} className="w-full text-[10px] text-slate-500 hover:text-slate-400 py-1 rounded transition">초기 상태로 리셋 (표준 13컬럼)</button>
          </div>
        </div>
      )}

      {/* 컬럼 우클릭 컨텍스트 메뉴 (§14-4) */}
      {contextMenu && (() => {
        const cm = contextMenu
        const col = allCols.find(c => c.id === cm.colId)
        if (!col) return null
        const isHidden = colState.hidden.includes(cm.colId)
        const isXExcl = colState.excludedFromExcel.includes(cm.colId)
        const isPExcl = colState.excludedFromPpt.includes(cm.colId)
        return (
          <div
            className="fixed z-50 bg-white border border-slate-300 rounded shadow-lg py-1 text-xs min-w-[180px]"
            style={{ left: cm.x, top: cm.y }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-slate-500 border-b border-slate-200 font-semibold">{col.label}</div>
            <button
              onClick={() => { toggleHidden(cm.colId); setContextMenu(null) }}
              className="block w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
            >
              {isHidden ? '✓ 편집 화면 표시' : '편집 화면에서 숨김'}
            </button>
            <button
              onClick={() => { toggleExcelExclude(cm.colId); setContextMenu(null) }}
              className="block w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
            >
              {isXExcl ? '✓ 엑셀에 포함' : '엑셀에서 제외'}
            </button>
            <button
              onClick={() => { togglePptExclude(cm.colId); setContextMenu(null) }}
              className="block w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
            >
              {isPExcl ? '✓ PPT에 포함' : 'PPT에서 제외'}
            </button>
            <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-200 mt-0.5">
              데이터는 보존됩니다 (소프트 토글)
            </div>
          </div>
        )
      })()}

      {/* 헤더 */}
      <div className="grid bg-white border-b border-slate-300 sticky top-0 z-10 flex-shrink-0" style={{ gridTemplateColumns: gridCols }}>
        <div className="px-2 py-2 text-slate-400 text-[9px] border-r border-slate-200"></div>
        {visibleCols.map(col => {
          const xExcl = colState.excludedFromExcel.includes(col.id)
          const pExcl = colState.excludedFromPpt.includes(col.id)
          return (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={(e) => handleColDragOver(e, col.id)}
              onDragLeave={handleColDragLeave}
              onDrop={(e) => handleColDrop(e, col.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ colId: col.id, x: e.clientX, y: e.clientY })
              }}
              className={`px-2 py-2 text-slate-500 font-semibold text-[10px] border-r border-slate-200 last:border-r-0 whitespace-nowrap overflow-hidden tracking-wide cursor-grab active:cursor-grabbing transition ${draggedColId === col.id ? 'opacity-30' : ''} ${dragOverColId === col.id && draggedColId !== col.id ? 'bg-indigo-700/40 text-indigo-200' : 'hover:bg-slate-50/50'}`}
              title={`${col.label} — 드래그로 순서 변경 / 우클릭으로 출력 옵션`}
            >
              {col.label}
              {col.custom && <span className="ml-1 text-emerald-500/80 text-[8px]">＋</span>}
              {xExcl && <span className="ml-1 text-rose-500 text-[9px]" title="엑셀 제외">⛔X</span>}
              {pExcl && <span className="ml-1 text-amber-500 text-[9px]" title="PPT 제외">⛔P</span>}
            </div>
          )
        })}
        <div className="px-2 py-2 text-slate-400 text-[9px]"></div>
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, rowIdx) => {
          const contents = allContents[item.id] ?? {}
          const isSelected = item.id === selectedItemId
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              onDragOver={(e) => handleRowDragOver(e, item.id)}
              onDragLeave={handleRowDragLeave}
              onDrop={(e) => handleRowDrop(e, item.id)}
              className={`grid border-b border-slate-200/60 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/30' : rowIdx % 2 === 0 ? 'hover:bg-white/40' : 'bg-white/20 hover:bg-white/40'} ${draggedRowId === item.id ? 'opacity-30' : ''} ${dragOverRowId === item.id && draggedRowId !== item.id ? 'border-t-2 border-t-indigo-500' : ''}`}
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* 행 드래그 핸들 */}
              <div
                draggable
                onDragStart={(e) => { e.stopPropagation(); handleRowDragStart(e, item.id) }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-400 hover:bg-slate-50/40 transition"
                title="드래그로 행 순서 변경"
              >
                <GripVertical className="w-3 h-3" />
              </div>

              {/* 셀 */}
              {visibleCols.map(col => {
                const editable = col.field !== null || col.custom
                const currentVal = (() => {
                  if (col.custom) return colState.customValues[item.id]?.[col.id] ?? ''
                  switch (col.id) {
                    case 'no': return item.no ?? ''
                    case 'part': return item.part ?? ''
                    case 'location': return item.location ?? ''
                    case 'purpose': return item.purpose ?? ''      // v8: '사용 목적'으로 환원
                    case 'content': return item.content_text ?? '' // v8: 별도 content_text 필드
                    case 'category': return item.category ?? ''
                    case 'language': return item.language ?? 'KOR'
                    case 'size': return item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : ''
                    case 'material': return item.material ?? ''
                    case 'quantity': return String(item.quantity ?? 1)
                    // v8: 신규 4컬럼
                    case 'design_vendor': return item.design_vendor ?? ''
                    case 'print_vendor': return item.print_vendor ?? ''
                    case 'install_time': return item.install_time ?? ''
                    case 'uninstall_time': return item.uninstall_time ?? ''
                    default: return ''
                  }
                })()
                return (
                  <div key={col.id} className={BASE_CELL} onDoubleClick={editable ? (e) => { e.stopPropagation(); startEdit(item.id, col.field ?? col.id, currentVal) } : undefined}>
                    {renderCell(col, item, contents)}
                  </div>
                )
              })}

              {/* 행 삭제 버튼 */}
              <div className="flex items-center justify-center">
                {onDeleteItem && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id) }}
                    className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition opacity-50 hover:opacity-100"
                    title="행 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm gap-2">
            제작물이 없습니다.
            {onAddItem && (
              <button onClick={() => onAddItem()} className="text-emerald-400 hover:text-emerald-300 underline text-xs">
                첫 행 추가
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-slate-200 bg-white/50 text-slate-400 text-[10px] flex gap-4 flex-shrink-0">
        <span>클릭: 선택</span>
        <span>더블클릭: 셀 편집</span>
        <span>헤더 드래그: 열 이동</span>
        <span>좌측 핸들 드래그: 행 이동</span>
        <span>Enter: 저장 / Esc: 취소</span>
        <span className="ml-auto">{items.length}개 제작물 · {visibleCols.length} 컬럼</span>
      </div>
    </div>
  )
}
