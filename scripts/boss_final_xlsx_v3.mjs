#!/usr/bin/env node
// 상사 요청 최종본 v3 (2026-05-19)
// 사용자 명시 = 파일별 학습 정보 자동 추출 + 경로 명시
//
// 구조:
//   시트 1: 학습 파일 상세 (long format·파일 1건 = 1행) — 자동 필터로 행사장·분류·카테고리별 검색
//   시트 2: 행사장 요약 (30 행) — 도면·행사·학습 파일·카테고리 분포 1줄
//   시트 3: 0. 읽는 법
//
// 학습 정보 자동 추출:
//   • 파일명 → 환경장식물 카테고리 (X배너·통천·세로·포디움·동선 등 12종)
//   • 파일명 → 크기 (mm × mm) 정규식 추출
//   • 파일 경로 = L1_행사장 이후 상대 경로

import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_상사요청_최종본_v3_260519.xlsx'

// 파일명 → 환경장식물 카테고리 매핑
const CATEGORY_PATTERNS = [
  { pat: /통천|행잉|천장배너|천정배너/, cat: '통천 배너' },
  { pat: /가로현수막|가로 현수막|실사출력|MOU/, cat: '가로 현수막' },
  { pat: /에스컬레이터|유리벽/, cat: '가로 현수막 (특수·유리벽)' },
  { pat: /난간드롭|난간배너|드롭배너/, cat: '세로 현수막 (난간·드롭)' },
  { pat: /기둥배너|원형기둥|사각기둥|로비기둥/, cat: '세로 현수막 (기둥)' },
  { pat: /세로현수막|세로 현수막|롤업/, cat: '세로 현수막' },
  { pat: /가로등배너|폴배너|폴대배너|빵빠레/, cat: '가로등 배너' },
  { pat: /엑스배너|X배너|x배너|스프링배너|롤업배너|배너스탠드|물통배너|A배너/, cat: 'X배너' },
  { pat: /아이배너|I배너|i배너/, cat: 'I배너' },
  { pat: /동선배너|유도사인|화살표|방향안내/, cat: '동선 배너' },
  { pat: /포디움|글자박스|연단/, cat: '포디움 타이틀' },
  { pat: /포토월|기념촬영|시상보드|웰컴보드|컨설팅폼보드|L보드/, cat: 'A3 가로 (보드)' },
  { pat: /피켓A3|피켓 A3|A3안내/, cat: 'A3 가로 (피켓)' },
  { pat: /피켓A4|피켓 A4|A4안내|웰컴피켓|영접A4|명패\b/, cat: 'A4 가로 (피켓·명패)' },
  { pat: /큐방|큐방시트/, cat: 'A4 가로 (큐방)' },
  { pat: /바톤|난간바톤/, cat: '세로 현수막 (바톤)' },
  { pat: /부스|아모레/, cat: 'X배너 (협력사 부스)' },
  { pat: /테이블배치도|배치도|좌석배치/, cat: '폼보드 (배치도)' },
  // 도면·평면·CAD
  { pat: /\.(dwg|dxf)$/i, cat: 'CAD 도면' },
  { pat: /도면|평면|배치|layout|floor|hall_|Hall_|배너걸이/i, cat: '행사장 도면·평면도' },
  // 안내·서류
  { pat: /매뉴얼|manual|가이드|시설|규격|임대|안내서류/, cat: '시설 가이드·매뉴얼' },
  { pat: /신청|신고|동의|허가|작업/, cat: '신청·신고 서류' },
]

function classifyByFileName(name) {
  const lower = name.replace(/\s/g, '').replace(/_/g, '')
  for (const p of CATEGORY_PATTERNS) {
    if (p.pat.test(lower)) return p.cat
  }
  if (/\.(ai|psd)$/i.test(name)) return '시안 (AI/PSD·분류 미상)'
  if (/\.(jpg|jpeg|png|webp)$/i.test(name)) return '실사·시안 이미지 (분류 미상)'
  if (/\.(xlsx?|csv)$/i.test(name)) return '발주·실측 엑셀'
  if (/\.pdf$/i.test(name)) return 'PDF 문서'
  if (/\.(doc|docx|hwp)$/i.test(name)) return '워드·한글 문서'
  return '기타'
}

// 파일명에서 크기 추출 (mm × mm)
function extractSize(name) {
  // 600x1800, 5000×900, 1500*2000 등
  const m = name.match(/(\d{3,5})\s*[x×*]\s*(\d{3,5})/)
  if (m) return `${m[1]} × ${m[2]} mm`
  return ''
}

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

