'use client'

import { useMemo, useState } from 'react'
import { X, AlertCircle, AlertTriangle, Info, CheckCircle2, Send, PackagePlus, ChevronDown, ChevronRight } from 'lucide-react'
import { runPreflight, groupIssues, checkMissingCandidates } from '@/lib/services/preflightCheck'
import type { DesignItem, ContentsMap } from '@/lib/types'

interface Props {
  items: DesignItem[]
  allContents: Record<string, ContentsMap>
  onClose: () => void
  onGoToItem: (itemId: string) => void
  onExportAll: () => Promise<void>
}

export function PreflightModal({ items, allContents, onClose, onGoToItem, onExportAll }: Props) {
  const issues = useMemo(() => runPreflight(items, allContents), [items, allContents])
  const { errors, warnings, infos } = groupIssues(issues)
  const canExport = errors.length === 0

  const missingCandidates = useMemo(() => checkMissingCandidates(items), [items])
  const commonMissing = missingCandidates.filter(c => c.frequency >= 2)
  const rareMissing = missingCandidates.filter(c => c.frequency < 2)
  const [missingExpanded, setMissingExpanded] = useState(true)
  const [rareExpanded, setRareExpanded] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
              🛫 발주 전 자동 점검 (Pre-flight)
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              외주 디자이너·협력사 발주 전 이 점검으로 현장 재출력을 방지하세요
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-400 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 요약 */}
        <div className="px-5 py-3 border-b border-slate-200 flex gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${errors.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <strong>{errors.length}</strong>개 치명적
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${warnings.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <strong>{warnings.length}</strong>개 주의
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${infos.length > 0 ? 'text-sky-400' : 'text-slate-400'}`}>
            <Info className="w-3.5 h-3.5" />
            <strong>{infos.length}</strong>개 안내
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${commonMissing.length > 0 ? 'text-violet-400' : 'text-slate-400'}`}>
            <PackagePlus className="w-3.5 h-3.5" />
            <strong>{commonMissing.length}</strong>개 누락 후보
          </div>
          {canExport && issues.length === 0 && commonMissing.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 ml-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              모두 통과 — 발주 가능
            </div>
          )}
        </div>

        {/* 이슈 리스트 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">모든 항목 이상 없음</p>
              <p className="text-slate-500 text-xs mt-1">바로 발주 파일을 생성할 수 있습니다</p>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <IssueSection title="🚨 치명적 오류 (발주 시 현장 재출력 위험)" issues={errors} level="error" onGoToItem={onGoToItem} />
              )}
              {warnings.length > 0 && (
                <IssueSection title="⚠️ 주의 (확인 후 진행)" issues={warnings} level="warning" onGoToItem={onGoToItem} />
              )}
              {infos.length > 0 && (
                <IssueSection title="ℹ️ 안내" issues={infos} level="info" onGoToItem={onGoToItem} />
              )}
            </>
          )}

          {/* 누락 품목 후보 — 표준 11종 중 현재 리스트에 없는 종류 */}
          {missingCandidates.length > 0 && (
            <div className="border border-violet-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setMissingExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 hover:bg-violet-100 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-violet-700">
                    누락 품목 후보 ({missingCandidates.length}종)
                  </span>
                  <span className="text-[10px] text-violet-400">표준 11종 중 현재 목록에 없는 종류</span>
                </div>
                {missingExpanded ? <ChevronDown className="w-3.5 h-3.5 text-violet-400" /> : <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
              </button>

              {missingExpanded && (
                <div className="px-4 py-3 space-y-3 bg-white">
                  {commonMissing.length > 0 && (
                    <div>
                      <p className="text-[10px] text-violet-500 font-medium mb-1.5">범용 (2개 이상 행사 유형에서 권장)</p>
                      <div className="space-y-1">
                        {commonMissing.map(c => (
                          <div key={c.typeId} className="flex items-center justify-between bg-violet-50 rounded px-3 py-1.5">
                            <div>
                              <span className="text-xs font-medium text-violet-800">{c.typeName}</span>
                              <span className="text-[10px] text-violet-500 ml-2">{c.note}</span>
                            </div>
                            <span className="text-[10px] text-violet-400 flex-shrink-0">{c.frequency}/8 행사유형</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rareMissing.length > 0 && (
                    <div>
                      <button
                        onClick={() => setRareExpanded(v => !v)}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition"
                      >
                        {rareExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        특수 용도 {rareMissing.length}종 더 보기
                      </button>
                      {rareExpanded && (
                        <div className="space-y-1 mt-1">
                          {rareMissing.map(c => (
                            <div key={c.typeId} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5">
                              <div>
                                <span className="text-xs text-slate-600">{c.typeName}</span>
                                <span className="text-[10px] text-slate-400 ml-2">{c.note}</span>
                              </div>
                              <span className="text-[10px] text-slate-300 flex-shrink-0">{c.frequency}/8 행사유형</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    ※ 필요 없는 종류는 무시해도 됩니다. 추가하려면 편집기에서 '+ 행 추가'로 직접 입력하세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {canExport ? '✓ 치명적 오류 없음 — 발주 가능' : '✗ 치명적 오류를 먼저 해결하세요'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-slate-50 hover:bg-slate-200 text-slate-400 text-xs px-4 py-2 rounded-lg transition">
              나중에
            </button>
            <button
              onClick={async () => { await onExportAll(); onClose() }}
              disabled={!canExport}
              className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition ${
                canExport
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              발주 파일 생성 (Excel + PPT)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IssueSection({
  title, issues, level, onGoToItem,
}: {
  title: string
  issues: ReturnType<typeof runPreflight>
  level: 'error' | 'warning' | 'info'
  onGoToItem: (id: string) => void
}) {
  const bgClass = level === 'error' ? 'bg-rose-900/20 border-rose-900/40'
    : level === 'warning' ? 'bg-amber-900/20 border-amber-900/40'
    : 'bg-sky-900/20 border-sky-900/40'
  const textClass = level === 'error' ? 'text-rose-300' : level === 'warning' ? 'text-amber-300' : 'text-sky-300'

  return (
    <div>
      <h3 className={`text-xs font-semibold mb-2 ${textClass}`}>{title}</h3>
      <div className="space-y-1.5">
        {issues.map((issue, idx) => (
          <button
            key={idx}
            onClick={() => onGoToItem(issue.itemId)}
            className={`w-full text-left border rounded-lg px-3 py-2 hover:brightness-110 transition ${bgClass}`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-mono ${textClass} flex-shrink-0 mt-0.5`}>#{issue.itemNo}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-xs">{issue.message}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${textClass}`}>{issue.code}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
