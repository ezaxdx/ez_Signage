'use client'

import { SEED_PROGRAM_PART_SIGNAGE } from '@/lib/data/v3/programPartSignageSeed'
import { Layers } from 'lucide-react'

// app/(dashboard)/admin/learning/components/ProgramPartSignageMatrix.tsx
// 12파트 × 환경장식물 매트릭스 시각화 (v10.4)
// SOT: lib/data/v3/programPartSignageSeed.ts (5/19 노션 §6-2 + 61행 엑셀 정합)
// 의도 (Step 0):
//   표면 = 학습 관리자에서 시드 가시화
//   진짜 = 12파트 외연을 사용자가 한눈에 확인·학습 데이터 SOT 검증
//   설계 = read-only 표·편집은 SOT 파일 직접 (단일 진실)

export function ProgramPartSignageMatrix() {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-slate-900 font-semibold text-sm mb-3 flex items-center gap-2">
        <Layers className="w-4 h-4 text-indigo-500" />
        12파트 × 환경장식물 표준 매트릭스 (read-only)
      </h2>
      <p className="text-slate-500 text-[11px] mb-4">
        SOT = <code className="bg-slate-100 px-1 rounded">lib/data/v3/programPartSignageSeed.ts</code> ·
        편집은 SOT 파일에서 직접 (단일 진실 정합).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200 text-[11px]">
              <th className="text-left p-2 w-12">NO.</th>
              <th className="text-left p-2 w-32">파트</th>
              <th className="text-left p-2">권장 환경장식물 (구분)</th>
              <th className="text-left p-2 w-48">비고</th>
            </tr>
          </thead>
          <tbody>
            {SEED_PROGRAM_PART_SIGNAGE.map(part => {
              const notes = Array.from(new Set(part.signages.flatMap(s => s.note ? [s.note] : [])))
              return (
                <tr key={part.partCode} className="border-b border-slate-100">
                  <td className="p-2 text-slate-400">{part.partNo}</td>
                  <td className="p-2 font-medium text-slate-900">{part.partName}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {part.signages.map(sig => (
                        <span
                          key={sig.category}
                          className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-0.5 text-[10px]"
                          title={sig.subUse?.join(' · ')}
                        >
                          {sig.category}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2 text-slate-500 text-[10px]">
                    {notes.length > 0 ? notes.join(' · ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[10px] text-slate-400">
        총 {SEED_PROGRAM_PART_SIGNAGE.length}파트 · 카테고리 {Array.from(new Set(SEED_PROGRAM_PART_SIGNAGE.flatMap(p => p.signages.map(s => s.category)))).length}종 ·
        천장 배너(전시) ≠ 통천 배너(공식행사) 분리 명시
      </div>
    </section>
  )
}
