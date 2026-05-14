'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Activity, CheckCircle, Plus, Calendar,
  ExternalLink, Filter, Layers,
} from 'lucide-react'

// v9.26: 운영 KPI ↔ 전체 프로젝트 현황 통합 (사용자 피드백 ① 반영)
// v9.45: AI 정확도 신호등 prop(aiAccuracy·accuracySignal)은 v9.39에서 /admin/ai로 이동
// v9.47 (2026-05-14): IA SOT(김연아 대리님 노션 스크린샷) 정렬 — KPI 5종 → 4종
//   IA 목표: 진행 프로젝트 수 / 신규 프로젝트 수(최근 일주일) / 전체 프로젝트 수 / 완료 프로젝트 수(완료율)
//   삭제: ′추천 다운로드 전환율′ (sales funnel 지표 — IA 미포함)
//   변경: ′이번 주 발주 완료′ → ′전체 프로젝트 수′ (의미 변경, 누적 카운트)
//   유지: ′발주서 완료율′ — IA의 ′완료 프로젝트 수(완료율)′ 의미와 매핑

interface KpiData {
  inProgress: number      // 진행 프로젝트 수
  thisWeekNew: number     // 신규 프로젝트 수 (최근 일주일)
  totalProjects: number   // v9.47: 전체 프로젝트 수 (신규)
  finalizedRate: number   // 완료율
}

interface ProjectRow {
  no: string
  id: string
  part: string
  pm: string
  event_name: string
  event_venue: string
  stage: string
  order_date: string
  confirm_rate: number
  item_count: number
  ai_accuracy: number
  manager: string
  note: string
  event_date: string | null
}

interface PartBar {
  part: string
  progress: number
  done: number
  rejected: number
  total: number
}

interface CalendarItem {
  id: string
  name: string
  event_date: string
  dday: number
  venue: string | null
}

interface Props {
  kpi: KpiData
  projects: ProjectRow[]
  partStageBars: PartBar[]
  calendar: CalendarItem[]
}

