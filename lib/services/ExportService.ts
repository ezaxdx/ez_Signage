import type { Project, DesignItem, ContentsMap } from '@/lib/types'
import { PROGRAM_PART_BY_CODE } from '@/lib/programParts'

const DEFAULT_SLOT_ORDER = ['header_brand', 'hero_title', 'sub_title', 'body', 'arrow', 'qr_code', 'footer_credits']

// ── EditorGrid 컬럼 상태 (localStorage) — 엑셀/PPT/PDF 내보내기 시 동기화 ──
// v9.19 (2026-05-12): 사용자 요청 헤더 개편 21컬럼
const COLS_STORAGE_KEY = 'mice_editor_grid_cols_v10'
type EditorColumnId = 'no' | 'part' | 'bigarea' | 'location' | 'purpose' | 'content' | 'category' | 'language' | 'size' | 'material' | 'quantity' | 'ko_text' | 'en_text' | 'note' | 'editor' | 'design_vendor' | 'print_vendor' | 'install_date' | 'install_time' | 'usage_period' | 'uninstall_date' | 'uninstall_time' | 'order_contact' | 'order_date' | string
interface EditorCustomCol { id: EditorColumnId; label: string; width: string; field: string | null; custom?: boolean }
interface EditorColState {
  order: EditorColumnId[]
  hidden: EditorColumnId[]
  excludedFromExcel: EditorColumnId[]
  excludedFromPpt: EditorColumnId[]
  excludedFromPdf: EditorColumnId[]
  customCols: EditorCustomCol[]
  customValues: Record<string, Record<string, string>>
}

// v9.19: 사용자 요청 헤더 21컬럼
const DEFAULT_LABELS: Record<string, string> = {
  no: 'NO.',
  part: '파트',
  bigarea: '구분',
  location: '장소',
  purpose: '사용 목적',
  category: '품목',
  language: '언어',
  size: '규격',
  material: '재질',
  quantity: '수량',
  content: '내용',
  design_vendor: '디자인업체',
  print_vendor: '출력업체',
  install_date: '설치일자',
  install_time: '설치시간',
  usage_period: '사용기간',
  uninstall_date: '철거일자',
  uninstall_time: '철거시간',
  order_contact: '발주 담당자',
  order_date: '발주일',
  note: '비고',
  // legacy
  editor: '담당자',
  ko_text: '국문 시안',
  en_text: '영문 시안',
  // v9.3 extra (사용 가능, 기본 미노출)
  space_type: '공간 유형',
  place_detail: '세부 장소',
  place_contact: '장소 담당자',
  unit: '단위',
  type_kind: '유형',
  supplier: '수급업체',
}

// v9.19: 사용자 요청 순서 21컬럼
const DEFAULT_ORDER: EditorColumnId[] = [
  'no', 'part', 'bigarea', 'location', 'purpose', 'category', 'language',
  'size', 'material', 'quantity', 'content',
  'design_vendor', 'print_vendor',
  'install_date', 'install_time', 'usage_period',
  'uninstall_date', 'uninstall_time',
  'order_contact', 'order_date', 'note',
]

// PPT 기본 제외 (Excel의 21컬럼 중 PPT 14컬럼만 남김)
const DEFAULT_PPT_EXCLUDED: EditorColumnId[] = [
  'design_vendor', 'print_vendor',
  'install_time', 'usage_period', 'uninstall_time',
  'order_contact', 'order_date', 'editor',
]

// v9.19: 설치일자·철거일자·발주일을 OrderingSchedule 마일스톤에서 자동 계산 (item 개별값 없을 때)
interface DateContext { installDate: string; uninstallDate: string; orderDate: string }

function getMilestoneDates(projectId: string, eventDate: string | null): DateContext {
  const empty: DateContext = { installDate: '', uninstallDate: '', orderDate: '' }
  if (!eventDate || typeof window === 'undefined') return empty
  try {
    const storageKey = `ordering_schedule_v2_${projectId}`
    const raw = localStorage.getItem(storageKey)
    // 노션 컴펌 본 §3-2 정합 (5/18) — 발주 마감 D-3·설치 D-1
    const milestones: Array<{ key: string; offset: number }> = raw
      ? JSON.parse(raw)
      : [{ key: 'order', offset: -3 }, { key: 'install', offset: -1 }, { key: 'event', offset: 0 }]
    const eventMs = new Date(eventDate).getTime()
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10)
    const installM = milestones.find(m => m.key === 'install')
    const orderM = milestones.find(m => m.key === 'order')
    return {
      installDate: installM ? fmt(eventMs + installM.offset * 86400000) : fmt(eventMs - 86400000),
      uninstallDate: fmt(eventMs + 86400000),
      orderDate: orderM ? fmt(eventMs + orderM.offset * 86400000) : fmt(eventMs - 3 * 86400000),
    }
  } catch { return empty }
}

function loadEditorColState(): EditorColState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COLS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EditorColState>
    return {
      order: parsed.order ?? DEFAULT_ORDER,
      hidden: parsed.hidden ?? [],
      excludedFromExcel: parsed.excludedFromExcel ?? [],
      excludedFromPpt: parsed.excludedFromPpt ?? [...DEFAULT_PPT_EXCLUDED],
      excludedFromPdf: parsed.excludedFromPdf ?? [...DEFAULT_PPT_EXCLUDED],
      customCols: parsed.customCols ?? [],
      customValues: parsed.customValues ?? {},
    }
  } catch { return null }
}

