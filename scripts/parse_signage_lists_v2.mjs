// v2: 행사별 폴더 안 모든 엑셀을 시도. 동의어·카테고리 정규화 강화.
// 사용: node scripts/parse_signage_lists_v2.mjs

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

// 모든 xlsx 찾기 (수행실적리스트는 제외)
function findAllExcels(dir, depth = 0, found = []) {
  if (depth > 4) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (stat.isDirectory()) {
      findAllExcels(p, depth + 1, found)
    } else if (/\.xlsx?$/i.test(e) && !/수행실적리스트/.test(e)) {
      found.push(p)
    }
  }
  return found
}

// 카테고리 정규화 — 동의어를 표준명으로 변환
function normalizeCategory(raw) {
  if (!raw) return null
  const s = raw.replace(/\s+/g, '').toLowerCase()
  // X-배너 동의어
  if (/^(x[-_]?배너|엑스배너|x[-_]?banner|스프링배너|철재스프링배너|a배너|물통배너)$/.test(s)) return 'X-배너'
  // I-배너 동의어
  if (/^(i[-_]?배너|아이배너|i[-_]?banner|스탠드pop)$/.test(s)) return 'I-배너'
  // 가로/세로/통천 현수막
  if (/^(가로현수막|가로배너|무대현수막|메인현수막|무대가로배너)$/.test(s)) return '가로 현수막'
  if (/^(세로현수막|세로배너|드롭배너|난간배너)$/.test(s)) return '세로 현수막'
  if (/^(통천|통천배너|천장배너|천장통천)$/.test(s)) return '통천'
  if (/^(가로등배너|빵빠레배너|롯데호텔가로등배너|가로등플래그)$/.test(s)) return '가로등 배너'
  // 포디움
  if (/포디움|연단/.test(s)) return '포디움 타이틀'
  // 폼보드
  if (/^(폼보드|컨설팅폼보드|안내폼보드|l보드|큐방|포함보드)$/.test(s)) return '폼보드'
  // A4/A3
  if (/^(a4|영접a4|a4안내|a4세로|a4가로|피켓a4)$/.test(s)) return 'A4'
  if (/^(a3|a3안내|a3세로|a3가로|피켓a3|a3pop|a3안내pop)$/.test(s)) return 'A3'
  // 백월
  if (/^(백월|백월현수막|백드롭|백판넬)$/.test(s)) return '백월'
  // 명찰류
  if (/^(명찰|명패|좌석명패|네임택)$/.test(s)) return '명찰'
  // 시트지/스티커
  if (/^(바닥스티커|시트지|바닥시트|유도사인)$/.test(s)) return '시트지'
  return raw  // 분류 안 되면 원본 반환
}

// "제작물 종류"인지 판별 — '발표자료집', '회의실 모니터' 같은 비제작물 제외
function isSignageItem(item) {
  if (!item) return false
  const s = item.replace(/\s+/g, '').toLowerCase()
  // 명백히 제작물이 아닌 것들 제외
  if (/자료집|책자|모니터|tv|프로그램북|키트|뱃지/.test(s)) return false
  return true
}

const files = findAllExcels(ROOT)
console.log(`발견된 엑셀 (수행실적 제외): ${files.length}개`)
files.forEach(f => console.log(`  ${basename(f)}`))

const categoryCount = {}              // 정규화 후 카테고리 빈도
const rawCategoryCount = {}           // 원본 (동의어 발견용)
const materialCount = {}
const sizes = []
const eventStats = {}                 // 폴더별 통계

const HEADER_KEYS = {
  no: ['no', '번호', 'no.', '연번', '순번'],
  // '구분'은 별도 bigarea 컬럼 (장소 분류) - item에 포함하면 안됨
  item: ['품목', '제작물', '환경장식물', '품명', '항목'],
  bigarea: ['구분', '대분류'],
  location: ['장소', '설치위치', '위치', '설치장소'],
  size: ['규격', '사이즈', '크기', '치수'],
  material: ['재질', '소재', '재료'],
  quantity: ['수량', '개수', '수 량'],
}

function detectColumns(header) {
  const result = {}
  for (const [key, names] of Object.entries(HEADER_KEYS)) {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i] || '').trim()
      if (!h) continue
      const hn = h.replace(/\s+/g, '').toLowerCase()
      if (names.some(n => hn.includes(n.replace(/\s+/g, '').toLowerCase()))) {
        result[key] = i
        break
      }
    }
  }
  return result
}

let totalItems = 0
let parsed = 0
let failed = 0

