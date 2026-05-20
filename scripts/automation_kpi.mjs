#!/usr/bin/env node
// 자동화 미션 KPI 측정 스켈레톤 (5/22 라이브 후 실 데이터 누적 시 의미 발생)
// 사용: node scripts/automation_kpi.mjs
// 측정 영역:
//   1. 사용자 누적 (Supabase projects·design_items)
//   2. 추천 정확도 (수동 측정값 입력 → 평균)
//   3. 시간 절감 추정 (수동 발주 vs 자동화 발주 비교)
//   4. D 평가 회복 트랙 가시화

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const KPI_FILE = join(ROOT, 'scripts', 'automation_kpi.json')

const DEFAULT_KPI = {
  measure_start: '2026-05-22',
  baseline: {
    manual_signage_order_minutes: 240,       // 수동 발주 평균 시간 (분) — 가설값
    manual_meeting_signage_count: 30,        // 회의 발주 평균 항목 수 — 가설값
    note: '실측 후 갱신 — 라이브 후 첫 발주 시 본인 측정',
  },
  weekly: [
    // { week_start: '2026-05-22', new_projects: 0, finalized_projects: 0, accuracy_pct: null, time_minutes_avg: null, note: '' }
  ],
  monthly_summary: {
    // 6월: { time_saved_pct: null, accuracy_improvement_pct: null, user_count: null }
  },
}

if (!existsSync(KPI_FILE)) {
  writeFileSync(KPI_FILE, JSON.stringify(DEFAULT_KPI, null, 2), 'utf-8')
  console.log(`초기 automation_kpi.json 생성: ${KPI_FILE}`)
  console.log('주간 항목 추가 = scripts/automation_kpi.json 직접 편집')
  console.log('또는 = 매주 금요일 본 도구로 입력')
}

const kpi = JSON.parse(readFileSync(KPI_FILE, 'utf-8'))

function color(t, c) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, magenta: 35 }
  return `\x1b[${codes[c] || 0}m${t}\x1b[0m`
}

console.log(color('━━ 자동화 미션 KPI 측정 ━━', 'cyan'))
console.log(`측정 시작: ${kpi.measure_start}`)
console.log()

// Baseline
console.log(color('1. 기준값 (가설·라이브 후 실측 갱신)', 'magenta'))
console.log(`   수동 발주 평균 시간 = ${kpi.baseline.manual_signage_order_minutes}분`)
console.log(`   회의·발주 평균 항목 = ${kpi.baseline.manual_meeting_signage_count}건`)
console.log(`   비고 = ${kpi.baseline.note}`)
console.log()

// Weekly
console.log(color('2. 주간 측정값', 'magenta'))
if (kpi.weekly.length === 0) {
  console.log('   (아직 측정값 없음 — 5/22 라이브 후 첫 데이터 입력)')
} else {
  for (const w of kpi.weekly) {
    const acc = w.accuracy_pct === null ? '미측' : w.accuracy_pct + '%'
    const time = w.time_minutes_avg === null ? '미측' : w.time_minutes_avg + '분'
    console.log(`   주차 ${w.week_start} · 신규 ${w.new_projects} · 완료 ${w.finalized_projects} · 정확도 ${acc} · 시간 ${time}`)
    if (w.note) console.log(`     비고 = ${w.note}`)
  }
}
console.log()

// Monthly summary
console.log(color('3. 월간 요약 (D 평가 회복 트랙 가시화)', 'magenta'))
if (Object.keys(kpi.monthly_summary).length === 0) {
  console.log('   (6월 첫 주간 보고 시점에 첫 산출)')
} else {
  for (const [month, s] of Object.entries(kpi.monthly_summary)) {
    console.log(`   ${month} · 시간 절감 ${s.time_saved_pct || '미측'}% · 정확도 향상 ${s.accuracy_improvement_pct || '미측'}% · 사용자 ${s.user_count || '미측'}명`)
  }
}

console.log()
console.log(color('━━ 입력 방법 ━━', 'cyan'))
console.log('  주간 데이터 = scripts/automation_kpi.json 직접 편집')
console.log('  매주 금요일 17:00 = npm run report:weekly + 본 도구로 입력')
console.log('  실 측정 = Supabase Studio 또는 dev 서버에서 직접')
console.log()
console.log(color('주의 = 정답지 노출 편향 회피 · 본인이 측정하지 않은 값 임의 추정 X', 'yellow'))
