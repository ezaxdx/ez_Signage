// Ezpmp_수행실적리스트 엑셀에서 행사장(venue) 컬럼 추출 → 도면 폴더 비교
import * as XLSX from 'xlsx'
import { readFileSync, readdirSync } from 'fs'

const PERFLIST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별/Ezpmp_수행실적리스트_20260506.xlsx'
const FLOORPLAN_DIR = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/도면'

const wb = XLSX.read(readFileSync(PERFLIST), { type: 'buffer' })
console.log('시트 목록:', wb.SheetNames)

const allVenues = new Set()
const venueDetails = []

for (const sheetName of wb.SheetNames) {
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  if (aoa.length < 2) continue

  // 헤더 행 찾기 (행사명·장소·기간 같은 단어)
  let headerIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i].map(c => String(c || '').trim())
    if (row.some(c => /행사장|장소|개최지|venue/i.test(c))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) {
    console.log(`  [${sheetName}] 행사장 컬럼 없음 — skip`)
    continue
  }

  const headers = aoa[headerIdx].map(c => String(c || '').trim())
  console.log(`\n=== Sheet: ${sheetName} ===`)
  console.log('헤더:', headers.filter(Boolean).join(' | '))

  // 행사장 컬럼 인덱스
  const venueIdx = headers.findIndex(h => /행사장|장소|개최지|venue/i.test(h))
  const eventIdx = headers.findIndex(h => /행사명|행사 ?이름|사업명|프로젝트/i.test(h))
  const yearIdx = headers.findIndex(h => /연도|년도|year/i.test(h))
  const dateIdx = headers.findIndex(h => /기간|일정|개최일|date/i.test(h))

  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const row = aoa[i]
    const venue = String(row[venueIdx] || '').trim()
    const event = eventIdx >= 0 ? String(row[eventIdx] || '').trim() : ''
    if (!venue) continue
    allVenues.add(venue)
    venueDetails.push({
      sheet: sheetName,
      venue,
      event,
      year: yearIdx >= 0 ? String(row[yearIdx] || '').trim() : '',
      date: dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '',
    })
  }
}

console.log(`\n=== 전체 고유 행사장: ${allVenues.size}건 ===`)
const sorted = [...allVenues].sort()
sorted.forEach(v => console.log(`  ${v}`))

// 도면 폴더와 비교
const floorplanFolders = readdirSync(FLOORPLAN_DIR)
console.log(`\n=== 도면 폴더 목록 (${floorplanFolders.length}개) ===`)
floorplanFolders.forEach(f => console.log(`  ${f}`))

// 도면 보유 여부 매칭 (느슨한 부분 일치)
function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, '').replace(/[()【】\[\]]/g, '')
}
const floorplanNormalized = floorplanFolders.map(f => ({ raw: f, norm: normalize(f) }))

const missing = []
const matched = []
for (const venue of sorted) {
  const vn = normalize(venue)
  const hit = floorplanNormalized.find(f =>
    vn.includes(f.norm) || f.norm.includes(vn)
  )
  if (hit) matched.push({ venue, floorplan: hit.raw })
  else missing.push(venue)
}

console.log(`\n=== ✅ 도면 보유 (${matched.length}건) ===`)
matched.forEach(m => console.log(`  ${m.venue.padEnd(40)} → ${m.floorplan}`))

console.log(`\n=== ❌ 도면 미보유 (${missing.length}건) ===`)
missing.forEach(m => {
  const cnt = venueDetails.filter(d => d.venue === m).length
  console.log(`  [${cnt}건] ${m}`)
})

// 빈도순으로도 출력
const venueFreq = {}
for (const d of venueDetails) venueFreq[d.venue] = (venueFreq[d.venue] || 0) + 1
console.log(`\n=== 행사 빈도 TOP 30 (도면 미보유만 ★) ===`)
const sortedByFreq = Object.entries(venueFreq).sort((a, b) => b[1] - a[1])
sortedByFreq.slice(0, 30).forEach(([v, c]) => {
  const isMissing = missing.includes(v)
  console.log(`  ${isMissing ? '★' : ' '} ${String(c).padStart(3)}건 │ ${v}`)
})
