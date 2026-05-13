// 스마트국토엑스포 2022 발주엑셀 70행 → 8항목 통계 추출
// 추천 시뮬레이션 보고서용 데이터 생성

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const FILE = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별/[핵심] 높음이상/킨텍스 제1전시장 5홀/2022 스마트국토엑스포 223080/20221027 스마트국토엑스포_작물시트만(글로벌+이벤트)_공식행사수정.xlsx'

const wb = XLSX.read(readFileSync(FILE), { type: 'buffer' })
const sheet = wb.Sheets[wb.SheetNames[0]]
const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// 헤더 찾기
let headerIdx = aoa.findIndex(r => r.some(c => /^NO\.?$/i.test(String(c).trim())))
const headers = aoa[headerIdx].map(c => String(c || '').trim())
const dataRows = aoa.slice(headerIdx + 1).filter(r => {
  const no = String(r[0] || '').trim()
  return no && no !== ''
})

console.log(`총 ${dataRows.length}행 추출`)
console.log(`헤더: ${headers.join(' | ')}`)

// 컬럼 인덱스
const idx = (re) => headers.findIndex(h => re.test(h))
const cIdx = {
  no: idx(/^NO/i),
  part: idx(/^파트$/),
  loc1: idx(/^장소1$/),
  loc2: idx(/^장소2$/),
  loc3: idx(/^장소3$/),
  type1: idx(/^종류1$/),
  type2: idx(/^종류2$/),
  size: idx(/사이즈|규격/),
  qty: idx(/^수량$/),
  content: idx(/^내용$/),
  setup: idx(/세팅/),
  teardown: idx(/철수|철거/),
}

// raw 객체화
const items = dataRows.map(r => ({
  no: String(r[cIdx.no] || ''),
  part: String(r[cIdx.part] || '').trim(),
  loc1: String(r[cIdx.loc1] || '').trim(),
  loc2: String(r[cIdx.loc2] || '').trim(),
  loc3: String(r[cIdx.loc3] || '').trim(),
  type1: String(r[cIdx.type1] || '').trim(),
  type2: String(r[cIdx.type2] || '').trim(),
  size: String(r[cIdx.size] || '').trim(),
  qty: parseInt(String(r[cIdx.qty] || '0').replace(/\D/g, '')) || 0,
  content: String(r[cIdx.content] || '').trim(),
}))

// === 1. 장소(loc1·loc2) 분포 ===
console.log('\n=== 장소 (loc1) 분포 ===')
const byLoc1 = {}
items.forEach(i => { byLoc1[i.loc1] = (byLoc1[i.loc1] || 0) + 1 })
Object.entries(byLoc1).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}건 │ ${k}`))

console.log('\n=== loc1 + loc2 조합 ===')
const byLocKey = {}
items.forEach(i => {
  const k = `${i.loc1} > ${i.loc2}`
  byLocKey[k] = (byLocKey[k] || 0) + 1
})
Object.entries(byLocKey).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}건 │ ${k}`))

// === 2. 종류(type1) 분포 ===
console.log('\n=== 종류 (type1) 분포 ===')
const byType = {}
const qtyByType = {}
items.forEach(i => {
  byType[i.type1] = (byType[i.type1] || 0) + 1
  qtyByType[i.type1] = (qtyByType[i.type1] || 0) + i.qty
})
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${v}건 / 총 ${qtyByType[k]}개 │ ${k}`)
})

// === 3. 파트 분포 (용도 묶음 추론용) ===
console.log('\n=== 파트(용도) 분포 ===')
const byPart = {}
items.forEach(i => { byPart[i.part] = (byPart[i.part] || 0) + 1 })
Object.entries(byPart).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}건 │ ${k}`))

// === 4. 종류 × 파트 매트릭스 (장소·용도별 어떤 제작물 쓰였나) ===
console.log('\n=== 파트 × 종류 매트릭스 (top) ===')
const matrix = {}
items.forEach(i => {
  const k = `${i.part} │ ${i.type1}`
  if (!matrix[k]) matrix[k] = { cnt: 0, qty: 0 }
  matrix[k].cnt += 1
  matrix[k].qty += i.qty
})
Object.entries(matrix).sort((a, b) => b[1].cnt - a[1].cnt).slice(0, 20).forEach(([k, v]) => {
  console.log(`  ${v.cnt}건 / ${v.qty}개 │ ${k}`)
})

// === 5. 규격 분포 ===
console.log('\n=== 규격 빈도 TOP 10 ===')
const bySize = {}
items.forEach(i => { if (i.size) bySize[i.size] = (bySize[i.size] || 0) + 1 })
Object.entries(bySize).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`  ${v}건 │ ${k}`))

// === 6. 종합 통계 ===
console.log('\n=== 종합 ===')
console.log(`전체 제작물 종류: ${Object.keys(byType).length}종`)
console.log(`전체 제작물 수량: ${items.reduce((s, i) => s + i.qty, 0)}개`)
console.log(`전체 행: ${items.length}행`)
console.log(`파트 수: ${Object.keys(byPart).length}개`)
console.log(`고유 위치: ${Object.keys(byLocKey).length}개`)

// === 7. 추천 시뮬레이션 데이터 ===
console.log('\n=== 추천 시뮬레이션 ===')
console.log('가정: "킨텍스 1전시장 5홀 + 박람회 + 가을" 행사 신규 생성 시')
console.log('과거 동일 행사장 데이터(이 70행)에서 자동 추천될 제작물 패키지:')
const suggested = Object.entries(byType)
  .sort((a, b) => qtyByType[b[0]] - qtyByType[a[0]])
  .slice(0, 8)
suggested.forEach(([type, cnt]) => {
  console.log(`  · ${type.padEnd(15)} 평균 ${qtyByType[type]}개 (${cnt}건 등장)`)
})
