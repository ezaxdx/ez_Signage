// v8 = v7 + area 시드 통합 + 발주 xlsx 추가 컬럼 (설치 일자·행사일) + Vision Pro resume
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/260520_ez_signage2_training.xlsx'
const SCAN_PATH = 'scripts/scan_unused.json'
const VISION_PATH = 'scripts/vision_ocr_result.json'
const VISION_PRO_PATH = 'scripts/vision_pro_result.json'

const VENUE_REGISTRY = [
  { std: '코엑스(COEX)', region: '서울', loc: '서울 강남구 영동대로 513', aliases: ['COEX','코엑스'] },
  { std: '동대문디자인플라자(DDP)', region: '서울', loc: '서울 중구 을지로 281', aliases: ['DDP','동대문디자인플라자'] },
  { std: '올림픽공원체육관(KSPO)', region: '서울', loc: '서울 송파구 올림픽로 424', aliases: ['KSPO','KSPO DOME','올림픽공원체육관'] },
  { std: '서울무역전시컨벤션센터(SETEC)', region: '서울', loc: '서울 강남구 남부순환로 3104', aliases: ['SETEC','세텍','서울무역전시컨벤션센터'] },
  { std: '롯데호텔 서울', region: '서울', loc: '서울 중구 을지로 30', aliases: ['롯데호텔 서울'] },
  { std: '그랜드하얏트 서울', region: '서울', loc: '서울 용산구 소월로 322', aliases: ['그랜드하얏트서울','그랜드하얏트 서울','Grand Hyatt'] },
  { std: '더플라자 서울', region: '서울', loc: '서울 중구 세종대로 119', aliases: ['더 플라자 호텔 서울','더플라자','The Plaza'] },
  { std: '웨스틴 조선 서울', region: '서울', loc: '서울 중구 소공로 106', aliases: ['웨스틴 조선 서울','Westin Chosun'] },
  { std: '서울신라호텔', region: '서울', loc: '서울 중구 동호로 249', aliases: ['THE_SHILLA','신라호텔','서울신라호텔'] },
  { std: '시그니엘 서울', region: '서울', loc: '서울 송파구 올림픽로 300', aliases: ['시그니엘 서울','Signiel'] },
  { std: '조선팰리스 강남', region: '서울', loc: '서울 강남구 테헤란로 521', aliases: ['조선팰리스 강남','조선팰리스 강남(그랜드인터콘티넨탈 파르나스)'] },
  { std: '광화문 광장', region: '서울', loc: '서울 종로구 세종대로 175', aliases: ['광화문 광장','광화문광장'] },
  { std: 'aT센터', region: '서울', loc: '서울 서초구 강남대로 27', aliases: ['aT센터','aT 센터'] },
  { std: '킨텍스(KINTEX)', region: '경기', loc: '경기 고양시 일산서구 킨텍스로 217-60', aliases: ['KINTEX','킨텍스'] },
  { std: '수원컨벤션센터', region: '경기', loc: '경기 수원시 영통구 광교중앙로 140', aliases: ['수원컨벤션센터'] },
  { std: '송도컨벤시아', region: '인천', loc: '인천 연수구 센트럴로 123', aliases: ['송도컨벤시아','Songdo Convensia'] },
  { std: '평창올림픽스타디움', region: '강원', loc: '강원 평창군 대관령면', aliases: ['평창올림픽스타디움'] },
  { std: '소노캄', region: '강원', loc: '강원 고성·홍천 등', aliases: ['소노캄 모음','소노캄'] },
  { std: '대전컨벤션센터(DCC)', region: '충청', loc: '대전 유성구 엑스포로 107', aliases: ['DCC','대전컨벤션센터'] },
  { std: '정부세종컨벤션센터', region: '충청', loc: '세종 어진동 다솜로 261', aliases: ['정부세종컨벤션센터'] },
  { std: '대구컨벤션센터(EXCO)', region: '경상', loc: '대구 북구 엑스코로 10', aliases: ['EXCO','대구컨벤션센터'] },
  { std: '구미컨벤션센터(GUMICO)', region: '경상', loc: '경북 구미시 산호대로 24', aliases: ['GUMICO','구미컨벤션센터'] },
  { std: '안동국제컨벤션센터', region: '경상', loc: '경북 안동시 풍천면 도청대로 489', aliases: ['안동국제컨벤션센터'] },
  { std: '경주화백컨벤션센터(HICO)', region: '경상', loc: '경북 경주시 보문로 507', aliases: ['HICO','경주화백컨벤션센터'] },
  { std: '울산컨벤션센터(UECO)', region: '경상', loc: '울산 울주군 삼남읍 청량로 50', aliases: ['UECO','울산컨벤션센터','울산전시컨벤션센터'] },
  { std: '벡스코(BEXCO)', region: '부산', loc: '부산 해운대구 APEC로 55', aliases: ['BEXCO','벡스코'] },
  { std: '라한호텔·라한셀렉트', region: '경남', loc: '경주 보문관광단지 외', aliases: ['라한호텔  라한셀렉트','라한호텔 라한셀렉트','라한호텔','라한셀렉트'] },
  { std: '창원컨벤션센터(CECO)', region: '경남', loc: '경남 창원시 의창구 원이대로 362', aliases: ['CECO','창원컨벤션센터'] },
  { std: '광주김대중컨벤션센터(GSCO)', region: '호남', loc: '광주 서구 상무누리로 30', aliases: ['GSCO','김대중컨벤션센터','광주김대중컨벤션센터'] },
  { std: '여수엑스포컨벤션센터', region: '호남', loc: '전남 여수시 박람회길 1', aliases: ['여수엑스포컨벤션센터'] },
  { std: '제주국제컨벤션센터(ICC)', region: '제주', loc: '제주 서귀포시 중문관광로 224', aliases: ['ICC 제주','ICC JEJU','제주국제컨벤션센터'] },
  { std: '제주신라호텔', region: '제주', loc: '제주 서귀포시 중문관광로72번길 75', aliases: ['제주신라호텔'] },
  { std: '롯데호텔 제주', region: '제주', loc: '제주 서귀포시 중문관광로72번길 35', aliases: ['롯데호텔 제주'] },
]

