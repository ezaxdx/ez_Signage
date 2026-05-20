#!/usr/bin/env node
// 매일 09:00 사용자 진입 시 5분 통합 점검 도구
// 사용: npm run check:morning
//
// 점검 영역 (6):
// 1. git status·미커밋·미푸시
// 2. TypeScript 타입 검사 (npx tsc --noEmit)
// 3. v3 정합 점검 (npm run check:v3) — 24항목
// 4. harness 자동 점검 — 72항목
// 5. 학습 풀 누락 영역 grep (천정배너 패턴·시설 가이드 미등록)
// 6. 최근 5 커밋·D-day 카운트

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function color(text, c) {
  const codes = { red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36 }
  return `\x1b[${codes[c] || 0}m${text}\x1b[0m`
}

function header(text) {
  console.log()
  console.log(color('━━ ' + text + ' ━━', 'cyan'))
}

function tryRun(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', ...opts })
    return { ok: true, out }
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') }
  }
}

const today = new Date()
today.setHours(0, 0, 0, 0)
const dDay = new Date('2026-05-22')
dDay.setHours(0, 0, 0, 0)
const dDelta = Math.round((dDay - today) / (1000 * 60 * 60 * 24))

console.log(color('환경장식물 발주 시스템 — 09:00 통합 점검', 'magenta'))
console.log(`오늘 = ${today.toISOString().split('T')[0]} · D${dDelta >= 0 ? '-' + dDelta : '+' + Math.abs(dDelta)}`)

// 1. git
header('1. Git 상태')
const status = tryRun('git status --short')
const log = tryRun('git log --oneline -5')
const branch = tryRun('git rev-parse --abbrev-ref HEAD')
console.log('브랜치 = ' + (branch.out || '').trim())
console.log('미커밋 = ' + ((status.out.trim().split('\n').filter(Boolean).length) || 0) + '건')
console.log('최근 5 커밋:')
console.log((log.out || '').split('\n').map(l => '  ' + l).join('\n'))

// 2. TypeScript
header('2. TypeScript 타입 검사')
const tsc = tryRun('npx tsc --noEmit')
console.log(tsc.ok ? color('✓ TSC 0 에러', 'green') : color('✗ TSC 실패', 'red'))
if (!tsc.ok) console.log(tsc.out.split('\n').slice(0, 5).join('\n'))

// 3. check:v3
header('3. v3 정합 점검 (24항목)')
const v3 = tryRun('node scripts/check_v3_alignment.mjs')
const v3Tail = (v3.out || '').split('\n').filter(l => l.includes('점검:') || l.includes('통과:') || l.includes('경고:') || l.includes('실패:'))
console.log(v3Tail.join('\n'))

// 4. harness
header('4. harness 자동 점검')
const harness = tryRun('node scripts/harness.mjs')
const hTail = (harness.out || '').split('\n').filter(l => l.includes('검사:') || l.includes('통과:') || l.includes('경고:') || l.includes('실패:'))
console.log(hTail.join('\n'))

// 5. 학습 풀 누락 영역
header('5. 학습 풀 누락 영역')
const ceilingSeed = readFileSync(join(ROOT, 'lib/data/dashboardSeed.ts'), 'utf-8')
const ceilingMatch = ceilingSeed.match(/SEED_CEILING_BANNER_PATTERNS[\s\S]*?\]\s*\n/)
const ceilingCount = ceilingMatch ? (ceilingMatch[0].match(/venue:/g) || []).length : 0
console.log(`천정배너 패턴 = ${ceilingCount} 행사장 (목표: 코엑스·송도·ICC 추가 필요)`)

const fg = readFileSync(join(ROOT, 'lib/data/venueFacilityGuide.ts'), 'utf-8')
const fgVenueKeys = (fg.match(/venue_key:\s*'[^']+'/g) || []).length
const skeletonCount = (fg.match(/buildDefaultConventionGuide/g) || []).length
console.log(`시설 가이드 = ${fgVenueKeys} venue 키 · 골격 시드 ${skeletonCount}건 (실측 보강 필요)`)

const eventIdx = readFileSync(join(ROOT, 'lib/data/v3/eventLearningIndexSeed.ts'), 'utf-8')
const eventTotal = (eventIdx.match(/EVENT_LEARNING_TOTAL\s*=\s*(\d+)/) || [])[1] || '?'
const fileTotal = (eventIdx.match(/EVENT_LEARNING_FILE_TOTAL\s*=\s*(\d+)/) || [])[1] || '?'
console.log(`행사 학습 인덱스 = ${eventTotal} 행사 · 학습 파일 ${fileTotal}건`)

// 6. 일정 추적 (events.json 통합)
header('6. 일정·D-day')
try {
  const eventsConfigPath = join(ROOT, 'scripts', 'events.json')
  if (existsSync(eventsConfigPath)) {
    const cfg = JSON.parse(readFileSync(eventsConfigPath, 'utf-8'))
    const sorted = (cfg.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
    for (const ev of sorted.slice(0, 6)) {
      const evDate = new Date(ev.date)
      evDate.setHours(0, 0, 0, 0)
      const delta = Math.round((evDate - today) / (1000 * 60 * 60 * 24))
      const dStr = delta < 0 ? `D+${Math.abs(delta)}` : delta === 0 ? 'D-day' : `D-${delta}`
      console.log(`  ${dStr.padEnd(7)} · ${ev.date} · ${(ev.tag || '').padEnd(5)} ${ev.name}`)
    }
  } else {
    console.log('events.json 없음 · npm run events:dday 첫 실행 권장')
  }
} catch (e) {
  console.log('일정 로드 실패: ' + e.message)
}

// 7. 다음 단계
header('7. 다음 사용자 영역')
if (dDelta > 0) {
  console.log(`라이브까지 D-${dDelta} = 새 기능 푸시 자제·시각 검증 진행`)
} else if (dDelta === 0) {
  console.log('D-day = 라이브 모니터링·rollback 명령 책상용 1쪽 출력')
} else {
  console.log(`D+${Math.abs(dDelta)} = 회고 작성·다음 사이클 준비`)
}

console.log()
console.log(color('점검 끝 = npm test·dev 서버는 본인 직접 진행', 'yellow'))
