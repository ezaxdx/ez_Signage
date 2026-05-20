#!/usr/bin/env node
// 일일 활동 로그 자동 생성 (git activity + 시간 추정)
// 사용: node scripts/daily_log.mjs
// 출력: docs/daily/YYMMDD.md 자동 생성·매일 18:00 또는 출근 직후 실행 권장

import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function safeRun(cmd) {
  try { return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim() } catch (e) { return '' }
}

const today = new Date()
const yy = String(today.getFullYear()).slice(-2)
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const yymmdd = yy + mm + dd
const todayISO = `${today.getFullYear()}-${mm}-${dd}`

// Today commits
const todayCommits = safeRun(`git log --since="${todayISO} 00:00" --until="${todayISO} 23:59" --pretty=format:"%h %ad %s" --date=format:"%H:%M"`)
const todayCount = todayCommits ? todayCommits.split('\n').length : 0

// Today line stats
const todayStats = safeRun(`git log --since="${todayISO} 00:00" --until="${todayISO} 23:59" --shortstat --pretty=format:""`)
const insertSum = (todayStats.match(/(\d+) insertion/g) || []).reduce((s, m) => s + parseInt(m), 0)
const deleteSum = (todayStats.match(/(\d+) deletion/g) || []).reduce((s, m) => s + parseInt(m), 0)

// Today files
const todayFiles = safeRun(`git log --since="${todayISO} 00:00" --until="${todayISO} 23:59" --pretty=format:"" --name-only`)
const fileSet = new Set(todayFiles.split('\n').map(f => f.trim()).filter(Boolean))

// Branch + status
const branch = safeRun('git rev-parse --abbrev-ref HEAD')
const uncommitted = safeRun('git status --short').split('\n').filter(Boolean).length

// Estimate hours (rough heuristic: 1 commit ~ 30 minutes)
const estHours = (todayCount * 0.5).toFixed(1)

const dDay = new Date('2026-05-22')
dDay.setHours(0, 0, 0, 0)
const t = new Date(today)
t.setHours(0, 0, 0, 0)
const dDelta = Math.round((dDay - t) / (1000 * 60 * 60 * 24))
const dStr = dDelta < 0 ? `D+${Math.abs(dDelta)}` : dDelta === 0 ? 'D-day' : `D-${dDelta}`

const log = `[진척 공유]

# 일일 활동 로그 — ${todayISO} (${dStr})

**자동 생성**: scripts/daily_log.mjs
**브랜치**: ${branch}
**미커밋**: ${uncommitted}건

## 객관 수치

- 오늘 커밋 = ${todayCount}건
- 추가 ${insertSum}줄 / 삭제 ${deleteSum}줄
- 변경 파일 = ${fileSet.size}건
- 작업 시간 추정 = ${estHours}시간 (커밋 1건당 30분 가정)

## 오늘 커밋 (시간순)

\`\`\`
${todayCommits || '(커밋 없음)'}
\`\`\`

## 변경 파일 (전체)

${Array.from(fileSet).slice(0, 30).map(f => `- ${f}`).join('\n') || '(없음)'}

${fileSet.size > 30 ? `\n... 외 ${fileSet.size - 30}건` : ''}

## 본인 보충 (수동 작성)

- 잘 된 점:
- 문제 발생:
- 내일 계획:
- 시간 절감 추정 (수동 작업 대비):
`

const dailyDir = join(ROOT, 'docs', 'daily')
if (!existsSync(dailyDir)) mkdirSync(dailyDir, { recursive: true })
const outPath = join(dailyDir, `${yymmdd}.md`)
writeFileSync(outPath, log, 'utf-8')

console.log(`OK: ${outPath}`)
console.log(`커밋 ${todayCount}건 · 추가 ${insertSum}줄 · 삭제 ${deleteSum}줄 · 추정 ${estHours}시간`)
