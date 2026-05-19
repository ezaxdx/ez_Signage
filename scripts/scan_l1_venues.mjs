#!/usr/bin/env node
// 5/22 사용자 명시 = 30 행사장 영역 전수 조사 + 엑셀 (사람 영역 보기 영역 정리)
// 5/22 추가 명시:
//   - 비고 = 정확 학습 영역 명시 (추상적 표현 X)
//   - 하위 폴더 = 폴더 안 파일·정보 영역 자세히 (어떤 파일 영역 어떤 정보 영역)

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무 자동화/제작물 디자인 의뢰 가이드/참고자료/학습데이터_통합_260514/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_30행사장_조사_v2_260522.xlsx'

// 코드 영역 학습 영역 = 7건 영역 (5/22 영역 영역 영역 학습 영역 영역 영역)
const CODE_LEARNED = {
  'BEXCO': '벡스코 (BEXCO) = VENUE_LIST 영역 영역 등록 = 부산광역시·컨벤션·typicalItemCount 40. 시설 가이드 영역 영역 = 미작성',
  'COEX': '코엑스 = VENUE_LIST + 시설 가이드 4건 (그랜드볼룸 max 4000×1200·아셈볼룸 max 3000×1000·D홀·컨퍼런스홀) + 시드 7+ 행사 (스마트국토엑스포·AdAsia 등)',
  'KINTEX': '킨텍스 = VENUE_LIST + 시설 가이드 3건 (5홀 외벽 7600×2000·기둥 max 1200×600·가로등 600×1800·통천 24m×17m·천정배너 행잉 영역·1~4홀·2전시장) + WSCE 2022 시드',
  'ICC 제주': 'ICC JEJU = VENUE_LIST + 시설 가이드 (세로현수막 600×1800·포디움 600×200) + 시드 3건 (IUCN리더스포럼·APEC 중소기업·세계리더스보전포럼)',
  'DDP': 'DDP = VENUE_LIST + 시설 가이드 (포디움 600×200) + 휘하 홀 5건 (알림1·알림2·디자인올레·디자인전시관·어울림광장)',
  '롯데호텔 서울': '롯데호텔 = VENUE_LIST + 시설 가이드 (기본 컨벤션·호텔 영업팀 사전 협의) + 시드 2건 (한-중앙아·환경 협력 네트워크)',
  '송도컨벤시아': '송도컨벤시아 = VENUE_LIST + 시설 가이드 (로비 max 3000×1200·폴대 600×1800·포디움)',
}

// 폴더 영역 영역 자동 분류·요약
function summarizeFolder(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return null }

  const subDirs = entries.filter(e => e.isDirectory() && e.name !== 'desktop.ini').map(e => e.name)
  const files = entries.filter(e => e.isFile() && e.name !== 'desktop.ini').map(e => e.name)

  // 분류
  const drawings = files.filter(f => /도면|평면|배치도|layout|floor/i.test(f) || /\.dwg$|\.dxf$/i.test(f))
  const manuals = files.filter(f => /매뉴얼|manual|가이드|시설|규격/i.test(f))
  const orders = files.filter(f => /\.xlsx?$/i.test(f) && /발주|order|리스트|signage|환경|제작물/i.test(f))
  const designs = files.filter(f => /\.ai$|\.psd$/i.test(f) || /시안/i.test(f))
  const images = files.filter(f => /\.jpg$|\.jpeg$|\.png$|\.webp$/i.test(f))
  const reports = files.filter(f => /결과|보고서|report/i.test(f))

  return { subDirs, files, drawings, manuals, orders, designs, images, reports }
}

