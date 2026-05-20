'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save, LayoutGrid, Users, Settings2, Palette, Search, X, ImagePlus, Loader2, Sparkles, Building2, Wand2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_SLOTS } from '@/lib/types'
import { STYLE_PRESETS } from '@/lib/constants'
import type { Project, ProjectMember, ProjectStatus, ProjectStage, SlotStyle, Profile, OrgLogoAsset } from '@/lib/types'
import { PROGRAM_PARTS, PROGRAM_PART_GROUPS, PROGRAM_PART_BY_CODE, PROGRAM_PART_SIGNAGE_HINTS } from '@/lib/programParts'
import { SEED_SIGNAGE_TYPES } from '@/lib/data/dashboardSeed'
import { VENUE_LIST, groupVenuesByRegion } from '@/lib/venueIntel'

interface Props {
  project: Project
  members: ProjectMember[]
  isOwner: boolean
  userEmail: string
}

const STATUS_OPTIONS: ProjectStatus[] = ['준비중', '진행중', '완료']
const STAGE_OPTIONS: { value: ProjectStage; label: string; color: string; desc: string }[] = [
  { value: '의뢰서작성', label: '의뢰서 작성', color: 'border-slate-500 text-slate-400',    desc: '제작물 목록 작성 중' },
  { value: '발주완료',   label: '발주 완료',   color: 'border-blue-500 text-blue-400',     desc: '디자인 업체에 발주됨' },
  { value: '시안검수',   label: '시안 검수',   color: 'border-violet-500 text-violet-400', desc: '초안 확인 중' },
  { value: '수정중',     label: '수정 중',     color: 'border-amber-500 text-amber-400',   desc: '수정 요청 반영 중' },
  { value: '확정',       label: '확정',         color: 'border-emerald-500 text-emerald-400', desc: '최종 시안 확정' },
  { value: '납품완료',   label: '납품 완료',   color: 'border-slate-400 text-slate-700',   desc: '파일 납품 완료' },
]
const ALIGN_OPTIONS: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right']
const FONT_OPTIONS = [
  // ── 로컬 폰트 (사용자 제공) ─────────────
  'Pretendard',              // 로컬 TTF 9단계 굵기 (Thin~Black)
  'HG꼬딕씨',                 // HGG Gothic (6단계)

  // ── 한글 고딕 ─────────────────────────────
  'Malgun Gothic',           // 윈도우 기본 고딕
  'Apple SD Gothic Neo',     // 맥 기본 고딕
  'Pretendard',              // 모던 한영 통합 (무료)
  'Noto Sans KR',            // 구글 한글 (무료)
  'Nanum Gothic',            // 네이버 고딕
  'Nanum Square',            // 네이버 스퀘어
  'Nanum Square Round',      // 네이버 스퀘어 라운드
  'Spoqa Han Sans Neo',      // 스포카 산스 네오
  'IBM Plex Sans KR',        // IBM 플렉스 한글
  'S-Core Dream',            // 에스코어 드림
  'Gmarket Sans',            // 지마켓 산스
  'Black Han Sans',          // 블랙 한 산스 (굵은 제목용)
  'Jua',                     // 주아 (귀여운 제목용)
  'Do Hyeon',                // 도현 (굵은 제목용)
  'Sunflower',               // 선플라워

  // ── 한글 명조/세리프 ─────────────────────
  'Batang',                  // 윈도우 기본 명조
  'Nanum Myeongjo',          // 나눔명조
  'Noto Serif KR',           // 구글 한글 세리프
  'Gowun Dodum',             // 고운돋움
  'Gowun Batang',            // 고운바탕

  // ── 손글씨·장식 ──────────────────────────
  'Nanum Pen Script',        // 나눔펜
  'Nanum Brush Script',      // 나눔붓
  'Gaegu',                   // 개구 (손글씨)
  'Hi Melody',               // 하이멜로디
  'Single Day',              // 싱글데이

  // ── 영문 산세리프 ─────────────────────────
  'Inter',
  'Helvetica',
  'Arial',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Oswald',                  // 컨덴스드 굵은
  'Bebas Neue',              // 인상적 제목용

  // ── 영문 세리프 ──────────────────────────
  'Times New Roman',
  'Georgia',
  'Playfair Display',
  'Merriweather',
  'Lora',

  // ── 모노스페이스 ─────────────────────────
  'Courier New',
  'Consolas',
  'JetBrains Mono',
  'D2Coding',
]
// 36 색상 팔레트 — 모노/브랜드/웜/쿨/파스텔 등 다양한 양식 커버
const PRESET_COLORS = [
  // 모노톤
  'FFFFFF', 'F1F5F9', 'CBD5E1', '94A3B8', '475569', '1E293B', '0F172A', '000000',
  // 레드/핑크
  'FEE2E2', 'FCA5A5', 'EF4444', 'DC2626', '991B1B', 'EC4899', 'BE185D', 'F9A8D4',
  // 오렌지/옐로우
  'FED7AA', 'FB923C', 'F97316', 'EA580C', 'FEF3C7', 'FDE047', 'F59E0B', 'B45309',
  // 그린
  'D1FAE5', '6EE7B7', '10B981', '059669', '065F46', 'A7F3D0', '86EFAC', '22C55E',
  // 블루/인디고/퍼플
  'DBEAFE', '60A5FA', '2563EB', '1E40AF', '6366F1', 'A855F7', '7C3AED', '4338CA',
]

const INPUT_CLS = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition'
const LABEL_CLS = 'block text-slate-400 text-xs mb-1.5'

