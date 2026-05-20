// 최종 통합 v3 = L1·L2 분리 + 환경장식물 행 단위 (수량·규격·재질·위치) + Vision/OCR 통합
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/환경장식물_학습_현황_260520.xlsx'
const VISION_PATH = 'scripts/vision_ocr_result.json'

// ── L1 표준 명명 ──
const L1_NORMALIZE = {
  'COEX': '코엑스(COEX)',
  'KINTEX': '킨텍스(KINTEX)',
  'DDP': '동대문디자인플라자(DDP)',
  'ICC 제주': '제주국제컨벤션센터(ICC)',
  '송도컨벤시아': '송도컨벤시아',
  '그랜드하얏트서울': '그랜드하얏트 서울',
  '더 플라자 호텔 서울': '더플라자 서울',
}
function normL1(name) { return L1_NORMALIZE[name] || name }
function normL2(l1, l2) {
  if (!l2) return ''
  const short = l1.replace(/\(.+\)/, '').trim()
  return `${short} ${l2}`
}
function splitL2(raw) {
  if (!raw) return ['']
  return raw.split(/[,·\/]/).map(s => s.trim()).filter(s => s && !/^L?2?\s*미상$/i.test(s))
}

// ── 환경장식물 매핑 ──
const SIGNAGE_MAP = {
  'X배너': 'X배너', '엑스배너': 'X배너', 'x배너': 'X배너', '룸사인': 'X배너',
  'I배너': 'I배너', '아이배너': 'I배너',
  '통천': '통천 배너', '천정': '천정 배너', '천장': '천정 배너', '행잉': '천정 배너',
  '가로등': '가로등 배너', '폴대': '가로등 배너',
  '포디움': '포디움 타이틀',
  '동선': '동선 안내 배너', '유도사인': '동선 안내 배너', '화살표': '동선 안내 배너',
  'DID': '디지털 사이니지', 'LED': '디지털 사이니지', '사이니지': '디지털 사이니지', 'PDP': '디지털 사이니지',
  '외벽': '외벽 배너', '게이트': '게이트', '기둥': '기둥 배너', '난간': '난간 배너', '파티션': '파티션 배너',
  '포토월': '포토월', '시상보드': '시상보드', '폼보드': '폼보드', '피켓': '피켓보드',
  '가로현수막': '가로 현수막', '세로현수막': '세로 현수막', '현수막': '가로 현수막', '가로배너': '가로 현수막', '세로배너': '세로 현수막',
}
const VISION_KEY = {
  x_banner: 'X배너', streetlight_banner: '가로등 배너', horizontal_banner: '가로 현수막',
  vertical_banner: '세로 현수막', chunchen_banner: '통천 배너', podium: '포디움 타이틀',
  route_banner: '동선 안내 배너', award_board: '시상보드', q_room: 'Q방',
  digital_signage: '디지털 사이니지', foam_board: '폼보드', picket_board: '피켓보드',
}
function matchSignage(text) {
  for (const k of Object.keys(SIGNAGE_MAP)) {
    if (text.includes(k)) return SIGNAGE_MAP[k]
  }
  return ''
}

