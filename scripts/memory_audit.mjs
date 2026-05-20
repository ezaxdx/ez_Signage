#!/usr/bin/env node
// 메모리 archive 후보 식별 + MEMORY.md 인덱스 정합 검사
// 사용: node scripts/memory_audit.mjs
// 출력: 1개월+ 미수정 파일·MEMORY.md 누락·고아 메모리 식별
//
// 주의: 실 archive·삭제는 사용자 결정 영역 (5/25 D+3 사이클)·본 도구는 식별만

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const MEM_DIR = join(homedir(), '.claude', 'projects', 'C--Users-EZPMP', 'memory')
const INDEX_PATH = join(MEM_DIR, 'MEMORY.md')

function color(t, c) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, magenta: 35 }
  return `\x1b[${codes[c] || 0}m${t}\x1b[0m`
}

console.log(color('━━ 메모리 정합·archive 후보 식별 ━━', 'cyan'))

// 1. 실 메모리 파일 인벤토리
const files = readdirSync(MEM_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
console.log(`\n실 메모리 파일 = ${files.length}건`)

// 2. 1개월+ 미수정 식별
const now = Date.now()
const oneMonthMs = 30 * 24 * 60 * 60 * 1000
const archiveCandidates = []
const recent = []
for (const f of files) {
  const fp = join(MEM_DIR, f)
  const stat = statSync(fp)
  const ageMs = now - stat.mtimeMs
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
  if (ageMs > oneMonthMs) {
    archiveCandidates.push({ name: f, ageDays })
  } else {
    recent.push({ name: f, ageDays })
  }
}

console.log(`\n${color('1개월+ 미수정 (archive 후보)', 'yellow')} = ${archiveCandidates.length}건`)
archiveCandidates.sort((a, b) => b.ageDays - a.ageDays).slice(0, 15).forEach(c => {
  console.log(`  ${String(c.ageDays).padStart(3)}일 · ${c.name}`)
})
if (archiveCandidates.length > 15) console.log(`  ... 외 ${archiveCandidates.length - 15}건`)

console.log(`\n${color('최근 30일 수정', 'green')} = ${recent.length}건`)

// 3. MEMORY.md 인덱스 정합
let indexEntries = []
try {
  const indexContent = readFileSync(INDEX_PATH, 'utf-8')
  indexEntries = (indexContent.match(/\[([^\]]+)\]\(([^)]+\.md)\)/g) || []).map(m => {
    const fn = m.match(/\(([^)]+\.md)\)/)
    return fn ? fn[1] : null
  }).filter(Boolean)
  console.log(`\nMEMORY.md 인덱스 = ${indexEntries.length}건`)
} catch (e) {
  console.log(`\n${color('MEMORY.md 읽기 실패', 'red')}: ${e.message}`)
}

// 4. 누락·고아 식별
const fileSet = new Set(files)
const indexSet = new Set(indexEntries)
const orphans = files.filter(f => !indexSet.has(f))
const missing = indexEntries.filter(f => !fileSet.has(f))

console.log(`\n${color('인덱스 누락 (파일 존재·MEMORY.md 미등록)', 'yellow')} = ${orphans.length}건`)
orphans.slice(0, 10).forEach(f => console.log(`  ${f}`))
if (orphans.length > 10) console.log(`  ... 외 ${orphans.length - 10}건`)

console.log(`\n${color('인덱스 고아 (MEMORY.md 등록·파일 없음)', 'red')} = ${missing.length}건`)
missing.forEach(f => console.log(`  ${f}`))

// 5. 요약
console.log()
console.log(color('━━ 요약 ━━', 'cyan'))
console.log(`  실 파일 = ${files.length}`)
console.log(`  archive 후보 (1개월+) = ${archiveCandidates.length}`)
console.log(`  인덱스 누락 = ${orphans.length}`)
console.log(`  인덱스 고아 = ${missing.length}`)
console.log()
console.log(color('실 archive·삭제는 5/25 D+3 사이클·사용자 결정 영역', 'yellow'))