/** 컬럼 ID + 행 데이터 → 셀 값 변환
 * dateCtx: 설치일자·철거일자·발주일을 item 미설정 시 프로젝트 일정에서 자동 채움
 */
function getCellValue(
  colId: EditorColumnId,
  item: DesignItem,
  contents: ContentsMap,
  customValues: Record<string, Record<string, string>>,
  items?: DesignItem[],
  dateCtx?: DateContext,
): string | number {
  // 커스텀 컬럼
  if (colId.startsWith('custom_')) {
    return customValues[item.id]?.[colId] ?? ''
  }
  switch (colId) {
    case 'no': return item.no ?? ''
    case 'part': {
      // v4.1 (질문 4): design_items.program_part(코드) → PROGRAM_PARTS 한글 이름
      // null이면 빈칸. 다중 코드는 쉼표 구분 ("40.04,40.19" → "회의, 등록").
      // 매핑 실패 시 빈칸 + console.warn (학습 데이터 누락 추적).
      // legacy fallback: program_part null일 때 design_items.part(자유입력) 사용
      const code = item.program_part?.trim()
      if (!code) return item.part ?? ''
      const labels = code.split(/[,，]/).map(c => c.trim()).filter(Boolean).map(c => {
        const part = PROGRAM_PART_BY_CODE.get(c)
        if (!part) {
          if (typeof console !== 'undefined') console.warn(`[ExportService] program_part 매핑 실패: ${c} (item ${item.id})`)
          return null
        }
        return part.name
      }).filter((s): s is string => Boolean(s))
      return labels.join(', ')
    }
    case 'bigarea': {
      const cat = item.category ?? ''
      if (!cat || !items) return cat
      const sameCat = items.filter(it => it.category === cat)
      if (sameCat.length < 2) return cat
      const idx = sameCat.findIndex(it => it.id === item.id) + 1
      return `${cat} #${idx}`
    }
    case 'location': return item.location ?? ''
    case 'purpose': return item.purpose ?? ''                      // v8: '사용 목적'으로 환원
    case 'content': return item.content_text ?? gatherContentText(contents, 'ko') // v8: '내용' content_text 우선
    case 'category': return item.category ?? ''
    case 'language': return item.language ?? ''
    case 'size': return item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : ''
    case 'material': return item.material ?? ''
    case 'quantity': return item.quantity ?? 1
    // v9.3 신규 13컬럼 (회의록 인쇄제작물 시트 양식)
    case 'space_type':     return item.space_type ?? ''
    case 'place_detail':   return item.place_detail ?? ''
    case 'place_contact':  return item.place_contact ?? ''
    case 'unit':           return item.unit ?? '개'
    case 'type_kind':      return item.type_kind ?? ''
    case 'supplier':       return item.supplier ?? ''
    // v9.19: 설치일자·철거일자·발주일 → item 값 없으면 OrderingSchedule 마일스톤 날짜로 자동 채움
    case 'install_date':   return item.install_date || (dateCtx?.installDate ?? '')
    case 'install_time':   return item.install_time ?? ''
    case 'usage_period':   return item.usage_period ?? ''
    case 'uninstall_date': return item.uninstall_date || (dateCtx?.uninstallDate ?? '')
    case 'uninstall_time': return item.uninstall_time ?? ''
    case 'order_contact':  return item.order_contact ?? ''
    case 'order_date':     return item.order_date || (dateCtx?.orderDate ?? '')
    case 'design_vendor':  return item.design_vendor ?? ''
    case 'print_vendor':   return item.print_vendor ?? ''
    case 'ko_text': {
      let content = gatherContentText(contents, 'ko')
      if (content === '기본시안' && (item.location || item.purpose)) {
        const extras = [item.purpose, item.location].filter(Boolean).join(' ')
        content = `기본시안 + ${extras}`
      }
      return content
    }
    case 'en_text': return gatherContentText(contents, 'en')
    case 'note': {
      const remarks: string[] = []
      const auto = detectRemarks(contents)
      if (auto) remarks.push(auto)
      if (item.review_status && item.review_status !== '작업중') remarks.push(`[${item.review_status}]`)
      if (item.review_note) remarks.push(item.review_note)
      return remarks.join(' · ')
    }
    case 'editor': return item.last_edited_by ? item.last_edited_by.split('@')[0] : ''
    default: return ''
  }
}

/** 내용 컬럼 — "기본시안 + 본문 요약 + 추가 객체" 포맷 (REAIM 샘플 기준) */
function gatherContentText(contents: ContentsMap, field: 'ko' | 'en'): string {
  const parts: string[] = ['기본시안']

  // body 슬롯 내용
  const body = contents['body']?.[field]
  if (body && body.trim()) parts.push(body.trim())

  // hero_title의 행사명이 있다면 함께 포함 (회의록 "제작물마다 들어가는 행사명")
  // → 내용 요약에는 hero_title 제외 (컬럼 품목/장소로 커버됨)

  // QR 슬롯 사용 여부
  const qr = contents['qr_code']
  if (qr && (qr.ko || qr.en || (qr.images && qr.images.length > 0))) {
    const qrLabel = qr.ko?.trim() || qr.en?.trim()
    parts.push(qrLabel ? `${qrLabel} QR` : 'QR 포함')
  }

  // 화살표 슬롯 사용 여부
  const arrow = contents['arrow']
  if (arrow && (arrow.ko || arrow.en)) {
    const arrowText = arrow.ko?.trim() || arrow.en?.trim() || ''
    parts.push(arrowText ? `방향: ${arrowText}` : '방향 지시')
  }

  // sub_title 사용 시
  const sub = contents['sub_title']?.[field]
  if (sub && sub.trim()) parts.push(sub.trim())

  // 빈 내용일 때는 단순 '기본시안'만
  return parts.length === 1 ? '기본시안' : parts.join(' + ')
}

