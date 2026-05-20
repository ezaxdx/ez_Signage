#!/usr/bin/env node
// scripts/diagnose_no_column.mjs
// design_items.no 컬럼 상태 진단 (v10.4)
// 사용: node scripts/diagnose_no_column.mjs
// 요구: .env.local의 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// .env.local 로드
function loadEnv() {
  try {
    const envPath = join(ROOT, '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    const env = {}
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return env
  } catch {
    return process.env
  }
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const lines = []
  const now = new Date()
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '')
  lines.push(`# design_items.no 컬럼 진단 보고서`)
  lines.push(`작성: ${now.toISOString()}`)
  lines.push(``)

  // 1. 컬럼 스키마 정보
  lines.push(`## 1. design_items 컬럼 스키마`)
  const { data: cols, error: e1 } = await supabase.rpc('execute_sql', {
    sql: `SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='design_items'
          ORDER BY ordinal_position`
  }).single()
  if (e1) {
    // RPC가 없으면 raw query 시도
    lines.push(`- execute_sql RPC 없음·다음 SQL 직접 실행 권장:`)
    lines.push('```sql')
    lines.push(`SELECT column_name, data_type, is_nullable, column_default`)
    lines.push(`FROM information_schema.columns`)
    lines.push(`WHERE table_schema='public' AND table_name='design_items'`)
    lines.push(`ORDER BY ordinal_position;`)
    lines.push('```')
  } else {
    lines.push('```')
    lines.push(JSON.stringify(cols, null, 2))
    lines.push('```')
  }
  lines.push(``)

  // 2. no 컬럼 NULL/빈 값 카운트
  lines.push(`## 2. no 컬럼 NULL·빈 값 카운트`)
  const { data: nullRows, count: nullCount, error: e2 } = await supabase
    .from('design_items')
    .select('id, project_id, no', { count: 'exact', head: false })
    .or('no.is.null,no.eq.')
    .limit(20)
  if (e2) {
    lines.push(`- 조회 실패: ${e2.message}`)
  } else {
    lines.push(`- NULL 또는 빈 문자열 행: **${nullCount}건**`)
    if (nullRows && nullRows.length > 0) {
      lines.push(`- 샘플 (최대 20개):`)
      lines.push('```')
      lines.push(JSON.stringify(nullRows, null, 2))
      lines.push('```')
    }
  }
  lines.push(``)

  // 3. 트리거 존재 여부
  lines.push(`## 3. 트리거·시퀀스 존재 여부`)
  lines.push(`- 다음 SQL을 Supabase SQL Editor에서 직접 실행 권장:`)
  lines.push('```sql')
  lines.push(`SELECT tgname, tgrelid::regclass, tgenabled`)
  lines.push(`FROM pg_trigger WHERE tgrelid='public.design_items'::regclass;`)
  lines.push(``)
  lines.push(`SELECT sequence_name FROM information_schema.sequences`)
  lines.push(`WHERE sequence_schema='public' AND sequence_name LIKE '%design_items%';`)
  lines.push('```')
  lines.push(``)

  // 4. project_id별 no 분포
  lines.push(`## 4. project_id별 no 분포 (상위 10건)`)
  const { data: items, error: e4 } = await supabase
    .from('design_items')
    .select('project_id, no')
    .limit(500)
  if (e4) {
    lines.push(`- 조회 실패: ${e4.message}`)
  } else if (items) {
    const groups = {}
    for (const it of items) {
      const k = it.project_id
      if (!groups[k]) groups[k] = []
      groups[k].push(it.no)
    }
    const top10 = Object.entries(groups).slice(0, 10)
    for (const [pid, nos] of top10) {
      lines.push(`- ${pid}: ${nos.length}건 = [${nos.slice(0, 10).join(', ')}${nos.length > 10 ? ', ...' : ''}]`)
    }
  }
  lines.push(``)

  // 5. 결론 및 권장
  lines.push(`## 5. 진단 결과·권장`)
  lines.push(`- NULL 행 ${nullCount ?? '미확인'} 건`)
  lines.push(`- 권장 조치 = migration_v10_4_fix_design_items_no.sql Supabase Studio 실행`)
  lines.push(`  - ① NOT NULL 임시 해제`)
  lines.push(`  - ② set_design_items_no() trigger 생성`)
  lines.push(`  - ③ NOT NULL 재설정`)
  lines.push(`- 클라이언트 측 = lib/services/designItemNo.ts 헬퍼로 7곳 INSERT 정합`)

  // 저장
  const reportDir = join(ROOT, 'docs', 'reports')
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `diagnose_no_${yymmdd}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`OK: 진단 보고서 = ${reportPath}`)
}

main().catch(err => {
  console.error('FAIL:', err.message)
  process.exit(1)
})
