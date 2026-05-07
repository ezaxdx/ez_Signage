// v3 최종: v1 검출률 + v2 정규화 + 행사별 통계 추적
// 사용: node scripts/parse_signage_lists_v3.mjs

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, dirname } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

function findExcels(dir, depth = 0, found = []) {
  if (depth > 4) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (stat.isDirectory()) findExcels(p, depth + 1, found)
    else if (/\.xlsx?$/i.test(e) && !/수행실적리스트/.test(e)) found.push(p)
  }
  return found
}

// 신호어 ↔ 표준 카테고리 매핑
function normalizeCategory(raw) {
  if (!raw) return null
  const s = raw.replace(/\s+/g, '').toLowerCase()
  if (/^(x[-_]?배너|엑스배너|스프링배너|철재스프링배너|a배너|물통배너)/.test(s)) return 'X-배너'
  if (/^(i[-_]?배너|아이배너|스탠드pop)/.test(s)) return 'I-배너'
  if (/^(가로현수막|가로배너|무대현수막|메인현수막|무대가로배너)/.test(s)) return '가로 현수막'
  if (/^(세로현수막|세로배너|드롭배너|난간배너)/.test(s)) return '세로 현수막'
  if (/^(통천)/.test(s)) return '통천'
  if (/^(가로등배너|빵빠레배너|가로등플래그)/.test(s)) return '가로등 배너'
  if (/포디움|연단/.test(s)) return '포디움 타이틀'
  if (/^(폼보드|컨설팅폼보드|안내폼보드|l보드|큐방|포함보드)/.test(s)) return '폼보드'
  if (/^(a4)/.test(s)) return 'A4'
  if (/^(a3)/.test(s)) return 'A3'
  if (/^(백월|백드롭)/.test(s)) return '백월'
  if (/^(명찰|명패)/.test(s)) return '명찰'
  if (/^(시트지|바닥스티커|바닥시트)/.test(s)) return '시트지'
  if (/^(투어용현수막|행사장현수막)/.test(s)) return '가로 현수막'
  return null  // 분류 안됨 → 시그너지 아닐 가능성 높음
}

function isSignagePattern(raw) {
  if (!raw) return false
  const s = raw.toLowerCase()
  // 명백히 운영 물품인 것 제외
  if (/노트북|정수기|테이블|의자|소파|협탁|모니터|tv|프린터|복합기|전화기|헤드셋|마이크|화이트보드|문구박스|마스킹|폼텍|수반|스튜디오|프로그램북|뱃지|키트|책자|자료집/.test(s)) return false
  // 시그너지 키워드 포함
  if (/배너|현수막|폼보드|포디움|a4|a3|시트|명찰|명패|사인|보드|타이틀/i.test(s)) return true
  return false
}

const HEADER_KEYS = {
  no: ['no', '번호', 'no.', '연번', '순번'],
  item: ['품목', '제작물', '환경장식물', '품명', '항목'],
  bigarea: ['구분', '대분류'],
  size: ['규격', '사이즈', '크기', '치수'],
  material: ['재질', '소재', '재료'],
  quantity: ['수량', '개수', '수 량'],
}

function detectColumns(header) {
  const result = {}
  for (const [key, names] of Object.entries(HEADER_KEYS)) {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i] || '').trim().replace(/\s+/g, '').toLowerCase()
      if (!h) continue
      if (names.some(n => h.includes(n.replace(/\s+/g, '').toLowerCase()))) {
        result[key] = i
        break
      }
    }
  }
  return result
}

const files = findExcels(ROOT)
console.log(`발견 엑셀: ${files.length}개\n`)

const eventStats = {}    // folder → { rawCount, signageCount, normalizedCounts, materials, sizes }
const globalCategoryCount = {}
const globalMaterialCount = {}
const globalSizes = []

