'use client'

/**
 * 우측 패널 (좌 8:우 2 분할의 우 2 영역)
 *
 * 노션 페이지 36148589-8ea1-81a3-b3e8-dd4a833c914c §3 결정:
 *   - 시안 입력 제거 (시안 업로드·미리보기·마스터 시안 입력) → CanvasBoard orphan 보존
 *   - 우측 상단 토글 = 예시 이미지 (환경 장식물 종류별 샘플) + 사이즈 비율 표시
 *   - 위반 사항 발생 시 우측 상단 절반에 표시 (없으면 자동 숨김)
 *   - 행을 선택하면 구분에 맞는 예시 사진 (데이터허브 실사 이미지)
 *
 * 예시 이미지 출처:
 *   - 1차 = signageCategoriesSeedV3.sample_image_url (현재 비어있음 → placeholder)
 *   - 향후 = 관리자 페이지 "환경 장식물 종류" 메뉴에서 종류별 업로드 (B3 후속 영역)
 */

import { useMemo } from 'react'
import { ImageIcon, AlertTriangle, ExternalLink } from 'lucide-react'
import { classifyCategoryV3, getRatioLabel, type SignageCategoryV3 } from '@/lib/data/v3/signageCategoriesSeedV3'
import type { DesignItem } from '@/lib/types'
import type { ValidationIssue } from '@/lib/services/facilityValidator'

interface Props {
  selectedItem: DesignItem | null
  facilityIssues: ValidationIssue[]
  venueName: string | null
  /** 시설 가이드 출처 URL (노션 §3 = "시설 위반 원문 URL 표시"·향후 데이터허브 매뉴얼 링크) */
  guideSourceUrl?: string | null
}

export function RightPanel({ selectedItem, facilityIssues, venueName, guideSourceUrl }: Props) {
  const matchedCategory: SignageCategoryV3 | null = useMemo(() => {
    if (!selectedItem?.category) return null
    return classifyCategoryV3(selectedItem.category)
  }, [selectedItem?.category])

  const hasViolations = facilityIssues.length > 0
  const warnCount = facilityIssues.filter(i => i.severity === 'warn').length
  const infoCount = facilityIssues.filter(i => i.severity === 'info').length

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      {/* ── 상단: 예시 이미지 + 사이즈 비율 ───────────────────── */}
      <section className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={14} className="text-indigo-600" />
          <h3 className="text-xs font-semibold text-slate-700">예시 이미지</h3>
        </div>

        {!selectedItem ? (
          <div className="text-xs text-slate-400 py-8 text-center">
            좌측 표에서 행을 선택하세요.
          </div>
        ) : !matchedCategory ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            제작물 종류가 12 카테고리 표준에 매핑되지 않았습니다.
            <br />
            <span className="text-slate-500 mt-1 inline-block">현재 값: {selectedItem.category || '(미입력)'}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 예시 이미지 (실사 이미지·향후 데이터허브 연동) */}
            {matchedCategory.sample_image_url ? (
              <img
                src={matchedCategory.sample_image_url}
                alt={`${matchedCategory.label} 예시`}
                className="w-full rounded border border-slate-200 object-cover max-h-48"
              />
            ) : (
              <div className="w-full rounded border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
                <ImageIcon size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  실사 예시 이미지 준비 중
                  <br />
                  <span className="text-slate-400">관리자 페이지 → 환경 장식물 종류에서 업로드</span>
                </p>
              </div>
            )}

            {/* 카테고리 메타 */}
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">표준명</span>
                <span className="font-medium text-slate-800">{matchedCategory.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">분류</span>
                <span className="text-slate-700">{matchedCategory.classification}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">기본 재질</span>
                <span className="text-slate-700">{matchedCategory.material}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">규격 비율</span>
                <span className="font-mono text-indigo-700">{getRatioLabel(matchedCategory)}</span>
              </div>
            </div>

            {/* 시각 비율 박스 (노션 §3 "사이즈 비율 표시") */}
            <div className="pt-2">
              <div className="text-[10px] text-slate-400 mb-1.5">규격 비율 시각화</div>
              <div className="flex items-center justify-center bg-slate-100 rounded p-3 min-h-[80px]">
                <RatioBox cat={matchedCategory} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 하단: 위반 사항 (있을 때만 표시 — 노션 §3) ──────────── */}
      {hasViolations && (
        <section className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose-600" />
            <h3 className="text-xs font-semibold text-slate-700">
              시설 가이드 위반
              <span className="ml-2 text-[10px] font-normal text-slate-500">
                {warnCount > 0 && <span className="text-rose-600">경고 {warnCount}</span>}
                {warnCount > 0 && infoCount > 0 && ' · '}
                {infoCount > 0 && <span className="text-amber-700">조건부 {infoCount}</span>}
              </span>
            </h3>
          </div>

          <ul className="space-y-2">
            {facilityIssues.map((issue, idx) => (
              <li
                key={idx}
                className={`text-xs rounded border p-2.5 ${
                  issue.severity === 'warn'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
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

          {/* 시설 가이드 출처 URL (노션 §3 = "시설 위반 원문 URL 표시") */}
          {(guideSourceUrl || venueName) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
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
                <p className="text-[11px] text-slate-400">
                  ※ 시스템 정보가 오래됐을 수 있습니다. 행사장에 직접 확인 권장.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

/** 카테고리 규격 비율을 시각 박스로 표현 (가로·세로 비율 유지·최대 60×60) */
function RatioBox({ cat }: { cat: SignageCategoryV3 }) {
  const { width, height } = cat.default_size_mm
  const maxSide = 60
  const ratio = width / height
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
    <div
      className="bg-indigo-200 border border-indigo-400 rounded-sm"
      style={{ width: `${w}px`, height: `${h}px`, minWidth: '8px', minHeight: '8px' }}
      title={`${width} × ${height} mm`}
    />
  )
}
