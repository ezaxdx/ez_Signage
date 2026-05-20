#!/usr/bin/env node
// 일정·D-day 자동 추적 도구
// 사용: node scripts/events_dday.mjs
// 설정: scripts/events.json 에 일정 등록 → 매일 실행 시 D-day 자동 계산

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const CONFIG = join(ROOT, 'scripts', 'events.json')

const DEFAULT_CONFIG = {
  events: [
    { name: '환경장식물 발주 시스템 라이브', date: '2026-05-22', tag: 'P0' },
    { name: 'D+1 휴식 의무', date: '2026-05-23', tag: 'rest' },
    { name: 'Stage 2 사이클 시작', date: '2026-05-25', tag: 'P0' },
    { name: 'harness Iteration 4', date: '2026-05-26', tag: 'P1' },
    { name: '6월 첫 주간 보고', date: '2026-06-05', tag: 'P0' },
  ],
}

if (!existsSync(CONFIG)) {
  writeFileSync(CONFIG, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
  console.log(`초기 events.json 생성: ${CONFIG}`)
}

const config = JSON.parse(readFileSync(CONFIG, 'utf-8'))
const today = new Date()
today.setHours(0, 0, 0, 0)

function color(t, c) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, magenta: 35, gray: 90 }
  return `\x1b[${codes[c] || 0}m${t}\x1b[0m`
}

function dDayColor(delta) {
  if (delta < 0) return 'gray'
  if (delta === 0) return 'red'
  if (delta <= 2) return 'magenta'
  if (delta <= 7) return 'yellow'
  return 'green'
}

console.log(color('━━ 일정·D-day 자동 추적 ━━', 'cyan'))
console.log(`기준: ${today.toISOString().split('T')[0]}`)
console.log()

const sorted = config.events.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
for (const ev of sorted) {
  const evDate = new Date(ev.date)
  evDate.setHours(0, 0, 0, 0)
  const delta = Math.round((evDate - today) / (1000 * 60 * 60 * 24))
  const dStr = delta < 0 ? `D+${Math.abs(delta)}` : delta === 0 ? 'D-day' : `D-${delta}`
  const tag = ev.tag ? `[${ev.tag}]` : ''
  console.log(`  ${color(dStr.padEnd(7), dDayColor(delta))} · ${ev.date} · ${tag.padEnd(7)} ${ev.name}`)
}

console.log()
console.log(color('일정 추가·수정 = scripts/events.json 직접 편집', 'yellow'))
console.log(color('매일 09:00 자동 점검 = npm run check:morning 안에 통합 가능', 'gray'))
