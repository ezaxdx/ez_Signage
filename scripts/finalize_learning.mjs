// 3단계 통합: 삭제 + 학습 분석 + 보고 xlsx (260519 양식 정합)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { rm } from 'fs/promises'
import { join, basename } from 'path'
import xlsx from 'xlsx'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/환경장식물_학습_현황_260520.xlsx'

const REGISTERED = ['COEX', '그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'DDP', 'ICC 제주', 'KINTEX']
const KEYWORDS = ['행잉', '천장', '천정', '배너', '현수막', '통천', 'X배너', '엑스배너', '게이트', '외벽', '기둥', '폴대', '가로등', '포디움', '포토월', '리깅', '하중', 'LED', 'DID', '사이니지', '제작물', '시안']
const SIGNAGE_MAP = {
  'X배너': 'X배너', '엑스배너': 'X배너', 'x배너': 'X배너',
  '통천': '통천 배너', '천정': '천정 배너', '천장': '천정 배너', '행잉': '천정 배너',
  '가로등': '가로등 배너', '폴대': '가로등 배너',
  '포디움': '포디움 타이틀', '현수막': '현수막', '배너': '배너 일반',
  'DID': '디지털 사이니지', 'LED': '디지털 사이니지', '사이니지': '디지털 사이니지',
  '외벽': '외벽 배너', '게이트': '게이트', '기둥': '기둥 배너',
  '리깅': '리깅 시설', '하중': '하중 정보',
}

// ───────── 1단계: 추가 삭제 (학습 활용 불가) ─────────
console.log('[1/3] 학습 활용 불가 추가 삭제...')
const scanResult = JSON.parse(readFileSync('scripts/all_text_scan_result.json', 'utf-8'))
const deleteTargets = scanResult.filter(r => r.matches && r.matches.length < 3)

let delOk = 0, delMiss = 0
for (const r of deleteTargets) {
  try { await rm(join(DEST, r.rel), { force: true }); delOk++ }
  catch { delMiss++ }
}
// HWP/DOCX 변환본 잔존 = 모두 삭제 (시설 영역 정보 X 확인됨)
function walkAll(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walkAll(full, files)
    else files.push({ path: full, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}
const allFilesNow = walkAll(DEST)
const hwpDocxKill = allFilesNow.filter(f =>
  f.ext === 'hwp' || f.ext === 'hwpx' ||
  // HWP에서 변환된 DOCX (정리본 root 또는 신고서·각서·신청서 패턴)
  (f.ext === 'docx' && /신고서|각서|신청서|작업|확약|폐기물|로봇|임대료|임대|취소|변경|승인기준|상황실/.test(f.name))
)
for (const f of hwpDocxKill) {
  try { await rm(f.path, { force: true }); delOk++ }
  catch { delMiss++ }
}
console.log(`  ✓ 삭제 ${delOk}건 (텍스트 미매칭 + HWP/DOCX 행정 양식)·skip ${delMiss}건`)

// ───────── 2단계: 학습 분석 (잔존 파일 환경장식물 카운트) ─────────
console.log('\n[2/3] 학습 분석 (잔존 파일 환경장식물 카운트)...')

async function extractTextFromZip(p, isXlsx) {
  if (isXlsx) {
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
    const candidates = Object.keys(zip.files).filter(n => /\.xml$/.test(n) && (n.includes('document') || n.includes('slide') || n.includes('sheet')))
    let all = ''
    for (const c of candidates) {
      const xml = await zip.file(c).async('string')
      const r = /<(?:w|a):t[^>]*>([^<]+)<\/(?:w|a):t>/g
      let m; while ((m = r.exec(xml)) !== null) all += m[1] + ' '
    }
    return all
  } catch { return '' }
}

const remaining = walkAll(DEST)
const venueStats = {} // venue → { totalFiles, signageMap: { 카테고리: count } }
const fileDetail = [] // 시트 2 row

for (const f of remaining) {
  const rel = f.path.replace(DEST + '/', '').replace(/\\/g, '/')
  const parts = rel.split('/')
  const venue = parts[0]
  if (!venueStats[venue]) venueStats[venue] = { drawings: 0, events: new Set(), learnFiles: 0, docs: 0, signage: {} }

  // 분류 추정
  const lower = rel.toLowerCase()
  let category = '미분류'
  let signageType = ''
  if (lower.includes('도면') || lower.includes('평면도') || lower.includes('cad')) {
    category = '기본 도면'
    venueStats[venue].drawings++
  } else if (lower.includes('안내서류') || lower.includes('제출서류') || lower.includes('센터 안내') || lower.includes('센터 제출')) {
    category = '안내·서류'
    venueStats[venue].docs++
  } else {
    category = '진행 행사 학습'
    venueStats[venue].learnFiles++
  }

  // 환경장식물 카테고리 추출 (파일명 + 텍스트 키워드 매칭)
  let matched = ''
  for (const k of Object.keys(SIGNAGE_MAP)) {
    if (f.name.includes(k)) { matched = SIGNAGE_MAP[k]; break }
  }
  // 텍스트 파일이면 본문 분석
  if (!matched && ['xlsx', 'xls', 'docx', 'pptx'].includes(f.ext)) {
    const t = await extractTextFromZip(f.path, f.ext === 'xlsx' || f.ext === 'xls')
    for (const k of Object.keys(SIGNAGE_MAP)) {
      if (t.includes(k)) { matched = SIGNAGE_MAP[k]; break }
    }
  }
  if (matched) {
    venueStats[venue].signage[matched] = (venueStats[venue].signage[matched] ?? 0) + 1
    signageType = matched
  }

  // 행사명·코드 추출 (경로 = L2_*·L3_*·xxx0xx 패턴)
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}/)?.[0] ?? ''
  if (codeMatch) venueStats[venue].events.add(codeMatch)

  // L2 홀 추출
  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3'))
  const l2 = l2Part ? l2Part.replace(/^L[23]_/, '').replace(/_\d{6}.*$/, '').trim() : ''

  fileDetail.push({
    venue,
    category,
    l2,
    code: codeMatch,
    event: eventMatch.replace(/^L[23]_/, '').replace(/_\d{6}.*$/, '').replace(codeMatch, '').trim(),
    file: f.name,
    signage: signageType || (f.ext === 'pdf' ? 'PDF 문서' : f.ext === 'jpg' || f.ext === 'png' || f.ext === 'jpeg' ? '이미지 시안' : '기타'),
  })
}
console.log(`  ✓ 잔존 ${remaining.length}건 분석 완료·환경장식물 매칭 ${fileDetail.filter(d => d.signage && !['PDF 문서', '이미지 시안', '기타', '미분류'].includes(d.signage)).length}건`)

// ───────── 3단계: 보고 xlsx (260519 양식 정합) ─────────
console.log('\n[3/3] 보고 xlsx 생성...')
const wb = xlsx.utils.book_new()

// 시트 1 = 행사장 요약 (260519 양식: # | 행사장 | 기본 도면 수 | 진행 행사 수 | 학습 파일 수 | 안내·서류 수 | 기본 도면 파일명 요약 | 진행 행사명 요약)
const summary = [['#', '행사장', '기본 도면 수', '진행 행사 수', '학습 파일 수', '안내·서류 수', '학습 환경장식물 카테고리 (TOP 5)', '진행 행사 (코드)']]
const venueOrder = Object.keys(venueStats).sort((a, b) => venueStats[b].learnFiles - venueStats[a].learnFiles)
venueOrder.forEach((v, i) => {
  const s = venueStats[v]
  const top = Object.entries(s.signage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`).join(', ')
  summary.push([i + 1, v, s.drawings, s.events.size, s.learnFiles, s.docs, top || '—', Array.from(s.events).join(', ') || '—'])
})
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(summary), '1. 행사장 요약')

// 시트 2 = 학습 파일 상세 (260519 양식: # | 행사장 | 분류 | L2 홀 | 행사 코드 | 행사명 | 파일명 | 학습 카테고리)
const detail = [['#', '행사장', '분류', 'L2 홀', '행사 코드', '행사명', '파일명', '학습 카테고리']]
fileDetail.sort((a, b) => a.venue.localeCompare(b.venue, 'ko') || a.file.localeCompare(b.file, 'ko'))
fileDetail.forEach((d, i) => detail.push([i + 1, d.venue, d.category, d.l2, d.code, d.event, d.file, d.signage]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(detail), '2. 학습 파일 상세')

// 시트 3 = 학습 결론 (본 사이클 신규)
const result = [
  ['환경장식물 학습 결론 (2026-05-20)'],
  [''],
  ['전체 잔존 파일', remaining.length + '건'],
  ['환경장식물 카테고리 매칭', fileDetail.filter(d => d.signage && !['PDF 문서', '이미지 시안', '기타', '미분류'].includes(d.signage)).length + '건'],
  [''],
  ['행사장별 학습 환경장식물 종류 매칭'],
]
venueOrder.forEach(v => {
  const s = venueStats[v]
  const sig = Object.entries(s.signage).sort((a, b) => b[1] - a[1])
  if (sig.length > 0) {
    result.push([v])
    sig.forEach(([k, c]) => result.push(['', k, c + '건']))
  }
})
result.push([''])
result.push(['처리 진행 영역'])
result.push(['', 'jpg·png 233건 = Vision API 영역·미진행 (외부 비용·시간)'])
result.push(['', 'pdf 79건 = OCR 영역·미진행 (한국어 OCR)'])
result.push(['', '본 보고 = 텍스트 추출 + 파일명 매칭 기반'])
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(result), '3. 학습 결론')

xlsx.writeFile(wb, OUT)
console.log(`  ✓ 보고 xlsx = ${OUT}`)
console.log('\n완료.')