/** 전체 슬롯 텍스트 (국문/영문 grid용) */
export function gatherText(contents: ContentsMap, field: 'ko' | 'en'): string {
  const allKeys = Object.keys(contents)
  const orderedKeys = [
    ...DEFAULT_SLOT_ORDER.filter(k => allKeys.includes(k)),
    ...allKeys.filter(k => !DEFAULT_SLOT_ORDER.includes(k)),
  ]
  return orderedKeys.map(key => contents[key]?.[field] ?? '').filter(Boolean).join('\n')
}

/** 비고 자동 기입 — 화살표/QR/추가 이미지 자동 감지 (REAIM 샘플 기준) */
function detectRemarks(contents: ContentsMap): string {
  const tags: string[] = []
  const arrow = contents['arrow']
  if (arrow && (arrow.ko || arrow.en)) tags.push('화살표 스티커')
  const qr = contents['qr_code']
  if (qr && (qr.ko || qr.en || (qr.images && qr.images.length > 0))) tags.push('QR 인쇄')
  // body 외 슬롯에 이미지 업로드 시 → 시안 수정 표시
  const hasCustomImage = Object.entries(contents).some(([key, slot]) =>
    key !== 'header_brand' && key !== 'footer_credits' && slot.images && slot.images.length > 0
  )
  if (hasCustomImage && tags.length === 0) tags.push('시안 수정 있음')
  return tags.join(' · ')
}

// ══════════════════════════════════════════════════════════
// PPT 내보내기 — 명세 11: 엑셀 1행 = PPT 1슬라이드
// 엑셀 17컬럼 중 담당자/디자인업체/출력업체 제외 → 14컬럼
// ══════════════════════════════════════════════════════════

const SLIDE_W = 13.3
const SLIDE_H = 7.5
const MARGIN  = 0.3
const TITLE_Y = 0.15
const TABLE_Y = 0.60
const TABLE_W = SLIDE_W - MARGIN * 2
const TABLE_H = 1.15
const DESIGN_Y = TABLE_Y + TABLE_H + 0.15
const DESIGN_MAX_H = SLIDE_H - DESIGN_Y - 0.2
const DESIGN_MAX_W = TABLE_W
const REF_CANVAS_H_IN = 500 / 96

