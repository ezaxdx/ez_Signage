// 행사장별 환경장식물 학습 데이터 추출
// 14개 발주엑셀 전체 파싱 → 행사장×행사 매트릭스
// 출력:
//   - lib/data/_venue_signage_map.json (구조화)
//   - lib/data/_venue_signage_summary.json (집계)
// 사용: node scripts/parse_all_venue_signage.mjs

import * as XLSX from 'xlsx'
import { readFileSync, statSync, writeFileSync, readdirSync } from 'fs'
import { join, basename, dirname } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'
const DOMYEN_ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/도면'

// 발주엑셀 14개 경로 (실측 기반)
const EXCEL_FILES = [
  '[핵심] 높음이상/2020 평창평화포럼 193960/2020 평창평화포럼_제작물 리스트_ 0202_v5.xlsx',
  '[핵심] 높음이상/온라인(www.kite2021.com), 인천 파라다이스시티(공식행사), 송도컨벤시아 등, 온라인(www.kite2021.com), 인천 파라다이스시티(공식행사), 송도컨벤시아 등/2021 한국관광박람회(KITE, Korea International Travel Expo 2021) 213060/★KITE2021_물자 및 제작물 리스트_0621.xlsx',
  '[핵심] 높음이상/킨텍스 제1전시장 5홀/2022 스마트국토엑스포 223080/20221027 스마트국토엑스포_작물시트만(글로벌+이벤트)_공식행사수정.xlsx',
  '[핵심] 높음이상/킨텍스(KINTEX)/2025 K-GEO Festa 252014 (20,000sqm)/2025 K-GEO_제작물_피알라이브.xlsx',
  '[핵심] 높음이상/평창 알펜시아 컨벤션 센터, 평창 알펜시아 컨벤션 센터/2021 평창평화포럼 203170/★2021 평창평화포럼_제작물 리스트_210218_1757.xlsx',
  '광화문 광장/제100주년 3.1절 중앙기념식 192000/100주년 3.1절 중앙기념식 제작물리스트_20190219.xlsx',
  '동대문디자인플라자(DDP) (추정)/제1회 대한민국 정부혁신박람회 191400/정부혁신박람회_환경연출물_라이브피알_191119_최종.xlsx',
  '송도컨벤시아/KOREA MICE EXPO 2018 183000-1/KME_환경제작물리스트_0613-환영리셉션.xlsx',
  '송도컨벤시아/KOREA MICE EXPO 2019 193100/KME 2019_제작물 리스트_190608_2000.xlsx',
  '제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/2018WLCF_제작물리스트-180929.xlsx',
  '제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/리더스_제작물 리스트_180911(이즈).xlsx',
  '코엑스/2018 스마트국토엑스포 183080/2018 스마트국토엑스포_제작물리스트_0909.xlsx',
  '코엑스/BCWW 2018 183090/BCWW 2018_제작물리스트_20180820_Final_VER02 (1).xlsx',
]

// 컬럼 이름 매핑 후보 (엑셀마다 다름)
const COL_ALIASES = {
  no: ['no', 'no.', '번호', '순번', '연번'],
  part: ['파트', '구분 1', '구분1', '용도'],
  place1: ['장소1', '장소', '행사장', '위치'],
  place2: ['장소2', '세부장소', '세부'],
  place3: ['장소3', '상세', '종류명', '구역'],
  category: ['종류1', '구분', '품목', '종류', '제작물'],
  size: ['사이즈', '규격', 'size', '사이즈(mm)', '사이즈(mm) -가로*세로'],
  qty: ['수량', '갯수', 'qty', '개수'],
  content: ['내용', '문구', 'content'],
  note: ['비고', '확인사항', '비고/확인사항'],
}

