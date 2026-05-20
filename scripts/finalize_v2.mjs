// 최종 학습 보고 v2 = L1·L2 표준 명명 + L2 분리 (1 행사 다중 홀 → 홀별 row) + Vision/OCR 결과 통합
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/환경장식물_학습_현황_260520.xlsx'
const VISION_PATH = 'scripts/vision_ocr_result.json'

// ── L1 표준 명명 (폴더명 → 표준 행사장명) ──
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

// ── L2 표준 명명 (L1 prefix + 홀명) ──
function normL2(l1, l2) {
  if (!l2) return ''
  const l1Short = l1.replace(/\(.+\)/, '').trim() // "코엑스(COEX)" → "코엑스"
  return `${l1Short} ${l2}`
}

// ── L2 split (콤마·중점·슬래시 = 여러 홀 분리) ──
function splitL2(l2Raw) {
  if (!l2Raw) return ['']
  // "B홀, 그랜드볼룸, 컨퍼런스룸(북), 컨퍼런스룸E" → ["B홀", "그랜드볼룸", "컨퍼런스룸(북)", "컨퍼런스룸E"]
  return l2Raw
    .split(/[,·\/]/)
    .map(s => s.trim())
    .filter(s => s && s !== '(L2 미상)' && s !== 'L2 미상' && s !== '_L2미상')
}

// ── 환경장식물 키워드 (파일명·텍스트 추출 매칭) ──
const SIGNAGE_MAP = {
  'X배너': 'X배너', '엑스배너': 'X배너', 'x배너': 'X배너',
  'I배너': 'I배너', '아이배너': 'I배너',
  '통천': '통천 배너', '천정': '천정 배너', '천장': '천정 배너', '행잉': '천정 배너',
  '가로등': '가로등 배너', '폴대': '가로등 배너',
  '포디움': '포디움 타이틀',
  '동선': '동선 안내 배너', '유도사인': '동선 안내 배너', '화살표': '동선 안내 배너',
  'DID': '디지털 사이니지', 'LED': '디지털 사이니지', '사이니지': '디지털 사이니지', 'PDP': '디지털 사이니지',
  '외벽': '외벽 배너', '게이트': '게이트', '기둥': '기둥 배너', '난간': '난간 배너', '파티션': '파티션 배너',
  '포토월': '포토월', '시상보드': '시상보드', '폼보드': '폼보드',
  '룸사인': 'X배너', '피켓': '피켓보드',
  '가로': '가로 현수막', '세로': '세로 현수막', '현수막': '가로 현수막',
}

// ── 파일 walk ──
function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else files.push({ path: full, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}

// ── 텍스트 추출 (xlsx·docx·pptx) ──
async function extractText(p, ext) {
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const wb = xlsx.readFile(p)
      let all = ''
      for (const n of wb.SheetNames) {
        const data = xlsx.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: false })
        all += JSON.stringify(data) + ' '
      }
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

// ── Vision/OCR 결과 로드 (있으면 통합) ──
const visionMap = new Map() // path → { items, summary }
if (existsSync(VISION_PATH)) {
  try {
    const arr = JSON.parse(readFileSync(VISION_PATH, 'utf-8'))
    for (const r of arr) visionMap.set(r.path, r)
    console.log(`Vision/OCR 결과 = ${arr.length}건 통합`)
  } catch {}
}

// ── 본 분석 시작 ──
console.log('잔존 파일 분석 시작...')
const files = walk(DEST)
console.log(`전체 = ${files.length}건\n`)

const fileDetail = [] // 시트 2 row (홀별 분리 = 1 파일 × N 홀 = N row)
const venueStats = {} // L1 표준명 → { drawings, events, learnFiles, docs, signage }
const hallStats = {} // L2 표준명 → { l1, events, files, signage }

