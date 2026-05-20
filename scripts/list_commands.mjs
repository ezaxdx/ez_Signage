#!/usr/bin/env node
// 등록된 슬래시 명령·자동화 도구 인덱스 자동 출력
// 사용: node scripts/list_commands.mjs
// 출력: .claude/commands/*.md + scripts/*.mjs + ps1 도구 통합 1쪽 인덱스

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOT = process.cwd()
const COMMANDS_DIR = join(ROOT, '.claude', 'commands')
const SCRIPTS_DIR = join(ROOT, 'scripts')

function color(t, c) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, magenta: 35 }
  return `\x1b[${codes[c] || 0}m${t}\x1b[0m`
}

function extractDesc(content) {
  const m1 = content.match(/^description:\s*(.+)$/m)
  if (m1) return m1[1].trim()
  const m2 = content.match(/^#\s+\/[a-z-]+\s*$/m)
  return m2 ? '' : ''
}

console.log(color('━━ 자동화 도구·슬래시 명령 인덱스 ━━', 'cyan'))

// 1. 슬래시 명령
console.log()
console.log(color('1. 슬래시 명령 (.claude/commands/)', 'magenta'))
const cmds = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'))
for (const f of cmds.sort()) {
  const content = readFileSync(join(COMMANDS_DIR, f), 'utf-8')
  const desc = extractDesc(content)
  const name = f.replace('.md', '')
  console.log(`  /${name.padEnd(20)} - ${desc}`)
}

// 2. mjs 스크립트
console.log()
console.log(color('2. Node 스크립트 (scripts/*.mjs)', 'magenta'))
const scripts = readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.mjs'))
for (const f of scripts.sort()) {
  const content = readFileSync(join(SCRIPTS_DIR, f), 'utf-8')
  const firstComment = content.match(/^\/\/\s*(.+)$/m)
  const desc = firstComment ? firstComment[1] : ''
  console.log(`  node scripts/${f.padEnd(35)} - ${desc.slice(0, 60)}`)
}

// 3. PowerShell 도구 (mice-design-guide 외부)
console.log()
console.log(color('3. PowerShell 도구 (업무\\보고서 작성\\)', 'magenta'))
const ps1Tools = [
  ['md_to_docx.ps1', 'MD → Word (맑은 고딕·표·헤딩)'],
  ['md_to_pptx.ps1', 'MD → PowerPoint 1슬라이드 (16:9·Action Title)'],
  ['md_to_xlsx.ps1', 'MD 표 → Excel 시트'],
  ['xlsx_to_md.ps1', 'Excel 시트 → MD 표 (역변환)'],
]
for (const [name, desc] of ps1Tools) {
  console.log(`  ${name.padEnd(20)} - ${desc}`)
}

console.log()
console.log(color('4. 결재 자동화 (업무\\결제문서 작성\\)', 'magenta'))
console.log(`  bill_generator.ps1   - 갑지 txt + 을지 xlsx 자동 생성`)
console.log(`  bill_template_gapji.md - 갑지 양식 템플릿`)

// 4. npm scripts
console.log()
console.log(color('5. npm run 명령 (package.json)', 'magenta'))
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    if (name.startsWith('check:') || name.startsWith('report:')) {
      console.log(`  npm run ${name.padEnd(20)} - ${cmd}`)
    }
  }
} catch (e) { /* skip */ }

// 5. 카운트
console.log()
console.log(color('━━ 요약 ━━', 'cyan'))
console.log(`  슬래시 명령 = ${cmds.length}건`)
console.log(`  Node 스크립트 = ${scripts.length}건`)
console.log(`  PowerShell 도구 = ${ps1Tools.length + 2}건 (변환 + 결재)`)
console.log()
console.log(color('도구·명령 추가 시 본 스크립트 재실행 → 자동 인덱싱', 'yellow'))