export function ProjectInfoClient({ project, members: initialMembers, isOwner, userEmail }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── 프로젝트 정보 ───────────────────────────────────────
  const [name, setName] = useState(project.name)
  const [clientName, setClientName] = useState(project.client_name ?? '')
  // 5/22 사용자 명시 = 협력사 필드 = 향후 회의에서 빠지기로 한 영역·제거
  const [eventDate, setEventDate] = useState(project.event_date ?? '')
  const [eventVenue, setEventVenue] = useState(project.event_venue ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [stage, setStage] = useState<ProjectStage>(project.stage ?? '의뢰서작성')
  const [programParts, setProgramParts] = useState<Set<string>>(
    new Set(project.program_parts ?? [])
  )
  // 5/22 사용자 명시 = 추가/제거 영역 = 환경장식물 재설정 영역 (initialParts 영역 보존)
  const [initialParts] = useState<Set<string>>(new Set(project.program_parts ?? []))
  const [attendeesCount, setAttendeesCount] = useState(
    project.attendees_count ? String(project.attendees_count) : ''
  )
  const [isSavingInfo, setIsSavingInfo] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  const toggleProgramPart = (code: string) => {
    setProgramParts(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSaveInfo = async () => {
    setIsSavingInfo(true)
    // 5/22 사용자 명시 = 프로그램 파트 추가/제거 = 환경장식물 재설정 알랏 + 예 클릭 시 진행
    const addedParts = Array.from(programParts).filter(p => !initialParts.has(p))
    const removedParts = Array.from(initialParts).filter(p => !programParts.has(p))
    let addRecommend = false
    let removeItems = false
    if (addedParts.length > 0) {
      const addedNames = addedParts.map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c).join('·')
      addRecommend = confirm(`프로그램 파트 추가: ${addedNames}\n\n해당 파트의 환경장식물을 재설정하여 추가 제공할까요?`)
    }
    if (removedParts.length > 0) {
      const removedNames = removedParts.map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c).join('·')
      removeItems = confirm(`프로그램 파트 제거: ${removedNames}\n\n해당 파트의 환경장식물 행을 삭제할까요?`)
    }
    const updatePayload: Record<string, unknown> = {
      name: name.trim() || project.name,
      client_name: clientName.trim() || null,
      event_date: eventDate || null,
      event_venue: eventVenue.trim() || null,
      status,
      stage,
      program_parts: Array.from(programParts),
      attendees_count: attendeesCount ? parseInt(attendeesCount) : null,
    }
    const { error } = await supabase.from('projects').update(updatePayload).eq('id', project.id)
    // 5/22 = 추가/제거 영역 처리
    // 5/22 사용자 명시 = 저장 X 문제 영역 정정 = INSERT/DELETE 영역 await 완전 보장
    let insertCount = 0
    let deleteCount = 0
    if (addRecommend && addedParts.length > 0) {
      // PR#1 단위 6 (δ 정책): 정적 HINTS 대신 recommendSignage() 호출.
      //   신규 파트만 input.programParts에 포함하여 AI가 권장 환경장식물 추천.
      //   응답 중 기존 design_items.category에 없는 것만 INSERT (덮어쓰기 금지).
      //   AI 호출 실패 → 정적 HINTS fallback (기존 동작 보존).
      const { data: existing } = await supabase.from('design_items').select('no, category').eq('project_id', project.id)
      const existingNos = (existing ?? []).map(r => parseInt((r.no as string) || '0', 10) || 0)
      const startNo = existingNos.length > 0 ? Math.max(...existingNos) + 1 : 1
      const existingCats = new Set((existing ?? []).map(r => r.category as string))

      interface RecItem { category: string; width_mm: number; height_mm: number; material: string; program_part?: string | null; program_part_name?: string | null; quantity: number; location?: string; purpose?: string }
      let toInsert: Array<Record<string, unknown>> = []
      try {
        const recRes = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            eventName: project.name,
            venue: project.event_venue ?? '미정',
            programParts: addedParts,
            purposes: [],
            attendeesCount: attendeesCount ? parseInt(attendeesCount) : undefined,
            clientName: project.client_name ?? undefined,
          } satisfies Partial<import('@/lib/ai/recommendSignage').RecommendInput>),
        })
        if (recRes.ok) {
          const rec = (await recRes.json()) as { items?: RecItem[] }
          // PR#4 단위 3: AI INSERT 시 ai_initial_* + normalizeCategory 통합
          const { normalizeCategory } = await import('@/lib/services/normalizeCategory')
          toInsert = await Promise.all(
            (rec.items ?? [])
              .filter(it => !existingCats.has(it.category))
              .map(async (it, idx) => {
                const norm = await normalizeCategory(supabase, it.category)
                return {
                  project_id: project.id,
                  no: String(startNo + idx).padStart(2, '0'),
                  category: it.category,
                  material: it.material ?? '인쇄',
                  width_mm: it.width_mm ?? 600,
                  height_mm: it.height_mm ?? 1800,
                  quantity: it.quantity ?? 1,
                  location: it.location ?? null,
                  purpose: it.purpose ?? null,
                  program_part: it.program_part ?? null,
                  part: it.program_part_name ?? addedParts.map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c).join('·'),
                  // PR#4: AI 정확도 측정 + 정규화 결과
                  created_by_ai: true,
                  ai_initial_category: it.category,
                  ai_initial_quantity: it.quantity ?? 1,
                  ai_initial_width_mm: it.width_mm ?? 600,
                  ai_initial_height_mm: it.height_mm ?? 1800,
                  category_normalized: norm.normalized,
                  category_normalize_status: norm.status,
                }
              }),
          )
        }
      } catch (e) {
        console.warn('[ProjectInfo] recommendSignage 호출 실패 — 정적 HINTS fallback:', e)
      }

      // AI 실패·결과 0건 시 정적 HINTS fallback (기존 동작)
      if (toInsert.length === 0) {
        const newIds = new Set<string>()
        for (const code of addedParts) {
          for (const id of PROGRAM_PART_SIGNAGE_HINTS[code] ?? []) newIds.add(id)
        }
        toInsert = Array.from(newIds)
          .filter(id => !existingCats.has(id))
          .map((id, idx) => {
            const type = SEED_SIGNAGE_TYPES.find(t => t.id === id)
            return {
              project_id: project.id,
              no: String(startNo + idx).padStart(2, '0'),
              category: id,
              material: type?.default_material ?? '인쇄',
              width_mm: type?.width_mm ?? 600,
              height_mm: type?.height_mm ?? 1800,
              quantity: 1,
              program_part: addedParts.find(c => (PROGRAM_PART_SIGNAGE_HINTS[c] ?? []).includes(id)) ?? null,
              part: addedParts.map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c).join('·'),
            }
          })
      }

      if (toInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { error: insertErr } = await supabase.from('design_items').insert(toInsert as any)
        if (insertErr && /program_part|column/i.test(insertErr.message)) {
          const fallback = toInsert.map(item => {
            const { program_part: _unused, ...rest } = item
            void _unused
            return rest
          })
          const retry = await supabase.from('design_items').insert(fallback)
          insertErr = retry.error
        }
        if (insertErr) {
          alert('환경장식물 추가 실패: ' + insertErr.message + '\n(권한·DB 마이그레이션 영역 확인 의무)')
          setIsSavingInfo(false)
          return
        }
        insertCount = toInsert.length
      }
    }
    if (removeItems && removedParts.length > 0) {
      // 제거 파트 영역 = design_items 영역 DELETE (program_part 매칭)
      const { error: delErr, count } = await supabase.from('design_items').delete({ count: 'exact' }).eq('project_id', project.id).in('program_part', removedParts)
      if (delErr) {
        alert('환경장식물 삭제 실패: ' + delErr.message)
        setIsSavingInfo(false)
        return
      }
      deleteCount = count ?? 0
    }
    // program_parts 컬럼 미적용(마이그레이션 v6 미실행) 시 기본 필드만 재시도
    if (error && /program_parts|attendees_count/i.test(error.message)) {
      await supabase.from('projects').update({
        name: updatePayload.name,
        client_name: updatePayload.client_name,
        event_date: updatePayload.event_date,
        event_venue: updatePayload.event_venue,
        status: updatePayload.status,
        stage: updatePayload.stage,
      }).eq('id', project.id)
    }
    setIsSavingInfo(false)
    setInfoSaved(true)
    // 5/22 사용자 명시 = INSERT/DELETE 완료 후 = 즉시 편집 창 복귀 (setTimeout X·저장 보장)
    // 알림 메시지 + 즉시 이동 (1.5초 대기 시 INSERT 영역 race 영역 가능성 영역 회피)
    const msg = (insertCount > 0 ? `프로그램 파트 추가로 환경장식물 ${insertCount}개가 자동 추가되었습니다·` : '') + (deleteCount > 0 ? `${deleteCount}개 삭제·` : '') + '저장 완료'
    if (insertCount > 0 || deleteCount > 0) alert(msg)
    router.push(`/projects/${project.id}`)
  }

  // ── 멤버 관리 ────────────────────────────────────────────
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [newPart, setNewPart] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [addError, setAddError] = useState('')

  // 이름 검색 (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const q = searchQuery.trim()
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10)
      setSearchResults((data ?? []) as Profile[])
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery, supabase])

  const handleAddMember = async () => {
    if (!selectedProfile) {
      setAddError('목록에서 사용자를 선택하세요.')
      return
    }
    // 5/20 노션 §7 정합 = 본인 초대 차단 (소유자 = 자동 멤버·중복 차단)
    if (selectedProfile.email === userEmail) {
      setAddError('본인은 이미 프로젝트 소유자입니다.')
      return
    }
    if (members.some(m => m.user_email === selectedProfile.email)) {
      setAddError('이미 초대된 사용자입니다.')
      return
    }
    setIsAddingMember(true)
    setAddError('')

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_email: selectedProfile.email,
        part_name: newPart.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setAddError('초대 실패: ' + error.message)
    } else if (data) {
      setMembers(prev => [...prev, data as ProjectMember])
      setSelectedProfile(null)
      setSearchQuery('')
      setNewPart('')
      setShowSearch(false)
    }
    setIsAddingMember(false)
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (memberEmail === userEmail) return
    setMembers(prev => prev.filter(m => m.id !== memberId))
    await supabase.from('project_members').delete().eq('id', memberId)
  }

  // ── 마스터 시안 업로드 ───────────────────────────────────
  const [masterImageUrl, setMasterImageUrl] = useState(project.master_image_url ?? '')
  const [isUploadingMaster, setIsUploadingMaster] = useState(false)
  const masterFileRef = useRef<HTMLInputElement>(null)

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingMaster(true)
    try {
      const { compressToWebP } = await import('@/lib/services/imageUtils')
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const blob = await compressToWebP(file)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const path = buildStoragePath('master', { userId: user.id, projectId: project.id })
      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
      if (uploadError) { alert(explainStorageError(uploadError.message || '')); throw uploadError }
      const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)
      const urlWithTs = `${publicUrl}?t=${Date.now()}`

      await supabase.from('projects').update({ master_image_url: urlWithTs }).eq('id', project.id)
      setMasterImageUrl(urlWithTs)
    } catch (err) {
      console.error('master upload failed', err)
    } finally {
      setIsUploadingMaster(false)
      if (masterFileRef.current) masterFileRef.current.value = ''
    }
  }

  // ── AI 슬롯 위치 자동 분석 (Gemini Vision) ──────────────
  const [analyzingLayout, setAnalyzingLayout] = useState(false)
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null)

  const handleAnalyzeLayout = async () => {
    if (!masterImageUrl) return
    setAnalyzingLayout(true)
    setAnalyzeMessage(null)
    try {
      const res = await fetch('/api/analyze-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: masterImageUrl }),
      })
      const data = await res.json()
      if (data.error) {
        setAnalyzeMessage('분석 실패: ' + data.error)
        return
      }

      // 분석 결과를 모든 제작물의 item_contents에 적용
      const { data: items } = await supabase.from('design_items').select('id').eq('project_id', project.id)
      if (items && items.length > 0) {
        const upserts = items.flatMap((item) =>
          (data.slots ?? []).map((slot: { key: string; label: string; x: number; y: number; w: number; fontSize: number }) => ({
            item_id: item.id,
            slot_key: slot.key,
            slot_value: JSON.stringify({
              label: slot.label,
              ko: '',
              en: '',
              x: slot.x,
              y: slot.y,
              w: slot.w,
              fontSize: slot.fontSize,
            }),
          }))
        )
        await supabase.from('item_contents').upsert(upserts, { onConflict: 'item_id,slot_key' })
      }
      setAnalyzeMessage(data.ai_used
        ? `✓ AI가 ${data.slots.length}개 슬롯을 자동 추출했습니다`
        : data.message ?? '기본 슬롯이 적용되었습니다')
    } catch (err) {
      setAnalyzeMessage('분석 실패: ' + String(err))
    } finally {
      setAnalyzingLayout(false)
      setTimeout(() => setAnalyzeMessage(null), 5000)
    }
  }

  // ── 슬롯 서식 (행사별 기본 양식) ────────────────────────
  const [slotStyles, setSlotStyles] = useState<Record<string, SlotStyle>>({})
  const [stylesSaved, setStylesSaved] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('slot_styles')
      .select('*')
      .eq('project_id', project.id)
      .then(({ data }) => {
        const map: Record<string, SlotStyle> = {}
        for (const row of data ?? []) {
          map[row.slot_key] = row as SlotStyle
        }
        setSlotStyles(map)
      })
  }, [supabase, project.id])

  const getStyle = (slotKey: string): SlotStyle => {
    return slotStyles[slotKey] ?? {
      project_id: project.id,
      slot_key: slotKey,
      font_face: 'Malgun Gothic',
      font_size: DEFAULT_SLOTS[slotKey]?.fontSize ?? 16,
      color: 'FFFFFF',
      align: 'center',
    }
  }

  const handleStylePatch = async (slotKey: string, patch: Partial<SlotStyle>) => {
    const current = getStyle(slotKey)
    const next = { ...current, ...patch }
    setSlotStyles(prev => ({ ...prev, [slotKey]: next }))

    await supabase.from('slot_styles').upsert({
      project_id: project.id,
      slot_key: slotKey,
      font_face: next.font_face,
      font_size: next.font_size,
      color: next.color,
      align: next.align,
      letter_spacing: next.letter_spacing ?? 0,
      master_x: next.master_x ?? null,
      master_y: next.master_y ?? null,
      master_w: next.master_w ?? null,
      padding_x: next.padding_x ?? 0,
    }, { onConflict: 'project_id,slot_key' })

    setStylesSaved(slotKey)
    setTimeout(() => setStylesSaved(null), 1500)
  }

  // 마스터 override — 해당 슬롯의 스타일·위치를 모든 제작물에 즉시 전파
  const [itemCount, setItemCount] = useState(0)
  useEffect(() => {
    supabase.from('design_items').select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .then(({ count }) => setItemCount(count ?? 0))
  }, [supabase, project.id])

  // ══════════════════════════════════════════════════════
  // handleMasterBroadcast — 행사 기본 양식 슬롯의 "🎯 마스터 전파" 버튼
  // 역할 구분 (3가지 전파 함수 중 #2):
  //   • [#1] handleApplyStyleToAll (에디터 SlotPanel) — fontSize·y만, 소스=현재 아이템
  //   • [#2] 이 함수 — slot_styles 테이블의 모든 필드(폰트·색·자간·위치) 전체 필드 일괄
  //   • [#3] setAsMaster (에디터 툴바 👑) — 같은 category만, 아이템 전체 슬롯 복제
  // 사용 시점: "PPT 슬라이드 마스터처럼 프로젝트 서식 뼈대 확정"
  // ══════════════════════════════════════════════════════
  const handleMasterBroadcast = async (slotKey: string) => {
    const confirmed = window.confirm(
      `'${DEFAULT_SLOTS[slotKey]?.label ?? slotKey}' 마스터 스타일을 이 프로젝트의 ${itemCount}개 제작물에 즉시 반영합니다.\n\n` +
      `적용 항목: 폰트, 글자 크기, 색상, 정렬, 자간, 상대 위치(x/y), 너비.\n` +
      `텍스트 내용(국문/영문)은 그대로 유지됩니다.\n\n계속하시겠습니까?`
    )
    if (!confirmed) return

    const style = getStyle(slotKey)

    const { data: items } = await supabase
      .from('design_items')
      .select('id')
      .eq('project_id', project.id)
    if (!items || items.length === 0) return

    const itemIds = items.map(i => i.id)
    const { data: existing } = await supabase
      .from('item_contents')
      .select('item_id, slot_value')
      .in('item_id', itemIds)
      .eq('slot_key', slotKey)

    // 기존 slot이 없는 아이템엔 새로 생성
    const existingItemIds = new Set((existing ?? []).map(e => e.item_id))
    const missingItems = itemIds.filter(id => !existingItemIds.has(id))

    const upserts: Array<{ item_id: string; slot_key: string; slot_value: string }> = []

    // 기존 slot 덮어쓰기 — ko/en/images만 보존, 나머지 전부 마스터
    for (const row of existing ?? []) {
      let slot: any = {}
      try { slot = JSON.parse(row.slot_value ?? '{}') } catch {}

      const merged = {
        label: slot.label ?? DEFAULT_SLOTS[slotKey]?.label ?? slotKey,
        ko: slot.ko ?? '',
        en: slot.en ?? '',
        images: slot.images,
        fontSize: style.font_size,
        color: style.color,
        fontFace: style.font_face,
        align: style.align,
        x: style.master_x ?? slot.x ?? DEFAULT_SLOTS[slotKey]?.x ?? 50,
        y: style.master_y ?? slot.y ?? DEFAULT_SLOTS[slotKey]?.y ?? 50,
        w: style.master_w ?? slot.w ?? DEFAULT_SLOTS[slotKey]?.w ?? 70,
      }
      upserts.push({
        item_id: row.item_id,
        slot_key: slotKey,
        slot_value: JSON.stringify(merged),
      })
    }

    // 누락 아이템 — 기본값으로 신규 생성
    const defaults = DEFAULT_SLOTS[slotKey]
    for (const id of missingItems) {
      upserts.push({
        item_id: id,
        slot_key: slotKey,
        slot_value: JSON.stringify({
          label: defaults?.label ?? slotKey,
          ko: '', en: '',
          fontSize: style.font_size,
          color: style.color,
          fontFace: style.font_face,
          align: style.align,
          x: style.master_x ?? defaults?.x ?? 50,
          y: style.master_y ?? defaults?.y ?? 50,
          w: style.master_w ?? defaults?.w ?? 70,
        }),
      })
    }

    await supabase.from('item_contents').upsert(upserts, { onConflict: 'item_id,slot_key' })
    setStylesSaved(slotKey + ':master')
    setTimeout(() => setStylesSaved(null), 3000)
  }

  // 명세 7-2: 텍스트만 / 서식만 / 전부 일괄 적용
  // 기준값: 가장 최근에 편집된 아이템의 slot 데이터
  const handleApplyToAll = async (slotKey: string, mode: 'text' | 'style' | 'both') => {
    const style = getStyle(slotKey)

    const { data: items } = await supabase
      .from('design_items')
      .select('id, updated_at')
      .eq('project_id', project.id)
      .order('updated_at', { ascending: false })

    if (!items || items.length === 0) return

    const itemIds = items.map(i => i.id)
    const { data: existing } = await supabase
      .from('item_contents')
      .select('item_id, slot_value')
      .in('item_id', itemIds)
      .eq('slot_key', slotKey)

    if (!existing || existing.length === 0) return

    // 가장 최근 편집된 아이템(items[0])의 slot 값을 기준 텍스트로 사용
    const sourceRow = existing.find(r => r.item_id === items[0].id) ?? existing[0]
    let sourceSlot: any = {}
    try { sourceSlot = JSON.parse(sourceRow.slot_value ?? '{}') } catch {}

    const defaults = DEFAULT_SLOTS[slotKey]
    const upserts = existing.map(row => {
      let slot: any = {}
      try { slot = JSON.parse(row.slot_value ?? '{}') } catch {}

      if (mode === 'text' || mode === 'both') {
        slot.ko = sourceSlot.ko ?? ''
        slot.en = sourceSlot.en ?? ''
      }
      if (mode === 'style' || mode === 'both') {
        slot.fontSize = style.font_size
        if (defaults) {
          slot.x = defaults.x
          slot.y = defaults.y
          slot.w = defaults.w
        }
      }
      return {
        item_id: row.item_id,
        slot_key: slotKey,
        slot_value: JSON.stringify(slot),
      }
    })

    await supabase.from('item_contents').upsert(upserts, { onConflict: 'item_id,slot_key' })
    setStylesSaved(slotKey + ':applied')
    setTimeout(() => setStylesSaved(null), 1500)
  }

  const slotKeys = Object.keys(DEFAULT_SLOTS)

  // ── 스타일 프리셋 적용 — 모든 슬롯에 일괄 반영 ──────────
  const handleApplyPreset = async (presetId: string) => {
    const preset = STYLE_PRESETS.find(p => p.id === presetId)
    if (!preset) return

    const upsertRows = slotKeys.map(slotKey => ({
      project_id: project.id,
      slot_key: slotKey,
      font_face: preset.font_face,
      font_size: slotStyles[slotKey]?.font_size ?? DEFAULT_SLOTS[slotKey].fontSize,
      color: preset.text_color,
      align: slotStyles[slotKey]?.align ?? 'center',
    }))

    await supabase.from('slot_styles').upsert(upsertRows, { onConflict: 'project_id,slot_key' })

    const nextStyles: Record<string, SlotStyle> = {}
    for (const row of upsertRows) nextStyles[row.slot_key] = row as SlotStyle
    setSlotStyles(prev => ({ ...prev, ...nextStyles }))
    setStylesSaved('preset:' + presetId)
    setTimeout(() => setStylesSaved(null), 2000)
  }

  // ── 로고 자산 관리 ──────────────────────────────────────
  const [logos, setLogos] = useState<OrgLogoAsset[]>([])
  const [logoName, setLogoName] = useState('')
  const [logoCategory, setLogoCategory] = useState<OrgLogoAsset['category']>('후원')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('org_logo_asset').select('*').eq('project_id', project.id).order('created_at').then(({ data }) => {
      setLogos((data ?? []) as OrgLogoAsset[])
    })
  }, [supabase, project.id])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const name = logoName.trim()
    if (!file || !name) { setLogoName(''); return }
    setUploadingLogo(true)
    try {
      const { compressToWebP } = await import('@/lib/services/imageUtils')
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const blob = await compressToWebP(file)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const path = buildStoragePath('logo', {
        userId: user.id,
        projectId: project.id,
        suffix: `${Date.now()}-${name}`,
      })
      const { error: uploadError } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
      if (uploadError) { alert(explainStorageError(uploadError.message || '')); throw uploadError }
      const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)

      const { data: inserted } = await supabase
        .from('org_logo_asset')
        .insert({ project_id: project.id, name, category: logoCategory, image_url: publicUrl })
        .select().single()
      if (inserted) setLogos(prev => [...prev, inserted as OrgLogoAsset])
      setLogoName('')
    } catch (err) {
      console.error('logo upload failed', err)
    } finally {
      setUploadingLogo(false)
      if (logoFileRef.current) logoFileRef.current.value = ''
    }
  }

  const handleLogoDelete = async (id: string) => {
    setLogos(prev => prev.filter(l => l.id !== id))
    await supabase.from('org_logo_asset').delete().eq('id', id)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* 5/22 사용자 명시 = 뒤로 = 환경장식물 편집 창 (/projects/<id>)으로 이동·대시보드 X */}
            <Link
              href={`/projects/${project.id}`}
              className="w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition"
              title="환경장식물 편집 창으로 이동"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            </Link>
            <Link href={`/projects/${project.id}`} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              편집 창
            </Link>
            <span className="text-slate-700 text-xs">/</span>
            <span className="text-slate-700 text-xs font-medium truncate max-w-[160px]">{project.name}</span>
            <span className="text-slate-700 text-xs">/</span>
            <span className="text-slate-500 text-xs">프로젝트 정보</span>
          </div>
          {/* 5/22 사용자 명시 = ′에디터 열기′ 영역 = 삭제 (뒤로 영역 동일 영역 = 헤더 영역 충분) */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 프로젝트 정보 */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-slate-800 font-semibold text-sm">프로젝트 정보</h2>
          </div>

          <div className="space-y-4">
            {/* 기본 2열 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>프로젝트명 *</label>
                <input value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>발주처 / 주최기관</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>행사 장소</label>
                {(() => {
                  const venueGroups = groupVenuesByRegion()
                  return (
                    <select value={eventVenue} onChange={e => setEventVenue(e.target.value)} className={INPUT_CLS}>
                      <option value="">행사장 선택…</option>
                      {eventVenue && !VENUE_LIST.find(v => v.displayName === eventVenue) && (
                        <option value={eventVenue}>{eventVenue}</option>
                      )}
                      {Object.entries(venueGroups).map(([region, items]) => (
                        <optgroup key={region} label={region}>
                          {items.map((v: { displayName: string }) => (
                            <option key={v.displayName} value={v.displayName}>{v.displayName}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )
                })()}
              </div>
              <div>
                <label className={LABEL_CLS}>행사일</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>예상 참가자 수</label>
                <input type="number" min={1} value={attendeesCount} onChange={e => setAttendeesCount(e.target.value)} placeholder="예: 500" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>진행 상태</label>
                <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className={INPUT_CLS}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 프로그램 파트 (다중선택) */}
            <div>
              <label className={LABEL_CLS}>
                프로그램 파트 <span className="text-slate-300 font-normal normal-case">(다중선택 가능)</span>
              </label>
              <div className="space-y-2">
                {PROGRAM_PART_GROUPS.map(g => {
                  const items = PROGRAM_PARTS.filter(p => p.group === g.group)
                  return (
                    <div key={g.group}>
                      <p className="text-[10px] text-slate-400 mb-1">{g.label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {items.map(p => {
                          const on = programParts.has(p.code)
                          return (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => isOwner && toggleProgramPart(p.code)}
                              disabled={!isOwner}
                              title={p.hint}
                              className={`px-2 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 transition text-left disabled:cursor-not-allowed ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                            >
                              {on && <span className="text-[9px]">✓</span>}
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
                <p className="text-[10px] text-indigo-500 mt-1.5">{programParts.size}개 선택됨</p>
              )}
            </div>
          </div>

          {/* 행사 진행 단계 — 사용자 결정으로 숨김 (2026-05-11) */}

          {isOwner && (
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSaveInfo}
                disabled={isSavingInfo}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingInfo ? '저장 중...' : infoSaved ? '저장됨 ✓' : '저장'}
              </button>
            </div>
          )}
        </section>

        {/* 팀원 초대 */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-slate-800 font-semibold text-sm">팀원 초대</h2>
            <span className="ml-auto text-slate-500 text-xs">{members.length}명</span>
          </div>

          <div className="space-y-2 mb-5">
            {members.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">초대된 팀원이 없습니다</p>
            )}
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5"
              >
                <div>
                  <span className="text-slate-800 text-sm">{member.user_email}</span>
                  {member.part_name && (
                    <span className="ml-2 text-indigo-400/70 text-xs">[{member.part_name}]</span>
                  )}
                  {member.user_email === userEmail && (
                    <span className="ml-2 text-emerald-500/70 text-xs">나</span>
                  )}
                </div>
                {/* 5/20 노션 §7-3 정합 = 모든 멤버 삭제 가능 (관리자·본인·팀원 전체 동일 권한)
                    본인 = 자기 삭제 가능·소유자 = 모두 삭제 가능·팀원 = 다른 팀원 삭제 가능 */}
                {member.user_email !== userEmail || !isOwner ? (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.user_email)}
                    className="text-slate-500 hover:text-red-400 transition p-1 rounded"
                    title={member.user_email === userEmail ? '나가기' : '삭제'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* 이름 검색 초대 폼 */}
          {isOwner && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-slate-500 text-xs mb-3">
                가입한 사용자의 <strong className="text-slate-700">이름</strong>으로 검색해 초대하세요.
                (동명이인 방지를 위해 이메일이 함께 표시됩니다)
              </p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={selectedProfile ? `${selectedProfile.display_name ?? ''} (${selectedProfile.email})` : searchQuery}
                  onChange={e => {
                    setSelectedProfile(null)
                    setSearchQuery(e.target.value)
                    setShowSearch(true)
                    setAddError('')
                  }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="사용자 이름 또는 이메일 입력"
                  className={`${INPUT_CLS} pl-9 pr-9`}
                  disabled={!!selectedProfile}
                />
                {selectedProfile && (
                  <button
                    onClick={() => { setSelectedProfile(null); setSearchQuery('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 검색 결과 드롭다운 */}
                {showSearch && !selectedProfile && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-50 border border-slate-300 rounded-lg shadow-xl max-h-64 overflow-y-auto z-20">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProfile(p)
                          setShowSearch(false)
                          setSearchQuery('')
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 transition border-b border-slate-300/50 last:border-b-0"
                      >
                        <div className="text-sm text-slate-800">{p.display_name || '(이름 없음)'}</div>
                        <div className="text-xs text-slate-500">{p.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearch && !selectedProfile && searchQuery.trim() && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs z-20">
                    <p className="text-slate-500">해당 이름의 사용자를 찾을 수 없습니다.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={newPart}
                  onChange={e => setNewPart(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                  placeholder="담당 파트 (예: 종합안내)"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  onClick={handleAddMember}
                  disabled={isAddingMember || !selectedProfile}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  초대
                </button>
              </div>
              {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
            </div>
          )}
        </section>

        {/* 마스터 시안 카드 = 노션 §3 "시안 입력 전체 제거" 5/21 사용자 명시 삭제.
            관련 state·handler (masterImageUrl·handleMasterUpload·handleAnalyzeLayout 등)는
            case-c 시작 흐름·DB Project.master_image_url 컬럼 호환 위해 보존 (orphan 정책).
            void 처리는 본 컴포넌트 마지막에 일괄. */}

        {/* 스타일 프리셋 6종 — 사용자 결정으로 숨김 (2026-05-11) */}
        {false && <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-slate-800 font-semibold text-sm">스타일 프리셋</h2>
            <span className="ml-auto text-slate-500 text-xs">클릭하면 행사 전체 서식에 적용</span>
          </div>
          <p className="text-slate-500 text-xs mb-4 leading-relaxed">
            행사 성격에 맞는 디자인 톤을 선택하세요. 폰트·색상이 모든 구역에 일괄 적용됩니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {STYLE_PRESETS.map(preset => {
              const isApplied = stylesSaved === 'preset:' + preset.id
              return (
                <button
                  key={preset.id}
                  onClick={() => isOwner && handleApplyPreset(preset.id)}
                  disabled={!isOwner}
                  className="text-left rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-500/60 transition disabled:cursor-not-allowed disabled:opacity-60 group"
                >
                  <div
                    className="h-16 flex items-center justify-center px-3"
                    style={{
                      backgroundColor: `#${preset.bg_color}`,
                      color: `#${preset.text_color}`,
                      fontFamily: preset.font_face,
                    }}
                  >
                    <span className="font-bold text-base">Aa 가나다</span>
                    <span
                      className="ml-2 px-2 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: `#${preset.accent}`, color: '#FFFFFF' }}
                    >
                      {preset.mood}
                    </span>
                  </div>
                  <div className="px-3 py-2 bg-white flex items-center justify-between">
                    <span className="text-slate-800 text-xs font-medium">{preset.label}</span>
                    {isApplied && <span className="text-emerald-400 text-[10px]">✓ 적용됨</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>}

        {/* 로고 자산 카탈로그 — 사용자 결정으로 숨김 (2026-05-11) */}
        {false && <section className="bg-white border border-slate-200 rounded-xl p-6">
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-slate-800 font-semibold text-sm">로고 자산 카탈로그</h2>
            <span className="ml-auto text-slate-500 text-xs">주최·주관·후원 로고 재사용</span>
          </div>
          <p className="text-slate-500 text-xs mb-4 leading-relaxed">
            반복 사용되는 로고를 등록해두면 후원사 배너·크레딧에 재사용할 수 있습니다.
          </p>

          {logos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              {logos.map(logo => (
                <div key={logo.id} className="relative group">
                  <div className="aspect-square bg-slate-50 border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.image_url} alt={logo.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-slate-700 text-[10px] truncate">{logo.name}</p>
                      <p className="text-slate-500 text-[9px]">{logo.category}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleLogoDelete(logo.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <div className="flex gap-2 items-end border-t border-slate-200 pt-3">
              <div className="flex-1">
                <label className="block text-slate-500 text-[10px] mb-1">기관명</label>
                <input
                  value={logoName}
                  onChange={e => setLogoName(e.target.value)}
                  placeholder="예: 한국관광공사"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-slate-500 text-[10px] mb-1">구분</label>
                <select
                  value={logoCategory}
                  onChange={e => setLogoCategory(e.target.value as OrgLogoAsset['category'])}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                >
                  {(['주최', '주관', '후원', '협찬', '기타'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  if (!logoName.trim()) return
                  logoFileRef.current?.click()
                }}
                disabled={uploadingLogo || !logoName.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition h-[30px]"
              >
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                로고 업로드
              </button>
            </div>
          )}
        </section>}

        {/* 행사별 기본 양식 — 사용자 결정으로 숨김 (2026-05-11) */}
        {false && <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-4 h-4 text-indigo-400" />
            <h2 className="text-slate-800 font-semibold text-sm">행사 기본 양식</h2>
            <span className="ml-auto text-slate-500 text-xs">팀원이 모든 제작물의 이 서식을 공유합니다</span>
          </div>

          <p className="text-slate-500 text-xs mb-5 leading-relaxed">
            여기서 설정한 서식(폰트·크기·색상·정렬)은 이 프로젝트의 <strong className="text-slate-700">모든 제작물</strong>에 동일하게 적용됩니다.
            각 담당자는 이 기본 양식을 바탕으로 텍스트만 수정하므로 여러 사람이 편집해도 같은 느낌의 결과물이 나옵니다.
          </p>

          <div className="space-y-3">
            {slotKeys.map(slotKey => {
              const style = getStyle(slotKey)
              const defaults = DEFAULT_SLOTS[slotKey]
              return (
                <div key={slotKey} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-slate-800 text-sm font-medium">{defaults.label}</span>
                      <span className="ml-2 text-slate-500 text-[10px] font-mono">{slotKey}</span>
                    </div>
                    {stylesSaved === slotKey && (
                      <span className="text-emerald-400 text-xs">✓ 저장됨</span>
                    )}
                    {stylesSaved === slotKey + ':applied' && (
                      <span className="text-emerald-400 text-xs">✓ 전체 적용됨</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">폰트</label>
                      <select
                        value={style.font_face}
                        onChange={e => handleStylePatch(slotKey, { font_face: e.target.value })}
                        disabled={!isOwner}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      >
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">크기 (pt)</label>
                      <input
                        type="number"
                        min={6}
                        max={120}
                        value={style.font_size}
                        onChange={e => handleStylePatch(slotKey, { font_size: parseInt(e.target.value) || 16 })}
                        disabled={!isOwner}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">정렬</label>
                      <select
                        value={style.align}
                        onChange={e => handleStylePatch(slotKey, { align: e.target.value as 'left' | 'center' | 'right' })}
                        disabled={!isOwner}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      >
                        {ALIGN_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">색상</label>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: `#${style.color}` }}
                        />
                        <input
                          type="text"
                          value={style.color}
                          onChange={e => handleStylePatch(slotKey, { color: e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase() })}
                          disabled={!isOwner}
                          placeholder="FFFFFF"
                          className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 프리셋 색상 */}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-slate-500 text-[10px] mr-1">프리셋:</span>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => isOwner && handleStylePatch(slotKey, { color: c })}
                        disabled={!isOwner}
                        className="w-4 h-4 rounded border border-slate-600 hover:ring-2 hover:ring-indigo-400 transition disabled:cursor-not-allowed"
                        style={{ backgroundColor: `#${c}` }}
                        title={`#${c}`}
                      />
                    ))}
                  </div>

                  {/* 추가 마스터 컨트롤 — 자간 / 상대 위치 */}
                  {isOwner && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-1">자간 (-5~10)</label>
                        <input
                          type="number"
                          min={-5} max={10}
                          value={style.letter_spacing ?? 0}
                          onChange={e => handleStylePatch(slotKey, { letter_spacing: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-1">마스터 X %</label>
                        <input
                          type="number"
                          value={style.master_x ?? ''}
                          placeholder="미사용"
                          onChange={e => handleStylePatch(slotKey, { master_x: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-1">마스터 Y %</label>
                        <input
                          type="number"
                          value={style.master_y ?? ''}
                          placeholder="미사용"
                          onChange={e => handleStylePatch(slotKey, { master_y: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-1">마스터 W %</label>
                        <input
                          type="number"
                          value={style.master_w ?? ''}
                          placeholder="미사용"
                          onChange={e => handleStylePatch(slotKey, { master_w: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* 일괄 적용 버튼 — 명세 7-2 */}
                  {isOwner && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 flex-wrap">
                      <span className="text-slate-500 text-[10px] self-center mr-1">기존 제작물에 적용:</span>
                      <button
                        onClick={() => handleApplyToAll(slotKey, 'text')}
                        className="text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-50 hover:bg-indigo-900/30 px-2.5 py-1 rounded transition"
                        title="가장 최근 편집된 제작물의 텍스트를 모든 제작물에 복사"
                      >
                        텍스트만
                      </button>
                      <button
                        onClick={() => handleApplyToAll(slotKey, 'style')}
                        className="text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-50 hover:bg-indigo-900/30 px-2.5 py-1 rounded transition"
                      >
                        서식만
                      </button>
                      <button
                        onClick={() => handleApplyToAll(slotKey, 'both')}
                        className="text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-50 hover:bg-indigo-900/30 px-2.5 py-1 rounded transition"
                      >
                        전부 (텍스트+서식)
                      </button>
                      <button
                        onClick={() => handleMasterBroadcast(slotKey)}
                        className="text-[10px] text-white bg-purple-700 hover:bg-purple-600 px-2.5 py-1 rounded transition font-medium"
                        title="PPT 슬라이드 마스터처럼 — 이 슬롯의 서식·위치·크기를 모든 제작물에 즉시 적용 (텍스트 유지)"
                      >
                        🎯 마스터 전파 ({itemCount}개)
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>}
      </main>
    </div>
  )
}
