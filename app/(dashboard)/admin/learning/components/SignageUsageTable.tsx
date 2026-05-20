// HOTFIX (2026-05-20): "사용된 환경장식물 (평균 수량/행사)" 공통 표 컴포넌트.
//   행사장 관리·프로그램 파트 관리 두 영역에서 동일 형태로 재사용.
//
// 컬럼: 환경장식물 종류 / 표준 규격 / 평균 수량
// - 표준 규격: SEED_SIGNAGE_TYPES.id → width_mm × height_mm. 규격 없으면 "(미정)"
// - 평균 수량: 호출 측에서 산출 (해당 행사장·파트 휘하 평균)
// - 정렬: 평균 수량 내림차순 (호출 측 책임 또는 본 컴포넌트가 자동)

import { SEED_SIGNAGE_TYPES } from '@/lib/data/dashboardSeed'

export interface SignageUsageRow {
  /** 표준명 (예: "X배너") 또는 시드 id (예: "x_banner") */
  category: string
  avg_quantity: number
}

interface Props {
  items: SignageUsageRow[]
  /** 표 헤더 없이 표만 렌더 (공간 절약) */
  compact?: boolean
}

const NAME_TO_TYPE = new Map(SEED_SIGNAGE_TYPES.map(t => [t.name, t] as const))
const ID_TO_TYPE = new Map(SEED_SIGNAGE_TYPES.map(t => [t.id, t] as const))

function resolveSpec(category: string): string {
  const byName = NAME_TO_TYPE.get(category)
  if (byName) return `${byName.width_mm}×${byName.height_mm}mm`
  const byId = ID_TO_TYPE.get(category)
  if (byId) return `${byId.width_mm}×${byId.height_mm}mm`
  return '(미정)'
}

export function SignageUsageTable({ items, compact = false }: Props) {
  if (items.length === 0) {
    return <div className="text-[10px] text-slate-400 italic py-1">— 사용된 환경장식물 없음</div>
  }
  const sorted = items.slice().sort((a, b) => b.avg_quantity - a.avg_quantity)
  return (
    <table className={`w-full ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <thead>
        <tr className="text-slate-500 text-[10px] border-b border-slate-200">
          <th className="px-2 py-1 text-left">환경장식물 종류</th>
          <th className="px-2 py-1 text-left">표준 규격</th>
          <th className="px-2 py-1 text-right">평균 수량</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="px-2 py-1 text-slate-800">{row.category}</td>
            <td className="px-2 py-1 text-slate-500 font-mono text-[10px]">{resolveSpec(row.category)}</td>
            <td className="px-2 py-1 text-right font-mono text-emerald-700 font-semibold">{row.avg_quantity.toFixed(1)}개</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