// 행사 코드별 면적 SOT (eventLearningIndexSeed 영역)
const EVENT_AREA = {
  '231009': '2,149㎡',
  '232030': '1,579㎡',
  '232033': '6,729㎡',
}

const VENUE_ALIAS_MAP = {}, VENUE_META = {}
for (const v of VENUE_REGISTRY) {
  VENUE_ALIAS_MAP[v.std] = v.std
  VENUE_META[v.std] = { region: v.region, loc: v.loc }
  for (const a of v.aliases) VENUE_ALIAS_MAP[a] = v.std
}
function normVenue(raw) {
  if (!raw) return null
  if (VENUE_ALIAS_MAP[raw]) return VENUE_ALIAS_MAP[raw]
  const keys = Object.keys(VENUE_ALIAS_MAP).sort((a, b) => b.length - a.length)
  for (const k of keys) if (raw.includes(k)) return VENUE_ALIAS_MAP[k]
  return null
}

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
  '폼보드':'폼보드','피켓':'피켓보드','피켓보드':'피켓보드',
}
const VISION_KEY = { x_banner:'X배너', streetlight_banner:'가로등 배너', horizontal_banner:'가로 현수막', vertical_banner:'세로 현수막', chunchen_banner:'통천 배너', podium:'포디움 타이틀', route_banner:'동선 안내 배너', award_board:'시상보드', q_room:'Q방', digital_signage:'디지털 사이니지', foam_board:'폼보드', picket_board:'피켓보드' }
function matchTo12(text) {
  if (!text) return '미분류'
  for (const k of Object.keys(SIGNAGE_MAP_12)) if (text.includes(k)) return SIGNAGE_MAP_12[k]
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
function extractMonthDay(s) {
  // 파일명에서 6자리 (YYMMDD) 또는 8자리 (YYYYMMDD) 또는 _MMDD_ 패턴
  if (!s) return { month: '미상', date: '미상' }
  // YYMMDD 6자리 (코드 X·시간 표기)
  const m1 = String(s).match(/[_-](\d{2})(\d{2})(\d{2})[_.-]/)
  if (m1) {
    const yy = parseInt(m1[1]), mm = parseInt(m1[2]), dd = parseInt(m1[3])
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return { month: String(mm).padStart(2, '0'), date: `20${m1[1]}-${m1[2]}-${m1[3]}` }
    }
  }
  // YYYYMMDD 8자리
  const m2 = String(s).match(/(20\d{2})(\d{2})(\d{2})/)
  if (m2) {
    const mm = parseInt(m2[2]), dd = parseInt(m2[3])
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return { month: String(mm).padStart(2, '0'), date: `${m2[1]}-${m2[2]}-${m2[3]}` }
    }
  }
  return { month: '미상', date: '미상' }
}
function normSize(raw) {
  if (!raw) return '미상'
  const s = String(raw).replace(/\s/g, '')
  const m = s.match(/(\d+)[×x*X](\d+)(?:[×x*X](\d+))?/)
  if (!m) return '미상'
  const w = parseInt(m[1]), h = parseInt(m[2]), d = m[3] ? parseInt(m[3]) : null
  if (!w || !h) return '미상'
  let f = 1
  if (/cm/.test(s)) f = 10; else if (/(?<![0-9])m(?![mn])/.test(s)) f = 1000
  const W = w * f, H = h * f
  if (d) return `${W}×${H}×${d * f} mm`
  return `${W}×${H} mm`
}
function classifyPurpose(text) {
  if (!text) return '미상'
  const l = String(text).toLowerCase()
  if (/등록|체크인|접수|안내데스크/.test(l)) return '등록'
  if (/동선|유도|화살표|방향/.test(l)) return '동선'
  if (/홍보|메인|개막|타이틀|행사명|키비주얼/.test(l)) return '홍보'
  return '기타'
}

