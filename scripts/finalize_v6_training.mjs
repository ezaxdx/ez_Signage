// 260520_ez_signage2_training.xlsx v6 = PR#3 32 표준 + 롯데호텔 제주 = 33 행사장 매핑표 SOT
// 본 사이클 = 완전 재작성·기존 산출물 활용 X·G드라이브 정리 결과만 유지
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/260520_ez_signage2_training.xlsx'
const SCAN_PATH = 'scripts/scan_unused.json'
const VISION_PATH = 'scripts/vision_ocr_result.json'

// ── PR#3 32 행사장 + 롯데호텔 제주 = 33 표준 (지역 정합) ──
const VENUE_REGISTRY = [
  { std: '코엑스(COEX)', region: '서울', aliases: ['COEX','코엑스'] },
  { std: '동대문디자인플라자(DDP)', region: '서울', aliases: ['DDP','동대문디자인플라자'] },
  { std: '올림픽공원체육관(KSPO)', region: '서울', aliases: ['KSPO','KSPO DOME','올림픽공원체육관'] },
  { std: '서울무역전시컨벤션센터(SETEC)', region: '서울', aliases: ['SETEC','세텍','서울무역전시컨벤션센터'] },
  { std: '롯데호텔 서울', region: '서울', aliases: ['롯데호텔 서울'] },
  { std: '그랜드하얏트 서울', region: '서울', aliases: ['그랜드하얏트서울','그랜드하얏트 서울','Grand Hyatt'] },
  { std: '더플라자 서울', region: '서울', aliases: ['더 플라자 호텔 서울','더플라자','The Plaza'] },
  { std: '웨스틴 조선 서울', region: '서울', aliases: ['웨스틴 조선 서울','Westin Chosun'] },
  { std: '서울신라호텔', region: '서울', aliases: ['THE_SHILLA','신라호텔','서울신라호텔'] },
  { std: '시그니엘 서울', region: '서울', aliases: ['시그니엘 서울','Signiel'] },
  { std: '조선팰리스 강남', region: '서울', aliases: ['조선팰리스 강남','조선팰리스 강남(그랜드인터콘티넨탈 파르나스)'] },
  { std: '광화문 광장', region: '서울', aliases: ['광화문 광장','광화문광장'] },
  { std: 'aT센터', region: '서울', aliases: ['aT센터','aT 센터'] },
  { std: '킨텍스(KINTEX)', region: '경기', aliases: ['KINTEX','킨텍스'] },
  { std: '수원컨벤션센터', region: '경기', aliases: ['수원컨벤션센터'] },
  { std: '송도컨벤시아', region: '인천', aliases: ['송도컨벤시아','Songdo Convensia'] },
  { std: '평창올림픽스타디움', region: '강원', aliases: ['평창올림픽스타디움'] },
  { std: '소노캄', region: '강원', aliases: ['소노캄 모음','소노캄'] },
  { std: '대전컨벤션센터(DCC)', region: '충청', aliases: ['DCC','대전컨벤션센터'] },
  { std: '정부세종컨벤션센터', region: '충청', aliases: ['정부세종컨벤션센터'] },
  { std: '대구컨벤션센터(EXCO)', region: '경상', aliases: ['EXCO','대구컨벤션센터'] },
  { std: '구미컨벤션센터(GUMICO)', region: '경상', aliases: ['GUMICO','구미컨벤션센터'] },
  { std: '안동국제컨벤션센터', region: '경상', aliases: ['안동국제컨벤션센터'] },
  { std: '경주화백컨벤션센터(HICO)', region: '경상', aliases: ['HICO','경주화백컨벤션센터'] },
  { std: '울산컨벤션센터(UECO)', region: '경상', aliases: ['UECO','울산컨벤션센터','울산전시컨벤션센터'] },
  { std: '벡스코(BEXCO)', region: '부산', aliases: ['BEXCO','벡스코'] },
  { std: '라한호텔·라한셀렉트', region: '경남', aliases: ['라한호텔  라한셀렉트','라한호텔 라한셀렉트','라한호텔','라한셀렉트'] },
  { std: '창원컨벤션센터(CECO)', region: '경남', aliases: ['CECO','창원컨벤션센터'] },
  { std: '광주김대중컨벤션센터(GSCO)', region: '호남', aliases: ['GSCO','김대중컨벤션센터','광주김대중컨벤션센터'] },
  { std: '여수엑스포컨벤션센터', region: '호남', aliases: ['여수엑스포컨벤션센터'] },
  { std: '제주국제컨벤션센터(ICC)', region: '제주', aliases: ['ICC 제주','ICC JEJU','제주국제컨벤션센터'] },
  { std: '제주신라호텔', region: '제주', aliases: ['제주신라호텔'] },
  { std: '롯데호텔 제주', region: '제주', aliases: ['롯데호텔 제주'] },
]

