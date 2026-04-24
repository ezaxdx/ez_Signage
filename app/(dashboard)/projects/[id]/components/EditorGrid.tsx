'use client'

import { useState, useRef, useEffect } from 'react'
import type { DesignItem, ContentsMap } from '@/lib/types'

const DEFAULT_SLOT_ORDER = ['header_brand', 'hero_title', 'sub_title', 'body', 'arrow', 'qr_code', 'footer_credits']

function gatherText(contents: ContentsMap, field: 'ko' | 'en'): string {
  const allKeys = Object.keys(contents)
  const orderedKeys = [
    ...DEFAULT_SLOT_ORDER.filter(k => allKeys.includes(k)),
    ...allKeys.filter(k => !DEFAULT_SLOT_ORDER.includes(k)),
  ]
  return orderedKeys.map(key => contents[key]?.[field] ?? '').filter(Boolean).join(' / ')
}

/** 텍스트에서 언어 자동 감지 — ko/en 양쪽 모두 검사 */
function detectLanguage(ko: string, en: string): 'KOR' | 'EN' | 'EN/KOR' | null {
  const all = ko + en
  const hasKo = /[가-힣]/.test(all)
  const hasEn = /[a-zA-Z]/.test(all)
  if (hasKo && hasEn) return 'EN/KOR'
  if (hasKo) return 'KOR'
  if (hasEn) return 'EN'
  return null
}

type EditableField = 'no' | 'part' | 'location' | 'purpose' | 'language' | 'quantity' | 'material' | 'category'
interface EditCell { itemId: string; field: EditableField }

interface Props {
  items: DesignItem[]
  allContents: Record<string, ContentsMap>
  selectedItemId: string
  onSelectItem: (id: string) => void
  onUpdateItem: (id: string, patch: Partial<DesignItem>) => void
  isLoading: boolean
}

const LANGUAGE_OPTIONS = ['KOR', 'EN', 'EN/KOR'] as const

// 명세 10-2 엑셀 17컬럼 + 편집창 일치
// NO. | 파트 | 구분 | 장소 | 사용목적 | 품목 | 언어 | 규격(mm) | 재질 | 수량 | 국문내용 | 영문내용 | 비고 | 담당자
const COLS: { label: string; width: string; field: EditableField | null; hint?: string }[] = [
  { label: 'NO',       width: '44px', field: 'no' },
  { label: '파트',     width: '72px', field: 'part' },
  { label: '구분',     width: '74px', field: 'location' },  // 구분 = 장소의 큰 느낌
  { label: '장소',     width: '90px', field: 'location' },
  { label: '사용목적', width: '90px', field: 'purpose' },
  { label: '품목',     width: '84px', field: 'category' },
  { label: '언어',     width: '68px', field: 'language' },
  { label: '규격(mm)', width: '86px', field: null },
  { label: '재질',     width: '70px', field: 'material' },
  { label: '수량',     width: '44px', field: 'quantity' },
  { label: '국문내용', width: '1fr',  field: null },
  { label: '영문내용', width: '1fr',  field: null },
  { label: '비고',     width: '76px', field: null },
  { label: '담당자',   width: '88px', field: null },
]

const BASE_CELL = 'px-2 py-1.5 border-r border-slate-800/40 last:border-r-0 overflow-hidden whitespace-nowrap'