function parseOrderXlsx(filePath) {
  const items = []
  let eventDate = '미상' // 발주 xlsx 안 행사일·설치일 추출
  try {
    const wb = xlsx.readFile(filePath)
    for (const sheet of wb.SheetNames) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' })
      if (data.length < 2) continue
      // 행사일·설치일 = 상단 헤더 영역 (1~10행) 안 "행사 일정"·"행사일"·"설치일" 패턴 검색
      for (let i = 0; i < Math.min(15, data.length); i++) {
        const rowStr = data[i].map(c => String(c)).join(' ')
        const dm = rowStr.match(/(20\d{2})[-.\/년 ]*(\d{1,2})[-.\/월 ]*(\d{1,2})/)
        if (dm) {
          const y = dm[1], mo = String(parseInt(dm[2])).padStart(2, '0'), dd = String(parseInt(dm[3])).padStart(2, '0')
          if (parseInt(dm[2]) >= 1 && parseInt(dm[2]) <= 12 && parseInt(dm[3]) >= 1 && parseInt(dm[3]) <= 31) {
            eventDate = `${y}-${mo}-${dd}`
            break
          }
        }
      }
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
        date: h.findIndex(c => /설치\s*일|행사\s*일|일\s*자|date/i.test(c)),
      }
      for (let i = hr + 1; i < data.length; i++) {
        const row = data[i].map(c => String(c).trim())
        const cat = idx.category >= 0 ? row[idx.category] : ''
        if (!cat || cat === 'NO' || cat === '품목') continue
        const qty = idx.quantity >= 0 ? parseInt(row[idx.quantity]) : null
        const rowDate = idx.date >= 0 ? row[idx.date] : ''
        items.push({
          sheet, category_raw: cat, category_12: matchTo12(cat),
          location: idx.location >= 0 ? row[idx.location] : '',
          purpose_raw: idx.purpose >= 0 ? row[idx.purpose] : '',
          size_raw: idx.size >= 0 ? row[idx.size] : '',
          quantity: qty && qty > 0 ? qty : '미상',
          content: idx.content >= 0 ? row[idx.content] : '',
          row_date: rowDate || '',
        })
      }
    }
  } catch { }
  return { items, eventDate }
}

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push({ path: f, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}

// Vision Flash + Pro 통합
const visionMap = new Map()
for (const P of [VISION_PATH, VISION_PRO_PATH]) {
  if (!existsSync(P)) continue
  try {
    for (const r of JSON.parse(readFileSync(P, 'utf-8'))) {
      const rel = r.path.replace(/\\/g, '/').replace(DEST + '/', '')
      // Pro 우선 (items 있으면)
      if (!visionMap.has(rel) || (r.items && r.items.length > 0)) visionMap.set(rel, r)
    }
  } catch {}
}
const visionItemsCount = [...visionMap.values()].filter(v => v.items && v.items.length > 0).length
console.log(`Vision 누적 = ${visionMap.size}건·items 있음 = ${visionItemsCount}건\n`)

const scanData = JSON.parse(readFileSync(SCAN_PATH, 'utf-8'))

const files = walk(DEST)
const filteredFiles = files.filter(f => f.path.replace(/\\/g, '/').replace(DEST + '/', '').includes('/'))

// 행사 코드별 이미지 인덱스
const imagesByCode = new Map()
const eventDateByCode = new Map() // 발주 xlsx에서 추출한 행사일
for (const f of filteredFiles) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0]
  if (codeMatch) {
    if (['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(f.ext)) {
      if (!imagesByCode.has(codeMatch)) imagesByCode.set(codeMatch, [])
      imagesByCode.get(codeMatch).push(rel)
    }
  }
}