// 행사장별 데이터 수집 (long format)
const allFiles = []  // 파일 1건 = 1 객체

const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()

for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)

  function pushFile(file, source, l2Hall, eventCode, eventName, area) {
    const category = classifyByFileName(file.name)
    const size = extractSize(file.name)
    allFiles.push({
      venue: venueName,
      source,            // 기본 도면 / 진행 행사 학습 / 안내·서류
      l2_hall: l2Hall || '',
      event_code: eventCode || '',
      event_name: eventName || '',
      area: area || '',
      file_name: file.name,
      learn_category: category,
      learn_size: size,
      rel_path: file.rel,
    })
  }

  function walkAll(dir, source, l2Hall, eventCode, eventName, area) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) {
        pushFile({ name: e.name, rel: relPath(fp) }, source, l2Hall, eventCode, eventName, area)
      } else if (e.isDirectory()) {
        walkAll(fp, source, l2Hall, eventCode, eventName, area)
      }
    }
  }

  function walkEvent(dir, folderName, parentName = null) {
    const parsed = parseEventFolderName(parentName || folderName)
    walkAll(dir, '진행 행사 학습', parsed.hall, parsed.code, parsed.name, parsed.area)
  }

  function walk(dir) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) continue
      if (!e.isDirectory()) continue
      const cls = classifyFolder(e.name)

      if (cls === 'drawing') {
        walkAll(fp, '기본 도면', '', '', '', '')
      } else if (cls === 'guide') {
        walkAll(fp, '안내·시설 가이드', '', '', '', '')
      } else if (cls === 'application') {
        walkAll(fp, '신청·제출 서류', '', '', '', '')
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
        walkAll(fp, '기본 도면', '', '', '', '')
      }
    }
  }

  // 직속 파일 = 기본 도면
  for (const e of safeReadDir(venueDir)) {
    const fp = path.join(venueDir, e.name)
    if (e.isFile()) pushFile({ name: e.name, rel: relPath(fp) }, '기본 도면', '', '', '', '')
  }
  walk(venueDir)
}

// ─── ExcelJS 작성 ───
const wb = new ExcelJS.Workbook()
wb.creator = 'AXDX팀'

// 시트 1: 행사장 요약 (30 행) — v2+v3 통합 (카운트 + 카테고리 분포 + 도면 파일명 + 행사명)
const wsSum = wb.addWorksheet('1. 행사장 요약')
wsSum.columns = [
  { header: '#',                       key: 'no',          width: 5  },
  { header: '행사장',                  key: 'venue',       width: 28 },
  { header: '기본 도면 수',            key: 'd_count',     width: 10 },
  { header: '진행 행사 수',            key: 'e_count',     width: 10 },
  { header: '학습 파일 수',            key: 'l_count',     width: 10 },
  { header: '안내·서류 수',            key: 'g_count',     width: 10 },
  { header: '기본 도면 파일명 (요약)',  key: 'd_files',     width: 50 },
  { header: '진행 행사명 (코드·면적)', key: 'e_names',     width: 55 },
  { header: '학습 카테고리 분포',      key: 'cat_dist',    width: 50 },
  { header: '발견 크기 종류 (mm)',     key: 'size_list',   width: 40 },
]

const venueGroups = {}
for (const f of allFiles) {
  if (!venueGroups[f.venue]) venueGroups[f.venue] = []
  venueGroups[f.venue].push(f)
}

