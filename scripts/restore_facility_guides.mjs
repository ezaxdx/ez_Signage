// 미등록 24 행사장 안 시설 가이드 영역 자료 식별 + 정리본 복구
// 학습 가능 영역 = 시설 가이드·매뉴얼·평면도·도면 (환경장식물 추천 보강 영역)
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { cp } from 'fs/promises'
import { join, dirname } from 'path'
import xlsx from 'xlsx'

const SRC = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/시설_가이드_260521'
const SCAN_PATH = 'scripts/scan_unused.json'

const REGISTERED = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

// 학습 가능 형식 (시설 가이드·매뉴얼·발주 정보 추출 영역)
const LEARN_EXT = new Set(['pdf', 'docx', 'doc', 'pptx', 'xlsx', 'xls'])

// 시설 가이드 영역 (파일명 키워드)
function classifyFacility(name) {
  const lower = name.toLowerCase()
  if (/매뉴얼|manual|가이드|guide|안내서|이용\s*안내/.test(name)) return '시설 가이드·매뉴얼'
  if (/평면도|도면|배치도|cad|floor|plan/.test(lower) || /\.(dwg|dwf)$/.test(lower)) return '평면도·도면'
  if (/리깅|rigging|하중|load|천장|천정|용량/.test(name)) return '리깅·하중·천장 정보'
  if (/시설|facility|운영|규정|이용\s*규정/.test(name)) return '시설 운영 규정'
  if (/제작물|발주|리스트|환경/.test(name)) return '환경장식물 발주리스트'
  if (/대관|임대|신청서|application/.test(name)) return '대관·임대 양식'
  if (/요율|가격|price|fee/.test(name)) return '요율·가격표'
  return '기타 (시설 영역 가능성)'
}

const scanData = JSON.parse(readFileSync(SCAN_PATH, 'utf-8'))
const candidates = scanData.result.filter(r =>
  !REGISTERED.has(r.venue) && LEARN_EXT.has(r.ext) && !r.status.startsWith('삭제 후보')
)

console.log(`미등록 행사장 안 학습 가능 형식 자료 = ${candidates.length}건\n`)

// 카테고리·행사장별 분류
const byVenueCat = {}
for (const r of candidates) {
  const cat = classifyFacility(r.name)
  if (!byVenueCat[r.venue]) byVenueCat[r.venue] = {}
  if (!byVenueCat[r.venue][cat]) byVenueCat[r.venue][cat] = []
  byVenueCat[r.venue][cat].push(r)
}

// 카테고리별 합계
const catTotal = {}
for (const v of Object.values(byVenueCat)) {
  for (const [c, arr] of Object.entries(v)) catTotal[c] = (catTotal[c] || 0) + arr.length
}
console.log('=== 카테고리별 ===')
Object.entries(catTotal).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}건  ${c}`))

console.log('\n=== 행사장별 학습 가치 ★ 영역 (가이드·매뉴얼·평면도·리깅·운영 규정) ===')
const HIGH_VALUE = new Set(['시설 가이드·매뉴얼', '평면도·도면', '리깅·하중·천장 정보', '시설 운영 규정', '환경장식물 발주리스트'])
const cpQueue = []
for (const [venue, cats] of Object.entries(byVenueCat)) {
  const highValue = []
  for (const [c, arr] of Object.entries(cats)) {
    if (HIGH_VALUE.has(c)) highValue.push(...arr)
  }
  if (highValue.length > 0) {
    console.log(`  ${String(highValue.length).padStart(3)}건  ${venue}`)
    cpQueue.push(...highValue)
  }
}

console.log(`\ncp 대상 = ${cpQueue.length}건\n`)
console.log('[복구 진행]...')
mkdirSync(DEST, { recursive: true })

let ok = 0, fail = 0
for (const r of cpQueue) {
  const srcPath = join(SRC, r.rel).replace(/\//g, '\\')
  const destPath = join(DEST, r.rel).replace(/\//g, '\\')
  try {
    mkdirSync(dirname(destPath), { recursive: true })
    await cp(srcPath, destPath, { force: true })
    ok++
  } catch (e) {
    fail++
  }
}
console.log(`  ✓ 복구 ${ok}/${cpQueue.length}건·실패 ${fail}건`)

// 시트 5용 데이터 출력
const sheet5Data = cpQueue.map(r => ({
  venue_raw: r.venue,
  file: r.name,
  path: r.rel,
  category: classifyFacility(r.name),
  ext: r.ext,
  size: r.size,
}))

import('fs').then(fs => fs.writeFileSync('scripts/facility_guides_260521.json', JSON.stringify(sheet5Data, null, 2), 'utf-8'))
console.log(`\n출력: scripts/facility_guides_260521.json (시트 5용)`)
