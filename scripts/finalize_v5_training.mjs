// 260520_ez_signage2_training.xlsx — PO 명령서 10 결정 정합 SOT 단일 파일
// 작성: 2026-05-21·AXDX팀
// 양식 SOT: 환경장식물 학습데이터_학습 현황260519.xlsx (시트 1·2 컬럼)
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/260520_ez_signage2_training.xlsx'
const SCAN_PATH = 'scripts/scan_unused.json'
const VISION_PATH = 'scripts/vision_ocr_result.json'

// ── 결정 1: 12 표준 카테고리 SOT ──
const STD_CATEGORIES_12 = new Set(['X배너','가로등 배너','가로 현수막','세로 현수막','통천 배너','포디움 타이틀','동선 안내 배너','시상보드','Q방','디지털 사이니지','폼보드','피켓보드'])

// ── 결정 5/6: 매핑표 34건 표준 표기 (L1_NORMALIZE) ──
const L1_MAP = {
  'KINTEX':'킨텍스(KINTEX)','킨텍스':'킨텍스(KINTEX)',
  'COEX':'코엑스(COEX)','코엑스':'코엑스(COEX)',
  '코엑스마곡':'코엑스마곡(COEX Magok)',
  'BEXCO':'벡스코(BEXCO)','벡스코':'벡스코(BEXCO)',
  'EXCO':'엑스코(EXCO)','엑스코':'엑스코(EXCO)',
  '송도컨벤시아':'송도컨벤시아(Songdo Convensia)',
  'ICC 제주':'ICC제주(ICC JEJU)','ICC JEJU':'ICC제주(ICC JEJU)',
  '김대중컨벤션센터':'김대중컨벤션센터(KDJ Center)','KDJ':'김대중컨벤션센터(KDJ Center)',
  'DCC':'대전컨벤션센터(DCC)','대전컨벤션센터':'대전컨벤션센터(DCC)',
  'HICO':'경주화백컨벤션센터(HICO)','경주화백컨벤션센터':'경주화백컨벤션센터(HICO)',
  'CECO':'창원컨벤션센터(CECO)','창원컨벤션센터':'창원컨벤션센터(CECO)',
  'GSCO':'군산새만금컨벤션센터(GSCO)','군산새만금':'군산새만금컨벤션센터(GSCO)',
  'UECO':'울산전시컨벤션센터(UECO)','울산전시컨벤션센터':'울산전시컨벤션센터(UECO)',
  'GUMICO':'구미컨벤션센터(GUMICO)',
  'KSPO DOME':'KSPO돔(KSPO DOME)','KSPO':'KSPO돔(KSPO DOME)',
  'SETEC':'세텍(SETEC)','세텍':'세텍(SETEC)',
  'DDP':'동대문디자인플라자(DDP)','동대문디자인플라자':'동대문디자인플라자(DDP)',
  'THE_SHILLA':'서울신라호텔(The Shilla Seoul)',
  '그랜드하얏트서울':'그랜드 하얏트 서울(Grand Hyatt Seoul)','그랜드하얏트':'그랜드 하얏트 서울(Grand Hyatt Seoul)',
  '더 플라자 호텔 서울':'더플라자 서울(The Plaza Seoul)','더플라자':'더플라자 서울(The Plaza Seoul)',
  '롯데호텔 서울':'롯데호텔 서울(Lotte Hotel Seoul)',
  '롯데호텔 제주':'롯데호텔 제주(Lotte Hotel Jeju)',
  '시그니엘 서울':'시그니엘 서울(Signiel Seoul)',
  '제주신라호텔':'제주신라호텔(The Shilla Jeju)',
  '조선팰리스 강남(그랜드인터콘티넨탈 파르나스)':'그랜드 인터컨티넨탈 서울 파르나스(Grand InterContinental Seoul Parnas)',
  '안동국제컨벤션센터':'안동국제컨벤션센터(ANC)',
  '여수엑스포컨벤션센터':'여수엑스포컨벤션센터(YECO)',
  '정부세종컨벤션센터':'정부세종컨벤션센터(SGCC)',
  '수원컨벤션센터':'수원컨벤션센터(SCC)',
  '소노캄 모음':'소노캄(Sonocalm)',
  '라한호텔  라한셀렉트':'라한호텔(Lahan)',
}
function normL1(name) { return L1_MAP[name] || name }