for (const f of files) {
  try {
    const wb = XLSX.read(readFileSync(f), { type: 'buffer' })
    const eventFolder = f.split(/[\\/]/).slice(-2, -1)[0]
    let eventItems = 0

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      // 헤더 후보 행 찾기 — 단계적 매칭
      let headerIdx = aoa.findIndex(r => r.some(c => /^(NO|번호|연번|순번|NO\.)$/i.test(String(c).trim())))
      if (headerIdx === -1) {
        headerIdx = aoa.findIndex(r => r.some(c => /구분|품목|규격|재질|장소/.test(String(c))))
      }
      if (headerIdx === -1) continue

      const cols = detectColumns(aoa[headerIdx])
      // '품목' 없으면 '구분'을 item으로 사용 (일부 엑셀은 구분만 있고 그게 제작물 종류)
      // 단, '구분' 컬럼이 location 카테고리(전시장/야외 등)로만 쓰인 경우 제외
      if (cols.item === undefined && cols.bigarea !== undefined) {
        // '구분' 값들 살펴보고 signage 패턴이 더 많으면 item으로 채택
        const sample = aoa.slice(headerIdx + 1, headerIdx + 11).map(r => String(r[cols.bigarea] || '').trim()).filter(Boolean)
        const signageHits = sample.filter(s => /배너|현수막|폼보드|포디움|a4|a3|시트|사인/i.test(s)).length
        if (signageHits >= 1) cols.item = cols.bigarea
      }
      if (cols.item === undefined && cols.size === undefined) continue

      for (const row of aoa.slice(headerIdx + 1)) {
        if (!row.some(c => String(c).trim())) continue
        const itemRaw = cols.item !== undefined ? String(row[cols.item] || '').trim() : ''
        const size = cols.size !== undefined ? String(row[cols.size] || '').trim() : ''
        const material = cols.material !== undefined ? String(row[cols.material] || '').trim() : ''
        const quantity = cols.quantity !== undefined ? row[cols.quantity] : null

        if (!itemRaw && !size) continue
        if (!isSignageItem(itemRaw)) continue   // 자료집·모니터 제외

        const normalized = normalizeCategory(itemRaw)
        if (itemRaw) rawCategoryCount[itemRaw] = (rawCategoryCount[itemRaw] || 0) + 1
        if (normalized) categoryCount[normalized] = (categoryCount[normalized] || 0) + 1
        if (material) materialCount[material] = (materialCount[material] || 0) + 1

        const sizeMatch = size.match(/(\d+)\s*[\*x×]\s*(\d+)/)
        if (sizeMatch) sizes.push({
          width: parseInt(sizeMatch[1]),
          height: parseInt(sizeMatch[2]),
          item: normalized || itemRaw,
          rawItem: itemRaw,
          material,
        })

        eventItems++
        totalItems++
      }
    }
    if (eventItems > 0) {
      eventStats[eventFolder] = (eventStats[eventFolder] || 0) + eventItems
      parsed++
    } else {
      failed++
    }
  } catch (e) {
    failed++
    console.error(`파싱 실패: ${basename(f)} — ${e.message}`)
  }
}

console.log(`\n파싱 성공: ${parsed} / ${parsed + failed}`)
console.log(`총 제작물 행: ${totalItems}`)

console.log(`\n=== 정규화 카테고리 빈도 ===`)
const sortedCats = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])
for (const [cat, n] of sortedCats) console.log(`  ${cat.padEnd(20)} ${n}`)

console.log(`\n=== 동의어 발견 후보 (정규화 안된 원본) ===`)
const unnorm = Object.entries(rawCategoryCount).filter(([k]) => !sortedCats.some(([c]) => c === k)).sort((a, b) => b[1] - a[1]).slice(0, 30)
for (const [cat, n] of unnorm) console.log(`  ${cat.padEnd(40)} ${n}`)

console.log(`\n=== 재질 빈도 ===`)
for (const [mat, n] of Object.entries(materialCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${mat.padEnd(20)} ${n}`)
}

const STANDARD_SIZES = new Set([
  '600x1800', '600x1600', '5000x900', '900x5000', '1000x5000', '600x200',
  '600x900', '210x297', '297x210', '297x420', '420x297',
])
const nonStandard = sizes.filter(s => !STANDARD_SIZES.has(`${s.width}x${s.height}`))
const nonStandardGrouped = {}
for (const ns of nonStandard) {
  const k = `${ns.width}x${ns.height}`
  nonStandardGrouped[k] = (nonStandardGrouped[k] || 0) + 1
}

console.log(`\n=== 비표준 규격 (총 ${nonStandard.length}건, 전체 ${sizes.length}의 ${(nonStandard.length/sizes.length*100).toFixed(1)}%) ===`)
const sortedNonStd = Object.entries(nonStandardGrouped).sort((a, b) => b[1] - a[1]).slice(0, 25)
for (const [size, n] of sortedNonStd) console.log(`  ${size.padEnd(20)} ${n}회`)

console.log(`\n=== 행사별 제작물 수 (상위 15개) ===`)
const sortedEvents = Object.entries(eventStats).sort((a, b) => b[1] - a[1]).slice(0, 15)
for (const [ev, n] of sortedEvents) console.log(`  ${ev.slice(0, 50).padEnd(50)} ${n}`)
const avgItems = sortedEvents.length > 0 ? Math.round(totalItems / parsed) : 0
console.log(`  평균: ${avgItems}건/행사`)

writeFileSync(
  'lib/data/_signage_analysis_v2.json',
  JSON.stringify({
    parsed,
    totalItems,
    avgItemsPerEvent: avgItems,
    categoryCount,
    rawCategoryCount,
    materialCount,
    nonStandardSizes: nonStandardGrouped,
    nonStandardTotal: nonStandard.length,
    nonStandardPct: parseFloat((nonStandard.length/sizes.length*100).toFixed(1)),
    eventStats,
  }, null, 2),
  'utf-8'
)
console.log('\n저장: lib/data/_signage_analysis_v2.json')
