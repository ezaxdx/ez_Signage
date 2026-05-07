'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, ChevronRight, ChevronLeft, Check, UserPlus, Trash2, Search, Target, Upload, FileSpreadsheet, AlertCircle, Map, ImageIcon, MapPinPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { insertDefaultSlotsForItems } from '@/lib/services/itemService'
import { PURPOSE_PRESETS } from '@/lib/constants'
import type { ProjectStatus, Profile } from '@/lib/types'
import { SEED_PERFLIST, recommendByProbability, getSelectionRates } from '@/lib/data/dashboardSeed'
import { fetchLiveStats, invalidateLiveStatsCache, type LiveStats } from '@/lib/data/liveStats'
import { VENUE_LIST, groupVenuesByRegion } from '@/lib/venueIntel'
import { PROGRAM_PARTS, PROGRAM_PART_GROUPS, recommendSignageByParts } from '@/lib/programParts'
import { VenueRequestModal } from './VenueRequestModal'

// 과거 수행실적에서 발주처·행사장 후보 추출 (자동완성)
const KNOWN_CLIENTS_NPB = Array.from(new Set(SEED_PERFLIST.map(p => p.client))).sort()
const KNOWN_VENUES_NPB = Array.from(new Set(SEED_PERFLIST.map(p => p.venue))).sort()

// 명세 6.2.4 — 행사 장소별 역대 사용 환경장식물 매칭
function matchVenueHistory(venueInput: string): { venue: string; count: number; pastEvents: string[] } | null {
  if (!venueInput.trim()) return null
  const matched = SEED_PERFLIST.filter(p =>
    p.venue.includes(venueInput) || venueInput.includes(p.venue.split(' ')[0])
  )
  if (matched.length === 0) return null
  return {
    venue: matched[0].venue,
    count: matched.length,
    pastEvents: matched.slice(0, 3).map(p => p.project_name),
  }
}

// 엑셀 헤더 fuzzy 매칭 — 명세 17컬럼 + 다양한 양식 별칭 (양식 다양성 대응)
// 매칭 우선순위: 정확 일치 → 부분 포함 → 핵심 키워드 일치
const EXCEL_COLUMN_KEYS = [
  { key: 'no',       names: ['NO', 'NO.', '번호', '순번', '연번', '연 번', '#'] },
  { key: 'part',     names: ['파트', '업무파트', '담당파트', '담당'] },
  { key: 'category', names: ['품목', '제작물', '환경장식물', '품명', '항목', '종류'] },
  { key: 'bigarea',  names: ['구분', '구 분', '구분1', '구 분 1', '대분류'] },
  { key: 'location', names: ['장소', '설치장소', '설치위치', '위치', '설 치 장 소', '행사장'] },
  { key: 'purpose',  names: ['사용목적', '목적', '용도'] },
  { key: 'language', names: ['언어', '언 어'] },
  { key: 'size',     names: ['규격', '사이즈', '사 이 즈', '크기', '치수', '규격(mm)'] },
  { key: 'material', names: ['재질', '재 질', '소재', '재료'] },
  { key: 'quantity', names: ['수량', '수 량', '개수', '갯수', '수'] },
  { key: 'content',  names: ['내용', '내 용', '본문', '텍스트'] },
  { key: 'note',     names: ['비고', '비 고', '메모', '참고'] },
] as const

interface ParsedExcelRow {
  no?: string; part?: string; category?: string; bigarea?: string; location?: string
  purpose?: string; language?: string; size?: string; material?: string; quantity?: string
  content?: string; note?: string
}

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
const smallInputCls =
  'w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed'

// 환경장식물 종류별 인라인 설명 (회의록 2순위 목적 분류 + 명세 인라인 헬프)
// "X배너는 행사 입구에 세우는 세로 배너로..." 패턴
const FORMAT_DESCRIPTIONS: Record<string, { purpose: string; usage: string }> = {
  x_banner:           { purpose: '입구·등록 / 동선 안내', usage: '행사 입구 양쪽에 세우는 세로 배너. 행사명·메인 메시지 강조. 보통 2개씩 사용' },
  i_banner:           { purpose: '실내 안내', usage: '회의실·세션장 입구의 단순 안내. X배너보다 슬림' },
  streetlight_banner: { purpose: '외부 동선 / 행사장 진입', usage: '가로등에 매다는 양면 인쇄. 행사장 외부 도로변 다수 부착' },
  horizontal_banner:  { purpose: '메인 무대 홍보', usage: '무대 정면 또는 행사장 정문 가로형. 행사명+영문 병기 권장' },
  vertical_banner:    { purpose: '행사장 환경 조성', usage: '천장에서 떨어뜨리는 세로 현수막. 로비·메인홀 환경 조성' },
  chunchen_banner:    { purpose: '대형 환경 조성', usage: '천장에 매다는 초대형. MOU·국제회의 등 격식 행사' },
  podium:             { purpose: '연단 브랜딩', usage: '연단 전면 부착. 행사 로고·타이틀 강조' },
  l_board:            { purpose: '룸 사인 / 단일 장소 안내', usage: 'L자 폼보드. 회의실 입구 명패 / 룸 안내' },
  foamboard:          { purpose: '정보 안내 / 단계별 설명', usage: '평면 폼보드. 등록 절차·프로그램·행사 안내' },
  hardpaper:          { purpose: '인쇄물 / 자료', usage: '하드지 인쇄. 안내 카드·프로그램북' },
  coated_paper:       { purpose: '핸드아웃', usage: '코팅지 인쇄. 사용자 배포용' },
  pop_guide:          { purpose: '안내 POP', usage: 'A3 PET POP. 데스크 안내 / 미니 사인' },
  backwall:           { purpose: '메인 백드롭', usage: '대형 백월. 무대 뒷면 / 포토존 배경' },
  a4_portrait:        { purpose: '소형 안내 / 룸 사인', usage: 'A4 세로 인쇄. 좌석 명패·룸사인' },
  a4_landscape:       { purpose: '손피켓 / 좌석 안내', usage: 'A4 가로 인쇄. 영접 피켓·좌석 표시' },
  a3_portrait:        { purpose: '안내 POP', usage: 'A3 세로 인쇄. 동선 안내·이벤트 알림' },
  a3_landscape:       { purpose: '손피켓 / 안내', usage: 'A3 가로 인쇄. 큰 손피켓·중간 안내' },
}

const FORMAT_PRESETS = [
  { id: 'x_banner',           name: 'X-배너',        width: 600,  height: 1800, material: 'PET' },
  { id: 'i_banner',           name: 'I-배너',        width: 600,  height: 1600, material: 'PET' },
  { id: 'streetlight_banner', name: '가로등 배너',   width: 600,  height: 1800, material: '현수막' },
  { id: 'horizontal_banner',  name: '가로 현수막',   width: 5000, height: 900,  material: '현수막' },
  { id: 'vertical_banner',    name: '세로 현수막',   width: 900,  height: 5000, material: '현수막' },
  { id: 'chunchen_banner',    name: '통천',          width: 1000, height: 5000, material: '현수막' },
  { id: 'podium',             name: '포디움 타이틀', width: 600,  height: 200,  material: '스티커' },
  { id: 'l_board',            name: 'L보드',         width: 600,  height: 900,  material: '폼보드 5T' },
  { id: 'foamboard',          name: '폼보드',        width: 600,  height: 900,  material: '폼보드 5T' },
  { id: 'hardpaper',          name: '하드지',        width: 297,  height: 420,  material: '하드지' },
  { id: 'coated_paper',       name: '코팅지',        width: 210,  height: 297,  material: '코팅지' },
  { id: 'pop_guide',          name: '안내 POP',      width: 297,  height: 420,  material: 'PET' },
  { id: 'backwall',           name: '백월',          width: 6000, height: 2400, material: '백월' },
  { id: 'a4_portrait',        name: 'A4 세로',       width: 210,  height: 297,  material: '인쇄' },
  { id: 'a4_landscape',       name: 'A4 가로',       width: 297,  height: 210,  material: '인쇄' },
  { id: 'a3_portrait',        name: 'A3 세로',       width: 297,  height: 420,  material: '인쇄' },
  { id: 'a3_landscape',       name: 'A3 가로',       width: 420,  height: 297,  material: '인쇄' },
] as const