// ── walk ──
function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else files.push({ path: full, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}

// ── xlsx 발주리스트 행 단위 파싱 ──
function parseOrderXlsx(filePath) {
  const items = []
  try {
    const wb = xlsx.readFile(filePath)
    for (const name of wb.SheetNames) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' })
      if (data.length < 2) continue
      // 헤더 행 추정 (NO·구분·품목·규격 등 키워드 포함)
      let headerRow = 0
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i].map(c => String(c))
        if (row.some(c => /구분|품목|규격|수량|재질|장소|사용목적/.test(c))) { headerRow = i; break }
      }
      const header = data[headerRow].map(c => String(c).trim())
      // 컬럼 인덱스 찾기
      const idx = {
        no: header.findIndex(c => /^NO|^번호|^No/i.test(c)),
        part: header.findIndex(c => /파트|구\s*분|분류/.test(c) && !/세부|장소|품목/.test(c)),
        category: header.findIndex(c => /품목|종류|제작물/.test(c)),
        location: header.findIndex(c => /장소|위치|설치/.test(c)),
        purpose: header.findIndex(c => /사용목적|목적|용도/.test(c)),
        size: header.findIndex(c => /규\s*격|사이즈|size/i.test(c)),
        material: header.findIndex(c => /재\s*질|소재|materia/i.test(c)),
        quantity: header.findIndex(c => /수\s*량|qty|개수/i.test(c)),
        content: header.findIndex(c => /내\s*용|content/i.test(c)),
        language: header.findIndex(c => /언어|language/i.test(c)),
      }
      // 행별 추출
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i].map(c => String(c).trim())
        const cat = idx.category >= 0 ? row[idx.category] : ''
        if (!cat || cat === 'NO' || cat === '품목') continue
        const signage = matchSignage(cat) || cat
        const qty = idx.quantity >= 0 ? parseInt(row[idx.quantity]) || 0 : 0
        if (qty === 0 && !signage) continue
        items.push({
          sheet: name,
          no: idx.no >= 0 ? row[idx.no] : '',
          part: idx.part >= 0 ? row[idx.part] : '',
          category_raw: cat,
          category: signage,
          location: idx.location >= 0 ? row[idx.location] : '',
          purpose: idx.purpose >= 0 ? row[idx.purpose] : '',
          size: idx.size >= 0 ? row[idx.size] : '',
          material: idx.material >= 0 ? row[idx.material] : '',
          quantity: qty,
          content: idx.content >= 0 ? row[idx.content] : '',
          language: idx.language >= 0 ? row[idx.language] : '',
        })
      }
    }
  } catch (e) { /* ignore */ }
  return items
}

// ── 텍스트 추출 (키워드 매칭용) ──
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
    const candidates = Object.keys(zip.files).filter(n => /\.xml$/.test(n) && /document|slide|sheet/.test(n))
    let all = ''
    for (const c of candidates) {
      const xml = await zip.file(c).async('string')
      const r = /<(?:w|a):t[^>]*>([^<]+)<\/(?:w|a):t>/g
      let m; while ((m = r.exec(xml)) !== null) all += m[1] + ' '
    }
    return all
  } catch { return '' }
}

// ── Vision/OCR 결과 ──
const visionMap = new Map()
if (existsSync(VISION_PATH)) {
  try {
    const arr = JSON.parse(readFileSync(VISION_PATH, 'utf-8'))
    for (const r of arr) visionMap.set(r.path, r)
    console.log(`Vision/OCR 결과 = ${arr.length}건 통합`)
  } catch {}
}

// ── 본 분석 ──
console.log('분석 시작...')
const files = walk(DEST)
console.log(`전체 = ${files.length}건\n`)

const fileDetail = [] // 시트 3 = 파일별 (홀별 분리)
const venueStats = {}
const hallStats = {}
const orderItems = [] // 시트 4 = 발주 행 단위 (수량·규격·재질·위치)
const visionItems = [] // 시트 5 = Vision/OCR items