// 폴더 영역 영역 영역 자세히 walk → 학습 영역 영역 영역 요약 (사람 영역 보기 영역)
function describeStructure(dir, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return ''
  const sum = summarizeFolder(dir)
  if (!sum) return ''

  const lines = []
  for (const sub of sum.subDirs) {
    const subDir = path.join(dir, sub)
    const subSum = summarizeFolder(subDir)
    if (!subSum) continue

    const indent = '  '.repeat(depth)
    const types = []
    if (subSum.drawings.length > 0) types.push(`도면 ${subSum.drawings.length}건`)
    if (subSum.manuals.length > 0) types.push(`매뉴얼 ${subSum.manuals.length}건`)
    if (subSum.orders.length > 0) types.push(`발주 엑셀 ${subSum.orders.length}건`)
    if (subSum.designs.length > 0) types.push(`시안 ${subSum.designs.length}건`)
    if (subSum.images.length > 0) types.push(`이미지 ${subSum.images.length}건`)
    if (subSum.reports.length > 0) types.push(`결과보고서 ${subSum.reports.length}건`)

    lines.push(`${indent}└ ${sub} (${types.length > 0 ? types.join('·') : `파일 ${subSum.files.length}건`})`)

    if (depth < maxDepth - 1 && subSum.subDirs.length > 0) {
      const sublines = describeStructure(subDir, depth + 1, maxDepth)
      if (sublines) lines.push(sublines)
    }
  }
  return lines.join('\n')
}

const wb = XLSX.utils.book_new()

const venueDirs = fs.readdirSync(L1_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'desktop.ini')
  .map(d => d.name)
  .sort()

// ─────────────────────────────────────────────────────
// Sheet 1: 행사장별 요약 (메인)
// ─────────────────────────────────────────────────────
const summaryRows = [
  ['#', '행사장 (L1)', '폴더 파일 수', '기본 도면 영역', '진행 행사 (하위 폴더)', '도면 학습 자료 (파일명)', '코드 영역 학습 영역 = 정확 학습 내용', '비고'],
]

let idx = 1
for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const sum = summarizeFolder(venueDir)
  if (!sum) continue

  // 모든 파일 (재귀)
  const allFiles = []
  const walk = (d, depth = 0) => {
    if (depth > 4) return
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'desktop.ini') continue
      const fp = path.join(d, e.name)
      if (e.isDirectory()) walk(fp, depth + 1)
      else if (e.isFile()) allFiles.push({ name: e.name, rel: path.relative(venueDir, fp) })
    }
  }
  walk(venueDir)

  // 기본 도면 영역 = 도면 영역 파일 영역 있는지
  const drawingFiles = allFiles.filter(f =>
    /도면|평면|배치도|layout|floor/i.test(f.name) ||
    /\.dwg$|\.dxf$/i.test(f.name)
  )

  // 진행 행사 영역 = 하위 폴더 영역 영역 영역 (L2·L3)
  const eventFolders = []
  for (const sub of sum.subDirs) {
    const subDir = path.join(venueDir, sub)
    const subSum = summarizeFolder(subDir)
    if (!subSum) continue
    // L3 영역 영역 영역
    for (const subSub of subSum.subDirs) {
      eventFolders.push(`${sub}/${subSub}`)
    }
    if (subSum.subDirs.length === 0 && subSum.files.length > 0) {
      eventFolders.push(sub)
    }
  }

  // 코드 학습 영역 (정확 학습 내용)
  const learnedDesc = CODE_LEARNED[venueName] ?? '미학습 = 시드 영역 영역 영역 영역 추가 의무'

  summaryRows.push([
    idx++,
    venueName,
    allFiles.length,
    drawingFiles.length > 0 ? `${drawingFiles.length}건 = ${drawingFiles.slice(0, 3).map(f => f.name).join(', ')}${drawingFiles.length > 3 ? '...' : ''}` : '— (도면 영역 X)',
    eventFolders.length > 0 ? `${eventFolders.length}건 = ${eventFolders.slice(0, 3).join(', ')}${eventFolders.length > 3 ? '...' : ''}` : '—',
    drawingFiles.length > 0 ? drawingFiles.map(f => f.name).join(' / ') : '— (도면 학습 영역 X)',
    learnedDesc,
    `참고 폴더: ${venueDir.replace(L1_ROOT + '/', '')}`,
  ])
}

const sumWs = XLSX.utils.aoa_to_sheet(summaryRows)
sumWs['!cols'] = [{wch: 4}, {wch: 28}, {wch: 10}, {wch: 60}, {wch: 70}, {wch: 60}, {wch: 80}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, sumWs, '1. 30 행사장 요약')

