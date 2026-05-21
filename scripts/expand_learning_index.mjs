// eventLearningIndexSeed.ts 확장 = 본 정리본 275건 = 행사별 sample_files 전체 추가
// sample 3건 SOT → 전체 학습 가능 자료 영역
import { readdirSync } from 'fs'
import { writeFileSync } from 'fs'
import { join } from 'path'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push(f)
  }
  return files
}

const files = walk(DEST)
console.log(`잔존 = ${files.length}건`)

// 행사 단위 그룹핑
const events = new Map()
for (const f of files) {
  const rel = f.replace(/\\/g, '/').replace(DEST + '/', '')
  const parts = rel.split('/')
  if (parts.length < 2) continue
  const venueFolder = parts[0]
  const l2Part = parts.find(p => p.startsWith('L2') || p.startsWith('L3')) || ''
  const eventMatch = parts.find(p => /\d{6}/.test(p)) ?? ''
  const codeMatch = eventMatch.match(/\d{6}(-\d)?/)?.[0] ?? ''

  let l2Hall = '(L2 미상)', eventName = ''
  if (l2Part) {
    const cleaned = l2Part.replace(/^L[23]_/, '')
    const codeIdx = cleaned.search(/\d{6}/)
    if (codeIdx >= 0) {
      l2Hall = cleaned.slice(0, codeIdx).replace(/_$/, '').trim() || '(L2 미상)'
      eventName = cleaned.slice(codeIdx).replace(/^\d{6}(-\d)?\s*/, '').trim()
    } else l2Hall = cleaned.trim()
  }

  const key = `${venueFolder}|${codeMatch}|${eventName}`
  if (!events.has(key)) {
    events.set(key, { venueFolder, l2Hall, code: codeMatch, eventName, files: [] })
  }
  events.get(key).files.push(parts[parts.length - 1])
}

console.log(`행사 그룹 = ${events.size}개`)

// 시드 형식 생성 (sample_files = 행사당 최대 8건 = 기존 3건 영역 확장)
const seeds = []
for (const ev of events.values()) {
  const sample = ev.files.slice(0, 8).join(' / ')
  seeds.push({
    venue_folder: ev.venueFolder,
    l2_hall: ev.l2Hall,
    event_code: ev.code,
    event_name: ev.eventName || '(미상)',
    area: '',
    learn_count: ev.files.length,
    sample_files: sample,
  })
}

// 확장 시드 TS 출력
const lines = []
lines.push(`// 확장 학습 인덱스 (5/21 영역) = 본 정리본 275건 전체 영역 등록`)
lines.push(`// 기존 18 행사 sample 3건 SOT → 본 영역 전체 영역 확장`)
lines.push(``)
lines.push(`export const EVENT_LEARNING_INDEX_EXPANDED_260521 = [`)
seeds.sort((a, b) => a.venue_folder.localeCompare(b.venue_folder, 'ko') || (b.code || '').localeCompare(a.code || ''))
for (const s of seeds) {
  const j = JSON.stringify(s).replace(/"venue_folder":/g, '"venue_folder":')
  lines.push(`  ${j},`)
}
lines.push(`]`)
lines.push(``)
lines.push(`export const EVENT_LEARNING_EXPANDED_TOTAL = ${seeds.length}`)
lines.push(`export const EVENT_LEARNING_EXPANDED_FILE_TOTAL = ${files.length}`)

writeFileSync('lib/data/v3/eventLearningIndexExpanded_260521.ts', lines.join('\n'), 'utf-8')
console.log(`\n출력: lib/data/v3/eventLearningIndexExpanded_260521.ts`)
console.log(`  행사 그룹 ${seeds.length}개·파일 ${files.length}건`)
console.log(`\n=== 행사장별 시드 영역 ===`)
const byVenue = {}
for (const s of seeds) {
  byVenue[s.venue_folder] = (byVenue[s.venue_folder] || 0) + s.learn_count
}
Object.entries(byVenue).sort((a, b) => b[1] - a[1]).forEach(([v, n]) => console.log(`  ${String(n).padStart(4)}건  ${v}`))
