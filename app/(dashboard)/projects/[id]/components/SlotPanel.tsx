'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Layers, RotateCcw, CopyCheck, Pencil, Image as ImageIcon, X, QrCode, Layout, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SLOT_MAX_CHARS } from '@/lib/constants'
import type { ContentsMap, SlotContent } from '@/lib/types'

// ── 레이아웃 템플릿 (localStorage 기반) ───────────────────────────
interface LayoutTemplate {
  id: string
  name: string
  slots: Record<string, { x: number; y: number; w?: number; fontSize: number; color?: string; align?: 'left' | 'center' | 'right' }>
  savedAt: number
}

const TEMPLATES_KEY = 'mice_layout_templates'

function loadTemplates(): LayoutTemplate[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]') } catch { return [] }
}

function persistTemplates(tpls: LayoutTemplate[]) {
  if (typeof window !== 'undefined') localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tpls))
}

// ── 3×3 위치 단축 (PPT '위치 격자') ─────────────────────────────
const POSITION_GRID: { x: number; y: number; label: string }[][] = [
  [{ x: 10, y:  8, label: '좌상' }, { x: 50, y:  8, label: '상중' }, { x: 90, y:  8, label: '우상' }],
  [{ x: 10, y: 50, label: '좌중' }, { x: 50, y: 50, label: '중앙' }, { x: 90, y: 50, label: '우중' }],
  [{ x: 10, y: 88, label: '좌하' }, { x: 50, y: 88, label: '하중' }, { x: 90, y: 88, label: '우하' }],
]

interface Props {
  contents: ContentsMap
  selectedSlotKey: string | null
  selectedItemId?: string
  projectId: string
  onSlotSelect: (key: string) => void
  onSlotAdd: (label: string, position?: { x: number; y: number }) => void
  onSlotDelete: (key: string) => void
  onSlotRename?: (oldKey: string, newLabel: string) => void
  onSlotStyleUpdate: (key: string, patch: Partial<SlotContent>) => void
  onApplyStyleToAll: (key: string) => void
  onInitDefaultSlots: () => void
}

const ALIGN_LABELS: Array<{ v: 'left' | 'center' | 'right'; label: string }> = [
  { v: 'left', label: '왼쪽' },
  { v: 'center', label: '중앙' },
  { v: 'right', label: '오른쪽' },
]
void ALIGN_LABELS


const PRESET_COLORS = [
  'FFFFFF', 'F1F5F9', 'CBD5E1', '475569', '0F172A', '000000',
  'FCA5A5', 'EF4444', 'DC2626', '991B1B',
  'FB923C', 'F97316', 'FDE047', 'F59E0B',
  '6EE7B7', '10B981', '059669',
  '60A5FA', '2563EB', '6366F1', 'A855F7', '7C3AED',
  'EC4899', 'BE185D',
]

