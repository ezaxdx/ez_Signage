'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutGrid, ArrowLeft, GraduationCap, MapPin, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, Clock, FileText, Inbox, Building2,
  Sparkles, Flag, BarChart3, TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { explainStorageError } from '@/lib/services/storagePaths'
import { REGION_ORDER } from '@/lib/venueIntel'

// ── 타입 ──────────────────────────────────────────────────────
interface Venue {
  id: string
  name: string
  region: string | null
  venue_type: string | null
  has_hall_split: boolean
  main_entrance_note: string | null
  area_sqm: number | null
  floor_plan_url: string | null
  created_at: string
}

interface VenueRequest {
  id: string
  name: string
  region: string | null
  venue_type: string | null
  floor_plan_url: string | null
  hall_split_requested: boolean
  notes: string | null
  requested_by: string | null
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
}

interface LearningJob {
  id: string
  job_type: 'floor_plan_analyze' | 'signage_pattern' | 'venue_meta'
  venue_id: string | null
  source_url: string | null
  status: 'queued' | 'processing' | 'done' | 'failed' | 'skipped'
  triggered_at: string
  completed_at: string | null
  error_message: string | null
}

interface VenueLearningStatus {
  venue: string
  project_count: number
  item_count: number
  stage: { input: number; mid: number; confirmed: number; finalized: number }
  accuracy_estimate: number   // 0~100
  learned_categories: number
  program_parts?: string[]
  /** v9.22: 6대 표준 카테고리 학습 현황 (외벽·게이트·가로등·X배너·천정·부속시설) */
  category_coverage?: {
    filled: string[]    // 학습된 카테고리 한글 라벨
    missing: string[]   // 미학습 카테고리 한글 라벨
    priority_1_missing: string[]  // 우선순위 1 (외벽·천정) 누락 표시용
  }
}

interface SynonymRow {
  alias: string
  canonical_name: string
  note?: string
}

interface FacilityGuideRow {
  venue_key: string
  venue_name: string
  categories_count: number
  warnings_count: number
  completeness: number   // 0~6
  last_updated?: string
  /** DB에서 매칭된 venue id (AI 추출 버튼에서 사용) */
  venue_id?: string
  /** specs_text 존재 여부 (AI 추출 버튼 활성화 조건) */
  has_specs_text?: boolean
}

interface CorrectionRequest {
  id: string
  venue_key: string
  venue_name: string | null
  correction_text: string
  status: string
  created_at: string
}

interface DbAlias {
  id: string
  alias_name: string
  canonical_name: string
  note: string | null
}

interface SignageTypeRow {
  id: string
  name: string
  width_mm: number
  height_mm: number
  default_material: string
  category: string
  layout: string
}

interface Props {
  userId: string
  initialVenues: Venue[]
  initialRequests: VenueRequest[]
  initialJobs: LearningJob[]
  venueLearningStatus?: VenueLearningStatus[]
  signageTypeCount?: number
  synonyms?: SynonymRow[]
  dbAliases?: DbAlias[]
  facilityGuideStatus?: FacilityGuideRow[]
  signageTypes?: SignageTypeRow[]
  isAdmin?: boolean
}

const VENUE_TYPES = ['컨벤션센터', '호텔', '전시장', '야외', '공공시설', '기타'] as const
// 행정 표준: 광역시 8 + 도 9 + 해외 (사용자 피드백 2026-05-13 — "지방" → 정확한 도 이름)
const REGIONS = REGION_ORDER