// 카테고리 정규화 (동의어 통합)
const CATEGORY_NORMALIZE = {
  '가로현수막': '가로현수막', '가로 현수막': '가로현수막', '현수막(가로)': '가로현수막',
  '세로현수막': '세로현수막', '세로 현수막': '세로현수막', '가로등배너': '세로현수막', '가로등 배너': '세로현수막', '드롭배너': '세로현수막', '난간배너': '세로현수막',
  '통천현수막': '통천현수막', '통천': '통천현수막', '외벽': '통천현수막', '외벽현수막': '통천현수막',
  'X배너': 'X배너', 'X배너(철제배너)': 'X배너', '철제배너': 'X배너', 'X 배너': 'X배너', 'X-배너': 'X배너', '엑스배너': 'X배너', '스프링배너': 'X배너', '엑스 배너': 'X배너',
  'I배너': 'I배너', 'I 배너': 'I배너', 'I-배너': 'I배너', '아이배너': 'I배너',
  '물통배너': '물통배너', '워터배너': '물통배너',
  '천정배너': '천정배너', '천장배너': '천정배너', '천정 배너': '천정배너',
  '포디움': '포디움 타이틀', '포디움 타이틀': '포디움 타이틀', '포디엄': '포디움 타이틀',
  '폼보드': '폼보드',
  '명함': '명함',
  '사이니지': '사이니지',
  '영접피켓': '영접피켓', '피켓': '영접피켓',
  '전자사인': '전자사인', 'LED사인': '전자사인',
  '디자인만/칼라출력': '디자인/칼라출력', '칼라출력/디자인만': '디자인/칼라출력',
}

function normalizeCategory(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (CATEGORY_NORMALIZE[trimmed]) return CATEGORY_NORMALIZE[trimmed]
  // 부분 매칭
  for (const [key, val] of Object.entries(CATEGORY_NORMALIZE)) {
    if (trimmed.includes(key)) return val
  }
  return trimmed || null
}

// 행사장 정규화 (장소1·2 기준 행사장 추정)
function inferVenue(place1, place2, place3, eventName) {
  const all = `${place1||''} ${place2||''} ${place3||''} ${eventName||''}`.toLowerCase()
  if (all.includes('킨텍스')) {
    if (all.includes('5홀') || all.includes('hall 5')) return '킨텍스 1전시장 5홀'
    if (all.includes('1홀')) return '킨텍스 1전시장 1홀'
    if (all.includes('2홀')) return '킨텍스 1전시장 2홀'
    if (all.includes('3홀')) return '킨텍스 1전시장 3홀'
    if (all.includes('4홀')) return '킨텍스 1전시장 4홀'
    if (all.includes('6')) return '킨텍스 2전시장 6홀'
    if (all.includes('2전시장')) return '킨텍스 2전시장'
    return '킨텍스 (홀 미상)'
  }
  if (all.includes('코엑스')) {
    if (all.includes('그랜드볼룸') || all.includes('그랜드 볼룸')) return '코엑스 그랜드볼룸'
    if (all.includes('아셈')) return '코엑스 아셈볼룸'
    return '코엑스'
  }
  if (all.includes('송도') || all.includes('컨벤시아')) return '송도컨벤시아'
  if (all.includes('icc') || all.includes('제주국제컨벤션')) return 'ICC 제주'
  if (all.includes('ddp') || all.includes('동대문디자인플라자')) return 'DDP'
  if (all.includes('광화문')) return '광화문 광장'
  if (all.includes('평창') || all.includes('알펜시아')) return '평창 알펜시아'
  if (all.includes('aT센터') || all.includes('at센터')) return 'aT센터'
  if (all.includes('bexco') || all.includes('벡스코')) return 'BEXCO'
  if (all.includes('김대중') || all.includes('빅스포')) return '김대중컨벤션센터'
  if (all.includes('소노캄') || all.includes('소노카')) return '소노캄'
  if (all.includes('롯데호텔')) return '롯데호텔'
  if (all.includes('신라호텔')) return '신라호텔'
  if (all.includes('웨스틴') || all.includes('조선')) return '웨스틴 조선'
  if (all.includes('plaza') || all.includes('플라자')) return '더 플라자'
  if (all.includes('파라다이스')) return '인천 파라다이스시티'
  if (all.includes('상암')) return '상암동'
  if (all.includes('마곡')) return '코엑스 마곡'
  if (all.includes('대전컨벤션') || all.includes('dcc')) return 'DCC'
  if (all.includes('경남도청')) return '경남도청'
  if (all.includes('서울국제디자인플라자')) return 'DDP'
  return place1 || '미상'
}

function readSheet(filePath) {
  try {
    const wb = XLSX.read(readFileSync(filePath), { type: 'buffer' })
    const sn = wb.SheetNames[0]
    const ws = wb.Sheets[sn]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    return { sheetName: sn, rows: data }
  } catch (e) {
    return { error: e.message }
  }
}

