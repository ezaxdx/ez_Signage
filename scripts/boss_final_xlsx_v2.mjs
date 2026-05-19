#!/usr/bin/env node
// 상사 요청 최종본 v2 (2026-05-19) — ExcelJS로 wrapText·헤더 스타일·행 높이 정밀 적용
// 사용자 명시 = 한 번에 볼 수 있는 엑셀·G드라이브 SOT
//
// 양식 (상사 명시 4 정보):
//   1. 행사장
//   2. 기본 도면 유무 (있을시 파일명)
//   3. 진행 행사 유무 (있을시 행사명)
//   4. 해당 행사 관련 학습 자료 (학습한 자료가 있는지·파일명)

import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_상사요청_최종본_260519.xlsx'

function safeReadDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== 'desktop.ini' && !e.name.startsWith('__MACOSX') && !e.name.startsWith('.')) }
  catch { return [] }
}

function relPath(absPath) { return path.relative(L1_ROOT, absPath).replace(/\\/g, '/') }

function classifyFolder(name) {
  if (/^(_기본도면|도면|회의실 도면)$/.test(name)) return 'drawing'
  if (/안내서류|시설가이드|임대자료|매뉴얼/.test(name)) return 'guide'
  if (/제출서류|신청서|신고서/.test(name)) return 'application'
  if (/^(프로젝트 학습|학습자료)$/.test(name)) return 'project_root'
  if (/^(L2_|L3_|환경제작물학습_)/.test(name) || /\d{6}/.test(name)) return 'event'
  return 'other'
}

function parseEventFolderName(name) {
  let s = name.replace(/^(L2_|L3_|환경제작물학습_)/, '')
  let area = ''
  const areaM = s.match(/\s*\(([\d,]+㎡)\)\s*$/)
  if (areaM) { area = areaM[1]; s = s.replace(areaM[0], '').trim() }
  const codeM = s.match(/^(?:(.*?)[_\s]+)?(\d{6})[_\s]+(.+)$/)
  if (codeM) {
    return { hall: (codeM[1] ?? '').replace(/_/g, ' ').trim() || '(L2 미상)', code: codeM[2], name: codeM[3].trim(), area }
  }
  return { hall: '(L2 미상)', code: '', name: s, area }
}

function isEventFolderName(name) {
  return /^(L2_|L3_|환경제작물학습_)/.test(name) || /\d{6}/.test(name)
}

const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()
const dataRows = []

for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const drawings = []
  const events = []

  function walkAll(dir, sink) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) sink.push({ name: e.name, rel: relPath(fp) })
      else if (e.isDirectory()) walkAll(fp, sink)
    }
  }

  function walkEvent(dir, folderName, parentName = null) {
    const parsed = parseEventFolderName(parentName || folderName)
    const files = []
    walkAll(dir, files)
    if (files.length === 0) return
    const existing = events.find(ev => ev.code === parsed.code && ev.event_name === parsed.name)
    if (existing) {
      existing.files.push(...files)
    } else {
      events.push({ event_name: parsed.name, code: parsed.code, hall: parsed.hall, area: parsed.area, files })
    }
  }

  function walk(dir) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) continue
      if (!e.isDirectory()) continue
      const cls = classifyFolder(e.name)

      if (cls === 'drawing') {
        walkAll(fp, drawings)
      } else if (cls === 'guide' || cls === 'application') {
        // 도면·학습 분리 = 안내·서류는 제외
      } else if (cls === 'project_root') {
        for (const sub of safeReadDir(fp)) {
          if (!sub.isDirectory()) continue
          const subPath = path.join(fp, sub.name)
          if (isEventFolderName(sub.name)) {
            walkEvent(subPath, sub.name)
          } else {
            for (const sub2 of safeReadDir(subPath)) {
              if (sub2.isDirectory()) walkEvent(path.join(subPath, sub2.name), sub2.name, sub.name)
            }
          }
        }
      } else if (cls === 'event') {
        walkEvent(fp, e.name)
      } else {
        walkAll(fp, drawings)
      }
    }
  }

  // 직속 파일 = 기본 도면
  for (const e of safeReadDir(venueDir)) {
    const fp = path.join(venueDir, e.name)
    if (e.isFile()) drawings.push({ name: e.name, rel: relPath(fp) })
  }
  walk(venueDir)

  dataRows.push({ venueName, drawings, events })
}

// ─── ExcelJS 작성 ───
const wb = new ExcelJS.Workbook()
wb.creator = 'AXDX팀'
wb.created = new Date('2026-05-19')