export function LearningManagerClient({
  userId, initialVenues, initialRequests, initialJobs,
  venueLearningStatus = [],
  signageTypeCount = 0,
  synonyms = [],
  dbAliases = [],
  facilityGuideStatus = [],
  signageTypes = [],
  isAdmin = false,
}: Props) {
  // ── 시설 가이드 AI 추출 상태 ────────────────────────────────
  const [extractingVenueId, setExtractingVenueId] = useState<string | null>(null)
  const [extractSuccessId, setExtractSuccessId] = useState<string | null>(null)

  // ── 예외 빈도 모니터 ────────────────────────────────────────
  interface ExceptionAlert {
    venue: string; rule: string; field: string
    standard_value: string | null; user_value: string | null
    count: number; finalized_count: number; needs_review: boolean
  }
  const [exceptionAlerts, setExceptionAlerts] = useState<ExceptionAlert[]>([])
  const [exceptionLoading, setExceptionLoading] = useState(false)

  // ── 수정 요청 목록 ────────────────────────────────────────────
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([])
  const [correctionLoading, setCorrectionLoading] = useState(false)

  const [synonymFilter, setSynonymFilter] = useState('')
  const [aliasList, setAliasList] = useState<DbAlias[]>(dbAliases)
  const [newAlias, setNewAlias] = useState('')
  const [newCanon, setNewCanon] = useState('')
  const [aliasSaving, setAliasSaving] = useState(false)

  // ── 환경장식물 종류 ───────────────────────────────────────────
  const [signageTypeList, setSignageTypeList] = useState<SignageTypeRow[]>(signageTypes)
  const [stName, setStName] = useState('')
  const [stWidth, setStWidth] = useState('')
  const [stHeight, setStHeight] = useState('')
  const [stMaterial, setStMaterial] = useState('인쇄')
  const [stCategory, setStCategory] = useState('기타')
  const [stLayout, setStLayout] = useState<'세로' | '가로' | '정사각'>('세로')
  const [stSaving, setStSaving] = useState(false)
  const [stError, setStError] = useState<string | null>(null)
  const [stShowForm, setStShowForm] = useState(false)

  const addSignageType = async () => {
    if (!stName.trim() || !stWidth || !stHeight) { setStError('종류명·너비·높이는 필수입니다.'); return }
    setStSaving(true); setStError(null)
    try {
      const res = await fetch('/api/admin/signage-types', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: stName.trim(), width_mm: stWidth, height_mm: stHeight, default_material: stMaterial, category: stCategory, layout: stLayout }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
      const newRow: SignageTypeRow = {
        id: stName.trim().toLowerCase().replace(/[\s\-]/g, '_'),
        name: stName.trim(), width_mm: Number(stWidth), height_mm: Number(stHeight),
        default_material: stMaterial, category: stCategory, layout: stLayout,
      }
      setSignageTypeList(prev => [...prev, newRow])
      setStName(''); setStWidth(''); setStHeight(''); setStMaterial('인쇄'); setStCategory('기타'); setStLayout('세로')
      setStShowForm(false)
    } catch (e) { setStError(e instanceof Error ? e.message : '오류') }
    finally { setStSaving(false) }
  }

  const deleteSignageType = async (name: string) => {
    if (!confirm(`'${name}' 종류를 삭제하시겠습니까?`)) return
    try {
      const res = await fetch('/api/admin/signage-types', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
      setSignageTypeList(prev => prev.filter(t => t.name !== name))
    } catch (e) { alert(e instanceof Error ? e.message : '삭제 실패') }
  }
  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [requests, setRequests] = useState<VenueRequest[]>(initialRequests)
  const [jobs, setJobs] = useState<LearningJob[]>(initialJobs)
  const [migrationMissing, setMigrationMissing] = useState(initialVenues.length === 0 && initialJobs.length === 0)
  // v9.29: 명세 IA 5섹션 재정렬 (docs/ADMIN_REDESIGN_260513.md §2)
  // 1) 개요 — 학습 누적 그래프 · 단계별 분포 · 정확도 추이
  // 2) 행사장 학습 현황 — venue별 누적 + 카테고리 학습
  // 3) 행사장 마스터 — 행사장 관리(추가/신규 요청/도면 학습 큐) + 시설 가이드 + 수정 요청 통합
  // 4) 동의어 — 매핑 표 + 환경장식물 종류 관리
  type SectionKey = 'overview' | 'venue-status' | 'venues' | 'facility-guides' | 'correction-requests' | 'signage-types' | 'synonyms'
  const [activeSection, setActiveSection] = useState<SectionKey>('overview')

  // 시설 가이드 섹션 진입 시 예외 빈도 조회
  useEffect(() => {
    if (activeSection !== 'facility-guides') return
    setExceptionLoading(true)
    fetch('/api/admin/exception-monitor')
      .then(r => r.json())
      .then(d => setExceptionAlerts(d.alerts ?? []))
      .catch(() => setExceptionAlerts([]))
      .finally(() => setExceptionLoading(false))
  }, [activeSection])

  // 수정 요청 섹션 진입 시 API 조회
  useEffect(() => {
    if (activeSection !== 'correction-requests') return
    setCorrectionLoading(true)
    fetch('/api/correction-requests')
      .then(r => r.json())
      .then((data: CorrectionRequest[]) => { setCorrectionRequests(Array.isArray(data) ? data : []) })
      .catch(() => setCorrectionRequests([]))
      .finally(() => setCorrectionLoading(false))
  }, [activeSection])

  // 명세 5섹션 IA — 그룹 구분 (사이드바 시각 분리)
  const SECTIONS: { key: SectionKey; label: string; icon: typeof GraduationCap; group: '개요' | '행사장' | '동의어' }[] = [
    // 1) 개요 (학습 누적·정확도 추이)
    { key: 'overview',             label: '개요',             icon: BarChart3,    group: '개요' },
    // 2) 행사장별 학습 현황 (단계별 분포 · 카테고리 학습)
    { key: 'venue-status',         label: '행사장 학습 현황', icon: GraduationCap, group: '개요' },
    // 3) 행사장 마스터 관리 (추가/요청 대기/도면 학습 큐/시설 가이드/예외 패턴)
    { key: 'venues',               label: '행사장 관리',     icon: Building2,    group: '행사장' },
    { key: 'facility-guides',      label: '시설 가이드',     icon: AlertCircle,  group: '행사장' },
    { key: 'correction-requests',  label: '수정 요청',       icon: Flag,         group: '행사장' },
    // 4) 동의어 마스터 + 환경장식물 종류
    { key: 'synonyms',             label: '동의어 매핑',     icon: FileText,     group: '동의어' },
    { key: 'signage-types',        label: '환경장식물 종류', icon: Inbox,        group: '동의어' },
  ]

  // ── 행사장 추가 폼 ───────────────────────────────────────
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [venueType, setVenueType] = useState('')
  const [hallSplit, setHallSplit] = useState(false)
  const [entranceNote, setEntranceNote] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [floorPlan, setFloorPlan] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const resetForm = () => {
    setName(''); setRegion(''); setVenueType(''); setHallSplit(false)
    setEntranceNote(''); setAreaSqm(''); setFloorPlan(null); setAddError(null)
  }

  const addVenue = async () => {
    if (!name.trim()) { setAddError('행사장 이름을 입력하세요.'); return }
    setAdding(true); setAddError(null)
    try {
      const supabase = createClient()
      let floorPlanUrl: string | null = null
      if (floorPlan) {
        const ext = (floorPlan.name.split('.').pop() || 'bin').toLowerCase()
        const path = `${userId}/admin-venues/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('design-images').upload(path, floorPlan, { contentType: floorPlan.type || undefined, upsert: false })
        if (upErr) {
          setAddError('도면 업로드 실패: ' + explainStorageError(upErr.message))
          setAdding(false); return
        }
        const { data: pub } = supabase.storage.from('design-images').getPublicUrl(path)
        floorPlanUrl = pub.publicUrl
      }
      const { data: venue, error: insErr } = await supabase.from('venues').insert({
        name: name.trim(),
        region: region || null,
        venue_type: venueType || null,
        has_hall_split: hallSplit,
        main_entrance_note: entranceNote.trim() || null,
        area_sqm: areaSqm ? parseInt(areaSqm) : null,
        floor_plan_url: floorPlanUrl,
        created_by: userId,
      }).select().single()
      if (insErr) {
        if (/relation .* does not exist/i.test(insErr.message)) {
          setAddError('venues 테이블이 없습니다. supabase/migration_v6_v4_1.sql을 실행하세요.')
          setMigrationMissing(true)
        } else {
          setAddError(insErr.message)
        }
        return
      }
      setVenues(prev => [venue as Venue, ...prev])

      // 도면이 있으면 자동 학습 큐 INSERT (스켈레톤 — 실제 Vision 호출은 다음 사이클)
      if (floorPlanUrl && venue) {
        const { data: job, error: jobErr } = await supabase.from('learning_jobs').insert({
          job_type: 'floor_plan_analyze',
          venue_id: venue.id,
          source_url: floorPlanUrl,
          status: 'queued',
          triggered_by: userId,
        }).select().single()
        if (!jobErr && job) {
          setJobs(prev => [job as LearningJob, ...prev])
        }
      }
      resetForm()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '실패')
    } finally {
      setAdding(false)
    }
  }

  // ── 사용자 요청 승인/반려 ────────────────────────────────
  const approveRequest = async (req: VenueRequest) => {
    const supabase = createClient()
    // 1. venues에 INSERT (도면 URL 포함)
    const { data: venue, error: insErr } = await supabase.from('venues').insert({
      name: req.name,
      region: req.region,
      venue_type: req.venue_type,
      has_hall_split: req.hall_split_requested,
      floor_plan_url: req.floor_plan_url,
      created_by: userId,
    }).select().single()
    if (insErr) { alert('venues 생성 실패: ' + insErr.message); return }
    setVenues(prev => [venue as Venue, ...prev])
    // 2. venue_requests 업데이트
    await supabase.from('venue_requests').update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      approved_venue_id: venue?.id,
    }).eq('id', req.id)
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    // 3. 도면 있으면 학습 큐 INSERT
    if (req.floor_plan_url && venue) {
      const { data: job } = await supabase.from('learning_jobs').insert({
        job_type: 'floor_plan_analyze',
        venue_id: venue.id,
        source_url: req.floor_plan_url,
        status: 'queued',
        triggered_by: userId,
      }).select().single()
      if (job) setJobs(prev => [job as LearningJob, ...prev])
    }
  }

  const rejectRequest = async (req: VenueRequest) => {
    const reason = window.prompt('반려 사유 (선택):') ?? ''
    const supabase = createClient()
    await supabase.from('venue_requests').update({
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason || null,
    }).eq('id', req.id)
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected', reject_reason: reason || null } : r))
  }

  // ── 학습 큐 재트리거 ──────────────────────────────────────
  const retriggerJob = async (venue: Venue) => {
    if (!venue.floor_plan_url) { alert('도면이 없는 행사장입니다.'); return }
    const supabase = createClient()
    const { data: job, error } = await supabase.from('learning_jobs').insert({
      job_type: 'floor_plan_analyze',
      venue_id: venue.id,
      source_url: venue.floor_plan_url,
      status: 'queued',
      triggered_by: userId,
    }).select().single()
    if (error) { alert(error.message); return }
    if (job) setJobs(prev => [job as LearningJob, ...prev])
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition">
              <LayoutGrid className="w-4 h-4 text-white" />
            </Link>
            <Link href="/dashboard" className="text-slate-900 hover:text-indigo-300 font-semibold text-sm tracking-tight transition">
              제작물 리스트 가이드
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-300 text-xs transition">
              관리자 페이지
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-300 text-xs transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              프로젝트로
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-900">데이터 학습 관리자</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            행사장과 도면을 등록·관리합니다.
          </p>
        </div>

        {/* ── KPI 3카드 (§13-3 — 행사장/환경장식물/동의어) ───── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10px] text-slate-500">학습된 행사장</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{initialVenues.length}<span className="text-sm text-slate-400 ml-1">개</span></p>
            <p className="text-[10px] text-slate-400 mt-1">신규 요청 대기 {initialRequests.filter(r => r.status === 'pending').length}건</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10px] text-slate-500">환경장식물 종류</p>
            <p className="text-2xl font-bold text-indigo-700 mt-0.5">{signageTypeCount}<span className="text-sm text-slate-400 ml-1">종</span></p>
            <p className="text-[10px] text-slate-400 mt-1">기본 표준 (편집·삭제는 시드 데이터)</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10px] text-slate-500">동의어 매핑</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{synonyms.length}<span className="text-sm text-slate-400 ml-1">건</span></p>
            <p className="text-[10px] text-slate-400 mt-1">비표준명 → 표준명 자동 변환</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 좌측 사이드바 — 페이지 전환 (피그마: 각 박스 = 한 페이지) */}
          <aside className="w-52 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">데이터 학습 관리자</p>
              </div>
              <nav className="p-1.5 space-y-2">
                {(['개요', '행사장', '동의어'] as const).map(group => (
                  <div key={group} className="space-y-0.5">
                    <p className="px-2 pt-1 text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{group}</p>
                    {SECTIONS.filter(s => s.group === group).map(s => {
                      const Icon = s.icon
                      const active = activeSection === s.key
                      return (
                        <button
                          key={s.key}
                          onClick={() => setActiveSection(s.key)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition text-left ${
                            active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="flex-1">{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* 우측 페이지 컨텐츠 */}
          <div className="flex-1 min-w-0 space-y-5">

        {migrationMissing && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-amber-900 text-xs leading-relaxed">
              <p className="font-semibold mb-1 text-amber-800">v6 마이그레이션 미적용</p>
              <p>Supabase Studio에서 <code className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono">supabase/migration_v6_v4_1.sql</code>을 실행한 뒤 새로고침해주세요.</p>
              <p className="mt-1 text-amber-700">venues / venue_requests / learning_jobs 테이블을 생성합니다.</p>
            </div>
          </div>
        )}

        {activeSection === 'overview' && <>
        {/* ── v9.29: 개요 (명세 §2-2) — 학습 누적 / 단계별 분포 / 정확도 추이 ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            개요
          </h2>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            전체 학습 누적 그래프 · 단계별 분포(입력 10% / 중간 30% / 컨펌 70% / 완료 100%) · AI 추천 정확도 추이.
          </p>

          {/* 학습 행사장 TOP 10 누적 그래프 */}
          <div className="space-y-5">
            <div>
              <h3 className="text-slate-700 text-xs font-semibold mb-2">학습 누적 (행사장별 항목 수 TOP 10)</h3>
              {venueLearningStatus.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-4 text-center">아직 누적된 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {venueLearningStatus.slice(0, 10).map(v => {
                    const max = Math.max(1, ...venueLearningStatus.slice(0, 10).map(x => x.item_count))
                    const ratio = (v.item_count / max) * 100
                    return (
                      <div key={v.venue}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-slate-700 truncate max-w-[200px]">{v.venue}</span>
                          <span className="text-slate-500 font-mono">{v.item_count}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-md overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 단계별 분포 (전체 누적) */}
            <div>
              <h3 className="text-slate-700 text-xs font-semibold mb-2">단계별 분포 (전체 누적)</h3>
              {(() => {
                const totals = venueLearningStatus.reduce(
                  (acc, v) => ({
                    input: acc.input + v.stage.input,
                    mid: acc.mid + v.stage.mid,
                    confirmed: acc.confirmed + v.stage.confirmed,
                    finalized: acc.finalized + v.stage.finalized,
                  }),
                  { input: 0, mid: 0, confirmed: 0, finalized: 0 }
                )
                const total = Math.max(1, totals.input + totals.mid + totals.confirmed + totals.finalized)
                const stages = [
                  { label: '입력 (10%)', value: totals.input, color: 'bg-slate-400', text: 'text-slate-700' },
                  { label: '중간 (30%)', value: totals.mid, color: 'bg-amber-400', text: 'text-amber-700' },
                  { label: '컨펌 (70%)', value: totals.confirmed, color: 'bg-indigo-500', text: 'text-indigo-700' },
                  { label: '완료 (100%)', value: totals.finalized, color: 'bg-emerald-500', text: 'text-emerald-700' },
                ]
                return (
                  <>
                    <div className="h-6 flex rounded-md overflow-hidden bg-slate-100">
                      {stages.map(s => (
                        s.value > 0 && (
                          <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}건`} />
                        )
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {stages.map(s => (
                        <div key={s.label} className="border border-slate-200 rounded-md px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-sm ${s.color}`} />
                            <span className="text-[10px] text-slate-500">{s.label}</span>
                          </div>
                          <p className={`text-lg font-bold ${s.text}`}>{s.value}<span className="text-xs text-slate-400 ml-0.5">건</span></p>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* AI 정확도 추이 (행사장별 추정) */}
            <div>
              <h3 className="text-slate-700 text-xs font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                AI 추천 정확도 추이 (행사장별, rolling)
              </h3>
              {venueLearningStatus.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-4 text-center">데이터 없음</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50">
                      <tr className="text-slate-600">
                        <th className="px-2 py-1.5 text-left font-semibold">행사장</th>
                        <th className="px-2 py-1.5 text-left font-semibold">정확도 진행</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-16">값</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {venueLearningStatus.slice(0, 8).map(v => {
                        const acc = v.accuracy_estimate
                        const color = acc >= 70 ? 'bg-emerald-500' : acc >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        const textColor = acc >= 70 ? 'text-emerald-700' : acc >= 40 ? 'text-amber-700' : 'text-rose-700'
                        return (
                          <tr key={v.venue}>
                            <td className="px-2 py-1.5 text-slate-700 truncate max-w-[200px]" title={v.venue}>{v.venue}</td>
                            <td className="px-2 py-1.5">
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${color}`} style={{ width: `${acc}%` }} />
                              </div>
                            </td>
                            <td className={`px-2 py-1.5 text-right font-mono font-semibold ${textColor}`}>{acc}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                ※ 행사장 정확도 = (입력×10 + 중간×30 + 컨펌×70 + 완료×100) / 전체. 누적 데이터 증가에 따라 자동 갱신됩니다.
              </p>
            </div>
          </div>
        </section>
        </>}
        {activeSection === 'venue-status' && <>
        {/* ── 0. 행사장별 학습 현황 — 점진적 정확도 가시화 (★ v9) ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            행사장별 학습 현황
          </h2>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            행사장별 누적 데이터. 카테고리 학습 컬럼은 시설 가이드 시드 + 천정배너 실측 패턴 기준으로 6대 표준 카테고리(외벽·게이트·가로등·X배너·천정·부속시설) 학습 현황을 표시합니다. 빨간색(!) 라벨은 우선순위 1 (외벽·천정) 누락 표시입니다.
          </p>
          {venueLearningStatus.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-4 text-center">아직 누적된 프로젝트가 없습니다. 신규 프로젝트가 생성되면 5분 이내 반영됩니다.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-2 text-left font-semibold">행사장</th>
                    <th className="px-2 py-2 text-right font-semibold">프로젝트</th>
                    <th className="px-2 py-2 text-right font-semibold">전체 항목</th>
                    <th className="px-2 py-2 text-right font-semibold" title="아직 위치·목적도 미입력 (가중치 10%)">입력</th>
                    <th className="px-2 py-2 text-right font-semibold" title="위치·목적 등 일부 입력 (가중치 30%)">중간</th>
                    <th className="px-2 py-2 text-right font-semibold" title="사용자 컨펌 (가중치 70%)">컨펌</th>
                    <th className="px-2 py-2 text-right font-semibold" title="발주·다운로드 완료 (가중치 100% — 정답풀)">완료</th>
                    <th className="px-2 py-2 text-right font-semibold">정확도 추정</th>
                    <th className="px-2 py-2 text-left font-semibold" title="6대 표준 카테고리 학습 현황 (외벽·게이트·가로등·X배너·천정·부속시설)">카테고리 학습</th>
                    <th className="px-2 py-2 text-left font-semibold" title="이 행사장 프로젝트에 사용된 프로그램 파트">프로그램 파트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venueLearningStatus.map(v => {
                    const acc = v.accuracy_estimate
                    const color = acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-rose-600'
                    const parts = v.program_parts ?? []
                    const cov = v.category_coverage
                    return (
                      <tr key={v.venue} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-800 font-medium truncate max-w-[160px]" title={v.venue}>{v.venue}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{v.project_count}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{v.item_count}</td>
                        <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{v.stage.input}</td>
                        <td className="px-2 py-1.5 text-right text-amber-600 font-mono">{v.stage.mid}</td>
                        <td className="px-2 py-1.5 text-right text-indigo-600 font-mono">{v.stage.confirmed}</td>
                        <td className="px-2 py-1.5 text-right text-emerald-600 font-mono font-semibold">{v.stage.finalized}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${color}`}>{acc}%</td>
                        <td className="px-2 py-1.5 text-left">
                          {!cov ? (
                            <span className="text-slate-300 text-[10px]">시설 가이드 미등록</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-600 font-mono">
                                <span className="text-emerald-600 font-semibold">{cov.filled.length}</span>
                                /6 학습
                              </span>
                              {cov.filled.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {cov.filled.map(c => (
                                    <span key={c} className="inline-block px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded">{c}</span>
                                  ))}
                                </div>
                              )}
                              {cov.missing.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {cov.missing.map(c => {
                                    const isP1 = cov.priority_1_missing.includes(c)
                                    return (
                                      <span key={c} className={`inline-block px-1 py-0.5 text-[9px] rounded ${isP1 ? 'bg-rose-50 text-rose-700 font-semibold' : 'bg-slate-100 text-slate-500'}`} title={isP1 ? '우선순위 1 — 보강 필요' : '미학습'}>
                                        {isP1 ? '!' : ''}{c}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-left">
                          {parts.length === 0 ? (
                            <span className="text-slate-300 text-[10px]">미입력</span>
                          ) : (
                            <div className="flex flex-wrap gap-0.5">
                              {parts.map(pt => (
                                <span key={pt} className="inline-block px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded">{pt}</span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}
        {activeSection === 'venues' && <>
        {/* ── 1. 행사장 추가 ──────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            행사장 추가
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 text-[11px] mb-1">이름 <span className="text-indigo-400">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="예: BEXCO 1전시장" className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">권역</label>
                <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-2 text-slate-900 text-sm">
                  <option value="">선택</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">유형</label>
                <select value={venueType} onChange={e => setVenueType(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-2 text-slate-900 text-sm">
                  <option value="">선택</option>
                  {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] mb-1">주출입구 메모 (선택)</label>
              <input value={entranceNote} onChange={e => setEntranceNote(e.target.value)} placeholder="예: 1층 정문 동측, 지하 주차장 연결" className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">면적 (㎡, 선택)</label>
                <input type="number" value={areaSqm} onChange={e => setAreaSqm(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer pt-6">
                <input type="checkbox" checked={hallSplit} onChange={e => setHallSplit(e.target.checked)} />
                <span>홀 단위 분리</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 text-[11px] mb-1">도면 첨부 (PDF/이미지)</label>
              <input type="file" accept=".pdf,image/*" onChange={e => setFloorPlan(e.target.files?.[0] ?? null)} className="block w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-50 file:text-slate-400 file:cursor-pointer" />
              {floorPlan && <p className="text-slate-500 text-[10px] mt-1">{floorPlan.name} — 등록 시 자동으로 학습 큐에 추가됩니다 (Vision 호출은 다음 사이클).</p>}
            </div>
          </div>
          {addError && (
            <div className="mt-3 text-red-700 text-xs bg-red-50 border border-red-300 rounded px-3 py-2">{addError}</div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={addVenue} disabled={adding || !name.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm rounded transition">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              등록 + 학습 트리거
            </button>
          </div>
        </section>

        {/* ── 2. 사용자 요청 대기 ─────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-400" />
            사용자 요청 대기 ({pendingRequests.length})
          </h2>
          {pendingRequests.length === 0 ? (
            <p className="text-slate-400 text-xs italic">대기 중인 요청이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-start justify-between gap-3 bg-slate-50/40 border border-slate-300/60 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-medium text-sm">{req.name}</span>
                      {req.region && <span className="text-slate-500 text-[10px] bg-slate-200/40 rounded px-1.5">{req.region}</span>}
                      {req.venue_type && <span className="text-slate-500 text-[10px] bg-slate-200/40 rounded px-1.5">{req.venue_type}</span>}
                      {req.hall_split_requested && <span className="text-emerald-700 text-[10px] bg-emerald-100 rounded px-1.5">홀 분리</span>}
                    </div>
                    {req.notes && <p className="text-slate-500 text-[11px] mt-1">{req.notes}</p>}
                    <div className="text-slate-400 text-[10px] mt-1 flex items-center gap-2">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(req.requested_at).toLocaleString('ko-KR')}
                      {req.floor_plan_url && (
                        <a href={req.floor_plan_url} target="_blank" rel="noopener" className="text-indigo-400 hover:underline flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" /> 도면
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveRequest(req)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition">
                      <CheckCircle2 className="w-3 h-3" /> 승인
                    </button>
                    <button onClick={() => rejectRequest(req)} className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-600 text-slate-800 text-xs rounded transition">
                      <XCircle className="w-3 h-3" /> 반려
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 3. 도면 학습 큐 (미완료만 표시 — done/skipped는 행사장 목록에 반영됨) ── */}
        {(() => {
          const pendingJobs = jobs.filter(j => j.status !== 'done' && j.status !== 'skipped')
          return (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            도면 학습 큐 ({pendingJobs.length})
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">학습 완료된 도면은 아래 행사장 목록에서 확인하세요.</p>
          {pendingJobs.length === 0 ? (
            <p className="text-slate-400 text-xs italic">대기 중인 학습 큐가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {pendingJobs.map(job => {
                const venue = venues.find(v => v.id === job.venue_id)
                const statusColor = {
                  queued: 'text-slate-500 bg-slate-50',
                  processing: 'text-violet-700 bg-violet-100',
                  done: 'text-emerald-700 bg-emerald-100',
                  failed: 'text-red-700 bg-red-100',
                  skipped: 'text-slate-500 bg-slate-50',
                }[job.status]
                const canRun = job.status === 'queued' || job.status === 'failed'
                return (
                  <div key={job.id} className="flex items-center gap-2 bg-slate-50/30 rounded px-3 py-1.5 text-xs">
                    <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${statusColor}`}>{job.status}</span>
                    <span className="text-slate-700 truncate flex-1">{venue?.name ?? '(unknown venue)'}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(job.triggered_at).toLocaleString('ko-KR')}</span>
                    {job.source_url && (
                      <a href={job.source_url} target="_blank" rel="noopener" className="text-indigo-500 hover:underline">도면</a>
                    )}
                    {canRun && job.source_url && (
                      <button
                        onClick={async () => {
                          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' as const } : j))
                          try {
                            const res = await fetch('/api/learning-jobs/run', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ jobId: job.id }),
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              alert('학습 실패: ' + (data.error ?? 'unknown'))
                              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed' as const, error_message: data.error } : j))
                            } else {
                              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' as const, completed_at: new Date().toISOString() } : j))
                            }
                          } catch (e) {
                            alert('학습 호출 실패: ' + (e instanceof Error ? e.message : 'unknown'))
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white"
                      >
                        Vision 분석
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
          )
        })()}

        {/* ── 4. 학습된 행사장 현황 ───────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            학습된 행사장 ({venues.length})
          </h2>
          {venues.length === 0 ? (
            <p className="text-slate-400 text-xs italic">아직 등록된 행사장이 없습니다. 위에서 추가하세요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left p-2">이름</th>
                    <th className="text-left p-2">권역</th>
                    <th className="text-left p-2">유형</th>
                    <th className="text-left p-2">홀 분리</th>
                    <th className="text-left p-2">도면</th>
                    <th className="text-left p-2">도면 학습</th>
                    <th className="text-left p-2">등록일</th>
                    <th className="text-right p-2">행위</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map(v => {
                    const venueJobs = jobs.filter(j => j.venue_id === v.id)
                    const doneJob = venueJobs.find(j => j.status === 'done')
                    const pendingJob = venueJobs.find(j => j.status === 'queued' || j.status === 'processing')
                    const failedJob = venueJobs.find(j => j.status === 'failed')
                    return (
                    <tr key={v.id} className="border-b border-slate-200/40 hover:bg-slate-50/30">
                      <td className="p-2 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {v.name}
                        </div>
                      </td>
                      <td className="p-2 text-slate-500">{v.region ?? '—'}</td>
                      <td className="p-2 text-slate-500">{v.venue_type ?? '—'}</td>
                      <td className="p-2 text-slate-500">{v.has_hall_split ? '✓' : '—'}</td>
                      <td className="p-2">
                        {v.floor_plan_url ? (
                          <a href={v.floor_plan_url} target="_blank" rel="noopener" className="text-indigo-400 hover:underline flex items-center gap-1">
                            <FileText className="w-3 h-3" /> 보기
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">없음</span>
                        )}
                      </td>
                      <td className="p-2 text-[10px]">
                        {doneJob ? (
                          <span className="text-emerald-600 font-medium">✓ 완료</span>
                        ) : pendingJob ? (
                          <span className="text-violet-500">대기중</span>
                        ) : failedJob ? (
                          <span className="text-rose-500">실패</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-500 text-[10px]">{new Date(v.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => retriggerJob(v)}
                          disabled={!v.floor_plan_url}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:text-slate-400 disabled:cursor-not-allowed"
                          title={v.floor_plan_url ? '재학습 큐에 추가' : '도면이 없어 재학습 불가'}
                        >
                          재학습
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}
        {activeSection === 'signage-types' && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                <Inbox className="w-4 h-4 text-indigo-500" />
                환경장식물 종류 ({signageTypeList.length})
              </h2>
              {isAdmin && (
                <button
                  onClick={() => { setStShowForm(v => !v); setStError(null) }}
                  className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded font-medium"
                >
                  <Plus className="w-3 h-3" />
                  종류 추가
                </button>
              )}
            </div>

            {isAdmin && stShowForm && (
              <div className="mb-3 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">종류명 *</label>
                    <input value={stName} onChange={e => setStName(e.target.value)} placeholder="예: 물통배너"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">분류</label>
                    <select value={stCategory} onChange={e => setStCategory(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option>배너</option><option>현수막</option><option>기타</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">너비 mm *</label>
                    <input type="number" value={stWidth} onChange={e => setStWidth(e.target.value)} placeholder="600"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">높이 mm *</label>
                    <input type="number" value={stHeight} onChange={e => setStHeight(e.target.value)} placeholder="1800"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">레이아웃</label>
                    <select value={stLayout} onChange={e => setStLayout(e.target.value as '세로' | '가로' | '정사각')}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option>세로</option><option>가로</option><option>정사각</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">기본 재질</label>
                  <input value={stMaterial} onChange={e => setStMaterial(e.target.value)} placeholder="예: PET, 현수막, 인쇄"
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                {stError && <p className="text-[11px] text-red-600">{stError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setStShowForm(false); setStError(null) }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1">취소</button>
                  <button onClick={addSignageType} disabled={stSaving}
                    className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded disabled:opacity-50">
                    {stSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    추가
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold">종류명</th>
                    <th className="px-2 py-1.5 text-left font-semibold">레이아웃</th>
                    <th className="px-2 py-1.5 text-right font-semibold">너비 (mm)</th>
                    <th className="px-2 py-1.5 text-right font-semibold">높이 (mm)</th>
                    <th className="px-2 py-1.5 text-left font-semibold">기본 재질</th>
                    <th className="px-2 py-1.5 text-left font-semibold">분류</th>
                    {isAdmin && <th className="px-2 py-1.5 text-center font-semibold w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {signageTypeList.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-800 font-medium">{t.name}</td>
                      <td className="px-2 py-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.layout === '세로' ? 'bg-violet-100 text-violet-700' : t.layout === '가로' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.layout}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.width_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.height_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-slate-600 text-[11px]">{t.default_material}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px]">{t.category}</td>
                      {isAdmin && (
                        <td className="px-2 py-1 text-center">
                          <button onClick={() => deleteSignageType(t.name)}
                            title="삭제 (표준 시드는 삭제 불가)"
                            className="text-slate-300 hover:text-red-500 text-[11px] leading-none">✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">표준 시드 13종은 DB에서도 is_standard=true 로 보호됩니다. 추가한 커스텀 종류만 삭제 가능합니다.</p>
          </section>
        )}

        {activeSection === 'synonyms' && <>
        {/* ── 5. 동의어 관리 (§13-3) ───────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              동의어 매핑 ({synonyms.length + aliasList.length})
            </h2>
            <input
              type="text"
              placeholder="별칭·표준명 검색"
              value={synonymFilter}
              onChange={e => setSynonymFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
          <p className="text-[11px] text-slate-500 mb-3">비표준 입력을 표준명으로 자동 변환합니다.</p>

          {/* 동의어 추가 폼 */}
          <div className="flex gap-2 mb-3">
            <input type="text" value={newAlias} onChange={e => setNewAlias(e.target.value)} placeholder="별칭 (예: 스프링배너)"
              className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <span className="text-slate-400 text-xs self-center">→</span>
            <input type="text" value={newCanon} onChange={e => setNewCanon(e.target.value)} placeholder="표준명 (예: X-배너)"
              className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <button
              onClick={async () => {
                if (!newAlias.trim() || !newCanon.trim()) return
                setAliasSaving(true)
                try {
                  const res = await fetch('/api/admin/aliases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ alias_name: newAlias.trim(), canonical_name: newCanon.trim() }),
                  })
                  const data = await res.json()
                  if (res.ok && data.data) {
                    setAliasList(prev => [...prev, data.data])
                    setNewAlias(''); setNewCanon('')
                  } else {
                    alert('추가 실패: ' + (data.error ?? 'unknown'))
                  }
                } finally { setAliasSaving(false) }
              }}
              disabled={aliasSaving || !newAlias.trim() || !newCanon.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs rounded"
            >
              {aliasSaving ? '저장...' : '추가'}
            </button>
          </div>
          <div className="overflow-y-auto max-h-72 border border-slate-200 rounded">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-600 text-[11px]">
                  <th className="px-2 py-1.5 text-left font-semibold">별칭</th>
                  <th className="px-2 py-1.5 text-left font-semibold">→ 표준명</th>
                  <th className="px-2 py-1.5 text-left font-semibold">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* DB 동의어 (사용자 추가) — 삭제 가능 */}
                {aliasList
                  .filter(a => !synonymFilter || a.alias_name.includes(synonymFilter) || a.canonical_name.includes(synonymFilter))
                  .map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 bg-emerald-50/30">
                      <td className="px-2 py-1 text-slate-700 font-mono text-[11px]">{a.alias_name}</td>
                      <td className="px-2 py-1 text-indigo-700 font-medium">{a.canonical_name}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px] flex items-center justify-between gap-2">
                        <span className="truncate">{a.note ?? '사용자 추가'}</span>
                        <button
                          onClick={async () => {
                            if (!confirm(`′${a.alias_name}′ 삭제할까요?`)) return
                            const res = await fetch(`/api/admin/aliases?id=${a.id}`, { method: 'DELETE' })
                            if (res.ok) setAliasList(prev => prev.filter(x => x.id !== a.id))
                            else alert('삭제 실패')
                          }}
                          className="text-rose-500 hover:text-rose-700 text-[10px]"
                          title="삭제"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                {/* 시드 동의어 (read-only) */}
                {synonyms
                  .filter(s => !synonymFilter || s.alias.includes(synonymFilter) || s.canonical_name.includes(synonymFilter))
                  .map(s => (
                    <tr key={s.alias} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-700 font-mono text-[11px]">{s.alias}</td>
                      <td className="px-2 py-1 text-indigo-700 font-medium">{s.canonical_name}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px]">{s.note ?? '시드'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        </>}
        {activeSection === 'facility-guides' && <>
        {/* ── v9.30: 시설 가이드 KPI 요약 (명세 §2-4) ───────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            시설 가이드 요약
          </h2>
          {(() => {
            const totalVenues = facilityGuideStatus.length
            const fullyDocumented = facilityGuideStatus.filter(f => f.completeness >= 5).length
            const totalCategories = facilityGuideStatus.reduce((sum, f) => sum + f.categories_count, 0)
            const totalWarnings = facilityGuideStatus.reduce((sum, f) => sum + f.warnings_count, 0)
            const avgCompleteness = totalVenues === 0 ? 0 : Math.round(
              (facilityGuideStatus.reduce((sum, f) => sum + f.completeness, 0) / totalVenues) * 100 / 6
            )
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-500">등록 행사장</p>
                  <p className="text-xl font-bold text-slate-900">{totalVenues}<span className="text-xs text-slate-400 ml-1">개</span></p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{fullyDocumented}개 완성도 5/6↑</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-500">카테고리 제약 누계</p>
                  <p className="text-xl font-bold text-indigo-600">{totalCategories}<span className="text-xs text-slate-400 ml-1">건</span></p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-500">주의사항 누계</p>
                  <p className="text-xl font-bold text-amber-600">{totalWarnings}<span className="text-xs text-slate-400 ml-1">건</span></p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <p className="text-[10px] text-slate-500">평균 완성도</p>
                  <p className={`text-xl font-bold ${avgCompleteness >= 80 ? 'text-emerald-600' : avgCompleteness >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {avgCompleteness}<span className="text-xs text-slate-400 ml-1">%</span>
                  </p>
                </div>
              </div>
            )
          })()}
        </section>

        {/* ── 6. 시설 가이드 학습 현황 (§13-3 신규) ────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            시설 가이드 학습 현황
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">행사장별 시설 가이드 6종 정보 등록 상태. AI 자동 추출 버튼은 specs_text(Vision 분석 완료)가 있는 경우만 활성화됩니다.</p>
          {facilityGuideStatus.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-3 text-center">시설 가이드 시드 데이터가 비어있습니다.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold">행사장</th>
                    <th className="px-2 py-1.5 text-right font-semibold">카테고리</th>
                    <th className="px-2 py-1.5 text-right font-semibold">주의사항</th>
                    <th className="px-2 py-1.5 text-right font-semibold">완성도</th>
                    <th className="px-2 py-1.5 text-left font-semibold">학습 시점</th>
                    <th className="px-2 py-1.5 text-right font-semibold">AI 추출</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facilityGuideStatus.map(f => {
                    const ratio = (f.completeness / 6)
                    const color = ratio >= 0.83 ? 'text-emerald-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                    const isExtracting = extractingVenueId === f.venue_id
                    const isSuccess = extractSuccessId === f.venue_id
                    return (
                      <tr key={f.venue_key} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-800 font-medium">{f.venue_name}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.categories_count}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.warnings_count}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${color}`}>{f.completeness}/6</td>
                        <td className="px-2 py-1.5 text-slate-500 text-[11px]">{f.last_updated ?? '미상'}</td>
                        <td className="px-2 py-1.5 text-right">
                          {f.venue_id && f.has_specs_text ? (
                            isSuccess ? (
                              <span className="flex items-center gap-1 text-emerald-600 text-[10px] justify-end">
                                <CheckCircle2 className="w-3 h-3" /> 완료
                              </span>
                            ) : (
                              <button
                                disabled={isExtracting}
                                onClick={async () => {
                                  setExtractingVenueId(f.venue_id!)
                                  try {
                                    const res = await fetch('/api/admin/facility-guide', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ venueId: f.venue_id, action: 'extract' }),
                                    })
                                    const data = await res.json()
                                    if (res.ok) {
                                      setExtractSuccessId(f.venue_id!)
                                      setTimeout(() => setExtractSuccessId(null), 5000)
                                    } else {
                                      alert('추출 실패: ' + (data.error ?? 'unknown'))
                                    }
                                  } catch (e) {
                                    alert('오류: ' + (e instanceof Error ? e.message : 'unknown'))
                                  } finally {
                                    setExtractingVenueId(null)
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white transition"
                              >
                                {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI 추출
                              </button>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">
                              {f.venue_id ? '분석 필요' : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 예외 빈도 모니터 — 제작 완료 데이터 > 가이드 규칙 (v9.16, v9.30 보강) ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            가이드 예외 패턴 — 제작 완료 기반 검토 신호
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">
            시설 가이드 경고를 무시하고 실제 발주·완료된 케이스 집계입니다.
            <strong className="text-amber-700"> 3회 이상</strong>이면 가이드 데이터 자체가 오래됐거나 틀렸을 가능성이 높습니다.
            완료 데이터가 가이드보다 신뢰도가 높습니다.
          </p>

          {/* v9.30: 예외 패턴 요약 KPI */}
          {exceptionAlerts.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {(() => {
                const total = exceptionAlerts.length
                const review = exceptionAlerts.filter(a => a.needs_review).length
                const finalizedSum = exceptionAlerts.reduce((s, a) => s + a.finalized_count, 0)
                return (
                  <>
                    <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                      <p className="text-[10px] text-slate-500">전체 예외 패턴</p>
                      <p className="text-xl font-bold text-slate-900">{total}<span className="text-xs text-slate-400 ml-1">건</span></p>
                    </div>
                    <div className="border border-amber-200 rounded-md px-3 py-2 bg-amber-50">
                      <p className="text-[10px] text-amber-700">가이드 검토 필요 (≥3회)</p>
                      <p className="text-xl font-bold text-amber-700">{review}<span className="text-xs text-amber-500 ml-1">건</span></p>
                    </div>
                    <div className="border border-emerald-200 rounded-md px-3 py-2 bg-emerald-50">
                      <p className="text-[10px] text-emerald-700">완료 누계 (검증값)</p>
                      <p className="text-xl font-bold text-emerald-700">{finalizedSum}<span className="text-xs text-emerald-500 ml-1">건</span></p>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
          {exceptionLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> 집계 중…
            </div>
          ) : exceptionAlerts.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-3 text-center">예외 패턴이 없습니다. (가이드 데이터가 정상 수준)</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold">행사장</th>
                    <th className="px-2 py-1.5 text-left font-semibold">규칙</th>
                    <th className="px-2 py-1.5 text-left font-semibold">필드</th>
                    <th className="px-2 py-1.5 text-left font-semibold">가이드 표준</th>
                    <th className="px-2 py-1.5 text-left font-semibold">실제 사용값</th>
                    <th className="px-2 py-1.5 text-right font-semibold">예외 횟수</th>
                    <th className="px-2 py-1.5 text-right font-semibold">완료 건</th>
                    <th className="px-2 py-1.5 text-center font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exceptionAlerts.map((a, i) => (
                    <tr key={i} className={a.needs_review ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}>
                      <td className="px-2 py-1.5 text-slate-800 font-medium">{a.venue}</td>
                      <td className="px-2 py-1.5 text-slate-600 font-mono text-[10px]">{a.rule}</td>
                      <td className="px-2 py-1.5 text-slate-500 text-[10px]">{a.field}</td>
                      <td className="px-2 py-1.5 text-slate-500 text-[10px]">{a.standard_value ?? '—'}</td>
                      <td className="px-2 py-1.5 text-indigo-700 font-medium text-[10px]">{a.user_value ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700">{a.count}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-600">{a.finalized_count}</td>
                      <td className="px-2 py-1.5 text-center">
                        {a.needs_review ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-semibold border border-amber-300">
                            <AlertCircle className="w-2.5 h-2.5" /> 가이드 검토 필요
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}

        {activeSection === 'correction-requests' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <Flag className="w-4 h-4 text-rose-500" />
            수정 요청 대기
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">FacilityGuidePanel에서 사용자가 제출한 시설 정보 수정 요청입니다.</p>
          {correctionLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
            </div>
          ) : correctionRequests.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-4 text-center">대기 중인 수정 요청이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {correctionRequests.map(req => (
                <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-medium text-xs">{req.venue_name ?? req.venue_key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{req.status}</span>
                      <span className="text-slate-400 text-[10px]">{new Date(req.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{req.correction_text}</p>
                  <div className="flex gap-2 pt-1">
                    {/* venue_id 있는 경우 AI 재추출 */}
                    <button
                      onClick={async () => {
                        // venue_key로 venue 조회 후 extract
                        const supabase = createClient()
                        const { data: venueRow } = await supabase
                          .from('venues')
                          .select('id, specs_text')
                          .ilike('name', `%${req.venue_name ?? req.venue_key}%`)
                          .limit(1)
                          .maybeSingle()
                        if (!venueRow?.id || !venueRow.specs_text) {
                          alert('specs_text가 없습니다. 도면 Vision 분석을 먼저 실행하세요.')
                          return
                        }
                        const res = await fetch('/api/admin/facility-guide', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ venueId: venueRow.id, action: 'extract' }),
                        })
                        if (res.ok) {
                          // 상태 업데이트
                          await supabase
                            .from('venue_correction_requests')
                            .update({ status: 'reviewed', review_note: 'AI 재추출 완료', reviewed_at: new Date().toISOString() })
                            .eq('id', req.id)
                          setCorrectionRequests(prev => prev.filter(r => r.id !== req.id))
                          alert('AI 재추출 완료')
                        } else {
                          const data = await res.json()
                          alert('실패: ' + (data.error ?? 'unknown'))
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> AI 재추출
                    </button>
                    <button
                      onClick={async () => {
                        const supabase = createClient()
                        await supabase
                          .from('venue_correction_requests')
                          .update({ status: 'ignored', reviewed_at: new Date().toISOString() })
                          .eq('id', req.id)
                        setCorrectionRequests(prev => prev.filter(r => r.id !== req.id))
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
                    >
                      무시
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

          </div>
        </div>
      </main>
    </div>
  )
}
