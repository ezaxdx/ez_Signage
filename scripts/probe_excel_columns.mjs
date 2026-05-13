// 폴더 엑셀의 컬럼 구조 검사 — 발주일/납기일 정보 존재 여부 확인
import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

function findExcels(dir, depth = 0, found = []) {
  if (depth > 3) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let stat; try { stat = statSync(p) } catch { continue }
    if (stat.isDirectory()) findExcels(p, depth + 1, found)
    else if (/제작물.*리스트.*\.xlsx?$/i.test(e) || /제작물리스트.*\.xlsx?$/i.test(e)) found.push(p)
  }
  return found
}

const files = findExcels(ROOT).slice(0, 6)
const dateColCount = {}
for (const f of files) {
  console.log(`\n=== ${f.split(/[\\/]/).slice(-2).join('/')} ===`)
  const wb = XLSX.read(readFileSync(f), { type: 'buffer' })
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
    let headerIdx = aoa.findIndex(r => r.some(c => /^(NO|번호|연번)$/i.test(String(c).trim())))
    if (headerIdx === -1) headerIdx = aoa.findIndex(r => r.some(c => /구분|품목|규격|재질/.test(String(c))))
    if (headerIdx === -1) continue
    const headers = aoa[headerIdx].map(c => String(c || '').trim())
    console.log(`  [Sheet: ${name}] 컬럼:`, headers.filter(Boolean).join(' | '))
    for (const h of headers) {
      if (!h) continue
      if (/발주|납기|시안|확정|마감|컨펌|디자인업체|출력업체|설치|철거/i.test(h)) {
        dateColCount[h] = (dateColCount[h] || 0) + 1
      }
    }
  }
}

console.log(`\n=== 일정·업체 관련 컬럼 빈도 ===`)
for (const [k, v] of Object.entries(dateColCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(30)} ${v}`)
}