for (const f of files) {
  const rel = f.path.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  const rawL1 = parts[0]
  const l1 = normL1(rawL1)
  if (!venueStats[l1]) venueStats[l1] = { drawings: 0, events: new Set(), learnFiles: 0, docs: 0, signage: {}, halls: new Set() }

  // 분류
  const lower = rel.toLowerCase()
  let category
  if (lower.includes('도면') || lower.includes('평면도') || lower.includes('cad')) {
    category = '기본 도면'; venueStats[l1].drawings++
  } else if (lower.includes('안내서류') || lower.includes('제출서류') || lower.includes('센터 안내') || lower.includes('센터 제출')) {
    category = '안내·서류'; venueStats[l1].docs++
  } else {
    category = '진행 행사 학습'; venueStats[l1].learnFiles++
  }

  // 행사 코드·행사명·L2 추출
  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3'))
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0] ?? ''
  if (codeMatch) venueStats[l1].events.add(codeMatch)

  let l2Raw = ''
  let eventName = ''
  if (l2Part) {
    const cleaned = l2Part.replace(/^L[23]_/, '')
    const codeIdx = cleaned.search(/\d{6}/)
    if (codeIdx >= 0) {
      l2Raw = cleaned.slice(0, codeIdx).replace(/_$/, '').trim()
      eventName = cleaned.slice(codeIdx).replace(/^\d{6}(-\d)?\s*/, '').trim()
    } else {
      l2Raw = cleaned.trim()
    }
  }
  if (!eventName && eventMatch) {
    eventName = eventMatch.replace(/^L[23]_/, '').replace(/^\d{6}(-\d)?\s*/, '').trim()
  }

  // 환경장식물 카테고리 추출
  let signage = ''
  // 1차: 파일명 매칭
  for (const k of Object.keys(SIGNAGE_MAP)) {
    if (f.name.includes(k)) { signage = SIGNAGE_MAP[k]; break }
  }
  // 2차: Vision/OCR 결과
  if (!signage && visionMap.has(f.path)) {
    const v = visionMap.get(f.path)
    if (v.items && v.items.length > 0) {
      const cat = v.items[0].category
      // Vision 응답 = 영문 snake_case → 표준 한글명
      const VISION_KEY = { x_banner: 'X배너', streetlight_banner: '가로등 배너', horizontal_banner: '가로 현수막',
        vertical_banner: '세로 현수막', chunchen_banner: '통천 배너', podium: '포디움 타이틀',
        route_banner: '동선 안내 배너', award_board: '시상보드', q_room: 'Q방',
        digital_signage: '디지털 사이니지', foam_board: '폼보드', picket_board: '피켓보드' }
      signage = VISION_KEY[cat] || cat
    }
  }
  // 3차: 텍스트 추출 (xlsx·docx·pptx)
  if (!signage && ['xlsx', 'xls', 'docx', 'pptx'].includes(f.ext)) {
    const t = await extractText(f.path, f.ext)
    for (const k of Object.keys(SIGNAGE_MAP)) {
      if (t.includes(k)) { signage = SIGNAGE_MAP[k]; break }
    }
  }
  // 4차: 확장자 기본
  if (!signage) {
    if (f.ext === 'pdf') signage = 'PDF 문서'
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(f.ext)) signage = '이미지 시안'
    else signage = '기타'
  }
  if (signage && !['PDF 문서', '이미지 시안', '기타'].includes(signage)) {
    venueStats[l1].signage[signage] = (venueStats[l1].signage[signage] ?? 0) + 1
  }

  // L2 split (다중 홀 분리)
  const halls = splitL2(l2Raw)
  if (halls.length === 0 || halls[0] === '') halls.push('') // 미상 row 1개

  for (const hallRaw of halls) {
    const l2Std = hallRaw ? normL2(l1, hallRaw) : ''
    if (l2Std) {
      venueStats[l1].halls.add(l2Std)
      if (!hallStats[l2Std]) hallStats[l2Std] = { l1, events: new Set(), files: 0, signage: {} }
      hallStats[l2Std].files++
      if (codeMatch) hallStats[l2Std].events.add(codeMatch)
      if (signage && !['PDF 문서', '이미지 시안', '기타'].includes(signage)) {
        hallStats[l2Std].signage[signage] = (hallStats[l2Std].signage[signage] ?? 0) + 1
      }
    }
    fileDetail.push({ l1, l2: l2Std, category, code: codeMatch, event: eventName, file: f.name, signage })
  }
}

// ── xlsx 생성 ──
const wb = xlsx.utils.book_new()

// 시트 1 = L1 행사장 요약
const s1 = [['#', '행사장 (L1)', '휘하 홀 수', '기본 도면 수', '진행 행사 수', '학습 파일 수', '안내·서류 수', '학습 환경장식물 카테고리 (TOP 5)']]
const l1Order = Object.keys(venueStats).sort((a, b) => venueStats[b].learnFiles - venueStats[a].learnFiles)
l1Order.forEach((v, i) => {
  const s = venueStats[v]
  const top = Object.entries(s.signage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s1.push([i + 1, v, s.halls.size, s.drawings, s.events.size, s.learnFiles, s.docs, top || '—'])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '1. L1 행사장 요약')

// 시트 2 = L2 휘하 홀별 요약 (공간별)
const s2 = [['#', 'L1 행사장', 'L2 휘하 홀', '진행 행사 수', '학습 파일 수', '환경장식물 카테고리 (TOP 5)']]
const l2Order = Object.keys(hallStats).sort((a, b) => hallStats[b].files - hallStats[a].files)
l2Order.forEach((h, i) => {
  const s = hallStats[h]
  const top = Object.entries(s.signage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  s2.push([i + 1, s.l1, h, s.events.size, s.files, top || '—'])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '2. L2 휘하 홀별 요약')

// 시트 3 = 학습 파일 상세 (홀별 분리)
const s3 = [['#', 'L1 행사장', 'L2 휘하 홀', '분류', '행사 코드', '행사명', '파일명', '환경장식물 카테고리']]
fileDetail.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || (a.l2 || '').localeCompare(b.l2 || '', 'ko') || a.file.localeCompare(b.file, 'ko'))
fileDetail.forEach((d, i) => s3.push([i + 1, d.l1, d.l2, d.category, d.code, d.event, d.file, d.signage]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s3), '3. 학습 파일 상세 (홀별)')

// 시트 4 = 학습 결론
const result = [
  ['환경장식물 학습 결론 (2026-05-20)'],
  [''],
  ['전체 잔존 파일', files.length + '건'],
  ['L1 행사장', l1Order.length + '개'],
  ['L2 휘하 홀 (분리)', l2Order.length + '개'],
  ['상세 row (홀별 분리)', fileDetail.length + '건'],
  ['Vision/OCR 결과 통합', visionMap.size + '건'],
  [''],
  ['L2 분리 정책'],
  ['', '1 행사 = 여러 홀 사용 시 = 각 홀별 row 분리 (공간별 학습 누적)'],
  ['', 'L1·L2 표준 명명 = "코엑스(COEX) 그랜드볼룸" 형식'],
]
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(result), '4. 학습 결론')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`L1 ${l1Order.length}개·L2 ${l2Order.length}개·파일 ${files.length}건·상세 row ${fileDetail.length}건`)
