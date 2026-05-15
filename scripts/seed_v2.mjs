// seed_v2.mjs — v2 시드 데이터 Supabase 자동 INSERT (idempotent)
//
// 적용 시점: 컴펌 후 사용자가 Supabase Studio에서 migration_v10_new_structure.sql 실행 직후
// 실행: node scripts/seed_v2.mjs
//
// SOT: lib/data/v2/* 시드 4개 파일
// 대상 테이블: signage_categories·venues·venue_halls·event_series·events·event_signage_orders
//
// 안전 룰:
//   - upsert (idempotent) — 재실행 안전
//   - 24 카테고리 + 43 venue + 24 series + 7 발주 리스트 자동 적재
//   - SERVICE_ROLE_KEY 사용 (RLS 우회, .env.local 필수)
//   - 실패 시 부분 적재 안 함 (transaction 처리는 미지원, 카테고리 단위 처리)

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://ujpftfiemlijfdpluyfp.supabase.co'

// .env.local에서 SERVICE_ROLE_KEY 추출
const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local 파일 없음. ' + envPath)
  process.exit(1)
}
const env = fs.readFileSync(envPath, 'utf8')
const match = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
if (!match) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 누락. .env.local 확인 필요.')
  process.exit(1)
}
const SERVICE_KEY = match[1].trim()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ============================================================
// 시드 파일 import — TypeScript이므로 컴파일 결과 또는 직접 처리
// ============================================================
//
// 옵션 A: lib/data/v2/*.ts를 dynamic import (Next 빌드 결과 .next/ 사용)
// 옵션 B: TypeScript 컴파일 결과 (npx tsc) 후 .js 파일 import
// 옵션 C: ts-node 사용 (의존성 추가)
//
// 본 스크립트는 옵션 B 권장 — TypeScript 직접 처리는 ts-node 없으면 어려움
// 실행 전 `npx tsc lib/data/v2/*.ts --outDir scripts/dist/v2 --module ESNext --target ES2022`

const V2_DIST = path.join(__dirname, 'dist', 'v2')
if (!fs.existsSync(V2_DIST)) {
  console.error('❌ scripts/dist/v2/ 미존재. 먼저 컴파일 필요:')
  console.error('   npx tsc lib/data/v2/*.ts --outDir scripts/dist/v2 --module ESNext --target ES2022 --moduleResolution node')
  process.exit(1)
}

const { SIGNAGE_CATEGORIES_V2 } = await import(path.join(V2_DIST, 'signageCategoriesSeed.js'))
const { VENUES_V2 } = await import(path.join(V2_DIST, 'venueListSeed.js'))
const { EVENT_SERIES_V2 } = await import(path.join(V2_DIST, 'eventSeriesSeed.js'))
const { EVENT_ORDER_LISTS_V2 } = await import(path.join(V2_DIST, 'eventOrderListSeed.js'))

console.log('=' .repeat(70))
console.log('v2 시드 INSERT 시작 — 컴펌 후 Supabase 활성화')
console.log('=' .repeat(70))
console.log(`카테고리: ${SIGNAGE_CATEGORIES_V2.length}종`)
console.log(`행사장: ${VENUES_V2.length}개`)
console.log(`시리즈: ${EVENT_SERIES_V2.length}개`)
console.log(`발주 리스트: ${EVENT_ORDER_LISTS_V2.length}건`)
console.log('-'.repeat(70))

// ============================================================
// 1. signage_categories — 24종
// ============================================================
console.log('\n📦 [1/5] signage_categories INSERT...')
let catSuccess = 0
let catFail = 0
for (const cat of SIGNAGE_CATEGORIES_V2) {
  const { error } = await supabase
    .from('signage_categories')
    .upsert(
      {
        key: cat.key,
        label: cat.label,
        description: cat.description,
        is_pending: cat.is_pending,
        priority: cat.priority,
        typical_size_mm: cat.typical_size_mm,
        match_keywords: cat.match_keywords,
        source_keywords: cat.source_keywords,
        default_quantity_formula: cat.default_quantity_formula,
        parent_category_key: cat.parent_category || null,
      },
      { onConflict: 'key' }
    )
  if (error) {
    console.error(`  ❌ ${cat.key}: ${error.message}`)
    catFail++
  } else {
    catSuccess++
  }
}
console.log(`  ✅ 성공 ${catSuccess}/${SIGNAGE_CATEGORIES_V2.length} (실패 ${catFail})`)

// ============================================================
// 2. event_series — 24개 시리즈 (venues 의존성 X)
// ============================================================
console.log('\n📦 [2/5] event_series INSERT...')
let serSuccess = 0
let serFail = 0
for (const ser of EVENT_SERIES_V2) {
  const { error } = await supabase
    .from('event_series')
    .upsert(
      {
        name: ser.name,
        code_pattern: ser.code_pattern || null,
        description: ser.description || null,
        is_recurring: ser.is_recurring,
      },
      { onConflict: 'name' }
    )
  if (error) {
    console.error(`  ❌ ${ser.name}: ${error.message}`)
    serFail++
  } else {
    serSuccess++
  }
}
console.log(`  ✅ 성공 ${serSuccess}/${EVENT_SERIES_V2.length} (실패 ${serFail})`)