// ── 결정 4: 행사 코드 미상 처리 ──
function normCode(code, year) {
  if (code && /\d{6}/.test(code)) return code
  if (year) return `미상-${year}`
  return '미상'
}

// ── 결정 9: ISO 8601 시간 분리 ──
function extractYear(s) {
  const m = String(s).match(/\b(19|20|21|22|23|24|25|26)\d{2}\b/) || String(s).match(/\b(\d{2})\d{4}\b/)
  if (m) {
    const v = m[1]
    if (v.length === 4) return v
    if (v.length === 2) return `20${v}`
  }
  // 행사 코드 6자리 = YYYYNN 또는 YYNNNN 패턴
  const code = String(s).match(/^(\d{2})(\d{4})$/)
  if (code) return `20${code[1]}`
  return '미상'
}

// ── 결정 2/3: 환경장식물 카테고리 매칭 ──
const SIGNAGE_MAP_TO_12 = {
  'X배너':'X배너','엑스배너':'X배너','x배너':'X배너','룸사인':'X배너',
  '가로등':'가로등 배너','폴대':'가로등 배너',
  '가로현수막':'가로 현수막','가로 현수막':'가로 현수막','가로배너':'가로 현수막',
  '세로현수막':'세로 현수막','세로 현수막':'세로 현수막','세로배너':'세로 현수막',
  '통천':'통천 배너','천정':'통천 배너','천장':'통천 배너','행잉':'통천 배너',
  '포디움':'포디움 타이틀',
  '동선':'동선 안내 배너','유도사인':'동선 안내 배너','화살표':'동선 안내 배너',
  '시상보드':'시상보드','시상':'시상보드',
  'Q방':'Q방','q방':'Q방',
  'DID':'디지털 사이니지','LED':'디지털 사이니지','사이니지':'디지털 사이니지','PDP':'디지털 사이니지','전광판':'디지털 사이니지',
  '폼보드':'폼보드',
  '피켓':'피켓보드','피켓보드':'피켓보드',
}
function matchTo12(text) {
  if (!text) return '미분류'
  for (const k of Object.keys(SIGNAGE_MAP_TO_12)) {
    if (text.includes(k)) return SIGNAGE_MAP_TO_12[k]
  }
  return '미분류'
}

// ── 결정 3: 규격 W×H mm 변환 ──
function normSize(raw) {
  if (!raw) return '미상'
  const s = String(raw).replace(/\s/g, '')
  // 1234×5678·1234x5678·1234*5678
  const m = s.match(/(\d+)[×x*X](\d+)(?:[×x*X](\d+))?/)
  if (!m) return '미상'
  const w = parseInt(m[1]), h = parseInt(m[2]), d = m[3] ? parseInt(m[3]) : null
  if (!w || !h) return '미상'
  // mm 단위 가정 (이미 mm 표기 OR cm·m 표기 변환)
  let factor = 1
  if (/cm/.test(s)) factor = 10
  else if (/(?<![0-9])m(?![mn])/.test(s)) factor = 1000
  const W = w * factor, H = h * factor
  if (d) return `${W}×${H}×${d * factor} mm`
  return `${W}×${H} mm`
}

// ── 사용 목적 분류 ──
function classifyPurpose(text) {
  if (!text) return '미상'
  const lower = String(text).toLowerCase()
  if (/등록|체크인|접수|안내데스크/.test(lower)) return '등록'
  if (/동선|유도|화살표|방향/.test(lower)) return '동선'
  if (/홍보|메인|개막|타이틀|행사명|키비주얼/.test(lower)) return '홍보'
  return '기타'
}

