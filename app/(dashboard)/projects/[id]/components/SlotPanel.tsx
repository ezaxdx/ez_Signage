'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Layers, RotateCcw, CopyCheck, Pencil, Image as ImageIcon, X, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SLOT_MAX_CHARS } from '@/lib/constants'
import type { ContentsMap, SlotContent } from '@/lib/types'

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
    <aside className="w-[260px] flex-shrink-0 border-l border-slate-800 flex flex-col bg-slate-900/40">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-slate-400 text-[11px] font-semibold">구역 설정</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[10px] px-2 py-0.5 rounded hover:bg-indigo-900/30 transition"
        >
          <Plus className="w-3 h-3" />
          추가
        </button>
      </div>

      {/* 구역 추가 폼 */}
      {showAddForm && (
        <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-900/60">
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
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            <p className="text-slate-600 text-xs">구역이 없습니다</p>
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
                      : 'hover:bg-slate-800/40 border-l-2 border-transparent'
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
                        className="flex-1 bg-slate-800 border border-indigo-500 rounded px-1.5 py-0.5 text-slate-200 text-[11px] focus:outline-none"
                      />
                    ) : (
                      <span className={`text-[11px] font-medium truncate flex-1 ${
                        isSelected ? 'text-indigo-200' : 'text-slate-300'
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
                          className="p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition"
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
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-800/60">
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
                          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600">pt</span>
                      </div>

                      {/* 위치 X/Y */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12 flex-shrink-0">위치</span>
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
                          placeholder="X"
                          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
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
                          placeholder="Y"
                          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600">%</span>
                      </div>

                      {/* 텍스트 색상 */}
                      <div className="pt-1.5 border-t border-slate-800/50">
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
                            className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-12 gap-0.5">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={e => { e.stopPropagation(); onSlotStyleUpdate(key, { color: c }) }}
                              className="w-full aspect-square rounded border border-slate-700/50 hover:ring-1 hover:ring-indigo-400 transition"
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
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {a === 'left' ? '좌' : a === 'center' ? '중' : '우'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 이미지 업로드 + QR 생성 */}
                      <div className="pt-1.5 border-t border-slate-800/50">
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
                          <div className="mb-2 p-1.5 bg-slate-950/60 rounded border border-slate-800">
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
                              className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
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
                                <img src={url} alt="" className="w-full h-full object-contain bg-slate-800 rounded border border-slate-700" />
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
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        <span>{slot.fontSize}pt</span>
                        <span>·</span>
                        <span>{Math.round(slot.x)},{Math.round(slot.y)}</span>
                        {maxChars && (
                          <span className={overflow ? 'text-red-400 font-medium' : 'text-slate-600'}>
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
            <div className="px-3 py-2 border-t border-slate-800 mt-1">
              <button
                onClick={onInitDefaultSlots}
                className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 text-[11px] py-1.5 rounded hover:bg-slate-800 transition"
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
