// v9.39: AI 추천 정확도 테이블 — 카테고리(외벽·게이트·가로등·X배너·천정·부속시설)별
// 학습 데이터 보유 행사장 수 + 평균 정확도
// 명세: ADMIN_REDESIGN_260513.md §1-4

export interface AccuracyRow {
  category_key: string
  category_label: string
  trained_venues: number
  avg_accuracy: number | null  // null = 데이터 부재 → '—' 표기
  comment?: string
}

interface Props {
  rows: AccuracyRow[]
}

export function AccuracyTable({ rows }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-700 text-sm font-semibold">카테고리별 추천 정확도</h2>
        <span className="text-[10px] text-slate-400">학습 데이터 단계별 가중치(10·30·70·100%) 기준</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium border-b border-slate-200">카테고리</th>
              <th className="px-3 py-2 text-left font-medium border-b border-slate-200">학습 보유 행사장</th>
              <th className="px-3 py-2 text-left font-medium border-b border-slate-200">평균 정확도</th>
              <th className="px-3 py-2 text-left font-medium border-b border-slate-200">비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-6">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
            {rows.map(r => {
              const accColor =
                r.avg_accuracy === null
                  ? 'text-slate-400'
                  : r.avg_accuracy >= 70
                  ? 'text-emerald-600'
                  : r.avg_accuracy >= 50
                  ? 'text-amber-600'
                  : 'text-rose-600'
              return (
                <tr
                  key={r.category_key}
                  className="hover:bg-slate-50 border-b border-slate-100"
                >
                  <td className="px-3 py-2 font-medium text-slate-900">{r.category_label}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.trained_venues > 0 ? `${r.trained_venues}개소` : '—'}
                  </td>
                  <td className={`px-3 py-2 font-medium ${accColor}`}>
                    {r.avg_accuracy === null ? '—' : `${r.avg_accuracy}%`}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-slate-500">{r.comment ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