export async function exportToPPT(
  project: Project,
  items: DesignItem[],
  allContents: Record<string, ContentsMap>
): Promise<void> {
  const pptxgenjs = await import('pptxgenjs')
  const PptxGenJS = pptxgenjs.default
  const pptx = new PptxGenJS()

  pptx.defineLayout({ name: 'GUIDE_16_9', width: SLIDE_W, height: SLIDE_H })
  pptx.layout = 'GUIDE_16_9'

  const headerOpts = (text: string) => ({
    text,
    options: {
      fill: { color: 'D9D9D9' },
      bold: true,
      align: 'center' as const,
      fontSize: 7,
      fontFace: 'Malgun Gothic',
      valign: 'middle' as const,
    },
  })
  // 5/22 사용자 명시 = 표 밖 글자 오버플로우 정정 = autoFit·wrap·valign 추가
  const cellOpts = (text: string, align: 'center' | 'left' = 'center') => ({
    text,
    options: {
      align,
      fontSize: 8,
      fontFace: 'Malgun Gothic',
      autoFit: true,
      wrap: true,
      valign: 'middle' as const,
    },
  })

  // 행사 로고 텍스트 (header_brand 슬롯의 ko 텍스트)
  const logoText = (() => {
    for (const item of items) {
      const hb = allContents[item.id]?.header_brand
      if (hb?.ko) return hb.ko
    }
    return project.client_name ?? ''
  })()

  // ── PPT 컬럼 결정: localStorage 상태 → excludedFromPpt 필터 ──
  const pptColState = loadEditorColState()
  const pptExcluded = pptColState?.excludedFromPpt ?? DEFAULT_PPT_EXCLUDED
  const pptHidden = pptColState?.hidden ?? []
  // PPT는 hidden 무시 (편집 숨김과 PPT 출력은 독립) — 단, excludedFromPpt는 적용
  const pptOrder = pptColState?.order ?? DEFAULT_ORDER
  const pptColIds = pptOrder.filter(id => !pptExcluded.includes(id))

  // 날짜 자동 채움 (project.event_date 기반)
  const dateCtx = getMilestoneDates(project.id, project.event_date)

  // 5/22 사용자 명시 = PPT 첫 페이지 표지 슬라이드 (회의록 §6 = 전체 다운로드 시에만 표지 노출)
  {
    const coverSlide = pptx.addSlide()
    coverSlide.background = { color: 'FFFFFF' }
    const eventDateStr = project.event_date
      ? new Date(project.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : '[행사일 미입력]'
    // 표지 상단 = 행사명 (큰 글자)
    coverSlide.addText('환경 제작물 발주 가이드', {
      x: 0.7, y: 1.0, w: SLIDE_W - 1.4, h: 0.6,
      fontFace: 'Malgun Gothic', fontSize: 24, bold: true, color: '1E293B', align: 'center',
    })
    coverSlide.addText(project.name, {
      x: 0.7, y: 1.7, w: SLIDE_W - 1.4, h: 0.7,
      fontFace: 'Malgun Gothic', fontSize: 20, color: '475569', align: 'center',
    })
    // 표지 중앙 = 행사 기본 정보 (텍스트 라인으로 표현·pptxgenjs Table 타입 호환)
    coverSlide.addText([
      { text: '행사명: ', options: { bold: true, color: '475569' } },
      { text: project.name, options: { color: '1E293B', breakLine: true } },
      { text: '장소: ', options: { bold: true, color: '475569' } },
      { text: project.event_venue ?? '[행사장 미입력]', options: { color: '1E293B', breakLine: true } },
      { text: '일자: ', options: { bold: true, color: '475569' } },
      { text: eventDateStr, options: { color: '1E293B', breakLine: true } },
      { text: '발주처: ', options: { bold: true, color: '475569' } },
      { text: project.client_name ?? '[발주처 미입력]', options: { color: '1E293B', breakLine: true } },
      { text: '총 항목 수: ', options: { bold: true, color: '475569' } },
      { text: `${items.length}건`, options: { color: '1E293B' } },
    ], {
      x: 1.5, y: 3.0, w: SLIDE_W - 3.0, h: 2.5,
      fontFace: 'Malgun Gothic', fontSize: 14, align: 'left', valign: 'top',
    })
    // 일정 데드라인 (회의록 §6 = 첫 페이지에 일정 데드라인 노출)
    if (dateCtx) {
      const dateLines: string[] = []
      if (dateCtx.installDate) dateLines.push(`설치 시작: ${dateCtx.installDate}`)
      if (dateCtx.orderDate) dateLines.push(`발주 마감: ${dateCtx.orderDate}`)
      if (dateCtx.uninstallDate) dateLines.push(`철거: ${dateCtx.uninstallDate}`)
      if (dateLines.length > 0) {
        coverSlide.addText(`주요 일정\n${dateLines.join(' · ')}\n\n※ 본 일정은 추정 일정입니다. 협력사 확인 후 변경될 수 있습니다.`, {
          x: 1.5, y: SLIDE_H - 1.6, w: SLIDE_W - 3.0, h: 1.2,
          fontFace: 'Malgun Gothic', fontSize: 10, color: '475569', align: 'center', valign: 'middle',
        })
      }
    }
  }

  for (const item of items) {
    const contents = allContents[item.id] ?? {}
    const widthMm  = item.width_mm  ?? 600
    const heightMm = item.height_mm ?? 1800
    const aspectRatio = widthMm / heightMm

    const slide = pptx.addSlide()
    slide.background = { color: 'F8FAFC' }

    // ── 좌상단: 환경 제작물 / (행사명) + 5/20 노션 §6 정합 = 행사 정보 (장소·일자·발주처) ──
    const eventDateStr = project.event_date
      ? new Date(project.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : ''
    const headerLines: Array<{ text: string; options: { fontSize: number; bold?: boolean; color: string; breakLine?: boolean } }> = [
      { text: '환경 제작물', options: { fontSize: 14, bold: true, color: '1E293B' } },
      { text: '\n', options: { fontSize: 10, color: '64748B', breakLine: true } },
      { text: `(${project.name})`, options: { fontSize: 10, color: '64748B', breakLine: true } },
    ]
    if (project.event_venue) {
      headerLines.push({ text: `장소: ${project.event_venue}`, options: { fontSize: 9, color: '64748B', breakLine: true } })
    }
    if (eventDateStr) {
      headerLines.push({ text: `일자: ${eventDateStr}`, options: { fontSize: 9, color: '64748B', breakLine: true } })
    }
    if (project.client_name) {
      headerLines.push({ text: `발주처: ${project.client_name}`, options: { fontSize: 9, color: '64748B' } })
    }
    slide.addText(headerLines, {
      x: MARGIN, y: TITLE_Y, w: TABLE_W * 0.65, h: 0.85,
      fontFace: 'Malgun Gothic', valign: 'top',
    })

    // ── 우상단: 행사 로고 ─────────────────────────────────
    if (logoText) {
      slide.addText(logoText, {
        x: MARGIN + TABLE_W * 0.65, y: TITLE_Y, w: TABLE_W * 0.35, h: 0.45,
        fontSize: 11, bold: true, color: '6366F1', align: 'right', valign: 'middle',
        fontFace: 'Malgun Gothic',
      })
    }

    // ── 메타 테이블 (동적 컬럼 — excludedFromPpt 기준) ──
    const customValues = pptColState?.customValues ?? {}
    const headerRow = pptColIds.map(id => headerOpts(DEFAULT_LABELS[id] ?? id))
    const dataRow = pptColIds.map(id => {
      const val = getCellValue(id, item, contents, customValues, items, dateCtx)
      const isLeft = id === 'content' || id === 'note' || id === 'purpose' || id === 'location'
      return cellOpts(String(val), isLeft ? 'left' : 'center')
    })

    // 컬럼 너비 비율 분배 (내용 컬럼은 2배)
    const colWeights: Record<string, number> = {
      content: 2.2, note: 1.2, purpose: 1.1, location: 1.1, part: 0.8,
      bigarea: 0.8, install_date: 0.85, uninstall_date: 0.85, no: 0.45, quantity: 0.45,
    }
    const totalW = pptColIds.reduce((s, id) => s + (colWeights[id] ?? 0.8), 0)
    const colWidths = pptColIds.map(id => TABLE_W * (colWeights[id] ?? 0.8) / totalW)

    slide.addTable(
      [headerRow, dataRow],
      {
        x: MARGIN,
        y: TABLE_Y,
        w: TABLE_W,
        colW: colWidths,
        rowH: [0.35, 0.55],
        border: { pt: 0.5, color: '94A3B8' },
        fontFace: 'Malgun Gothic',
      }
    )

    // ── 하단 디자인 영역 — 실물 비율 유지 ────────────────
    let finalW: number
    let finalH: number

    if (aspectRatio >= 1) {
      finalW = Math.min(DESIGN_MAX_W, DESIGN_MAX_H * aspectRatio)
      finalH = finalW / aspectRatio
      if (finalH > DESIGN_MAX_H) { finalH = DESIGN_MAX_H; finalW = finalH * aspectRatio }
    } else {
      finalH = DESIGN_MAX_H
      finalW = finalH * aspectRatio
      if (finalW > DESIGN_MAX_W) { finalW = DESIGN_MAX_W; finalH = finalW / aspectRatio }
    }

    const designX = (SLIDE_W - finalW) / 2

    if (item.image_url) {
      slide.addImage({ path: item.image_url, x: designX, y: DESIGN_Y, w: finalW, h: finalH })
    } else {
      // v4.1 신규-G (회의 결정): 디자인 영역은 빈 박스 — 디자이너가 채울 자리
      slide.addShape('rect', {
        x: designX, y: DESIGN_Y, w: finalW, h: finalH,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', dashType: 'dash', width: 1 },
      })
      slide.addText(`디자이너 작업 영역\n${widthMm} × ${heightMm} mm`, {
        x: designX, y: DESIGN_Y + finalH / 2 - 0.25, w: finalW, h: 0.5,
        fontSize: 10, color: '94A3B8', align: 'center', valign: 'middle',
        fontFace: 'Malgun Gothic',
      })
    }

    // ── 슬롯 텍스트 박스 (웹 캔버스 좌표 → PPT 좌표 변환) ──
    const fontScale = finalH / REF_CANVAS_H_IN

    for (const [, slot] of Object.entries(contents)) {
      const displayText = [slot.ko, slot.en].filter(Boolean).join('\n')
      if (!displayText) continue

      // slot.w 사용 (%, 기본 70)
      const wPct = slot.w ?? 70
      const slotW = finalW * (wPct / 100)
      const tbCenterX = designX + (slot.x / 100) * finalW
      const tbX = Math.max(designX, tbCenterX - slotW / 2)
      const tbY = DESIGN_Y + (slot.y / 100) * finalH
      const tbH = Math.max(0.25, finalH * 0.12 * (slot.h ?? 1))
      const fontSize = Math.max(6, Math.round((slot.fontSize || 16) * fontScale))

      slide.addText(displayText, {
        x: tbX, y: tbY, w: slotW, h: tbH,
        fontSize, color: 'FFFFFF', align: 'center', valign: 'middle',
        autoFit: true, wrap: true, fontFace: 'Malgun Gothic',
      })
    }

    slide.addText(`${widthMm} × ${heightMm} mm`, {
      x: designX, y: DESIGN_Y + finalH + 0.05, w: finalW, h: 0.18,
      fontSize: 7, color: '94A3B8', align: 'center', fontFace: 'Malgun Gothic',
    })
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  await pptx.writeFile({ fileName: `제작물리스트_${project.name}_${dateStr}.pptx` })
  // v4.1 신규-G: usage_logs (best-effort, fire-and-forget)
  void logUsage('export_pptx', { project_id: project.id, item_count: items.length })
}

// ══════════════════════════════════════════════════════════
// v4.1 신규-G: usage_logs INSERT (다운로드 트리거 기록)
// v9.2 회의록: 엑셀 내보내기 = ′완료본′ → design_items.finalized_at 자동 UPDATE
// ══════════════════════════════════════════════════════════
async function logUsage(action: 'export_excel' | 'export_pptx' | 'recommend' | 'venue_request', metadata: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      project_id: typeof metadata.project_id === 'string' ? metadata.project_id : null,
      action,
      metadata,
    })
    // 엑셀·PPT 내보내기 시: 해당 프로젝트의 모든 design_items.finalized_at = now()
    // (학습 가중치 100% 정답 풀로 자동 편입 — 회의록 ′학습 3종 ②′)
    // PPT도 동일: 제작 완료 다운로드 = 발주 완료로 간주 (사용자 요청 2026-05-12)
    if ((action === 'export_excel' || action === 'export_pptx') && typeof metadata.project_id === 'string') {
      await supabase
        .from('design_items')
        .update({ finalized_at: new Date().toISOString(), confirmed: true })
        .eq('project_id', metadata.project_id)
        .is('finalized_at', null)
    }
  } catch {
    // usage_logs 테이블 없거나 권한 없음 — silent
  }
}