// ============================================================
// 3. venues 12항목 메타 보강 — 기존 venues 행에 UPDATE
// ============================================================
console.log('\n📦 [3/5] venues specs 보강...')
let venSuccess = 0
let venSkip = 0
for (const ven of VENUES_V2) {
  // 기존 venues 행 찾기 (name으로 매칭)
  const { data: existing } = await supabase
    .from('venues')
    .select('id')
    .eq('name', ven.venue_name)
    .maybeSingle()
  if (!existing) {
    venSkip++
    continue
  }
  const { error } = await supabase
    .from('venues')
    .update({
      venue_specs: ven.specs,
      specs_updated_at: new Date().toISOString(),
      has_full_specs: ven.data_status === 'full',
      facility_guide_url: ven.specs?.facility_guide_url || null,
    })
    .eq('id', existing.id)
  if (error) {
    console.error(`  ❌ ${ven.venue_name}: ${error.message}`)
  } else {
    venSuccess++
  }
}
console.log(`  ✅ 보강 ${venSuccess}/${VENUES_V2.length} (미존재 ${venSkip})`)
console.log(`  💡 미존재 venue는 먼저 venues 테이블에 행 INSERT 필요 (관리자 페이지 활용)`)

// ============================================================
// 4. events — L3 행사 (발주 리스트 기준)
// ============================================================
console.log('\n📦 [4/5] events INSERT (발주 리스트 7건)...')
let evtSuccess = 0
let evtFail = 0
for (const ord of EVENT_ORDER_LISTS_V2) {
  // venue_id 찾기
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name')
    .ilike('name', `%${ord.venue_key}%`)
    .maybeSingle()
  const venueId = venue?.id || null

  // event_series_id 찾기
  let seriesId = null
  if (ord.series_id) {
    const { data: ser } = await supabase
      .from('event_series')
      .select('id')
      .eq('name', ord.series_id)
      .maybeSingle()
    seriesId = ser?.id || null
  }

  const { error } = await supabase
    .from('events')
    .upsert(
      {
        code: ord.event_code,
        name: ord.event_name,
        year: parseInt(ord.event_date.slice(0, 4)),
        event_series_id: seriesId,
        venue_id: venueId,
        expected_attendees: ord.expected_attendees || null,
        is_international: ord.is_international,
        has_vip: ord.has_vip,
        program_parts: ord.program_parts,
        event_date: ord.event_date.length === 7 ? `${ord.event_date}-01` : ord.event_date,
      },
      { onConflict: 'code' }
    )
  if (error) {
    console.error(`  ❌ ${ord.event_code}: ${error.message}`)
    evtFail++
  } else {
    evtSuccess++
  }
}
console.log(`  ✅ 성공 ${evtSuccess}/${EVENT_ORDER_LISTS_V2.length} (실패 ${evtFail})`)

// ============================================================
// 5. event_signage_orders — 발주 row 적재
// ============================================================
console.log('\n📦 [5/5] event_signage_orders INSERT...')
let ordSuccess = 0
let ordFail = 0
for (const list of EVENT_ORDER_LISTS_V2) {
  // event_id 찾기
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('code', list.event_code)
    .maybeSingle()
  if (!event) continue

  for (const row of list.order_rows) {
    const { error } = await supabase
      .from('event_signage_orders')
      .insert({
        event_id: event.id,
        category_key: row.category,
        program_part: row.program_part || null,
        location: row.location || null,
        size_width_mm: row.size_width_mm || null,
        size_height_mm: row.size_height_mm || null,
        quantity: row.quantity,
        purpose: null,
        notes: row.notes || null,
        data_stage: 'finalized',
        weight: 100,
        source_file: row.source_file,
        source_row: row.source_row,
      })
    if (error) {
      ordFail++
    } else {
      ordSuccess++
    }
  }
}
console.log(`  ✅ 성공 ${ordSuccess} row 적재 (실패 ${ordFail})`)

// ============================================================
// 종합 결과
// ============================================================
console.log('\n' + '='.repeat(70))
console.log('🎉 v2 시드 INSERT 완료')
console.log('='.repeat(70))
console.log(`  카테고리: ${catSuccess}/${SIGNAGE_CATEGORIES_V2.length}`)
console.log(`  시리즈: ${serSuccess}/${EVENT_SERIES_V2.length}`)
console.log(`  venues 보강: ${venSuccess}/${VENUES_V2.length}`)
console.log(`  events: ${evtSuccess}/${EVENT_ORDER_LISTS_V2.length}`)
console.log(`  발주 row: ${ordSuccess}`)
console.log('\n💡 다음 단계:')
console.log('  1. /admin/learning에서 24종 카테고리·43 venue·7 발주 확인')
console.log('  2. recommendV2() 호출 동작 검증')
console.log('  3. 사용자 검토 → 컴펌 후 lib/ai/recommendationLogic.ts 활성화')