for (const f of files) {
  try {
    const wb = XLSX.read(readFileSync(f), { type: 'buffer' })
    const eventFolder = basename(dirname(f))
    if (!eventStats[eventFolder]) {
      eventStats[eventFolder] = { rawCount: 0, signageCount: 0, normalized: {}, materials: {}, sizes: [], excelFile: basename(f) }
    }
    const ev = eventStats[eventFolder]

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      let headerIdx = aoa.findIndex(r => r.some(c => /^(NO|번호|연번|순번|NO\.)$/i.test(String(c).trim())))
      if (headerIdx === -1) headerIdx = aoa.findIndex(r => r.some(c => /구분|품목|규격|재질/.test(String(c))))
      if (headerIdx === -1) continue

      const cols = detectColumns(aoa[headerIdx])
      // 품목 없으면 구분 사용
      let itemCol = cols.item
      if (itemCol === undefined && cols.bigarea !== undefined) {
        const sample = aoa.slice(headerIdx + 1, headerIdx + 21).map(r => String(r[cols.bigarea] || ''))
        const hits = sample.filter(s => isSignagePattern(s)).length
        if (hits >= 2) itemCol = cols.bigarea
      }
      if (itemCol === undefined && cols.size === undefined) continue

      for (const row of aoa.slice(headerIdx + 1)) {
        if (!row.some(c => String(c).trim())) continue
        const itemRaw = itemCol !== undefined ? String(row[itemCol] || '').trim() : ''
        const size = cols.size !== undefined ? String(row[cols.size] || '').trim() : ''
        const material = cols.material !== undefined ? String(row[cols.material] || '').trim() : ''

        if (!itemRaw && !size) continue
        ev.rawCount++

        if (!isSignagePattern(itemRaw)) continue
        ev.signageCount++

        const norm = normalizeCategory(itemRaw) || itemRaw
        ev.normalized[norm] = (ev.normalized[norm] || 0) + 1
        globalCategoryCount[norm] = (globalCategoryCount[norm] || 0) + 1

        if (material) {
          ev.materials[material] = (ev.materials[material] || 0) + 1
          globalMaterialCount[material] = (globalMaterialCount[material] || 0) + 1
        }

        const sm = size.match(/(\d+)\s*[\*x×]\s*(\d+)/)
        if (sm) {
          const w = parseInt(sm[1]), h = parseInt(sm[2])
          if (w >= 50 && h >= 50) {  // 너무 작은 값 (단순 셀 좌표) 제외
            ev.sizes.push({ w, h })
            globalSizes.push({ w, h, item: norm })
          }
        }
      }
    }
  } catch (e) {
    console.error(`파싱 실패: ${basename(f)} — ${e.message}`)
  }
}

const validEvents = Object.entries(eventStats).filter(([, v]) => v.signageCount > 0)
console.log(`성공: ${validEvents.length}/${files.length}개 행사`)
console.log(`총 시그너지: ${validEvents.reduce((s, [, v]) => s + v.signageCount, 0)}개`)

console.log(`\n=== 행사별 시그너지 수 ===`)
for (const [name, v] of validEvents.sort((a, b) => b[1].signageCount - a[1].signageCount)) {
  console.log(`  ${name.slice(0, 50).padEnd(52)} ${String(v.signageCount).padStart(3)} (전체 ${v.rawCount}건 중)`)
}

console.log(`\n=== 정규화 카테고리 빈도 (TOP 20) ===`)
const sortedCats = Object.entries(globalCategoryCount).sort((a, b) => b[1] - a[1]).slice(0, 20)
for (const [c, n] of sortedCats) console.log(`  ${c.padEnd(20)} ${n}`)

console.log(`\n=== 재질 빈도 ===`)
for (const [m, n] of Object.entries(globalMaterialCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(20)} ${n}`)
}

const STD = new Set(['600x1800','600x1600','5000x900','900x5000','1000x5000','600x200','600x900','210x297','297x210','297x420','420x297'])
const ns = globalSizes.filter(s => !STD.has(`${s.w}x${s.h}`))
const nsGrouped = {}
for (const s of ns) {
  const k = `${s.w}x${s.h}`
  nsGrouped[k] = (nsGrouped[k] || 0) + 1
}
console.log(`\n=== 비표준 규격 (${ns.length}/${globalSizes.length} = ${(ns.length/globalSizes.length*100).toFixed(1)}%) ===`)
for (const [s, n] of Object.entries(nsGrouped).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${s.padEnd(20)} ${n}`)
}

writeFileSync('lib/data/_signage_analysis_v3.json', JSON.stringify({
  validEvents: validEvents.length,
  totalSignage: validEvents.reduce((s, [, v]) => s + v.signageCount, 0),
  perEvent: Object.fromEntries(validEvents.map(([k, v]) => [k, { signageCount: v.signageCount, rawCount: v.rawCount, topCategories: Object.entries(v.normalized).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c}(${n})`) }])),
  categoryCount: globalCategoryCount,
  materialCount: globalMaterialCount,
  nonStandardSizes: nsGrouped,
  nonStandardPct: parseFloat((ns.length/globalSizes.length*100).toFixed(1)),
}, null, 2), 'utf-8')
console.log('\n저장: lib/data/_signage_analysis_v3.json')
