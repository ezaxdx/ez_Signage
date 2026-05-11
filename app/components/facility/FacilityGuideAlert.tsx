'use client'

// 시설 가이드 자동 알랏 (§11-6-1)
// 사용자 입력이 시설 가이드와 다를 때 1회 표시.
// 강제 차단 X — [수정하기] / [그래도 진행] 사용자 선택.
// 매번 띄우지 않음 — 첫 위반 1회 + 이후 그리드 셀 ⚠️ 아이콘만 (§11-6 정책)

import { AlertTriangle, X, BookOpen } from 'lucide-react'

interface Props {
  open: boolean
  message: string
  standardValue?: string   // 매뉴얼 표준
  userValue?: string       // 사용자 입력값
  venueName?: string
  onCorrect: () => void    // 수정하기
  onProceed: () => void    // 그래도 진행
  onOpenGuide?: () => void // 가이드 자세히 보기
}

export function FacilityGuideAlert({ open, message, standardValue, userValue, venueName, onCorrect, onProceed, onOpenGuide }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCorrect} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <h3 className="text-amber-900 font-semibold text-sm flex-1">시설 가이드 안내</h3>
          <button onClick={onCorrect} className="text-amber-700 hover:text-amber-900 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-3">
          {venueName && <p className="text-slate-500 text-xs">{venueName}</p>}
          <p className="text-slate-800 text-sm leading-relaxed">{message}</p>

          {(standardValue || userValue) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
              {standardValue && (
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16 flex-shrink-0">매뉴얼 표준</span>
                  <span className="text-slate-800 font-medium">{standardValue}</span>
                </div>
              )}
              {userValue && (
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16 flex-shrink-0">입력 값</span>
                  <span className="text-amber-700 font-medium">{userValue}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-slate-500 text-[11px] leading-relaxed bg-slate-50 border border-slate-200 rounded px-3 py-2">
            ※ 본 정보는 학습된 시점 기준이며 행사장 정책이 변경됐을 가능성이 있습니다.
            <br />
            확신이 없으시면 행사장에 직접 확인 권장.
          </p>
        </div>

        {/* 푸터 */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center gap-2">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition mr-auto"
            >
              <BookOpen className="w-3.5 h-3.5" />
              가이드 자세히 보기
            </button>
          )}
          <button
            onClick={onCorrect}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition"
          >
            수정하기
          </button>
          <button
            onClick={onProceed}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition"
          >
            그래도 진행
          </button>
        </div>
      </div>
    </div>
  )
}
