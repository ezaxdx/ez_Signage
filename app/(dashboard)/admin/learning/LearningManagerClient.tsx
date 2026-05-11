'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutGrid, ArrowLeft, GraduationCap, MapPin, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, Clock, FileText, Inbox, Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { explainStorageError } from '@/lib/services/storagePaths'

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
}

interface Props {
  userId: string
  initialVenues: Venue[]
  initialRequests: VenueRequest[]
  initialJobs: LearningJob[]
  venueLearningStatus?: VenueLearningStatus[]
  signageTypeCount?: number
  synonyms?: SynonymRow[]
  facilityGuideStatus?: FacilityGuideRow[]
}

const VENUE_TYPES = ['컨벤션센터', '호텔', '전시장', '야외', '공공시설', '기타'] as const
const REGIONS = ['서울', '수도권', '지방', '제주', '해외'] as const

export function LearningManagerClient({
  userId, initialVenues, initialRequests, initialJobs,
  venueLearningStatus = [],
  signageTypeCount = 0,
  synonyms = [],
  facilityGuideStatus = [],
}: Props) {
  const [synonymFilter, setSynonymFilter] = useState('')
  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [requests, setRequests] = useState<VenueRequest[]>(initialRequests)
  const [jobs, setJobs] = useState<LearningJob[]>(initialJobs)
  const [migrationMissing, setMigrationMissing] = useState(initialVenues.length === 0 && initialJobs.length === 0)
  // 좌측 사이드바 페이지 전환 (피그마: 각 박스 = 한 페이지)
  type SectionKey = 'venue-status' | 'venues' | 'signage-types' | 'synonyms' | 'facility-guides'
  const [activeSection, setActiveSection] = useState<SectionKey>('venue-status')
  const SECTIONS: { key: SectionKey; label: string; icon: typeof GraduationCap }[] = [
    { key: 'venue-status',    label: '행사장 학습 현황', icon: GraduationCap },
    { key: 'venues',          label: '행사장 관리',     icon: Building2 },
    { key: 'signage-types',   label: '환경장식물 종류', icon: Inbox },
    { key: 'synonyms',        label: '동의어 매핑',     icon: FileText },
    { key: 'facility-guides', label: '시설 가이드',     icon: AlertCircle },
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
            <Link href="/data" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-300 text-xs transition">
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
            행사장 + 도면을 학습시켜 추천 정확도를 높입니다. 학습 사이클: 추가 → 도면 첨부 → 학습 트리거 → 드롭다운 자동 반영.
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
              <nav className="p-1.5 space-y-0.5">
                {SECTIONS.map(s => {
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

        {activeSection === 'venue-status' && <>
        {/* ── 0. 행사장별 학습 현황 — 점진적 정확도 가시화 (★ v9) ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            행사장별 학습 현황
          </h2>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            ′특정 장소 + 특정 행사′ 선택 시 AI(Gemini)에 자동 주입되는 누적 데이터입니다. 단계별 가중치 — 입력 10%·중간 30%·컨펌 70%·완료 100%. 정확도 추정치가 70%를 넘으면 추천 신뢰도가 안정됩니다.
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
                    <th className="px-2 py-2 text-right font-semibold" title="이 행사장에서 한 번이라도 등장한 카테고리 수">학습 카테고리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venueLearningStatus.map(v => {
                    const acc = v.accuracy_estimate
                    const color = acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-rose-600'
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
                        <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{v.learned_categories}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-slate-400 leading-relaxed mt-3">
            ⓘ 정확도 추정 = Σ(단계별 항목 수 × 가중치) ÷ 전체 항목 × 100. 컨펌·완료 비중이 높을수록 ′이 행사장에선 이 카테고리가 정답에 가까움′ 신호가 강해집니다.
            학습 부족 행사장(정확도 40% 미만)은 도면 업로드·과거 발주엑셀 등록을 우선 권장합니다.
          </p>
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

        {/* ── 3. 도면 학습 큐 ─────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            도면 학습 큐 ({jobs.length})
            <span className="text-[10px] text-slate-500 font-normal ml-2">실제 Vision 호출은 다음 사이클 — 현재는 INSERT 기록만</span>
          </h2>
          {jobs.length === 0 ? (
            <p className="text-slate-400 text-xs italic">학습 큐가 비어있습니다. 위에서 도면 첨부와 함께 행사장을 추가하세요.</p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map(job => {
                const venue = venues.find(v => v.id === job.venue_id)
                const statusColor = {
                  queued: 'text-slate-500 bg-slate-50',
                  processing: 'text-violet-700 bg-violet-100',
                  done: 'text-emerald-700 bg-emerald-100',
                  failed: 'text-red-700 bg-red-100',
                  skipped: 'text-slate-500 bg-slate-50',
                }[job.status]
                return (
                  <div key={job.id} className="flex items-center gap-2 bg-slate-50/30 rounded px-3 py-1.5 text-xs">
                    <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${statusColor}`}>{job.status}</span>
                    <span className="text-slate-400 truncate flex-1">{venue?.name ?? '(unknown venue)'}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(job.triggered_at).toLocaleString('ko-KR')}</span>
                    {job.source_url && (
                      <a href={job.source_url} target="_blank" rel="noopener" className="text-indigo-400 hover:underline">도면</a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

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
                    <th className="text-left p-2">등록일</th>
                    <th className="text-right p-2">행위</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map(v => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}
        {activeSection === 'signage-types' && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-slate-900 font-semibold text-sm mb-2 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-indigo-500" />
              환경장식물 종류 ({signageTypeCount})
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              표준 환경장식물 {signageTypeCount}종 (X배너·I배너·가로등배너·통천·가로/세로 현수막·포디움·A4/A3 등). 현재는 시드 데이터에 정의되어 있으며, 편집·추가는 추후 사이클에서 인라인 지원 예정.
            </p>
          </section>
        )}

        {activeSection === 'synonyms' && <>
        {/* ── 5. 동의어 관리 (§13-3) ───────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              동의어 매핑 ({synonyms.length})
            </h2>
            <input
              type="text"
              placeholder="별칭·표준명 검색"
              value={synonymFilter}
              onChange={e => setSynonymFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            ′스프링배너→X배너′처럼 비표준 입력을 표준명으로 자동 변환합니다. 프로젝트 종료 시 비표준 입력 빈도가 70%↑인 경우 자동 추천 큐에 올라옵니다 (다음 사이클).
            ※ 현재 시드 데이터 기준 read-only. 편집·삭제는 추후 사이클에서 인라인 지원.
          </p>
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
                {synonyms
                  .filter(s => !synonymFilter || s.alias.includes(synonymFilter) || s.canonical_name.includes(synonymFilter))
                  .map(s => (
                    <tr key={s.alias} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-700 font-mono text-[11px]">{s.alias}</td>
                      <td className="px-2 py-1 text-indigo-700 font-medium">{s.canonical_name}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px]">{s.note ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        </>}
        {activeSection === 'facility-guides' && <>
        {/* ── 6. 시설 가이드 학습 현황 (§13-3 신규) ────────────── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            시설 가이드 학습 현황
          </h2>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            행사장별 ′설치 가능 카테고리 / 설치·고정 방법 / 리깅·하중 / 안전 / 주의사항 / 디지털 사이니지′ 6종 정보 등록 상태.
            등록 항목이 6/6에 가까울수록 자동 시설 검증·알랏 정확도가 높아집니다.
          </p>
          {facilityGuideStatus.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-3 text-center">시설 가이드 시드 데이터가 비어있습니다.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold">행사장</th>
                    <th className="px-2 py-1.5 text-right font-semibold">설치 가능 카테고리</th>
                    <th className="px-2 py-1.5 text-right font-semibold">주의사항</th>
                    <th className="px-2 py-1.5 text-right font-semibold">정보 완성도</th>
                    <th className="px-2 py-1.5 text-left font-semibold">학습 시점</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facilityGuideStatus.map(f => {
                    const ratio = (f.completeness / 6)
                    const color = ratio >= 0.83 ? 'text-emerald-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                    return (
                      <tr key={f.venue_key} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-800 font-medium">{f.venue_name}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.categories_count}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.warnings_count}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${color}`}>{f.completeness}/6</td>
                        <td className="px-2 py-1.5 text-slate-500 text-[11px]">{f.last_updated ?? '미상'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-slate-400 leading-relaxed mt-2">
            ⓘ ′확신 없으면 행사장에 직접 확인 권장′ 정책 (§11-6) — 학습 시점이 1년+ 경과한 행사장은 사용자에게 신선도 경고를 더 강하게 표시합니다.
          </p>
        </section>

        </>}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          ⓘ 학습 사이클: ① 관리자가 행사장·도면을 등록 → ② 자동으로 learning_jobs INSERT (queued) →
          ③ (다음 사이클) Vision API 호출로 주출입구·동선 분석 → ④ venues 메타에 결과 저장 →
          ⑤ 새 프로젝트 폼 드롭다운에 즉시 노출 → ⑥ 사용자가 사용 → ⑦ liveStats 자동 누적 → ②로 돌아가 정확도 개선.
        </p>
          </div>
        </div>
      </main>
    </div>
  )
}