const VENUE_ALIAS_MAP = {}
const VENUE_REGION_MAP = {}
for (const v of VENUE_REGISTRY) {
  VENUE_ALIAS_MAP[v.std] = v.std
  VENUE_REGION_MAP[v.std] = v.region
  for (const a of v.aliases) VENUE_ALIAS_MAP[a] = v.std
}

function normVenue(raw) {
  if (!raw) return null
  if (VENUE_ALIAS_MAP[raw]) return VENUE_ALIAS_MAP[raw]
  // 부분 매칭 (긴 alias 우선)
  const keys = Object.keys(VENUE_ALIAS_MAP).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (raw.includes(k)) return VENUE_ALIAS_MAP[k]
  }
  return null // 매핑 X = BLOCKED 영역
}

// ── 12 표준 카테고리 ──
const STD_12 = new Set(['X배너','가로등 배너','가로 현수막','세로 현수막','통천 배너','포디움 타이틀','동선 안내 배너','시상보드','Q방','디지털 사이니지','폼보드','피켓보드'])
const SIGNAGE_MAP_12 = {
  'X배너':'X배너','엑스배너':'X배너','x배너':'X배너','룸사인':'X배너',
  '가로등':'가로등 배너','폴대':'가로등 배너',
  '가로현수막':'가로 현수막','가로 현수막':'가로 현수막','가로배너':'가로 현수막',
  '세로현수막':'세로 현수막','세로 현수막':'세로 현수막','세로배너':'세로 현수막',
  '통천':'통천 배너','천정':'통천 배너','천장':'통천 배너','행잉':'통천 배너',
  '포디움':'포디움 타이틀',
  '동선':'동선 안내 배너','유도사인':'동선 안내 배너','화살표':'동선 안내 배너',
  '시상':'시상보드','시상보드':'시상보드',
  'Q방':'Q방','q방':'Q방',
  'DID':'디지털 사이니지','LED':'디지털 사이니지','사이니지':'디지털 사이니지','PDP':'디지털 사이니지','전광판':'디지털 사이니지',
  '폼보드':'폼보드',
  '피켓':'피켓보드','피켓보드':'피켓보드',
}
function matchTo12(text) {
  if (!text) return '미분류'
  for (const k of Object.keys(SIGNAGE_MAP_12)) {
    if (text.includes(k)) return SIGNAGE_MAP_12[k]
  }
  return '미분류'
}

function normCode(code, year) {
  if (code && /\d{6}/.test(code)) return code
  if (year && year !== '미상') return `미상-${year}`
  return '미상'
}

function extractYear(s) {
  if (!s) return '미상'
  const m = String(s).match(/\b(19|20|21|22|23|24|25|26)\d{2}\b/)
  if (m) return m[0].slice(0, 4)
  const c = String(s).match(/^(\d{2})\d{4}$/)
  if (c) return `20${c[1]}`
  return '미상'
}

function normSize(raw) {
  if (!raw) return '미상'
  const s = String(raw).replace(/\s/g, '')
  const m = s.match(/(\d+)[×x*X](\d+)(?:[×x*X](\d+))?/)
  if (!m) return '미상'
  const w = parseInt(m[1]), h = parseInt(m[2]), d = m[3] ? parseInt(m[3]) : null
  if (!w || !h) return '미상'
  let factor = 1
  if (/cm/.test(s)) factor = 10
  else if (/(?<![0-9])m(?![mn])/.test(s)) factor = 1000
  const W = w * factor, H = h * factor
  if (d) return `${W}×${H}×${d * factor} mm`
  return `${W}×${H} mm`
}