function detectHeader(rows) {
  // 첫 5행 중 헤더로 보이는 행 찾기
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(c => String(c).toLowerCase().trim())
    let hits = 0
    if (row.some(c => COL_ALIASES.category.some(a => c.includes(a)))) hits++
    if (row.some(c => COL_ALIASES.qty.some(a => c.includes(a)))) hits++
    if (row.some(c => COL_ALIASES.size.some(a => c.includes(a)))) hits++
    if (hits >= 2) return { headerRow: i, headers: row }
  }
  return { headerRow: 0, headers: rows[0]?.map(c => String(c).toLowerCase().trim()) || [] }
}

function findColIdx(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    if (aliases.some(a => headers[i].includes(a))) return i
  }
  return -1
}

function listFolderArtifacts(folderPath) {
  try {
    return readdirSync(folderPath).filter(f => !f.includes('추가') && !f.startsWith('.'))
  } catch {
    return []
  }
}

function checkDomyen(venue) {
  // 도면 폴더에 해당 행사장 자료 있는지 확인
  const domyenMap = {
    '킨텍스 1전시장 5홀': 'KINTEX',
    '킨텍스 1전시장 1홀': 'KINTEX',
    '킨텍스 1전시장 2홀': 'KINTEX',
    '킨텍스 1전시장 3홀': 'KINTEX',
    '킨텍스 1전시장 4홀': 'KINTEX',
    '킨텍스 2전시장 6홀': 'KINTEX',
    '코엑스': 'COEX',
    '코엑스 그랜드볼룸': 'COEX',
    '송도컨벤시아': '송도컨벤시아',
    'ICC 제주': 'ICC 제주',
    'DDP': 'DDP',
    'BEXCO': 'BEXCO',
    'DCC': 'DCC',
    '김대중컨벤션센터': '김대중컨벤션센터',
    '소노캄': '소노캄 모음',
    '롯데호텔': '롯데호텔 서울',
  }
  const domyenFolder = domyenMap[venue]
  if (!domyenFolder) return { has: false, files: [] }
  try {
    const full = join(DOMYEN_ROOT, domyenFolder)
    statSync(full)
    return { has: true, folder: domyenFolder }
  } catch {
    return { has: false }
  }
}

// 메인
const result = {
  meta: {
    extracted_at: new Date().toISOString(),
    excel_count: EXCEL_FILES.length,
    root: ROOT,
  },
  events: [],
  venues: {},  // venue → events[]
  categories: {},  // category → { total_qty, occurrences, by_venue }
  errors: [],
}