interface FormatState { selected: boolean; width: number; height: number; material: string; count: number; name: string }
interface CustomFormat { id: string; name: string; width: number; height: number; material: string; count: number; selected: boolean }
interface Member { email: string; part: string }

const makeInitialFormats = (): Record<string, FormatState> =>
  Object.fromEntries(
    FORMAT_PRESETS.map(f => [f.id, { selected: false, width: f.width, height: f.height, material: f.material, count: 1, name: f.name }])
  )

interface Props { userId: string; userEmail: string }

// 사용 목적 단계 제거 (행사 유형과 기능 중복)
const STEP_LABELS = ['기본 정보', '팀원 초대', '제작물 선택']

export function NewProjectButton({ userId, userEmail }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [info, setInfo] = useState({
    name: '',
    client_name: '',
    event_venue: '',
    event_date: '',
    status: '준비중' as ProjectStatus,
    event_type: '' as '' | 'conference' | 'exhibition' | 'fair' | 'awards' | 'forum' | 'workshop' | 'experience' | 'ceremony' | 'launching' | 'other',
    setup_date: '',
    teardown_date: '',
    attendees_count: '',
    event_language: '' as '' | 'KOR' | 'EN' | 'EN/KOR' | 'multi',
  })
  // v4.1 갱신-A: 프로그램 파트 다중선택
  const [programParts, setProgramParts] = useState<Set<string>>(new Set())
  // v4.1 단위 3: 신규 행사장 등록 요청 모달
  const [venueRequestOpen, setVenueRequestOpen] = useState(false)
  // 사용자가 본 세션에서 요청한 행사장(승인 전이지만 폼에서 즉시 사용 가능하게)
  const [pendingVenueNames, setPendingVenueNames] = useState<string[]>([])
  const [selectedPurposes, setSelectedPurposes] = useState<Set<string>>(new Set())
  const [members, setMembers] = useState<Member[]>([{ email: userEmail, part: '' }])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [newPart, setNewPart] = useState('')
  const [formats, setFormats] = useState<Record<string, FormatState>>(makeInitialFormats)
  const [customFormats, setCustomFormats] = useState<CustomFormat[]>([])
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelRows, setExcelRows] = useState<ParsedExcelRow[]>([])
  const [excelParsing, setExcelParsing] = useState(false)
  const [excelError, setExcelError] = useState<string | null>(null)
  const [mockupFile, setMockupFile] = useState<File | null>(null)
  const [mockupPreview, setMockupPreview] = useState<string | null>(null)
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null)
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null)
  // step 4: 품목별 시안 (formatId → file+preview) + 일괄 시안
  const [formatMockups, setFormatMockups] = useState<Record<string, { file: File; preview: string }>>({})
  const [batchMockup, setBatchMockup] = useState<{ file: File; preview: string } | null>(null)

  // 라이브 통계 (사용자가 만든 프로젝트 누적 데이터)
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)

  // 이름/이메일 검색 (debounced)
  useEffect(() => {
    if (!searchQuery.trim() || selectedProfile) {
      setSearchResults([])
      return
    }
    const q = searchQuery.trim()
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10)
      setSearchResults((data ?? []) as Profile[])
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery, selectedProfile])

  // ESC 키로 모달 닫기 + 모달 열려있을 때 body 스크롤 잠금 (UX 표준)
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) handleClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoading])

  // 모달 열릴 때 라이브 통계 fetch (5분 캐시)
  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    fetchLiveStats(supabase).then(setLiveStats).catch(err => {
      console.error('[LiveStats] fetch 실패:', err)
    })
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false); setStep(1)
    setInfo({ name: '', client_name: '', event_venue: '', event_date: '', status: '준비중', event_type: '', setup_date: '', teardown_date: '', attendees_count: '', event_language: '' })
    setProgramParts(new Set())
    setVenueRequestOpen(false)
    setSelectedPurposes(new Set())
    setMembers([{ email: userEmail, part: '' }])
    setSearchQuery(''); setSelectedProfile(null); setNewPart('')
    setFormats(makeInitialFormats()); setCustomFormats([]); setError(null)
  setExcelFile(null); setExcelRows([]); setExcelError(null)
  setMockupFile(null); setMockupPreview(null)
  setFloorPlanFile(null); setFloorPlanPreview(null)
  setFormatMockups({}); setBatchMockup(null)
  }

  const handleExcelFile = async (file: File) => {
    setExcelParsing(true)
    setExcelError(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
      if (aoa.length < 2) { setExcelError('엑셀에 데이터가 없습니다'); return }

      // 헤더 행 감지 — EXCEL_COLUMN_KEYS의 어떤 별칭과도 매치되는 셀이 2개 이상인 행
      // (단순 NO 매치는 매우 엄격해서 'NO.', '순번', '연번' 같은 변형 인식 못 함)
      const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
      const allAliases = EXCEL_COLUMN_KEYS.flatMap(c => c.names.map(norm))
      let headerIdx = aoa.findIndex(row => {
        const matches = row.filter(c => {
          const ns = norm(String(c))
          return ns && allAliases.some(a => ns === a || ns.includes(a) || a.includes(ns))
        })
        return matches.length >= 2  // 최소 2개 컬럼 일치 시 헤더로 판단
      })
      if (headerIdx === -1) headerIdx = 0

      const header = aoa[headerIdx].map(c => String(c).trim())
      const colMap: Record<string, number> = {}
      for (const { key, names } of EXCEL_COLUMN_KEYS) {
        const i = header.findIndex(h => {
          const ns = norm(h)
          return ns && names.some(n => {
            const an = norm(n)
            return ns === an || ns.includes(an) || an.includes(ns)
          })
        })
        if (i >= 0) colMap[key] = i
      }

      // 디버그: 매칭된 컬럼 정보 (개발자 도구 콘솔에서 확인 가능)
      if (typeof window !== 'undefined') {
        console.log('[Excel Parse] header row:', header)
        console.log('[Excel Parse] colMap:', colMap)
        console.log('[Excel Parse] matched cols:', Object.keys(colMap).length)
      }
      if (Object.keys(colMap).length === 0) {
        setExcelError(`헤더를 찾지 못했습니다. 첫 행이 NO/품목/규격/수량 등을 포함하는지 확인하세요. (현재 행: ${header.slice(0, 5).join(' | ')})`)
        return
      }

      const rows: ParsedExcelRow[] = aoa.slice(headerIdx + 1)
        .filter(r => r.some(c => String(c).trim() !== ''))
        .map(r => {
          const out: ParsedExcelRow = {}
          for (const { key } of EXCEL_COLUMN_KEYS) {
            const i = colMap[key]
            if (i !== undefined) out[key] = String(r[i] ?? '').trim()
          }
          return out
        })

      setExcelRows(rows)
      setExcelFile(file)
    } catch (e) {
      setExcelError(e instanceof Error ? e.message : '파싱 실패')
    } finally {
      setExcelParsing(false)
    }
  }

  const renameFormat = (id: string, name: string) => {
    setFormats(prev => ({ ...prev, [id]: { ...prev[id], name } }))
  }

  const addCustomFormat = () => {
    setCustomFormats(prev => [...prev, {
      id: `custom_${Date.now()}`,
      name: '새 제작물',
      width: 600,
      height: 900,
      material: '',
      count: 1,
      selected: true,
    }])
  }

  const updateCustomFormat = (id: string, patch: Partial<CustomFormat>) => {
    setCustomFormats(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  const removeCustomFormat = (id: string) => {
    setCustomFormats(prev => prev.filter(f => f.id !== id))
  }

  const togglePurpose = (id: string) => {
    setSelectedPurposes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    // 선택된 목적의 추천 양식들을 자동 체크
    const purpose = PURPOSE_PRESETS.find(p => p.id === id)
    if (purpose && !selectedPurposes.has(id)) {
      setFormats(prev => {
        const next = { ...prev }
        for (const fid of purpose.recommendedFormats) {
          if (next[fid]) next[fid] = { ...next[fid], selected: true }
        }
        return next
      })
    }
  }

  // 명세 6.2.6 — 행사 유형 선택 시 해당 환경장식물 자동 체크
  // 매핑: 행사 유형 → 권장 환경장식물 IDs (FORMAT_PRESETS 기준)
  const EVENT_TYPE_RECOMMEND: Record<string, string[]> = {
    conference: ['x_banner', 'podium', 'foamboard', 'a3_portrait'],
    exhibition: ['horizontal_banner', 'vertical_banner', 'chunchen_banner', 'foamboard'],
    fair:       ['chunchen_banner', 'vertical_banner', 'streetlight_banner', 'foamboard'],
    awards:     ['podium', 'x_banner', 'vertical_banner'],
    forum:      ['x_banner', 'podium', 'foamboard', 'a4_landscape'],
    workshop:   ['foamboard', 'a3_portrait', 'x_banner'],
    experience: ['x_banner', 'foamboard', 'a3_portrait'],
    ceremony:   ['vertical_banner', 'podium', 'horizontal_banner'],
    launching:  ['x_banner', 'horizontal_banner', 'podium'],
  }
  const selectEventType = (typeId: '' | typeof info.event_type) => {
    const newType = info.event_type === typeId ? '' : typeId
    setInfo(p => ({ ...p, event_type: newType as typeof p.event_type }))
    if (newType && EVENT_TYPE_RECOMMEND[newType]) {
      setFormats(prev => {
        const next = { ...prev }
        for (const fid of EVENT_TYPE_RECOMMEND[newType]) {
          if (next[fid]) next[fid] = { ...next[fid], selected: true }
        }
        return next
      })
    }
  }

  // v4.1 갱신-A: 프로그램 파트 다중선택 토글 + 권장 환경장식물 자동 체크
  const toggleProgramPart = (code: string) => {
    setProgramParts(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      // 다중선택 결과 → 권장 환경장식물 union 자동 체크 (기존 사용자 체크는 보존)
      const recommended = recommendSignageByParts(Array.from(next))
      if (recommended.length > 0) {
        setFormats(prevF => {
          const updated = { ...prevF }
          for (const fid of recommended) {
            if (updated[fid]) updated[fid] = { ...updated[fid], selected: true }
          }
          return updated
        })
      }
      return next
    })
  }

  const addMember = () => {
    if (!selectedProfile) return
    const email = selectedProfile.email
    if (members.some(m => m.email === email)) return
    setMembers(prev => [...prev, { email, part: newPart.trim() }])
    setSearchQuery(''); setSelectedProfile(null); setNewPart('')
    setShowSearch(false)
  }

  const removeMember = (email: string) => {
    if (email === userEmail) return
    setMembers(prev => prev.filter(m => m.email !== email))
  }

  const updateMemberPart = (email: string, part: string) => {
    setMembers(prev => prev.map(m => m.email === email ? { ...m, part } : m))
  }

  const toggleFormat = (id: string) =>
    setFormats(prev => ({ ...prev, [id]: { ...prev[id], selected: !prev[id].selected } }))

  const updateFormat = (id: string, key: 'width' | 'height' | 'material' | 'count', raw: string) => {
    if (key === 'material') {
      setFormats(prev => ({ ...prev, [id]: { ...prev[id], material: raw } }))
    } else {
      const n = parseInt(raw) || 0
      setFormats(prev => ({ ...prev, [id]: { ...prev[id], [key]: n } }))
    }
  }

  const selectedCount = Object.values(formats).filter(f => f.selected).length + customFormats.filter(f => f.selected).length
  const totalItemCount =
    Object.values(formats).filter(f => f.selected).reduce((sum, f) => sum + (f.count || 1), 0) +
    customFormats.filter(f => f.selected).reduce((sum, f) => sum + (f.count || 1), 0)

  const handleCreate = async () => {
    setIsLoading(true); setError(null)
    const supabase = createClient()

    // purposes 컬럼이 없을 수도 있어 시도 → 실패 시 컬럼 제외하고 재시도
    let project: { id: string } | null = null
    let projectErr: { message?: string } | null = null

    const baseInsert = {
      name: info.name,
      client_name: info.client_name || null,
      event_venue: info.event_venue || null,
      event_date: info.event_date || null,
      status: info.status,
      owner_id: userId,
    }
    const programPartsArr = Array.from(programParts)

    // 1차: program_parts + purposes 모두 시도
    const r1 = await supabase.from('projects').insert({
      ...baseInsert,
      purposes: Array.from(selectedPurposes),
      program_parts: programPartsArr,
    }).select().single()
    if (r1.error && /program_parts/i.test(r1.error.message)) {
      // program_parts 컬럼 없음 (마이그레이션 v6 미적용) → 제외하고 재시도
      const r2 = await supabase.from('projects').insert({
        ...baseInsert,
        purposes: Array.from(selectedPurposes),
      }).select().single()
      if (r2.error && /purposes/i.test(r2.error.message)) {
        const r3 = await supabase.from('projects').insert(baseInsert).select().single()
        project = r3.data
        projectErr = r3.error
      } else {
        project = r2.data
        projectErr = r2.error
      }
    } else if (r1.error && /purposes/i.test(r1.error.message)) {
      const r2 = await supabase.from('projects').insert({
        ...baseInsert,
        program_parts: programPartsArr,
      }).select().single()
      if (r2.error && /program_parts/i.test(r2.error.message)) {
        const r3 = await supabase.from('projects').insert(baseInsert).select().single()
        project = r3.data
        projectErr = r3.error
      } else {
        project = r2.data
        projectErr = r2.error
      }
    } else {
      project = r1.data
      projectErr = r1.error
    }

    if (projectErr || !project) {
      setError('프로젝트 생성 실패: ' + (projectErr?.message ?? '알 수 없는 오류'))
      setIsLoading(false)
      return
    }

    // 멤버 초대 삽입 (본인 포함) — 테이블 없을 시 무시
    const memberRows = members
      .filter(m => m.email)
      .map(m => ({ project_id: project.id, user_email: m.email, part_name: m.part || null }))
    if (memberRows.length > 0) {
      const memberRes = await supabase.from('project_members').insert(memberRows)
      if (memberRes.error) console.warn('project_members 삽입 실패 (마이그레이션 미실행 가능):', memberRes.error.message)
    }

    let idx = 1
    const allItemIds: string[] = []

    // ── Excel 행 우선 삽입 (alias 정규화 포함) ────────────────
    if (excelRows.length > 0) {
      const { loadAliases, resolveAliasSync } = await import('@/lib/services/aliasResolver')
      const aliases = await loadAliases(supabase)
      const excelItems = excelRows.map((r, i) => {
        const sizeMatch = (r.size || '').match(/(\d+)\s*[\*x×]\s*(\d+)/)
        const resolved = resolveAliasSync(r.category || '', aliases)
        return {
          project_id: project.id,
          no: r.no || String(idx + i).padStart(2, '0'),
          part: r.part || null,
          category: resolved.canonical || r.category || null,
          location: r.location || null,
          quantity: parseInt(r.quantity || '1', 10) || 1,
          material: r.material || null,
          width_mm: sizeMatch ? parseInt(sizeMatch[1]) : null,
          height_mm: sizeMatch ? parseInt(sizeMatch[2]) : null,
        }
      })
      idx += excelRows.length
      const { data: createdExcel } = await supabase.from('design_items').insert(excelItems).select('id')
      if (createdExcel) allItemIds.push(...createdExcel.map((i: { id: string }) => i.id))
    }

    // ── 프리셋 + 커스텀 제작물 생성 ─────────────────────────
    const selectedList: { name: string; width: number; height: number; material: string; count: number }[] = [
      ...FORMAT_PRESETS.filter(f => formats[f.id]?.selected).map(f => ({
        name: formats[f.id].name,
        width: formats[f.id].width,
        height: formats[f.id].height,
        material: formats[f.id].material,
        count: formats[f.id].count || 1,
      })),
      ...customFormats.filter(f => f.selected).map(f => ({
        name: f.name,
        width: f.width,
        height: f.height,
        material: f.material,
        count: f.count || 1,
      })),
    ]

    // 카테고리별 item_id 추적 (formatMockups 일괄 적용용)
    const idsByFormat: Record<string, string[]> = {}
    for (const f of selectedList) {
      const rows = Array.from({ length: f.count }, () => ({
        project_id: project.id,
        no: String(idx++).padStart(2, '0'),
        category: f.name,
        width_mm: f.width,
        height_mm: f.height,
        material: f.material,
        quantity: 1,
      }))
      const { data: created } = await supabase.from('design_items').insert(rows).select('id')
      if (created) {
        const ids = created.map((i: { id: string }) => i.id)
        allItemIds.push(...ids)
        // FORMAT_PRESETS의 id로 매칭 (커스텀은 name 기준)
        const presetId = FORMAT_PRESETS.find(p => p.name === f.name)?.id ?? f.name
        idsByFormat[presetId] = (idsByFormat[presetId] ?? []).concat(ids)
      }
    }

    if (allItemIds.length > 0) {
      await insertDefaultSlotsForItems(supabase, allItemIds, project.id)
    }

    // ── 시안 이미지 처리 (3가지 경로) ──
    // (사용자 요청: "디자인 시안 입력시 환경장식물에 일괄 적용 / 일괄 or 각각 가능")
    // 우선순위: batchMockup → mockupFile (legacy) → formatMockups (개별)

    let masterUrl: string | null = null

    // 1) 일괄 시안 (batchMockup) — step 3의 신규 경로
    const primaryMockup = batchMockup?.file ?? mockupFile
    const uploadErrors: string[] = []
    let uploadSuccess = 0

    if (primaryMockup) {
      const ext = primaryMockup.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/master/${project.id}.${ext}`
      console.log('[Mockup Upload] 일괄 시안 업로드 시작:', { path, size: primaryMockup.size, type: primaryMockup.type })
      const { data: uploaded, error: upErr } = await supabase.storage
        .from('design-images')
        .upload(path, primaryMockup, { upsert: true, contentType: primaryMockup.type })
      if (upErr) {
        const msg = `[일괄 시안] Storage 업로드 실패: ${upErr.message} (path: ${path})`
        console.error(msg, upErr)
        uploadErrors.push(msg)
      } else if (uploaded?.path) {
        const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(uploaded.path)
        masterUrl = publicUrl
        console.log('[Mockup Upload] ✓ 일괄 시안 storage 업로드 성공:', publicUrl)

        const { error: projErr } = await supabase.from('projects').update({ master_image_url: publicUrl }).eq('id', project.id)
        if (projErr) {
          const msg = `[일괄 시안] projects.master_image_url 저장 실패: ${projErr.message}`
          console.error(msg, projErr)
          uploadErrors.push(msg)
        }

        if (allItemIds.length > 0) {
          const { error: itemErr } = await supabase.from('design_items').update({ image_url: publicUrl }).in('id', allItemIds)
          if (itemErr) {
            const msg = `[일괄 시안] design_items.image_url 저장 실패: ${itemErr.message}`
            console.error(msg, itemErr)
            uploadErrors.push(msg)
          } else {
            console.log(`[Mockup Upload] ✓ 일괄 시안 ${allItemIds.length}개 항목에 image_url 저장 완료`)
            uploadSuccess += allItemIds.length
          }
        }
      }
    }

    // 2) 품목별 시안 (formatMockups) — 일괄을 덮어쓰는 형태로 적용
    for (const [formatId, mockup] of Object.entries(formatMockups)) {
      const ids = idsByFormat[formatId] ?? []
      if (ids.length === 0) continue
      const ext = mockup.file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/format-mockup/${project.id}/${formatId}.${ext}`
      console.log(`[Mockup Upload] 품목별 시안 업로드 시작 (${formatId}):`, path)
      const { data: uploaded, error: upErr } = await supabase.storage
        .from('design-images')
        .upload(path, mockup.file, { upsert: true, contentType: mockup.file.type })
      if (upErr) {
        const msg = `[품목별 ${formatId}] Storage 업로드 실패: ${upErr.message}`
        console.error(msg, upErr)
        uploadErrors.push(msg)
      } else if (uploaded?.path) {
        const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(uploaded.path)
        const { error: itemErr } = await supabase.from('design_items').update({ image_url: publicUrl }).in('id', ids)
        if (itemErr) {
          const msg = `[품목별 ${formatId}] design_items 갱신 실패: ${itemErr.message}`
          console.error(msg, itemErr)
          uploadErrors.push(msg)
        } else {
          console.log(`[Mockup Upload] ✓ ${formatId} 품목 시안 ${ids.length}개 항목에 적용`)
          uploadSuccess += ids.length
        }
      }
    }

    // 사용자에게 명확한 결과 알림 (시안 업로드 시도한 경우만)
    if (primaryMockup || Object.keys(formatMockups).length > 0) {
      if (uploadErrors.length > 0) {
        alert(
          `시안 업로드 일부 실패:\n\n` +
          uploadErrors.map((e, i) => `${i+1}. ${e}`).join('\n\n') +
          `\n\n원인 가능성:\n` +
          `• Supabase Storage에 design-images 버킷이 없음 → Studio → Storage에서 생성\n` +
          `• 버킷 RLS 정책 미설정 → migration_v3_all.sql 실행 필요\n` +
          `• 파일 크기 10MB 초과\n` +
          `• 인증 만료 → 재로그인\n\n` +
          `상세: 브라우저 F12 → Console 탭`
        )
      } else if (uploadSuccess > 0) {
        console.log(`[Mockup Upload] ✓ 총 ${uploadSuccess}개 항목에 시안 적용 완료`)
      }
    }

    void masterUrl  // 향후 마스터 URL 별도 사용 시

    // 배치도 업로드 (선택 사항 — floor_plan_url 컬럼이 없으면 무시됨)
    if (floorPlanFile) {
      const ext = floorPlanFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/floor-plans/${project.id}.${ext}`
      const { data: uploaded } = await supabase.storage
        .from('design-images')
        .upload(path, floorPlanFile, { upsert: true, contentType: floorPlanFile.type })
      if (uploaded?.path) {
        const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(uploaded.path)
        await supabase.from('projects').update({ floor_plan_url: publicUrl }).eq('id', project.id)
      }
    }

    // 라이브 통계 캐시 무효화 — 다음 모달 열 때 새 프로젝트 반영
    invalidateLiveStatsCache()

    setIsLoading(false)
    router.push(`/projects/${project.id}`)
  }

  return (
    <>
      <button
        data-new-project-trigger
        onClick={() => {
          // 추천 위젯에서 저장한 목적 자동 적용
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('mice_recommended_purposes')
            if (stored) {
              try {
                const ids = JSON.parse(stored) as string[]
                setSelectedPurposes(new Set(ids))
                // 추천 양식들도 자동 체크
                setFormats(prev => {
                  const next = { ...prev }
                  for (const pid of ids) {
                    const purpose = PURPOSE_PRESETS.find(p => p.id === pid)
                    if (purpose) {
                      for (const fid of purpose.recommendedFormats) {
                        if (next[fid]) next[fid] = { ...next[fid], selected: true }
                      }
                    }
                  }
                  return next
                })
                localStorage.removeItem('mice_recommended_purposes')
              } catch {}
            }
          }
          setIsOpen(true)
        }}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        <Plus className="w-4 h-4" /> 새 프로젝트
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <div className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-h-[92vh] transition-all duration-200 ${step === 3 ? 'max-w-2xl' : 'max-w-lg'}`}>
            {/* 헤더 */}
            <div className="flex items-start justify-between p-6 pb-5 flex-shrink-0">
              <div>
                <h2 className="text-slate-100 font-semibold">새 프로젝트 만들기</h2>
                <div className="flex items-center gap-1.5 mt-2.5">
                  {STEP_LABELS.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${step === i + 1 ? 'bg-indigo-600 text-white' : step > i + 1 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                        {step > i + 1 ? <Check className="w-2.5 h-2.5" /> : i + 1}
                      </div>
                      <span className={`text-[11px] ${step === i + 1 ? 'text-slate-200' : 'text-slate-600'}`}>{label}</span>
                      {i < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-slate-700" />}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition mt-0.5"><X className="w-4 h-4" /></button>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">

              {/* Step 1: 기본 정보 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">프로젝트명 <span className="text-indigo-400">*</span></label>
                    <input autoFocus required value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} placeholder="예: 2025 APEC 정상회의" className={inputCls} />
                  </div>

                  {/* v4.1 갱신-A: 프로그램 파트 다중선택 (EZ 폴더링 40.04~40.20) */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      프로그램 파트 <span className="text-slate-600 font-normal normal-case">(다중선택 — 추천 정확도 핵심)</span>
                    </label>
                    <div className="space-y-2">
                      {PROGRAM_PART_GROUPS.map(g => {
                        const items = PROGRAM_PARTS.filter(p => p.group === g.group)
                        return (
                          <div key={g.group}>
                            <p className="text-[10px] text-slate-500 mb-1">{g.label}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {items.map(p => {
                                const on = programParts.has(p.code)
                                return (
                                  <button
                                    key={p.code}
                                    type="button"
                                    onClick={() => toggleProgramPart(p.code)}
                                    title={p.hint}
                                    className={`px-2 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 transition text-left ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                                  >
                                    {on && <Check className="w-3 h-3 flex-shrink-0" />}
                                    <span className="truncate">{p.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {programParts.size > 0 && (
                      <p className="text-[10px] text-emerald-400 mt-1.5">
                        선택 {programParts.size}개 · 권장 환경장식물이 다음 단계에서 자동 체크됩니다
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">주최 / 발주처</label>
                    <input list="known-clients-npb" value={info.client_name} onChange={e => setInfo(p => ({ ...p, client_name: e.target.value }))} placeholder="예: 외교부 (입력 시 과거 발주처 추천)" className={inputCls} />
                    <datalist id="known-clients-npb">
                      {KNOWN_CLIENTS_NPB.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">행사 장소</label>
                      {(() => {
                        const venueGroups = groupVenuesByRegion()
                        const allRegisteredNames = VENUE_LIST.map(v => v.displayName)
                        const venueOptions = pendingVenueNames.length > 0
                          ? [{ region: '내가 요청한 (승인 대기)', items: pendingVenueNames.map(n => ({ displayName: n, key: n })) }, ...Object.entries(venueGroups).map(([r, items]) => ({ region: r, items }))]
                          : Object.entries(venueGroups).map(([r, items]) => ({ region: r, items }))
                        return (
                          <>
                            <select
                              value={info.event_venue}
                              onChange={e => setInfo(p => ({ ...p, event_venue: e.target.value }))}
                              className={inputCls}
                            >
                              <option value="">행사장 선택…</option>
                              {venueOptions.map(g => (
                                <optgroup key={g.region} label={g.region}>
                                  {g.items.map(v => (
                                    <option key={v.displayName} value={v.displayName}>{v.displayName}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setVenueRequestOpen(true)}
                              className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-900/40 rounded transition"
                            >
                              <MapPinPlus className="w-3 h-3" />
                              우리 행사장이 목록에 없어요 — 신규 등록 요청
                            </button>
                            {info.event_venue && !allRegisteredNames.includes(info.event_venue) && !pendingVenueNames.includes(info.event_venue) && (
                              <p className="text-[10px] text-amber-400 mt-1">학습되지 않은 행사장입니다. 추천 정확도가 낮을 수 있어요.</p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">행사일</label>
                      <input type="date" value={info.event_date} onChange={e => setInfo(p => ({ ...p, event_date: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} />
                    </div>
                  </div>

                  {/* 명세 6.2.4 — 입력된 장소의 과거 행사 매칭 알림 + 확률 기반 추천 (시드 + 라이브) */}
                  {(() => {
                    const probResult = recommendByProbability({
                      venue: info.event_venue,
                      client: info.client_name,
                      eventCategory: null,
                      liveData: liveStats ? {
                        liveAsPerfList: liveStats.liveAsPerfList,
                        itemCountByProject: liveStats.itemCountByProject,
                        avgItemCountByVenue: liveStats.avgItemCountByVenue,
                      } : null,
                    })
                    const hasMatch = probResult.matchedPastEvents.length > 0
                    if (!hasMatch && probResult.confidenceLevel === 'none') return null

                    const colorMap = {
                      high: 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300',
                      medium: 'bg-amber-950/30 border-amber-800/40 text-amber-300',
                      low: 'bg-orange-950/30 border-orange-800/40 text-orange-300',
                      none: 'bg-slate-900/30 border-slate-800/40 text-slate-400',
                    }
                    const labelMap = { high: '✅ 높음', medium: '🟡 보통', low: '⚠️ 낮음', none: '❌ 부족' }

                    const liveCount = probResult.matchedPastEvents.filter(e => e.isLive).length
                    const seedCount = probResult.matchedPastEvents.length - liveCount
                    return (
                      <div className={`border rounded-lg p-2.5 space-y-1.5 ${colorMap[probResult.confidenceLevel]}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-medium">
                            📊 확률 기반 추천 (신뢰도: <strong>{labelMap[probResult.confidenceLevel]}</strong>)
                          </p>
                          <span className="text-[10px] opacity-70">
                            {seedCount}건 시드 + {liveCount}건 누적
                          </span>
                        </div>
                        <p className="text-[10px] opacity-80">{probResult.message}</p>
                        {probResult.matchedPastEvents.length > 0 && (
                          <p className="text-[10px] opacity-70 truncate">
                            과거: {probResult.matchedPastEvents.slice(0, 3).map(e =>
                              `${e.name}${e.itemCount > 0 ? `(${e.itemCount}건)` : ''}${e.isLive ? '⚡' : ''}`
                            ).join(' · ')}
                          </p>
                        )}
                        {liveCount > 0 && (
                          <p className="text-[9px] opacity-60">⚡ = 본 앱에서 누적된 데이터 (자동 학습됨)</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* 세팅·철거일 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">세팅 시작일</label>
                      <input type="date" value={info.setup_date} onChange={e => setInfo(p => ({ ...p, setup_date: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">철거일</label>
                      <input type="date" value={info.teardown_date} onChange={e => setInfo(p => ({ ...p, teardown_date: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} />
                    </div>
                  </div>

                  {/* 참가자 수 + 언어 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">예상 참가자 수</label>
                      <input type="number" min={1} value={info.attendees_count} onChange={e => setInfo(p => ({ ...p, attendees_count: e.target.value }))} placeholder="예: 500" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">행사 언어</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['KOR', 'EN', 'EN/KOR', 'multi'] as const).map(l => {
                          const on = info.event_language === l
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setInfo(p => ({ ...p, event_language: on ? '' : l }))}
                              className={`px-1 py-2 rounded-lg border text-[10px] transition ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                              {l === 'multi' ? '다국어' : l === 'KOR' ? '국문' : l === 'EN' ? '영문' : '국·영'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 엑셀 업로드 (선택) */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      발주서 엑셀 <span className="text-slate-600 font-normal normal-case">(선택 — 제작물 목록 자동 입력)</span>
                    </label>
                    {excelRows.length > 0 ? (
                      <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/50 rounded-lg px-3 py-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-emerald-300 text-xs font-medium truncate">{excelFile?.name}</p>
                          <p className="text-emerald-500 text-[10px]">{excelRows.length}건 인식됨 → 4단계에서 확인</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setExcelFile(null); setExcelRows([]); setExcelError(null) }}
                          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="block border border-dashed border-slate-700 hover:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-800/30 transition">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) handleExcelFile(f)
                            e.target.value = ''
                          }}
                        />
                        {excelParsing ? (
                          <div className="flex items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">파일 읽는 중...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                            <p className="text-slate-500 text-xs">엑셀 파일 선택 (.xlsx)</p>
                          </>
                        )}
                      </label>
                    )}
                    {excelError && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-[10px] mt-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {excelError}
                      </div>
                    )}
                  </div>

                  {/* 디자인 시안 업로드 — 1차에서 제작물 선택 단계로 이동 (사용자 결정) */}
                  {false && (
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      디자인 시안 <span className="text-slate-600 font-normal normal-case">(선택 — 마스터 레이아웃 기준 이미지)</span>
                    </label>
                    {mockupPreview ? (
                      <div className="relative">
                        <img src={mockupPreview ?? undefined} alt="시안 미리보기" className="w-full max-h-36 object-contain rounded-lg border border-slate-700 bg-slate-800" />
                        <button
                          type="button"
                          onClick={() => { setMockupFile(null); setMockupPreview(null) }}
                          className="absolute top-2 right-2 bg-slate-900/80 text-slate-400 hover:text-slate-200 p-1 rounded-md transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <ImageIcon className="w-3 h-3 text-violet-400" />
                          <span className="text-violet-400 text-[10px] truncate">{mockupFile?.name}</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block border border-dashed border-slate-700 hover:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-800/30 transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            setMockupFile(f)
                            const reader = new FileReader()
                            reader.onload = ev => setMockupPreview(ev.target?.result as string)
                            reader.readAsDataURL(f)
                            e.target.value = ''
                          }}
                        />
                        <ImageIcon className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                        <p className="text-slate-500 text-xs">시안 이미지 선택 (jpg / png)</p>
                      </label>
                    )}
                  </div>
                  )}

                  {/* 행사장 배치도 업로드 (선택) */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      행사장 배치도 <span className="text-slate-600 font-normal normal-case">(선택 — 향후 AI 설치위치 추천에 활용)</span>
                    </label>
                    {floorPlanPreview ? (
                      <div className="relative">
                        <img src={floorPlanPreview} alt="배치도 미리보기" className="w-full max-h-36 object-contain rounded-lg border border-slate-700 bg-slate-800" />
                        <button
                          type="button"
                          onClick={() => { setFloorPlanFile(null); setFloorPlanPreview(null) }}
                          className="absolute top-2 right-2 bg-slate-900/80 text-slate-400 hover:text-slate-200 p-1 rounded-md transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Map className="w-3 h-3 text-sky-400" />
                          <span className="text-sky-400 text-[10px] truncate">{floorPlanFile?.name}</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block border border-dashed border-slate-700 hover:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-800/30 transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            setFloorPlanFile(f)
                            const reader = new FileReader()
                            reader.onload = ev => setFloorPlanPreview(ev.target?.result as string)
                            reader.readAsDataURL(f)
                            e.target.value = ''
                          }}
                        />
                        <Map className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                        <p className="text-slate-500 text-xs">배치도 이미지 선택 (jpg / png)</p>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: 사용 목적 — 1차 출시에서 제거 (행사 유형과 기능 중복) */}
              {false && step === 2 && (
                <div className="space-y-4">
                  <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-indigo-300 text-sm font-medium mb-1">이 행사에서 어떤 제작물이 필요한가요?</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          목적을 선택하면 <strong className="text-indigo-300">관련 제작물 양식이 자동으로 추천</strong>됩니다.<br />
                          (복수 선택 가능)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {PURPOSE_PRESETS.map(purpose => {
                      const isSelected = selectedPurposes.has(purpose.id)
                      return (
                        <button
                          key={purpose.id}
                          type="button"
                          onClick={() => togglePurpose(purpose.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition flex items-start gap-3 ${
                            isSelected
                              ? 'bg-indigo-950/50 border border-indigo-700/60 ring-1 ring-indigo-500/40'
                              : 'bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800'
                          }`}
                        >
                          <span className="text-2xl flex-shrink-0">{purpose.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                {purpose.label}
                              </span>
                              {isSelected && (
                                <span className="text-indigo-400">
                                  <Check className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">{purpose.description}</p>
                            {isSelected && (
                              <p className="text-indigo-400/70 text-[10px] mt-1">
                                추천: {purpose.recommendedFormats.map(fid => {
                                  const f = FORMAT_PRESETS.find(p => p.id === fid)
                                  return f?.name
                                }).filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedPurposes.size === 0 && (
                    <p className="text-slate-500 text-xs text-center py-2">목적을 선택하지 않고 건너뛸 수도 있습니다</p>
                  )}
                </div>
              )}

              {/* Step 2: 팀원 초대 (사용 목적 제거로 단계 번호 변경) */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm leading-relaxed">
                    프로젝트에 참여할 <strong className="text-slate-200">팀원</strong>과 각자 담당하는 <strong className="text-slate-200">파트명</strong>을 입력하세요.<br />
                    초대된 사람만 이 프로젝트에 접근할 수 있습니다.
                  </p>

                  {/* 현재 멤버 목록 */}
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.email} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-xs truncate">{m.email}</p>
                          {m.email === userEmail && <p className="text-indigo-400 text-[10px]">나 (프로젝트 소유자)</p>}
                        </div>
                        <input
                          value={m.part}
                          onChange={e => updateMemberPart(m.email, e.target.value)}
                          placeholder="담당 파트명 (예: 종합안내)"
                          className="w-36 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {m.email !== userEmail && (
                          <button onClick={() => removeMember(m.email)} className="text-slate-600 hover:text-red-400 transition p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 새 멤버 추가 (이름 검색) */}
                  <div className="border border-dashed border-slate-700 rounded-lg p-3 space-y-2">
                    <p className="text-slate-500 text-[11px] font-medium">팀원 추가 (이름으로 검색)</p>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        value={selectedProfile ? `${selectedProfile.display_name ?? ''} (${selectedProfile.email})` : searchQuery}
                        onChange={e => {
                          setSelectedProfile(null)
                          setSearchQuery(e.target.value)
                          setShowSearch(true)
                        }}
                        onFocus={() => setShowSearch(true)}
                        placeholder="사용자 이름 또는 이메일"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={!!selectedProfile}
                      />
                      {selectedProfile && (
                        <button onClick={() => { setSelectedProfile(null); setSearchQuery('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {showSearch && !selectedProfile && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-52 overflow-y-auto z-30">
                          {searchResults.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedProfile(p); setShowSearch(false); setSearchQuery('') }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700/60 transition border-b border-slate-700/50 last:border-b-0"
                            >
                              <div className="text-xs text-slate-200">{p.display_name || '(이름 없음)'}</div>
                              <div className="text-[10px] text-slate-500">{p.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showSearch && !selectedProfile && searchQuery.trim() && searchResults.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-[10px] z-30 space-y-1">
                          <p className="text-slate-400">일치 사용자 없음</p>
                          <p className="text-slate-500 leading-relaxed">
                            상대방이 <a href="/signup" target="_blank" className="text-indigo-400 underline">/signup</a>에서 먼저 가입 필요<br />
                            또는 migration_all.sql 실행 필요
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={newPart}
                        onChange={e => setNewPart(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addMember()}
                        placeholder="담당 파트 (예: 종합안내)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={addMember} disabled={!selectedProfile} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm transition">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-600 text-[10px]">동명이인 방지를 위해 이름 옆에 이메일이 함께 표시됩니다</p>
                  </div>
                </div>
              )}

              {/* Step 3: 제작물 선택 (사용 목적 제거로 단계 번호 변경) */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">제작물 종류를 선택하세요. <strong className="text-slate-200">이름 변경/규격 수정/추가</strong> 모두 가능합니다.</p>

                  {/* 시안 업로드 — 일괄 or 품목별 */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-300 text-xs font-medium">시안 이미지 업로드 <span className="text-slate-600 font-normal">— 선택 사항</span></p>
                      <span className="text-slate-600 text-[10px]">업로드 시 캔버스 배경으로 자동 표시</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 일괄 업로드 */}
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">일괄 — 모든 환경장식물에 동일 적용</p>
                        {batchMockup ? (
                          <div className="relative">
                            <img src={batchMockup.preview} alt="" className="w-full h-16 object-cover rounded border border-slate-700" />
                            <button type="button" onClick={() => setBatchMockup(null)} className="absolute top-1 right-1 bg-slate-900/80 text-slate-400 hover:text-white p-0.5 rounded transition"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 border border-dashed border-slate-700 hover:border-slate-600 rounded-lg h-16 cursor-pointer hover:bg-slate-800/30 transition">
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0]; if (!f) return
                              const reader = new FileReader()
                              reader.onload = ev => setBatchMockup({ file: f, preview: ev.target?.result as string })
                              reader.readAsDataURL(f); e.target.value = ''
                            }} />
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                            <span className="text-slate-600 text-[10px]">공통 시안 클릭 업로드</span>
                          </label>
                        )}
                      </div>
                      {/* 품목별 안내 */}
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">품목별 — 환경장식물마다 다른 시안</p>
                        <div className="border border-dashed border-slate-800 rounded-lg h-16 flex flex-col items-center justify-center px-2">
                          <ImageIcon className="w-3 h-3 text-slate-700 mb-0.5" />
                          <span className="text-slate-700 text-[9px] text-center leading-tight">
                            아래 표에서 각 행 우측 끝<br/>
                            <ImageIcon className="w-2.5 h-2.5 inline mx-0.5 text-slate-500" />
                            아이콘 클릭
                          </span>
                        </div>
                      </div>
                    </div>
                    {Object.keys(formatMockups).length > 0 && (
                      <p className="text-violet-400 text-[10px]">✓ {Object.keys(formatMockups).length}개 품목에 개별 시안 설정됨 (일괄 시안보다 우선)</p>
                    )}
                    {/* 우선순위 안내 */}
                    <p className="text-slate-600 text-[9px] mt-1">
                      💡 일괄 + 품목별 모두 업로드 시: 품목별 시안이 그 종류에만 적용되고, 나머지는 일괄 시안 적용
                    </p>
                  </div>

                  {/* 엑셀 불러온 목록 미리보기 */}
                  {excelRows.length > 0 && (
                    <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 overflow-hidden">
                      <div className="px-3 py-2 flex items-center justify-between border-b border-emerald-800/40">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 text-xs font-medium">엑셀에서 불러온 목록 ({excelRows.length}건)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setExcelFile(null); setExcelRows([]); setExcelError(null) }}
                          className="text-slate-500 hover:text-rose-400 text-[10px] transition"
                        >
                          제거
                        </button>
                      </div>
                      <div className="max-h-48 overflow-auto divide-y divide-emerald-900/30 text-xs">
                        {excelRows.slice(0, 30).map((r, i) => {
                          const sizeMatch = (r.size || '').match(/(\d+)\s*[\*x×]\s*(\d+)/)
                          return (
                            <div key={i} className="px-3 py-1.5 grid grid-cols-[24px_1fr_90px_60px_30px] gap-2 items-center">
                              <span className="text-emerald-600">{r.no || String(i + 1).padStart(2, '0')}</span>
                              <span className="text-slate-200 truncate">{r.category || '—'}</span>
                              <span className="text-slate-500 text-[10px]">
                                {sizeMatch ? `${sizeMatch[1]}×${sizeMatch[2]}mm` : (r.size || '—')}
                              </span>
                              <span className="text-slate-500 text-[10px] truncate">{r.material || '—'}</span>
                              <span className="text-slate-400 text-center">{r.quantity || 1}</span>
                            </div>
                          )
                        })}
                        {excelRows.length > 30 && (
                          <div className="px-3 py-1.5 text-slate-600 text-[10px]">… +{excelRows.length - 30}건 더</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 명세 7P 2번 — 이력 기반 선택률 표시 (30~100건 단계에서 의미) */}
                  {(() => {
                    const liveProjects = liveStats?.liveAsPerfList.map(p => ({
                      venue: p.venue,
                      client: p.client,
                      categories: [], // categoryFrequency는 전체 합산이라 per-event 매칭 어려움 → 기본 빈 배열
                    })) ?? []
                    const rates = getSelectionRates({
                      venue: info.event_venue,
                      client: info.client_name,
                      eventCategory: null,
                      liveProjects,
                    })
                    const top = rates[0]
                    if (!top || top.confidence === 'none') return null
                    const confLabel = { high: '높음', medium: '보통', low: '낮음', none: '부족' }[top.confidence]
                    return (
                      <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-2.5 mb-2">
                        <p className="text-indigo-300 text-[11px] font-medium">
                          📊 유사 행사 <strong>{top.totalEvents}건</strong> 분석 → 환경장식물 선택률 (신뢰도 {confLabel})
                        </p>
                        <p className="text-indigo-500/70 text-[10px] mt-0.5">
                          아래 표에서 각 종류 옆 % 표시는 매칭 행사 중 사용 빈도 (예: "X-배너 87%" = 100건 중 87건 선택)
                        </p>
                      </div>
                    )
                  })()}

                  <div className="grid grid-cols-[20px_1fr_60px_110px_70px_40px_44px_24px] gap-2 px-3 text-[10px] text-slate-500 uppercase tracking-wide">
                    <span></span>
                    <span>종류명 (편집 가능)</span>
                    <span className="text-center">선택률</span>
                    <span className="text-center">규격 (mm)</span>
                    <span className="text-center">재질</span>
                    <span className="text-center">개수</span>
                    <span className="text-center">시안</span>
                    <span></span>
                  </div>

                  <div className="space-y-1">
                    {FORMAT_PRESETS.map(f => {
                      const s = formats[f.id]
                      const ratio = s.width / (s.height || 1)
                      const layoutTag = ratio > 1.5 ? '가로' : ratio < 0.8 ? '세로' : '정사각'
                      const fm = formatMockups[f.id]
                      // 선택률 매칭 (정규화된 이름 기준)
                      const liveProjects = liveStats?.liveAsPerfList.map(p => ({
                        venue: p.venue, client: p.client, categories: [],
                      })) ?? []
                      const rates = getSelectionRates({
                        venue: info.event_venue,
                        client: info.client_name,
                        liveProjects,
                      })
                      const rate = rates.find(r => r.category === s.name || s.name.includes(r.category) || r.category.includes(s.name))
                      return (
                        <div key={f.id} className={`grid grid-cols-[20px_1fr_60px_110px_70px_40px_44px_24px] gap-2 items-center px-3 py-1.5 rounded-lg transition ${s.selected ? 'bg-indigo-950/50 border border-indigo-700/40' : 'bg-slate-800/40 hover:bg-slate-800/70 border border-transparent'}`}>
                          <button onClick={() => toggleFormat(f.id)} className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition ${s.selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                            {s.selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[8px] px-1 py-0.5 rounded flex-shrink-0 ${layoutTag === '세로' ? 'bg-violet-900/50 text-violet-400' : layoutTag === '가로' ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>{layoutTag}</span>
                            <input
                              type="text"
                              value={s.name}
                              onChange={e => renameFormat(f.id, e.target.value)}
                              className={`bg-transparent text-sm font-medium px-1 py-0.5 rounded focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0 flex-1 ${s.selected ? 'text-slate-100' : 'text-slate-400'}`}
                            />
                            {/* 인라인 설명 — 마우스 hover/tap 시 표시 (명세 명시: "X배너는...") */}
                            {FORMAT_DESCRIPTIONS[f.id] && (
                              <span
                                className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 hover:bg-indigo-700 hover:text-indigo-200 text-[9px] flex items-center justify-center cursor-help transition"
                                title={`📍 ${FORMAT_DESCRIPTIONS[f.id].purpose}\n\n${FORMAT_DESCRIPTIONS[f.id].usage}`}
                              >
                                ?
                              </span>
                            )}
                          </div>
                          {/* 선택률 % 배지 */}
                          <div className="text-center">
                            {rate && rate.confidence !== 'none' && rate.totalEvents >= 3 ? (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                                  rate.ratePercent >= 70 ? 'bg-emerald-900/50 text-emerald-300' :
                                  rate.ratePercent >= 40 ? 'bg-amber-900/50 text-amber-300' :
                                  rate.ratePercent >= 10 ? 'bg-slate-800 text-slate-400' :
                                  'bg-slate-900 text-slate-600'
                                }`}
                                title={`${rate.totalEvents}건 중 ${rate.selectedCount}건 선택 (신뢰도: ${rate.confidence})`}
                              >
                                {rate.ratePercent}%
                              </span>
                            ) : (
                              <span className="text-slate-700 text-[9px]">—</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <input type="number" value={s.width} disabled={!s.selected} onChange={e => updateFormat(f.id, 'width', e.target.value)} className={`${smallInputCls} w-[44px] text-center`} />
                            <span className="text-slate-600 text-[10px]">×</span>
                            <input type="number" value={s.height} disabled={!s.selected} onChange={e => updateFormat(f.id, 'height', e.target.value)} className={`${smallInputCls} w-[44px] text-center`} />
                          </div>
                          <input type="text" value={s.material} disabled={!s.selected} onChange={e => updateFormat(f.id, 'material', e.target.value)} className={smallInputCls} />
                          <input type="number" min={1} max={20} value={s.count} disabled={!s.selected} onChange={e => updateFormat(f.id, 'count', e.target.value)} className={`${smallInputCls} text-center`} />
                          {/* 품목별 시안 */}
                          <label className={`flex items-center justify-center rounded cursor-pointer transition overflow-hidden ${!s.selected ? 'opacity-30 pointer-events-none' : ''}`} title="품목 시안 업로드">
                            <input type="file" accept="image/*" className="hidden" disabled={!s.selected} onChange={e => {
                              const file = e.target.files?.[0]; if (!file) return
                              const reader = new FileReader()
                              reader.onload = ev => setFormatMockups(prev => ({ ...prev, [f.id]: { file, preview: ev.target?.result as string } }))
                              reader.readAsDataURL(file); e.target.value = ''
                            }} />
                            {fm ? (
                              <img src={fm.preview} alt="" className="w-10 h-10 object-cover rounded border border-violet-600/50" title={fm.file.name} />
                            ) : (
                              <div className="w-10 h-10 border border-dashed border-slate-700 rounded flex items-center justify-center hover:border-slate-500 transition">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                            )}
                          </label>
                          <span></span>
                        </div>
                      )
                    })}

                    {/* 사용자 커스텀 양식 */}
                    {customFormats.map(cf => (
                      <div key={cf.id} className={`grid grid-cols-[20px_1fr_60px_110px_70px_40px_44px_24px] gap-2 items-center px-3 py-1.5 rounded-lg transition ${cf.selected ? 'bg-emerald-950/40 border border-emerald-700/40' : 'bg-slate-800/40 border border-transparent'}`}>
                        <button onClick={() => updateCustomFormat(cf.id, { selected: !cf.selected })} className={`w-4 h-4 rounded flex items-center justify-center border transition ${cf.selected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'}`}>
                          {cf.selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <input
                          type="text"
                          value={cf.name}
                          onChange={e => updateCustomFormat(cf.id, { name: e.target.value })}
                          placeholder="제작물 종류명"
                          className={`bg-transparent text-sm font-medium px-1 py-0.5 rounded focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${cf.selected ? 'text-slate-100' : 'text-slate-400'}`}
                        />
                        {/* 선택률 placeholder (커스텀은 데이터 없음) */}
                        <span className="text-center text-slate-700 text-[9px]">—</span>
                        <div className="flex items-center gap-1">
                          <input type="number" value={cf.width} onChange={e => updateCustomFormat(cf.id, { width: parseInt(e.target.value) || 0 })} className={`${smallInputCls} w-[44px] text-center`} />
                          <span className="text-slate-600 text-[10px]">×</span>
                          <input type="number" value={cf.height} onChange={e => updateCustomFormat(cf.id, { height: parseInt(e.target.value) || 0 })} className={`${smallInputCls} w-[44px] text-center`} />
                        </div>
                        <input type="text" value={cf.material} onChange={e => updateCustomFormat(cf.id, { material: e.target.value })} placeholder="재질" className={smallInputCls} />
                        <input type="number" min={1} max={20} value={cf.count} onChange={e => updateCustomFormat(cf.id, { count: parseInt(e.target.value) || 1 })} className={`${smallInputCls} text-center`} />
                        {/* 시안 placeholder (커스텀은 일괄 시안만 적용) */}
                        <span className="text-center text-slate-700 text-[9px]">—</span>
                        <button onClick={() => removeCustomFormat(cf.id)} className="text-slate-600 hover:text-red-400 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addCustomFormat}
                    className="w-full flex items-center justify-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs py-2 rounded-lg border border-dashed border-emerald-800/60 hover:border-emerald-700 hover:bg-emerald-900/10 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    제작물 종류 직접 추가 (목록에 없는 것)
                  </button>

                  {/* 누락 항목 자동 알림 (명세 + 회의록 명시 — "동선 배너 빠졌어요") */}
                  {(() => {
                    const liveProjects = liveStats?.liveAsPerfList.map(p => ({
                      venue: p.venue, client: p.client, categories: [],
                    })) ?? []
                    const rates = getSelectionRates({
                      venue: info.event_venue,
                      client: info.client_name,
                      liveProjects,
                    })
                    // 선택률 50%+ 인데 사용자가 선택 안 한 항목
                    const missing = rates.filter(r => {
                      if (r.confidence === 'none' || r.totalEvents < 3) return false
                      if (r.ratePercent < 50) return false
                      // 매칭되는 format이 selected인지 확인
                      const matchedFormat = FORMAT_PRESETS.find(f =>
                        f.name === r.category || f.name.includes(r.category) || r.category.includes(f.name)
                      )
                      if (matchedFormat && formats[matchedFormat.id]?.selected) return false
                      return true
                    })
                    if (missing.length === 0) return null

                    return (
                      <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 space-y-1.5">
                        <p className="text-amber-300 text-[11px] font-medium">
                          ⚠️ 비슷한 행사에서 자주 사용된 항목인데 선택 안 됐어요
                        </p>
                        <div className="space-y-1">
                          {missing.slice(0, 5).map(r => {
                            const matchedFormat = FORMAT_PRESETS.find(f =>
                              f.name === r.category || f.name.includes(r.category) || r.category.includes(f.name)
                            )
                            return (
                              <div key={r.category} className="flex items-center justify-between text-[10px]">
                                <span className="text-amber-200/90">
                                  <strong>{r.category}</strong> — 매칭 {r.totalEvents}건 중 <span className="font-mono text-amber-300">{r.ratePercent}%</span> 선택
                                </span>
                                {matchedFormat && (
                                  <button
                                    type="button"
                                    onClick={() => toggleFormat(matchedFormat.id)}
                                    className="text-amber-300 hover:text-amber-100 underline text-[10px]"
                                  >
                                    추가
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {(selectedCount > 0 || excelRows.length > 0) && (
                    <p className="text-indigo-400 text-xs px-1">
                      총 {excelRows.length + totalItemCount}개 제작물이 생성됩니다
                      {excelRows.length > 0 && <span className="text-emerald-500 ml-1">(엑셀 {excelRows.length}건 포함)</span>}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 flex-shrink-0 border-t border-slate-800 space-y-3">
              {error && <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2.5 rounded-lg transition">
                    <ChevronLeft className="w-4 h-4" /> 이전
                  </button>
                ) : (
                  <button type="button" onClick={handleClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2.5 rounded-lg transition">취소</button>
                )}

                {step < 3 ? (
                  <button type="button" disabled={step === 1 && !info.name.trim()} onClick={() => setStep(step + 1)} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition">
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" disabled={isLoading} onClick={handleCreate} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? '생성 중...' : (excelRows.length + selectedCount) > 0 ? `프로젝트 만들기 (${excelRows.length + totalItemCount}개 제작물)` : '프로젝트 만들기'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* v4.1 단위 3: 신규 행사장 등록 요청 모달 */}
      <VenueRequestModal
        open={venueRequestOpen}
        onClose={() => setVenueRequestOpen(false)}
        userId={userId}
        initialName={info.event_venue}
        onSubmitted={(_id, name) => {
          setPendingVenueNames(prev => prev.includes(name) ? prev : [...prev, name])
          setInfo(p => ({ ...p, event_venue: name }))
        }}
      />
    </>
  )
}