for (const f of files) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const rawL1 = parts[0]
  const l1 = normL1(rawL1)
  if (!venueStats[l1]) venueStats[l1] = { drawings: 0, events: new Set(), learnFiles: 0, docs: 0, signage: {}, halls: new Set() }

  // 분류
  const lower = rel.toLowerCase()
  let category
  if (lower.includes('도면') || lower.includes('평면도') || lower.includes('cad') || lower.includes('전체평면')) {
    category = '기본 도면'; venueStats[l1].drawings++
  } else if (lower.includes('안내서류') || lower.includes('제출서류') || lower.includes('센터 안내') || lower.includes('센터 제출')) {
    category = '안내·서류'; venueStats[l1].docs++
  } else {
    category = '진행 행사 학습'; venueStats[l1].learnFiles++
  }

  // L2·행사 코드·행사명
  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3'))
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0] ?? ''
  if (codeMatch) venueStats[l1].events.add(codeMatch)
  let l2Raw = '', eventName = ''
  if (l2Part) {
    const cleaned = l2Part.replace(/^L[23]_/, '')
    const codeIdx = cleaned.search(/\d{6}/)
    if (codeIdx >= 0) {
      l2Raw = cleaned.slice(0, codeIdx).replace(/_$/, '').trim()
      eventName = cleaned.slice(codeIdx).replace(/^\d{6}(-\d)?\s*/, '').trim()
    } else l2Raw = cleaned.trim()
  }

  // 환경장식물 카테고리 (파일별)
  let signage = matchSignage(f.name)
  if (!signage && visionMap.has(f.path)) {
    const v = visionMap.get(f.path)
    if (v.items && v.items.length > 0) {
      signage = VISION_KEY[v.items[0].category] || v.items[0].category
      // Vision items 시트 5 누적
      for (const it of v.items) {
        visionItems.push({
          l1, file: f.name,
          category: VISION_KEY[it.category] || it.category,
          quantity: it.quantity || '',
          size: it.width_mm && it.height_mm ? `${it.width_mm}×${it.height_mm}` : '',
          material: it.material || '',
          location: it.location || '',
          source: 'Vision/OCR',
        })
      }
    }
  }
  if (!signage && ['xlsx', 'xls', 'docx', 'pptx'].includes(f.ext)) {
    const t = await extractText(f.path, f.ext)
    signage = matchSignage(t)
  }
  if (!signage) {
    signage = f.ext === 'pdf' ? 'PDF 문서' : ['jpg', 'jpeg', 'png', 'gif'].includes(f.ext) ? '이미지 시안' : '기타'
  }
  if (!['PDF 문서', '이미지 시안', '기타'].includes(signage)) {
    venueStats[l1].signage[signage] = (venueStats[l1].signage[signage] ?? 0) + 1
  }

  // xlsx 발주리스트 = 행 단위 파싱
  if (f.ext === 'xlsx' && /제작물|환경|발주|리스트/.test(f.name)) {
    const items = parseOrderXlsx(f.path)
    for (const it of items) {
      orderItems.push({ l1, l2_raw: l2Raw, event_code: codeMatch, event_name: eventName, file: f.name, ...it })
    }
  }

  // L2 split
  const halls = splitL2(l2Raw)
  if (halls.length === 0) halls.push('')
  for (const hallRaw of halls) {
    const l2Std = hallRaw ? normL2(l1, hallRaw) : ''
    if (l2Std) {
      venueStats[l1].halls.add(l2Std)
      if (!hallStats[l2Std]) hallStats[l2Std] = { l1, events: new Set(), files: 0, signage: {} }
      hallStats[l2Std].files++
      if (codeMatch) hallStats[l2Std].events.add(codeMatch)
      if (!['PDF 문서', '이미지 시안', '기타'].includes(signage)) {
        hallStats[l2Std].signage[signage] = (hallStats[l2Std].signage[signage] ?? 0) + 1
      }
    }
    fileDetail.push({ l1, l2: l2Std, category, code: codeMatch, event: eventName, file: f.name, signage })
  }
}

// ── xlsx 생성 ──
const wb = xlsx.utils.book_new()