export function AdminOpsClient({ kpi, projects, partStageBars, calendar }: Props) {
  // ── 필터 상태 ──────────────────────────────────────────────
  const [filterPart, setFilterPart] = useState<string>('')
  const [filterPm, setFilterPm] = useState<string>('')
  const [filterVenue, setFilterVenue] = useState<string>('')
  const [filterStage, setFilterStage] = useState<string>('')
  const [filterFromDate, setFilterFromDate] = useState<string>('')
  const [filterToDate, setFilterToDate] = useState<string>('')

  const partOptions = useMemo(() => {
    const s = new Set<string>()
    projects.forEach(p => { if (p.part && p.part !== '—') s.add(p.part) })
    return Array.from(s).sort()
  }, [projects])
  const pmOptions = useMemo(() => {
    const s = new Set<string>()
    projects.forEach(p => { if (p.pm && p.pm !== '—') s.add(p.pm) })
    return Array.from(s).sort()
  }, [projects])
  const venueOptions = useMemo(() => {
    const s = new Set<string>()
    projects.forEach(p => { if (p.event_venue && p.event_venue !== '—') s.add(p.event_venue) })
    return Array.from(s).sort()
  }, [projects])
  const stageOptions = useMemo(() => {
    const s = new Set<string>()
    projects.forEach(p => { if (p.stage) s.add(p.stage) })
    return Array.from(s).sort()
  }, [projects])

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (filterPart && !p.part.includes(filterPart)) return false
      if (filterPm && p.pm !== filterPm) return false
      if (filterVenue && p.event_venue !== filterVenue) return false
      if (filterStage && p.stage !== filterStage) return false
      if (filterFromDate && p.event_date && p.event_date < filterFromDate) return false
      if (filterToDate && p.event_date && p.event_date > filterToDate) return false
      return true
    })
  }, [projects, filterPart, filterPm, filterVenue, filterStage, filterFromDate, filterToDate])

  const resetFilters = () => {
    setFilterPart(''); setFilterPm(''); setFilterVenue(''); setFilterStage('')
    setFilterFromDate(''); setFilterToDate('')
  }

  // v9.39: AI 정확도 신호등 카드는 /admin/ai로 이동 — 운영 대시보드는 운영 KPI만 노출

  return (
    <div className="min-h-screen bg-slate-50">
      {/* v9.33: 헤더 인라인 nav 제거 — 글로벌 좌측 사이드바(AdminSidebar)로 일원화 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* v9.36 시안 매칭: 좌상단 페이지 타이틀만 유지, 부연 산문 제거 */}
        <h1 className="text-slate-900 text-xl font-bold">운영 대시보드</h1>

        {/* ── 운영 KPI 4카드 (v9.47: IA SOT 정렬 — 5종 → 4종) ─────────────── */}
        {/* IA 목표: 진행 프로젝트 / 신규 프로젝트(최근 일주일) / 전체 프로젝트 / 완료 프로젝트(완료율) */}
        <section>
          <h2 className="text-slate-700 text-sm font-semibold mb-3">운영 KPI</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<Activity className="w-4 h-4" />}
              label="진행 프로젝트"
              value={kpi.inProgress}
              unit="개"
              color="text-indigo-600"
            />
            <KpiCard
              icon={<Plus className="w-4 h-4" />}
              label="신규 프로젝트"
              value={kpi.thisWeekNew}
              unit="개"
              color="text-blue-600"
              note="최근 일주일"
            />
            <KpiCard
              icon={<Layers className="w-4 h-4" />}
              label="전체 프로젝트"
              value={kpi.totalProjects}
              unit="개"
              color="text-slate-700"
              note="누적"
            />
            <KpiCard
              icon={<CheckCircle className="w-4 h-4" />}
              label="완료 프로젝트"
              value={kpi.finalizedRate}
              unit="%"
              color="text-emerald-600"
              note="발주서 완료율"
            />
          </div>
        </section>

        {/* ── 전체 프로젝트 현황 (운영 KPI와 통합) ──────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 text-sm font-semibold">전체 프로젝트 현황</h2>
            <span className="text-slate-500 text-xs">{filtered.length} / {projects.length}건</span>
          </div>

          {/* 필터 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-700 text-xs font-medium">필터</span>
              {(filterPart || filterPm || filterVenue || filterStage || filterFromDate || filterToDate) && (
                <button onClick={resetFilters} className="ml-auto text-[10px] text-indigo-600 hover:underline">초기화</button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <select value={filterPart} onChange={e => setFilterPart(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                <option value="">파트 전체</option>
                {partOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterPm} onChange={e => setFilterPm(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                <option value="">담당자 전체</option>
                {pmOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterVenue} onChange={e => setFilterVenue(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                <option value="">행사장 전체</option>
                {venueOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                <option value="">상태 전체</option>
                {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white" placeholder="시작일" />
              <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white" placeholder="종료일" />
            </div>
          </div>

          {/* 테이블 (16컬럼) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {['NO', '파트', '담당자', '행사', '상태', '발주일', '컨펌율', '항목수', 'AI정확도', '확인자', '비고', '편집', '다운로드', '승인', '반려', '보기'].map(h => (
                    <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={16} className="text-center text-slate-400 py-8">조건에 맞는 프로젝트가 없습니다.</td></tr>
                )}
                {filtered.map(p => {
                  const accColor = p.ai_accuracy >= 70 ? 'text-emerald-600' : p.ai_accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-2 py-2">{p.no}</td>
                      <td className="px-2 py-2 max-w-[100px] truncate" title={p.part}>{p.part}</td>
                      <td className="px-2 py-2">{p.pm}</td>
                      <td className="px-2 py-2 max-w-[160px] truncate" title={p.event_name}>
                        <span className="text-slate-900">{p.event_name}</span>
                        <span className="block text-[10px] text-slate-400 truncate">{p.event_venue}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{p.stage}</span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{p.order_date}</td>
                      <td className="px-2 py-2">{p.confirm_rate}%</td>
                      <td className="px-2 py-2">{p.item_count}</td>
                      <td className={`px-2 py-2 font-medium ${accColor}`}>{p.ai_accuracy}%</td>
                      <td className="px-2 py-2">{p.manager}</td>
                      <td className="px-2 py-2 text-[10px] text-emerald-600">{p.note}</td>
                      <td className="px-2 py-2">
                        <Link href={`/projects/${p.id}`} className="text-indigo-600 hover:underline text-[10px]">편집</Link>
                      </td>
                      <td className="px-2 py-2 text-slate-400 text-[10px]">—</td>
                      <td className="px-2 py-2 text-slate-400 text-[10px]">—</td>
                      <td className="px-2 py-2 text-slate-400 text-[10px]">—</td>
                      <td className="px-2 py-2">
                        <Link href={`/projects/${p.id}`} className="text-slate-500 hover:text-indigo-600 inline-flex items-center gap-0.5 text-[10px]">
                          <ExternalLink className="w-3 h-3" /> 보기
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            ※ 편집·다운로드·승인·반려 액션은 다음 사이클에서 RLS 기반 권한 검증과 함께 활성화됩니다.
          </p>
        </section>

        {/* ── 파트별 상태 Stacked Bar ──────────────────────── */}
        <section>
          <h2 className="text-slate-700 text-sm font-semibold mb-3">파트별 상태 분포 (Stacked)</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            {partStageBars.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {partStageBars.map(b => {
                  const total = Math.max(1, b.total)
                  return (
                    <div key={b.part}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">{b.part}</span>
                        <span className="text-slate-500">{b.total}건</span>
                      </div>
                      <div className="flex h-5 rounded-md overflow-hidden bg-slate-100">
                        {b.progress > 0 && (
                          <div className="bg-indigo-500" style={{ width: `${(b.progress / total) * 100}%` }} title={`진행 ${b.progress}건`} />
                        )}
                        {b.done > 0 && (
                          <div className="bg-emerald-500" style={{ width: `${(b.done / total) * 100}%` }} title={`완료 ${b.done}건`} />
                        )}
                        {b.rejected > 0 && (
                          <div className="bg-rose-500" style={{ width: `${(b.rejected / total) * 100}%` }} title={`반려 ${b.rejected}건`} />
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 mt-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-sm" /> 진행</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> 완료</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-sm" /> 반려</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 이번 달 일정 (D-14 ~ D+7) ───────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-700" />
            <h2 className="text-slate-700 text-sm font-semibold">이번 달 일정 (D-14 ~ D+7)</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            {calendar.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">해당 기간 일정이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {calendar.map(c => {
                  const ddayColor =
                    c.dday < 0 ? 'bg-slate-100 text-slate-500' :
                    c.dday === 0 ? 'bg-rose-100 text-rose-700' :
                    c.dday <= 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  const ddayLabel =
                    c.dday < 0 ? `D+${Math.abs(c.dday)}` :
                    c.dday === 0 ? 'D-DAY' :
                    `D-${c.dday}`
                  return (
                    <Link key={c.id} href={`/projects/${c.id}`} className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 transition block">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-slate-900 font-medium text-sm truncate" title={c.name}>{c.name}</span>
                        <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-mono ${ddayColor}`}>{ddayLabel}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{c.event_date}</p>
                      {c.venue && <p className="text-[10px] text-slate-400 truncate">{c.venue}</p>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

function KpiCard({
  icon, label, value, unit, color, note,
}: { icon: React.ReactNode; label: string; value: number; unit: string; color: string; note?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {value}<span className="text-sm font-normal ml-0.5 text-slate-400">{unit}</span>
      </p>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  )
}
