// sync_signage_aliases.mjs
// 5/22 = DB signage_aliases 정합 = SEED_SYNONYMS SOT 영역 동기화
import { SEED_SYNONYMS } from '../lib/data/dashboardSeed.ts'
import { SEED_SIGNAGE_TYPES } from '../lib/data/dashboardSeed.ts'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const dotenv = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const SERVICE_KEY = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
const SUPABASE_URL = dotenv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
if (!SERVICE_KEY || !SUPABASE_URL) {
  console.error('missing env')
  process.exit(1)
}

const NAME_TO_ID = new Map(SEED_SIGNAGE_TYPES.map(t => [t.name, t.id]))
const NAME_TO_SIZE = new Map(SEED_SIGNAGE_TYPES.map(t => [t.name, `${t.width_mm}*${t.height_mm}`]))

// 중복 alias_name 제거 (마지막 항목 우선)
const rowMap = new Map()
for (const s of SEED_SYNONYMS) {
  rowMap.set(s.alias, {
    alias_name: s.alias,
    canonical_name: s.canonical_name,
    kind: NAME_TO_ID.get(s.canonical_name) ?? null,
    default_size: NAME_TO_SIZE.get(s.canonical_name) ?? null,
    note: s.note ?? null,
  })
}
const rows = [...rowMap.values()]

// 1) 옛 DB 영역 일괄 삭제 (alias_name = NOT EXISTS in SEED 영역 제거·SEED 중복 = upsert 정합)
const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/signage_aliases?select=alias_name`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
})
const existing = await existingRes.json()
const existingNames = new Set(existing.map(r => r.alias_name))
const seedNames = new Set(rows.map(r => r.alias_name))
const toDelete = [...existingNames].filter(n => !seedNames.has(n))
if (toDelete.length > 0) {
  const params = toDelete.map(n => encodeURIComponent(`"${n}"`)).join(',')
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/signage_aliases?alias_name=in.(${params})`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  console.log('DELETE 옛 영역', toDelete.length, '건:', delRes.status)
}

// 2) UPSERT (alias_name UNIQUE 영역 가정 = on_conflict)
const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/signage_aliases?on_conflict=alias_name`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
})
console.log('UPSERT 영역', rows.length, '건 영역 영역:', upsertRes.status)
if (upsertRes.status >= 300) {
  console.error(await upsertRes.text())
}

// 3) 최종 검증
const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/signage_aliases?select=alias_name`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
})
const finalRows = await finalRes.json()
console.log('최종 DB 영역:', finalRows.length, '건')
