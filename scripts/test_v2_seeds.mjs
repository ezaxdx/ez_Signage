// test_v2_seeds.mjs — v2 시드 정합성 자동 검증
//
// 실행: node scripts/test_v2_seeds.mjs
// 사용: 컴펌 전 시드 데이터 무결성 사전 검증 (DB 변경 0건, read-only)
//
// 검증 항목:
//   1. SIGNAGE_CATEGORIES_V2 — 24 키 unique, typical_size_mm 범위 유효
//   2. VENUES_V2 — venue_key unique, 권역 18종 enum
//   3. EVENT_SERIES_V2 — name unique
//   4. EVENT_ORDER_LISTS_V2 — event_code 6자리 YYNNNN, venue_key 매칭
//   5. PART_CATEGORY_MAPPING — 카테고리 키 모두 24종 안에 존재
//   6. PART_CATEGORY_MAPPING — 프로그램 파트 12종 (40.04~40.20) 일관성

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const V2_DIST = path.join(__dirname, 'dist', 'v2')
if (!fs.existsSync(V2_DIST)) {
  console.error('❌ scripts/dist/v2/ 미존재. 먼저 컴파일:')
  console.error('   npx tsc lib/data/v2/*.ts lib/ai/v2/*.ts --outDir scripts/dist --module ESNext --target ES2022 --moduleResolution node')
  process.exit(1)
}

const { SIGNAGE_CATEGORIES_V2 } = await import(path.join(V2_DIST, 'signageCategoriesSeed.js'))
const { VENUES_V2 } = await import(path.join(V2_DIST, 'venueListSeed.js'))
const { EVENT_SERIES_V2 } = await import(path.join(V2_DIST, 'eventSeriesSeed.js'))
const { EVENT_ORDER_LISTS_V2 } = await import(path.join(V2_DIST, 'eventOrderListSeed.js'))
const { PART_CATEGORY_MAPPING } = await import(path.join(__dirname, 'dist', 'ai', 'v2', 'recommendationLogic.js'))

let totalChecks = 0
let totalFails = 0
const fails = []

function check(name, condition, detail = '') {
  totalChecks++
  if (!condition) {
    totalFails++
    fails.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`)
  }
}

console.log('='.repeat(70))
console.log('v2 시드 정합성 검증')
console.log('='.repeat(70))

// ============================================================
// 1. SIGNAGE_CATEGORIES_V2 검증
// ============================================================
console.log('\n[1] signageCategoriesSeed.ts — 24 카테고리')

check('카테고리 총 24종', SIGNAGE_CATEGORIES_V2.length === 24, `현재 ${SIGNAGE_CATEGORIES_V2.length}`)

const keySet = new Set()
const duplicates = []
for (const c of SIGNAGE_CATEGORIES_V2) {
  if (keySet.has(c.key)) duplicates.push(c.key)
  keySet.add(c.key)
}
check('카테고리 key unique', duplicates.length === 0, duplicates.join(', '))

const confirmed = SIGNAGE_CATEGORIES_V2.filter((c) => !c.is_pending)
const pending = SIGNAGE_CATEGORIES_V2.filter((c) => c.is_pending)
check('확정 15종', confirmed.length === 15, `현재 ${confirmed.length}`)
check('pending 9종', pending.length === 9, `현재 ${pending.length}`)

for (const c of SIGNAGE_CATEGORIES_V2) {
  check(
    `${c.key} typical_size_mm 유효`,
    c.typical_size_mm.min_width > 0 &&
      c.typical_size_mm.max_width >= c.typical_size_mm.min_width &&
      c.typical_size_mm.min_height > 0 &&
      c.typical_size_mm.max_height >= c.typical_size_mm.min_height
  )
  check(`${c.key} priority 1·2·3`, [1, 2, 3].includes(c.priority))
  check(`${c.key} match_keywords ≥ 1`, c.match_keywords && c.match_keywords.length >= 1)
}

// ============================================================
// 2. VENUES_V2 검증
// ============================================================
console.log('\n[2] venueListSeed.ts — 43 L1 venue')

check('venue 총 43개', VENUES_V2.length === 43, `현재 ${VENUES_V2.length}`)

const venueKeySet = new Set()
for (const v of VENUES_V2) {
  if (venueKeySet.has(v.venue_key)) {
    fails.push(`  ❌ venue_key 중복: ${v.venue_key}`)
    totalFails++
    totalChecks++
  }
  venueKeySet.add(v.venue_key)
}

const validRegions = new Set([
  '서울특별시', '부산광역시', '인천광역시', '대구광역시', '대전광역시',
  '광주광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
  '해외',
])
for (const v of VENUES_V2) {
  check(`venue ${v.venue_key} 권역 유효`, validRegions.has(v.region), `${v.region}`)
}

// ============================================================
// 3. EVENT_SERIES_V2 검증
// ============================================================
console.log('\n[3] eventSeriesSeed.ts — 24 시리즈')

check('시리즈 ≥ 20', EVENT_SERIES_V2.length >= 20, `현재 ${EVENT_SERIES_V2.length}`)

const serSet = new Set()
for (const s of EVENT_SERIES_V2) {
  if (serSet.has(s.name)) {
    fails.push(`  ❌ series name 중복: ${s.name}`)
    totalFails++
    totalChecks++
  }
  serSet.add(s.name)
}

// ============================================================
// 4. EVENT_ORDER_LISTS_V2 검증
// ============================================================
console.log('\n[4] eventOrderListSeed.ts — 7 발주 리스트')

check('발주 리스트 ≥ 7', EVENT_ORDER_LISTS_V2.length >= 7, `현재 ${EVENT_ORDER_LISTS_V2.length}`)

for (const e of EVENT_ORDER_LISTS_V2) {
  check(`event_code ${e.event_code} 6자리 YYNNNN`, /^\d{6}$/.test(e.event_code))
  check(`event ${e.event_code} venue_key 존재`, venueKeySet.has(e.venue_key), `${e.venue_key}`)
  check(`event ${e.event_code} order_rows ≥ 1`, e.order_rows && e.order_rows.length >= 1)
  // 카테고리 키 모두 마스터 안에 있는지
  for (const row of e.order_rows) {
    check(
      `event ${e.event_code} row category ${row.category} 마스터 존재`,
      keySet.has(row.category)
    )
  }
}

// ============================================================
// 5. PART_CATEGORY_MAPPING 검증
// ============================================================
console.log('\n[5] recommendationLogic.ts — 파트별 카테고리 매핑')

const expectedParts = [
  '40.04', '40.05', '40.06', '40.07', '40.08', '40.09', '40.10', '40.11',
  '40.17', '40.18', '40.19', '40.20',
]
const actualParts = Object.keys(PART_CATEGORY_MAPPING)
for (const p of expectedParts) {
  check(`PART_CATEGORY_MAPPING ${p} 정의`, actualParts.includes(p))
}

for (const [part, cats] of Object.entries(PART_CATEGORY_MAPPING)) {
  for (const cat of cats) {
    check(`PART ${part} → ${cat} 마스터 존재`, keySet.has(cat))
  }
}

// ============================================================
// 결과 출력
// ============================================================
console.log('\n' + '='.repeat(70))
console.log(`✅ 검증 ${totalChecks - totalFails}/${totalChecks} 통과`)
if (totalFails > 0) {
  console.log(`❌ ${totalFails}건 실패:`)
  for (const f of fails) console.log(f)
  process.exit(1)
} else {
  console.log('🎉 모든 검증 통과 — v2 시드 정합성 OK')
  process.exit(0)
}
