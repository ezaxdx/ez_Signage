import type { Project, DesignItem, ContentsMap } from '@/lib/types'
import { PROGRAM_PART_BY_CODE } from '@/lib/programParts'

const DEFAULT_SLOT_ORDER = ['header_brand', 'hero_title', 'sub_title', 'body', 'arrow', 'qr_code', 'footer_credits']

// ── EditorGrid 컬럼 상태 (localStorage) — 엑셀/PDF 내보내기 시 동기화 ──
// v8 (2026-05-11): 1차안 17컬럼 복원 — purpose=′사용 목적′, content=′내용′(content_text), 신규 4컬럼 추가
const COLS_STORAGE_KEY = 'mice_editor_grid_cols_v9'
type EditorColumnId = 'no' | 'part' | 'bigarea' | 'location' | 'purpose' | 'content' | 'category' | 'language' | 'size' | 'material' | 'quantity' | 'ko_text' | 'en_text' | 'note' | 'editor' | 'design_vendor' | 'print_vendor' | 'install_time' | 'uninstall_time' | string
interface EditorCustomCol { id: EditorColumnId; label: string; width: string; field: string | null; custom?: boolean }
interface EditorColState {
  order: EditorColumnId[]
  hidden: EditorColumnId[]
  excludedFromExcel: EditorColumnId[]   // v9: §14-3 사용자별 엑셀 제외
  excludedFromPpt: EditorColumnId[]     // v9: §14-3 사용자별 PPT 제외
  customCols: EditorCustomCol[]
  customValues: Record<string, Record<string, string>>
}

// v8: 1차안 17컬럼 헤더 복원
// - purpose는 '사용 목적'으로 환원 (v4.1 단위 4의 '내용' 의미 변경 되돌림)
// - content는 별도 content_text 필드 매핑
const DEFAULT_LABELS: Record<EditorColumnId, string> = {
  no: 'NO.', part: '파트', bigarea: '구분', location: '장소', purpose: '사용 목적',
  content: '내용', category: '품목', language: '언어', size: '규격(mm)', material: '재질',
  quantity: '수량', ko_text: '국문 시안', en_text: '영문 시안', note: '비고', editor: '담당자',
  design_vendor: '디자인업체', print_vendor: '출력업체',
  install_time: '설치시간', uninstall_time: '철거시간',
}

// 1차안 17컬럼 (no/part/bigarea/location/purpose/category/language/size/material/quantity/content/note/editor + design_vendor/print_vendor/install_time/uninstall_time)
const DEFAULT_ORDER: EditorColumnId[] = [
  'no', 'part', 'bigarea', 'location', 'purpose', 'category', 'language',
  'size', 'material', 'quantity', 'content', 'note', 'editor',
  'design_vendor', 'print_vendor', 'install_time', 'uninstall_time',
]

function loadEditorColState(): EditorColState | null {
  if (typeof window === 'undefined') return null
  try {
    // v9 우선, 미존재 시 v8 1회성 폴백 (EditorGrid가 마이그레이션 저장 전에 호출될 수 있음)
    const raw = localStorage.getItem(COLS_STORAGE_KEY) ?? localStorage.getItem('mice_editor_grid_cols_v8')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EditorColState>
    return {
      order: parsed.order ?? DEFAULT_ORDER,
      hidden: parsed.hidden ?? [],
      excludedFromExcel: parsed.excludedFromExcel ?? [],
      excludedFromPpt: parsed.excludedFromPpt ?? [],
      customCols: parsed.customCols ?? [],
      customValues: parsed.customValues ?? {},
    }
  } catch { return null }
}

/** 컬럼 ID + 행 데이터 → 셀 값 변환
 *
 * v4.1 단위 4 (2026-05-07):
 *   - 'bigarea' (구분): 같은 카테고리 항목이 2개 이상일 때 자동 #N suffix ("X-배너 #1")
 *   - 'purpose' (사용목적): 회의 결정으로 "내용" 의미 — 사용자 자유 텍스트 그대로 출력
 */