// 발주 xlsx 사전 파싱 = 행사일 추출
for (const f of filteredFiles) {
  if (f.ext !== 'xlsx' || !/제작물|환경|발주|리스트/.test(f.name)) continue
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0]
  if (codeMatch) {
    const { eventDate } = parseOrderXlsx(f.path)
    if (eventDate !== '미상') eventDateByCode.set(codeMatch, eventDate)
  }
}
console.log(`발주 xlsx 행사일 추출 = ${eventDateByCode.size} 행사 코드`)

const venueStats = {}, fileRows = [], orderRows = []

for (const f of filteredFiles) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const rawL1 = parts[0]
  const l1 = normVenue(rawL1)
  if (!venueStats[l1]) venueStats[l1] = { halls: new Set(), events: new Set(), signageRows: 0, signageDist: {}, minYear: null, maxYear: null, areas: [] }

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

  // 행사 월·일자 = 1) 발주 xlsx 행사일 → 2) 파일명 추출 → 3) 미상
  let eventMonth = '미상', eventDateFull = '미상'
  if (codeMatch && eventDateByCode.has(codeMatch)) {
    eventDateFull = eventDateByCode.get(codeMatch)
    eventMonth = eventDateFull.slice(5, 7)
  } else {
    const md = extractMonthDay(f.name)
    if (md.month !== '미상') { eventMonth = md.month; eventDateFull = md.date }
  }

  // 면적 = EVENT_AREA SOT
  const eventArea = EVENT_AREA[codeMatch] || '미상'
  if (eventArea !== '미상' && codeMatch) {
    if (!venueStats[l1].areas.find(a => a.code === codeMatch)) {
      venueStats[l1].areas.push({ code: codeMatch, area: eventArea })
    }
  }

  if (codeMatch) venueStats[l1].events.add(codeMatch)
  if (year !== '미상') {
    const y = parseInt(year)
    if (!venueStats[l1].minYear || y < venueStats[l1].minYear) venueStats[l1].minYear = y
    if (!venueStats[l1].maxYear || y > venueStats[l1].maxYear) venueStats[l1].maxYear = y
  }

  const halls = l2Raw ? l2Raw.split(/[,·\/]/).map(s => s.trim()).filter(s => s && !/^L?2?\s*미상$/i.test(s)) : ['미상']
  for (const h of halls) venueStats[l1].halls.add(h || '미상')

  for (const hall of halls) {
    fileRows.push({ event_code: eventCode, event_name: eventName, l1, hall: hall || '미상', year, month: eventMonth, date: eventDateFull, file: f.name, path: rel, note })
  }

  if (f.ext === 'xlsx' && /제작물|환경|발주|리스트/.test(f.name)) {
    const { items } = parseOrderXlsx(f.path)
    for (const it of items) {
      for (const hall of halls) {
        let imgPath = '미상'
        if (codeMatch && imagesByCode.has(codeMatch)) {
          const candidates = imagesByCode.get(codeMatch)
          const catKey = it.category_12
          const matched = candidates.find(p => {
            for (const k of Object.keys(SIGNAGE_MAP_12)) {
              if (SIGNAGE_MAP_12[k] === catKey && p.includes(k)) return true
            }
            return false
          })
          imgPath = matched || candidates[0] || '미상'
        }
        let visionRaw = '미상'
        if (imgPath !== '미상' && visionMap.has(imgPath)) {
          const v = visionMap.get(imgPath)
          if (v.items && v.items.length > 0) {
            visionRaw = v.items.map(x => `${VISION_KEY[x.category] || x.category}(${x.quantity || '?'})·${x.location || ''}`).join(' / ')
          } else if (v.summary) visionRaw = v.summary
        }

        orderRows.push({
          event_code: eventCode, event_name: eventName, l1, hall: hall || '미상',
          year, month: eventMonth, date: eventDateFull,
          category_12: it.category_12,
          purpose: classifyPurpose(it.purpose_raw || it.content || it.location),
          size: normSize(it.size_raw),
          quantity: it.quantity, quantity_estimate: '미상',
          location: it.location || '미상',
          image_path: imgPath, vision_raw: visionRaw, ocr_raw: '미상',
          note: it.content || '미상',
        })
        venueStats[l1].signageRows++
        venueStats[l1].signageDist[it.category_12] = (venueStats[l1].signageDist[it.category_12] ?? 0) + 1
      }
    }
  }
}

