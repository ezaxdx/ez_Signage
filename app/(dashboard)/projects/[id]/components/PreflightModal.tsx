'use client'

import { useMemo } from 'react'
import { X, AlertCircle, AlertTriangle, Info, CheckCircle2, Send } from 'lucide-react'
import { runPreflight, groupIssues } from '@/lib/services/preflightCheck'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
              🛫 발주 전 자동 점검 (Pre-flight)
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              외주 디자이너·협력사 발주 전 이 점검으로 현장 재출력을 방지하세요
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 요약 */}
        <div className="px-5 py-3 border-b border-slate-800 flex gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${errors.length > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <strong>{errors.length}</strong>개 치명적
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${warnings.length > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <strong>{warnings.length}</strong>개 주의
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${infos.length > 0 ? 'text-sky-400' : 'text-slate-600'}`}>
            <Info className="w-3.5 h-3.5" />
            <strong>{infos.length}</strong>개 안내
          </div>
          {canExport && issues.length === 0 && (
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
              <p className="text-slate-300 font-medium">모든 항목 이상 없음</p>
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
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-600">
            {canExport ? '✓ 치명적 오류 없음 — 발주 가능' : '✗ 치명적 오류를 먼저 해결하세요'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg transition">
              나중에
            </button>
            <button
              onClick={async () => { await onExportAll(); onClose() }}
              disabled={!canExport}
              className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition ${
                canExport
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
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
                <p className="text-slate-200 text-xs">{issue.message}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${textClass}`}>{issue.code}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
