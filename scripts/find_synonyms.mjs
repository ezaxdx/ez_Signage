// 실제 엑셀에서 사용된 모든 시그너지 이름 추출
// → SEED_SYNONYMS에 누락된 동의어 후보 식별

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

function findExcels(dir, depth = 0, found = []) {
  if (depth > 4) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (stat.isDirectory()) findExcels(p, depth + 1, found)
    else if (/\.xlsx?$/i.test(e) && !/수행실적리스트/.test(e)) found.push(p)
  }
  return found
}

// 이미 SEED_SYNONYMS / 카테고리 정규화에 있는 표준명들 (소문자·공백 제거)
const KNOWN = new Set([
  'x배너', 'x-배너', 'i배너', 'i-배너',
  '가로현수막', '세로현수막', '통천', '가로등배너',
  '포디움타이틀', '폼보드', 'a4', 'a3', '백월', '명찰', '시트지',
  '스프링배너', '철재스프링배너', 'a배너', '물통배너',
  '드롭배너', '난간배너', '롤업배너', '배너스탠드',
  '스탠드pop', '안내폼보드', '큐방', '바닥스티커',
  '실사출력', '천장배너', '빵빠레배너', '피켓a4', '피켓a3',
])

const HEADER_KEYS = {
  item: ['품목', '제작물', '환경장식물', '품명', '항목'],
  bigarea: ['구분', '대분류'],
}

function detectColumn(header, names) {
  for (let i = 0; i < header.length; i++) {
    const h = String(header[i] || '').replace(/\s+/g, '').toLowerCase()
    if (!h) continue
    if (names.some(n => h.includes(n.replace(/\s+/g, '').toLowerCase()))) return i
  }
  return -1
}

function isSignageLike(s) {
  if (!s) return false
  return /배너|현수막|폼보드|포디움|연단|시트|스티커|보드|타이틀|사인|명찰|명패|a4|a3|백월|백드롭|광고/i.test(s)
}

const files = findExcels(ROOT)
const allNames = new Map()  // 이름 → 출현 횟수

for (const f of files) {
  try {
    const wb = XLSX.read(readFileSync(f), { type: 'buffer' })
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      let headerIdx = aoa.findIndex(r => r.some(c => /^(NO|번호|연번|순번|NO\.)$/i.test(String(c).trim())))
      if (headerIdx === -1) headerIdx = aoa.findIndex(r => r.some(c => /구분|품목|규격|재질/.test(String(c))))
      if (headerIdx === -1) continue

      const itemCol = detectColumn(aoa[headerIdx], HEADER_KEYS.item)
      const bigCol = detectColumn(aoa[headerIdx], HEADER_KEYS.bigarea)
      const usedCol = itemCol >= 0 ? itemCol : bigCol
      if (usedCol < 0) continue

      for (const row of aoa.slice(headerIdx + 1)) {
        const v = String(row[usedCol] || '').trim()
        if (v && isSignageLike(v)) {
          allNames.set(v, (allNames.get(v) || 0) + 1)
        }
      }
    }
  } catch {}
}

// 분류
const unknown = []
const knownConfirmed = []

for (const [name, count] of allNames) {
  const norm = name.replace(/\s+/g, '').toLowerCase()
  // KNOWN과 부분 매칭
  let matched = false
  for (const k of KNOWN) {
    if (norm === k || norm.includes(k) || k.includes(norm)) {
      matched = true; break
    }
  }
  if (matched) knownConfirmed.push([name, count])
  else unknown.push([name, count])
}

console.log(`총 시그너지 후보 이름: ${allNames.size}개`)
console.log(`기존 KNOWN과 매칭됨: ${knownConfirmed.length}개`)
console.log(`동의어 후보 (KNOWN에 없음): ${unknown.length}개\n`)

console.log(`=== 동의어 후보 (이미 등록된 표준명에 매칭 안됨) ===`)
unknown.sort((a, b) => b[1] - a[1])
for (const [name, count] of unknown.slice(0, 50)) {
  console.log(`  ${String(count).padStart(3)} ${name}`)
}
