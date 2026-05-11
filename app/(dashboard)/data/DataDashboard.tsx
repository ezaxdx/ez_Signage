'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  LayoutGrid, ArrowLeft, Tag, Shuffle, MapPin, Users, Calendar,
  ChevronRight, Search, FolderOpen, Layers3, Truck, AlertCircle, BarChart3,
  Briefcase, Building2, GraduationCap,
} from 'lucide-react'
import {
  SEED_SIGNAGE_TYPES, SEED_SYNONYMS, SEED_EVENT_HISTORY, SEED_DESIGNERS,
  SEED_EVENT_CATEGORIES, SEED_MATERIAL_DEFAULTS, SEED_LEAD_TIME, SEED_PERFLIST,
  SEED_SIGNAGE_ANALYSIS, NON_STANDARD_MAPPINGS, SEED_LAYOUT_DNA, mapEventCategory,
  computeEventStats, computePmGrouping, computeClientStats, computeEventCategoryStats,
} from '@/lib/data/dashboardSeed'
import { VENUE_LIST } from '@/lib/venueIntel'

// 외부 props는 받지만 빈 배열일 때 시드로 폴백
interface Props {
  signageTypes?: unknown[]
  synonyms?: unknown[]
  designers?: unknown[]
  eventHistory?: unknown[]
  venues?: unknown[]
}

// v8 (2026-05-11): IA 장표 기준 4개 영역으로 재정리 (§13)
// 관리자 페이지 = 운영 KPI / 유저 관리 / 전체 프로젝트 현황 / AI 사용량
// 학습 데이터(시드·동의어·행사장·환경장식물 등)는 /admin/learning 으로 이동
type TabKey = 'kpi' | 'users' | 'projects' | 'ai_usage'
  // 레거시 탭 (학습 관리자로 이동 예정 — 일시 보존)
  | 'overview' | 'signage' | 'synonyms' | 'venues' | 'clients' | 'eventcat' | 'designers' | 'materials' | 'categories' | 'analysis'

// IA 기준 메인 4탭
const TABS: { key: TabKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: 'kpi',      label: '운영 KPI',         icon: BarChart3 },
  { key: 'users',    label: '유저 관리',         icon: Users,     badge: '신규' },
  { key: 'projects', label: '전체 프로젝트 현황', icon: Briefcase },
  { key: 'ai_usage', label: 'AI 사용량',        icon: Layers3,   badge: '신규' },
]

// 레거시 탭 (학습 관리자에 통합 예정 — 임시 ′상세 데이터′ 메뉴로 분리)
const LEGACY_TABS: { key: TabKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: 'overview',   label: '개요',           icon: BarChart3 },
  { key: 'clients',    label: '발주처',         icon: Building2 },
  { key: 'eventcat',   label: '행사분류 통계',  icon: Layers3 },
  { key: 'designers',  label: '디자인 업체',    icon: Users },
  { key: 'materials',  label: '재질',           icon: FolderOpen },
  { key: 'signage',    label: '환경장식물',     icon: Tag },
  { key: 'synonyms',   label: '동의어',         icon: Shuffle },
  { key: 'venues',     label: '행사장',         icon: MapPin },
  { key: 'categories', label: '분류·권장',     icon: Layers3 },
  { key: 'analysis',   label: '실측 분석',      icon: AlertCircle, badge: '시드' },
]