function getCellValue(
  colId: EditorColumnId,
  item: DesignItem,
  contents: ContentsMap,
  customValues: Record<string, Record<string, string>>,
  items?: DesignItem[],
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
    // v8: 신규 4컬럼
    case 'design_vendor':  return item.design_vendor ?? ''
    case 'print_vendor':   return item.print_vendor ?? ''
    case 'install_time':   return item.install_time ?? ''
    case 'uninstall_time': return item.uninstall_time ?? ''
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
    options: { fill: 'D9D9D9', bold: true, align: 'center' as const, fontSize: 7, fontFace: 'Malgun Gothic' },
  })
  const cellOpts = (text: string, align: 'center' | 'left' = 'center') => ({
    text,
    options: { align, fontSize: 8, fontFace: 'Malgun Gothic' },
  })

  // 행사 로고 텍스트 (header_brand 슬롯의 ko 텍스트)
  const logoText = (() => {
    for (const item of items) {
      const hb = allContents[item.id]?.header_brand
      if (hb?.ko) return hb.ko
    }
    return project.client_name ?? ''
  })()

  for (const item of items) {
    const contents = allContents[item.id] ?? {}
    const widthMm  = item.width_mm  ?? 600
    const heightMm = item.height_mm ?? 1800
    const aspectRatio = widthMm / heightMm

    const slide = pptx.addSlide()
    slide.background = { color: 'F8FAFC' }

    // ── 좌상단: 환경 제작물 / (행사명) ─────────────────────
    slide.addText(
      [
        { text: '환경 제작물', options: { fontSize: 14, bold: true, color: '1E293B' } },
        { text: '\n', options: { breakLine: true } },
        { text: `(${project.name})`, options: { fontSize: 10, color: '64748B' } },
      ],
      {
        x: MARGIN, y: TITLE_Y, w: TABLE_W * 0.65, h: 0.45,
        fontFace: 'Malgun Gothic', valign: 'top',
      }
    )

    // ── 우상단: 행사 로고 ─────────────────────────────────
    if (logoText) {
      slide.addText(logoText, {
        x: MARGIN + TABLE_W * 0.65, y: TITLE_Y, w: TABLE_W * 0.35, h: 0.45,
        fontSize: 11, bold: true, color: '6366F1', align: 'right', valign: 'middle',
        fontFace: 'Malgun Gothic',
      })
    }

    // ── 메타 테이블 (PPT 14컬럼 — §14-3 담당자/디자인업체/출력업체 제외) ──
    const slotContentKo = [gatherContentText(contents, 'ko'), gatherContentText(contents, 'en')]
      .filter(Boolean).join(' / ').slice(0, 120)
    const contentValue = item.content_text ?? slotContentKo  // v8: content_text 우선
    const remarks = detectRemarks(contents)

    slide.addTable(
      [
        [
          headerOpts('NO'),
          headerOpts('파트'),
          headerOpts('구분'),
          headerOpts('장소'),
          headerOpts('사용 목적'),
          headerOpts('품목'),
          headerOpts('언어'),
          headerOpts('규격(mm)'),
          headerOpts('재질'),
          headerOpts('수량'),
          headerOpts('내용'),
          headerOpts('비고'),
          headerOpts('설치시간'),
          headerOpts('철거시간'),
        ],
        [
          cellOpts(item.no ?? ''),
          cellOpts(item.part ?? ''),
          cellOpts(item.category ?? ''),  // 구분 = 제작물 종류 (명세 10-2)
          cellOpts(item.location ?? ''),  // 장소 = 실제 설치 위치
          cellOpts(item.purpose ?? ''),   // v8: '사용 목적' 환원
          cellOpts(item.category ?? ''),  // 품목 = 구분과 동일 (명세)
          cellOpts(item.language ?? ''),
          cellOpts(`${widthMm}×${heightMm}`),
          cellOpts(item.material ?? ''),
          cellOpts(String(item.quantity ?? 1)),
          cellOpts(contentValue, 'left'),
          cellOpts(remarks),
          cellOpts(item.install_time ?? ''),
          cellOpts(item.uninstall_time ?? ''),
        ],
      ],
      {
        x: MARGIN,
        y: TABLE_Y,
        w: TABLE_W,
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

export async function exportToPDF(
  project: Project,
  items: DesignItem[],
  allContents: Record<string, ContentsMap>
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  // 첫 아이템 규격으로 PDF 시작 (각 페이지마다 규격 다를 수 있어 동적 생성)
  const first = items[0]
  if (!first) return

  const pdf = new jsPDF({
    orientation: (first.width_mm ?? 0) > (first.height_mm ?? 0) ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [first.width_mm ?? 600, first.height_mm ?? 1800],
    compress: true,
  })

  for (let pageIdx = 0; pageIdx < items.length; pageIdx++) {
    const item = items[pageIdx]
    const widthMm = item.width_mm ?? 600
    const heightMm = item.height_mm ?? 1800
    const contents = allContents[item.id] ?? {}

    if (pageIdx > 0) {
      pdf.addPage(
        [widthMm, heightMm],
        widthMm > heightMm ? 'landscape' : 'portrait'
      )
    }

    // 배경 이미지 (있다면 채우기)
    if (item.image_url) {
      try {
        // CORS 회피를 위해 fetch + base64 변환
        const res = await fetch(item.image_url)
        const blob = await res.blob()
        const reader = new FileReader()
        const dataUrl: string = await new Promise(resolve => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        pdf.addImage(dataUrl, 'WEBP', 0, 0, widthMm, heightMm, undefined, 'FAST')
      } catch (err) {
        console.warn('PDF image load failed for', item.id, err)
      }
    }

    // 슬롯 텍스트 — % 좌표 → mm 변환
    pdf.setTextColor(255, 255, 255)
    for (const [, slot] of Object.entries(contents)) {
      const text = [slot.ko, slot.en].filter(Boolean).join('\n')
      if (!text) continue
      const xMm = (slot.x / 100) * widthMm
      const yMm = (slot.y / 100) * heightMm
      const fontSizeMm = ((slot.fontSize || 16) * 0.3528)  // pt → mm
      pdf.setFontSize(slot.fontSize || 16)
      pdf.text(text, xMm, yMm + fontSizeMm, { align: 'center', maxWidth: ((slot.w ?? 70) / 100) * widthMm })
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  pdf.save(`${project.name}_제작물_${dateStr}.pdf`)
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

  // 폴백: 기존 17컬럼 정적 형식
  const HEADERS = [
    'NO.', '파트', '구분', '장소', '사용목적', '품목', '언어', '규격(mm)', '재질', '수량',
    '내용', '비고', '담당자', '디자인업체', '출력업체', '설치시간', '철거시간',
  ]


  // 행사 로고 텍스트 (header_brand)
  const logoText = (() => {
    for (const item of items) {
      const hb = allContents[item.id]?.header_brand
      if (hb?.ko) return hb.ko
    }
    return project.client_name ?? ''
  })()

  // 좌상단: "환경 제작물 (행사명)" (1~15열 병합) / 우상단: 행사 로고 (16~17열 병합)
  const logoStartCol = HEADERS.length - 2  // 15 → '디자인업체' 시작부터
  const titleRow: (string | number)[] = new Array(HEADERS.length).fill('')
  titleRow[0] = `환경 제작물  (${project.name})`
  titleRow[logoStartCol] = logoText

  const dataRows = items.map(item => {
    const contents = allContents[item.id] ?? {}
    const dims = item.width_mm && item.height_mm ? `${item.width_mm}×${item.height_mm}` : ''
    // 내용: "기본시안 + body내용 + 장소·용도" — 본문 비어있을 때는 location/purpose로 힌트
    let content = gatherContentText(contents, 'ko')
    if (content === '기본시안' && (item.location || item.purpose)) {
      const extras = [item.purpose, item.location].filter(Boolean).join(' ')
      content = `기본시안 + ${extras}`
    }
    const editor = item.last_edited_by ? item.last_edited_by.split('@')[0] : ''

    // 비고: 화살표/QR/시안수정 + 검수상태
    const remarks: string[] = []
    const auto = detectRemarks(contents)
    if (auto) remarks.push(auto)
    if (item.review_status && item.review_status !== '작업중') remarks.push(`[${item.review_status}]`)
    if (item.review_note) remarks.push(item.review_note)

    // v8: '내용' 컬럼은 content_text 우선, 없으면 슬롯 합산 텍스트
    const contentValue = item.content_text ?? content

    return [
      item.no ?? '',
      item.part ?? '',
      item.category ?? '',   // 구분 = 제작물 종류 (명세 10-2)
      item.location ?? '',   // 장소 = 실제 설치 위치
      item.purpose ?? '',    // v8: '사용 목적'으로 환원
      item.category ?? '',   // 품목 = 구분과 동일 (명세)
      item.language ?? '',
      dims,
      item.material ?? '',
      item.quantity ?? 1,
      contentValue,
      remarks.join(' · '),
      editor,
      // v8 신규 4컬럼 (편집 숨김이어도 최종 엑셀엔 출력 — §14-2)
      item.design_vendor ?? '',
      item.print_vendor ?? '',
      item.install_time ?? '',
      item.uninstall_time ?? '',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([titleRow, HEADERS, ...dataRows])

  // 좌상단 병합 (환경 제작물 + 행사명)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 3 } },
    { s: { r: 0, c: HEADERS.length - 2 }, e: { r: 0, c: HEADERS.length - 1 } },
  ]

  ws['!cols'] = [
    { wch: 5 },  { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 8 },  { wch: 12 }, { wch: 10 }, { wch: 6 },
    { wch: 36 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 },
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

  // 데이터 행
  const dataRows = sortedItems.map(item => {
    const contents = allContents[item.id] ?? {}
    return visibleColIds.map(colId => getCellValue(colId, item, contents, state.customValues, sortedItems))
  })

  const ws = XLSX.utils.aoa_to_sheet([titleRow, headers, ...dataRows])

  // 좌상단·우상단 병합
  if (headers.length >= 3) {
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 2 } },
      { s: { r: 0, c: headers.length - 1 }, e: { r: 0, c: headers.length - 1 } },
    ]
  }

  // 컬럼 너비 — 본문 길이 컬럼은 넓게
  ws['!cols'] = visibleColIds.map(id => {
    if (id === 'ko_text' || id === 'en_text') return { wch: 36 }
    if (id === 'note' || id === 'location' || id === 'purpose') return { wch: 16 }
    if (id === 'editor' || id === 'category' || id === 'material') return { wch: 12 }
    if (id === 'no' || id === 'quantity') return { wch: 6 }
    if (id.startsWith('custom_')) return { wch: 14 }
    return { wch: 10 }
  })
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '디자인 의뢰 목록')

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  XLSX.writeFile(wb, `제작물리스트_${project.name}_${dateStr}.xlsx`)
  void logUsage('export_excel', { project_id: project.id, item_count: items.length })
}