export function EditorGrid({ items, allContents, selectedItemId, onSelectItem, onUpdateItem, isLoading }: Props) {
  const [editCell, setEditCell] = useState<EditCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus()
  }, [editCell])

  const startEdit = (itemId: string, field: EditableField, current: string) => {
    setEditCell({ itemId, field })
    setEditValue(current)
  }

  const commitEdit = () => {
    if (!editCell) return
    const { itemId, field } = editCell
    if (field === 'quantity') {
      onUpdateItem(itemId, { quantity: parseInt(editValue, 10) || 1 })
    } else {
      onUpdateItem(itemId, { [field]: editValue } as Partial<DesignItem>)
    }
    setEditCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditCell(null)
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

  const gridCols = COLS.map(c => c.width).join(' ')

  return (
    <div className="h-full flex flex-col font-mono text-xs select-none">
      {/* 헤더 */}
      <div className="grid bg-slate-900 border-b border-slate-700 sticky top-0 z-10 flex-shrink-0" style={{ gridTemplateColumns: gridCols }}>
        {COLS.map(col => (
          <div key={col.label} className="px-2 py-2 text-slate-400 font-semibold text-[10px] border-r border-slate-800 last:border-r-0 whitespace-nowrap overflow-hidden tracking-wide">
            {col.label}
          </div>
        ))}
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, rowIdx) => {
          const contents = allContents[item.id] ?? {}
          const isSelected = item.id === selectedItemId
          const dims = item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : '—'
          const koText = gatherText(contents, 'ko')
          const enText = gatherText(contents, 'en')

          // 언어 자동 감지 표시
          const detectedLang = detectLanguage(koText, enText)
          const langDisplay = item.language || detectedLang || ''

          const isEditing = (field: EditableField) => editCell?.itemId === item.id && editCell?.field === field

          const cellContent = (field: EditableField, display: string) => {
            if (!isEditing(field)) {
              return <span className={display ? 'text-slate-200' : 'text-slate-700 italic text-[10px]'}>{display || '—'}</span>
            }
            if (field === 'language') {
              return (
                <select autoFocus value={editValue} onChange={(e) => { onUpdateItem(item.id, { language: e.target.value as 'KOR' | 'EN' | 'EN/KOR' }); setEditCell(null) }} onBlur={() => setEditCell(null)} className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs">
                  {LANGUAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )
            }
            return (
              <input ref={inputRef} type={field === 'quantity' ? 'number' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown} className="w-full bg-indigo-900/80 border border-indigo-400 rounded px-1 text-indigo-100 outline-none text-xs caret-indigo-300" />
            )
          }

          // 편집자 이름 단축 (이메일 @ 앞부분)
          const editorShort = item.last_edited_by
            ? item.last_edited_by.split('@')[0]
            : ''

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`grid border-b border-slate-800/60 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/30' : rowIdx % 2 === 0 ? 'hover:bg-slate-900/40' : 'bg-slate-900/20 hover:bg-slate-900/40'}`}
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'no', item.no ?? '') }}>
                {cellContent('no', item.no ?? '')}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'part', item.part ?? '') }}>
                {cellContent('part', item.part ?? '')}
              </div>
              {/* 구분 = 장소의 큰 느낌 (장소와 동일값 표시) */}
              <div className={`${BASE_CELL} text-slate-500 text-[11px] truncate`}>
                {item.location || '—'}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'location', item.location ?? '') }}>
                {cellContent('location', item.location ?? '')}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'purpose', item.purpose ?? '') }}>
                {cellContent('purpose', item.purpose ?? '')}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'category', item.category ?? '') }}>
                {cellContent('category', item.category ?? '')}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'language', item.language ?? 'KOR') }}>
                <span className={langDisplay ? 'text-slate-200' : 'text-slate-700 italic text-[10px]'}>
                  {langDisplay || '—'}
                </span>
                {detectedLang && !item.language && (
                  <span className="ml-1 text-indigo-500 text-[9px]">*자동</span>
                )}
              </div>
              <div className={`${BASE_CELL} text-slate-500`}>{dims}</div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'material', item.material ?? '') }}>
                {cellContent('material', item.material ?? '')}
              </div>
              <div className={BASE_CELL} onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.id, 'quantity', String(item.quantity ?? 1)) }}>
                {cellContent('quantity', String(item.quantity ?? 1))}
              </div>
              <div className={`${BASE_CELL} text-slate-400 text-[11px]`}>{koText || '—'}</div>
              <div className={`${BASE_CELL} text-slate-400 text-[11px]`}>{enText || '—'}</div>
              <div className={`${BASE_CELL} text-amber-400/80 text-[10px]`}>
                {(() => {
                  const tags: string[] = []
                  const ar = contents['arrow']
                  if (ar && (ar.ko || ar.en)) tags.push('화살표')
                  const qr = contents['qr_code']
                  if (qr && (qr.ko || qr.en || (qr.images && qr.images.length > 0))) tags.push('QR')
                  return tags.length > 0 ? tags.join('·') : '—'
                })()}
              </div>
              <div className={`${BASE_CELL} text-slate-500 text-[10px] truncate`} title={item.last_edited_by ?? ''}>
                {editorShort || <span className="text-slate-700 italic">미편집</span>}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
            왼쪽 사이드바에서 제작물을 추가하세요
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/50 text-slate-600 text-[10px] flex gap-4 flex-shrink-0">
        <span>클릭: 선택</span>
        <span>더블클릭: 셀 편집</span>
        <span>Enter: 저장 / Esc: 취소</span>
        <span className="ml-auto">{items.length}개 제작물</span>
      </div>
    </div>
  )
}