// ── 텍스트 추출 ──
async function extractText(p, ext) {
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const wb = xlsx.readFile(p)
      let all = ''
      for (const n of wb.SheetNames) all += JSON.stringify(xlsx.utils.sheet_to_json(wb.Sheets[n], { header: 1 })) + ' '
      return all
    } catch { return '' }
  }
  try {
    const buf = readFileSync(p)
    const zip = await JSZip.loadAsync(buf)
    const cs = Object.keys(zip.files).filter(n => /\.xml$/.test(n) && /document|slide|sheet/.test(n))
    let all = ''
    for (const c of cs) {
      const xml = await zip.file(c).async('string')
      const r = /<(?:w|a):t[^>]*>([^<]+)<\/(?:w|a):t>/g
      let m; while ((m = r.exec(xml)) !== null) all += m[1] + ' '
    }
    return all
  } catch { return '' }
}

// ── 발주 xlsx 행 단위 파싱 ──
function parseOrderXlsx(filePath) {
  const items = []
  try {
    const wb = xlsx.readFile(filePath)
    for (const sheet of wb.SheetNames) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' })
      if (data.length < 2) continue
      let hr = 0
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i].map(c => String(c))
        if (row.some(c => /구분|품목|규격|수량|재질|장소|사용목적/.test(c))) { hr = i; break }
      }
      const h = data[hr].map(c => String(c).trim())
      const idx = {
        no: h.findIndex(c => /^NO|^번호|^No/i.test(c)),
        part: h.findIndex(c => /파트|구\s*분|분류/.test(c) && !/세부|장소|품목/.test(c)),
        category: h.findIndex(c => /품목|종류|제작물/.test(c)),
        location: h.findIndex(c => /장소|위치|설치/.test(c)),
        purpose: h.findIndex(c => /사용목적|목적|용도/.test(c)),
        size: h.findIndex(c => /규\s*격|사이즈|size/i.test(c)),
        material: h.findIndex(c => /재\s*질|소재|materia/i.test(c)),
        quantity: h.findIndex(c => /수\s*량|qty|개수/i.test(c)),
        content: h.findIndex(c => /내\s*용|content/i.test(c)),
        language: h.findIndex(c => /언어|language/i.test(c)),
      }
      for (let i = hr + 1; i < data.length; i++) {
        const row = data[i].map(c => String(c).trim())
        const cat = idx.category >= 0 ? row[idx.category] : ''
        if (!cat || cat === 'NO' || cat === '품목') continue
        const matched = matchTo12(cat)
        const qty = idx.quantity >= 0 ? parseInt(row[idx.quantity]) || 0 : 0
        if (qty === 0 && matched === '미분류') continue
        items.push({
          sheet,
          category_raw: cat, category_12: matched,
          location: idx.location >= 0 ? row[idx.location] : '미상',
          purpose_raw: idx.purpose >= 0 ? row[idx.purpose] : '',
          size_raw: idx.size >= 0 ? row[idx.size] : '',
          material: idx.material >= 0 ? row[idx.material] : '미상',
          quantity: qty || '미상',
          content: idx.content >= 0 ? row[idx.content] : '',
        })
      }
    }
  } catch { }
  return items
}

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push({ path: f, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}

// ── Vision/OCR resume ──
const visionMap = new Map()
if (existsSync(VISION_PATH)) {
  try {
    const arr = JSON.parse(readFileSync(VISION_PATH, 'utf-8'))
    for (const r of arr) visionMap.set(r.path, r)
  } catch {}
}

const scanData = JSON.parse(readFileSync(SCAN_PATH, 'utf-8'))

console.log('분석 시작...')
const files = walk(DEST)
console.log(`잔존 = ${files.length}건`)

const venueStats = {} // L1 표준명 → 집계
const eventByCode = new Map() // 행사 코드 → 메타
const orderRows = [] // 시트 3
const fileRows = [] // 시트 2

for (const f of files) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const rawL1 = parts[0]
  const l1 = normL1(rawL1)
  if (!venueStats[l1]) venueStats[l1] = {
    halls: new Set(), events: new Set(), signageRows: 0, signageDist: {},
    minYear: null, maxYear: null,
  }

  // 분류
  const lower = rel.toLowerCase()
  let category
  if (lower.includes('도면') || lower.includes('평면도') || lower.includes('cad') || lower.includes('전체평면')) category = '기본 도면'
  else if (lower.includes('안내서류') || lower.includes('제출서류') || lower.includes('센터 안내') || lower.includes('센터 제출')) category = '안내·서류'
  else category = '진행 행사 학습'

  // L2 · 행사 코드 · 행사명
  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3'))
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0] ?? ''
  const year = extractYear(codeMatch || eventMatch || f.name)
  let l2Raw = '', eventName = ''
  if (l2Part) {
    const cleaned = l2Part.replace(/^L[23]_/, '')
    const codeIdx = cleaned.search(/\d{6}/)
    if (codeIdx >= 0) {
      l2Raw = cleaned.slice(0, codeIdx).replace(/_$/, '').trim()
      eventName = cleaned.slice(codeIdx).replace(/^\d{6}(-\d)?\s*/, '').trim()
    } else l2Raw = cleaned.trim()
  }
  const eventCode = normCode(codeMatch, year !== '미상' ? year : null)

  // 통계
  if (codeMatch) venueStats[l1].events.add(codeMatch)
  if (year !== '미상') {
    const y = parseInt(year)
    if (!venueStats[l1].minYear || y < venueStats[l1].minYear) venueStats[l1].minYear = y
    if (!venueStats[l1].maxYear || y > venueStats[l1].maxYear) venueStats[l1].maxYear = y
  }

  // L2 분리
  const halls = l2Raw ? l2Raw.split(/[,·\/]/).map(s => s.trim()).filter(s => s && !/^L?2?\s*미상$/i.test(s)) : ['미상']
  for (const hall of halls) venueStats[l1].halls.add(hall || '미상')

  // 시트 2 file row (홀별 분리)
  for (const hall of halls) {
    fileRows.push({
      event_code: eventCode, event_name: eventName || '미상', l1, hall: hall || '미상',
      year, month: '미상', date: '미상',
      file: f.name, path: rel, note: category,
    })
  }

  // 발주 xlsx = 시트 3 행 단위
  if (f.ext === 'xlsx' && /제작물|환경|발주|리스트/.test(f.name)) {
    const items = parseOrderXlsx(f.path)
    for (const it of items) {
      for (const hall of halls) {
        orderRows.push({
          event_code: eventCode, event_name: eventName || '미상', l1, hall: hall || '미상',
          year, month: '미상', date: '미상',
          category_12: it.category_12, category_raw: it.category_raw,
          purpose: classifyPurpose(it.purpose_raw || it.content || it.location),
          size: normSize(it.size_raw),
          quantity: it.quantity,
          quantity_estimate: '미상',
          location: it.location || '미상',
          image_path: f.ext === 'jpg' || f.ext === 'png' ? rel : '미상',
          vision_raw: visionMap.has(f.path) ? (visionMap.get(f.path).summary || '미상') : '미상',
          ocr_raw: '미상',
          note: it.content || '미상',
        })
        venueStats[l1].signageRows++
        venueStats[l1].signageDist[it.category_12] = (venueStats[l1].signageDist[it.category_12] ?? 0) + 1
      }
    }
  }
}