for (const relPath of EXCEL_FILES) {
  const fullPath = join(ROOT, relPath).replaceAll('/', '\\')
  const eventFolder = dirname(relPath).split('/').pop()
  const venuePath = dirname(relPath).split('/').slice(0, -1).join(' > ')

  const sheet = readSheet(fullPath)
  if (sheet.error) {
    result.errors.push({ file: relPath, error: sheet.error })
    continue
  }

  const { headerRow, headers } = detectHeader(sheet.rows)
  const cols = {
    no: findColIdx(headers, COL_ALIASES.no),
    part: findColIdx(headers, COL_ALIASES.part),
    place1: findColIdx(headers, COL_ALIASES.place1),
    place2: findColIdx(headers, COL_ALIASES.place2),
    place3: findColIdx(headers, COL_ALIASES.place3),
    category: findColIdx(headers, COL_ALIASES.category),
    size: findColIdx(headers, COL_ALIASES.size),
    qty: findColIdx(headers, COL_ALIASES.qty),
    content: findColIdx(headers, COL_ALIASES.content),
    note: findColIdx(headers, COL_ALIASES.note),
  }

  const eventEntry = {
    event_name: eventFolder,
    folder_path: venuePath,
    excel_file: basename(relPath),
    header_row: headerRow,
    cols_detected: cols,
    items: [],
    summary: {},  // category → qty
    venues_seen: new Set(),
  }

  for (let i = headerRow + 1; i < sheet.rows.length; i++) {
    const row = sheet.rows[i]
    if (!row || row.every(c => !c)) continue

    const catRaw = cols.category >= 0 ? row[cols.category] : ''
    const cat = normalizeCategory(catRaw)
    if (!cat) continue

    const place1 = cols.place1 >= 0 ? row[cols.place1] : ''
    const place2 = cols.place2 >= 0 ? row[cols.place2] : ''
    const place3 = cols.place3 >= 0 ? row[cols.place3] : ''
    const venue = inferVenue(place1, place2, place3, eventFolder)
    eventEntry.venues_seen.add(venue)

    const qty = Number(cols.qty >= 0 ? row[cols.qty] : 0) || 0
    const size = String(cols.size >= 0 ? row[cols.size] : '').trim()
    const note = String(cols.note >= 0 ? row[cols.note] : '').trim()

    // 제외 마킹 필터링
    if (note.includes('미진행') || note.includes('불필요') || note.includes('삭제')) continue

    const item = {
      category: cat,
      venue,
      place1, place2, place3,
      size,
      qty,
      note,
    }
    eventEntry.items.push(item)
    eventEntry.summary[cat] = (eventEntry.summary[cat] || 0) + qty

    // 카테고리 글로벌 집계
    if (!result.categories[cat]) result.categories[cat] = { total_qty: 0, occurrences: 0, by_venue: {}, sizes_seen: {} }
    result.categories[cat].total_qty += qty
    result.categories[cat].occurrences += 1
    result.categories[cat].by_venue[venue] = (result.categories[cat].by_venue[venue] || 0) + qty
    if (size) {
      result.categories[cat].sizes_seen[size] = (result.categories[cat].sizes_seen[size] || 0) + qty
    }

    // 행사장별 집계
    if (!result.venues[venue]) result.venues[venue] = { events: new Set(), categories: {}, total_items: 0 }
    result.venues[venue].events.add(eventFolder)
    result.venues[venue].categories[cat] = (result.venues[venue].categories[cat] || 0) + qty
    result.venues[venue].total_items += qty
  }

  eventEntry.venues_seen = Array.from(eventEntry.venues_seen)
  result.events.push(eventEntry)
}

// Set → Array 변환
for (const venue of Object.keys(result.venues)) {
  result.venues[venue].events = Array.from(result.venues[venue].events)
}

// 도면 보유 여부 추가
for (const venue of Object.keys(result.venues)) {
  result.venues[venue].domyen = checkDomyen(venue)
}

// 저장
const outPath1 = 'lib/data/_venue_signage_map.json'
const outPath2 = 'lib/data/_venue_signage_summary.json'

writeFileSync(outPath1, JSON.stringify(result, null, 2), 'utf-8')

// 요약본 (사람이 읽기 쉽게)
const summary = {
  meta: result.meta,
  by_venue: Object.entries(result.venues).map(([venue, data]) => ({
    venue,
    event_count: data.events.length,
    events: data.events,
    total_items: data.total_items,
    top_categories: Object.entries(data.categories).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([c,q]) => `${c}:${q}`).join(' / '),
    has_domyen: data.domyen?.has,
  })).sort((a,b) => b.total_items - a.total_items),
  by_event: result.events.map(e => ({
    event: e.event_name,
    venue_inferred: e.venues_seen.join(', '),
    excel: e.excel_file,
    item_count: e.items.length,
    total_qty: Object.values(e.summary).reduce((a,b)=>a+b, 0),
    categories: Object.entries(e.summary).sort((a,b) => b[1] - a[1]).map(([c,q]) => `${c}:${q}`).join(' / '),
  })),
  by_category: Object.entries(result.categories).map(([cat, data]) => ({
    category: cat,
    total_qty: data.total_qty,
    occurrences: data.occurrences,
    top_venues: Object.entries(data.by_venue).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([v,q]) => `${v}:${q}`).join(' / '),
    top_sizes: Object.entries(data.sizes_seen).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([s,q]) => `${s}:${q}`).join(' / '),
  })).sort((a,b) => b.total_qty - a.total_qty),
}

writeFileSync(outPath2, JSON.stringify(summary, null, 2), 'utf-8')

console.log(`✓ ${result.events.length}개 행사 / ${Object.keys(result.venues).length}개 행사장 / ${Object.keys(result.categories).length}개 카테고리 추출 완료`)
console.log(`저장: ${outPath1}`)
console.log(`저장: ${outPath2}`)
if (result.errors.length) console.log(`⚠️ 오류 ${result.errors.length}건:`, result.errors)