// 시트 1 = L1 행사장 요약
const s1 = [['#', '행사장 (L1)', '휘하 홀 수', '기본 도면 수', '진행 행사 수', '학습 파일 수', '안내·서류 수', '학습 환경장식물 TOP 5']]
const l1Order = Object.keys(venueStats).sort((a, b) => venueStats[b].learnFiles - venueStats[a].learnFiles)
l1Order.forEach((v, i) => {
  const s = venueStats[v]
  const top = Object.entries(s.signage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s1.push([i + 1, v, s.halls.size, s.drawings, s.events.size, s.learnFiles, s.docs, top || '—'])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '1. L1 행사장 요약')

// 시트 2 = L2 휘하 홀별 요약 (공간별)
const s2 = [['#', 'L1 행사장', 'L2 휘하 홀', '진행 행사 수', '학습 파일 수', '환경장식물 TOP 5']]
const l2Order = Object.keys(hallStats).sort((a, b) => {
  if (a.split(' ')[0] !== b.split(' ')[0]) return a.localeCompare(b.split(' ')[0], 'ko')
  return hallStats[b].files - hallStats[a].files
})
l2Order.forEach((h, i) => {
  const s = hallStats[h]
  const top = Object.entries(s.signage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s2.push([i + 1, s.l1, h, s.events.size, s.files, top || '—'])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '2. L2 휘하 홀별 요약')

// 시트 3 = 학습 파일 상세 (홀별 분리)
const s3 = [['#', 'L1', 'L2', '분류', '행사 코드', '행사명', '파일명', '환경장식물']]
fileDetail.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || (a.l2 || '').localeCompare(b.l2 || '', 'ko') || a.file.localeCompare(b.file, 'ko'))
fileDetail.forEach((d, i) => s3.push([i + 1, d.l1, d.l2, d.category, d.code, d.event, d.file, d.signage]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s3), '3. 학습 파일 상세 (홀별)')

// 시트 4 = 발주 행 단위 (수량·규격·재질·위치)
const s4 = [['#', 'L1', 'L2(원본)', '행사 코드', '행사명', '파일', '시트', 'NO', '파트', '품목(원본)', '환경장식물 카테고리', '장소', '사용목적', '규격', '재질', '수량', '언어', '내용']]
orderItems.forEach((d, i) => s4.push([i + 1, d.l1, d.l2_raw, d.event_code, d.event_name, d.file, d.sheet, d.no, d.part, d.category_raw, d.category, d.location, d.purpose, d.size, d.material, d.quantity, d.language, d.content]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s4), '4. 발주 행 단위 (수량·규격·재질)')

// 시트 5 = Vision/OCR 결과
const s5 = [['#', 'L1', '파일', '카테고리', '수량', '규격', '재질', '위치', 'source']]
visionItems.forEach((d, i) => s5.push([i + 1, d.l1, d.file, d.category, d.quantity, d.size, d.material, d.location, d.source]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s5), '5. Vision·OCR 결과')

// 시트 6 = 학습 결론
const totalQty = orderItems.reduce((s, x) => s + (x.quantity || 0), 0)
const result = [
  ['환경장식물 학습 결론 (2026-05-20)'],
  [''],
  ['전체 잔존 파일', files.length + '건'],
  ['L1 행사장', l1Order.length + '개'],
  ['L2 휘하 홀 (분리)', l2Order.length + '개'],
  ['상세 row (홀별 분리)', fileDetail.length + '건'],
  ['발주 행 단위 항목 (수량·규격·재질)', orderItems.length + '건'],
  ['  · 총 수량 합계', totalQty + '개'],
  ['Vision/OCR 결과 통합', visionMap.size + '건·items ' + visionItems.length + '개'],
  [''],
  ['L2 분리 정책'],
  ['', '1 행사 = 여러 홀 사용 시 = 각 홀별 row 분리 (공간별 학습 누적)'],
  ['', 'L1·L2 표준 명명 = "코엑스(COEX) 그랜드볼룸" 형식'],
  [''],
  ['데이터 SOT'],
  ['', '시트 4 = 발주리스트 행별 = 수량·규격·재질·위치·언어 = 학습 풀 핵심 영역'],
  ['', '시트 5 = Vision/OCR = 시안에서 추출한 환경장식물 정보 (Gemini 2.5 Flash)'],
]
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(result), '6. 학습 결론')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`L1 ${l1Order.length}개·L2 ${l2Order.length}개`)
console.log(`파일 ${files.length}건·상세 row ${fileDetail.length}건`)
console.log(`발주 행 단위 ${orderItems.length}건·총 수량 ${totalQty}개`)
console.log(`Vision items ${visionItems.length}개`)
