'use client'

/**
 * 우측 패널 — 5/21 사용자 명시 재구성.
 *
 * 구조:
 *   - 상단 = 토글 버튼 2개 [예시 이미지] [규격 비율 시각화]
 *   - 위반 사항 없을 때 = 우측 전체에 토글 컨텐츠 (선택된 것)
 *   - 위반 사항 있을 때 = 위 절반 = 시설 가이드 위반·아래 절반 = 토글 컨텐츠
 *
 * 노션 페이지 36148589-8ea1-81a3-b3e8-dd4a833c914c §3 정합.
 */

import { useState, useMemo, useEffect } from 'react'
import { ImageIcon, AlertTriangle, ExternalLink, Ruler } from 'lucide-react'
import { classifyCategoryV3, getRatioLabel, type SignageCategoryV3 } from '@/lib/data/v3/signageCategoriesSeedV3'
import type { DesignItem } from '@/lib/types'
import type { ValidationIssue } from '@/lib/services/facilityValidator'

type TabKey = 'sample' | 'ratio'

interface Props {
  selectedItem: DesignItem | null
  facilityIssues: ValidationIssue[]
  venueName: string | null
  guideSourceUrl?: string | null
}

export function RightPanel({ selectedItem, facilityIssues, venueName, guideSourceUrl }: Props) {
  const [tab, setTab] = useState<TabKey>('sample')

  const matchedCategory: SignageCategoryV3 | null = useMemo(() => {
    if (!selectedItem?.category) return null
    return classifyCategoryV3(selectedItem.category)
  }, [selectedItem?.category])

  // HOTFIX 2026-05-20: state lifting — 기존엔 SampleImageView 내부에 dbSampleByName state.
  //   tab 전환 시(sample↔ratio) SampleImageView conditional render로 unmount → state 초기화 → 이미지 사라짐.
  //   부모(RightPanel)에서 fetch 1회 유지·props로 전달.
  const [dbSampleByName, setDbSampleByName] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/admin/signage-types')
      .then(r => r.ok ? r.json() : null)
      .then((d: { items?: Array<{ name: string; sample_image_url?: string | null }> } | null) => {
        if (!d?.items) return
        const map: Record<string, string> = {}
        const normFn = (s: string) => s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()
        for (const t of d.items) {
          if (t.sample_image_url) map[normFn(t.name)] = t.sample_image_url
        }
        setDbSampleByName(map)
      })
      .catch(() => { /* silent — 인증 X·테이블 부재 시 정적 시드 fallback */ })
  }, [])

  const hasViolations = facilityIssues.length > 0
  const warnCount = facilityIssues.filter(i => i.severity === 'warn').length
  const infoCount = facilityIssues.filter(i => i.severity === 'info').length

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* ── 상단: 토글 버튼 2개 (노션 §3 = 예시 이미지·규격 비율 시각화) ── */}
      <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => setTab('sample')}
          className={`flex-1 py-2 px-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition ${
            tab === 'sample'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ImageIcon size={13} />
          예시 이미지
        </button>
        <button
          onClick={() => setTab('ratio')}
          className={`flex-1 py-2 px-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition ${
            tab === 'ratio'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Ruler size={13} />
          규격 비율 시각화
        </button>
      </div>

      {/* ── 본문 영역 ─────────────────────────────────────────
          위반 있음 = 위 절반 위반·아래 절반 토글 컨텐츠
          위반 없음 = 전체 토글 컨텐츠 */}
      <div className="flex-1 flex flex-col min-h-0">
        {hasViolations && (
          <ViolationsSection
            issues={facilityIssues}
            warnCount={warnCount}
            infoCount={infoCount}
            venueName={venueName}
            guideSourceUrl={guideSourceUrl}
          />
        )}

        <div className={`${hasViolations ? 'h-1/2 border-t border-slate-200' : 'flex-1'} overflow-y-auto bg-white`}>
          {tab === 'sample' ? (
            <SampleImageView selectedItem={selectedItem} matchedCategory={matchedCategory} dbSampleByName={dbSampleByName} />
          ) : (
            <RatioView selectedItem={selectedItem} matchedCategory={matchedCategory} />
          )}
        </div>
      </div>
    </div>
  )
}

