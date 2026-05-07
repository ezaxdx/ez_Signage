'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, ImagePlus, Check, Loader2, LayoutGrid, Layers, Settings, Crown } from 'lucide-react'
import { FormatSelector } from './FormatSelector'
import { createClient } from '@/lib/supabase/client'
import type { Project, DesignItem } from '@/lib/types'

interface Props {
  project: Project
  selectedItem: DesignItem | null
  saveStatus: 'idle' | 'saving' | 'saved'
  slotPanelOpen: boolean
  onItemUpdate: (patch: Partial<DesignItem>) => void
  onExcelExport: () => Promise<void>
  onPPTExport: () => Promise<void>
  onSinglePPTExport?: () => Promise<void>
  onPDFExport?: () => Promise<void>
  onSetAsMaster?: () => Promise<void>
  onToggleSlotPanel: () => void
}

export function EditorToolbar({
  project,
  selectedItem,
  saveStatus,
  slotPanelOpen,
  onItemUpdate,
  onExcelExport,
  onPPTExport,
  onSinglePPTExport,
  onPDFExport,
  onSetAsMaster,
  onToggleSlotPanel,
}: Props) {
  const [isExportingPPT, setIsExportingPPT] = useState(false)
  const [isExportingXLS, setIsExportingXLS] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportPPT = async () => {
    setIsExportingPPT(true)
    try {
      await onPPTExport()
    } catch (err) {
      console.error('PPT export failed', err)
    } finally {
      setIsExportingPPT(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExportingXLS(true)
    try {
      await onExcelExport()
    } catch (err) {
      console.error('Excel export failed', err)
    } finally {
      setIsExportingXLS(false)
    }
  }

  // ── 시안 이미지 업로드 ────────────────────────────────────
  // 브라우저에서 WebP 변환 + 최대 2000px 리사이징 후 Supabase Storage 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedItem) return

    setIsUploadingImage(true)
    try {
      const { compressToWebP } = await import('@/lib/services/imageUtils')
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const blob = await compressToWebP(file)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const path = buildStoragePath('item-image', {
        userId: user.id,
        projectId: selectedItem.project_id,
        itemId: selectedItem.id,
      })

      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })

      if (uploadError) {
        alert(explainStorageError(uploadError.message || ''))
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('design-images')
        .getPublicUrl(path)

      // 캐시 버스터 추가 — 동일 경로 재업로드 시 Fabric.js가 새 이미지를 강제 로드
      const urlWithTs = `${publicUrl}?t=${Date.now()}`

      // onItemUpdate가 내부적으로 DB update 처리
      onItemUpdate({ image_url: urlWithTs })
    } catch (err) {
      console.error('이미지 업로드 실패', err)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <header className="h-12 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0 gap-3">
      {/* 숨김 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* 왼쪽: 브레드크럼 */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <LayoutGrid className="w-3.5 h-3.5 text-white" />
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-xs">대시보드</span>
        </Link>
        <span className="text-slate-700 text-xs">/</span>
        <span className="text-slate-300 text-xs font-medium truncate max-w-[140px]">
          {project.name}
        </span>
        {selectedItem && (
          <>
            <span className="text-slate-700 text-xs">/</span>
            <span className="text-slate-600 text-xs font-mono flex-shrink-0">
              {selectedItem.no}
            </span>
          </>
        )}
      </div>

      {/* 중앙: 양식 선택기 */}
      <div className="flex-1 flex justify-center">
        <FormatSelector item={selectedItem} onItemUpdate={onItemUpdate} />
      </div>

      {/* 오른쪽: 저장 상태 + 업로드 + 내보내기 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            저장 중
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <Check className="w-3 h-3" />
            저장됨
          </div>
        )}

        {/* 시안 이미지 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedItem || isUploadingImage}
          title={selectedItem?.image_url ? '시안 이미지 교체' : '시안 이미지 업로드'}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3 py-1.5 rounded-md transition"
        >
          {isUploadingImage ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {isUploadingImage ? '업로드 중...' : '시안 업로드'}
        </button>

        {/* Excel 전체 내보내기 */}
        <button
          onClick={handleExportExcel}
          disabled={isExportingXLS}
          className="flex items-center gap-1.5 bg-emerald-900/50 hover:bg-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-300 text-xs px-3 py-1.5 rounded-md transition"
        >
          {isExportingXLS ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5" />
          )}
          Excel 내보내기
        </button>

        {/* PPT 전체 내보내기 */}
        <button
          onClick={handleExportPPT}
          disabled={isExportingPPT}
          title="프로젝트 전체 제작물을 PPT 슬라이드로"
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs px-3 py-1.5 rounded-md transition"
        >
          {isExportingPPT ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          PPT 전체
        </button>

        {/* PPT 단일 내보내기 */}
        {onSinglePPTExport && selectedItem && (
          <button
            onClick={async () => { await onSinglePPTExport() }}
            title="현재 선택된 제작물만 1장 슬라이드로"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            1장
          </button>
        )}

        {/* PDF 인쇄용 출력 */}
        {onPDFExport && (
          <button
            onClick={async () => { await onPDFExport() }}
            title="실물 mm 규격 PDF — 인쇄용"
            className="flex items-center gap-1.5 bg-rose-900/40 hover:bg-rose-800/50 text-rose-300 text-xs px-2.5 py-1.5 rounded-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
        )}

        {/* 이 제작물을 해당 종류의 마스터로 지정 */}
        {onSetAsMaster && selectedItem && (
          <button
            onClick={async () => { await onSetAsMaster() }}
            title={selectedItem.is_master
              ? `현재 '${selectedItem.category}'의 마스터 — 클릭 시 같은 종류에 재전파`
              : `이 제작물을 '${selectedItem.category}' 종류의 마스터 디자인으로 지정 → 같은 종류에 서식·위치 전파 (텍스트 유지)`}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium ${
              selectedItem.is_master
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            {selectedItem.is_master ? '마스터 ✓' : '마스터로 지정'}
          </button>
        )}

        {/* 구역 패널 토글 */}
        <button
          onClick={onToggleSlotPanel}
          title="구역 설정 패널"
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition ${
            slotPanelOpen
              ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-600/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          구역
        </button>

        {/* 프로젝트 설정 */}
        <Link
          href={`/projects/${project.id}/info`}
          title="프로젝트 정보 / 팀원 / 기본 양식 설정"
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs px-3 py-1.5 rounded-md transition"
        >
          <Settings className="w-3.5 h-3.5" />
          설정
        </Link>
      </div>
    </header>
  )
}
