'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Download, FileSpreadsheet, ImagePlus, Check, Loader2, Layers, Settings, Crown, ClipboardCheck, BookOpen } from 'lucide-react'
// import { FormatSelector } from './FormatSelector'  // 1차 출시에서 일시 제거 (향후 복귀)
import { createClient } from '@/lib/supabase/client'
import type { Project, DesignItem } from '@/lib/types'
import { FacilityCheckModeToggle, type FacilityCheckMode } from '@/app/components/facility/FacilityCheckModeToggle'
import { OrderingSchedule } from '@/app/components/schedule/OrderingSchedule'

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
  onPreflight?: () => void
  // v8: 시설 가이드 (§11-6)
  onOpenFacilityGuide?: () => void
  facilityCheckMode?: FacilityCheckMode
  onFacilityCheckModeChange?: (mode: FacilityCheckMode) => void
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
  onPreflight,
  onOpenFacilityGuide,
  facilityCheckMode = 'verbose',
  onFacilityCheckModeChange,
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
    <header className="h-12 flex items-center justify-between px-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex-shrink-0 gap-3 relative z-20">
      {/* 숨김 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* 왼쪽: 프로젝트명 */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <span className="text-slate-700 text-xs font-medium truncate max-w-[180px]" title={project.name}>
          {project.name}
        </span>
      </div>

      {/* 중앙: 양식 선택기 — 1차 출시에서 일시 제거 (향후 복귀 예정) */}
      {/* 규격(mm) 편집은 상단 엑셀 그리드에서 더블클릭으로 가능 */}
      <div className="flex-1 flex justify-center">
        {/* <FormatSelector item={selectedItem} onItemUpdate={onItemUpdate} /> */}
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
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 text-xs px-3 py-1.5 rounded-md transition"
        >
          {isUploadingImage ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {isUploadingImage ? '업로드 중...' : '시안 업로드'}
        </button>

        {/* v8: 발주·설치 일정 자동 안내 (§11-3, §11-4) */}
        <OrderingSchedule eventDate={project.event_date} projectId={project.id} />

        {/* v8: 행사장 시설 가이드 보기 (§11-6-2) */}
        {onOpenFacilityGuide && (
          <button
            onClick={onOpenFacilityGuide}
            title="행사장 시설 가이드 (설치 가능 / 리깅 / 안전 기준 / 주의사항)"
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-md transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            행사장 가이드
          </button>
        )}

        {/* v8: 시설 가이드 알림 강도 3단 토글 (§11-6) */}
        {onFacilityCheckModeChange && (
          <FacilityCheckModeToggle mode={facilityCheckMode} onChange={onFacilityCheckModeChange} />
        )}

        {/* 발주 전 자동 점검 — 사용자 결정으로 숨김 (2026-05-11) */}

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
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 text-xs px-3 py-1.5 rounded-md transition"
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
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-200 text-slate-400 text-xs px-2.5 py-1.5 rounded-md transition"
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

        {/* 마스터로 지정 — 사용자 결정으로 숨김 (2026-05-11) */}

        {/* 구역 패널 토글 — 사용자 결정으로 숨김 (2026-05-11) */}

        {/* 프로젝트 설정 */}
        <Link
          href={`/projects/${project.id}/info`}
          title="프로젝트 정보 / 팀원 / 기본 양식 설정"
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xs px-3 py-1.5 rounded-md transition"
        >
          <Settings className="w-3.5 h-3.5" />
          설정
        </Link>
      </div>
    </header>
  )
}
