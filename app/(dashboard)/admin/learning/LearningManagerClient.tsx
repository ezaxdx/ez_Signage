'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap, MapPin, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, Clock, FileText, Inbox, Building2,
  Sparkles, Flag, BarChart3, TrendingUp, AlertTriangle, Workflow, Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { explainStorageError } from '@/lib/services/storagePaths'
import { REGION_ORDER, VENUE_HALLS, getHallsByVenueKey, getHallsByVenueName, extractL1L2FromComplexVenue, normalizeVenueName } from '@/lib/venueIntel'
import { STANDARD_CATEGORY_BY_KEY, type StandardCategoryKey } from '@/lib/data/signageCategoryStandards'
import { PROGRAM_PARTS, PROGRAM_PART_GROUPS, PROGRAM_PART_SIGNAGE_HINTS, PROGRAM_PART_BY_CODE } from '@/lib/programParts'
import { SEED_EVENT_HISTORY, estimateSignageBreakdown } from '@/lib/data/dashboardSeed'
import { FacilityGuidePanel } from '@/app/components/facility/FacilityGuidePanel'
// HOTFIX (2026-05-20): 12파트 × 환경장식물 표준 매트릭스 UI 박스 삭제 (사용자 명시).
//   시드 파일(lib/data/v3/programPartSignageSeed.ts)·컴포넌트 자체는 보존.
// import { ProgramPartSignageMatrix } from './components/ProgramPartSignageMatrix'
import { SignageUsageTable } from './components/SignageUsageTable'
// 5/21 사용자 명시 = NIST 4단·전체 학습 요약·향후 도입 로드맵 UI 표시 롤백.
// 시드 (LEARNING_META_SEED·NIST_RMF_STAGES·VISION_ROADMAP) 자체는 lib/data·lib/ai에 보존
// — 곽 이사 보고 자료 외부 영역 활용 가능. 관리자 페이지 UI는 ′응?′ 룰 정합 위해 노출 X.

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
  /** 5/22 사용자 명시 = 환경장식물별 사용 정보 (signage_breakdown 합산) */
  signage_breakdown?: Array<{ category: string; quantity: number }>
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
  last_updated?: string | null
  /** DB에서 매칭된 venue id (AI 추출 버튼에서 사용) */
  venue_id?: string
  /** specs_text 존재 여부 (AI 추출 버튼 활성화 조건) */
  has_specs_text?: boolean
  /** 5/22 사용자 명시 = 3 댑스 펼침 영역 (L3 학습 내용 표시) */
  source?: 'seed' | 'db'
  install_allowed?: Array<{ category?: string; status?: string; note?: string; max_width_mm?: number; max_height_mm?: number; standard_width_mm?: number; standard_height_mm?: number }>
  warnings?: Array<{ type?: string; description?: string }>
  mount_methods?: unknown
  rigging?: { available?: boolean; note?: string; max_load_kg?: number } | null
  safety?: unknown
  digital_signage?: unknown
  special_notes?: string[]
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
  /** 5/22 사용자 명시 = 데이터 학습 관리자에 프로젝트별 정보 추가 */
  userProjectIndex?: Array<{
    id: string
    name: string
    event_venue: string | null
    event_date: string | null
    status: string
    total_items: number
    finalized_items: number
    completion_rate: number
    program_parts: string[]
    created_at: string
    last_edited_by: string | null
  }>
  // 5/22 사용자 명시 = 신규 행사 (사용자 프로젝트) 자동 행사 관리에 누적·AI 추천 정확도 향상 목표
  // PR#1 단위 8 (δ 정책): source 태그 추가 — 'auto_project' (완료 status) / 'auto_d7' (행사일+7일)
  userEventHistory?: Array<{
    project_name: string
    project_code: string
    year: number
    venue: string
    category_tag: '핵심' | '일반' | '미분류' | '해외'
    has_excel: boolean
    has_image: boolean
    analyzed_item_count?: number
    program_parts?: string[]
    signage_breakdown?: Array<{ category: string; quantity: number; sizes?: string }>
    is_user_project?: boolean
    source?: 'auto_project' | 'auto_d7'
  }>
  signageTypeCount?: number
  synonyms?: SynonymRow[]
  dbAliases?: DbAlias[]
  facilityGuideStatus?: FacilityGuideRow[]
  signageTypes?: SignageTypeRow[]
  isAdmin?: boolean
  // 5/22 영역 A1·A2 = SSR 영역 event_history DB fetch 영역 전달
  serverEventHistory?: typeof SEED_EVENT_HISTORY
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
  userProjectIndex = [],
  userEventHistory = [],
  serverEventHistory = [],
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

  // PR#4 단위 4 (δ 정책): 미분류 카테고리 매핑 큐
  interface UnmatchedRow { id: string; raw_category: string; occurrences: number; first_seen: string; last_seen: string }
  const [unmatchedList, setUnmatchedList] = useState<UnmatchedRow[]>([])
  const [unmatchedLoading, setUnmatchedLoading] = useState(false)
  const [resolvingRaw, setResolvingRaw] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<string>('')

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
    if (!confirm(`'${name}' 종류를 숨길까요? (시드 항목은 복구 가능, DB 항목은 영구 삭제)`)) return
    // 1차: DB API 호출 — DB row가 있으면 삭제, 없으면 시드라 무시
    try {
      await fetch('/api/admin/signage-types', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    } catch {}
    // 2차: 시드 항목은 localStorage hidden (DB 영향 없이 사용자 화면에서만 숨김)
    const target = signageTypeList.find(t => t.name === name)
    if (target) toggleHideSignageType(target.id)
    setSignageTypeList(prev => prev.filter(t => t.name !== name))
  }

  // 5/22 사용자 명시 = prompt 알랏 형태 X·모달 창에서 수정. editingSignageType state로 모달 열림 제어.
  const [editingSignageType, setEditingSignageType] = useState<SignageTypeRow | null>(null)
  const editSignageType = (t: SignageTypeRow) => {
    setEditingSignageType(t)
  }
  const saveSignageTypeEdit = async (t: SignageTypeRow, draft: { name: string; width_mm: number; height_mm: number; default_material: string; category: string; layout: string }) => {
    if (!Number.isFinite(draft.width_mm) || draft.width_mm <= 0 || !Number.isFinite(draft.height_mm) || draft.height_mm <= 0) {
      alert('너비·높이는 양수만 입력 가능')
      return
    }
    const isDbRow = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(t.id)
    if (isDbRow) {
      try {
        const res = await fetch(`/api/admin/signage-types/${t.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: draft.name, width_mm: draft.width_mm, height_mm: draft.height_mm, default_material: draft.default_material, category: draft.category }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
      } catch (e) { alert('수정 실패: ' + (e instanceof Error ? e.message : 'unknown')); return }
    }
    setSignageTypeList(prev => prev.map(row => row.id === t.id ? { ...row, ...draft, layout: draft.layout as '세로'|'가로'|'정사각' } : row))
    try {
      const key = 'mice_signage_type_overrides'
      const prev = JSON.parse(localStorage.getItem(key) ?? '{}')
      prev[t.id] = draft
      localStorage.setItem(key, JSON.stringify(prev))
    } catch {}
    setEditingSignageType(null)
  }

  // PR#3 단위 9c (δ 정책): 프로그램 파트 관리 — DB(/api/admin/program-parts) 영속화.
  //   localStorage(mice_program_part_*) 폐기. 마운트 시 1회 fetch + 변경 시 API POST/DELETE.
  //   API 실패(테이블 부재 등) 시 in-memory만 유지 (UI 동작 보장 — graceful degradation).
  const [hiddenProgramPartCodes, setHiddenProgramPartCodes] = useState<string[]>([])
  const [programPartOverrides, setProgramPartOverrides] = useState<Record<string, { name: string; hint: string }>>({})
  const [customProgramParts, setCustomProgramParts] = useState<Array<{ code: string; name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }>>([])
  const [editingProgramPart, setEditingProgramPart] = useState<{ code: string; name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' } | null>(null)
  useEffect(() => {
    // DB 영속화: program_parts_overrides 테이블 fetch
    fetch('/api/admin/program-parts')
      .then(r => r.json())
      .then((d: { items?: Array<{ code: string; name: string | null; hint: string | null; group_name: 'program'|'attendee'|'promotion'|null; hidden: boolean; is_custom: boolean }> }) => {
        const items = d.items ?? []
        const hidden: string[] = []
        const overrides: Record<string, { name: string; hint: string }> = {}
        const customs: Array<{ code: string; name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }> = []
        for (const it of items) {
          if (it.hidden) hidden.push(it.code)
          if (it.is_custom) {
            customs.push({ code: it.code, name: it.name ?? '', hint: it.hint ?? '', group: (it.group_name ?? 'program') as 'program'|'attendee'|'promotion'|'other' })
          } else if (it.name || it.hint) {
            overrides[it.code] = { name: it.name ?? '', hint: it.hint ?? '' }
          }
        }
        setHiddenProgramPartCodes(hidden)
        setProgramPartOverrides(overrides)
        setCustomProgramParts(customs)
      })
      .catch(() => { /* silent — graceful degradation */ })
  }, [])
  const toggleHideProgramPart = (code: string) => {
    setHiddenProgramPartCodes(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      // DB 영속화 (best-effort)
      const willHide = !prev.includes(code)
      if (willHide) {
        fetch('/api/admin/program-parts', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => {})
      } else {
        // 복구: hidden=false로 upsert
        fetch('/api/admin/program-parts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, hidden: false, group_name: 'program', name: '' }) }).catch(() => {})
      }
      return next
    })
  }
  const saveProgramPartEdit = (code: string, draft: { name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }) => {
    const isCustom = code.startsWith('custom_')
    if (isCustom) {
      setCustomProgramParts(prev => prev.map(p => p.code === code ? { ...p, ...draft } : p))
    } else {
      setProgramPartOverrides(prev => ({ ...prev, [code]: { name: draft.name, hint: draft.hint } }))
    }
    // DB 영속화
    fetch('/api/admin/program-parts', {
      method: isCustom ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(isCustom
        ? { code, patch: { name: draft.name, hint: draft.hint, group_name: draft.group } }
        : { code, name: draft.name, hint: draft.hint, group_name: draft.group })
    }).catch(() => {})
    setEditingProgramPart(null)
  }
  const addCustomProgramPart = (draft: { name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }) => {
    if (!draft.name.trim()) { alert('파트명 필수'); return }
    const code = 'custom_' + Date.now().toString(36)
    setCustomProgramParts(prev => [...prev, { code, ...draft }])
    // DB 영속화
    fetch('/api/admin/program-parts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, name: draft.name, hint: draft.hint, group_name: draft.group }),
    }).catch(() => {})
    setEditingProgramPart(null)
  }
  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [requests, setRequests] = useState<VenueRequest[]>(initialRequests)
  const [jobs, setJobs] = useState<LearningJob[]>(initialJobs)
  const [migrationMissing, setMigrationMissing] = useState(initialVenues.length === 0 && initialJobs.length === 0)
  // v9.31 (2026-05-13): 댑스 정정 — 사용자 강한 지적 "댑스 이해 못해?"
  // 명세 5 대섹션 (docs/ADMIN_REDESIGN_260513.md §2):
  //   1) 상단 KPI 카드 (상시 노출 — 사이드바 X)
  //   2) 개요 — 학습 누적 / 단계별 분포 / 정확도 추이
  //   3) 행사장별 학습 현황 — venue별 항목·정확도·40% 강조
  //   4) 행사장 (단일 대섹션) — 내부 5 서브: 추가 폼 / 신규 요청 대기 / 도면 학습 큐 / 시설 가이드 / 예외 패턴 (+ 수정 요청 통합)
  //   5) 동의어 (단일 대섹션) — 내부 3 서브: 비표준→표준 매핑 / 카테고리 권장 / 환경장식물 종류 관리
  //
  // 이전 v9.29 잘못된 댑스: 7개 평면 평탄화 (행사장 5서브 + 동의어 3서브를 사이드바 항목으로 끌어올림)
  // v9.31 정정: 사이드바 = 4 대섹션 (개요 / 행사장 학습 현황 / 행사장 / 동의어), 4·5 대섹션 안은 탭으로 서브 항목 통합
  //
  // v9.32 갱신 — 사용자 명시 (조기흠 사원, 2026-05-13):
  //   사이드바 5 메뉴: 개요·행사장별 학습 현황·행사장·프로그램 파트·환경장식물
  //   - 4번 ′프로그램 파트′ 신규 (PROGRAM_PARTS 12종 표시)
  //   - 5번 ′환경장식물′ = 기존 ′동의어′ 메뉴 명칭 변경 (내부 3 서브탭 그대로:
  //     환경장식물 종류 관리 + 동의어 매핑 + 카테고리 권장)
  // v9.36: 시안 100% 매칭 IA — 6 평면 메뉴
  //   1) 행사장 학습 현황 (venue-status)
  //   2) 행사장 관리 (venues — 가로 서브탭 제거, 추가/요청/큐 블록 세로 동시 표시)
  //   3) 환경장식물 종류 (signage-types)
  //   4) 동의어 매핑 (synonyms-mapping)
  //   5) 시설 가이드 (facility-guides — 가로 서브탭 제거, 가이드/예외 동시 표시)
  //   6) 수정요청 (correction-requests)
  // 개요·프로그램 파트 메뉴는 시안에 없어 제거. 부연 desc도 제거.
  // v9.47 (2026-05-14): IA SOT(김연아 대리님 노션) 정렬 검증 완료 — v9.36 6 평면 메뉴와 100% 일치.
  //   사이드바 추가 변경 없음. dead state(venueSubTab·synonymSubTab) 단순화만 진행.
  // 5/20 노션 §12 정합 = correction-requests 별도 메뉴 제거 → 시설 가이드 아래로 통합
  type SectionKey =
    | 'venue-status'
    | 'venues'
    | 'program-parts'
    | 'events'
    | 'signage-types'
    | 'synonyms-mapping'
    | 'facility-guides'
  const [activeSection, setActiveSection] = useState<SectionKey>('venue-status')
  // v9.47: VenueSubKey/SynonymSubKey 타입과 venueSubTab/synonymSubTab state는 dead code (v9.36에서
  //   섹션 내 서브탭 가로바 제거 후 사용처 0건). VENUE_SUBTABS 상수도 동일 — 타입 단순화 위해 모두 제거.

  // PR#4 단위 4: synonyms-mapping 진입 시 미분류 카테고리 큐 fetch
  useEffect(() => {
    if (activeSection !== 'synonyms-mapping') return
    setUnmatchedLoading(true)
    fetch('/api/admin/unmatched-categories')
      .then(r => r.json())
      .then((d: { items?: UnmatchedRow[] }) => setUnmatchedList(d.items ?? []))
      .catch(() => setUnmatchedList([]))
      .finally(() => setUnmatchedLoading(false))
  }, [activeSection])

  // v9.36: 시설 가이드 / 예외 패턴 진입 시 예외 빈도 조회 (6 평면 메뉴 기준)
  useEffect(() => {
    if (activeSection !== 'facility-guides') return
    setExceptionLoading(true)
    fetch('/api/admin/exception-monitor')
      .then(r => r.json())
      .then(d => setExceptionAlerts(d.alerts ?? []))
      .catch(() => setExceptionAlerts([]))
      .finally(() => setExceptionLoading(false))
  }, [activeSection])

  // 5/20 노션 §12 정합 = facility-guides 진입 시 수정 요청도 함께 조회 (통합)
  useEffect(() => {
    if (activeSection !== 'facility-guides') return
    setCorrectionLoading(true)
    fetch('/api/admin/correction-requests?status=all')
      .then(r => r.json())
      .then((data: { items?: CorrectionRequest[] }) => {
        setCorrectionRequests(Array.isArray(data?.items) ? data.items : [])
      })
      .catch(() => setCorrectionRequests([]))
      .finally(() => setCorrectionLoading(false))
  }, [activeSection])

  // v9.36: 사이드바 6 평면 메뉴 — 시안 PNG (데이터_학습_관리자.png) 매칭
  const SECTIONS: { key: SectionKey; label: string; icon: typeof GraduationCap }[] = [
    { key: 'venue-status',         label: '행사장 학습 현황',  icon: GraduationCap },
    { key: 'venues',               label: '행사장 관리',       icon: Building2 },
    // 5/22 사용자 명시 = 기존 행사 정보 활용·AI 추천 매핑 목표 → 행사 관리 메뉴 복구·5대 영역 정합
    { key: 'program-parts',        label: '프로그램 파트 관리', icon: Workflow },
    { key: 'events',               label: '행사 관리',         icon: Sparkles },
    { key: 'signage-types',        label: '환경장식물 관리',   icon: ImageIcon },
    { key: 'synonyms-mapping',     label: '동의어 매핑',       icon: FileText },
    { key: 'facility-guides',      label: '시설 가이드',       icon: AlertCircle },
  ]

  // v9.47: VENUE_SUBTABS 상수 제거 — v9.36에서 가로 서브탭 바를 제거하고 블록을 세로 동시 표시로
  //   변경했지만 상수만 잔존하던 dead code. IA SOT(6 평면 메뉴)와 정합.

  // ── 행사장 추가 폼 ───────────────────────────────────────
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [venueType, setVenueType] = useState('')
  const [hallSplit, setHallSplit] = useState(false)
  // 5/21 사용자 명시 = 학습된 행사장 표 행 클릭 시 L2 홀 펼침
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null)
  // 5/21 사용자 명시 = 데이터 학습 관리자 직접 수정·삭제·편집 가능 (데이터 오류 보완).
  // localStorage hidden 패턴으로 시드 항목도 ✕ 삭제 + ↺ 복구 가능.
  const [hiddenSeedAliases, setHiddenSeedAliases] = useState<string[]>([])
  const [hiddenSignageTypeIds, setHiddenSignageTypeIds] = useState<string[]>([])
  const [hiddenFacilityVenues, setHiddenFacilityVenues] = useState<string[]>([])
  // 5/21 사용자 명시 = 환경장식물 종류 추가에 예시 사진 (노션 §10).
  // 1차 = localStorage 보관 (DB signage_types.sample_image_url 컬럼은 컴펌 후 마이그레이션).
  const [signageTypeSamples, setSignageTypeSamples] = useState<Record<string, string>>({})
  const [stSampleFile, setStSampleFile] = useState<File | null>(null)
  const [stSamplePreview, setStSamplePreview] = useState<string>('')
  // 5/22 P2-7 = 행사 관리 표 펼침 영역 (▶ 행 클릭 시 환경장식물별 분리 표시)
  const [expandedEventKey, setExpandedEventKey] = useState<string | null>(null)
  // 5/22 사용자 명시 = 행사장 학습 현황 표 ▶ 화살표 펼침 (코엑스 휘하 행사 목록)
  const [expandedVenueLearningKey, setExpandedVenueLearningKey] = useState<string | null>(null)
  // 5/22 사용자 명시 = 시설 가이드 학습 현황 3 댑스 (L1 코엑스 → L2 그랜드볼룸 → L3 학습 내용)
  const [expandedFacilityVenueKey, setExpandedFacilityVenueKey] = useState<string | null>(null)
  const [expandedFacilityGroup, setExpandedFacilityGroup] = useState<string | null>(null)
  // 5/22 사용자 명시 = L3 학습 내용 = JSON.stringify X·실제 가이드 패널 영역 같은 사람 보기
  const [facilityPanelVenue, setFacilityPanelVenue] = useState<string | null>(null)
  // 5/22 사용자 명시 = 유기 연동. event_history DB 영역 fetch → SEED + DB 통합 SOT.
  // 행사 삭제 (deleted_at) = 즉시 모든 영역 (행사장 학습 현황·프로그램 파트 매칭·환경장식물 빈도·AI) 반영.
  // 5/22 영역 A2 = SSR 영역 영역 초기값 영역 = serverEventHistory 영역 (라이브 즉시 표시·useEffect 영역 보조)
  const [dbEventHistory, setDbEventHistory] = useState<typeof SEED_EVENT_HISTORY>(serverEventHistory)
  const [eventHistoryFallback, setEventHistoryFallback] = useState(false)
  useEffect(() => {
    fetch('/api/event-history')
      .then(r => r.json())
      .then(d => {
        if (d.fallback) {
          setEventHistoryFallback(true)
          setDbEventHistory([])
        } else {
          setDbEventHistory((d.items ?? []).map((e: { project_name: string; project_code: string | null; year: number | null; venue: string; category_tag: string; program_parts: string[]; signage_breakdown: Array<{ category: string; quantity: number; sizes?: string }>; analyzed_item_count: number | null; is_seed: boolean }) => ({
            project_name: e.project_name,
            project_code: e.project_code,
            year: e.year,
            venue: e.venue,
            category_tag: (e.category_tag ?? '일반') as '핵심' | '일반' | '미분류' | '해외',
            has_excel: true,
            has_image: false,
            analyzed_item_count: e.analyzed_item_count ?? undefined,
            program_parts: e.program_parts ?? [],
            signage_breakdown: e.signage_breakdown ?? [],
          })))
        }
      })
      .catch(() => setEventHistoryFallback(true))
  }, [])
  // 5/22 사용자 명시 = 동의어 매핑에 있는 값 = 표준명으로 변환. signage_breakdown.category 영역 자동 표준화.
  const allAliases = useMemo(() => {
    return [
      ...synonyms.map(s => ({ alias_name: s.alias, canonical_name: s.canonical_name, note: s.note ?? null })),
      ...dbAliases.map(a => ({ alias_name: a.alias_name, canonical_name: a.canonical_name, note: a.note ?? null })),
    ]
  }, [synonyms, dbAliases])
  const resolveCategoryName = useMemo(() => {
    const aliasMap = new Map<string, string>()
    const normFn = (s: string) => s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()
    for (const a of allAliases) {
      aliasMap.set(normFn(a.alias_name), a.canonical_name)
    }
    return (raw: string): string => aliasMap.get(normFn(raw)) ?? raw
  }, [allAliases])

  // 5/22 사용자 명시 = venue별 program_parts·signage_breakdown 영역 집계 + 동의어 자동 표준화
  // 5/22 사용자 명시 = 프로그램 파트 관리 = 화살표 펼침 영역 (행사 관리와 동일 패턴)
  const [expandedPartCode, setExpandedPartCode] = useState<string | null>(null)
  // 5/22 사용자 명시 = 행사 관리 편집·삭제·추가 (localStorage 오버라이드 패턴)
  const [hiddenEventKeys, setHiddenEventKeys] = useState<string[]>([])
  const [eventOverrides, setEventOverrides] = useState<Record<string, { project_name?: string; venue?: string; year?: number; program_parts?: string[]; analyzed_item_count?: number }>>({})
  const [customEvents, setCustomEvents] = useState<Array<{ project_name: string; project_code: string; year: number; venue: string; category_tag: '핵심'|'일반'|'미분류'|'해외'; program_parts: string[]; analyzed_item_count?: number }>>([])
  const [editingEvent, setEditingEvent] = useState<{ project_name: string; project_code: string; year: number; venue: string; program_parts: string[]; analyzed_item_count?: number } | null>(null)

  // 통합 SOT = DB 영역 있으면 우선·없으면 SEED 영역 + 사용자 프로젝트 + 커스텀 영역 통합
  // 5/22 사용자 명시 = 행사 관리 = SOT·행사장 관리·프로그램 파트 관리·환경장식물 관리 영역 모두 영향
  const unifiedEventHistory = useMemo(() => {
    const base = dbEventHistory.length > 0 && !eventHistoryFallback ? dbEventHistory : SEED_EVENT_HISTORY
    const userMapped = userEventHistory.map(e => ({
      ...e,
      has_excel: e.has_excel ?? true,
      has_image: e.has_image ?? false,
    })) as typeof SEED_EVENT_HISTORY
    const customMapped = customEvents.map(e => ({
      ...e,
      has_excel: true,
      has_image: false,
      signage_breakdown: undefined,
    })) as unknown as typeof SEED_EVENT_HISTORY
    return [...base, ...userMapped, ...customMapped]
  }, [dbEventHistory, eventHistoryFallback, userEventHistory, customEvents])

  const venueAggregateByName = useMemo(() => {
    const map = new Map<string, { program_parts: Set<string>; signage: Map<string, number> }>()
    for (const e of unifiedEventHistory) {
      const venueNorm = e.venue
      if (!map.has(venueNorm)) map.set(venueNorm, { program_parts: new Set(), signage: new Map() })
      const slot = map.get(venueNorm)!
      for (const p of e.program_parts ?? []) slot.program_parts.add(p)
      for (const s of e.signage_breakdown ?? []) {
        // 동의어 → 표준명 자동 변환
        const standardName = resolveCategoryName(s.category)
        slot.signage.set(standardName, (slot.signage.get(standardName) ?? 0) + s.quantity)
      }
    }
    return map
  }, [unifiedEventHistory, resolveCategoryName])
  // PR#3 단위 9c (δ 정책): 이벤트 관리 — DB(/api/event-history) 영속화.
  //   localStorage(mice_custom_events·mice_event_overrides·mice_hidden_events) 폐기.
  //   API 실패 시 in-memory만 유지 (graceful degradation).
  useEffect(() => {
    // 마운트 시 1회: DB에 push (in-memory state 변경은 즉시·DB는 best-effort)
    // 본격 fetch는 serverEventHistory props로 SSR 단계에서 이미 수행됨 (page.tsx).
    // 본 컴포넌트는 변경 시 PATCH/DELETE만 보냄.
  }, [])
  const toggleHideEvent = (key: string) => {
    setHiddenEventKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      // DB 영속화: custom event는 DELETE, 시드는 hidden 토글이 의미 없으므로 클라이언트 state만 (시드 가시화는 UI 토글)
      if (key.startsWith('custom_')) {
        fetch('/api/event-history', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project_code: key }) }).catch(() => {})
      }
      return next
    })
  }
  const saveEventEdit = (originalKey: string, draft: { project_name: string; project_code: string; year: number; venue: string; program_parts: string[]; analyzed_item_count?: number }) => {
    const isCustom = originalKey.startsWith('custom_')
    if (isCustom) {
      setCustomEvents(prev => prev.map(e => (e.project_code === originalKey.replace('custom_', '')) ? { ...e, ...draft, category_tag: e.category_tag } : e))
    } else {
      setEventOverrides(prev => ({ ...prev, [originalKey]: draft }))
    }
    // DB 영속화 (PATCH)
    fetch('/api/event-history', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project_code: originalKey, patch: draft }),
    }).catch(() => {})
    setEditingEvent(null)
  }
  const addCustomEvent = (draft: { project_name: string; project_code: string; year: number; venue: string; program_parts: string[]; analyzed_item_count?: number }) => {
    if (!draft.project_name.trim()) { alert('행사명 필수'); return }
    const code = draft.project_code || 'custom_' + Date.now().toString(36)
    setCustomEvents(prev => [...prev, { ...draft, category_tag: '일반' as const, project_code: code }])
    // DB 영속화 (POST)
    fetch('/api/event-history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draft, project_code: code, source: 'manual' }),
    }).catch(() => {})
    setEditingEvent(null)
  }

  // PR#3 단위 9c (δ 정책): localStorage 폐기 — 마운트 시 1회 클린업.
  //   DB 영속화로 전환된 키 (mice_program_part_*·mice_custom_events·mice_event_overrides·
  //   mice_hidden_events·mice_signage_type_overrides) 모두 삭제.
  //   기존 데이터 마이그레이션 없음 (PO 확정).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const legacyKeys = [
      'mice_hidden_program_parts',
      'mice_program_part_overrides',
      'mice_custom_program_parts',
      'mice_hidden_events',
      'mice_event_overrides',
      'mice_custom_events',
      'mice_signage_type_overrides',
      // PR#4 단위 5: 잔존 4종도 DB 영속화로 전환 — 클린업 추가
      'mice_hidden_seed_aliases',
      'mice_hidden_signage_types',
      'mice_hidden_facility_venues',
      'mice_signage_type_samples',
    ]
    for (const k of legacyKeys) {
      try { localStorage.removeItem(k) } catch {}
    }
  }, [])

  // PR#4 단위 5 (δ 정책): 잔존 localStorage 4종 → DB 영속화 (migration_v19).
  //   - mice_hidden_seed_aliases  → signage_aliases.is_hidden
  //   - mice_hidden_signage_types → signage_types.is_hidden
  //   - mice_hidden_facility_venues → venues.is_hidden
  //   - mice_signage_type_samples → signage_types.sample_image_url
  // 마운트 시 DB에서 fetch (graceful degradation — 마이그레이션 미적용 시 in-memory만).
  useEffect(() => {
    // 1) signage_aliases is_hidden
    fetch('/api/admin/aliases?hidden=true')
      .then(r => r.ok ? r.json() : null)
      .then((d: { items?: Array<{ alias_name: string }> } | null) => {
        if (d?.items) setHiddenSeedAliases(d.items.map(i => i.alias_name))
      })
      .catch(() => { /* silent — DB·컬럼 미적용 */ })
    // 2) signage_types is_hidden + sample_image_url
    fetch('/api/admin/signage-types')
      .then(r => r.ok ? r.json() : null)
      .then((d: { items?: Array<{ id: string; is_hidden?: boolean; sample_image_url?: string | null }> } | null) => {
        if (!d?.items) return
        const hidden = d.items.filter(t => t.is_hidden).map(t => t.id)
        const samples: Record<string, string> = {}
        for (const t of d.items) {
          if (t.sample_image_url) samples[t.id] = t.sample_image_url
        }
        setHiddenSignageTypeIds(hidden)
        setSignageTypeSamples(samples)
      })
      .catch(() => { /* silent */ })
    // 3) venues is_hidden
    fetch('/api/admin/venues?hidden=true')
      .then(r => r.ok ? r.json() : null)
      .then((d: { items?: Array<{ id: string }> } | null) => {
        if (d?.items) setHiddenFacilityVenues(d.items.map(v => v.id))
      })
      .catch(() => { /* silent */ })
  }, [])
  const saveSignageTypeSample = async (typeId: string, url: string) => {
    setSignageTypeSamples(prev => ({ ...prev, [typeId]: url }))
    // DB 영속화 (모든 사용자 공유) — API 실패 시 in-memory만
    try {
      await fetch(`/api/admin/signage-types/${typeId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sample_image_url: url }),
      })
    } catch { /* silent */ }
  }
  // 5/22 P1-2 = 이미지 교체·삭제 영역 (Storage upload + sample localStorage)
  // 5/22 사용자 명시 = "사진 넣어도 적용 안 됨" 정정 = path 영역 ASCII safe·console.log 디버그·alert 명확
  const replaceSignageTypeImage = async (t: SignageTypeRow) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      console.log('[이미지 교체] file selected:', file.name, file.size)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { alert('로그인이 필요합니다'); return }
        // ASCII safe id 영역 = 한글 영역 path 차단
        const safeId = t.id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50) || 'signage'
        const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${user.id}/signage-samples/${safeId}-${Date.now()}.${ext}`
        console.log('[이미지 교체] upload path:', path)
        const { error: upErr } = await supabase.storage.from('design-images').upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) {
          console.error('[이미지 교체] Storage upload 실패:', upErr)
          alert('이미지 업로드 실패: ' + upErr.message + '\n\n원인 가능성:\n• design-images 버킷 부재 → Supabase Studio Storage 생성\n• Storage RLS 정책 차단\n• 파일 크기 10MB 초과')
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)
        console.log('[이미지 교체] ✓ publicUrl:', publicUrl)
        saveSignageTypeSample(t.id, publicUrl)
        alert(`'${t.name}' 예시 이미지 교체 완료`)
      } catch (e) {
        console.error('[이미지 교체] Exception:', e)
        alert('이미지 교체 실패 (F12 콘솔 확인): ' + (e instanceof Error ? e.message : 'unknown'))
      }
    }
    input.click()
  }
  const deleteSignageTypeImage = (t: SignageTypeRow) => {
    if (!confirm(`'${t.name}' 예시 이미지 삭제?`)) return
    setSignageTypeSamples(prev => {
      const next = { ...prev }
      delete next[t.id]
      return next
    })
    // PR#4 단위 5: DB sample_image_url 클리어
    fetch(`/api/admin/signage-types/${t.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sample_image_url: null }),
    }).catch(() => {})
  }
  // PR#4 단위 5: DB 영속화 (signage_aliases·signage_types·venues 의 is_hidden 컬럼)
  const toggleHideSeedAlias = (alias: string) => {
    setHiddenSeedAliases(prev => {
      const willHide = !prev.includes(alias)
      const next = willHide ? [...prev, alias] : prev.filter(a => a !== alias)
      // DB best-effort
      fetch('/api/admin/aliases', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alias_name: alias, is_hidden: willHide }),
      }).catch(() => {})
      return next
    })
  }
  const toggleHideSignageType = (id: string) => {
    setHiddenSignageTypeIds(prev => {
      const willHide = !prev.includes(id)
      const next = willHide ? [...prev, id] : prev.filter(a => a !== id)
      fetch(`/api/admin/signage-types/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_hidden: willHide }),
      }).catch(() => {})
      return next
    })
  }
  const toggleHideFacilityVenue = (key: string) => {
    setHiddenFacilityVenues(prev => {
      const willHide = !prev.includes(key)
      const next = willHide ? [...prev, key] : prev.filter(a => a !== key)
      fetch(`/api/admin/venues/${key}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_hidden: willHide }),
      }).catch(() => {})
      return next
    })
  }
  const [entranceNote, setEntranceNote] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [floorPlan, setFloorPlan] = useState<File | null>(null)
  // 5/22 사용자 명시 = 행사장 추가 시 시설 가이드북·매뉴얼 영역 첨부
  const [facilityGuideFile, setFacilityGuideFile] = useState<File | null>(null)
  // 5/22 사용자 명시 = 도면 학습 X·venue 가이드 영역 시설 가이드 학습 현황 영역 자동 채움
  const [allowedCategories, setAllowedCategories] = useState('')
  const [warningsText, setWarningsText] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const resetForm = () => {
    setName(''); setRegion(''); setVenueType(''); setHallSplit(false)
    setEntranceNote(''); setAreaSqm(''); setFloorPlan(null); setFacilityGuideFile(null); setAllowedCategories(''); setWarningsText(''); setAddError(null)
  }

  const addVenue = async () => {
    if (!name.trim()) { setAddError('행사장 이름을 입력하세요.'); return }
    setAdding(true); setAddError(null)
    try {
      const supabase = createClient()
      let floorPlanUrl: string | null = null
      if (floorPlan) {
        const ext = (floorPlan.name.split('.').pop() || 'bin').toLowerCase()
        const path = `${userId}/admin-venues/floor-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('design-images').upload(path, floorPlan, { contentType: floorPlan.type || undefined, upsert: false })
        if (upErr) {
          setAddError('도면 업로드 실패: ' + explainStorageError(upErr.message))
          setAdding(false); return
        }
        const { data: pub } = supabase.storage.from('design-images').getPublicUrl(path)
        floorPlanUrl = pub.publicUrl
      }
      // 5/22 사용자 명시 = 시설 가이드북·매뉴얼 영역 업로드
      let facilityGuideUrl: string | null = null
      if (facilityGuideFile) {
        const ext = (facilityGuideFile.name.split('.').pop() || 'pdf').toLowerCase()
        const path = `${userId}/admin-venues/guide-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('design-images').upload(path, facilityGuideFile, { contentType: facilityGuideFile.type || undefined, upsert: false })
        if (upErr) {
          setAddError('가이드북 업로드 실패: ' + explainStorageError(upErr.message))
          setAdding(false); return
        }
        const { data: pub } = supabase.storage.from('design-images').getPublicUrl(path)
        facilityGuideUrl = pub.publicUrl
      }
      const venueRow: Record<string, unknown> = {
        name: name.trim(),
        region: region || null,
        venue_type: venueType || null,
        has_hall_split: hallSplit,
        main_entrance_note: entranceNote.trim() || null,
        area_sqm: areaSqm ? parseInt(areaSqm) : null,
        floor_plan_url: floorPlanUrl,
        created_by: userId,
      }
      if (facilityGuideUrl) venueRow.facility_guide_url = facilityGuideUrl
      // 5/22 사용자 명시 = 도면 학습 X·카테고리·주의사항 직접 입력 영역 = facility_guide_json 영역 채움
      const catList = allowedCategories.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      const warnList = warningsText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      if (catList.length > 0 || warnList.length > 0) {
        venueRow.facility_guide_json = {
          install_allowed: catList.map(category => ({ category, status: 'allowed' })),
          warnings: warnList.map(description => ({ type: '주의사항', description })),
          mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '운영팀 협의 영역.' },
          rigging: { available: true, note: '운영팀 도면 영역.' },
          safety: { fire: '난연 2급 이상.', fall: '리깅 2점.', electric: '220V.', weather: '실내.', note: '비상구 가림 X.' },
          digital_signage: { content_review: true, allowed_locations: [], note: '운영팀 영역.' },
          last_updated: new Date().toISOString().slice(0, 10),
          special_notes: [],
        }
      }
      const { data: venue, error: insErr } = await supabase.from('venues').insert(venueRow).select().single()
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
      {/* v9.33: 헤더 인라인 nav 제거 — 글로벌 좌측 사이드바(AdminSidebar)로 일원화 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* v9.36 시안 매칭: 페이지 타이틀 좌상단 */}
        <h1 className="text-xl font-bold text-slate-900">데이터 학습 관리자</h1>

        {/* v9.36 시안 매칭: 상단 KPI 3카드 — 누적 행사장 수 · 환경 장식물 종류 · 동의어 매핑 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[11px] text-slate-500">누적 행사장 수</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{initialVenues.length}<span className="text-sm text-slate-400 ml-1">개</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[11px] text-slate-500">환경 장식물 종류</p>
            <p className="text-2xl font-bold text-indigo-700 mt-0.5">{signageTypeCount}<span className="text-sm text-slate-400 ml-1">종</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[11px] text-slate-500">동의어 매핑</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{synonyms.length}<span className="text-sm text-slate-400 ml-1">건</span></p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* v9.36 시안 매칭: 좌측 자체 사이드바 — 6 평면 메뉴, 부연 desc 없음 */}
          <aside className="w-52 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
              <nav className="p-1.5 space-y-0.5">
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  const active = activeSection === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveSection(s.key)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition text-left text-xs font-medium ${
                        active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {s.label}
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

        {/* v9.36: 시안에 ′개요′ 메뉴 없음 → 비활성화 (코드는 보존). */}
        {false && <>
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            개요
          </h2>

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
            </div>
          </div>
        </section>
        </>}
        {activeSection === 'venue-status' && <>
        {/* 5/21 사용자 명시 = NIST 4단 안전망·전체 학습 요약·향후 도입 로드맵 표 3건 UI 표시 제거.
            메타 표시 = ′응? 금지′ 룰 위반·사용자 UI 영역 불필요. 시드는 lib에 보존. */}

        {/* ── 0. 행사장별 학습 현황 — 점진적 정확도 가시화 (★ v9) ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            행사장별 학습 현황
          </h2>
          {venueLearningStatus.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-4 text-center">아직 누적된 프로젝트가 없습니다. 신규 프로젝트가 생성되면 5분 이내 반영됩니다.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    {/* 5/22 사용자 명시 = ▶ 펼침 = 휘하 홀 영역 (코엑스 → 그랜드볼룸·아셈볼룸 등). 헤더 = 휘하 영역 정합. */}
                    <th className="px-2 py-2 w-6"></th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">행사장 / 휘하 홀</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">프로젝트</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">전체 항목</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap" title="실제 다운로드·발주가 완료된 항목 수 (학습 신호)">발주 완료</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap" title="AI 추천 정확도 = 사용자가 수정하지 않은 비율. 초기 100%·수정 시마다 감점·item_edit_log 영역 누적 후 정확 측정. 현재는 발주 완료 비율로 임시 대체.">AI 추천 정확도 %</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap" title="이 휘하 홀에서 사용된 환경장식물 종류 (event_history.signage_breakdown 합산·signage_types.name 매칭만)">환경장식물 종류</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap" title="이 휘하 홀에서 진행한 프로그램 파트">프로그램 파트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 5/22 사용자 명시 = 행사장별 그룹핑 (코엑스·킨텍스 등 L1)·▶ 펼침 = 휘하 L2 홀 (그랜드볼룸·아셈볼룸·D홀 등). 휘하 행사 펼침 X. */}
                  {(() => {
                    const filtered = venueLearningStatus.filter(v => {
                      const noLearn = v.stage.finalized === 0 && (!v.category_coverage || v.category_coverage.filled.length === 0)
                      const stubName = ['미정', '복합', '온라인+오프라인', '온라인', '미상'].includes(v.venue?.trim() ?? '')
                      return !(noLearn || stubName)
                    })
                    // L1 그룹 = venue 이름 첫 단어 (코엑스·킨텍스·송도 등)
                    const groups = new Map<string, typeof filtered>()
                    for (const v of filtered) {
                      // 5/22 사용자 명시 = "ICC JEJU 및 인근호텔" + "(ICC JEJU)" 같은 영역 다른 행사장 영역 영역 X
                      // = normalizeVenueName 영역 적용 후 = 같은 행사장 영역 같은 L1 그룹
                      const normalized = normalizeVenueName(v.venue ?? '')
                      const g = (normalized.split(' ')[0] || normalized || v.venue)
                      if (!groups.has(g)) groups.set(g, [])
                      groups.get(g)!.push(v)
                    }
                    const out: React.ReactNode[] = []
                    Array.from(groups.entries()).forEach(([groupName, members]) => {
                      const isGroupOpen = expandedVenueLearningKey === groupName
                      const groupProjects = members.reduce((s, m) => s + m.project_count, 0)
                      const groupItems = members.reduce((s, m) => s + m.item_count, 0)
                      const groupFinalized = members.reduce((s, m) => s + m.stage.finalized, 0)
                      const groupPct = groupItems > 0 ? Math.round((groupFinalized / groupItems) * 100) : 0
                      const groupColor = groupPct >= 70 ? 'text-emerald-600' : groupPct >= 40 ? 'text-amber-600' : 'text-rose-600'
                      // 5/22 사용자 명시 = 행사장 학습 현황 L1 = 휘하 합산 (환경장식물·프로그램 파트 영역 다 써줘)
                      const validNames = new Set(signageTypeList.map(s => s.name))
                      const groupSig = new Set<string>()
                      const groupParts = new Set<string>()
                      for (const m of members) {
                        const venueAgg = venueAggregateByName.get(m.venue)
                        if (venueAgg) {
                          Array.from(venueAgg.signage.keys()).forEach(k => { if (validNames.has(k)) groupSig.add(k) })
                          Array.from(venueAgg.program_parts).forEach(p => groupParts.add(p))
                        }
                        for (const s of m.signage_breakdown ?? []) if (validNames.has(s.category)) groupSig.add(s.category)
                        for (const p of m.program_parts ?? []) groupParts.add(p)
                      }
                      // 5/22 = 의전 (40.18) 등 삭제된 영역 코드 raw 표시 X·filter
                      const groupPartNames = Array.from(groupParts)
                        .map(c => PROGRAM_PART_BY_CODE.get(c)?.name)
                        .filter((n): n is string => Boolean(n))
                      // L1 = 행사장 그룹 행
                      out.push(
                        <tr key={`L1-${groupName}`} className="bg-indigo-50/60 hover:bg-indigo-50 cursor-pointer border-t-2 border-indigo-100"
                            onClick={() => setExpandedVenueLearningKey(isGroupOpen ? null : groupName)}>
                          <td className="px-2 py-1.5 text-indigo-700 text-center font-semibold">{isGroupOpen ? '▼' : '▶'}</td>
                          <td className="px-2 py-1.5 text-indigo-900 font-semibold whitespace-nowrap">
                            {groupName} <span className="text-[10px] text-indigo-500 ml-1 font-normal">(휘하 홀 {members.length})</span>
                          </td>
                          <td className="px-2 py-1.5 text-right text-indigo-700 font-mono">{groupProjects}</td>
                          <td className="px-2 py-1.5 text-right text-indigo-700 font-mono">{groupItems}</td>
                          <td className="px-2 py-1.5 text-right text-emerald-700 font-mono">{groupFinalized}</td>
                          <td className={`px-2 py-1.5 text-right font-mono font-semibold ${groupColor}`}>{groupPct}%</td>
                          <td className="px-2 py-1.5 text-left">
                            {groupSig.size === 0 ? <span className="text-indigo-300 text-[10px]">—</span> : (
                              <div className="flex flex-wrap gap-0.5">
                                {Array.from(groupSig).map(name => <span key={name} className="inline-block px-1 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-medium">{name}</span>)}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-left">
                            {groupPartNames.length === 0 ? <span className="text-indigo-300 text-[10px]">—</span> : (
                              <div className="flex flex-wrap gap-0.5">
                                {groupPartNames.map(pt => <span key={pt} className="inline-block px-1 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] rounded font-medium">{pt}</span>)}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                      if (!isGroupOpen) return
                      // L2 = 휘하 홀 (그랜드볼룸·아셈볼룸 등)
                      members.forEach(v => {
                        const acc = v.accuracy_estimate
                        const color = acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-rose-600'
                        const parts = v.program_parts ?? []
                        const pct = v.item_count > 0 ? Math.round((v.stage.finalized / v.item_count) * 100) : 0
                        // L2 = 그룹명 제외한 휘하 홀 이름 (예: "코엑스 그랜드볼룸" → "그랜드볼룸")
                        const subName = v.venue.startsWith(groupName + ' ') ? v.venue.slice(groupName.length + 1) : v.venue
                        out.push(
                          <tr key={`L2-${v.venue}`} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 text-slate-300 text-[11px] text-center">·</td>
                            <td className="px-2 py-1.5 text-slate-800 whitespace-nowrap pl-6" title={v.venue}>{subName}</td>
                            <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{v.project_count}</td>
                            <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{v.item_count}</td>
                            <td className="px-2 py-1.5 text-right text-emerald-600 font-mono font-semibold">{v.stage.finalized}</td>
                            <td className={`px-2 py-1.5 font-mono font-semibold ${color}`}>
                              <div className="flex items-center gap-2 justify-end">
                                <div className="flex-1 max-w-[80px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="whitespace-nowrap min-w-[3em] text-right">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-left">
                              {(() => {
                                const validNames = new Set(signageTypeList.map(s => s.name))
                                const venueAgg = venueAggregateByName.get(v.venue)
                                const fromAgg = venueAgg ? Array.from(venueAgg.signage.keys()) : []
                                const fromLive = (v.signage_breakdown ?? []).map(s => s.category)
                                const usedTypes = Array.from(new Set([...fromAgg, ...fromLive].filter(c => validNames.has(c))))
                                if (usedTypes.length === 0) return <span className="text-slate-300 text-[10px]">—</span>
                                return (
                                  <div className="flex flex-wrap gap-0.5">
                                    {usedTypes.map(name => <span key={name} className="inline-block px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded">{name}</span>)}
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-2 py-1.5 text-left">
                              {(() => {
                                const venueAgg = venueAggregateByName.get(v.venue)
                                const fromAgg = venueAgg ? Array.from(venueAgg.program_parts).map(code => PROGRAM_PART_BY_CODE.get(code)?.name).filter((n): n is string => Boolean(n)) : []
                                const allParts = Array.from(new Set([...fromAgg, ...parts]))
                                if (allParts.length === 0) return <span className="text-slate-300 text-[10px]">미입력</span>
                                return (
                                  <div className="flex flex-wrap gap-0.5">
                                    {allParts.map(pt => <span key={pt} className="inline-block px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded">{pt}</span>)}
                                  </div>
                                )
                              })()}
                            </td>
                          </tr>
                        )
                      })
                    })
                    return out
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 5/22 사용자 명시 = 사용자 프로젝트별 정보 추가 */}
        {userProjectIndex.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              사용자 프로젝트 ({userProjectIndex.length})
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              실제 사용자가 생성한 프로젝트. 행사장·항목 수·발주 완료 비율 한눈에 확인.
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">행사명</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">행사장·홀</th>
                    <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">행사일</th>
                    <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">상태</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">항목</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">발주 완료</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">완료율</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">프로그램 파트</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">담당자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userProjectIndex.map(p => {
                    const rateColor = p.completion_rate >= 70 ? 'text-emerald-600' : p.completion_rate >= 40 ? 'text-amber-600' : 'text-rose-600'
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-800 font-medium whitespace-nowrap" title={p.name}>{p.name}</td>
                        <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{p.event_venue ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center text-slate-500 text-[11px]">{p.event_date ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            p.status === '완료' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === '진행중' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{p.total_items}</td>
                        <td className="px-2 py-1.5 text-right text-emerald-600 font-mono font-semibold">{p.finalized_items}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${rateColor}`}>{p.completion_rate}%</td>
                        <td className="px-2 py-1.5 text-left">
                          {p.program_parts.length === 0 ? <span className="text-slate-300 text-[10px]">미입력</span> : (
                            <div className="flex flex-wrap gap-0.5">
                              {p.program_parts.map(pt => (
                                <span key={pt} className="inline-block px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded">{pt}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-slate-500 text-[10px] whitespace-nowrap">
                          {p.last_edited_by ? p.last_edited_by.split('@')[0] : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5/22 사용자 명시 = "학습 시킨 행사 인덱스 (44)" 영역 전부 삭제. venue-status 섹션 내 잔존 표 제거.
            행사 관리 메뉴 (events 섹션)에 5대 영역 정합 표만 유지. */}

        </>}
        {activeSection === 'venues' && <>
        {/* 5/22 사용자 명시 = 행사장 추가 영역 = 시설 가이드 메뉴 영역 이동. 행사장 관리 영역 = 학습된 행사장 표만. */}
        {false && <>
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
            {/* 5/22 사용자 명시 = 도면·가이드북·학습 큐·사용자 요청 영역 = 시설 가이드 메뉴로 이동. 행사장 추가 영역은 기본 정보만. */}
            <div className="sm:col-span-2">
              <p className="text-[10px] text-slate-400 italic">※ 도면·시설 가이드북 첨부 영역 = 시설 가이드 메뉴 영역에서 venue별 영역 영역 진행</p>
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

        </>}
        {/* 5/22 사용자 명시 = 사용자 요청 대기·도면 학습 큐 = 시설 가이드 메뉴 영역 이동·행사장 영역 hidden */}
        {false && <>
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

        </>}
        {/* 5/22 사용자 명시 = 도면 학습 큐 = 시설 가이드 메뉴 영역 이동·행사장 영역 hidden */}
        {false && <>
        {(() => {
          const pendingJobs = jobs.filter(j => j.status !== 'done' && j.status !== 'skipped')
          return (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            도면 학습 큐 ({pendingJobs.length})
          </h2>
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
        </>}
        {/* HOTFIX (2026-05-20): 3번째 false && 가드 닫기를 도면 학습 큐 직후로 이동.
            이전엔 학습된 행사장 section도 같은 가드에 갇혀 venues 메뉴 클릭 시 빈 화면 버그.
            학습된 행사장 section은 venues 메뉴의 핵심 컨텐츠이므로 가드 밖에서 항상 렌더. */}

        {/* 5/21 사용자 명시 = 표준 행사장 계층 트리 + 학습된 행사장 표 = 한 표로 통합.
            VenueHierarchyTree 별도 컴포넌트 제거. 학습된 행사장 표 행 클릭 시 하위 L2 홀 펼침. */}

        {/* ── HOTFIX (2026-05-20): 행사장 관리 3단계 트리 (L1 행사장·L2 홀·L3 환경장식물 표) ── */}
        {/*   PO 명세 — 컬럼: 행사장 / 누적 행사 수 / 환경장식물 종류 수 / 행위
              L2 (홀 펼침): 같은 컬럼·홀 이름
              L3 (홀 펼침): SignageUsageTable (종류·표준 규격·평균 수량)
              홀 데이터 부재 행사장 → L2 스킵·L1 펼침 시 바로 L3 (graceful degradation) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            학습된 행사장 — 과거 진행 내역 ({(() => {
              const set = new Set<string>()
              for (const v of venues) if (v.name) set.add(v.name.trim())
              for (const ev of unifiedEventHistory) {
                const vname = (ev.venue ?? '').trim()
                if (vname && vname !== '미정' && vname !== '미상') set.add(vname)
              }
              return set.size
            })()})
          </h2>
          <p className="text-[10px] text-slate-500 mb-3">행사장별 과거 진행 행사·환경장식물 사용 내역 = AI 추천에 학습 데이터로 자동 주입. 행사장의 규칙은 <span className="text-indigo-600 font-medium">시설 가이드</span>에서 관리.</p>
          {venues.length === 0 && unifiedEventHistory.length === 0 ? (
            <p className="text-slate-400 text-xs italic">아직 등록된 행사장·진행 행사가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200 text-[11px]">
                    <th className="text-left p-2 w-6"></th>
                    <th className="text-left p-2">행사장 / 휘하 홀</th>
                    <th className="text-right p-2">누적 행사 수</th>
                    <th className="text-right p-2">환경장식물 종류 수</th>
                    <th className="text-right p-2">행위</th>
                  </tr>
                </thead>
                <tbody>
                  {/* HOTFIX 3단계 트리: L1 행사장 / L2 홀 / L3 환경장식물 표 (SignageUsageTable) */}
                  {(() => {
                    const validTypeNames = new Set(signageTypeList.map(s => s.name))

                    // ① venue 그룹핑: unifiedEventHistory + venues 합쳐서 L1 그룹명 추출 (첫 단어)
                    const groupedEvents = new Map<string, typeof unifiedEventHistory>()
                    for (const ev of unifiedEventHistory) {
                      const vname = (ev.venue ?? '').trim()
                      if (!vname || vname === '미정' || vname === '미상') continue
                      const normName = normalizeVenueName(vname)
                      const groupName = (normName.split(' ')[0] || normName || vname)
                      if (!groupedEvents.has(groupName)) groupedEvents.set(groupName, [])
                      groupedEvents.get(groupName)!.push(ev)
                    }
                    // venues DB 에만 있는 행사장도 보강 (행사 0건이라도 표시)
                    for (const v of venues) {
                      if (!v.name) continue
                      const normName = normalizeVenueName(v.name)
                      const groupName = (normName.split(' ')[0] || normName || v.name)
                      if (!groupedEvents.has(groupName)) groupedEvents.set(groupName, [])
                    }

                    const sortedGroups = Array.from(groupedEvents.entries())
                      .sort(([, a], [, b]) => b.length - a.length)

                    const out: React.ReactNode[] = []

                    sortedGroups.forEach(([groupName, groupEvents]) => {
                      const isL1Open = expandedVenueId === groupName

                      // L1 행사장 row: 누적 행사 수·환경장식물 종류 수
                      const l1CatSet = new Set<string>()
                      for (const ev of groupEvents) {
                        const bd = ev.signage_breakdown && ev.signage_breakdown.length > 0
                          ? ev.signage_breakdown
                          : estimateSignageBreakdown(ev.program_parts, ev.analyzed_item_count)
                        for (const s of bd) {
                          const standard = resolveCategoryName(s.category)
                          if (validTypeNames.has(standard)) l1CatSet.add(standard)
                        }
                      }
                      const l1Venue = venues.find(v => normalizeVenueName(v.name).startsWith(groupName))

                      out.push(
                        <tr key={`L1-${groupName}`} className="bg-indigo-50/60 hover:bg-indigo-50 cursor-pointer border-t-2 border-indigo-100"
                            onClick={() => setExpandedVenueId(isL1Open ? null : groupName)}>
                          <td className="p-2 text-indigo-700 text-center font-semibold">{isL1Open ? '▼' : '▶'}</td>
                          <td className="p-2 text-indigo-900 font-semibold">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              {groupName}
                            </div>
                          </td>
                          <td className="p-2 text-right text-emerald-700 font-mono">{groupEvents.length}건</td>
                          <td className="p-2 text-right text-amber-700 font-mono">{l1CatSet.size}종</td>
                          <td className="p-2 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {l1Venue && (
                              <button
                                onClick={async () => {
                                  const newName = prompt('행사장 이름', l1Venue.name)
                                  if (newName === null) return
                                  try {
                                    const res = await fetch(`/api/admin/venues/${l1Venue.id}`, {
                                      method: 'PATCH', headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify({ name: newName.trim() }),
                                    })
                                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
                                    setVenues(prev => prev.map(x => x.id === l1Venue.id ? { ...x, name: newName.trim() } : x))
                                  } catch (e) { alert('수정 실패: ' + (e instanceof Error ? e.message : 'unknown')) }
                                }}
                                title="편집"
                                className="text-[11px] text-slate-400 hover:text-indigo-600 mr-1"
                              >✎</button>
                            )}
                          </td>
                        </tr>
                      )

                      if (!isL1Open) return

                      // L2 홀 데이터 — getHallsByVenueName으로 시드 매칭
                      const halls = getHallsByVenueName(groupName)

                      if (halls.length === 0) {
                        // graceful degradation: 홀 데이터 부재 → L2 스킵·L1 펼침 시 바로 L3 (해당 그룹 전체 평균)
                        const sigQty = new Map<string, number>()
                        for (const ev of groupEvents) {
                          const bd = ev.signage_breakdown && ev.signage_breakdown.length > 0
                            ? ev.signage_breakdown
                            : estimateSignageBreakdown(ev.program_parts, ev.analyzed_item_count)
                          for (const s of bd) {
                            const standard = resolveCategoryName(s.category)
                            if (!validTypeNames.has(standard)) continue
                            sigQty.set(standard, (sigQty.get(standard) ?? 0) + s.quantity)
                          }
                        }
                        const items = Array.from(sigQty.entries())
                          .map(([category, total]) => ({ category, avg_quantity: groupEvents.length > 0 ? total / groupEvents.length : 0 }))
                          .filter(s => s.avg_quantity > 0)
                        out.push(
                          <tr key={`L3-${groupName}-direct`} className="bg-slate-50/60">
                            <td></td>
                            <td colSpan={4} className="px-6 py-3">
                              <div className="text-[10px] text-slate-500 italic mb-2">휘하 홀 정보 미적용 — 행사장 전체 평균 표시</div>
                              {groupEvents.length < 3 ? (
                                <div className="text-[10px] text-slate-400 italic">학습 데이터 부재 (누적 {groupEvents.length}건 &lt; 3건)</div>
                              ) : (
                                <SignageUsageTable items={items} compact />
                              )}
                            </td>
                          </tr>
                        )
                        return
                      }

                      // L2 = 휘하 홀 행 (각 홀 누적 행사 수·환경장식물 종류 수)
                      halls.forEach(hall => {
                        const hallEvents = groupEvents.filter(ev => (ev.venue ?? '').includes(hall.name))
                        const hallCatSet = new Set<string>()
                        for (const ev of hallEvents) {
                          const bd = ev.signage_breakdown && ev.signage_breakdown.length > 0
                            ? ev.signage_breakdown
                            : estimateSignageBreakdown(ev.program_parts, ev.analyzed_item_count)
                          for (const s of bd) {
                            const standard = resolveCategoryName(s.category)
                            if (validTypeNames.has(standard)) hallCatSet.add(standard)
                          }
                        }
                        const l2Key = `L2-${groupName}-${hall.name}`
                        const isL2Open = expandedVenueId === l2Key
                        out.push(
                          <tr key={l2Key} className="hover:bg-slate-50/50 cursor-pointer"
                              onClick={() => setExpandedVenueId(isL2Open ? null : l2Key)}>
                            <td className="p-2 text-slate-400 text-[11px] text-center">{isL2Open ? '▽' : '▷'}</td>
                            <td className="p-2 text-slate-800 pl-6">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {hall.name}
                              </div>
                            </td>
                            <td className="p-2 text-right text-emerald-600 font-mono">{hallEvents.length > 0 ? `${hallEvents.length}건` : <span className="text-slate-300">—</span>}</td>
                            <td className="p-2 text-right text-amber-600 font-mono">{hallCatSet.size > 0 ? `${hallCatSet.size}종` : <span className="text-slate-300">—</span>}</td>
                            <td className="p-2"></td>
                          </tr>
                        )
                        if (!isL2Open) return

                        // L3 = 환경장식물 표 (SignageUsageTable 재사용)
                        if (hallEvents.length < 3) {
                          out.push(
                            <tr key={`L3-${l2Key}`} className="bg-slate-50/60">
                              <td></td>
                              <td colSpan={4} className="px-6 py-3 text-[10px] text-slate-400 italic">학습 데이터 부재 (누적 {hallEvents.length}건 &lt; 3건)</td>
                            </tr>
                          )
                          return
                        }
                        const sigQty = new Map<string, number>()
                        for (const ev of hallEvents) {
                          const bd = ev.signage_breakdown && ev.signage_breakdown.length > 0
                            ? ev.signage_breakdown
                            : estimateSignageBreakdown(ev.program_parts, ev.analyzed_item_count)
                          for (const s of bd) {
                            const standard = resolveCategoryName(s.category)
                            if (!validTypeNames.has(standard)) continue
                            sigQty.set(standard, (sigQty.get(standard) ?? 0) + s.quantity)
                          }
                        }
                        const items = Array.from(sigQty.entries())
                          .map(([category, total]) => ({ category, avg_quantity: total / hallEvents.length }))
                          .filter(s => s.avg_quantity > 0)
                        out.push(
                          <tr key={`L3-${l2Key}`} className="bg-slate-50/60">
                            <td></td>
                            <td colSpan={4} className="px-6 py-3">
                              <SignageUsageTable items={items} compact />
                            </td>
                          </tr>
                        )
                      })
                    })
                    return out
                  })()}
                  {/* 기존 통합 관리표 영역 제거 = 단순 댑스 패턴 정합 */}
                  {false && venues.slice().map(v => {
                    const venueJobs = jobs.filter(j => j.venue_id === v.id)
                    const doneJob = venueJobs.find(j => j.status === 'done')
                    const pendingJob = venueJobs.find(j => j.status === 'queued' || j.status === 'processing')
                    const failedJob = venueJobs.find(j => j.status === 'failed')
                    let halls = getHallsByVenueName(v.name)
                    const isComplexVenue = /[·\/]|외$|외\s/.test(v.name)
                    let extractedL2: string[] = []
                    if (halls.length === 0 && isComplexVenue) {
                      const split = extractL1L2FromComplexVenue(v.name)
                      if (split.l1Info) halls = getHallsByVenueName(split.l1Info.displayName)
                      extractedL2 = split.l2
                    }
                    const isExpanded = expandedVenueId === v.id
                    const canExpand = true
                    const venueEvents = unifiedEventHistory.filter(ev => {
                      const vname = (ev.venue ?? '').trim()
                      if (!vname) return false
                      return vname === v.name || vname.includes(v.name) || v.name.includes(vname)
                    })
                    const validTypeNames = new Set(signageTypeList.map(s => s.name))
                    const sigCountMap = new Map<string, number>()
                    for (const ev of venueEvents) {
                      for (const s of ev.signage_breakdown ?? []) {
                        if (validTypeNames.has(s.category)) {
                          sigCountMap.set(s.category, (sigCountMap.get(s.category) ?? 0) + s.quantity)
                        }
                      }
                    }
                    const totalSigQty = Array.from(sigCountMap.values()).reduce((a, b) => a + b, 0)
                    const sigSorted = Array.from(sigCountMap.entries()).sort((a, b) => b[1] - a[1])
                    const matchedGuide = facilityGuideStatus.find(f => f.venue_name === v.name || v.name.includes(f.venue_name) || f.venue_name.includes(v.name))
                    return (
                    <React.Fragment key={v.id}>
                    <tr className="border-b border-slate-200/40 hover:bg-slate-50/30">
                      <td className="p-2 text-center">
                        {canExpand ? (
                          <button
                            onClick={() => setExpandedVenueId(isExpanded ? null : v.id)}
                            className="text-slate-400 hover:text-indigo-500 transition"
                            title={isExpanded ? '접기' : '하위 홀 펼치기'}
                          >
                            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[9px]">·</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {v.name}
                          {isComplexVenue && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded" title="L1 (대분류) 영역만 입력해야 함. L2 (홀)은 노션 §9 SOT에서 자동 매칭">L1·L2 정합 필요</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-slate-500">{v.region ?? '—'}</td>
                      <td className="p-2 text-slate-500">{v.venue_type ?? '—'}</td>
                      <td className="p-2 text-slate-500">
                        {halls.length > 0 ? (
                          <span className="text-indigo-600 font-medium">{halls.length}개</span>
                        ) : (
                          <span className="text-slate-300">없음</span>
                        )}
                      </td>
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
                      <td className="p-2 text-right whitespace-nowrap">
                        {/* 5/22 사용자 명시 = ✎ 편집 추가 (행사장 마스터 권역·유형·면적·주출입구 등) */}
                        <button
                          onClick={async () => {
                            const newName = prompt('행사장 이름', v.name)
                            if (newName === null) return
                            const newRegion = prompt('권역 (예: 서울특별시·경기도·해외)', v.region ?? '')
                            if (newRegion === null) return
                            const newType = prompt('유형 (예: 컨벤션·호텔·전시장·공공시설·야외·기타)', v.venue_type ?? '')
                            if (newType === null) return
                            const newArea = prompt('면적 (㎡, 숫자만)', v.area_sqm ? String(v.area_sqm) : '')
                            if (newArea === null) return
                            const newEntrance = prompt('주출입구 메모', v.main_entrance_note ?? '')
                            if (newEntrance === null) return
                            const areaNum = newArea.trim() ? Number(newArea) : null
                            if (newArea.trim() && (!Number.isFinite(areaNum!) || areaNum! < 0)) {
                              alert('면적은 0 이상 숫자만 가능')
                              return
                            }
                            try {
                              const res = await fetch(`/api/admin/venues/${v.id}`, {
                                method: 'PATCH',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({
                                  name: newName.trim(),
                                  region: newRegion.trim() || null,
                                  venue_type: newType.trim() || null,
                                  area_sqm: areaNum,
                                  main_entrance_note: newEntrance.trim() || null,
                                }),
                              })
                              if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
                              setVenues(prev => prev.map(x => x.id === v.id ? {
                                ...x,
                                name: newName.trim(),
                                region: newRegion.trim() || null,
                                venue_type: newType.trim() || null,
                                area_sqm: areaNum,
                                main_entrance_note: newEntrance.trim() || null,
                              } : x))
                            } catch (e) { alert('수정 실패: ' + (e instanceof Error ? e.message : 'unknown')) }
                          }}
                          title="행사장 정보 편집"
                          className="text-[11px] text-slate-400 hover:text-indigo-600 mr-2"
                        >✎</button>
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
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="px-6 py-4">
                          {/* 5/22 사용자 명시 = 행사장별 통합 관리표 = 1 행사장 = 모든 학습 정보 1 패널 */}
                          <div className="text-[11px] text-slate-700 font-semibold mb-3 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            {v.name} 통합 관리표
                          </div>

                          {/* KPI 4 카드 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                              <p className="text-[9px] text-slate-500">휘하 홀 (L2)</p>
                              <p className="text-sm font-semibold text-indigo-700">{halls.length || extractedL2.length}<span className="text-[9px] text-slate-400 ml-0.5">개</span></p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                              <p className="text-[9px] text-slate-500">휘하 행사</p>
                              <p className="text-sm font-semibold text-emerald-700">{venueEvents.length}<span className="text-[9px] text-slate-400 ml-0.5">건</span></p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                              <p className="text-[9px] text-slate-500">환경장식물 종류</p>
                              <p className="text-sm font-semibold text-amber-700">{sigCountMap.size}<span className="text-[9px] text-slate-400 ml-0.5">종</span></p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                              <p className="text-[9px] text-slate-500">누적 수량</p>
                              <p className="text-sm font-semibold text-rose-700">{totalSigQty}<span className="text-[9px] text-slate-400 ml-0.5">개</span></p>
                            </div>
                          </div>

                          {/* 기본 정보 */}
                          <div className="bg-white border border-slate-200 rounded p-2.5 mb-2">
                            <p className="text-[10px] text-slate-600 font-semibold mb-1.5">기본 정보</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[10px]">
                              <div><span className="text-slate-400">권역:</span> <span className="text-slate-700">{v.region ?? '—'}</span></div>
                              <div><span className="text-slate-400">유형:</span> <span className="text-slate-700">{v.venue_type ?? '—'}</span></div>
                              <div><span className="text-slate-400">면적:</span> <span className="text-slate-700">{v.area_sqm ? `${v.area_sqm.toLocaleString()}㎡` : '—'}</span></div>
                              <div><span className="text-slate-400">도면:</span> {v.floor_plan_url ? <a href={v.floor_plan_url} target="_blank" rel="noopener" className="text-indigo-600 hover:underline">보기</a> : <span className="text-slate-400">없음</span>}</div>
                              {v.main_entrance_note && (
                                <div className="md:col-span-4"><span className="text-slate-400">주출입구:</span> <span className="text-slate-700">{v.main_entrance_note}</span></div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {/* L2 휘하 홀 + L3 환경장식물 */}
                            {(halls.length > 0 || extractedL2.length > 0) && (
                              <div className="bg-white border border-slate-200 rounded p-2.5">
                                <p className="text-[10px] text-slate-600 font-semibold mb-1.5">L2 휘하 홀·L3 환경장식물</p>
                                <div className="space-y-1.5">
                                  {(halls.length > 0 ? halls.map(h => h.name) : extractedL2).map((hallName, i) => {
                                    const hallSignages = new Set<string>()
                                    for (const ev of unifiedEventHistory) {
                                      if (!(ev.venue ?? '').includes(hallName) && !(ev.venue ?? '').includes(v.name)) continue
                                      for (const s of ev.signage_breakdown ?? []) {
                                        if (validTypeNames.has(s.category)) hallSignages.add(s.category)
                                      }
                                    }
                                    return (
                                      <div key={i} className="border border-slate-100 rounded px-1.5 py-1">
                                        <div className="text-[10px] text-slate-800 font-medium mb-0.5">{hallName}</div>
                                        {hallSignages.size === 0 ? (
                                          <span className="text-[9px] text-slate-300">— 학습 데이터 없음</span>
                                        ) : (
                                          <div className="flex flex-wrap gap-0.5">
                                            {Array.from(hallSignages).map(name => (
                                              <span key={name} className="inline-block px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded">{name}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 환경장식물 빈도 TOP */}
                            <div className="bg-white border border-slate-200 rounded p-2.5">
                              <p className="text-[10px] text-slate-600 font-semibold mb-1.5">환경장식물 사용 빈도 (TOP 10)</p>
                              {sigSorted.length === 0 ? (
                                <p className="text-[9px] text-slate-400 italic">— 휘하 행사 영역에 환경장식물 데이터 없음</p>
                              ) : (
                                <ul className="space-y-0.5">
                                  {sigSorted.slice(0, 10).map(([name, qty]) => (
                                    <li key={name} className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-700">{name}</span>
                                      <span className="text-amber-700 font-mono">{qty}개</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* 휘하 행사 목록 */}
                            <div className="bg-white border border-slate-200 rounded p-2.5">
                              <p className="text-[10px] text-slate-600 font-semibold mb-1.5">휘하 행사 ({venueEvents.length})</p>
                              {venueEvents.length === 0 ? (
                                <p className="text-[9px] text-slate-400 italic">— 매칭 행사 없음</p>
                              ) : (
                                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                                  {venueEvents.slice(0, 12).map((ev, i) => (
                                    <li key={i} className="flex items-center gap-1 text-[10px]">
                                      <span className="text-slate-400 font-mono w-8 flex-shrink-0">{ev.year}</span>
                                      <span className="text-slate-700 truncate flex-1">{ev.project_name}</span>
                                      {ev.has_excel && <span className="text-emerald-600 text-[9px]">✓</span>}
                                    </li>
                                  ))}
                                  {venueEvents.length > 12 && (
                                    <li className="text-[9px] text-slate-400 italic pt-1">+ {venueEvents.length - 12}건</li>
                                  )}
                                </ul>
                              )}
                            </div>

                            {/* 시설 가이드 매칭 */}
                            <div className="bg-white border border-slate-200 rounded p-2.5">
                              <p className="text-[10px] text-slate-600 font-semibold mb-1.5">시설 가이드</p>
                              {matchedGuide ? (
                                <div className="space-y-0.5 text-[10px]">
                                  <div className="flex justify-between"><span className="text-slate-500">설치 가능 카테고리</span><span className="text-emerald-700 font-mono">{matchedGuide.categories_count}건</span></div>
                                  <div className="flex justify-between"><span className="text-slate-500">주의사항</span><span className="text-rose-700 font-mono">{matchedGuide.warnings_count}건</span></div>
                                  <div className="flex justify-between"><span className="text-slate-500">가이드 정보</span><span className={`font-mono ${matchedGuide.completeness >= 5 ? 'text-emerald-700' : matchedGuide.completeness >= 3 ? 'text-amber-700' : 'text-rose-700'}`}>{matchedGuide.completeness}/6</span></div>
                                  <p className="text-[9px] text-slate-400 italic pt-0.5">→ 시설 가이드 메뉴 영역에서 상세 확인</p>
                                </div>
                              ) : (
                                <p className="text-[9px] text-slate-400 italic">— 시설 가이드 미등록 (기본 컨벤션 가이드 적용)</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}
        {/* HOTFIX (2026-05-20): 위 </>} 1개 = venues 블록 닫기.
            이전엔 가드 닫기 + venues 블록 닫기 2개였으나 가드를 도면 학습 큐 직후로 옮김. */}
        {/* v9.33: 환경장식물 종류 섹션은 SYNONYM_SUBTABS 버튼바 아래(동의어 블록 안)로 이동
            — 이전엔 이 위치에 렌더 → 버튼바가 종류 표 아래에 표시되는 버그 발생 */}
        {false && (
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
                {/* 5/21 사용자 명시 = 예시 사진 입력 (노션 §10 환경장식물 종류 추가) */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">예시 이미지 (선택)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setStSampleFile(f)
                      const reader = new FileReader()
                      reader.onload = ev => setStSamplePreview(ev.target?.result as string ?? '')
                      reader.readAsDataURL(f)
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:px-2 file:py-0.5 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:text-slate-600 file:text-[10px]"
                  />
                  {stSamplePreview && (
                    <img src={stSamplePreview} alt="미리보기" className="mt-1.5 w-16 h-16 object-cover rounded border border-slate-200" />
                  )}
                </div>
                {stError && <p className="text-[11px] text-red-600">{stError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setStShowForm(false); setStError(null); setStSampleFile(null); setStSamplePreview('') }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1">취소</button>
                  <button
                    onClick={async () => {
                      await addSignageType()
                      if (stSampleFile && stName.trim()) {
                        try {
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user) {
                            const typeId = stName.trim().toLowerCase().replace(/[\s\-]/g, '_')
                            const path = `${user.id}/signage-samples/${typeId}-${Date.now()}.${stSampleFile.name.split('.').pop()}`
                            const { error } = await supabase.storage.from('design-images').upload(path, stSampleFile, { upsert: true })
                            if (!error) {
                              const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)
                              saveSignageTypeSample(typeId, publicUrl)
                            }
                          }
                        } catch {}
                        setStSampleFile(null)
                        setStSamplePreview('')
                      }
                    }}
                    disabled={stSaving}
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
                    <th className="px-2 py-1.5 text-left font-semibold w-16">예시 이미지</th>
                    <th className="px-2 py-1.5 text-left font-semibold">종류명</th>
                    <th className="px-2 py-1.5 text-left font-semibold">레이아웃</th>
                    <th className="px-2 py-1.5 text-right font-semibold">너비 (mm)</th>
                    <th className="px-2 py-1.5 text-right font-semibold">높이 (mm)</th>
                    <th className="px-2 py-1.5 text-left font-semibold">기본 재질</th>
                    <th className="px-2 py-1.5 text-left font-semibold">분류</th>
                    {isAdmin && <th className="px-2 py-1.5 text-center font-semibold w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 5/21 = 시드 항목도 hidden 패턴으로 숨김·↺ 복구 가능 (데이터 오류 보완) */}
                  {/* 5/22 P2-6 = 정렬 1순위 최신 (id가 UUID = DB 신규 = 최신·시드는 뒤로)·2순위 가나다 */}
                  {signageTypeList.slice().sort((a, b) => {
                    const aDb = /^[0-9a-f]{8}-/.test(a.id) ? 1 : 0
                    const bDb = /^[0-9a-f]{8}-/.test(b.id) ? 1 : 0
                    if (aDb !== bDb) return bDb - aDb
                    return a.name.localeCompare(b.name, 'ko')
                  }).map(t => {
                    const hidden = hiddenSignageTypeIds.includes(t.id)
                    const sampleUrl = signageTypeSamples[t.id]
                    return (
                    <tr key={t.id} className={`hover:bg-slate-50 ${hidden ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-1">
                        {sampleUrl ? (
                          <img src={sampleUrl} alt={t.name} className="w-12 h-12 object-cover rounded border border-slate-200" />
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-slate-800 font-medium">
                        {hidden ? <span className="line-through text-slate-400">{t.name}</span> : t.name}
                      </td>
                      <td className="px-2 py-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.layout === '세로' ? 'bg-violet-100 text-violet-700' : t.layout === '가로' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.layout}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.width_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.height_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-slate-600 text-[11px]">{t.default_material}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px]">{t.category}</td>
                      {isAdmin && (
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          {/* 5/22 사용자 명시 = 편집·이미지 교체·삭제 일괄 */}
                          <button
                            onClick={() => editSignageType(t)}
                            title="편집 (종류명·규격·재질·분류·레이아웃)"
                            className="text-[11px] leading-none px-1 text-slate-400 hover:text-indigo-600"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => replaceSignageTypeImage(t)}
                            title="예시 이미지 교체"
                            className="text-[11px] leading-none px-1 ml-1 text-slate-400 hover:text-emerald-600"
                          >
                            📷
                          </button>
                          {signageTypeSamples[t.id] && (
                            <button
                              onClick={() => deleteSignageTypeImage(t)}
                              title="예시 이미지 삭제"
                              className="text-[11px] leading-none px-1 ml-1 text-slate-400 hover:text-rose-600"
                            >
                              🗑
                            </button>
                          )}
                          <button
                            onClick={() => hidden ? toggleHideSignageType(t.id) : deleteSignageType(t.name)}
                            title={hidden ? '복구' : '삭제·숨김'}
                            className={`text-[11px] leading-none px-1 ml-1 ${hidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 hover:text-red-500'}`}
                          >
                            {hidden ? '↺' : '✕'}
                          </button>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* v9.36 시안 매칭: 환경장식물 종류·동의어 매핑은 평면 메뉴로 분리 (서브탭 바 제거) */}
        {activeSection === 'signage-types' && (
          <>
          {/* HOTFIX (2026-05-20): 12파트 매트릭스 박스 삭제 (사용자 명시). 시드 파일 보존. */}
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
                {/* 5/21 사용자 명시 = 예시 사진 입력 (노션 §10 환경장식물 종류 추가) */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">예시 이미지 (선택)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setStSampleFile(f)
                      const reader = new FileReader()
                      reader.onload = ev => setStSamplePreview(ev.target?.result as string ?? '')
                      reader.readAsDataURL(f)
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:px-2 file:py-0.5 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:text-slate-600 file:text-[10px]"
                  />
                  {stSamplePreview && (
                    <img src={stSamplePreview} alt="미리보기" className="mt-1.5 w-16 h-16 object-cover rounded border border-slate-200" />
                  )}
                </div>
                {stError && <p className="text-[11px] text-red-600">{stError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setStShowForm(false); setStError(null); setStSampleFile(null); setStSamplePreview('') }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1">취소</button>
                  <button
                    onClick={async () => {
                      await addSignageType()
                      if (stSampleFile && stName.trim()) {
                        try {
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user) {
                            const typeId = stName.trim().toLowerCase().replace(/[\s\-]/g, '_')
                            const path = `${user.id}/signage-samples/${typeId}-${Date.now()}.${stSampleFile.name.split('.').pop()}`
                            const { error } = await supabase.storage.from('design-images').upload(path, stSampleFile, { upsert: true })
                            if (!error) {
                              const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)
                              saveSignageTypeSample(typeId, publicUrl)
                            }
                          }
                        } catch {}
                        setStSampleFile(null)
                        setStSamplePreview('')
                      }
                    }}
                    disabled={stSaving}
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
                    <th className="px-2 py-1.5 text-left font-semibold w-16">예시 이미지</th>
                    <th className="px-2 py-1.5 text-left font-semibold">종류명</th>
                    <th className="px-2 py-1.5 text-left font-semibold">레이아웃</th>
                    <th className="px-2 py-1.5 text-right font-semibold">너비 (mm)</th>
                    <th className="px-2 py-1.5 text-right font-semibold">높이 (mm)</th>
                    <th className="px-2 py-1.5 text-left font-semibold">기본 재질</th>
                    <th className="px-2 py-1.5 text-left font-semibold">분류</th>
                    {isAdmin && <th className="px-2 py-1.5 text-center font-semibold w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 5/21 = 시드 항목도 hidden 패턴으로 숨김·↺ 복구 가능 (데이터 오류 보완) */}
                  {/* 5/22 P2-6 = 정렬 1순위 최신 (id가 UUID = DB 신규 = 최신·시드는 뒤로)·2순위 가나다 */}
                  {signageTypeList.slice().sort((a, b) => {
                    const aDb = /^[0-9a-f]{8}-/.test(a.id) ? 1 : 0
                    const bDb = /^[0-9a-f]{8}-/.test(b.id) ? 1 : 0
                    if (aDb !== bDb) return bDb - aDb
                    return a.name.localeCompare(b.name, 'ko')
                  }).map(t => {
                    const hidden = hiddenSignageTypeIds.includes(t.id)
                    const sampleUrl = signageTypeSamples[t.id]
                    return (
                    <tr key={t.id} className={`hover:bg-slate-50 ${hidden ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-1">
                        {sampleUrl ? (
                          <img src={sampleUrl} alt={t.name} className="w-12 h-12 object-cover rounded border border-slate-200" />
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-slate-800 font-medium">
                        {hidden ? <span className="line-through text-slate-400">{t.name}</span> : t.name}
                      </td>
                      <td className="px-2 py-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.layout === '세로' ? 'bg-violet-100 text-violet-700' : t.layout === '가로' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.layout}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.width_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right text-slate-700 font-mono text-[11px]">{t.height_mm.toLocaleString()}</td>
                      <td className="px-2 py-1 text-slate-600 text-[11px]">{t.default_material}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px]">{t.category}</td>
                      {isAdmin && (
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          {/* 5/22 사용자 명시 = 편집·이미지 교체·삭제 일괄 */}
                          <button
                            onClick={() => editSignageType(t)}
                            title="편집 (종류명·규격·재질·분류·레이아웃)"
                            className="text-[11px] leading-none px-1 text-slate-400 hover:text-indigo-600"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => replaceSignageTypeImage(t)}
                            title="예시 이미지 교체"
                            className="text-[11px] leading-none px-1 ml-1 text-slate-400 hover:text-emerald-600"
                          >
                            📷
                          </button>
                          {signageTypeSamples[t.id] && (
                            <button
                              onClick={() => deleteSignageTypeImage(t)}
                              title="예시 이미지 삭제"
                              className="text-[11px] leading-none px-1 ml-1 text-slate-400 hover:text-rose-600"
                            >
                              🗑
                            </button>
                          )}
                          <button
                            onClick={() => hidden ? toggleHideSignageType(t.id) : deleteSignageType(t.name)}
                            title={hidden ? '복구' : '삭제·숨김'}
                            className={`text-[11px] leading-none px-1 ml-1 ${hidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 hover:text-red-500'}`}
                          >
                            {hidden ? '↺' : '✕'}
                          </button>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          </>
        )}

        {activeSection === 'synonyms-mapping' && <>
        {/* v9.36: 평면 메뉴 ′동의어 매핑′ */}
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
                {/* 5/21 = DB 동의어·시드 동의어 양식 통일·5/22 ✎ 편집 추가 */}
                {aliasList
                  .filter(a => !synonymFilter || a.alias_name.includes(synonymFilter) || a.canonical_name.includes(synonymFilter))
                  .map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-700 font-mono text-[11px]">{a.alias_name}</td>
                      <td className="px-2 py-1 text-indigo-700 font-medium">{a.canonical_name}</td>
                      <td className="px-2 py-1 text-slate-500 text-[11px] flex items-center justify-between gap-2">
                        <span>{a.note ?? '사용자 추가'}</span>
                        <span className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const newAlias = prompt('별칭', a.alias_name)
                              if (newAlias === null) return
                              const newCanon = prompt('→ 표준명', a.canonical_name)
                              if (newCanon === null) return
                              try {
                                const res = await fetch(`/api/admin/aliases?id=${a.id}`, {
                                  method: 'PATCH',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ alias_name: newAlias.trim(), canonical_name: newCanon.trim() }),
                                })
                                if (res.ok) {
                                  setAliasList(prev => prev.map(x => x.id === a.id ? { ...x, alias_name: newAlias.trim(), canonical_name: newCanon.trim() } : x))
                                } else alert('수정 실패 (API 미지원)')
                              } catch { alert('수정 실패') }
                            }}
                            className="text-[11px] px-1 text-slate-400 hover:text-indigo-600"
                            title="편집"
                          >✎</button>
                          <button
                            onClick={async () => {
                              if (!confirm(`′${a.alias_name}′ 삭제할까요?`)) return
                              const res = await fetch(`/api/admin/aliases?id=${a.id}`, { method: 'DELETE' })
                              if (res.ok) setAliasList(prev => prev.filter(x => x.id !== a.id))
                              else alert('삭제 실패')
                            }}
                            className="text-[11px] px-1.5 py-0.5 rounded transition text-rose-500 hover:bg-rose-50"
                            title="삭제"
                          >✕</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                {/* 시드 동의어 = ✕ 숨김(localStorage hidden)·시드는 편집 X (시드 보호) */}
                {synonyms
                  .filter(s => !synonymFilter || s.alias.includes(synonymFilter) || s.canonical_name.includes(synonymFilter))
                  .map(s => {
                    const hidden = hiddenSeedAliases.includes(s.alias)
                    return (
                      <tr key={s.alias} className={`hover:bg-slate-50 ${hidden ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-1 text-slate-700 font-mono text-[11px]">
                          {hidden ? <span className="line-through text-slate-400">{s.alias}</span> : s.alias}
                        </td>
                        <td className="px-2 py-1 text-indigo-700 font-medium">
                          {hidden ? <span className="text-slate-400">없음</span> : s.canonical_name}
                        </td>
                        <td className="px-2 py-1 text-slate-500 text-[11px] flex items-center justify-between gap-2">
                          <span>{s.note ?? '시드'}</span>
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                // 시드 편집 = DB 동의어로 신규 추가 (시드 위에 덮어쓰는 형태)
                                const newAlias = prompt('별칭', s.alias)
                                if (newAlias === null) return
                                const newCanon = prompt('→ 표준명', s.canonical_name)
                                if (newCanon === null) return
                                fetch('/api/admin/aliases', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ alias_name: newAlias.trim(), canonical_name: newCanon.trim() }),
                                }).then(async res => {
                                  if (res.ok) {
                                    const data = await res.json()
                                    setAliasList(prev => [...prev, data.item ?? data])
                                    toggleHideSeedAlias(s.alias) // 원본 시드 숨기기
                                  } else alert('편집 실패 (관리자 권한 필요)')
                                }).catch(() => alert('편집 실패'))
                              }}
                              className="text-[11px] px-1 text-slate-400 hover:text-indigo-600"
                              title="편집 (시드 → DB 사용자 추가로 덮어쓰기)"
                            >✎</button>
                            <button
                              onClick={() => toggleHideSeedAlias(s.alias)}
                              className={`text-[11px] px-1.5 py-0.5 rounded transition ${
                                hidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-rose-500 hover:bg-rose-50'
                              }`}
                              title={hidden ? '복구' : '삭제 (없음으로 표시)'}
                            >
                              {hidden ? '↺' : '✕'}
                            </button>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* PR#4 단위 4 (δ 정책): 미분류 카테고리 매핑 큐 — 관리자 검토 필요 */}
        <section className="bg-white border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              매핑 실패 사례 — 관리자 검토 필요 ({unmatchedList.length}건)
            </h2>
            <p className="text-[10px] text-slate-500">12 표준 카테고리에 매칭 안 된 입력 누적</p>
          </div>
          {unmatchedLoading ? (
            <div className="text-xs text-slate-400 py-4 text-center">불러오는 중…</div>
          ) : unmatchedList.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center italic">매핑 실패 사례 없음 (12 카테고리에 모두 매칭됨)</div>
          ) : (
            <div className="overflow-y-auto max-h-80 border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold">raw_category</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-16">누적</th>
                    <th className="px-2 py-1.5 text-left font-semibold w-32">최근</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-32">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unmatchedList.map(u => {
                    const isResolving = resolvingRaw === u.raw_category
                    const lastAgo = (() => {
                      const ms = Date.now() - new Date(u.last_seen).getTime()
                      const min = Math.floor(ms / 60000)
                      if (min < 1) return '방금'
                      if (min < 60) return `${min}분 전`
                      const hr = Math.floor(min / 60)
                      if (hr < 24) return `${hr}시간 전`
                      return `${Math.floor(hr / 24)}일 전`
                    })()
                    return (
                      <tr key={u.id} className="hover:bg-amber-50/30">
                        <td className="px-2 py-1.5 text-slate-800 font-medium">{u.raw_category}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-amber-700 font-semibold">{u.occurrences}건</td>
                        <td className="px-2 py-1.5 text-slate-500 text-[10px]">{lastAgo}</td>
                        <td className="px-2 py-1.5">
                          {isResolving ? (
                            <div className="flex gap-1 items-center">
                              <select
                                value={resolveTarget}
                                onChange={e => setResolveTarget(e.target.value)}
                                className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px]"
                              >
                                <option value="">표준명 선택</option>
                                {signageTypeList.map(t => (
                                  <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                              </select>
                              <button
                                disabled={!resolveTarget}
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/admin/unmatched-categories', {
                                      method: 'POST',
                                      headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify({ rawCategory: u.raw_category, standardName: resolveTarget }),
                                    })
                                    const data = await res.json()
                                    if (!res.ok) {
                                      alert('매핑 실패: ' + (data.error ?? 'unknown'))
                                      return
                                    }
                                    alert(`매핑 완료. 기존 ${data.updatedCount}건의 디자인 아이템도 자동 재변환됨.`)
                                    setUnmatchedList(prev => prev.filter(x => x.id !== u.id))
                                    setResolvingRaw(null)
                                    setResolveTarget('')
                                  } catch (e) {
                                    alert('매핑 호출 실패: ' + (e instanceof Error ? e.message : 'unknown'))
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-[10px] rounded"
                              >저장</button>
                              <button
                                onClick={() => { setResolvingRaw(null); setResolveTarget('') }}
                                className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 text-[10px]"
                              >취소</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => { setResolvingRaw(u.raw_category); setResolveTarget('') }}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] rounded"
                              >매핑</button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`'${u.raw_category}' 매핑 무시? (표준 카테고리 외로 분류)`)) return
                                  await fetch(`/api/admin/unmatched-categories?raw=${encodeURIComponent(u.raw_category)}`, { method: 'DELETE' })
                                  setUnmatchedList(prev => prev.filter(x => x.id !== u.id))
                                }}
                                className="px-2 py-0.5 text-slate-500 hover:text-rose-500 text-[10px]"
                              >무시</button>
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

        {/* v9.36: 시안에 ′프로그램 파트′ 메뉴 없음 → 비활성화 (코드는 보존). */}
        {false && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
              <Workflow className="w-4 h-4 text-emerald-500" />
              프로그램 파트 ({PROGRAM_PARTS.length}종) × 환경장식물 매트릭스
            </h2>
            <p className="text-[11px] text-slate-400">SOT: <code>lib/programParts.ts</code> · 편집 UI는 v9.35</p>
          </div>

          <div className="space-y-5">
            {PROGRAM_PART_GROUPS.map(g => {
              const parts = PROGRAM_PARTS.filter(p => p.group === g.group)
              const groupColor = g.group === 'program'
                ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' }
                : g.group === 'attendee'
                ? { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  dot: 'bg-indigo-500' }
                : { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' }
              return (
                <div key={g.group}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${groupColor.dot}`} />
                    <h3 className={`text-xs font-semibold ${groupColor.text}`}>{g.label}</h3>
                    <span className="text-[10px] text-slate-400">{parts.length}종</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {parts.map(p => {
                      const hintIds = PROGRAM_PART_SIGNAGE_HINTS[p.code] ?? []
                      // 환경장식물 ID → 한글 라벨 매핑 (SEED_SIGNAGE_TYPES.name) 적용
                      const hintLabels = hintIds.map(id => {
                        const t = signageTypeList.find(s => s.id === id) ?? signageTypes.find(s => s.id === id)
                        return { id, name: t?.name ?? id }
                      })
                      return (
                        <div key={p.code} className={`${groupColor.bg} ${groupColor.border} border rounded-lg p-3`}>
                          <div className="flex items-baseline gap-2 mb-1.5">
                            <span className={`text-[10px] font-mono ${groupColor.text}`}>{p.code}</span>
                            <span className="text-slate-900 font-semibold text-sm">{p.name}</span>
                          </div>
                          {p.hint && (
                            <p className="text-[11px] text-slate-600 mb-2 leading-snug">{p.hint}</p>
                          )}
                          {hintLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/60">
                              {hintLabels.map(h => (
                                <span key={h.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-200">
                                  {h.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic pt-1.5 border-t border-white/60">권장 환경장식물 미매핑</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        )}

        {/* 5/22 P2-4 = 프로그램 파트 관리 = 표 형태·✎·✕·+ 영역 통합 */}
        {activeSection === 'program-parts' && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                <Workflow className="w-4 h-4 text-indigo-500" />
                프로그램 파트 관리 ({PROGRAM_PARTS.length + customProgramParts.length})
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setEditingProgramPart({ code: '', name: '', hint: '', group: 'program' })}
                  className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded"
                >
                  <Plus className="w-3 h-3" /> 파트 추가
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-2 w-6"></th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">분류</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">파트명</th>
                    <th className="px-2 py-2 text-left font-semibold">설명</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">사용 행사</th>
                    {isAdmin && <th className="px-2 py-1.5 text-center font-semibold w-16"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...PROGRAM_PARTS, ...customProgramParts]
                    .filter(pt => !hiddenProgramPartCodes.includes(pt.code))
                    .map(pt => {
                      const override = programPartOverrides[pt.code]
                      const name = override?.name ?? pt.name
                      const hint = override?.hint ?? pt.hint
                      return { ...pt, name, hint }
                    })
                    .slice()
                    .sort((a, b) => {
                      const ga = PROGRAM_PART_GROUPS.findIndex(g => g.group === a.group)
                      const gb = PROGRAM_PART_GROUPS.findIndex(g => g.group === b.group)
                      if (ga !== gb) return ga - gb
                      return a.name.localeCompare(b.name, 'ko')
                    })
                    .map(pt => {
                      // 5/22 사용자 명시 = 동의어 매핑 적용 영역 = resolveCategoryName 자동 변환 + signage_types.name 12 카테고리만
                      // unifiedEventHistory (SEED + DB + user + custom) 영역 사용 = 행사 관리 영역 SOT 정합
                      const usageCount = unifiedEventHistory.filter(e => (e.program_parts ?? []).includes(pt.code)).length
                      const sigUsage = new Map<string, number>()
                      const validTypeNames = new Set(signageTypeList.map(t => t.name))
                      for (const e of unifiedEventHistory) {
                        if (!(e.program_parts ?? []).includes(pt.code)) continue
                        const breakdown = e.signage_breakdown && e.signage_breakdown.length > 0
                          ? e.signage_breakdown
                          : estimateSignageBreakdown(e.program_parts, e.analyzed_item_count)
                        for (const s of breakdown) {
                          const standard = resolveCategoryName(s.category)
                          if (!validTypeNames.has(standard)) continue  // 12 카테고리 외 영역 제외
                          sigUsage.set(standard, (sigUsage.get(standard) ?? 0) + s.quantity)
                        }
                      }
                      const sigArr = Array.from(sigUsage.entries())
                        .map(([category, total]) => ({ category, avg: usageCount > 0 ? total / usageCount : 0 }))
                        .filter(s => s.avg > 0)
                        .sort((a, b) => b.avg - a.avg)
                      const groupLabel = PROGRAM_PART_GROUPS.find(g => g.group === pt.group)?.label ?? pt.group
                      const isOpen = expandedPartCode === pt.code
                      return (
                        <React.Fragment key={pt.code}>
                          <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedPartCode(isOpen ? null : pt.code)}>
                            <td className="px-2 py-1.5 text-slate-400 text-[11px]">{isOpen ? '▼' : '▶'}</td>
                            <td className="px-2 py-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                pt.group === 'program' ? 'bg-emerald-50 text-emerald-700' :
                                pt.group === 'attendee' ? 'bg-indigo-50 text-indigo-700' :
                                pt.group === 'promotion' ? 'bg-amber-50 text-amber-700' :
                                'bg-rose-50 text-rose-700'
                              }`}>{groupLabel}</span>
                            </td>
                            <td className="px-2 py-1.5 text-slate-800 font-medium whitespace-nowrap">{pt.name}</td>
                            <td className="px-2 py-1.5 text-slate-500 text-[10px]">{pt.hint ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-semibold">
                              {usageCount > 0 ? `${usageCount}건` : <span className="text-slate-300">—</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-2 py-1.5 text-center whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                                <button
                                  onClick={() => setEditingProgramPart({ code: pt.code, name: pt.name, hint: pt.hint ?? '', group: pt.group })}
                                  title="편집"
                                  className="text-[11px] leading-none px-1 text-slate-400 hover:text-indigo-600"
                                >✎</button>
                                <button
                                  onClick={() => toggleHideProgramPart(pt.code)}
                                  title="삭제·숨김"
                                  className="text-[11px] leading-none px-1 ml-1 text-slate-300 hover:text-red-500"
                                >✕</button>
                              </td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr className="bg-slate-50">
                              <td></td>
                              <td colSpan={isAdmin ? 5 : 4} className="px-2 py-2">
                                <div className="text-[10px] text-slate-600 mb-2 font-semibold">사용된 환경장식물 (평균 수량/행사)</div>
                                {/* HOTFIX (2026-05-20): SignageUsageTable로 교체 — 표준 규격 컬럼 자동 추가 */}
                                <SignageUsageTable
                                  items={sigArr.map(s => ({ category: s.category, avg_quantity: s.avg }))}
                                  compact
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5/22 P2-7 = 행사 관리 = 5대 영역·▶ 펼침 영역·✎·✕·+ 패턴 */}
        {activeSection === 'events' && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                행사 관리 ({SEED_EVENT_HISTORY.length + customEvents.length})
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setEditingEvent({ project_name: '', project_code: '', year: new Date().getFullYear(), venue: '', program_parts: [], analyzed_item_count: undefined })}
                  className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded"
                >
                  <Plus className="w-3 h-3" /> 행사 추가
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-2 w-6"></th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">행사명</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">행사장</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">연도</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">프로그램 파트</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">총 수량</th>
                    {isAdmin && <th className="px-2 py-2 text-center font-semibold w-14"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 5/22 사용자 명시 = SEED + 신규 프로젝트 (userEventHistory) + 커스텀 행사 통합·AI 추천 정확도 향상 목표 */}
                  {[
                    ...SEED_EVENT_HISTORY.map(e => ({ ...e, is_user_project: false })),
                    ...userEventHistory.map(e => ({ ...e, has_excel: e.has_excel ?? true, has_image: e.has_image ?? false, is_user_project: true })),
                    ...customEvents.map(e => ({ ...e, has_excel: true, has_image: false, signage_breakdown: undefined, is_user_project: false })),
                  ]
                    .filter(e => !hiddenEventKeys.includes(e.project_code ?? e.project_name))
                    .map(e => {
                      // override 적용
                      const ov = eventOverrides[e.project_code ?? e.project_name]
                      return ov ? { ...e, ...ov } : e
                    })
                    .slice()
                    .sort((a, b) => {
                      // 5/22 사용자 명시 = 빠른 게 (최신) 위로. user_project 우선·year DESC + project_code DESC
                      const aUser = (a as { is_user_project?: boolean }).is_user_project ? 1 : 0
                      const bUser = (b as { is_user_project?: boolean }).is_user_project ? 1 : 0
                      if (aUser !== bUser) return bUser - aUser
                      if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0)
                      const codeCompare = (b.project_code ?? '').localeCompare(a.project_code ?? '')
                      if (codeCompare !== 0) return codeCompare
                      return a.project_name.localeCompare(b.project_name, 'ko')
                    })
                    .map(e => {
                      const key = (e.project_code ?? '') + e.project_name
                      const isOpen = expandedEventKey === key
                      // 5/22 사용자 명시 = 의전 (40.18) 영역 삭제 = SEED 영역 데이터 영역 raw 영역 표시 X·filter
                      const partNames = (e.program_parts ?? [])
                        .map(code => PROGRAM_PART_BY_CODE.get(code)?.name)
                        .filter((n): n is string => Boolean(n))
                      return (
                        <React.Fragment key={key}>
                          <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedEventKey(isOpen ? null : key)}>
                            <td className="px-2 py-1.5 text-slate-400 text-[11px]">{isOpen ? '▼' : '▶'}</td>
                            <td className="px-2 py-1.5 text-slate-800 font-medium">{e.project_name}</td>
                            <td className="px-2 py-1.5 text-slate-700">{e.venue}</td>
                            <td className="px-2 py-1.5 text-right text-slate-600 font-mono">{e.year ?? '—'}</td>
                            <td className="px-2 py-1.5">
                              {partNames.length === 0 ? <span className="text-slate-300 text-[10px]">—</span> : (
                                <div className="flex flex-wrap gap-0.5">
                                  {partNames.slice(0, 3).map((n, i) => (
                                    <span key={i} className="inline-block px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded">{n}</span>
                                  ))}
                                  {partNames.length > 3 && <span className="text-[9px] text-slate-400">+{partNames.length - 3}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-semibold">
                              {(() => {
                                // 5/22 사용자 명시 = "총 수량" = 환경장식물 총 수량 (signage_breakdown.quantity 합산)
                                const bd = e.signage_breakdown && e.signage_breakdown.length > 0
                                  ? e.signage_breakdown
                                  : estimateSignageBreakdown(e.program_parts, e.analyzed_item_count)
                                const total = bd.reduce((s, x) => s + x.quantity, 0)
                                return total > 0 ? total : <span className="text-slate-300">—</span>
                              })()}
                            </td>
                            {isAdmin && (
                              <td className="px-2 py-1.5 text-center whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                                <button
                                  onClick={() => setEditingEvent({ project_name: e.project_name, project_code: e.project_code ?? '', year: e.year ?? new Date().getFullYear(), venue: e.venue, program_parts: e.program_parts ?? [], analyzed_item_count: e.analyzed_item_count })}
                                  title="편집"
                                  className="text-[11px] leading-none px-1 text-slate-400 hover:text-indigo-600"
                                >✎</button>
                                <button
                                  onClick={() => toggleHideEvent(e.project_code ?? e.project_name)}
                                  title="삭제·숨김"
                                  className="text-[11px] leading-none px-1 ml-1 text-slate-300 hover:text-red-500"
                                >✕</button>
                              </td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr className="bg-slate-50">
                              <td></td>
                              <td colSpan={5} className="px-2 py-2">
                                <div className="text-[10px] text-slate-600 mb-2 font-semibold">환경장식물별 분리</div>
                                {(() => {
                                  // 5/22 사용자 명시 = 환경장식물별 수량 제공·signage_breakdown 없으면 program_parts 기반 추정값 자동
                                  const breakdown = e.signage_breakdown && e.signage_breakdown.length > 0
                                    ? e.signage_breakdown
                                    : estimateSignageBreakdown(e.program_parts, e.analyzed_item_count)
                                  const isEstimate = !e.signage_breakdown || e.signage_breakdown.length === 0
                                  if (breakdown.length === 0) {
                                    return <div className="text-[10px] text-slate-400 italic">— 데이터 없음 (프로그램 파트 미입력)</div>
                                  }
                                  return (
                                    <>
                                      {/* 5/22 사용자 명시 = "추정값" 안내 텍스트 제거 */}
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="text-slate-500 text-[10px]">
                                            <th className="px-2 py-1 text-left">환경장식물 종류</th>
                                            <th className="px-2 py-1 text-left">규격(mm)</th>
                                            <th className="px-2 py-1 text-right">수량</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {/* 5/22 사용자 명시 = signage_types.name 정합 (영역 = 동의어 자동 변환 영역). 12 카테고리만 표시. */}
                                          {(() => {
                                            const validNames = new Set(signageTypeList.map(t => t.name))
                                            const aggregated = new Map<string, { quantity: number; sizes: Set<string> }>()
                                            for (const s of breakdown) {
                                              const standard = resolveCategoryName(s.category)
                                              if (!validNames.has(standard)) continue // 12 카테고리 외 영역 제외
                                              const prev = aggregated.get(standard) ?? { quantity: 0, sizes: new Set<string>() }
                                              prev.quantity += s.quantity
                                              if (s.sizes) s.sizes.split('·').forEach(z => z.trim() && prev.sizes.add(z.trim()))
                                              aggregated.set(standard, prev)
                                            }
                                            const arr = Array.from(aggregated.entries()).sort((a, b) => b[1].quantity - a[1].quantity)
                                            if (arr.length === 0) {
                                              return <tr><td colSpan={3} className="px-2 py-1 text-slate-400 italic text-center">— 12 카테고리 영역 매칭 데이터 없음</td></tr>
                                            }
                                            return arr.map(([name, v], i) => {
                                              const t = signageTypeList.find(x => x.name === name)
                                              const baseSize = t ? `${t.width_mm}×${t.height_mm}` : ''
                                              return (
                                                <tr key={i} className="border-t border-slate-200">
                                                  <td className="px-2 py-1">{name}</td>
                                                  <td className="px-2 py-1 text-slate-500">{v.sizes.size > 0 ? Array.from(v.sizes).join(' · ') : baseSize || '—'}</td>
                                                  <td className="px-2 py-1 text-right font-mono">{v.quantity}</td>
                                                </tr>
                                              )
                                            })
                                          })()}
                                        </tbody>
                                      </table>
                                    </>
                                  )
                                })()}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* v9.36: 평면 메뉴 ′시설 가이드′ — 가이드 + 예외 패턴 두 블록 묶음 */}
        {activeSection === 'facility-guides' && <>
        {/* 5/22 사용자 명시 = 시설 가이드 요약 = 최상단 이동 */}
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
                  <p className="text-[10px] text-emerald-600 mt-0.5">{fullyDocumented}개 정보 5/6↑</p>
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
                  <p className="text-[10px] text-slate-500">평균 정보 채움</p>
                  <p className={`text-xl font-bold ${avgCompleteness >= 80 ? 'text-emerald-600' : avgCompleteness >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {avgCompleteness}<span className="text-xs text-slate-400 ml-1">%</span>
                  </p>
                </div>
              </div>
            )
          })()}
        </section>

        {/* 5/22 사용자 명시 = 행사장 규칙 추가 영역 = 시설 가이드 메뉴 영역 이동.
            "이거 학습시켜주세요" = "행사장 규칙 추가해주세요" = 동일 영역. */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            행사장 규칙 추가
          </h2>
          <p className="text-[10px] text-slate-500 mb-3">행사장 기본 정보 + 도면·가이드북 + 설치 가능 카테고리·주의사항 직접 입력 = 시설 가이드(행사장 규칙) 즉시 등록. 도면 첨부 시 Vision 분석 = 자동 백그라운드 처리·완료 시 AI 추출 영역 활성.</p>
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
              <input value={entranceNote} onChange={e => setEntranceNote(e.target.value)} placeholder="예: 1층 정문 동측" className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-sm" />
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
              {floorPlan && <p className="text-slate-500 text-[10px] mt-1">{floorPlan.name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 text-[11px] mb-1">시설 가이드북·매뉴얼 (PDF·DOCX·HWP·이미지)</label>
              <input type="file" accept=".pdf,.docx,.hwp,image/*" onChange={e => setFacilityGuideFile(e.target.files?.[0] ?? null)} className="block w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-50 file:text-slate-400 file:cursor-pointer" />
              {facilityGuideFile && <p className="text-slate-500 text-[10px] mt-1">{facilityGuideFile.name}</p>}
            </div>
            {/* 5/22 사용자 명시 = 도면 학습 X·카테고리·주의사항 직접 입력 영역 */}
            <div className="sm:col-span-2">
              <label className="block text-slate-500 text-[11px] mb-1">설치 가능 환경장식물 카테고리 (1줄에 1건)</label>
              <textarea value={allowedCategories} onChange={e => setAllowedCategories(e.target.value)} placeholder={'X배너\n세로 현수막\n가로 현수막\n포디움 타이틀'} rows={3} className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 text-[11px] mb-1">주의사항 (1줄에 1건)</label>
              <textarea value={warningsText} onChange={e => setWarningsText(e.target.value)} placeholder={'외벽 부착 운영팀 사전 승인 의무\n리깅 영역 = 코엑스 지정 리거 사용 의무'} rows={3} className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-xs" />
            </div>
          </div>
          {addError && <div className="mt-3 text-red-700 text-xs bg-red-50 border border-red-300 rounded px-3 py-2">{addError}</div>}
          <div className="mt-4 flex justify-end">
            <button onClick={addVenue} disabled={adding || !name.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm rounded transition">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              등록 + 시설 가이드 영역 자동 채움
            </button>
          </div>
        </section>

        {/* 5/22 사용자 명시 = 행사장 규칙 추가 요청 = pendingRequests 영역 있을 때만 표시 (비어있을 때 노이즈 회피) */}
        {pendingRequests.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-400" />
            행사장 규칙 추가 요청 ({pendingRequests.length})
          </h2>
          {pendingRequests.length === 0 ? null : (
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-start justify-between gap-3 bg-slate-50/40 border border-slate-300/60 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-medium text-sm">{req.name}</span>
                      {req.region && <span className="text-slate-500 text-[10px] bg-slate-200/40 rounded px-1.5">{req.region}</span>}
                      {req.venue_type && <span className="text-slate-500 text-[10px] bg-slate-200/40 rounded px-1.5">{req.venue_type}</span>}
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
                      <CheckCircle2 className="w-3 h-3" /> 승인 (규칙 추가)
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
        )}
        {/* 5/22: 시설 가이드 요약 = 최상단 이동 (옛 위치 제거) */}

        {/* ── 6. 시설 가이드 학습 현황 — 홀(L2) 단위 (5/21 사용자 명시 정합) ──
            venueFacilityGuide 시드 = 이미 홀별 분리 (킨텍스 1~4홀, 5홀, 2전시장 6~10홀 등).
            UI 라벨도 홀 단위 명시. */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            시설 가이드 학습 현황 (홀 단위)
          </h2>
          {facilityGuideStatus.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-3 text-center">시설 가이드 시드 데이터가 비어있습니다.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[11px]">
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap w-6"></th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">행사장 / 휘하 홀</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">설치 가능 카테고리</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">주의사항</th>
                    <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap" title="시설 가이드 정보 6 영역(① 설치 가능 카테고리 ② 설치 방법 ③ 리깅·천정 설치 ④ 안전 기준 ⑤ 주의사항 ⑥ 디지털 사이니지) 중 채워진 영역 수. 6/6 = 완전·낮을수록 보강 필요.">정보 채움 (6 영역)</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">학습 시점</th>
                    {/* 5/22 사용자 명시 = AI 추출 컬럼 삭제 (시설 가이드 영역) */}
                    {isAdmin && <th className="px-2 py-1.5 text-center font-semibold w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 5/21 = 시드 항목 hidden 패턴 추가 (데이터 오류 보완·복구 가능) */}
                  {/* 5/22 = 3 댑스 (L1 그룹·L2 venue 행·L3 펼침 학습 내용). 사용자 명시 = "코엑스 / 그랜드볼룸 / 하위 학습 내용 기재" */}
                  {(() => {
                    const sorted = facilityGuideStatus.slice().sort((a, b) => {
                      const ad = a.last_updated ?? ''
                      const bd = b.last_updated ?? ''
                      if (ad !== bd) return bd.localeCompare(ad)
                      return a.venue_name.localeCompare(b.venue_name, 'ko')
                    })
                    // L1 그룹 = venue_name 첫 단어 (코엑스·킨텍스·송도 등). 매칭 X 영역 = 단독 그룹.
                    const groups = new Map<string, typeof sorted>()
                    for (const f of sorted) {
                      // 5/22 = 같은 행사장 영역 같은 L1 그룹 영역 = normalizeVenueName 적용
                      const normalizedName = normalizeVenueName(f.venue_name)
                      const groupName = (normalizedName.split(' ')[0] || normalizedName || f.venue_name)
                      if (!groups.has(groupName)) groups.set(groupName, [])
                      groups.get(groupName)!.push(f)
                    }
                    const adminColCount = isAdmin ? 7 : 6 // 5/22 사용자 명시 = AI 추출 컬럼 삭제 (8/7 → 7/6)
                    const out: React.ReactNode[] = []
                    Array.from(groups.entries()).forEach(([groupName, items]) => {
                      const isGroupOpen = expandedFacilityGroup === groupName
                      const groupCategories = items.reduce((s, x) => s + x.categories_count, 0)
                      const groupWarnings = items.reduce((s, x) => s + x.warnings_count, 0)
                      // 5/22 사용자 명시 = 정보 채움 (6 영역) = L1 영역에도 표시·휘하 홀 합산 영역
                      // 6 영역 = ① install_allowed ② mount_methods ③ rigging ④ safety ⑤ warnings ⑥ digital_signage
                      // 휘하 홀 중 ≥1 영역 정보 있는 영역 카운트 (0~6/6)
                      const groupHas = {
                        install: items.some(i => Array.isArray(i.install_allowed) && i.install_allowed.length > 0),
                        mount: items.some(i => i.mount_methods != null),
                        rigging: items.some(i => i.rigging?.available != null),
                        safety: items.some(i => i.safety != null),
                        warnings: items.some(i => Array.isArray(i.warnings) && i.warnings.length > 0),
                        digital: items.some(i => i.digital_signage != null),
                      }
                      const groupFilled = Object.values(groupHas).filter(Boolean).length
                      const groupRatio = groupFilled / 6
                      const groupColor = groupRatio >= 0.83 ? 'text-emerald-600' : groupRatio >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                      // L1 = 그룹 행 (코엑스·킨텍스 등)
                      out.push(
                        <tr key={`L1-${groupName}`} className="bg-indigo-50/60 hover:bg-indigo-50 font-semibold border-t-2 border-indigo-100">
                          <td className="px-2 py-1.5 text-indigo-700 text-center">
                            <button onClick={() => setExpandedFacilityGroup(isGroupOpen ? null : groupName)} className="hover:underline">
                              {isGroupOpen ? '▼' : '▶'}
                            </button>
                          </td>
                          <td className="px-2 py-1.5 text-indigo-900 whitespace-nowrap">
                            {groupName} <span className="text-[10px] text-indigo-500 ml-1 font-normal">(휘하 홀 {items.length})</span>
                          </td>
                          <td className="px-2 py-1.5 text-right text-indigo-700 font-mono text-[11px]">{groupCategories}</td>
                          <td className="px-2 py-1.5 text-right text-indigo-700 font-mono text-[11px]">{groupWarnings}</td>
                          <td className={`px-2 py-1.5 text-right font-mono font-semibold ${groupColor}`} title={`설치 가능 ${groupHas.install ? '있음' : '없음'}·설치 방법 ${groupHas.mount ? '있음' : '없음'}·리깅 ${groupHas.rigging ? '있음' : '없음'}·안전 ${groupHas.safety ? '있음' : '없음'}·주의사항 ${groupHas.warnings ? '있음' : '없음'}·디지털 ${groupHas.digital ? '있음' : '없음'}`}>{groupFilled}/6</td>
                          <td className="px-2 py-1.5" colSpan={isAdmin ? 2 : 1}></td>
                        </tr>
                      )
                      if (!isGroupOpen) return
                      // L2 = venue 세부 행 (각 그룹 하위)
                      items.forEach(f => {
                        const ratio = (f.completeness / 6)
                        const color = ratio >= 0.83 ? 'text-emerald-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                        void extractingVenueId; void extractSuccessId // 5/22 AI 추출 삭제 후 dead state·보존
                        const hidden = hiddenFacilityVenues.includes(f.venue_key)
                        const isOpen = expandedFacilityVenueKey === f.venue_key
                        // L2 = venue 행 - 메인
                        const subName = f.venue_name.startsWith(groupName + ' ') ? f.venue_name.slice(groupName.length + 1) : f.venue_name
                        out.push(
                          <tr key={`L2-${f.venue_key}`} className={`hover:bg-slate-50 ${hidden ? 'opacity-50' : ''}`}>
                            <td className="px-2 py-1.5 text-slate-500 text-center">
                              <button onClick={() => setExpandedFacilityVenueKey(isOpen ? null : f.venue_key)} className="hover:text-indigo-600">
                                {isOpen ? '▼' : '▶'}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 text-slate-800 whitespace-nowrap pl-6">
                              {hidden ? <span className="line-through text-slate-400">{subName}</span> : subName}
                              {f.source === 'db' && <span className="ml-1 text-[9px] px-1 py-0 rounded bg-emerald-100 text-emerald-700">DB</span>}
                            </td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.categories_count}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{f.warnings_count}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${color}`}>{f.completeness}/6</td>
                        <td className="px-2 py-1.5 text-slate-500 text-[11px]">{f.last_updated ?? '미상'}</td>
                        {/* 5/22 사용자 명시 = AI 추출 셀 삭제 (시설 가이드 영역) */}
                        {isAdmin && (
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            {/* 5/22 사용자 명시 = ✎ 편집 추가 (정보 수정 요청 형태로 누적) */}
                            <button
                              onClick={async () => {
                                const text = prompt(`${f.venue_name} — 수정할 정보를 입력하세요\n예: 코엑스 그랜드볼룸 최대 폭이 4,000mm에서 3,500mm로 변경됨`)
                                if (!text || !text.trim()) return
                                try {
                                  const res = await fetch('/api/correction-requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ venue_key: f.venue_key, venue_name: f.venue_name, correction_text: text.trim() }),
                                  })
                                  if (res.ok) alert('수정 요청이 접수되었습니다.')
                                  else alert('요청 실패')
                                } catch { alert('요청 실패') }
                              }}
                              title="정보 수정 요청"
                              className="text-[11px] leading-none px-1 text-slate-400 hover:text-indigo-600"
                            >✎</button>
                            <button
                              onClick={() => toggleHideFacilityVenue(f.venue_key)}
                              title={hidden ? '복구' : '삭제·숨김 (데이터 오류 보완)'}
                              className={`text-[11px] leading-none px-1 ml-1 ${hidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 hover:text-red-500'}`}
                            >
                              {hidden ? '↺' : '✕'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                    // L3 = 펼침 시 학습 내용 = 사용자 명시 = "실제 행사 제작에서 가이드 열었을때 보이는 대로"
                    // = FacilityGuidePanel 영역 호출·JSON.stringify 영역 X.
                    if (isOpen) {
                      out.push(
                        <tr key={`L3-${f.venue_key}`} className="bg-slate-50/70">
                          <td></td>
                          <td colSpan={adminColCount - 1} className="px-3 py-3">
                            <button
                              onClick={() => setFacilityPanelVenue(f.venue_name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] rounded font-medium"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {f.venue_name} 가이드 보기
                            </button>
                          </td>
                        </tr>
                      )
                    }
                  })
                })
                return out
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </>}
        {/* v9.31: 예외 패턴 모니터 — 행사장 대섹션의 ′예외 패턴′ 서브탭 */}
        {activeSection === 'facility-guides' && <>
        {/* ── 예외 빈도 모니터 — 제작 완료 데이터 > 가이드 규칙 (v9.16, v9.30 보강) ── */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            가이드 예외 패턴
          </h2>

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

        {/* 5/20 노션 §12 정합 = 시설 가이드 아래 수정 요청 통합 */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-slate-900 font-semibold text-sm mb-1 flex items-center gap-2">
            <Flag className="w-4 h-4 text-rose-500" />
            수정 요청 대기
          </h2>
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
                          // v9.37: admin API로 status 표준화 — resolved
                          await fetch(`/api/admin/correction-requests/${req.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'resolved', review_note: 'AI 재추출 완료' }),
                          })
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
                    {/* v9.37 — 표준 워크플로 3버튼(승인·반려·해결) */}
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/admin/correction-requests/${req.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'approved' }),
                        })
                        if (res.ok) setCorrectionRequests(prev => prev.filter(r => r.id !== req.id))
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    >
                      승인
                    </button>
                    <button
                      onClick={async () => {
                        const note = prompt('반려 사유(선택)') ?? ''
                        const res = await fetch(`/api/admin/correction-requests/${req.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'rejected', review_note: note }),
                        })
                        if (res.ok) setCorrectionRequests(prev => prev.filter(r => r.id !== req.id))
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white transition"
                    >
                      반려
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/admin/correction-requests/${req.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'resolved' }),
                        })
                        if (res.ok) setCorrectionRequests(prev => prev.filter(r => r.id !== req.id))
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
                    >
                      해결
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        </>}

        {/* v9.32 신규 — 프로그램 파트 메뉴 (4번): PROGRAM_PARTS 12종을 그룹별 카드로 표시.
            편집·추가·삭제는 추후 사이클 (현재 read-only). NewProjectButton·case-a 위자드에서 사용. */}
        {false && (
        <>
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                <Workflow className="w-4 h-4 text-emerald-500" />
                프로그램 파트 ({PROGRAM_PARTS.length}종)
              </h2>
            </div>

            <div className="space-y-5">
              {PROGRAM_PART_GROUPS.map(g => {
                const parts = PROGRAM_PARTS.filter(p => p.group === g.group)
                const groupColor = g.group === 'program'
                  ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' }
                  : g.group === 'attendee'
                  ? { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  dot: 'bg-indigo-500' }
                  : { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' }
                return (
                  <div key={g.group}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${groupColor.dot}`} />
                      <h3 className={`text-xs font-semibold ${groupColor.text}`}>{g.label}</h3>
                      <span className="text-[10px] text-slate-400">{parts.length}종</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {parts.map(p => {
                        const hints = PROGRAM_PART_SIGNAGE_HINTS[p.code] ?? []
                        return (
                          <div key={p.code} className={`${groupColor.bg} ${groupColor.border} border rounded-lg p-3`}>
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className={`text-[10px] font-mono ${groupColor.text}`}>{p.code}</span>
                              <span className="text-slate-900 font-semibold text-sm">{p.name}</span>
                            </div>
                            {p.hint && (
                              <p className="text-[11px] text-slate-600 mb-1.5 leading-snug">{p.hint}</p>
                            )}
                            {hints.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-white/60">
                                {hints.map(h => (
                                  <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 text-slate-600 border border-slate-200 font-mono">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

          </section>
        </>
        )}

          </div>
        </div>
      </main>

      {/* 5/22 P1-2 = 환경장식물 종류 편집 모달 (prompt 알랏 → 모달 창) */}
      {editingSignageType && (
        <SignageTypeEditModal
          initial={editingSignageType}
          onClose={() => setEditingSignageType(null)}
          onSave={(draft) => saveSignageTypeEdit(editingSignageType, draft)}
        />
      )}
      {/* 5/22 P2-4 = 프로그램 파트 편집·추가 모달 */}
      {editingProgramPart && (
        <ProgramPartEditModal
          initial={editingProgramPart}
          isNew={editingProgramPart.code === ''}
          onClose={() => setEditingProgramPart(null)}
          onSave={(draft) => {
            if (editingProgramPart.code === '') addCustomProgramPart(draft)
            else saveProgramPartEdit(editingProgramPart.code, draft)
          }}
        />
      )}
      {/* 5/22 사용자 명시 = 행사 관리 편집·추가 모달 */}
      {editingEvent && (
        <EventEditModal
          initial={editingEvent}
          isNew={editingEvent.project_name === ''}
          onClose={() => setEditingEvent(null)}
          onSave={(draft) => {
            if (editingEvent.project_name === '') addCustomEvent(draft)
            else saveEventEdit(editingEvent.project_code || editingEvent.project_name, draft)
          }}
        />
      )}
      {/* 5/22 사용자 명시 = L3 학습 내용 = 실제 행사 제작에서 가이드 열었을때 보이는 패널 영역 */}
      <FacilityGuidePanel
        venueName={facilityPanelVenue}
        open={facilityPanelVenue !== null}
        onClose={() => setFacilityPanelVenue(null)}
        adminMode={isAdmin}
        venueId={facilityPanelVenue ? (venues.find(v => v.name === facilityPanelVenue)?.id ?? null) : null}
      />
    </div>
  )
}

// 5/22 P1-2 = 환경장식물 종류 편집 모달
function SignageTypeEditModal({ initial, onClose, onSave }: {
  initial: SignageTypeRow
  onClose: () => void
  onSave: (draft: { name: string; width_mm: number; height_mm: number; default_material: string; category: string; layout: string }) => void
}) {
  const [name, setName] = useState(initial.name)
  const [width, setWidth] = useState(String(initial.width_mm))
  const [height, setHeight] = useState(String(initial.height_mm))
  const [material, setMaterial] = useState(initial.default_material ?? '')
  const [category, setCategory] = useState(initial.category ?? '')
  const [layout, setLayout] = useState(initial.layout ?? '세로')
  return (
    <div className="fixed inset-0 bg-black/40 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border-2 border-indigo-200 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">환경장식물 종류 편집</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">종류명</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">너비 (mm)</label>
              <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">높이 (mm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">기본 재질</label>
            <input value={material} onChange={e => setMaterial(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">분류</label>
            <input value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">레이아웃</label>
            <select value={layout} onChange={e => setLayout(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
              <option value="세로">세로</option>
              <option value="가로">가로</option>
              <option value="정사각">정사각</option>
            </select>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">취소</button>
          <button
            onClick={() => onSave({ name: name.trim(), width_mm: Number(width), height_mm: Number(height), default_material: material.trim(), category: category.trim(), layout })}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded"
          >저장</button>
        </div>
      </div>
    </div>
  )
}

// 5/22 P2-4 = 프로그램 파트 편집·추가 모달
function ProgramPartEditModal({ initial, isNew, onClose, onSave }: {
  initial: { code: string; name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }
  isNew: boolean
  onClose: () => void
  onSave: (draft: { name: string; hint: string; group: 'program'|'attendee'|'promotion'|'other' }) => void
}) {
  const [name, setName] = useState(initial.name)
  const [hint, setHint] = useState(initial.hint)
  const [group, setGroup] = useState<'program'|'attendee'|'promotion'|'other'>(initial.group)
  return (
    <div className="fixed inset-0 bg-black/40 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border-2 border-indigo-200 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{isNew ? '프로그램 파트 추가' : '프로그램 파트 편집'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">분류</label>
            <select value={group} onChange={e => setGroup(e.target.value as typeof group)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
              <option value="program">프로그램</option>
              <option value="attendee">참가자 응대</option>
              <option value="promotion">홍보</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">파트명</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">설명 (hint)</label>
            <input value={hint} onChange={e => setHint(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">취소</button>
          <button
            onClick={() => onSave({ name: name.trim(), hint: hint.trim(), group })}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded"
          >{isNew ? '추가' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}

// 5/22 사용자 명시 = 행사 관리 편집·추가 모달
function EventEditModal({ initial, isNew, onClose, onSave }: {
  initial: { project_name: string; project_code: string; year: number; venue: string; program_parts: string[]; analyzed_item_count?: number }
  isNew: boolean
  onClose: () => void
  onSave: (draft: { project_name: string; project_code: string; year: number; venue: string; program_parts: string[]; analyzed_item_count?: number }) => void
}) {
  const [projectName, setProjectName] = useState(initial.project_name)
  const [projectCode, setProjectCode] = useState(initial.project_code)
  const [year, setYear] = useState(String(initial.year))
  const [venue, setVenue] = useState(initial.venue)
  const [parts, setParts] = useState<string[]>(initial.program_parts)
  const [itemCount, setItemCount] = useState(initial.analyzed_item_count != null ? String(initial.analyzed_item_count) : '')
  const togglePart = (code: string) => {
    setParts(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code])
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border-2 border-emerald-200 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{isNew ? '행사 추가' : '행사 편집'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">행사명</label>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="예: 2025 K-MICE EXPO" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">행사 코드</label>
              <input value={projectCode} onChange={e => setProjectCode(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="예: 251020" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">연도</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">행사장</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="예: 코엑스 그랜드볼룸" />
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">프로그램 파트 (다중)</label>
            <div className="flex flex-wrap gap-1">
              {PROGRAM_PARTS.map(pt => (
                <button
                  key={pt.code}
                  type="button"
                  onClick={() => togglePart(pt.code)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${parts.includes(pt.code) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-500'}`}
                >{pt.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-600 block mb-1">분석 항목 수 (선택)</label>
            <input type="number" value={itemCount} onChange={e => setItemCount(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="예: 35" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">취소</button>
          <button
            onClick={() => onSave({
              project_name: projectName.trim(),
              project_code: projectCode.trim(),
              year: Number(year) || new Date().getFullYear(),
              venue: venue.trim(),
              program_parts: parts,
              analyzed_item_count: itemCount ? Number(itemCount) : undefined,
            })}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded"
          >{isNew ? '추가' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}

/**
 * 표준 행사장 계층 트리 — 노션 페이지 36148589-8ea1-81a3-b3e8-dd4a833c914c §9.
 * L1 (COEX·KINTEX·DDP) → L2 (홀) 펼침/접힘.
 *
 * 1차 = 정적 시드 (lib/venueIntel.ts VENUE_HALLS).
 * 2차 = Supabase venue_halls 테이블 (v6 마이그레이션 + 사용자 컴펌 후) — 추가/수정/삭제 활성.
 */
function VenueHierarchyTree() {
  // L1 = VENUE_HALLS의 고유 parent_key. 노션 §9 순서 유지 (COEX·KINTEX·DDP)
  const l1Keys = Array.from(new Set(VENUE_HALLS.map(h => h.parent_key)))
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => Object.fromEntries(l1Keys.map(k => [k, true]))
  )
  const toggle = (k: string) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-slate-900 font-semibold text-sm mb-2 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-indigo-500" />
        표준 행사장 계층 (L1 → L2)
        <span className="ml-2 text-[10px] font-normal text-slate-400">표준 행사장 계층 정보 · 편집 기능은 다음 사이클</span>
      </h2>
      <p className="text-[11px] text-slate-500 mb-4">
        5/14 회의 결정 = 구역·홀 단위로 묶기 (계층 구조). 현재는 읽기 전용 트리. Supabase venue_halls 마이그레이션 후 편집 가능.
      </p>

      <div className="space-y-2">
        {l1Keys.map(parentKey => {
          const halls = getHallsByVenueKey(parentKey)
          const isOpen = expanded[parentKey] ?? false
          return (
            <div key={parentKey} className="border border-slate-200 rounded-md overflow-hidden">
              <button
                onClick={() => toggle(parentKey)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  {parentKey}
                  <span className="text-[10px] text-slate-500 font-normal">L1 · {halls.length}개 하위 홀</span>
                </span>
              </button>
              {isOpen && (
                <ul className="divide-y divide-slate-100">
                  {halls.map((h, i) => (
                    <li key={`${parentKey}-${i}`} className="px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50/50">
                      <span className="flex items-center gap-2">
                        <span className="text-slate-300">└</span>
                        <span className="text-slate-700">{h.name}</span>
                      </span>
                      {h.note && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          {h.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