let i = 0
for (const [venue, files] of Object.entries(venueGroups).sort((a, b) => a[0].localeCompare(b[0]))) {
  i++
  const drawCount = files.filter(f => f.source === '기본 도면').length
  const learnFiles = files.filter(f => f.source === '진행 행사 학습')
  const guideCount = files.filter(f => f.source === '안내·시설 가이드' || f.source === '신청·제출 서류').length
  const events = new Set(learnFiles.map(f => f.event_name).filter(Boolean))

  const catCounts = {}
  learnFiles.forEach(f => { catCounts[f.learn_category] = (catCounts[f.learn_category] ?? 0) + 1 })
  const catDist = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c} ${n}`)
    .join(' · ') || '—'

  const sizes = [...new Set(files.map(f => f.learn_size).filter(Boolean))].sort()
  const sizeList = sizes.length > 0 ? sizes.join(' / ') : '—'

  // 도면 파일명 (요약 — 최대 10건, 나머지는 +N건으로 축약)
  const drawFiles = files.filter(f => f.source === '기본 도면')
  const dFilesList = drawFiles.length === 0
    ? '—'
    : drawFiles.slice(0, 10).map(f => `• ${f.file_name}`).join('\n') +
      (drawFiles.length > 10 ? `\n  …외 ${drawFiles.length - 10}건 (시트 2 참조)` : '')

  // 진행 행사명 (코드·면적·L2 포함)
  const eventMetaMap = new Map()
  for (const f of learnFiles) {
    if (!f.event_name) continue
    if (!eventMetaMap.has(f.event_name)) {
      eventMetaMap.set(f.event_name, { code: f.event_code, area: f.area, hall: f.l2_hall, count: 0 })
    }
    eventMetaMap.get(f.event_name).count++
  }
  const eNamesList = eventMetaMap.size === 0
    ? '—'
    : [...eventMetaMap.entries()].map(([name, m]) => {
        const meta = [m.code, m.area].filter(Boolean).join(' · ')
        const hallLine = (m.hall && m.hall !== '(L2 미상)') ? `\n   └ L2: ${m.hall}` : ''
        return `• ${name}${meta ? ` (${meta})` : ''} — ${m.count}건${hallLine}`
      }).join('\n')

  const row = wsSum.addRow({
    no: i,
    venue,
    d_count: drawCount,
    e_count: events.size,
    l_count: learnFiles.length,
    g_count: guideCount,
    d_files: dFilesList,
    e_names: eNamesList,
    cat_dist: catDist,
    size_list: sizeList,
  })
  row.alignment = { vertical: 'top', wrapText: true }
  row.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('d_count').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('e_count').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('l_count').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('g_count').alignment = { horizontal: 'center', vertical: 'middle' }
  // 행 높이 = 가장 긴 컬럼 줄 수 × 16px
  const lines = Math.max(
    dFilesList.split('\n').length,
    eNamesList.split('\n').length,
    catDist.split(' · ').length,
    sizes.length,
    1
  )
  row.height = Math.min(Math.max(lines * 16, 30), 600)
}

wsSum.getRow(1).font = { bold: true, size: 11 }
wsSum.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsSum.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
wsSum.getRow(1).height = 30
wsSum.autoFilter = { from: 'A1', to: `J${i + 1}` }
wsSum.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

// 시트 2: 학습 파일 상세 (long format)
const wsDet = wb.addWorksheet('2. 학습 파일 상세')
wsDet.columns = [
  { header: '#',              key: 'no',     width: 6  },
  { header: '행사장',         key: 'venue',  width: 28 },
  { header: '분류',           key: 'source', width: 18 },
  { header: 'L2 홀',          key: 'l2',     width: 26 },
  { header: '행사 코드',      key: 'code',   width: 10 },
  { header: '행사명',         key: 'event',  width: 40 },
  { header: '면적',           key: 'area',   width: 10 },
  { header: '파일명',         key: 'fname',  width: 55 },
  { header: '학습 카테고리',  key: 'cat',    width: 28 },
  { header: '학습 크기',      key: 'size',   width: 18 },
  { header: '파일 경로 (L1 이후)', key: 'path', width: 90 },
]

// 정렬 (행사장 → 분류 → 행사 코드)
allFiles.sort((a, b) => {
  if (a.venue !== b.venue) return a.venue.localeCompare(b.venue)
  if (a.source !== b.source) return a.source.localeCompare(b.source)
  return (a.event_code || '').localeCompare(b.event_code || '')
})

allFiles.forEach((f, idx) => {
  const row = wsDet.addRow({
    no: idx + 1,
    venue: f.venue,
    source: f.source,
    l2: f.l2_hall,
    code: f.event_code,
    event: f.event_name,
    area: f.area,
    fname: f.file_name,
    cat: f.learn_category,
    size: f.learn_size || '—',
    path: f.rel_path,
  })
  row.alignment = { vertical: 'middle', wrapText: true }
  row.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('code').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('size').alignment = { horizontal: 'center', vertical: 'middle' }

  // 분류별 셀 배경 색상
  const srcCell = row.getCell('source')
  if (f.source === '기본 도면') {
    srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } } // 파랑
  } else if (f.source === '진행 행사 학습') {
    srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } } // 초록
  } else if (f.source === '안내·시설 가이드') {
    srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } } // 노랑
  } else if (f.source === '신청·제출 서류') {
    srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } } // 분홍
  }

  row.height = 22
})

wsDet.getRow(1).font = { bold: true, size: 11 }
wsDet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsDet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
wsDet.getRow(1).height = 30
wsDet.autoFilter = { from: 'A1', to: `K${allFiles.length + 1}` }
wsDet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

// 시트 0: 읽는 법
const wsM = wb.addWorksheet('0. 읽는 법')
wsM.columns = [
  { header: '항목', key: 'a', width: 30 },
  { header: '내용', key: 'b', width: 110 },
]
const metaData = [
  ['파일명', '학습데이터_상사요청_최종본_v3_260519.xlsx'],
  ['조사 일자', '2026-05-19'],
  ['소스 (SOT)', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'],
  ['', ''],
  ['시트 구성', ''],
  ['  시트 1', '행사장 요약 — 행사장 1행 = 도면·행사·학습 파일·서류 수 + 학습 카테고리 분포 + 발견 크기'],
  ['  시트 2', '학습 파일 상세 — 파일 1건 = 1행 (long format). 행사장·분류·카테고리·크기 자동 필터 가능'],
  ['', ''],
  ['상사 요청 매핑', ''],
  ['  ① 행사장', '시트 1·2 B열'],
  ['  ② 기본 도면', '시트 2 분류 = "기본 도면" 필터'],
  ['  ③ 진행 행사', '시트 2 분류 = "진행 행사 학습" 필터 + 행사명·L2 컬럼'],
  ['  ④ 어떤 정보 학습됐는지', '시트 2 학습 카테고리·학습 크기 컬럼 자동 추출 (파일명 패턴)'],
  ['  ⑤ 어디서 가져왔는지', '시트 2 파일 경로 컬럼 (L1_행사장 이후 상대 경로)'],
  ['', ''],
  ['자동 추출 카테고리', '통천·가로 현수막·세로 현수막 (난간·기둥)·X배너·I배너·가로등 배너·포디움·동선 배너·A3·A4·CAD 도면·시설 가이드 등 22 패턴'],
  ['크기 추출', '파일명에서 (\\d{3,5})[x×*](\\d{3,5}) 정규식 = "W × H mm" 표기'],
  ['분류 색상', '기본 도면=파랑·진행 행사 학습=초록·안내 가이드=노랑·신청 서류=분홍'],
  ['', ''],
  ['행사장 총 수', String(Object.keys(venueGroups).length)],
  ['전체 파일 수', String(allFiles.length)],
  ['  • 기본 도면', String(allFiles.filter(f => f.source === '기본 도면').length)],
  ['  • 진행 행사 학습', String(allFiles.filter(f => f.source === '진행 행사 학습').length)],
  ['  • 안내·시설 가이드', String(allFiles.filter(f => f.source === '안내·시설 가이드').length)],
  ['  • 신청·제출 서류', String(allFiles.filter(f => f.source === '신청·제출 서류').length)],
]
metaData.forEach(r => wsM.addRow(r))
wsM.getRow(1).font = { bold: true }
wsM.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsM.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
wsM.eachRow((row, num) => {
  row.alignment = { vertical: 'top', wrapText: true }
  if (num === 1) row.alignment.horizontal = 'center'
})

// 시트 순서: 0 → 1 → 2
wb.removeWorksheet(wb.worksheets.find(s => s.name === '0. 읽는 법').id)
const wsM2 = wb.addWorksheet('0. 읽는 법')
wsM2.columns = wsM.columns
metaData.forEach(r => wsM2.addRow(r))
wsM2.getRow(1).font = { bold: true }
wsM2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsM2.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
wsM2.eachRow((row, num) => {
  row.alignment = { vertical: 'top', wrapText: true }
  if (num === 1) row.alignment.horizontal = 'center'
})

// 시트 순서 정렬: 0. 읽는 법 → 1. 요약 → 2. 상세
const order = ['0. 읽는 법', '1. 행사장 요약', '2. 학습 파일 상세']
const sheetMap = new Map(wb.worksheets.map(s => [s.name, s]))
const ordered = order.map(n => sheetMap.get(n)).filter(Boolean)
wb.worksheets.length = 0
ordered.forEach((s, idx) => { s.orderNo = idx; wb._worksheets[idx + 1] = s; wb.worksheets.push(s) })

const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
await wb.xlsx.writeFile(OUT_PATH)

console.log('✓ v3 상사 요청 최종본 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 행사장 ' + Object.keys(venueGroups).length + '건 / 전체 파일 ' + allFiles.length + '건')
console.log('  → 도면 ' + allFiles.filter(f => f.source === '기본 도면').length + ' / 학습 ' + allFiles.filter(f => f.source === '진행 행사 학습').length + ' / 안내 ' + allFiles.filter(f => f.source === '안내·시설 가이드').length + ' / 서류 ' + allFiles.filter(f => f.source === '신청·제출 서류').length)