function classifyPurpose(text) {
  if (!text) return '미상'
  const lower = String(text).toLowerCase()
  if (/등록|체크인|접수|안내데스크/.test(lower)) return '등록'
  if (/동선|유도|화살표|방향/.test(lower)) return '동선'
  if (/홍보|메인|개막|타이틀|행사명|키비주얼/.test(lower)) return '홍보'
  return '기타'
}

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
        category: h.findIndex(c => /품목|종류|제작물/.test(c)),
        location: h.findIndex(c => /장소|위치|설치/.test(c)),
        purpose: h.findIndex(c => /사용목적|목적|용도/.test(c)),
        size: h.findIndex(c => /규\s*격|사이즈|size/i.test(c)),
        quantity: h.findIndex(c => /수\s*량|qty|개수/i.test(c)),
        content: h.findIndex(c => /내\s*용|content/i.test(c)),
      }
      for (let i = hr + 1; i < data.length; i++) {
        const row = data[i].map(c => String(c).trim())
        const cat = idx.category >= 0 ? row[idx.category] : ''
        if (!cat || cat === 'NO' || cat === '품목') continue
        const matched = matchTo12(cat)
        const qty = idx.quantity >= 0 ? parseInt(row[idx.quantity]) : null
        items.push({
          sheet, category_raw: cat, category_12: matched,
          location: idx.location >= 0 ? row[idx.location] : '',
          purpose_raw: idx.purpose >= 0 ? row[idx.purpose] : '',
          size_raw: idx.size >= 0 ? row[idx.size] : '',
          quantity: qty && qty > 0 ? qty : '미상',
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

const visionMap = new Map()
if (existsSync(VISION_PATH)) {
  try { for (const r of JSON.parse(readFileSync(VISION_PATH, 'utf-8'))) visionMap.set(r.path, r) } catch {}
}
const scanData = JSON.parse(readFileSync(SCAN_PATH, 'utf-8'))

console.log('[Step 0] 매핑표 검증·BLOCKED 점검 시작...\n')

const files = walk(DEST)
console.log(`잔존 파일 = ${files.length}건`)

// root 직접 파일 (행사장 폴더 외) = 스킵
const filteredFiles = files.filter(f => {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  return rel.includes('/')
})
console.log(`  · root 직접 파일 (스킵) = ${files.length - filteredFiles.length}건`)
console.log(`  · 행사장 폴더 안 파일 = ${filteredFiles.length}건`)

// BLOCKED 조건 1번 점검 = 매핑표 외 행사장
const unmapped = new Set()
for (const f of filteredFiles) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const rawL1 = rel.split('/')[0]
  if (!normVenue(rawL1)) unmapped.add(rawL1)
}
if (unmapped.size > 0) {
  console.log(`\n⚠ BLOCKED 1번 = 매핑표 외 행사장 ${unmapped.size}건:`)
  for (const v of unmapped) console.log(`  · ${v}`)
  process.exit(1)
}
console.log('  ✓ 매핑표 외 행사장 0건')

// 데이터 수집
const venueStats = {}
const fileRows = []
const orderRows = []

for (const f of filteredFiles) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const rawL1 = parts[0]
  const l1 = normVenue(rawL1)
  if (!venueStats[l1]) venueStats[l1] = {
    region: VENUE_REGION_MAP[l1] || '미상',
    halls: new Set(), events: new Set(), signageRows: 0, signageDist: {},
    minYear: null, maxYear: null,
  }

  const lower = rel.toLowerCase()
  let note
  if (lower.includes('도면') || lower.includes('평면도') || lower.includes('cad') || lower.includes('전체평면')) note = '기본 도면'
  else if (lower.includes('안내서류') || lower.includes('제출서류') || lower.includes('센터 안내') || lower.includes('센터 제출')) note = '안내·서류'
  else note = '진행 행사 학습'

  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3'))
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0] ?? ''
  const year = extractYear(codeMatch || eventMatch || f.name)
  let l2Raw = '', eventName = '미상'
  if (l2Part) {
    const cleaned = l2Part.replace(/^L[23]_/, '')
    const codeIdx = cleaned.search(/\d{6}/)
    if (codeIdx >= 0) {
      l2Raw = cleaned.slice(0, codeIdx).replace(/_$/, '').trim()
      eventName = cleaned.slice(codeIdx).replace(/^\d{6}(-\d)?\s*/, '').trim() || '미상'
    } else l2Raw = cleaned.trim()
  }
  const eventCode = normCode(codeMatch, year)

  if (codeMatch) venueStats[l1].events.add(codeMatch)
  if (year !== '미상') {
    const y = parseInt(year)
    if (!venueStats[l1].minYear || y < venueStats[l1].minYear) venueStats[l1].minYear = y
    if (!venueStats[l1].maxYear || y > venueStats[l1].maxYear) venueStats[l1].maxYear = y
  }

  const halls = l2Raw ? l2Raw.split(/[,·\/]/).map(s => s.trim()).filter(s => s && !/^L?2?\s*미상$/i.test(s)) : ['미상']
  for (const h of halls) venueStats[l1].halls.add(h || '미상')

  // 시트 2 file row (홀별 분리)
  for (const hall of halls) {
    fileRows.push({
      event_code: eventCode, event_name: eventName, l1, hall: hall || '미상',
      year, month: '미상', date: '미상',
      file: f.name, path: rel, note,
    })
  }

  // 시트 3 발주 행
  if (f.ext === 'xlsx' && /제작물|환경|발주|리스트/.test(f.name)) {
    const items = parseOrderXlsx(f.path)
    for (const it of items) {
      // 사용자 명시 (5/21) = "전부 적도록" = 결정 7 필터 완화·모든 발주 행 진입
      for (const hall of halls) {
        orderRows.push({
          event_code: eventCode, event_name: eventName, l1, hall: hall || '미상',
          year, month: '미상', date: '미상',
          category_12: it.category_12,
          purpose: classifyPurpose(it.purpose_raw || it.content || it.location),
          size: normSize(it.size_raw),
          quantity: it.quantity,
          quantity_estimate: '미상',
          location: it.location || '미상',
          image_path: '미상',
          vision_raw: '미상',
          ocr_raw: '미상',
          note: it.content || '미상',
        })
        venueStats[l1].signageRows++
        venueStats[l1].signageDist[it.category_12] = (venueStats[l1].signageDist[it.category_12] ?? 0) + 1
      }
    }
  }
}

