#!/usr/bin/env node
// 5/22 사용자 명시 = 30 행사장 영역 전수 조사 + 엑셀 (사람 영역 보기 영역 정리)

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무 자동화/제작물 디자인 의뢰 가이드/참고자료/학습데이터_통합_260514/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_30행사장_조사_260522.xlsx'

// 파일 종류 영역 영역 영역 자동 분류
function classifyFile(name) {
  const lower = name.toLowerCase()
  // 도면 영역 = pdf·dwg·jpg·png + 이름 영역 "도면"·"floor"·"평면"·"layout"·"floorplan"
  if (/도면|floor|평면|layout|배치도|floorplan/i.test(name)) return '도면'
  if (/\.dwg$|\.dxf$/i.test(name)) return '도면 (CAD)'
  // 매뉴얼 영역
  if (/매뉴얼|manual|가이드|guide|시설|규격|spec/i.test(name)) return '매뉴얼·시설 가이드'
  // 발주 엑셀
  if (/\.xlsx$|\.xls$/i.test(name) && /발주|order|리스트|list|signage|환경/i.test(name)) return '발주 엑셀'
  if (/\.xlsx$|\.xls$/i.test(name)) return '엑셀'
  // 시안 영역
  if (/\.ai$|\.psd$|\.pdf$/i.test(name) && /시안|design|배너|banner/i.test(name)) return '시안'
  // 결과보고서
  if (/결과|보고서|report|완료/i.test(name)) return '결과 보고서'
  // 도면 영역 일반
  if (/\.pdf$/i.test(name)) return 'PDF (일반)'
  if (/\.jpg$|\.jpeg$|\.png$/i.test(name)) return '이미지'
  if (/\.ai$|\.psd$/i.test(name)) return '시안 (디자인)'
  if (/\.hwp$|\.docx$|\.doc$/i.test(name)) return '문서'
  return '기타'
}

function walkDir(dir, maxDepth = 6, currentDepth = 0) {
  const results = []
  if (currentDepth > maxDepth) return results
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return results }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, maxDepth, currentDepth + 1))
    } else if (entry.isFile()) {
      results.push({ name: entry.name, fullPath, size: 0 })
    }
  }
  return results
}

const wb = XLSX.utils.book_new()

// ─────────────────────────────────────────────────────
// Sheet 1: 행사장별 요약 (메인)
// 각 행사장 = 1 행 = 도면 / 진행 행사 / 매뉴얼 / 시안 / 파일 수 영역
// ─────────────────────────────────────────────────────
const summaryRows = [
  ['#', '행사장 (L1)', '폴더 파일 총수', '도면 (개수)', '매뉴얼·시설 가이드', '발주 엑셀', '결과 보고서', '시안', '기타 파일', '진행 행사 영역 영역 = 하위 폴더', '코드 영역 학습 영역', '비고'],
]

// 행사장별 상세 시트 영역
const detailSheets = []

const venueDirs = fs.readdirSync(L1_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort()

// 코드 영역 학습 영역 영역 (5/22 영역 7건)
const codeLearnedKeys = ['BEXCO', 'COEX', 'KINTEX', 'ICC 제주', 'DDP', '롯데호텔 서울', '송도컨벤시아']

let idx = 1
for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const files = walkDir(venueDir)

  // 분류 영역
  const byType = new Map()
  for (const f of files) {
    const t = classifyFile(f.name)
    if (!byType.has(t)) byType.set(t, [])
    byType.get(t).push(f.name)
  }

  // 직속 하위 폴더 영역 (진행 행사 영역)
  const subDirs = fs.readdirSync(venueDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  const drawingFiles = (byType.get('도면') ?? []).concat(byType.get('도면 (CAD)') ?? [])
  const manualFiles = byType.get('매뉴얼·시설 가이드') ?? []
  const orderFiles = byType.get('발주 엑셀') ?? []
  const reportFiles = byType.get('결과 보고서') ?? []
  const designFiles = (byType.get('시안') ?? []).concat(byType.get('시안 (디자인)') ?? [])
  const otherFiles = (byType.get('기타') ?? []).concat(byType.get('PDF (일반)') ?? []).concat(byType.get('이미지') ?? []).concat(byType.get('엑셀') ?? []).concat(byType.get('문서') ?? [])

  const isCodeLearned = codeLearnedKeys.some(k => venueName.includes(k) || k.includes(venueName))

  summaryRows.push([
    idx++,
    venueName,
    files.length,
    drawingFiles.length,
    manualFiles.length > 0 ? manualFiles.length + '건' : '—',
    orderFiles.length > 0 ? orderFiles.length + '건' : '—',
    reportFiles.length > 0 ? reportFiles.length + '건' : '—',
    designFiles.length > 0 ? designFiles.length + '건' : '—',
    otherFiles.length,
    subDirs.length > 0 ? `${subDirs.length}건 = ${subDirs.slice(0, 3).join(', ')}${subDirs.length > 3 ? '...' : ''}` : '—',
    isCodeLearned ? '✅ 학습' : '❌ 미학습',
    isCodeLearned ? 'VENUE_FACILITY_GUIDE_SEED 영역 영역' : '시드 영역 영역 추가 의무',
  ])

  // 행사장별 상세 시트 영역 = 모든 파일 영역
  if (files.length > 0) {
    const detailRows = [
      ['#', '파일명', '분류', '경로 (폴더)'],
    ]
    let fidx = 1
    const sortedFiles = files.slice().sort((a, b) => a.fullPath.localeCompare(b.fullPath))
    for (const f of sortedFiles) {
      const relDir = path.relative(venueDir, path.dirname(f.fullPath)) || '(직속)'
      detailRows.push([fidx++, f.name, classifyFile(f.name), relDir])
    }
    detailSheets.push({ name: venueName, rows: detailRows })
  }
}

const sumWs = XLSX.utils.aoa_to_sheet(summaryRows)
sumWs['!cols'] = [{wch: 4}, {wch: 30}, {wch: 10}, {wch: 10}, {wch: 14}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 60}, {wch: 14}, {wch: 30}]
XLSX.utils.book_append_sheet(wb, sumWs, '1. 30 행사장 요약')

// 각 행사장별 상세 시트 영역 (이름 영역 31자 영역 영역 잘림)
for (const sheet of detailSheets) {
  const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
  ws['!cols'] = [{wch: 4}, {wch: 60}, {wch: 18}, {wch: 40}]
  // 시트 이름 영역 31자 영역 영역 잘림
  let sheetName = sheet.name.length > 28 ? sheet.name.slice(0, 28) : sheet.name
  // 중복 영역 영역 영역 영역 영역
  let count = 1
  while (wb.SheetNames.includes(sheetName)) {
    sheetName = sheetName.slice(0, 26) + '_' + (++count)
  }
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
}

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)
console.log('✓ 30 행사장 학습데이터 조사 엑셀 영역 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → ' + (1 + detailSheets.length) + ' 시트 (요약 + 행사장별 상세)')
console.log('  → 조사 영역 = ' + venueDirs.length + ' 행사장')