const monthMatched = fileRows.filter(r => r.month !== '미상').length
const visionMatched = orderRows.filter(r => r.vision_raw !== '미상').length
const imgMatched = orderRows.filter(r => r.image_path !== '미상').length
console.log(`시트 2: ${fileRows.length} (월 매칭 ${monthMatched}건)`)
console.log(`시트 3: ${orderRows.length}·이미지 ${imgMatched}·Vision ${visionMatched}건`)

const wb = xlsx.utils.book_new()

const s1 = [['행사장명', '위치', '주요 홀', '행사 건수', '환경장식물 행 수', '카테고리 분포', '평균 면적', '최초 행사 연도', '최근 행사 연도', '비고']]
VENUE_REGISTRY.forEach(v => {
  const s = venueStats[v.std] || { halls: new Set(), events: new Set(), signageRows: 0, signageDist: {}, minYear: null, maxYear: null, areas: [] }
  const dist = Object.entries(s.signageDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  let avgArea = '미상'
  if (s.areas.length > 0) {
    const nums = s.areas.map(a => parseInt(a.area.replace(/[,㎡\s]/g, ''))).filter(n => n)
    if (nums.length > 0) avgArea = `${Math.round(nums.reduce((x, y) => x + y, 0) / nums.length).toLocaleString()}㎡ (N=${nums.length})`
  }
  s1.push([
    v.std, v.loc, Array.from(s.halls).slice(0, 5).join(', ') || '미상',
    s.events.size || 0, s.signageRows || 0,
    dist || '미상', avgArea,
    s.minYear || '미상', s.maxYear || '미상',
    s.events.size === 0 ? '잔존 자료 없음' : '',
  ])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '행사장_요약')

const s2 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '파일명', '파일경로', '비고']]
fileRows.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || a.hall.localeCompare(b.hall, 'ko') || a.file.localeCompare(b.file, 'ko'))
fileRows.forEach(d => s2.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.file, d.path, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '학습_파일_상세')