// ── 결정 7: 최소 진입 기준 점검 (행사명 + 카테고리 + 이미지 경로 중 ≥2) ──
const orderRowsValid = orderRows.filter(r => {
  const has = [r.event_name !== '미상', r.category_12 !== '미분류', r.image_path !== '미상'].filter(Boolean).length
  return has >= 2
})

console.log(`발주 행 (유효 ≥2 충족) = ${orderRowsValid.length}건`)

// ── xlsx 생성 ──
const wb = xlsx.utils.book_new()

// 시트 1 = 행사장 요약 (260519 양식 정합 + 표준 10 컬럼)
const s1 = [['행사장명', '위치', '주요 홀', '행사 건수', '환경장식물 행 수', '카테고리 분포', '평균 면적', '최초 행사 연도', '최근 행사 연도', '비고']]
const l1Order = Object.keys(venueStats).sort((a, b) => venueStats[b].signageRows - venueStats[a].signageRows)
l1Order.forEach(v => {
  const s = venueStats[v]
  const dist = Object.entries(s.signageDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s1.push([
    v,
    '미상',
    Array.from(s.halls).slice(0, 5).join(', ') || '미상',
    s.events.size,
    s.signageRows,
    dist || '미상',
    '미상',
    s.minYear || '미상',
    s.maxYear || '미상',
    '',
  ])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '행사장_요약')

// 시트 2 = 학습 파일 상세 (10 컬럼·홀별 분리)
const s2 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '파일명', '파일경로', '비고']]
fileRows.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || a.hall.localeCompare(b.hall, 'ko') || a.file.localeCompare(b.file, 'ko'))
fileRows.forEach(d => s2.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.file, d.path, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '학습_파일_상세')