/** 단일 제작물 PPT — 현재 선택된 1개 제작물만 */
export async function exportSingleToPPT(
  project: Project,
  item: DesignItem,
  allContents: Record<string, ContentsMap>
): Promise<void> {
  await exportToPPT(project, [item], allContents)
}

// ══════════════════════════════════════════════════════════
// PDF 인쇄용 출력 — 실물 mm 규격 + 300dpi (BANNER_GENERATOR_DESIGN.md 7항)
// ══════════════════════════════════════════════════════════

/**
 * 5/22 사용자 명시 = PDF → PPT 양식 변환. 16:9 (338.84×190.5mm)·헤더 메타 표·하단 디자인 영역·표지 페이지.
 * exportToPPT와 동일 구조. 실물 mm 영역 = 정확한 mm 출력은 별도 PNG export 영역 (다음 사이클).
 */
export async function exportToPDF(
  project: Project,
  items: DesignItem[],
  allContents: Record<string, ContentsMap>
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  // PPT 영역과 동일 16:9 (13.3"×7.5" = 338.84×190.5mm)
  const PAGE_W = 338.84
  const PAGE_H = 190.5
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W, PAGE_H], compress: true })

  // ── 표지 페이지 ──
  const dateCtx = getMilestoneDates(project.id, project.event_date ?? null)
  pdf.setFontSize(28)
  pdf.setTextColor(31, 41, 55)
  pdf.text(project.name ?? '제작물 리스트', PAGE_W / 2, 40, { align: 'center' })
  pdf.setFontSize(12)
  pdf.setTextColor(100, 116, 139)
  const eventDateStr = project.event_date
    ? new Date(project.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const coverLines = [
    ['행사명', project.name ?? ''],
    ['장소', project.event_venue ?? ''],
    ['일자', eventDateStr],
    ['발주사', 'EZPMP'],
    ['총 항목 수', String(items.length)],
    ...(dateCtx.installDate ? [['설치일자', dateCtx.installDate]] : []),
    ...(dateCtx.uninstallDate ? [['철거일자', dateCtx.uninstallDate]] : []),
    ...(dateCtx.orderDate ? [['발주일', dateCtx.orderDate]] : []),
  ]
  let yCursor = 70
  for (const [label, value] of coverLines) {
    pdf.setTextColor(100, 116, 139)
    pdf.text(label, PAGE_W / 2 - 50, yCursor)
    pdf.setTextColor(31, 41, 55)
    pdf.text(value, PAGE_W / 2 - 20, yCursor)
    yCursor += 9
  }

  // ── 각 제작물 페이지 ──
  for (let pageIdx = 0; pageIdx < items.length; pageIdx++) {
    pdf.addPage([PAGE_W, PAGE_H], 'landscape')
    const item = items[pageIdx]
    const widthMm = item.width_mm ?? 600
    const heightMm = item.height_mm ?? 1800
    const contents = allContents[item.id] ?? {}

    // 상단 메타 표 (PPT 14컬럼 영역)
    const META_Y = 12
    const META_H = 33
    pdf.setDrawColor(217, 217, 217)
    pdf.setFillColor(217, 217, 217)
    pdf.rect(8, META_Y, PAGE_W - 16, 7, 'F')
    pdf.setFontSize(7)
    pdf.setTextColor(31, 41, 55)
    const headers = ['NO', '파트', '구분', '장소', '사용목적', '품목', '언어', '규격', '재질', '수량', '내용']
    const colWidths = [12, 22, 24, 28, 30, 28, 16, 24, 24, 12, 100]
    let xCursor = 8
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], xCursor + colWidths[i] / 2, META_Y + 5, { align: 'center' })
      xCursor += colWidths[i]
    }
    // 데이터 행
    pdf.setFontSize(8)
    pdf.setDrawColor(229, 231, 235)
    pdf.rect(8, META_Y + 7, PAGE_W - 16, 7)
    xCursor = 8
    const values = [
      item.no ?? String(pageIdx + 1).padStart(2, '0'),
      item.part ?? '',
      item.category ?? '',
      item.location ?? '',
      item.purpose ?? '',
      item.category ?? '',
      item.language ?? '',
      `${widthMm}×${heightMm}`,
      item.material ?? '',
      String(item.quantity ?? 1),
      Object.values(contents).map(s => [s.ko, s.en].filter(Boolean).join(' / ')).filter(Boolean).join(' · '),
    ]
    for (let i = 0; i < values.length; i++) {
      const text = String(values[i] ?? '')
      const truncated = text.length > 30 ? text.substring(0, 28) + '..' : text
      pdf.text(truncated, xCursor + 1, META_Y + 12, { maxWidth: colWidths[i] - 2 })
      xCursor += colWidths[i]
    }

    // 하단 디자인 영역 (PPT 영역과 동일 비율 유지)
    const DESIGN_Y = META_Y + 14 + 5
    const DESIGN_MAX_H = PAGE_H - DESIGN_Y - 8
    const DESIGN_MAX_W = PAGE_W - 16
    const aspect = widthMm / heightMm
    let finalW = DESIGN_MAX_W
    let finalH = finalW / aspect
    if (finalH > DESIGN_MAX_H) {
      finalH = DESIGN_MAX_H
      finalW = finalH * aspect
    }
    const designX = (PAGE_W - finalW) / 2
    if (item.image_url) {
      try {
        const res = await fetch(item.image_url)
        const blob = await res.blob()
        const reader = new FileReader()
        const dataUrl: string = await new Promise(resolve => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        const fmt = (blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG') as 'PNG' | 'WEBP' | 'JPEG'
        pdf.addImage(dataUrl, fmt, designX, DESIGN_Y, finalW, finalH, undefined, 'FAST')
      } catch (err) {
        console.warn('PDF image load failed for', item.id, err)
      }
    } else {
      // 시안 영역 없을 때 dashed placeholder
      pdf.setDrawColor(203, 213, 225)
      pdf.rect(designX, DESIGN_Y, finalW, finalH)
      pdf.setFontSize(10)
      pdf.setTextColor(148, 163, 184)
      pdf.text('디자이너 작업 영역', PAGE_W / 2, DESIGN_Y + finalH / 2, { align: 'center' })
    }

    // 슬롯 텍스트 영역 (이미지 위에 텍스트 박스)
    pdf.setTextColor(255, 255, 255)
    for (const [, slot] of Object.entries(contents)) {
      const text = [slot.ko, slot.en].filter(Boolean).join('\n')
      if (!text) continue
      const xMm = designX + (slot.x / 100) * finalW
      const yMm = DESIGN_Y + (slot.y / 100) * finalH
      pdf.setFontSize(slot.fontSize ? Math.min(slot.fontSize * 0.6, 18) : 10)
      pdf.text(text, xMm, yMm + 4, { align: 'center', maxWidth: ((slot.w ?? 70) / 100) * finalW })
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  pdf.save(`${project.name}_제작물_${dateStr}.pdf`)
  void logUsage('export_excel', { project_id: project.id, item_count: items.length, action_kind: 'pdf' })
}

// ══════════════════════════════════════════════════════════
// Excel 내보내기 — 명세 10-2: 17컬럼
// NO. | 파트 | 구분 | 장소 | 사용목적 | 품목 | 언어 | 규격(mm) | 재질 | 수량
// 내용 | 비고 | 담당자 | 디자인업체 | 출력업체 | 설치시간 | 철거시간
// ══════════════════════════════════════════════════════════

export async function exportToExcel(
  project: Project,
  items: DesignItem[],
  allContents: Record<string, ContentsMap>
): Promise<void> {
  const XLSX = await import('xlsx')

  // ── 사용자가 EditorGrid에서 편집한 컬럼 상태가 있으면 그대로 사용 ──
  const editorState = loadEditorColState()
  if (editorState) {
    return exportToExcelDynamic(project, items, allContents, editorState, XLSX)
  }

  // 폴백: v9.19 21컬럼 정적 형식
  const HEADERS = [
    'NO.', '파트', '구분', '장소', '사용 목적', '품목', '언어', '규격', '재질', '수량',
    '내용', '디자인업체', '출력업체', '설치일자', '설치시간', '사용기간', '철거일자', '철거시간', '발주 담당자', '발주일', '비고',
  ]


  // 행사 로고 텍스트 (header_brand)
  const logoText = (() => {
    for (const item of items) {
      const hb = allContents[item.id]?.header_brand
      if (hb?.ko) return hb.ko
    }
    return project.client_name ?? ''
  })()

  // 좌상단: "환경 제작물 (행사명)" 병합 / 우상단: 행사 로고
  const titleRow: (string | number)[] = new Array(HEADERS.length).fill('')
  titleRow[0] = `환경 제작물  (${project.name})`
  titleRow[HEADERS.length - 1] = logoText

  // 날짜 자동 채움 (OrderingSchedule 연결)
  const dateCtxFallback = getMilestoneDates(project.id, project.event_date)

  const dataRows = items.map(item => {
    const contents = allContents[item.id] ?? {}
    const dims = item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : ''
    let content = gatherContentText(contents, 'ko')
    if (content === '기본시안' && (item.location || item.purpose)) {
      content = `기본시안 + ${[item.purpose, item.location].filter(Boolean).join(' ')}`
    }
    const remarks: string[] = []
    const auto = detectRemarks(contents)
    if (auto) remarks.push(auto)
    if (item.review_status && item.review_status !== '작업중') remarks.push(`[${item.review_status}]`)
    if (item.review_note) remarks.push(item.review_note)
    const contentValue = item.content_text ?? content

    return [
      item.no ?? '',
      item.part ?? '',
      item.category ?? '',
      item.location ?? '',
      item.purpose ?? '',
      item.category ?? '',
      item.language ?? '',
      dims,
      item.material ?? '',
      item.quantity ?? 1,
      contentValue,
      item.design_vendor ?? '',
      item.print_vendor ?? '',
      item.install_date || dateCtxFallback.installDate,
      item.install_time ?? '',
      item.usage_period ?? '',
      item.uninstall_date || dateCtxFallback.uninstallDate,
      item.uninstall_time ?? '',
      item.order_contact ?? '',
      item.order_date || dateCtxFallback.orderDate,
      remarks.join(' · '),
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([titleRow, HEADERS, ...dataRows])

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 2 } },
    { s: { r: 0, c: HEADERS.length - 1 }, e: { r: 0, c: HEADERS.length - 1 } },
  ]

  ws['!cols'] = [
    { wch: 5 },  { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 8 },  { wch: 12 }, { wch: 10 }, { wch: 6 },
    { wch: 32 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 8 },  { wch: 18 }, { wch: 10 }, { wch: 8 },
    { wch: 14 }, { wch: 10 }, { wch: 14 },
  ]
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '디자인 의뢰 목록')

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  XLSX.writeFile(wb, `제작물리스트_${project.name}_${dateStr}.xlsx`)
  void logUsage('export_excel', { project_id: project.id, item_count: items.length })
}

/** EditorGrid에서 편집된 컬럼 상태(표시·순서·커스텀 컬럼)를 그대로 반영해 엑셀 출력
 *  v8 (2026-05-11): §14-2 정책 — 편집 숨김 ≠ 엑셀 제외.
 *  최종 엑셀은 17컬럼 모두 출력. 사용자가 편집 화면에서 숨긴 컬럼도 엑셀에 포함됨. */
async function exportToExcelDynamic(
  project: Project,
  items: DesignItem[],
  allContents: Record<string, ContentsMap>,
  state: EditorColState,
  XLSX: typeof import('xlsx')
): Promise<void> {
  // v9: 숨김은 무시 (편집 화면용). 사용자가 ′엑셀에서 제외′ 우클릭한 컬럼만 빠짐.
  const visibleColIds = state.order.filter(id => !state.excludedFromExcel.includes(id))
  const headers = visibleColIds.map(id => {
    if (id.startsWith('custom_')) {
      return state.customCols.find(c => c.id === id)?.label ?? id
    }
    return DEFAULT_LABELS[id] ?? id
  })

  // 좌상단 타이틀 + 우상단 로고
  const logoText = (() => {
    for (const item of items) {
      const hb = allContents[item.id]?.header_brand
      if (hb?.ko) return hb.ko
    }
    return project.client_name ?? ''
  })()

  const titleRow: (string | number)[] = new Array(headers.length).fill('')
  titleRow[0] = `환경 제작물  (${project.name})`
  if (headers.length >= 2) titleRow[headers.length - 1] = logoText

  // 5/22 사용자 명시 = "발주 PM" → "발주사" 정정 (협력사 필드 향후 빠지기로 함)
  // 형식: A=라벨 / B=값 (1행 발주사·2행 행사명·3행 설치 장소·4행 행사일)
  const eventDateStr = project.event_date
    ? new Date(project.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const infoRow1: (string | number)[] = new Array(headers.length).fill('')
  infoRow1[0] = '발주사'; infoRow1[1] = 'EZPMP'
  const infoRow2: (string | number)[] = new Array(headers.length).fill('')
  infoRow2[0] = '행사명'; infoRow2[1] = project.name ?? ''
  const infoRow3: (string | number)[] = new Array(headers.length).fill('')
  infoRow3[0] = '설치 장소'; infoRow3[1] = project.event_venue ?? ''
  const infoRow4: (string | number)[] = new Array(headers.length).fill('')
  infoRow4[0] = '행사일'; infoRow4[1] = eventDateStr
  // 5행 = 구분선 (───)
  const separatorRow: (string | number)[] = new Array(headers.length).fill('─').map((_, i) => i === 1 ? '환경 장식물 리스트 구분선' : '───')

  // v4.1 질문 5: 시트 정렬 — 파트 한글 가나다순 → 종류명 가나다순
  const partLabel = (it: DesignItem) => {
    const code = it.program_part?.split(/[,，]/)[0]?.trim()
    return code ? (PROGRAM_PART_BY_CODE.get(code)?.name ?? '￿') : (it.part ?? '￿')
  }
  const sortedItems = [...items].sort((a, b) => {
    const pa = partLabel(a), pb = partLabel(b)
    const pcmp = pa.localeCompare(pb, 'ko')
    if (pcmp !== 0) return pcmp
    return (a.category ?? '').localeCompare(b.category ?? '', 'ko')
  })

  // 날짜 자동 채움 (OrderingSchedule 연결)
  const dateCtx = getMilestoneDates(project.id, project.event_date)

  // 데이터 행
  const dataRows = sortedItems.map(item => {
    const contents = allContents[item.id] ?? {}
    return visibleColIds.map(colId => getCellValue(colId, item, contents, state.customValues, sortedItems, dateCtx))
  })

  // 5/20 노션 §6 정합 = titleRow + 상단 3행 + 구분선 + headers + 데이터
  const ws = XLSX.utils.aoa_to_sheet([titleRow, infoRow1, infoRow2, infoRow3, infoRow4, separatorRow, headers, ...dataRows])

  // 좌상단·우상단 병합 (행 0 = 환경 제작물 / 행 5 = headers 시작)
  if (headers.length >= 3) {
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 2 } },
      { s: { r: 0, c: headers.length - 1 }, e: { r: 0, c: headers.length - 1 } },
    ]
  }

  // 컬럼 너비 — 본문 길이 컬럼은 넓게
  // v9.3 회의록: ′내용 너무 길다′ — 내용/사용기간 넓게, 짧은 컬럼 좁게
  ws['!cols'] = visibleColIds.map(id => {
    if (id === 'content') return { wch: 32 }                                          // 내용
    if (id === 'ko_text' || id === 'en_text') return { wch: 28 }
    if (id === 'usage_period') return { wch: 18 }                                     // 사용기간 (12/12~12/18 형식)
    if (id === 'location' || id === 'purpose' || id === 'supplier') return { wch: 14 }
    if (id === 'note' || id === 'order_contact') return { wch: 14 }
    if (id === 'editor' || id === 'category' || id === 'material') return { wch: 11 }
    if (id === 'type_kind' || id === 'install_date' || id === 'uninstall_date' || id === 'order_date') return { wch: 10 }
    if (id === 'install_time' || id === 'uninstall_time') return { wch: 8 }
    if (id === 'no' || id === 'quantity') return { wch: 5 }
    if (id.startsWith('custom_')) return { wch: 12 }
    return { wch: 10 }
  })
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '디자인 의뢰 목록')

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  XLSX.writeFile(wb, `제작물리스트_${project.name}_${dateStr}.xlsx`)
  void logUsage('export_excel', { project_id: project.id, item_count: items.length })
}