// 시트 0: 읽는 법
const wsM = wb.addWorksheet('0. 읽는 법')
wsM.columns = [
  { header: '항목', key: 'a', width: 30 },
  { header: '내용', key: 'b', width: 100 },
]
const metaData = [
  ['파일명', '학습데이터_상사요청_최종본_260519.xlsx'],
  ['조사 일자', '2026-05-19'],
  ['소스 (SOT)', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'],
  ['시트 구성', '학습데이터 종합 (1 행사장 = 1 행)'],
  ['', ''],
  ['상사 요청 4 정보 매핑', ''],
  ['  ① 행사장', 'B열 — L1 폴더명 그대로'],
  ['  ② 기본 도면 유무·파일명', 'C·D열 — 행사장 직속 + _기본도면·도면·회의실 도면 폴더 안 파일'],
  ['  ③ 진행 행사 유무·행사명', 'E·F열 — 프로젝트 학습/L2_·L3_·환경제작물학습_·6자리 코드 폴더 파싱'],
  ['  ④ 해당 행사 학습 자료', 'G열 — 행사별 묶음 [행사명] + 파일명 줄바꿈 나열'],
  ['', ''],
  ['컬럼·행 자동 적용', 'wrapText 활성화·헤더 고정·필터·행 높이 자동'],
  ['행사장 총 수', String(dataRows.length)],
]
metaData.forEach(r => wsM.addRow(r))
wsM.getRow(1).font = { bold: true }
wsM.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsM.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
wsM.eachRow((row) => {
  row.alignment = { ...row.alignment, vertical: 'top', wrapText: true }
})

// 시트 1: 학습데이터 종합
const ws = wb.addWorksheet('학습데이터 종합')
ws.columns = [
  { header: '#',                                       key: 'no',      width: 5  },
  { header: '행사장',                                  key: 'venue',   width: 32 },
  { header: '기본 도면 유무',                           key: 'd_flag',  width: 14 },
  { header: '기본 도면 파일명',                         key: 'd_files', width: 60 },
  { header: '진행 행사 유무',                           key: 'e_flag',  width: 14 },
  { header: '진행 행사명',                              key: 'e_names', width: 70 },
  { header: '해당 행사 관련 학습 자료 (행사별 파일명)', key: 'l_files', width: 100 },
]

// 헤더 스타일
const headerRow = ws.getRow(1)
headerRow.font = { bold: true, size: 11 }
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
headerRow.height = 30
headerRow.eachCell((cell) => {
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  }
})

// 데이터 행
dataRows.forEach((d, i) => {
  const drawCell = d.drawings.length > 0
    ? d.drawings.map(f => `• ${f.name}`).join('\n')
    : '—'

  const eventNameCell = d.events.length > 0
    ? d.events.map(ev => {
        const meta = [ev.code, ev.area].filter(Boolean).join(' · ')
        const hallLine = (ev.hall && ev.hall !== '(L2 미상)') ? `\n   └ L2: ${ev.hall}` : ''
        return `• ${ev.event_name}${meta ? ` (${meta})` : ''}${hallLine}`
      }).join('\n')
    : '—'

  const learnCell = d.events.length > 0
    ? d.events.map(ev => {
        const filesList = ev.files.map(f => `   • ${f.name}`).join('\n')
        return `[${ev.event_name}]\n${filesList}`
      }).join('\n\n')
    : '—'

  const row = ws.addRow({
    no: i + 1,
    venue: d.venueName,
    d_flag: d.drawings.length > 0 ? `O (${d.drawings.length}건)` : 'X',
    d_files: drawCell,
    e_flag: d.events.length > 0 ? `O (${d.events.length}건)` : 'X',
    e_names: eventNameCell,
    l_files: learnCell,
  })

  // 셀 정렬
  row.alignment = { vertical: 'top', wrapText: true }
  row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' }
  row.getCell('venue').alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
  row.getCell('d_flag').alignment = { vertical: 'middle', horizontal: 'center' }
  row.getCell('e_flag').alignment = { vertical: 'middle', horizontal: 'center' }

  // 행 높이 = 가장 긴 셀의 줄 수 × 16px (최대 600px)
  const lines = Math.max(
    drawCell.split('\n').length,
    eventNameCell.split('\n').length,
    learnCell.split('\n').length,
    1
  )
  row.height = Math.min(Math.max(lines * 16, 22), 600)

  // 행 테두리
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    }
  })
})

// 필터·헤더 고정
ws.autoFilter = { from: 'A1', to: `G${dataRows.length + 1}` }
ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
await wb.xlsx.writeFile(OUT_PATH)

console.log('✓ 상사 요청 최종본 xlsx v2 작성 완료 (ExcelJS·wrapText 정밀)')
console.log('  → ' + OUT_PATH)
console.log('  → 행사장 ' + dataRows.length + '건 × 4 정보 (도면·행사·학습 자료)')