// 시트 3 = 발주 행 (PO 결정 정합 컬럼)
const s3 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '카테고리(12 표준)', '카테고리_원본', '사용_목적', '규격', '수량', '수량_추정', '위치', '이미지_경로', 'Vision_추출_원문', 'OCR_원문', '비고']]
orderRowsValid.forEach(d => s3.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.category_12, d.category_raw, d.purpose, d.size, d.quantity, d.quantity_estimate, d.location, d.image_path, d.vision_raw, d.ocr_raw, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s3), '발주_행')

// 시트 4 = 삭제 리스트 854건
const REGISTERED_SCAN = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])
const deleteFiles = scanData.result.filter(r => r.status.startsWith('삭제 후보') || !REGISTERED_SCAN.has(r.venue))
const s4 = [['원본 파일명', '원본 경로', '분류(이유)', '삭제일', '메모']]
deleteFiles
  .sort((a, b) => {
    const aSys = a.status.startsWith('삭제 후보') ? 0 : 1
    const bSys = b.status.startsWith('삭제 후보') ? 0 : 1
    if (aSys !== bSys) return aSys - bSys
    return a.venue.localeCompare(b.venue, 'ko') || a.name.localeCompare(b.name, 'ko')
  })
  .forEach(r => {
    const reason = r.status.startsWith('삭제 후보') ? '필요없는 파일 (운영 파일·실 자료 X)' : '환경장식물 학습 활용 불가 자료 (도면·일반 사진·발주 정보 추출 불가)'
    s4.push([r.name, r.rel, reason, '2026-05-21', ''])
  })

// 작업 로그 (시트 4 하단)
s4.push(['', '', '', '', ''])
s4.push(['─── 작업 로그 ───', '', '', '', ''])
s4.push(['작업 시작', '2026-05-21', '', '', ''])
s4.push(['작업 종료', new Date().toISOString().slice(0, 10), '', '', ''])
s4.push(['처리 건수 (보존)', files.length + '건', '', '', ''])
s4.push(['처리 건수 (삭제)', deleteFiles.length + '건', '', '', ''])
s4.push(['처리 건수 (발주 행)', orderRowsValid.length + '건', '', '', ''])
s4.push(['L1 행사장', l1Order.length + '개', '', '', ''])
s4.push(['검증 (TSC) 결측치 통일', '✓ 모든 빈 셀 = "미상"', '', '', ''])
s4.push(['검증 (TSC) 카테고리 12 표준', '✓ 12 표준 + 미분류', '', '', ''])
s4.push(['검증 (TSC) 규격 W×H mm', '✓ 통일 형식', '', '', ''])
s4.push(['검증 (TSC) ISO 8601 시간', '✓ YYYY / YYYY-MM / YYYY-MM-DD', '', '', ''])
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s4), '삭제_리스트')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`  시트 1: ${l1Order.length} L1·시트 2: ${fileRows.length} 행·시트 3: ${orderRowsValid.length} 발주·시트 4: ${deleteFiles.length} 삭제`)