export function DataDashboard(_props: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('kpi')
  const [search, setSearch] = useState('')
  const [showLegacy, setShowLegacy] = useState(false)

  const eventStats = useMemo(() => computeEventStats(), [])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition"
              title="메인 대시보드로 이동"
            >
              <LayoutGrid className="w-4 h-4 text-white" />
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-900 hover:text-indigo-300 font-semibold text-sm tracking-tight transition"
            >
              제작물 리스트 가이드
            </Link>
          </div>
          <Link href="/admin/learning" className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 text-xs transition">
            <GraduationCap className="w-3.5 h-3.5" />
            데이터 학습 관리자
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-300 text-xs transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            프로젝트로
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">관리자 페이지</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            프로젝트 관리(KPI) · 사전 학습 자료(시드 + 누적) · 마스터 데이터
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/admin/learning" className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/40 rounded px-2.5 py-1 transition">
              <ChevronRight className="w-3 h-3" />
              데이터 학습 관리자 (행사장·도면 추가)
            </Link>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 좌측 사이드바 — 페이지 메뉴 (피그마: 각 박스 = 한 페이지) */}
          <aside className="w-52 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">관리자 페이지</p>
              </div>
              <nav className="p-1.5 space-y-0.5">
                {TABS.map(t => {
                  const Icon = t.icon
                  const active = activeTab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition text-left ${
                        active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1">{t.label}</span>
                      {t.badge && (
                        <span className={`text-[9px] rounded px-1 ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{t.badge}</span>
                      )}
                    </button>
                  )
                })}
              </nav>
              <div className="border-t border-slate-200">
                <button
                  onClick={() => setShowLegacy(v => !v)}
                  className="w-full px-3 py-2 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  {showLegacy ? '▾' : '▸'} 상세 데이터 ({LEGACY_TABS.length})
                </button>
                {showLegacy && (
                  <nav className="p-1.5 pt-0 space-y-0.5">
                    {LEGACY_TABS.map(t => {
                      const Icon = t.icon
                      const active = activeTab === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setActiveTab(t.key)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition text-left ${
                            active ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1">{t.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                )}
              </div>
            </div>
          </aside>

          {/* 우측 페이지 컨텐츠 */}
          <div className="flex-1 min-w-0 space-y-5">

        {/* 핵심 통계 8개 (2행) — ′운영 KPI′ 페이지에서만 표시 */}
        {activeTab === 'kpi' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            // 회의록 2차 수정: 실적 매칭·PM 사업부·행사 폴더 제거 (사용 안 함)
            { label: '환경장식물 종류',  value: SEED_SIGNAGE_TYPES.length,    sub: '표준 11종',                  color: 'text-indigo-400' },
            { label: '동의어 매핑',      value: SEED_SYNONYMS.length,         sub: '비표준→표준 변환',           color: 'text-emerald-400' },
            { label: '행사장',           value: VENUE_LIST.length,             sub: '권역·유형 분류',             color: 'text-violet-400' },
            { label: '행사 분류',        value: SEED_EVENT_CATEGORIES.length,  sub: '권장 환경장식물 매핑',       color: 'text-teal-400' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-slate-500 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
        )}

        {/* 검색 (대부분의 탭에서 사용) */}
        {(activeTab === 'synonyms' || activeTab === 'venues' || activeTab === 'clients' || activeTab === 'eventcat') && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* 탭 콘텐츠 */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* v8: IA 메인 4탭 */}
          {activeTab === 'kpi' && <OverviewTab eventStats={eventStats} />}
          {activeTab === 'users' && <UsersTabPlaceholder />}
          {activeTab === 'projects' && <ProjectAdminTab />}
          {activeTab === 'ai_usage' && <AIUsagePlaceholder />}

          {/* 레거시 (학습 관리자 이동 예정) */}
          {activeTab === 'overview' && <OverviewTab eventStats={eventStats} />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'signage' && <SignageTab />}
          {activeTab === 'synonyms' && <SynonymsTab search={search} />}
          {activeTab === 'venues' && <VenuesTab search={search} />}
          {activeTab === 'clients' && <ClientsTab search={search} />}
          {activeTab === 'eventcat' && <EventCategoryStatsTab search={search} />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'materials' && <MaterialsTab />}
          {activeTab === 'designers' && <DesignersTab />}
        </div>

        {/* 하단 — 데이터 수집 계획 (명세 6번 매핑) */}
        <div className="bg-white/50 border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-400 font-semibold text-sm mb-1">AI 사전 교육 자료 — 수집·분석 단계</h2>
          <p className="text-slate-400 text-xs mb-4">우선순위 6번 명세 매핑. 현재 1단계, 분석 자동화는 2단계 예정.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { num: '6.1.a',  title: '폴더명 → 행사 메타',     desc: '행사명 + 프로젝트 코드 자동 추출 (54개)',                status: '✅ 수집됨'  },
              { num: '6.1.b.i',title: '환경장식물 동의어',      desc: '스프링배너=X배너 등 10건 시드 + 향후 보강',               status: '✅ 시드'    },
              { num: '6.1.b.ii',title: '기본 환경장식물 11종',  desc: 'X·I·가로등·통천·가로/세로현수막·포디움·A4/A3',             status: '✅ 정의됨'  },
              { num: '6.1.b.iii', title: '디자인 업체',          desc: '업체명만 DB화, 납기·수정률 메트릭 placeholder',          status: '🟡 명단만'  },
              { num: '6.1.b.iv', title: '재질 기본값',           desc: '환경장식물별 주재질 매핑, 통계 산출 예정',                status: '🟡 기본값'  },
              { num: '6.1.b.v',  title: '납기일 패턴',           desc: 'PM부서·디자인업체·행사장별 평균 — 분석 단계 진입 후',     status: '⏳ 예정'    },
              { num: '6.2.1',   title: 'PM 사업부·부서명',       desc: '수행실적 엑셀에서 추출 — 향후 매핑',                     status: '⏳ 예정'    },
              { num: '6.2.6',   title: '행사분류',              desc: '8종 분류 정의됨, 분류별 권장 환경장식물 매핑',           status: '✅ 시드'    },
            ].map(item => (
              <div key={item.num} className="flex items-start gap-3 p-3 bg-slate-50/40 rounded-lg">
                <span className="text-[10px] font-mono text-indigo-400/70 flex-shrink-0 mt-0.5">{item.num}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800 text-xs font-medium">{item.title}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── 탭 컴포넌트 ────────────────────────────────────────────────
function OverviewTab({ eventStats }: { eventStats: ReturnType<typeof computeEventStats> }) {
  const yearEntries = Object.entries(eventStats.byYear).sort(([a], [b]) => Number(b) - Number(a))
  const tagEntries = Object.entries(eventStats.byTag).sort(([, a], [, b]) => b - a)
  const venueEntries = Object.entries(eventStats.byVenue).sort(([, a], [, b]) => b - a).slice(0, 8)

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Block title="연도별 행사 분포">
          <div className="space-y-1.5">
            {yearEntries.map(([year, count]) => (
              <BarRow key={year} label={`${year}년`} count={count} max={eventStats.total} color="bg-indigo-500" />
            ))}
          </div>
        </Block>
        <Block title="분류 태그">
          <div className="space-y-1.5">
            {tagEntries.map(([tag, count]) => (
              <BarRow
                key={tag} label={tag} count={count} max={eventStats.total}
                color={tag === '핵심' ? 'bg-amber-500' : tag === '미분류' ? 'bg-slate-500' : tag === '해외' ? 'bg-violet-500' : 'bg-emerald-500'}
              />
            ))}
          </div>
        </Block>
        <Block title="자주 쓰인 행사장 TOP 8">
          <div className="space-y-1.5">
            {venueEntries.map(([venue, count]) => (
              <BarRow key={venue} label={venue} count={count} max={eventStats.total} color="bg-sky-500" />
            ))}
          </div>
        </Block>
      </div>

      <div className="bg-slate-50/40 rounded-lg p-4 text-xs text-slate-500 leading-relaxed border border-slate-200">
        <strong className="text-slate-800">현재 데이터 출처:</strong> {' '}
        <code className="text-slate-400">참고자료/환경장식물 행사별/</code> 폴더 직접 매핑 (54건) +
        <code className="text-slate-400"> Ezpmp_수행실적리스트_20260506.xlsx</code> 메타.
        분석(엑셀 파싱 + 이미지 카테고리화)은 명세 8장 2단계에서 자동화 예정.
      </div>
    </div>
  )
}

// v4.1 단위 5-1: 프로젝트 관리 탭 (KPI · 라이브 프로젝트 · 행사장별 분포)
function ProjectAdminTab() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    total: number; active: number; itemCount: number; downloadCount: number; storageMB: number
    rows: Array<{
      id: string; name: string; venue: string; client: string; parts: string[]
      itemCount: number; downloadCount: number; attendees: number | null; eventDate: string | null; storageMB: number
    }>
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { PROGRAM_PART_BY_CODE } = await import('@/lib/programParts')
        const supabase = createClient()
        const [pRes, iRes, uRes] = await Promise.all([
          supabase.from('projects').select('id, name, event_venue, event_date, client_name, program_parts, status, attendees_count'),
          supabase.from('design_items').select('project_id, image_url'),
          supabase.from('usage_logs').select('project_id, feature').in('feature', ['export_excel', 'export_ppt']),
        ])
        if (cancelled) return

        const projects = (pRes.data ?? []) as Array<{ id: string; name: string; event_venue: string | null; event_date: string | null; client_name: string | null; program_parts: string[] | null; status: string | null; attendees_count: number | null }>
        const items = (iRes.data ?? []) as Array<{ project_id: string; image_url: string | null }>
        const usages = (uRes.data ?? []) as Array<{ project_id: string }>

        const itemByPid = new Map<string, number>()
        const imgByPid = new Map<string, number>()
        for (const it of items) {
          itemByPid.set(it.project_id, (itemByPid.get(it.project_id) ?? 0) + 1)
          if (it.image_url) imgByPid.set(it.project_id, (imgByPid.get(it.project_id) ?? 0) + 1)
        }
        const dlByPid = new Map<string, number>()
        for (const u of usages) dlByPid.set(u.project_id, (dlByPid.get(u.project_id) ?? 0) + 1)

        // 스토리지: 시안 이미지 1건 ≈ 200KB 추정
        const totalImages = items.filter(i => i.image_url).length
        const totalStorageMB = Math.round((totalImages * 200) / 1024 * 10) / 10

        const rows = projects.map(p => {
          const partNames = (p.program_parts ?? []).map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c).join(', ')
          const imgs = imgByPid.get(p.id) ?? 0
          return {
            id: p.id,
            name: p.name,
            venue: p.event_venue ?? '—',
            client: p.client_name ?? '—',
            parts: partNames ? [partNames] : [],
            itemCount: itemByPid.get(p.id) ?? 0,
            downloadCount: dlByPid.get(p.id) ?? 0,
            attendees: p.attendees_count,
            eventDate: p.event_date,
            storageMB: Math.round((imgs * 200) / 1024 * 10) / 10,
          }
        }).sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''))

        setStats({
          total: projects.length,
          active: projects.filter(p => p.status && p.status !== '완료').length,
          itemCount: items.length,
          downloadCount: usages.length,
          storageMB: totalStorageMB,
          rows,
        })
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm">불러오는 중…</div>
  if (!stats) return <div className="p-8 text-center text-slate-500 text-sm">데이터 없음</div>

  return (
    <div className="p-5 space-y-4">
      {/* 상단 5 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">전체 프로젝트</p><p className="text-xl font-bold text-slate-800">{stats.total}</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">활성 프로젝트</p><p className="text-xl font-bold text-emerald-700">{stats.active}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">전체 스토리지</p><p className="text-xl font-bold text-amber-700">{stats.storageMB}<span className="text-xs text-slate-500 ml-1">MB</span></p></div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">전체 환경장식물 수</p><p className="text-xl font-bold text-indigo-700">{stats.itemCount}</p></div>
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">전체 다운로드 수</p><p className="text-xl font-bold text-rose-700">{stats.downloadCount}</p></div>
      </div>

      {/* 하단 9컬럼 표 */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-600 text-[11px]">
              <th className="px-2 py-2 text-left font-semibold">프로젝트명</th>
              <th className="px-2 py-2 text-left font-semibold">행사장</th>
              <th className="px-2 py-2 text-left font-semibold">발주처</th>
              <th className="px-2 py-2 text-left font-semibold">행사분류</th>
              <th className="px-2 py-2 text-right font-semibold">환경장식물</th>
              <th className="px-2 py-2 text-right font-semibold">다운로드</th>
              <th className="px-2 py-2 text-right font-semibold">참여인원</th>
              <th className="px-2 py-2 text-left font-semibold">행사일</th>
              <th className="px-2 py-2 text-right font-semibold">스토리지</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">프로젝트 없음</td></tr>
            ) : stats.rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-2 py-1.5 text-slate-800 font-medium truncate max-w-[160px]" title={r.name}>{r.name}</td>
                <td className="px-2 py-1.5 text-slate-600 truncate max-w-[120px]" title={r.venue}>{r.venue}</td>
                <td className="px-2 py-1.5 text-slate-600 truncate max-w-[100px]" title={r.client}>{r.client}</td>
                <td className="px-2 py-1.5 text-slate-600 truncate max-w-[140px]" title={r.parts.join(', ')}>{r.parts.join(', ') || '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{r.itemCount}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{r.downloadCount}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{r.attendees ?? '—'}</td>
                <td className="px-2 py-1.5 text-slate-500 text-[11px]">{r.eventDate ?? '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{r.storageMB > 0 ? `${r.storageMB} MB` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400">스토리지는 시안 이미지 ≈ 200KB 기준 추정값. attendees·storage는 신규 컬럼 — 빈 경우 ′—′ 표시.</p>
    </div>
  )
}


function SignageTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-white/60">
            {['이름', '규격(mm)', '레이아웃', '기본 재질', '카테고리'].map(h => (
              <th key={h} className="text-left text-slate-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEED_SIGNAGE_TYPES.map(s => (
            <tr key={s.id} className="border-b border-slate-200/50 hover:bg-slate-50/30">
              <td className="px-4 py-2.5 text-slate-800 font-medium">{s.name}</td>
              <td className="px-4 py-2.5 text-slate-500 font-mono">{s.width_mm} × {s.height_mm}</td>
              <td className="px-4 py-2.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.layout === '세로' ? 'bg-violet-900/50 text-violet-300' : s.layout === '가로' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-200 text-slate-400'}`}>
                  {s.layout}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-500">{s.default_material}</td>
              <td className="px-4 py-2.5 text-slate-500">{s.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SynonymsTab({ search }: { search: string }) {
  const filtered = SEED_SYNONYMS.filter(s =>
    !search.trim() || s.alias.includes(search) || s.canonical_name.includes(search)
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-white/60">
            {['별칭 (alias)', '표준명 (canonical)', '비고'].map(h => (
              <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">일치 없음</td></tr>
          ) : filtered.map((s, i) => (
            <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-50/30">
              <td className="px-4 py-2.5 text-amber-400">{highlight(s.alias, search)}</td>
              <td className="px-4 py-2.5 text-slate-800 flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                {highlight(s.canonical_name, search)}
              </td>
              <td className="px-4 py-2.5 text-slate-500">{s.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VenuesTab({ search }: { search: string }) {
  const filtered = VENUE_LIST.filter(v =>
    !search.trim() || v.displayName.includes(search) || v.region.includes(search) || v.type.includes(search)
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-white/60">
            {['행사장명', '지역', '유형', '샘플 보유'].map(h => (
              <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(v => (
            <tr key={v.key} className="border-b border-slate-200/50 hover:bg-slate-50/30">
              <td className="px-4 py-2.5 text-slate-800 font-medium">{v.displayName}</td>
              <td className="px-4 py-2.5 text-slate-500">{v.region}</td>
              <td className="px-4 py-2.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-400">{v.type}</span>
              </td>
              <td className="px-4 py-2.5">
                {v.hasSamples
                  ? <span className="text-emerald-400 text-[10px]">✓ 폴더 있음</span>
                  : <span className="text-slate-400 text-[10px]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventsTab({ search }: { search: string }) {
  // 폴더 행사 이력 + 수행실적 매핑 (프로젝트 코드 기준)
  const perfByCode = new Map(SEED_PERFLIST.map(p => [p.code, p]))
  const filtered = SEED_EVENT_HISTORY.filter(e =>
    !search.trim() ||
    e.project_name.includes(search) ||
    (e.project_code ?? '').includes(search) ||
    e.venue.includes(search) ||
    String(e.year ?? '').includes(search) ||
    (e.project_code && perfByCode.get(e.project_code)?.client.includes(search)) ||
    (e.project_code && perfByCode.get(e.project_code)?.pm_team.includes(search))
  )
  return (
    <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-white">
            {['행사명', '코드', '연도', '행사장', '발주처', 'PM 부서', '분류', '자료'].map(h => (
              <th key={h} className="text-left text-slate-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">일치 없음</td></tr>
          ) : filtered.map((e, i) => {
            const perf = e.project_code ? perfByCode.get(e.project_code) : null
            return (
              <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-50/30">
                <td className="px-3 py-2.5 text-slate-800 font-medium max-w-[230px] truncate" title={e.project_name}>{e.project_name}</td>
                <td className="px-3 py-2.5 text-slate-500 font-mono text-[10px]">{e.project_code ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-500">{e.year ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate text-[10px]" title={e.venue}>{e.venue}</td>
                <td className="px-3 py-2.5 max-w-[140px] truncate text-[10px]" title={perf?.client}>
                  {perf
                    ? <span className="text-fuchsia-300">{perf.client}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[10px]">
                  {perf
                    ? <span className="text-rose-300">{perf.pm_team}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    e.category_tag === '핵심' ? 'bg-amber-900/50 text-amber-300' :
                    e.category_tag === '해외' ? 'bg-violet-900/50 text-violet-300' :
                    e.category_tag === '미분류' ? 'bg-slate-200 text-slate-500' :
                    'bg-emerald-900/40 text-emerald-300'
                  }`}>{e.category_tag}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {e.has_excel && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-900/40 text-emerald-300">XLSX</span>}
                    {e.has_image && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-900/40 text-indigo-300">시안</span>}
                    {perf && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-900/40 text-sky-300" title="수행실적 매핑됨">매칭</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CategoriesTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-white/60">
            {['행사 분류', '권장 환경장식물', '메모'].map(h => (
              <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEED_EVENT_CATEGORIES.map(c => {
            const recommended = c.recommended_signage_keys
              .map(k => SEED_SIGNAGE_TYPES.find(s => s.id === k)?.name)
              .filter(Boolean)
            return (
              <tr key={c.id} className="border-b border-slate-200/50 hover:bg-slate-50/30">
                <td className="px-4 py-2.5 text-slate-800 font-medium">{c.label}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {recommended.map(name => (
                      <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300">{name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{c.note}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MaterialsTab() {
  const dist = SEED_SIGNAGE_ANALYSIS.material_distribution
  const max = Math.max(...dist.map(d => d.count), 1)
  return (
    <div className="p-5 space-y-5">
      {/* 표준 종류별 기본 재질 */}
      <div>
        <h3 className="text-slate-800 text-sm font-semibold mb-3">표준 환경장식물별 기본 재질 (명세 6.1.b.iv)</h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-white/60">
                {['환경장식물', '주 재질 (시스템 기본값)', '대체 재질', '실측 출현'].map(h => (
                  <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEED_MATERIAL_DEFAULTS.map(m => {
                const realCount = dist.find(d => d.material === m.primary_material)?.count ?? 0
                return (
                  <tr key={m.signage_type_id} className="border-b border-slate-200/50 hover:bg-slate-50/30">
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{m.signage_name}</td>
                    <td className="px-4 py-2.5 text-slate-400">{m.primary_material}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {m.alternative_materials.length > 0 ? m.alternative_materials.join(', ') : '— (분석 후 추가)'}
                    </td>
                    <td className="px-4 py-2.5 text-[10px]">
                      {realCount > 0
                        ? <span className="text-violet-300">{realCount}건 폴더 분석에서 발견</span>
                        : <span className="text-slate-400 italic">미발견</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 실측 분포 */}
      <div>
        <h3 className="text-slate-800 text-sm font-semibold mb-3">실측 재질 분포 — 폴더 엑셀 281건 분석</h3>
        <div className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
          <div className="space-y-2">
            {dist.map(m => (
              <div key={m.material}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-400 text-xs font-medium">{m.material}</span>
                  <span className="text-slate-500 text-[10px]">{m.count}건 ({m.pct}%)</span>
                </div>
                <div className="bg-white rounded h-1.5 overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${(m.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[10px] mt-3 leading-relaxed">
            ※ "X-배너", "현수막"이 재질 컬럼에 들어간 케이스는 환경장식물 종류명 → 재질 정규화 룰 마련 필요.
          </p>
        </div>
      </div>
    </div>
  )
}

function DesignersTab() {
  return (
    <div className="space-y-4 p-5">
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 flex items-start gap-2 text-xs">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-amber-200/80">
          <strong className="text-amber-300">명세 6.1.b.iii</strong> — 디자인 업체 정보가 거의 없으므로
          현재는 <strong>업체명만 DB화</strong>. 평균 납기 준수율·수정 발생률·평균 수정 횟수·컴펌 소요 일수는
          향후 행사별 폴더 엑셀 파싱 후 자동 산출.
        </div>
      </div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-white/60">
              {['업체명', '납기 준수율', '수정 발생률', '평균 수정 횟수', '컴펌 평균 (일)', '비고'].map(h => (
                <th key={h} className="text-left text-slate-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED_DESIGNERS.map((d, i) => (
              <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-50/30">
                <td className="px-4 py-2.5 text-slate-800 font-medium">{d.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.delivery_compliance_rate ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.revision_rate ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.avg_revision_count ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.avg_confirm_days ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-400 text-[10px]">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeadTimeTab() {
  return (
    <div className="p-5">
      <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-amber-300 font-semibold mb-1">컬럼 조사 결과 — 발주 프로세스 일정 데이터 부재</p>
            <p className="text-amber-200/80 leading-relaxed">
              <code className="text-amber-100">scripts/probe_excel_columns.mjs</code>로 폴더 엑셀 6개 컬럼 조사 결과:
              <strong className="text-amber-100"> 세팅일·철거일·사용기간만 존재, 시안 발주일·컨펌일·출력 발주일 없음</strong>.
              납기 소요일 패턴(D-N 발주/검수/수정/확정)은 명세 6.2.3 "향후 데이터(4P 라이프사이클)" 누적 후 가능.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-slate-50/40 border border-slate-300/50 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-slate-500" />
          <h3 className="text-slate-800 text-sm font-semibold">납기 패턴 — 분석 자동화 예정</h3>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mb-4">
          명세 6.1.b.v + 6.2.3 — PM 부서·디자인 업체·행사장별로 평균 D-N 발주/검토/수정/확정 일수를 산출.
          현재 자료에는 행사 일정(세팅·철거)만 있어 산출 불가. 향후 본 앱의 워크플로우(발주→시안→수정→확정)
          데이터가 누적되면 자동 계산 진입.
        </p>
        {SEED_LEAD_TIME.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { scope: 'PM 부서별',     desc: '부서명 → 평균 발주·확정 D-N 패턴' },
              { scope: '디자인 업체별', desc: '업체명 → 평균 시안 컴펌·수정 일수' },
              { scope: '행사장별',     desc: '행사장 → 표준 제작물 수량·납기 패턴' },
            ].map(p => (
              <div key={p.scope} className="bg-white/60 border border-slate-200 rounded p-3">
                <p className="text-slate-400 text-xs font-medium">{p.scope}</p>
                <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">{p.desc}</p>
                <p className="text-slate-400 text-[9px] mt-2 italic">분석 진입 후 자동 산출</p>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {['범위', '대상', 'D-발주', 'D-검수', 'D-수정', 'D-확정', '샘플'].map(h => (
                  <th key={h} className="text-left text-slate-500 font-medium px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEED_LEAD_TIME.map((l, i) => (
                <tr key={i} className="border-b border-slate-200/50">
                  <td className="px-3 py-2 text-slate-400">{l.scope_type}</td>
                  <td className="px-3 py-2 text-slate-800">{l.scope_value}</td>
                  <td className="px-3 py-2 text-slate-500">{l.avg_d_to_order ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{l.avg_d_to_review ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{l.avg_d_to_revision ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{l.avg_d_to_confirm ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{l.sample_count}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── 실측 분석 탭 (명세 6.1.b.iii.3 + 6.1.b.iv) ─────────────────
function AnalysisTab() {
  const a = SEED_SIGNAGE_ANALYSIS
  const matMax = Math.max(...a.material_distribution.map(m => m.count), 1)
  const sizeMax = Math.max(...a.non_standard_sizes.map(s => s.count), 1)

  return (
    <div className="p-5 space-y-5">
      {/* 핵심 발견 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4">
          <p className="text-emerald-300 text-xs font-semibold mb-1">분석 행사 / 제작물</p>
          <p className="text-2xl font-bold text-emerald-400">{a.parsed_events} / <span className="text-3xl">{a.total_items}</span></p>
          <p className="text-emerald-500/60 text-[10px] mt-1">행사별 폴더의 제작물리스트 엑셀 직접 파싱</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-4">
          <p className="text-amber-300 text-xs font-semibold mb-1">비표준 규격 비율</p>
          <p className="text-2xl font-bold text-amber-400">{a.non_standard_pct}%</p>
          <p className="text-amber-500/60 text-[10px] mt-1">전체 {a.total_items}건 중 {a.non_standard_total}건 (표준 11종 외)</p>
        </div>
        <div className="bg-violet-950/20 border border-violet-900/40 rounded-lg p-4">
          <p className="text-violet-300 text-xs font-semibold mb-1">실측 재질 종류</p>
          <p className="text-2xl font-bold text-violet-400">{a.material_distribution.length}종</p>
          <p className="text-violet-500/60 text-[10px] mt-1">상위: {a.material_distribution.slice(0, 3).map(m => m.material).join(' · ')}</p>
        </div>
      </div>

      {/* 명세 6.1.b.iii.3 답변 */}
      <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-rose-300 font-semibold mb-1">명세 6.1.b.iii.3 결론 — 비표준 규격 다수 여부</p>
            <p className="text-rose-200/80 leading-relaxed">
              <strong className="text-rose-100">답: 다수 — 분석 대상의 약 37%가 표준 11종 외</strong>.
              자주 등장하는 비표준 규격(510×740·100×125·700×150·950×2300 등)은 명패·큐사인·바닥 스티커 등으로 추정.
              표준 환경장식물 종류에 추가 편입 검토 필요. 향후 사용 빈도 추이 확인 후 결정 권장.
            </p>
          </div>
        </div>
      </div>

      {/* 두 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 재질 분포 */}
        <div className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
          <h3 className="text-slate-800 text-sm font-semibold mb-3 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
            실측 재질 분포 (명세 6.1.b.iv)
          </h3>
          <div className="space-y-2">
            {a.material_distribution.map(m => (
              <div key={m.material}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-400 text-xs font-medium">{m.material}</span>
                  <span className="text-slate-500 text-[10px]">{m.count}건 ({m.pct}%)</span>
                </div>
                <div className="bg-white rounded h-1.5 overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${(m.count / matMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[10px] mt-3 leading-relaxed">
            ※ "X-배너", "현수막"이 재질 컬럼에 들어간 케이스는 환경장식물 종류로 표기된 것 — 추후 정규화 필요.
          </p>
        </div>

        {/* 비표준 규격 TOP 17 */}
        <div className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
          <h3 className="text-slate-800 text-sm font-semibold mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            비표준 규격 TOP 17 (명세 6.1.b.iii.3)
          </h3>
          <div className="space-y-1">
            {a.non_standard_sizes.map(s => (
              <div key={s.size} className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400 font-mono w-24 flex-shrink-0">{s.size}</span>
                <div className="flex-1 bg-white rounded h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(s.count / sizeMax) * 100}%` }} />
                </div>
                <span className="text-slate-500 w-7 text-right text-[10px] flex-shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[10px] mt-3 leading-relaxed">
            데이터 출처: <code className="text-slate-500">scripts/parse_signage_lists.mjs</code> 일괄 파싱
          </p>
        </div>
      </div>

      {/* 비표준 규격 → 표준 종류 매핑 룰 (신규) */}
      <div className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
        <h3 className="text-slate-800 text-sm font-semibold mb-3 flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          비표준 규격 → 표준 종류 매핑 룰 (적용됨)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {['비표준 규격', '출현', '추정 종류', '카테고리', '근접 표준', '비고'].map(h => (
                  <th key={h} className="text-left text-slate-500 font-medium px-2 py-1.5 whitespace-nowrap text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NON_STANDARD_MAPPINGS.map(m => {
                const std = m.closest_standard ? SEED_SIGNAGE_TYPES.find(s => s.id === m.closest_standard)?.name : null
                return (
                  <tr key={m.size} className="border-b border-slate-200/40 hover:bg-slate-50/30">
                    <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{m.size}</td>
                    <td className="px-2 py-1.5 text-slate-500 text-[10px]">{m.count}건</td>
                    <td className="px-2 py-1.5 text-slate-400 text-[10px]">{m.inferred_type}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        m.inferred_category === '데이터 오류' ? 'bg-rose-900/40 text-rose-300' :
                        m.inferred_category === '디스플레이' ? 'bg-sky-900/40 text-sky-300' :
                        'bg-emerald-900/40 text-emerald-300'
                      }`}>{m.inferred_category}</span>
                    </td>
                    <td className="px-2 py-1.5 text-emerald-300 text-[10px]">{std ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-2 py-1.5 text-slate-400 text-[10px] max-w-[200px] truncate" title={m.note}>{m.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">
          ※ <code className="text-slate-500">suggestStandardType(w, h)</code> 함수로 임의 규격에도 룰 기반 fallback 매핑 가능 (lib/data/dashboardSeed.ts).
        </p>
      </div>

      {/* 다음 단계 */}
      <div className="bg-white/40 border border-slate-200 rounded-lg p-4">
        <p className="text-slate-400 text-xs font-semibold mb-2">분석 자동화 다음 단계</p>
        <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed">
          <li>• ✅ 비표준 규격 → 표준 종류 매핑 룰 (위 표 + suggestStandardType 함수)</li>
          <li>• 재질 분포 → 환경장식물 종류별 기본 재질 자동 산출 (현재는 단일 기본값)</li>
          <li>• 발주일·납기일 컬럼 파싱 → 명세 6.1.b.v 납기 패턴 — <strong>데이터 부재로 4P 라이프사이클 누적 후</strong></li>
          <li>• 행사장별 typicalItemCount → venueIntel.ts 적용됨 (컨벤션 30~50, 호텔 20~25)</li>
          <li>• 환경장식물 별 공통 양식 (객체 위치/크기) — 명세 6.1.b.ii — Gemini Vision 이미지 분석 (2단계)</li>
        </ul>
      </div>
    </div>
  )
}

// ── PM 사업부·부서 탭 (명세 6.2.1) ─────────────────────────────
function PmTab({ search }: { search: string }) {
  const allGroups = computePmGrouping()
  const groups = !search.trim()
    ? allGroups
    : allGroups.map(g => ({
        ...g,
        teams: g.teams.filter(t =>
          t.name.includes(search) ||
          t.pm_names.some(n => n.includes(search)) ||
          g.division.includes(search)
        )
      })).filter(g => g.teams.length > 0)
  return (
    <div className="p-5 space-y-4">
      <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3 flex items-start gap-2 text-xs text-rose-200/80">
        <Briefcase className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-rose-300">명세 6.2.1</strong> — PM 사업부·부서별 데이터.
          향후 부서별 납기 소요일 패턴(D-N 발주/검수/수정/확정) 분석에 활용.
          현재 17건 매칭 (행사 폴더 ↔ 수행실적 엑셀).
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {groups.map(g => (
          <div key={g.division} className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-800 text-sm font-semibold">{g.division}</h3>
              <span className="text-rose-400 text-xs font-bold">{g.project_count}건</span>
            </div>
            <div className="space-y-2">
              {g.teams.map(t => (
                <div key={t.name} className="bg-white/60 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-medium">{t.name}</span>
                    <span className="text-slate-500 text-[10px]">{t.project_count}건</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.pm_names.map(n => (
                      <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 발주처 탭 (명세 6.2.5) ─────────────────────────────────────
function ClientsTab({ search }: { search: string }) {
  const all = computeClientStats()
  const stats = !search.trim()
    ? all
    : all.filter(c =>
        c.client.includes(search) ||
        c.event_categories.some(ec => ec.includes(search)) ||
        c.projects.some(p => p.includes(search))
      )
  return (
    <div className="p-5 space-y-4">
      <div className="bg-fuchsia-950/20 border border-fuchsia-900/30 rounded-lg p-3 flex items-start gap-2 text-xs text-fuchsia-200/80">
        <Building2 className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-fuchsia-300">명세 6.2.5</strong> — 발주처(클라이언트) 정보.
          발주처별 유사한 행사 순위 추천 + 의뢰 빈도 추적에 활용.
        </div>
      </div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-white/60">
              {['발주처', '의뢰 건수', '최근 연도', '주요 행사분류', '대표 프로젝트'].map(h => (
                <th key={h} className="text-left text-slate-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map(c => (
              <tr key={c.client} className="border-b border-slate-200/50 hover:bg-slate-50/30 align-top">
                <td className="px-4 py-2.5 text-slate-800 font-medium max-w-[200px]">{highlight(c.client, search)}</td>
                <td className="px-4 py-2.5">
                  <span className="text-fuchsia-300 font-semibold">{c.project_count}</span>
                  <span className="text-slate-400 text-[10px] ml-1">건</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{c.recent_year}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1 max-w-[260px]">
                    {c.event_categories.slice(0, 4).map(cat => {
                      const mapped = mapEventCategory(cat)
                      return (
                        <span
                          key={cat}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-900/40 text-fuchsia-300"
                          title={mapped ? `→ ${mapped.recommendedId} (매칭: ${mapped.matchedTerm})` : '추천 카테고리 매핑 없음'}
                        >
                          {highlight(cat, search)}
                          {mapped && <span className="text-fuchsia-500/70 ml-0.5">→{mapped.recommendedId}</span>}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-[10px] max-w-[300px] truncate" title={c.projects.join(' · ')}>
                  {c.projects[0]}
                  {c.projects.length > 1 && <span className="text-slate-400"> 외 {c.projects.length - 1}건</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 행사분류 통계 탭 (명세 6.2.6) ───────────────────────────────
function EventCategoryStatsTab({ search }: { search: string }) {
  const all = computeEventCategoryStats()
  const stats = !search.trim()
    ? all
    : all.filter(s =>
        s.category.includes(search) ||
        s.clients.some(c => c.includes(search))
      )
  const max = Math.max(...stats.map(s => s.project_count), 1)
  return (
    <div className="p-5 space-y-4">
      <div className="bg-teal-950/20 border border-teal-900/30 rounded-lg p-3 flex items-start gap-2 text-xs text-teal-200/80">
        <Layers3 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-teal-300">명세 6.2.6</strong> — 행사분류별 데이터.
          행사 분류 선택 시 해당 환경장식물을 자동 선택 상태로 제공할 예정.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.category} className="bg-slate-50/40 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-800 text-sm font-medium">{s.category}</span>
              <span className="text-teal-300 text-xs font-bold">{s.project_count}건</span>
            </div>
            <div className="bg-white rounded h-1.5 overflow-hidden mb-2">
              <div className="h-full bg-teal-500" style={{ width: `${(s.project_count / max) * 100}%` }} />
            </div>
            <p className="text-slate-500 text-[10px]">
              주요 발주처: <span className="text-slate-500">{s.clients.slice(0, 3).join(', ')}{s.clients.length > 3 && ` 외 ${s.clients.length - 3}곳`}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 레이아웃 DNA 탭 (명세 6.1.b.ii) ─────────────────────────────
function LayoutDnaTab() {
  return (
    <div className="p-5 space-y-5">
      <div className="bg-violet-950/20 border border-violet-900/30 rounded-lg p-3 flex items-start gap-2 text-xs text-violet-200/80">
        <Layers3 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-violet-300">명세 6.1.b.ii</strong> — Gemini Vision으로 환경장식물 시안 이미지 분석.
          {SEED_LAYOUT_DNA.length}개 종류, 총 {SEED_LAYOUT_DNA.reduce((s, d) => s + d.slots.length, 0)}개 슬롯 추출.
          <code className="text-violet-100 ml-1">scripts/batch_vision_analysis.mjs</code>로 일괄 추가 가능.
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SEED_LAYOUT_DNA.map(dna => (
          <div key={dna.type_id} className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-800 text-sm font-semibold">{dna.type_id}</h3>
              <span className="text-violet-400 text-[10px]">{dna.slots.length} 슬롯 · {dna.dominant_color}</span>
            </div>
            <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">{dna.summary}</p>

            {/* 미니 시각화: 0~1000 영역에 슬롯 박스 표시 */}
            <div className="relative bg-white border border-slate-200 rounded mb-3 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
              {dna.slots.map((s, i) => {
                const left = (s.box.xmin / 1000) * 100
                const top = (s.box.ymin / 1000) * 100
                const w = ((s.box.xmax - s.box.xmin) / 1000) * 100
                const h = ((s.box.ymax - s.box.ymin) / 1000) * 100
                const colors: Record<string, string> = {
                  logo:     'bg-amber-500/30 border-amber-500/60',
                  title:    'bg-indigo-500/30 border-indigo-500/60',
                  subtitle: 'bg-sky-500/30 border-sky-500/60',
                  body:     'bg-emerald-500/30 border-emerald-500/60',
                  footer:   'bg-slate-500/30 border-slate-500/60',
                  image:    'bg-violet-500/30 border-violet-500/60',
                  arrow:    'bg-rose-500/30 border-rose-500/60',
                  qr:       'bg-fuchsia-500/30 border-fuchsia-500/60',
                }
                return (
                  <div
                    key={i}
                    className={`absolute border ${colors[s.role] ?? 'bg-slate-200/30 border-slate-600'} flex items-center justify-center`}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                    title={`${s.label} (${s.role})`}
                  >
                    <span className="text-[8px] text-slate-800 truncate px-0.5">{s.label}</span>
                  </div>
                )
              })}
            </div>

            <p className="text-slate-400 text-[10px] leading-relaxed">
              <strong className="text-slate-500">패턴:</strong> {dna.layout_pattern}
            </p>
            <p className="text-slate-400 text-[9px] mt-1 truncate" title={dna.source_file}>
              출처: {dna.source_file}
            </p>
          </div>
        ))}
      </div>

      {/* 역할 색상 범례 */}
      <div className="bg-white/40 border border-slate-200 rounded-lg p-3 flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-slate-500 font-semibold">역할 색상:</span>
        {[
          { role: 'logo', color: 'bg-amber-500/60', label: '로고' },
          { role: 'title', color: 'bg-indigo-500/60', label: '타이틀' },
          { role: 'subtitle', color: 'bg-sky-500/60', label: '부제' },
          { role: 'body', color: 'bg-emerald-500/60', label: '본문' },
          { role: 'image', color: 'bg-violet-500/60', label: '이미지' },
          { role: 'arrow', color: 'bg-rose-500/60', label: '화살표' },
          { role: 'qr', color: 'bg-fuchsia-500/60', label: 'QR' },
          { role: 'footer', color: 'bg-slate-500/60', label: '푸터' },
        ].map(r => (
          <span key={r.role} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${r.color}`} />
            <span className="text-slate-500">{r.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// 검색 하이라이트 헬퍼
function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-500/30 text-amber-200 px-0.5 rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ── 공통 UI ────────────────────────────────────────────────────
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
      <p className="text-slate-400 text-xs font-semibold mb-3">{title}</p>
      {children}
    </div>
  )
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-slate-500 w-20 truncate flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-white rounded h-2 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 w-7 text-right flex-shrink-0">{count}</span>
    </div>
  )
}

// ─── v8: IA 메인 4탭 — 유저 관리 ───
function UsersTabPlaceholder() {
  const [users, setUsers] = useState<Array<{ id: string; email: string; display_name: string | null; role: string; department?: string | null; position?: string | null; created_at: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        setUsers((data ?? []) as typeof users)
        setLoading(false)
      })
    })
  }, [])

  const total = users.length
  const admins = users.filter(u => u.role === 'admin').length
  const members = total - admins

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">전체 유저</p><p className="text-xl font-bold text-slate-800">{total}</p></div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">일반 멤버</p><p className="text-xl font-bold text-slate-700">{members}</p></div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">관리자</p><p className="text-xl font-bold text-indigo-700">{admins}</p></div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-600 text-[11px]">
              <th className="px-3 py-2 text-left font-semibold">이름</th>
              <th className="px-3 py-2 text-left font-semibold">역할</th>
              <th className="px-3 py-2 text-left font-semibold">부서</th>
              <th className="px-3 py-2 text-left font-semibold">직위</th>
              <th className="px-3 py-2 text-left font-semibold">이용자 ID</th>
              <th className="px-3 py-2 text-left font-semibold">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">불러오는 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">등록된 사용자 없음</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">{u.display_name ?? u.email.split('@')[0]}</td>
                <td className="px-3 py-2">{u.role === 'admin' ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">관리자</span> : <span className="text-[10px] text-slate-500">멤버</span>}</td>
                <td className="px-3 py-2 text-slate-600">{u.department ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{u.position ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 text-[11px] font-mono">{u.email}</td>
                <td className="px-3 py-2 text-slate-500 text-[11px]">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AIUsagePlaceholder() {
  const [stats, setStats] = useState<{ totalCalls: number; totalCost: number; totalTokens: number; byDay: Array<{ day: string; count: number }>; byFeature: Array<{ feature: string; count: number }> }>({
    totalCalls: 0, totalCost: 0, totalTokens: 0, byDay: [], byFeature: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.from('usage_logs').select('*').order('created_at', { ascending: false }).limit(1000).then(({ data }) => {
        const rows = (data ?? []) as Array<{ feature?: string; tokens?: number; cost?: number; created_at: string }>
        const totalCalls = rows.length
        const totalCost = rows.reduce((sum, r) => sum + (r.cost ?? 0), 0)
        const totalTokens = rows.reduce((sum, r) => sum + (r.tokens ?? 0), 0)
        const byDayMap: Record<string, number> = {}
        const byFeatureMap: Record<string, number> = {}
        for (const r of rows) {
          const day = r.created_at.slice(0, 10)
          byDayMap[day] = (byDayMap[day] ?? 0) + 1
          const f = r.feature ?? '기타'
          byFeatureMap[f] = (byFeatureMap[f] ?? 0) + 1
        }
        const byDay = Object.entries(byDayMap).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14).reverse().map(([day, count]) => ({ day, count }))
        const byFeature = Object.entries(byFeatureMap).sort((a, b) => b[1] - a[1]).map(([feature, count]) => ({ feature, count }))
        setStats({ totalCalls, totalCost, totalTokens, byDay, byFeature })
        setLoading(false)
      })
    })
  }, [])

  const maxDay = Math.max(1, ...stats.byDay.map(d => d.count))

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">총 API 호출 수</p><p className="text-xl font-bold text-slate-800">{stats.totalCalls.toLocaleString()}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">총 비용 (원)</p><p className="text-xl font-bold text-amber-700">{Math.round(stats.totalCost * 1300).toLocaleString()}</p><p className="text-[9px] text-slate-400">≈ ${stats.totalCost.toFixed(2)}</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"><p className="text-[10px] text-slate-500">총 토큰 수</p><p className="text-xl font-bold text-emerald-700">{stats.totalTokens.toLocaleString()}</p></div>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-700 mb-3">일별 사용량 (최근 14일)</h4>
        {loading ? <p className="text-center text-slate-400 text-xs py-6">불러오는 중...</p>
         : stats.byDay.length === 0 ? <p className="text-center text-slate-400 text-xs py-6">기록 없음</p>
         : (
          <div className="flex items-end gap-1 h-32">
            {stats.byDay.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}회`}>
                <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                <span className="text-[9px] text-slate-400">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-700 mb-3">기능별 사용량</h4>
        {stats.byFeature.length === 0 ? <p className="text-center text-slate-400 text-xs py-3">기록 없음</p>
         : (
          <ul className="space-y-1.5 text-xs">
            {stats.byFeature.map(f => (
              <li key={f.feature} className="flex items-center justify-between">
                <span className="text-slate-700">{f.feature}</span>
                <span className="text-slate-500 font-semibold">{f.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
