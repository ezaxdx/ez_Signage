#!/usr/bin/env node
// 상사 요청 최종 양식 (2026-05-19)
// 사용자 명시 = 한 번에 볼 수 있는 엑셀·G드라이브 SOT
//
// 양식 (상사 명시 4 정보):
//   1. 행사장
//   2. 기본 도면 유무 (있을시 파일명)
//   3. 진행 행사 유무 (있을시 행사명)
//   4. 해당 행사 관련 학습 자료 (학습한 자료가 있는지·파일명)
//
// 출력: 행사장 1행 = 한 행 + 줄바꿈 셀로 도면·행사·학습 자료 명시

import XLSX from 'xlsx'
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

// 행사장별 데이터 수집
const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()
const rows = [['#', '행사장', '기본 도면 유무', '기본 도면 파일명', '진행 행사 유무', '진행 행사명', '해당 행사 관련 학습 자료 (행사별 파일명)']]

let idx = 1
for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const drawings = []   // [{ name, rel }]
  const events = []      // [{ event_name, code, hall, area, files: [{ name, rel }] }]

  // 행사장 walk
  function walk(dir, ctx) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) {
        // 행사장 직속 파일 = 기본 도면
        if (ctx === 'venue_root') {
          drawings.push({ name: e.name, rel: relPath(fp) })
        } else if (ctx === 'drawing') {
          drawings.push({ name: e.name, rel: relPath(fp) })
        }
        continue
      }
      if (!e.isDirectory()) continue
      const cls = classifyFolder(e.name)

      if (cls === 'drawing') {
        // 도면 폴더 = 모든 하위 파일 = drawings
        walkAll(fp, drawings)
      } else if (cls === 'guide' || cls === 'application') {
        // 서류 = 도면에 포함 안 함 (별도 시트 가능하지만 한 시트로 압축이므로 제외)
      } else if (cls === 'project_root') {
        // 프로젝트 학습 = 그 안 행사 폴더 순회
        for (const sub of safeReadDir(fp)) {
          if (!sub.isDirectory()) continue
          const subPath = path.join(fp, sub.name)
          if (isEventFolderName(sub.name)) {
            walkEvent(subPath, sub.name)
          } else {
            // L3_ 안 행사
            for (const sub2 of safeReadDir(subPath)) {
              if (sub2.isDirectory()) {
                walkEvent(path.join(subPath, sub2.name), sub2.name, sub.name)
              }
            }
          }
        }
      } else if (cls === 'event') {
        walkEvent(fp, e.name)
      } else {
        // 알 수 없는 폴더 = 행사 후보 (BEXCO·CECO 도면 폴더 가능성)
        // 일단 도면 폴더로 처리
        walkAll(fp, drawings)
      }
    }
  }

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
    // 기존 같은 행사 코드 항목과 병합
    const existing = events.find(ev => ev.code === parsed.code && ev.event_name === parsed.name)
    if (existing) {
      existing.files.push(...files)
    } else {
      events.push({
        event_name: parsed.name,
        code: parsed.code,
        hall: parsed.hall,
        area: parsed.area,
        files,
      })
    }
  }

  // 행사장 직속 파일 수집
  for (const e of safeReadDir(venueDir)) {
    const fp = path.join(venueDir, e.name)
    if (e.isFile()) drawings.push({ name: e.name, rel: relPath(fp) })
  }
  // 하위 폴더 walk
  walk(venueDir, null)

  // 컬럼 값 구성
  const drawCell = drawings.length > 0
    ? drawings.map(d => `• ${d.name}`).join('\n')
    : '—'

  const eventNameCell = events.length > 0
    ? events.map(ev => {
        const meta = [ev.code, ev.area].filter(Boolean).join(' · ')
        return `• ${ev.event_name}${meta ? ` (${meta})` : ''}${ev.hall && ev.hall !== '(L2 미상)' ? `\n   └ L2: ${ev.hall}` : ''}`
      }).join('\n')
    : '—'

  const learnCell = events.length > 0
    ? events.map(ev => {
        const filesList = ev.files.map(f => `   • ${f.name}`).join('\n')
        return `[${ev.event_name}]\n${filesList}`
      }).join('\n\n')
    : '—'

  rows.push([
    idx++,
    venueName,
    drawings.length > 0 ? `O (${drawings.length}건)` : 'X',
    drawCell,
    events.length > 0 ? `O (${events.length}건)` : 'X',
    eventNameCell,
    learnCell,
  ])
}

// 시트 작성
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet(rows)

// 컬럼 너비
ws['!cols'] = [
  { wch: 4 },    // #
  { wch: 32 },   // 행사장
  { wch: 14 },   // 도면 유무
  { wch: 60 },   // 도면 파일명
  { wch: 14 },   // 행사 유무
  { wch: 70 },   // 행사명
  { wch: 100 },  // 학습 자료
]

// 자동 필터·헤더 고정
ws['!autofilter'] = { ref: `A1:G${rows.length}` }
ws['!freeze'] = { xSplit: 0, ySplit: 1 }

// 모든 셀에 wrapText·줄바꿈 활성화
const range = XLSX.utils.decode_range(ws['!ref'])
for (let R = range.s.r; R <= range.e.r; R++) {
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: C })
    if (ws[addr]) {
      ws[addr].s = ws[addr].s || {}
      ws[addr].s.alignment = { wrapText: true, vertical: 'top', horizontal: R === 0 ? 'center' : 'left' }
      if (R === 0) {
        ws[addr].s.font = { bold: true }
        ws[addr].s.fill = { fgColor: { rgb: 'D9E1F2' } }
      }
    }
  }
}

// 행 높이 자동 (학습 자료 양에 따라)
ws['!rows'] = []
ws['!rows'][0] = { hpx: 30 }   // 헤더
for (let r = 1; r < rows.length; r++) {
  const learnLines = (rows[r][6] || '').split('\n').length
  const drawLines = (rows[r][3] || '').split('\n').length
  const eventLines = (rows[r][5] || '').split('\n').length
  const maxLines = Math.max(learnLines, drawLines, eventLines, 1)
  ws['!rows'][r] = { hpx: Math.min(Math.max(maxLines * 16, 30), 600) }
}

XLSX.utils.book_append_sheet(wb, ws, '학습데이터 종합')

// 메타 시트 (읽는 법)
const metaRows = [
  ['항목', '내용'],
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
  ['파일 경로', '명시 파일명만 표시 (L1_행사장 이후 경로는 v6 xlsx 참조)'],
  ['컬럼 너비', '학습 자료 컬럼 100자 + 줄바꿈 자동'],
  ['행 높이', '내용 길이에 따라 자동 (16px × 줄 수, 최대 600px)'],
  ['헤더', '굵게·중앙·연한 파랑 배경'],
  ['필터·고정', '자동 필터 + 1행 헤더 고정'],
]
const wsM = XLSX.utils.aoa_to_sheet(metaRows)
wsM['!cols'] = [{ wch: 30 }, { wch: 100 }]
XLSX.utils.book_append_sheet(wb, wsM, '0. 읽는 법')

// 시트 순서: 0. 읽는 법 → 학습데이터 종합
wb.SheetNames = ['0. 읽는 법', '학습데이터 종합']

const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)

console.log('✓ 상사 요청 최종본 xlsx 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 행사장 ' + (rows.length - 1) + '건 × 4 정보 (도면·행사·학습 자료)')