const s3 = [['행사_코드', '행사명', '행사장명', '홀', '행사_연도', '행사_월', '행사_일자', '카테고리(12 표준)', '사용_목적', '규격', '수량', '수량_추정', '위치', '이미지_경로', 'Vision_추출_원문', 'OCR_원문', '비고']]
orderRows.forEach(d => s3.push([d.event_code, d.event_name, d.l1, d.hall, d.year, d.month, d.date, d.category_12, d.purpose, d.size, d.quantity, d.quantity_estimate, d.location, d.image_path, d.vision_raw, d.ocr_raw, d.note]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s3), '발주_행')

const REGISTERED_SCAN = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])
const deleteRows = scanData.result
  .filter(r => r.status.startsWith('삭제 후보') || !REGISTERED_SCAN.has(r.venue))
  .sort((a, b) => {
    const aSys = a.status.startsWith('삭제 후보') ? 0 : 1
    const bSys = b.status.startsWith('삭제 후보') ? 0 : 1
    if (aSys !== bSys) return aSys - bSys
    return a.venue.localeCompare(b.venue, 'ko') || a.name.localeCompare(b.name, 'ko')
  })
const unprocessableInRegistered = scanData.result.filter(r => REGISTERED_SCAN.has(r.venue) && !r.status.startsWith('삭제 후보') && ['ai', 'hwp', 'hwpx', 'dwg'].includes(r.ext))
const allDelete = [...deleteRows, ...unprocessableInRegistered]

const s4 = [['원본 파일명', '원본 경로', '분류 (이유)', '삭제일', '메모']]
allDelete.forEach(r => {
  let reason
  if (r.status.startsWith('삭제 후보')) reason = '필요없는 파일 (운영 파일·실 자료 X)'
  else if (['ai', 'hwp', 'hwpx', 'dwg'].includes(r.ext)) reason = '환경장식물 학습 활용 불가 자료 (변환 불가 형식)'
  else reason = '환경장식물 학습 활용 불가 자료 (도면·일반 사진·발주 정보 추출 불가)'
  s4.push([r.name, r.rel, reason, '2026-05-21', ''])
})

const totalSig = orderRows.reduce((s, x) => s + (typeof x.quantity === 'number' ? x.quantity : 0), 0)
s4.push(['', '', '', '', ''])
s4.push(['─── 작업 로그 v8 ───', '', '', '', ''])
s4.push(['작업 종료', new Date().toISOString().slice(0, 19).replace('T', ' '), '', '', ''])
s4.push(['처리 — 보존', files.length + '건', '', '', ''])
s4.push(['처리 — 삭제', allDelete.length + '건', '', '', ''])
s4.push(['처리 — 발주 행', orderRows.length + '건', '', '', ''])
s4.push(['처리 — 총 환경장식물 수량', totalSig + '개', '', '', ''])
s4.push(['처리 — 이미지 경로 매칭', `${imgMatched}/${orderRows.length}건`, '', '', ''])
s4.push(['처리 — Vision 매칭 (Flash+Pro)', `${visionMatched}건`, '', '', ''])
s4.push(['처리 — 행사_월 매칭', `${monthMatched}/${fileRows.length}건`, '', '', ''])
s4.push(['처리 — 면적 SOT 통합', `${Object.keys(EVENT_AREA).length} 행사 코드`, '', '', ''])
s4.push(['처리 — L1 행사장 (PR#3 + 롯데호텔 제주)', VENUE_REGISTRY.length + '개', '', '', ''])
s4.push(['v8 보강 영역', '면적 SOT + 발주일·파일명 날짜 + Vision Pro resume', '', '', ''])
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s4), '삭제_리스트')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`  · 시트 1: ${VENUE_REGISTRY.length} L1 (위치·면적 SOT 영역)`)
console.log(`  · 시트 2: ${fileRows.length}건·월 매칭 ${monthMatched}건`)
console.log(`  · 시트 3: ${orderRows.length}건·총 ${totalSig}개·이미지 ${imgMatched}·Vision ${visionMatched}`)
console.log(`  · 시트 4: ${allDelete.length}건`)