export function SlotPanel({
  contents,
  selectedSlotKey,
  selectedItemId,
  projectId,
  onSlotSelect,
  onSlotAdd,
  onSlotDelete,
  onSlotRename,
  onSlotStyleUpdate,
  onApplyStyleToAll,
  onInitDefaultSlots,
}: Props) {
  const [newLabel, setNewLabel] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [applyingAll, setApplyingAll] = useState<string | null>(null)
  const [renamingKey, setRenamingKey] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [qrUrlInput, setQrUrlInput] = useState<string>('')
  const [qrShownFor, setQrShownFor] = useState<string | null>(null)
  const [generatingQr, setGeneratingQr] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<string | null>(null)

  // ── 레이아웃 템플릿 state ────────────────────────────────────
  const [templates, setTemplates] = useState<LayoutTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState('')
  // ── 위치 단축 격자 ────────────────────────────────────────────
  const [showPositionGrid, setShowPositionGrid] = useState(false)

  useEffect(() => { setTemplates(loadTemplates()) }, [])

  const handleSaveTemplate = () => {
    const name = templateNameInput.trim()
    if (!name) return
    const slots: LayoutTemplate['slots'] = {}
    for (const [key, slot] of Object.entries(contents)) {
      slots[key] = { x: slot.x, y: slot.y, w: slot.w, fontSize: slot.fontSize, color: slot.color, align: slot.align }
    }
    const tpl: LayoutTemplate = { id: crypto.randomUUID(), name, slots, savedAt: Date.now() }
    const updated = [...templates, tpl]
    setTemplates(updated)
    persistTemplates(updated)
    setTemplateNameInput('')
  }

  const handleLoadTemplate = (tpl: LayoutTemplate) => {
    for (const [key, s] of Object.entries(tpl.slots)) {
      if (contents[key]) {
        onSlotStyleUpdate(key, { x: s.x, y: s.y, ...(s.w !== undefined ? { w: s.w } : {}), fontSize: s.fontSize, ...(s.color ? { color: s.color } : {}), ...(s.align ? { align: s.align } : {}) })
      }
    }
    setShowTemplates(false)
  }

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    persistTemplates(updated)
  }

  const slotEntries = Object.entries(contents)

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    onSlotAdd(label)
    setNewLabel('')
    setShowAddForm(false)
  }

  const handleApplyAll = async (key: string) => {
    setApplyingAll(key)
    onApplyStyleToAll(key)
    setTimeout(() => setApplyingAll(null), 1500)
  }

  const handleStartRename = (key: string, currentLabel: string) => {
    setRenamingKey(key)
    setRenameValue(currentLabel)
  }

  const handleCommitRename = () => {
    if (renamingKey && renameValue.trim() && onSlotRename) {
      onSlotRename(renamingKey, renameValue.trim())
    }
    setRenamingKey(null)
    setRenameValue('')
  }

  const handleImageUploadClick = (slotKey: string) => {
    uploadTargetRef.current = slotKey
    fileInputRef.current?.click()
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const slotKey = uploadTargetRef.current
    if (!file || !slotKey || !selectedItemId) return

    setUploadingImage(slotKey)
    try {
      const { compressToWebP } = await import('@/lib/services/imageUtils')
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const blob = await compressToWebP(file)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const path = buildStoragePath('slot-image', {
        userId: user.id,
        projectId: projectId,
        itemId: selectedItemId,
        slotKey,
      })
      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
      if (uploadError) {
        alert(explainStorageError(uploadError.message || ''))
        throw uploadError
      }
      const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)

      const slot = contents[slotKey]
      if (slot) {
        const images = [...(slot.images ?? []), publicUrl]
        onSlotStyleUpdate(slotKey, { images })
      }
    } catch (err) {
      console.error('slot image upload failed', err)
    } finally {
      setUploadingImage(null)
      uploadTargetRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveSlotImage = (slotKey: string, idx: number) => {
    const slot = contents[slotKey]
    if (!slot) return
    const images = (slot.images ?? []).filter((_, i) => i !== idx)
    onSlotStyleUpdate(slotKey, { images })
  }

  // QR 코드 자동 생성 — URL 입력 → QR 이미지 → Storage 업로드 → 슬롯 images에 추가
  const handleGenerateQr = async (slotKey: string) => {
    const url = qrUrlInput.trim()
    if (!url || !selectedItemId) return

    setGeneratingQr(true)
    try {
      const { generateQrDataUrl, dataUrlToBlob } = await import('@/lib/services/qrService')
      const dataUrl = await generateQrDataUrl(url, 400)
      const blob = dataUrlToBlob(dataUrl)

      const supabase = createClient()
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const path = buildStoragePath('qr', {
        userId: user.id,
        projectId: projectId,
        itemId: selectedItemId,
        slotKey,
      })
      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: 'image/png', upsert: true })
      if (uploadError) {
        alert(explainStorageError(uploadError.message || ''))
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)

      const slot = contents[slotKey]
      if (slot) {
        const images = [...(slot.images ?? []), publicUrl]
        onSlotStyleUpdate(slotKey, { images })
      }
      setQrUrlInput('')
      setQrShownFor(null)
    } catch (err) {
      console.error('QR 생성 실패', err)
    } finally {
      setGeneratingQr(false)
    }
  }

  return (
    <aside className="w-[260px] flex-shrink-0 border-l border-slate-200 flex flex-col bg-white/40">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-slate-500 text-[11px] font-semibold">구역 설정</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTemplates(v => !v)}
            title="레이아웃 템플릿"
            className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition ${showTemplates ? 'bg-violet-800/50 text-violet-300' : 'text-slate-500 hover:text-violet-400 hover:bg-violet-900/20'}`}
          >
            <Layout className="w-3 h-3" />
            <span className="hidden sm:inline">템플릿</span>
          </button>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[10px] px-2 py-0.5 rounded hover:bg-indigo-900/30 transition"
          >
            <Plus className="w-3 h-3" />
            추가
          </button>
        </div>
      </div>

      {/* 레이아웃 템플릿 패널 */}
      {showTemplates && (
        <div className="border-b border-slate-200 bg-violet-950/20 px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-violet-300 text-[11px] font-semibold flex items-center gap-1">
              <Layout className="w-3 h-3" /> 레이아웃 템플릿
            </p>
            <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-slate-500 p-0.5 rounded transition"><X className="w-3 h-3" /></button>
          </div>

          {/* 저장된 템플릿 목록 */}
          {templates.length === 0 ? (
            <p className="text-slate-400 text-[10px] italic">저장된 템플릿 없음</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-1.5 group">
                  <button
                    onClick={() => handleLoadTemplate(tpl)}
                    className="flex-1 text-left text-[10px] text-slate-800 bg-slate-50/60 hover:bg-violet-900/30 px-2 py-1 rounded transition truncate"
                    title={`적용: ${tpl.name}`}
                  >
                    {tpl.name}
                    <span className="ml-1 text-slate-400">{Object.keys(tpl.slots).length}구역</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition p-0.5 rounded flex-shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 현재 레이아웃 저장 */}
          <div className="flex gap-1.5 pt-1 border-t border-slate-200/60">
            <input
              value={templateNameInput}
              onChange={e => setTemplateNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="템플릿 이름 (예: 컨퍼런스 기본)"
              className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!templateNameInput.trim() || Object.keys(contents).length === 0}
              className="flex items-center gap-0.5 px-2 py-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded text-[10px] transition flex-shrink-0"
              title="현재 구역 레이아웃 저장"
            >
              <Save className="w-3 h-3" />
              저장
            </button>
          </div>
          <p className="text-slate-400 text-[9px]">구역 위치·크기·서식만 저장 (텍스트 제외)</p>
        </div>
      )}

      {/* 구역 추가 폼 */}
      {showAddForm && (
        <div className="px-3 py-2.5 border-b border-slate-200 bg-white/60">
          <p className="text-[10px] text-slate-500 mb-1.5">새 구역 이름</p>
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setShowAddForm(false); setNewLabel('') }
              }}
              placeholder="예: 일시, QR코드"
              className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-[11px] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-[10px] transition"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 슬롯 목록 */}
      <div className="flex-1 overflow-y-auto py-1">
        {slotEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3 text-center gap-2">
            <p className="text-slate-400 text-xs">구역이 없습니다</p>
            <button
              onClick={onInitDefaultSlots}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px] px-2 py-1 rounded hover:bg-indigo-900/30 transition"
            >
              <RotateCcw className="w-3 h-3" />
              기본 구역 적용
            </button>
          </div>
        ) : (
          <>
            {slotEntries.map(([key, slot]) => {
              const isSelected = selectedSlotKey === key
              const isRenaming = renamingKey === key
              return (
                <div
                  key={key}
                  onClick={() => onSlotSelect(key)}
                  className={`group px-3 py-2 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600/15 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-50/40 border-l-2 border-transparent'
                  }`}
                >
                  {/* 구역명 + 편집 + 삭제 */}
                  <div className="flex items-center justify-between mb-1.5 gap-1">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={handleCommitRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCommitRename()
                          if (e.key === 'Escape') { setRenamingKey(null); setRenameValue('') }
                        }}
                        className="flex-1 bg-slate-50 border border-indigo-500 rounded px-1.5 py-0.5 text-slate-800 text-[11px] focus:outline-none"
                      />
                    ) : (
                      <span className={`text-[11px] font-medium truncate flex-1 ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}>
                        {slot.label || key}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      {!isRenaming && onSlotRename && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleStartRename(key, slot.label || key)
                          }}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-400 transition"
                          title="이름 수정"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onSlotDelete(key)
                        }}
                        className="p-0.5 rounded hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition"
                        title="구역 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 선택된 슬롯만 상세 편집 UI 표시 */}
                  {isSelected && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-200/60">
                      {/* 폰트 크기 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12 flex-shrink-0">크기</span>
                        <input
                          type="number"
                          min={6}
                          max={120}
                          value={slot.fontSize ?? 16}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v > 0) onSlotStyleUpdate(key, { fontSize: v })
                          }}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">pt</span>
                      </div>

                      {/* 위치 X/Y + 단축 격자 */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 w-12 flex-shrink-0">위치</span>
                          <div className="flex items-center gap-1 flex-1">
                            <div className="flex items-center gap-0.5 flex-1">
                              <span className="text-[9px] text-slate-400">X</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(slot.x ?? 50)}
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  const v = parseInt(e.target.value)
                                  if (!isNaN(v)) onSlotStyleUpdate(key, { x: Math.min(100, Math.max(0, v)) })
                                }}
                                className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] text-slate-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 w-10"
                              />
                            </div>
                            <div className="flex items-center gap-0.5 flex-1">
                              <span className="text-[9px] text-slate-400">Y</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(slot.y ?? 50)}
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  const v = parseInt(e.target.value)
                                  if (!isNaN(v)) onSlotStyleUpdate(key, { y: Math.min(100, Math.max(0, v)) })
                                }}
                                className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] text-slate-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 w-10"
                              />
                            </div>
                            <span className="text-[9px] text-slate-400">%</span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setShowPositionGrid(v => !v) }}
                            title="빠른 위치 선택"
                            className={`p-0.5 rounded transition text-[9px] flex-shrink-0 ${showPositionGrid ? 'bg-indigo-800/50 text-indigo-300' : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20'}`}
                          >
                            {showPositionGrid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* 3×3 위치 격자 */}
                        {showPositionGrid && (
                          <div className="ml-14 p-1.5 bg-slate-100/60 rounded border border-slate-200 inline-block">
                            <div className="grid grid-cols-3 gap-0.5">
                              {POSITION_GRID.map((row, ri) =>
                                row.map((cell, ci) => {
                                  const isCurrent = Math.abs(Math.round(slot.x ?? 50) - cell.x) < 5 && Math.abs(Math.round(slot.y ?? 50) - cell.y) < 5
                                  return (
                                    <button
                                      key={`${ri}-${ci}`}
                                      onClick={e => {
                                        e.stopPropagation()
                                        onSlotStyleUpdate(key, { x: cell.x, y: cell.y })
                                        setShowPositionGrid(false)
                                      }}
                                      title={cell.label}
                                      className={`w-8 h-8 rounded flex items-center justify-center transition ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-300'}`}
                                    >
                                      <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-slate-400'}`} />
                                    </button>
                                  )
                                })
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 text-center mt-1">클릭 → 위치 snap</p>
                          </div>
                        )}

                        {/* 너비(W%) */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 w-12 flex-shrink-0">너비</span>
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="number"
                              min={10}
                              max={100}
                              value={Math.round(slot.w ?? 80)}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                const v = parseInt(e.target.value)
                                if (!isNaN(v)) onSlotStyleUpdate(key, { w: Math.min(100, Math.max(10, v)) })
                              }}
                              className="bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[10px] text-slate-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 w-14"
                            />
                            <span className="text-[9px] text-slate-400">% 너비</span>
                          </div>
                        </div>
                      </div>

                      {/* 텍스트 색상 */}
                      <div className="pt-1.5 border-t border-slate-200/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">텍스트 색상</span>
                          <input
                            type="color"
                            value={`#${slot.color ?? 'FFFFFF'}`}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const hex = e.target.value.replace('#', '').toUpperCase()
                              onSlotStyleUpdate(key, { color: hex })
                            }}
                            className="w-6 h-6 rounded border border-slate-300 cursor-pointer bg-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-12 gap-0.5">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={e => { e.stopPropagation(); onSlotStyleUpdate(key, { color: c }) }}
                              className="w-full aspect-square rounded border border-slate-300/50 hover:ring-1 hover:ring-indigo-400 transition"
                              style={{ backgroundColor: `#${c}` }}
                              title={`#${c}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 플레이스홀더 (마스터가 "여기에 본문 입력" 안내 힌트) */}
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">안내 힌트 (비어있을 때 표시)</label>
                        <input
                          value={slot.placeholder ?? ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => onSlotStyleUpdate(key, { placeholder: e.target.value })}
                          placeholder="예: 여기에 본문 입력"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 정렬 */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 w-12">정렬</span>
                        <div className="flex gap-0.5 flex-1">
                          {(['left', 'center', 'right'] as const).map(a => (
                            <button
                              key={a}
                              onClick={e => { e.stopPropagation(); onSlotStyleUpdate(key, { align: a }) }}
                              className={`flex-1 text-[10px] py-0.5 rounded transition ${
                                (slot.align ?? 'center') === a
                                  ? 'bg-indigo-600/30 text-indigo-200'
                                  : 'bg-slate-50 text-slate-500 hover:text-slate-400'
                              }`}
                            >
                              {a === 'left' ? '좌' : a === 'center' ? '중' : '우'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 이미지 업로드 + QR 생성 */}
                      <div className="pt-1.5 border-t border-slate-200/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">이미지</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setQrShownFor(qrShownFor === key ? null : key)
                              }}
                              className="flex items-center gap-0.5 text-[9px] text-emerald-400 hover:text-emerald-300 px-1 py-0.5 rounded hover:bg-emerald-900/30 transition"
                              title="URL로 QR 코드 생성"
                            >
                              <QrCode className="w-2.5 h-2.5" />
                              QR
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleImageUploadClick(key)
                              }}
                              disabled={uploadingImage === key || !selectedItemId}
                              className="flex items-center gap-0.5 text-[9px] text-indigo-400 hover:text-indigo-300 px-1 py-0.5 rounded hover:bg-indigo-900/30 transition disabled:opacity-40"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              {uploadingImage === key ? '업로드 중...' : '추가'}
                            </button>
                          </div>
                        </div>

                        {/* QR URL 입력 폼 */}
                        {qrShownFor === key && (
                          <div className="mb-2 p-1.5 bg-slate-100/60 rounded border border-slate-200">
                            <input
                              autoFocus
                              value={qrUrlInput}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setQrUrlInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.stopPropagation(); handleGenerateQr(key) }
                                if (e.key === 'Escape') { setQrShownFor(null); setQrUrlInput('') }
                              }}
                              placeholder="https://... URL 입력"
                              className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
                            />
                            <button
                              onClick={e => { e.stopPropagation(); handleGenerateQr(key) }}
                              disabled={!qrUrlInput.trim() || generatingQr}
                              className="w-full text-[10px] bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white py-1 rounded transition"
                            >
                              {generatingQr ? 'QR 생성 중...' : 'QR 생성 + 추가'}
                            </button>
                          </div>
                        )}
                        {slot.images && slot.images.length > 0 && (
                          <div className="grid grid-cols-3 gap-1">
                            {slot.images.map((url, idx) => (
                              <div key={idx} className="relative group/img aspect-square">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-contain bg-slate-50 rounded border border-slate-300" />
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleRemoveSlotImage(key, idx)
                                  }}
                                  className="absolute top-0 right-0 bg-red-600/80 hover:bg-red-500 text-white rounded-bl p-0.5 opacity-0 group-hover/img:opacity-100 transition"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 전체 적용 */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleApplyAll(key)
                        }}
                        className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 py-1 rounded hover:bg-emerald-900/20 transition"
                      >
                        <CopyCheck className="w-3 h-3" />
                        {applyingAll === key ? '적용됨 ✓' : '전체 제작물에 적용'}
                      </button>
                    </div>
                  )}

                  {/* 축약 정보 (미선택 슬롯) */}
                  {!isSelected && (() => {
                    const maxChars = SLOT_MAX_CHARS[key]
                    const totalChars = (slot.ko?.length ?? 0) + (slot.en?.length ?? 0)
                    const overflow = maxChars && totalChars > maxChars
                    return (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{slot.fontSize}pt</span>
                        <span>·</span>
                        <span>{Math.round(slot.x)},{Math.round(slot.y)}</span>
                        {maxChars && (
                          <span className={overflow ? 'text-red-400 font-medium' : 'text-slate-400'}>
                            · {totalChars}/{maxChars}자
                          </span>
                        )}
                        {slot.images && slot.images.length > 0 && (
                          <span className="ml-auto flex items-center gap-0.5 text-indigo-500">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {slot.images.length}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}

            {/* 기본 구역 초기화 */}
            <div className="px-3 py-2 border-t border-slate-200 mt-1">
              <button
                onClick={onInitDefaultSlots}
                className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-400 text-[11px] py-1.5 rounded hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3 h-3" />
                기본 구역으로 초기화
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