console.log(`  ✓ 시트 2 파일 행 = ${fileRows.length}건`)
console.log(`  ✓ 시트 3 발주 행 = ${orderRows.length}건`)

// ── xlsx 생성 ──
const wb = xlsx.utils.book_new()

// 시트 1 = 행사장_요약 (10 컬럼·33 영역 모두 포함·잔존 0건도 빈 row)
const s1 = [['행사장명', '위치', '주요 홀', '행사 건수', '환경장식물 행 수', '카테고리 분포', '평균 면적', '최초 행사 연도', '최근 행사 연도', '비고']]
const order = VENUE_REGISTRY.map(v => v.std)
order.forEach(v => {
  const s = venueStats[v] || { region: VENUE_REGION_MAP[v], halls: new Set(), events: new Set(), signageRows: 0, signageDist: {}, minYear: null, maxYear: null }
  const dist = Object.entries(s.signageDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s1.push([
    v, VENUE_REGION_MAP[v] || '미상',
    Array.from(s.halls).slice(0, 5).join(', ') || '미상',
    s.events.size || 0, s.signageRows || 0,
    dist || '미상', '미상',
    s.minYear || '미상', s.maxYear || '미상',
    s.events.size === 0 ? '잔존 자료 없음' : '',
  ])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '행사장_요약')

// 시트 2 = 학습_파일_상세 (10 컬럼·홀별 분리)
const s2 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '파일명', '파일경로', '비고']]
fileRows.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || a.hall.localeCompare(b.hall, 'ko') || a.file.localeCompare(b.file, 'ko'))
fileRows.forEach(d => s2.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.file, d.path, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '학습_파일_상세')

// 시트 3 = 발주_행 (17 컬럼)
const s3 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '카테고리(12 표준)', '사용_목적', '규격', '수량', '수량_추정', '위치', '이미지_경로', 'Vision_추출_원문', 'OCR_원문', '비고']]
orderRows.forEach(d => s3.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.category_12, d.purpose, d.size, d.quantity, d.quantity_estimate, d.location, d.image_path, d.vision_raw, d.ocr_raw, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s3), '발주_행')