/** 시설 가이드 위반 사항 = 위 절반 (노션 §3 "위반 사항 발생 시 우측 상단 절반에 표시") */
function ViolationsSection({
  issues,
  warnCount,
  infoCount,
  venueName,
  guideSourceUrl,
}: {
  issues: ValidationIssue[]
  warnCount: number
  infoCount: number
  venueName: string | null
  guideSourceUrl?: string | null
}) {
  return (
    <section className="h-1/2 overflow-y-auto p-4 bg-rose-50/30 border-b border-rose-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-rose-600" />
        <h3 className="text-xs font-semibold text-slate-800">
          시설 가이드 위반
          <span className="ml-2 text-[10px] font-normal text-slate-500">
            {warnCount > 0 && <span className="text-rose-600">경고 {warnCount}</span>}
            {warnCount > 0 && infoCount > 0 && ' · '}
            {infoCount > 0 && <span className="text-amber-700">조건부 {infoCount}</span>}
          </span>
        </h3>
      </div>

      <ul className="space-y-2">
        {issues.map((issue, idx) => (
          <li
            key={idx}
            className={`text-xs rounded border p-2.5 ${
              issue.severity === 'warn'
                ? 'bg-white border-rose-200 text-rose-900'
                : 'bg-white border-amber-200 text-amber-900'
            }`}
          >
            <div className="font-medium mb-1">{issue.message}</div>
            {(issue.standardValue || issue.userValue) && (
              <div className="text-[11px] space-y-0.5 mt-1.5 text-slate-600">
                {issue.standardValue && (
                  <div>
                    <span className="text-slate-400">표준:</span> {issue.standardValue}
                  </div>
                )}
                {issue.userValue && (
                  <div>
                    <span className="text-slate-400">입력:</span> {issue.userValue}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {(guideSourceUrl || venueName) && (
        <div className="mt-3 pt-3 border-t border-rose-100">
          {guideSourceUrl ? (
            <a
              href={guideSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <ExternalLink size={11} />
              {venueName ? `${venueName} 시설 가이드 원문` : '시설 가이드 원문 보기'}
            </a>
          ) : (
            <p className="text-[11px] text-slate-500">
              ※ 시스템 정보가 오래됐을 수 있습니다. 행사장에 직접 확인 권장.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/** 예시 이미지 뷰 (노션 §3 = 데이터허브 실사 이미지) */
function SampleImageView({
  selectedItem,
  matchedCategory,
  dbSampleByName,
}: {
  selectedItem: DesignItem | null
  matchedCategory: SignageCategoryV3 | null
  dbSampleByName: Record<string, string>
}) {
  // HOTFIX 2026-05-20 (2차): state·useEffect를 부모 RightPanel로 이동 (state lifting).
  //   tab 전환(sample↔ratio) 시 SampleImageView conditional render = unmount → state 초기화로
  //   업로드 이미지가 사라지는 버그 fix. props.dbSampleByName으로 안정 유지.
  if (!selectedItem) {
    return <div className="p-6 text-xs text-slate-400 text-center">좌측 표에서 행을 선택하세요.</div>
  }
  if (!matchedCategory) {
    return (
      <div className="p-4">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          제작물 종류가 12 카테고리 표준에 매핑되지 않았습니다.
          <br />
          <span className="text-slate-500 mt-1 inline-block">현재 값: {selectedItem.category || '(미입력)'}</span>
        </div>
      </div>
    )
  }
  const normFn = (s: string) => s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()
  const imageUrl = dbSampleByName[normFn(matchedCategory.label)] ?? matchedCategory.sample_image_url ?? null
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-700">{matchedCategory.label}</span>
        <span className="text-[10px] text-slate-500">{matchedCategory.classification}</span>
      </div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${matchedCategory.label} 예시`}
          className="w-full rounded border border-slate-200 object-contain max-h-full"
        />
      ) : (
        <div className="flex-1 rounded border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
          <ImageIcon size={36} className="text-slate-300 mb-3" />
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            실사 예시 이미지 준비 중
            <br />
            <span className="text-slate-400 text-[11px]">관리자 페이지 → 환경장식물 관리에서 업로드</span>
          </p>
        </div>
      )}
    </div>
  )
}

/** 규격 비율 시각화 뷰 (노션 §3 = "사이즈 비율 표시 = 종류별 규격에 맞는 비율") */
function RatioView({
  selectedItem,
  matchedCategory,
}: {
  selectedItem: DesignItem | null
  matchedCategory: SignageCategoryV3 | null
}) {
  if (!selectedItem) {
    return <div className="p-6 text-xs text-slate-400 text-center">좌측 표에서 행을 선택하세요.</div>
  }
  // 카테고리 매칭 실패해도 design_items.width_mm/height_mm 있으면 시각화 (실측 mm 기반)
  const widthMm = selectedItem.width_mm ?? matchedCategory?.default_size_mm.width ?? 0
  const heightMm = selectedItem.height_mm ?? matchedCategory?.default_size_mm.height ?? 0
  if (widthMm === 0 || heightMm === 0) {
    return (
      <div className="p-4">
        <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded p-3">
          규격이 입력되지 않았습니다. 좌측 표에서 너비·높이(mm)를 입력하세요.
        </div>
      </div>
    )
  }
  const ratioLabel = matchedCategory ? getRatioLabel(matchedCategory) : `${widthMm} × ${heightMm} mm`

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-700">
          {matchedCategory?.label ?? selectedItem.category ?? '(카테고리 미매핑)'}
        </span>
        <span className="text-[10px] text-slate-500 ml-auto font-mono">{ratioLabel}</span>
      </div>

      {/* 큰 비율 박스 — 우측 전체 영역 활용 */}
      <div className="flex-1 flex items-center justify-center bg-slate-100/60 rounded border border-slate-200 p-6">
        <RatioBox widthMm={widthMm} heightMm={heightMm} />
      </div>

      {/* 메타 */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Meta label="너비" value={`${widthMm.toLocaleString()} mm`} />
        <Meta label="높이" value={`${heightMm.toLocaleString()} mm`} />
        {matchedCategory && (
          <>
            <Meta label="기본 재질" value={matchedCategory.material} />
            <Meta label="레이아웃" value={matchedCategory.layout === 'horizontal' ? '가로' : '세로'} />
          </>
        )}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded px-2 py-1.5">
      <div className="text-[9px] text-slate-400">{label}</div>
      <div className="text-slate-800 font-medium">{value}</div>
    </div>
  )
}

/** 규격 비율 박스 — 컨테이너 안에 최대 비율로 시각화 */
function RatioBox({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const maxSide = 220
  const ratio = widthMm / heightMm
  let w: number
  let h: number
  if (ratio >= 1) {
    w = maxSide
    h = maxSide / ratio
  } else {
    h = maxSide
    w = maxSide * ratio
  }
  return (
    <div className="relative" style={{ width: `${w}px`, height: `${h}px` }}>
      <div className="absolute inset-0 bg-indigo-200/70 border-2 border-indigo-500 rounded-sm" />
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-indigo-700 font-mono whitespace-nowrap">
        ↔ {widthMm.toLocaleString()} mm
      </div>
      <div className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full text-[10px] text-indigo-700 font-mono whitespace-nowrap ml-1">
        ↕ {heightMm.toLocaleString()} mm
      </div>
    </div>
  )
}
