// 행사별 폴더 안 제작물리스트 엑셀 일괄 파싱.
// 출력: 환경장식물 카테고리 빈도, 재질 분포, 비표준 규격 발견.
// 사용: node scripts/parse_signage_lists.mjs

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

function findExcels(dir, depth = 0, found = []) {
  if (depth > 3) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (stat.isDirectory()) {
      findExcels(p, depth + 1, found)
    } else if (/제작물.*리스트.*\.xlsx?$/i.test(e) || /제작물리스트.*\.xlsx?$/i.test(e)) {
      found.push(p)
    }
  }
  return found
}

const files = findExcels(ROOT)
console.log(`발견된 제작물리스트 엑셀: ${files.length}개`)

const categoryCount = {}
const materialCount = {}
const sizes = []
const itemsByEvent = {}

// 명세 §10: 17컬럼 — 구분(장소대분류) / 품목(환경장식물종류) 분리
const HEADER_KEYS = {
  no: ['no', '번호', 'no.', '연번'],
  item: ['품목', '제작물', '환경장식물', '품명'],         // 환경장식물 종류
  bigarea: ['구분'],                                  // 장소 대분류
  location: ['장소', '설치위치', '위치'],              // 세부 위치
  size: ['규격', '사이즈', '크기'],
  material: ['재질', '소재'],
  quantity: ['수량', '개수'],
}

function detectColumns(header) {
  const result = {}
  for (const [key, names] of Object.entries(HEADER_KEYS)) {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i] || '').trim()
      if (!h) continue
      if (names.some(n => h.replace(/\s+/g, '').toLowerCase().includes(n.replace(/\s+/g, '').toLowerCase()))) {
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
    const eventName = f.split(/[\\/]/).slice(-2, -1)[0]
    const items = []
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      let headerIdx = aoa.findIndex(r => r.some(c => /^(NO|번호)$/i.test(String(c).trim())))
      if (headerIdx === -1) {
        headerIdx = aoa.findIndex(r => r.some(c => /구분|품목|규격|재질/.test(String(c))))
        if (headerIdx === -1) continue
      }
      const cols = detectColumns(aoa[headerIdx])
      if (cols.item === undefined && cols.size === undefined) continue

      for (const row of aoa.slice(headerIdx + 1)) {
        if (!row.some(c => String(c).trim())) continue
        const item = cols.item !== undefined ? String(row[cols.item] || '').trim() : ''
        const size = cols.size !== undefined ? String(row[cols.size] || '').trim() : ''
        const material = cols.material !== undefined ? String(row[cols.material] || '').trim() : ''
        const quantity = cols.quantity !== undefined ? row[cols.quantity] : null

        if (!item && !size) continue

        if (item) categoryCount[item] = (categoryCount[item] || 0) + 1
        if (material) materialCount[material] = (materialCount[material] || 0) + 1

        const sizeMatch = size.match(/(\d+)\s*[\*x×]\s*(\d+)/)
        if (sizeMatch) sizes.push({ width: parseInt(sizeMatch[1]), height: parseInt(sizeMatch[2]), item, material })

        items.push({ item, size, material, quantity })
        totalItems++
      }
    }
    if (items.length > 0) {
      itemsByEvent[eventName] = items
      parsed++
    } else {
      failed++
    }
  } catch (e) {
    failed++
    console.error(`파싱 실패: ${f.split(/[\\/]/).slice(-1)[0]} — ${e.message}`)
  }
}

console.log(`\n파싱 성공: ${parsed} / ${parsed + failed}`)
console.log(`총 제작물 행: ${totalItems}`)

console.log(`\n=== 카테고리 빈도 (TOP 30) ===`)
const sortedCats = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 30)
for (const [cat, n] of sortedCats) console.log(`  ${cat.padEnd(40)} ${n}`)

console.log(`\n=== 재질 빈도 (TOP 30) ===`)
const sortedMats = Object.entries(materialCount).sort((a, b) => b[1] - a[1]).slice(0, 30)
for (const [mat, n] of sortedMats) console.log(`  ${mat.padEnd(40)} ${n}`)

// 비표준 규격 검사 — 표준 11종에 매칭 안 되는 것
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
const sortedNonStd = Object.entries(nonStandardGrouped).sort((a, b) => b[1] - a[1]).slice(0, 20)
console.log(`\n=== 비표준 규격 (TOP 20) — 표준 11종 외 ===`)
console.log(`총 ${nonStandard.length}건`)
for (const [size, n] of sortedNonStd) console.log(`  ${size.padEnd(20)} ${n}회`)

writeFileSync(
  'lib/data/_signage_analysis.json',
  JSON.stringify({
    totalEvents: parsed,
    totalItems,
    categoryCount,
    materialCount,
    nonStandardSizes: nonStandardGrouped,
  }, null, 2),
  'utf-8'
)
console.log('\n저장: lib/data/_signage_analysis.json')