// ─────────────────────────────────────────────────────
// Sheet 2+: 행사장별 상세 = 폴더 구조 + 파일 영역 정보
// 사용자 명시 = "폴더 안 어떤 파일 영역 어떤 정보 영역" 자세히
// ─────────────────────────────────────────────────────
for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const sum = summarizeFolder(venueDir)
  if (!sum) continue

  const detailRows = [
    ['L2 (하위 폴더)', 'L3 (행사 폴더)', '파일명', '분류', '추정 정보 영역'],
  ]

  for (const sub of sum.subDirs) {
    const subDir = path.join(venueDir, sub)
    const subSum = summarizeFolder(subDir)
    if (!subSum) continue

    // L2 직속 파일
    for (const f of subSum.files) {
      const cat = /도면|평면|배치도/i.test(f) ? '도면' :
                  /매뉴얼|시설|가이드/i.test(f) ? '매뉴얼·시설 가이드' :
                  /\.xlsx?$/i.test(f) ? '발주 엑셀' :
                  /\.jpg$|\.png$|\.jpeg$/i.test(f) ? '시안·이미지' :
                  /결과|보고서/i.test(f) ? '결과 보고서' : '기타'
      const info = cat === '도면' ? '행사장 평면도·배치도' :
                   cat === '매뉴얼·시설 가이드' ? '시설 규격·설치 가능 영역·리깅 영역' :
                   cat === '발주 엑셀' ? '환경장식물 영역 목록·수량·규격' :
                   cat === '시안·이미지' ? '실사 영역·시안 영역 디자인' :
                   cat === '결과 보고서' ? '완료 영역 결과 영역' : '—'
      detailRows.push([sub, '(직속)', f, cat, info])
    }

    // L3 영역
    for (const subSub of subSum.subDirs) {
      const subSubDir = path.join(subDir, subSub)
      const subSubSum = summarizeFolder(subSubDir)
      if (!subSubSum) continue
      for (const f of subSubSum.files) {
        const cat = /도면|평면|배치도/i.test(f) ? '도면' :
                    /매뉴얼|시설|가이드/i.test(f) ? '매뉴얼·시설 가이드' :
                    /\.xlsx?$/i.test(f) ? '발주 엑셀' :
                    /\.jpg$|\.png$|\.jpeg$/i.test(f) ? '시안·이미지' :
                    /결과|보고서/i.test(f) ? '결과 보고서' : '기타'

        // 사용자 명시 = 1 행사 = 여러 행사장 분리 영역 (예: APEC 251004 = ICC JEJU + 롯데호텔)
        const venueHint =
          /롯데|lotte/i.test(f) ? '롯데호텔 영역' :
          /icc|jeju|제주/i.test(f) ? 'ICC JEJU 영역' :
          /신라|shilla/i.test(f) ? '신라호텔 영역' :
          /그랜드.*하얏트|hyatt/i.test(f) ? '그랜드하얏트 영역' :
          /웨스틴|westin/i.test(f) ? '웨스틴조선 영역' :
          ''

        const info = (cat === '시안·이미지' ? '실사·시안 영역' : cat === '도면' ? '평면도' : cat === '발주 엑셀' ? '환경장식물 목록' : cat === '매뉴얼·시설 가이드' ? '시설 규격' : '—') + (venueHint ? ` [${venueHint}]` : '')

        detailRows.push([sub, subSub, f, cat, info])
      }
    }
  }

  if (detailRows.length === 1) continue
  const ws = XLSX.utils.aoa_to_sheet(detailRows)
  ws['!cols'] = [{wch: 28}, {wch: 36}, {wch: 50}, {wch: 18}, {wch: 50}]
  let sheetName = venueName.length > 28 ? venueName.slice(0, 28) : venueName
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
console.log('✓ 30 행사장 학습데이터 조사 엑셀 영역 작성 완료 (5/22 정합)')
console.log('  → ' + OUT_PATH)
console.log('  → ' + wb.SheetNames.length + ' 시트 (요약 + 행사장별 상세)')
