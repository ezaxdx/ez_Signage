#!/usr/bin/env node
// 주간 보고 자동 생성 (매주 금요일 17:00 또는 월요일 09:00)
// 사용: npm run report:weekly
// 출력: docs/weekly_report_YYMMDD.md (지난 7일 commits·완료·다음 주 계획)

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function safeRun(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim()
  } catch (e) {
    return ''
  }
}

const today = new Date()
const yy = String(today.getFullYear()).slice(-2)
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const yymmdd = yy + mm + dd

const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
const sinceStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`

// 지난 7일 commits
const commits = safeRun(`git log --since="${sinceStr}" --pretty=format:"%h %ad %s" --date=short`)
const commitCount = commits ? commits.split('\n').length : 0
const stats = safeRun(`git log --since="${sinceStr}" --shortstat --pretty=format:""`)
const insertSum = (stats.match(/(\d+) insertion/g) || []).reduce((s, m) => s + parseInt(m), 0)
const deleteSum = (stats.match(/(\d+) deletion/g) || []).reduce((s, m) => s + parseInt(m), 0)

const dDay = new Date('2026-05-22')
dDay.setHours(0, 0, 0, 0)
today.setHours(0, 0, 0, 0)
const dDelta = Math.round((dDay - today) / (1000 * 60 * 60 * 24))
const dDayLabel = dDelta > 0 ? `D-${dDelta}` : dDelta === 0 ? 'D-day' : `D+${Math.abs(dDelta)}`

const report = `[진척 공유]

# 주간 보고 — ${today.toISOString().split('T')[0]} (라이브 ${dDayLabel})

**작성**: 조기흠 사원·AXDX팀
**기간**: ${sinceStr} ~ ${today.toISOString().split('T')[0]} (지난 7일)

## 1. 객관 수치 (지난 7일)

- 코드 커밋 = ${commitCount}건
- 코드 변경 = 추가 ${insertSum}줄·삭제 ${deleteSum}줄

## 2. 주요 작업 (commits 요약)

\`\`\`
${commits || '(커밋 없음)'}
\`\`\`

## 3. 잘 된 점

- (구체 사례 1·작성 필요)
- (구체 사례 2·작성 필요)

## 4. 문제 발생·해결

- 증상:
- 원인:
- 조치:
- 재발 방지:

## 5. 다음 주 계획

| 우선 | 항목 | 작업량 |
|---|---|---|
| P0 | (다음 주 핵심) | |
| P1 | | |
| P2 | | |

## 6. 자동화 미션 진척 (D 평가 회복 트랙)

- 환경장식물 발주 시스템 = ${dDayLabel}
- 사용자 누적 = (Supabase Studio 측정 필요)
- 시간 절감 추정 = (다음 측정)

## 7. 사용자 영역·결정 사항

- (협의 필요 항목)
`

const outPath = join(ROOT, 'docs', `weekly_report_${yymmdd}.md`)
writeFileSync(outPath, report, 'utf-8')

console.log(`OK: ${outPath}`)
console.log(`커밋 ${commitCount}건 · 추가 ${insertSum}줄 · 삭제 ${deleteSum}줄 · ${dDayLabel}`)
