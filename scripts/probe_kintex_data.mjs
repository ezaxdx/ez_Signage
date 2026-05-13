// 킨텍스 4개 행사 데이터 추출 가능성 점검
// - 발주 엑셀 컬럼 (위치/품목/규격/수량/재질)
// - 파일명 패턴에서 수량·규격 추출 가능 여부
// - 폴더 구조 일관성

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별/[핵심] 높음이상'

const KINTEX_EVENTS = [
  { venue: '킨텍스(KINTEX)', folder: '2025 K-GEO Festa 252014 (20,000sqm)' },
  { venue: '킨텍스 제1전시장', folder: '제5회 월드 스마트시티 엑스포(WSCE 2021) 212020' },
  { venue: '킨텍스 제1전시장 5홀', folder: '2022 스마트국토엑스포 223080' },
  { venue: '킨텍스 제2전시장 6AB홀, 9B홀', folder: '제1회 고향사랑의 날 기념식 및 고향사랑기부제 박람회 232025 (10,449㎡)' },
]

function findFiles(dir, pattern, depth = 0, found = []) {
  if (depth > 3) return found
  let entries
  try { entries = readdirSync(dir) } catch { return found }
  for (const e of entries) {
    const p = join(dir, e)
    let s; try { s = statSync(p) } catch { continue }
    if (s.isDirectory()) findFiles(p, pattern, depth + 1, found)
    else if (pattern.test(e)) found.push(p)
  }
  return found
}

function parseFilenameForSpec(name) {
  // 패턴: 3000_6000_v_banner / 600_1800_X배너 / 0.6×1.8 등
  const m1 = name.match(/(\d{3,5})[_×x]\s*(\d{3,5})/)
  const m2 = name.match(/(\d+\.\d+)[_×x]\s*(\d+\.\d+)/)
  if (m1) return { width: +m1[1], height: +m1[2], unit: 'mm' }
  if (m2) return { width: +m2[1] * 1000, height: +m2[2] * 1000, unit: 'mm(from m)' }
  return null
}

function parseFilenameForQty(name) {
  // 패턴: "가로등배너 각 2개 총 6개" / "X배너" 단순 / "빵빠레배너 각 1개 총 3개"
  const total = name.match(/총\s*(\d+)\s*개/)
  const each = name.match(/각\s*(\d+)\s*개/)
  if (total) return { total: +total[1], each: each ? +each[1] : null }
  return null
}

for (const ev of KINTEX_EVENTS) {
  const dir = join(ROOT, ev.venue, ev.folder)
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📍 ${ev.venue} > ${ev.folder}`)
  console.log('='.repeat(80))
  if (!existsSync(dir)) { console.log('  ❌ 폴더 없음'); continue }

  // 1. 결과보고/성과보고 자료
  const reports = findFiles(dir, /(결과보고|성과보고|보고서)/i)
  console.log(`\n📄 결과/성과 보고 (${reports.length}개):`)
  for (const r of reports.slice(0, 15)) {
    const stat = statSync(r)
    const ext = r.split('.').pop().toLowerCase()
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1)
    console.log(`  - [${ext.toUpperCase()}] ${basename(r)} (${sizeMB}MB)`)
  }

  // 2. 발주 엑셀
  const excels = findFiles(dir, /\.xlsx?$/i)
  console.log(`\n📊 엑셀 (${excels.length}개):`)
  for (const xlsx of excels) {
    console.log(`\n  📁 ${basename(xlsx)}`)
    try {
      const wb = XLSX.read(readFileSync(xlsx), { type: 'buffer' })
      for (const sheetName of wb.SheetNames) {
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
        if (aoa.length === 0) continue
        // 헤더 후보 (NO/품목/규격 같은 단어)
        let headerIdx = -1
        for (let i = 0; i < Math.min(aoa.length, 12); i++) {
          const row = aoa[i].map(c => String(c || '').trim())
          if (row.some(c => /구분|품목|규격|재질|수량|위치|장소|NO|연번/i.test(c))) {
            headerIdx = i
            break
          }
        }
        if (headerIdx === -1) {
          console.log(`     [${sheetName}] 헤더 못찾음 (${aoa.length}행)`)
          continue
        }
        const headers = aoa[headerIdx].map(c => String(c || '').trim()).filter(Boolean)
        const dataRows = aoa.slice(headerIdx + 1).filter(r => r.some(c => String(c || '').trim()))
        console.log(`     [${sheetName}] ${dataRows.length}행`)
        console.log(`        컬럼: ${headers.join(' | ')}`)
        // 샘플 첫 3행
        for (let i = 0; i < Math.min(3, dataRows.length); i++) {
          const obj = {}
          headers.forEach((h, idx) => { if (h) obj[h] = String(dataRows[i][idx] || '').trim().slice(0, 30) })
          console.log(`        ex${i + 1}: ${JSON.stringify(obj, null, 0).slice(0, 250)}`)
        }
      }
    } catch (e) { console.log(`     ⚠️ 파싱 실패: ${e.message}`) }
  }

  // 3. 파일명에서 추출 가능한 정보 (PDF/JPG/PNG)
  const designFiles = findFiles(dir, /\.(pdf|jpg|jpeg|png|pptx)$/i)
  const filenameSpecs = []
  const filenameQtys = []
  for (const f of designFiles) {
    const name = basename(f)
    const spec = parseFilenameForSpec(name)
    const qty = parseFilenameForQty(name)
    if (spec) filenameSpecs.push({ name, spec })
    if (qty) filenameQtys.push({ name, qty })
  }
  console.log(`\n🎨 시안 파일 (${designFiles.length}개) — 파일명에서 추출:`)
  console.log(`   - 규격 추출 가능: ${filenameSpecs.length}개`)
  filenameSpecs.slice(0, 5).forEach(s =>
    console.log(`     · ${s.name.slice(0, 60)} → ${s.spec.width}×${s.spec.height}mm`))
  console.log(`   - 수량 추출 가능: ${filenameQtys.length}개`)
  filenameQtys.slice(0, 8).forEach(q =>
    console.log(`     · ${q.name.slice(0, 70)} → 총 ${q.qty.total}개`))

  // 4. 폴더 분류 (제작물 종류별 폴더가 있는 경우)
  const subdirs = readdirSync(dir).filter(e => {
    try { return statSync(join(dir, e)).isDirectory() } catch { return false }
  })
  if (subdirs.length > 0) {
    console.log(`\n📂 하위 폴더 (${subdirs.length}개):`)
    subdirs.forEach(s => {
      try {
        const cnt = readdirSync(join(dir, s)).length
        console.log(`   - ${s} (${cnt}개 파일)`)
      } catch { /* ignore */ }
    })
  }
}
