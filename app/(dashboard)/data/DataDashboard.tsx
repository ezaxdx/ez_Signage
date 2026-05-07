'use client'

interface Props {
  signageTypes: unknown[]
  synonyms: unknown[]
  designers: unknown[]
  eventHistory: unknown[]
  venues: unknown[]
}

export function DataDashboard({ signageTypes, synonyms, designers, eventHistory, venues }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-slate-300 font-semibold">데이터 관리</p>
        <p className="text-slate-600 text-sm">준비 중입니다</p>
        <p className="text-slate-700 text-xs">{signageTypes.length + synonyms.length + designers.length + eventHistory.length + venues.length}개 항목</p>
      </div>
    </div>
  )
}