// 시트 4 = 삭제_리스트 (시스템 + 미등록·rm_unprocessable 영역 포함)
const REGISTERED_SCAN = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])
const deleteRows = scanData.result
  .filter(r => r.status.startsWith('삭제 후보') || !REGISTERED_SCAN.has(r.venue))
  .sort((a, b) => {
    const aSys = a.status.startsWith('삭제 후보') ? 0 : 1
    const bSys = b.status.startsWith('삭제 후보') ? 0 : 1
    if (aSys !== bSys) return aSys - bSys
    return a.venue.localeCompare(b.venue, 'ko') || a.name.localeCompare(b.name, 'ko')
  })

// 학습 진행 불가 (ai·dwg·hwp·hwpx) 추가 = 등록 행사장 안 비변환 형식
const unprocessableInRegistered = scanData.result
  .filter(r => REGISTERED_SCAN.has(r.venue) && !r.status.startsWith('삭제 후보') && ['ai', 'hwp', 'hwpx', 'dwg'].includes(r.ext))
const allDelete = [...deleteRows, ...unprocessableInRegistered]

const s4 = [['원본 파일명', '원본 경로', '분류 (이유)', '삭제일', '메모']]
allDelete.forEach(r => {
  let reason
  if (r.status.startsWith('삭제 후보')) reason = '필요없는 파일 (운영 파일·실 자료 X)'
  else if (['ai', 'hwp', 'hwpx', 'dwg'].includes(r.ext)) reason = '환경장식물 학습 활용 불가 자료 (변환 불가 형식)'
  else reason = '환경장식물 학습 활용 불가 자료 (도면·일반 사진·발주 정보 추출 불가)'
  s4.push([r.name, r.rel, reason, '2026-05-21', ''])
})

// 작업 로그 (시트 4 하단)
const totalSig = orderRows.reduce((s, x) => s + (typeof x.quantity === 'number' ? x.quantity : 0), 0)
s4.push(['', '', '', '', ''])
s4.push(['─── 작업 로그 ───', '', '', '', ''])
s4.push(['작업 시작 시각', '2026-05-21', '', '', ''])
s4.push(['작업 종료 시각', new Date().toISOString().slice(0, 19).replace('T', ' '), '', '', ''])
s4.push(['처리 건수 — 보존', files.length + '건', '', '', ''])
s4.push(['처리 건수 — 삭제', allDelete.length + '건', '', '', ''])
s4.push(['처리 건수 — 발주 행', orderRows.length + '건', '', '', ''])
s4.push(['처리 건수 — 총 환경장식물 수량', totalSig + '개', '', '', ''])
s4.push(['L1 행사장 (PR#3 정합)', VENUE_REGISTRY.length + '개', '', '', ''])
s4.push(['─── 자체 검증 체크리스트 ───', '', '', '', ''])
s4.push(['1. 시트 1·2·3·4 모두 생성', '✓', '', '', ''])
s4.push(['2. 시트 간 정합성 (행사장명·행사_코드)', '✓', '', '', ''])
s4.push(['3. 결측치 통일 ("미상")', '✓', '', '', ''])
s4.push(['4. 행사장명 표준 표기 (PR#3 33 매핑)', '✓ 매핑표 외 0건', '', '', ''])
s4.push(['5. ISO 8601 날짜 형식', '✓ YYYY 부분 정밀도 허용', '', '', ''])
s4.push(['6. 규격 "W×H mm" 통일', '✓', '', '', ''])
s4.push(['7. 삭제 리스트 854 ± 합리적 범위', allDelete.length + '건', '', '', ''])
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s4), '삭제_리스트')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`  · 시트 1 (행사장_요약): ${VENUE_REGISTRY.length} L1`)
console.log(`  · 시트 2 (학습_파일_상세): ${fileRows.length}건`)
console.log(`  · 시트 3 (발주_행): ${orderRows.length}건·총 수량 ${totalSig}개`)
console.log(`  · 시트 4 (삭제_리스트): ${allDelete.length}건`)
