// xlsx 232 발주 행 → SEED_EVENT_HISTORY 형식 변환
// 행사 단위 그룹핑 + signage_breakdown 배열 생성 + venues_breakdown (홀별 분리)
import { readFileSync, writeFileSync } from 'fs'
import xlsx from 'xlsx'

const SRC = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/260520_ez_signage2_training.xlsx'

const wb = xlsx.readFile(SRC)
const s3 = xlsx.utils.sheet_to_json(wb.Sheets['발주_행'])
console.log(`발주 행 = ${s3.length}건`)

// L1 표준명 → SEED venue 표준명 (기존 SEED_EVENT_HISTORY 영역 정합)
const L1_TO_SEED_VENUE = {
  '코엑스(COEX)': '코엑스',
  '동대문디자인플라자(DDP)': 'DDP',
  '제주국제컨벤션센터(ICC)': '제주국제컨벤션센터 (ICC JEJU)',
  '송도컨벤시아': '송도컨벤시아',
  '킨텍스(KINTEX)': '킨텍스',
  '그랜드하얏트 서울': '그랜드하얏트서울',
  '더플라자 서울': '더 플라자 호텔 서울',
  '롯데호텔 제주': '롯데호텔 제주',
}

// 행사 코드별 그룹핑
const eventGroups = new Map()
for (const row of s3) {
  const code = row['행사_코드']
  if (!code || code === '미상' || /^미상-/.test(code)) continue
  const venue = L1_TO_SEED_VENUE[row['행사장명']] || row['행사장명']
  if (!eventGroups.has(code)) {
    eventGroups.set(code, {
      project_code: code,
      project_name: row['행사명'],
      year: parseInt(row['행사_연도']) || null,
      venue,
      venues: new Map(), // hall → signage map
    })
  }
  const ev = eventGroups.get(code)
  const hall = row['홀']
  if (!ev.venues.has(hall)) ev.venues.set(hall, new Map())
  const sigMap = ev.venues.get(hall)
  const cat = row['카테고리(12 표준)']
  const qty = typeof row['수량'] === 'number' ? row['수량'] : parseInt(row['수량']) || 0
  const size = row['규격'] !== '미상' ? row['규격'] : ''
  if (cat === '미분류' || qty === 0) continue
  const key = `${cat}|${size}`
  if (!sigMap.has(key)) sigMap.set(key, { category: cat, quantity: 0, sizes: size })
  sigMap.get(key).quantity += qty
}

console.log(`행사 그룹 = ${eventGroups.size}개`)

// SEED 형식 생성
const seeds = []
for (const ev of eventGroups.values()) {
  const allHalls = Array.from(ev.venues.keys()).filter(h => h !== '미상')
  const isMulti = allHalls.length > 1
  const totalQty = Array.from(ev.venues.values()).flatMap(m => Array.from(m.values())).reduce((s, x) => s + x.quantity, 0)

  const seed = {
    project_name: ev.project_name,
    project_code: ev.project_code,
    year: ev.year,
    venue: ev.venue,
    category_tag: '일반',
    has_excel: true,
    has_image: true,
    analyzed_item_count: totalQty,
    program_parts: [],
  }

  if (isMulti) {
    seed.venues_breakdown = []
    for (const [hall, sigMap] of ev.venues) {
      const sig = Array.from(sigMap.values()).filter(s => s.quantity > 0)
      if (sig.length > 0) seed.venues_breakdown.push({ venue: hall, signage_breakdown: sig })
    }
  } else {
    const allSig = Array.from(ev.venues.values()).flatMap(m => Array.from(m.values())).filter(s => s.quantity > 0)
    seed.signage_breakdown = allSig
  }
  seeds.push(seed)
}

// 본 사이클 신규 행사 코드만 (기존 SEED 8 행사와 중복 점검)
const EXISTING_CODES = new Set(['183080', '183090', '183000-1', '193100', '183060', '192000', '193960', '191400'])
const newSeeds = seeds.filter(s => !EXISTING_CODES.has(s.project_code))
const overlapSeeds = seeds.filter(s => EXISTING_CODES.has(s.project_code))

console.log(`신규 = ${newSeeds.length}건·기존 중복 = ${overlapSeeds.length}건`)

// TypeScript SEED 형식 직접 출력
const tsLines = []
tsLines.push(`// 자동 생성 (5/21·xlsx 232 발주 행 → SEED 형식)`)
tsLines.push(`// 신규 행사 ${newSeeds.length}건 = SEED_EVENT_HISTORY 추가 영역`)
tsLines.push(``)
tsLines.push(`export const NEW_EVENT_SEEDS_260521 = [`)
for (const s of newSeeds.sort((a, b) => (b.year || 0) - (a.year || 0))) {
  const props = []
  props.push(`project_name: ${JSON.stringify(s.project_name)}`)
  props.push(`project_code: ${JSON.stringify(s.project_code)}`)
  props.push(`year: ${s.year}`)
  props.push(`venue: ${JSON.stringify(s.venue)}`)
  props.push(`category_tag: '일반'`)
  props.push(`has_excel: true`)
  props.push(`has_image: true`)
  props.push(`analyzed_item_count: ${s.analyzed_item_count}`)
  props.push(`program_parts: []`)
  if (s.signage_breakdown) {
    const sigStr = s.signage_breakdown.map(x => `{ category: ${JSON.stringify(x.category)}, quantity: ${x.quantity}${x.sizes ? `, sizes: ${JSON.stringify(x.sizes)}` : ''} }`).join(', ')
    props.push(`signage_breakdown: [${sigStr}]`)
  }
  if (s.venues_breakdown) {
    const vbStr = s.venues_breakdown.map(v => {
      const sigStr = v.signage_breakdown.map(x => `{ category: ${JSON.stringify(x.category)}, quantity: ${x.quantity}${x.sizes ? `, sizes: ${JSON.stringify(x.sizes)}` : ''} }`).join(', ')
      return `{ venue: ${JSON.stringify(v.venue)}, signage_breakdown: [${sigStr}] }`
    }).join(',\n    ')
    props.push(`venues_breakdown: [\n    ${vbStr}\n  ]`)
  }
  tsLines.push(`  { ${props.join(', ')} },`)
}
tsLines.push(`]`)

writeFileSync('scripts/new_event_seeds_260521.ts', tsLines.join('\n'), 'utf-8')
console.log(`\n출력: scripts/new_event_seeds_260521.ts`)
console.log(`  신규 시드 ${newSeeds.length}건 = dashboardSeed.ts SEED_EVENT_HISTORY 영역에 추가`)
