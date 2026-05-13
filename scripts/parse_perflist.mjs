// 수행실적리스트 엑셀 파싱 → 행사 폴더 매핑 → JSON 출력
// 사용: node scripts/parse_perflist.mjs

import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'fs'

const PERFLIST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별/Ezpmp_수행실적리스트_20260506.xlsx'

// 폴더에서 추출한 54개 행사 — 프로젝트 코드 리스트 (dashboardSeed.ts와 동일)
const FOLDER_CODES = [
  '203130','202140-1','251015','191200','251004','181000','183900','193200','193000','193600',
  '193960','182120','251014','193910','245006','242008','191400','241014','252016','252026',
  '191600','183000-1','193100','252006','241011','223060','183060','183080','193800','193700',
  '183090','221030','182090','231009','231004','232030','182070','222020','232033','201100',
  '183300-1','182040','192400','192000',
]

const buf = readFileSync(PERFLIST)
const wb = XLSX.read(buf, { type: 'buffer' })
const ws = wb.Sheets[wb.SheetNames[0]]
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

const idx = {
  no: 0,
  code: 1,
  pm_division: 3,
  pm_team: 4,
  pm_name: 5,
  project_name: 6,
  year: 7,
  start_date: 8,
  end_date: 9,
  region: 10,
  venue: 11,
  client: 12,
  event_category: 13,
  industry: 15,
  event_format: 17,
  organizer: 19,
  host: 20,
}

const allRows = aoa.slice(3).filter(r => r[idx.code])
const byCode = new Map()
for (const r of allRows) {
  byCode.set(String(r[idx.code]).trim(), r)
}

const matched = []
for (const code of FOLDER_CODES) {
  const r = byCode.get(code)
  if (!r) {
    matched.push({ code, _matched: false })
    continue
  }
  matched.push({
    code,
    _matched: true,
    pm_division: String(r[idx.pm_division] || '').trim(),
    pm_team: String(r[idx.pm_team] || '').trim(),
    pm_name: String(r[idx.pm_name] || '').trim(),
    project_name: String(r[idx.project_name] || '').trim(),
    year: r[idx.year] || null,
    start_date: r[idx.start_date] || null,
    end_date: r[idx.end_date] || null,
    region: String(r[idx.region] || '').trim(),
    venue: String(r[idx.venue] || '').trim(),
    client: String(r[idx.client] || '').trim(),
    event_category: String(r[idx.event_category] || '').trim(),
    industry: String(r[idx.industry] || '').trim(),
    event_format: String(r[idx.event_format] || '').trim(),
    organizer: String(r[idx.organizer] || '').trim(),
    host: String(r[idx.host] || '').trim(),
  })
}

const matchedCount = matched.filter(m => m._matched).length
const pmDivisions = new Set()
const pmTeams = new Set()
const clients = new Set()
const categories = new Set()
const regions = new Set()
const formats = new Set()
for (const m of matched) {
  if (!m._matched) continue
  if (m.pm_division) pmDivisions.add(m.pm_division)
  if (m.pm_team) pmTeams.add(m.pm_team)
  if (m.client) clients.add(m.client)
  if (m.event_category) categories.add(m.event_category)
  if (m.region) regions.add(m.region)
  if (m.event_format) formats.add(m.event_format)
}

console.log(`총 엑셀 행: ${allRows.length}`)
console.log(`폴더 코드 ${FOLDER_CODES.length}건 중 매칭: ${matchedCount}`)
console.log(`PM 사업부 (${pmDivisions.size}): ${[...pmDivisions].join(', ')}`)
console.log(`PM 부서 (${pmTeams.size}): ${[...pmTeams].slice(0, 15).join(', ')}`)
console.log(`발주처 (${clients.size}): ${[...clients].slice(0, 15).join(', ')}${clients.size > 15 ? '...' : ''}`)
console.log(`행사분류 (${categories.size}): ${[...categories].join(', ')}`)
console.log(`지역 (${regions.size}): ${[...regions].join(', ')}`)
console.log(`행사형태 (${formats.size}): ${[...formats].join(', ')}`)

writeFileSync(
  'lib/data/_parsed_perflist.json',
  JSON.stringify(matched, null, 2),
  'utf-8'
)
console.log('\n저장: lib/data/_parsed_perflist.json')

// 전체 엑셀 통계 (참고용)
const allClients = new Set()
const allCategories = new Set()
const allDivisions = new Set()
const allTeams = new Set()
for (const r of allRows) {
  if (r[idx.pm_division]) allDivisions.add(String(r[idx.pm_division]).trim())
  if (r[idx.pm_team]) allTeams.add(String(r[idx.pm_team]).trim())
  if (r[idx.client]) allClients.add(String(r[idx.client]).trim())
  if (r[idx.event_category]) allCategories.add(String(r[idx.event_category]).trim())
}
console.log(`\n전체 엑셀 통계 (참고): PM사업부 ${allDivisions.size}, PM부서 ${allTeams.size}, 발주처 ${allClients.size}, 행사분류 ${allCategories.size}`)
