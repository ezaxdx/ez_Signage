#!/usr/bin/env node
// 상사 요청 최종본 v5 (2026-05-19)
// 변경 (v4 → v5):
//   학습 내용 = 실제 환경장식물에 어떤 내용이 학습됐는지 풍부한 1문장
//     {카테고리} · {형식 + 학습 목적} · 규격: {WxH} · 설치 위치: {영역} · 출처: {행사장 · L2 · 행사명}

import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_상사요청_최종본_v5_260519.xlsx'

// 환경장식물 카테고리 패턴
const CATEGORY_PATTERNS = [
  { pat: /통천|행잉|천장배너|천정배너/, cat: '통천 배너' },
  { pat: /가로현수막|가로 현수막|실사출력|MOU/, cat: '가로 현수막' },
  { pat: /에스컬레이터|유리벽/, cat: '가로 현수막 (특수)' },
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
  { pat: /\.(dwg|dxf)$/i, cat: 'CAD 도면' },
  { pat: /도면|평면|배치|layout|floor|hall_|Hall_|배너걸이/i, cat: '행사장 도면·평면도' },
  { pat: /매뉴얼|manual|가이드|시설|규격|임대|안내서류/, cat: '시설 가이드·매뉴얼' },
  { pat: /신청|신고|동의|허가|작업/, cat: '신청·신고 서류' },
]

function classifyByFileName(name) {
  const lower = name.replace(/\s/g, '').replace(/_/g, '')
  for (const p of CATEGORY_PATTERNS) if (p.pat.test(lower)) return p.cat
  if (/\.(ai|psd)$/i.test(name)) return '시안 (분류 미상)'
  if (/\.(jpg|jpeg|png|webp)$/i.test(name)) return '실사·시안 이미지 (분류 미상)'
  if (/\.(xlsx?|csv)$/i.test(name)) return '발주·실측 엑셀'
  if (/\.pdf$/i.test(name)) return 'PDF 문서'
  if (/\.(doc|docx|hwp)$/i.test(name)) return '워드·한글 문서'
  return '기타'
}

// 파일 형식 (환경장식물 학습 가치 있는 라벨만·디자인 메타 제거)
function getFormatLabel(name) {
  if (/\.(dwg|dxf)$/i.test(name)) return 'CAD 원본 (평면·치수)'
  if (/\.(ai|psd)$/i.test(name)) return '시안 파일'
  if (/\.(xlsx?|csv)$/i.test(name)) return '발주 엑셀'
  if (/\.pdf$/i.test(name)) return 'PDF 문서'
  if (/\.(jpg|jpeg|png|webp)$/i.test(name)) return '실사 이미지'
  if (/\.(doc|docx|hwp)$/i.test(name)) return '워드·한글 문서'
  return '파일'
}

function extractSize(name) {
  const m = name.match(/(\d{3,5})\s*[x×*]\s*(\d{3,5})/)
  return m ? `${m[1]}×${m[2]}mm` : ''
}

const AREA_PATTERNS = [
  { pat: /외벽|outer|입구상단|입구 상단/, label: '외벽·입구 상단' },
  { pat: /원형기둥|사각기둥|기둥배너|로비기둥/, label: '기둥 (원형·사각)' },
  { pat: /천장|천정|행잉|상단/, label: '천장 (행잉)' },
  { pat: /로비/, label: '로비' },
  { pat: /게이트|gate/i, label: '게이트·외부 동선' },
  { pat: /동선|유도/, label: '동선 안내' },
  { pat: /에스컬레이터|계단|엘리베이터|유리벽/, label: '계단·에스컬레이터·유리벽' },
  { pat: /무대|단상|개막식/, label: '무대·단상' },
  { pat: /포토월|기념촬영|포토존/, label: '포토존' },
  { pat: /난간/, label: '난간' },
  { pat: /등록|데스크|환영/, label: '등록 데스크·환영 영역' },
  { pat: /테이블|좌석|배치도/, label: '좌석 배치' },
  { pat: /시상|어워드/, label: '시상 영역' },
  { pat: /부스|booth/i, label: '협력사 부스' },
  { pat: /외부광장|광장/, label: '광장·외부' },
  { pat: /연회|만찬/, label: '연회·만찬' },
  { pat: /공항|영접/, label: '공항·영접' },
  { pat: /웰컴/, label: '웰컴 영역' },
  { pat: /개회식/, label: '개회식' },
]

function extractArea(name) {
  for (const p of AREA_PATTERNS) if (p.pat.test(name)) return p.label
  return ''
}

// 학습된 구체 정보 = "이 파일에서 어떤 값을 뽑아왔는지" 자동 추출
function extractLearningValue(name) {
  const tokens = []

  // 시설 가이드·매뉴얼 PDF
  if (/매뉴얼|manual/i.test(name)) tokens.push('시설 운영 매뉴얼 (규격·금지 사항·연락처·D-N 일정)')
  if (/임대|rental/i.test(name)) tokens.push('임대 조건·운영팀 제출 서류')
  if (/리깅|rigging|행잉/i.test(name)) tokens.push('리깅·행잉 조건 (포인트 위치·하중 한계)')
  if (/하중|load/i.test(name)) tokens.push('하중 한계 (포인트당 최대 kg)')
  if (/방염|난연|fire/i.test(name)) tokens.push('방염·난연 인증 조건')
  if (/안전|소방|safety/i.test(name)) tokens.push('안전·소방 규격')
  if (/규격|spec\b/i.test(name)) tokens.push('표준 규격·치수')

  // 도면
  if (/평면|평면도|floor[\s_-]*plan/i.test(name)) tokens.push('행사장 평면 (좌표·동선·기둥·천장 그리드)')
  if (/배치|배치도|layout/i.test(name)) tokens.push('환경장식물 배치도 (위치·방향)')
  if (/배너걸이|행잉그리드|행잉 그리드/i.test(name)) tokens.push('배너걸이·행잉 그리드 위치')
  if (/(?:Hall_|홀_)[A-E]/i.test(name)) tokens.push('홀별 CAD 도면 (평면·치수)')
  if (/오디토리움|컨퍼런스|전시장|컨벤션홀|회의실/.test(name) && /\.(dwg|dxf|pdf|jpg|png)$/i.test(name)) {
    tokens.push('행사장 시설 평면도·치수')
  }
  if (/외벽/.test(name) && /\.(dwg|dxf|pdf|jpg|png)$/i.test(name)) tokens.push('외벽 부착 영역·치수')
  if (/하이브리드/.test(name)) tokens.push('하이브리드 행사장 평면·시설')

  // 발주 엑셀
  if (/발주|주문|order/i.test(name) && /\.(xlsx?|csv)$/i.test(name)) tokens.push('환경장식물 발주 리스트 (종류·수량·규격·위치·재질 표준)')
  if (/리스트|list/i.test(name) && /\.(xlsx?|csv)$/i.test(name)) tokens.push('제작물 리스트 (실제 발주 사례 학습)')
  if (/수량|quantity/i.test(name) && /\.(xlsx?|csv)$/i.test(name)) tokens.push('환경장식물 수량 표준')

  return tokens.join(' / ')
}

// 학습 내용 1문장 — 환경장식물 정보만 (출처는 파일 경로 컬럼 참조)
function buildLearningContent(f) {
  const parts = []

  // 1. 환경장식물 카테고리
  parts.push(f.learn_category)

  // 2. 파일 형식·학습 목적
  parts.push(getFormatLabel(f.file_name))

  // 3. 규격 (있을 때)
  const size = extractSize(f.file_name)
  if (size) parts.push(`규격: ${size}`)

  // 4. 설치 위치 (있을 때)
  const area = extractArea(f.file_name)
  if (area) parts.push(`설치 위치: ${area}`)

  // 5. 학습된 구체 값 (있을 때)
  const value = extractLearningValue(f.file_name)
  if (value) parts.push(`학습 값: ${value}`)

  return parts.join('  ·  ')
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
  if (codeM) return { hall: (codeM[1] ?? '').replace(/_/g, ' ').trim() || '(L2 미상)', code: codeM[2], name: codeM[3].trim(), area }
  return { hall: '(L2 미상)', code: '', name: s, area }
}
function isEventFolderName(name) {
  return /^(L2_|L3_|환경제작물학습_)/.test(name) || /\d{6}/.test(name)
}

const allFiles = []
const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()

for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)

  function pushFile(file, source, l2Hall, eventCode, eventName, area) {
    const entry = {
      venue: venueName, source, l2_hall: l2Hall || '', event_code: eventCode || '',
      event_name: eventName || '', area: area || '', file_name: file.name,
      learn_category: classifyByFileName(file.name), rel_path: file.rel,
    }
    entry.learn_content = buildLearningContent(entry)
    allFiles.push(entry)
  }

  function walkAll(dir, source, l2Hall, eventCode, eventName, area) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isFile()) pushFile({ name: e.name, rel: relPath(fp) }, source, l2Hall, eventCode, eventName, area)
      else if (e.isDirectory()) walkAll(fp, source, l2Hall, eventCode, eventName, area)
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
      if (cls === 'drawing') walkAll(fp, '기본 도면', '', '', '', '')
      else if (cls === 'guide') walkAll(fp, '안내·시설 가이드', '', '', '', '')
      else if (cls === 'application') continue  // 신청·신고 서류 = 환경장식물 학습 X (사용자 명시·5/19)
      else if (cls === 'project_root') {
        for (const sub of safeReadDir(fp)) {
          if (!sub.isDirectory()) continue
          const subPath = path.join(fp, sub.name)
          if (isEventFolderName(sub.name)) walkEvent(subPath, sub.name)
          else for (const sub2 of safeReadDir(subPath)) {
            if (sub2.isDirectory()) walkEvent(path.join(subPath, sub2.name), sub2.name, sub.name)
          }
        }
      } else if (cls === 'event') walkEvent(fp, e.name)
      else walkAll(fp, '기본 도면', '', '', '', '')
    }
  }

  for (const e of safeReadDir(venueDir)) {
    const fp = path.join(venueDir, e.name)
    if (e.isFile()) pushFile({ name: e.name, rel: relPath(fp) }, '기본 도면', '', '', '', '')
  }
  walk(venueDir)
}

// ─── ExcelJS 작성 ───
const wb = new ExcelJS.Workbook()
wb.creator = 'AXDX팀'

// 시트 0: 읽는 법
const wsM = wb.addWorksheet('0. 읽는 법')
wsM.columns = [{ header: '항목', key: 'a', width: 30 }, { header: '내용', key: 'b', width: 120 }]
const metaData = [
  ['파일명', '학습데이터_상사요청_최종본_v5_260519.xlsx'],
  ['조사 일자', '2026-05-19'],
  ['소스 (SOT)', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'],
  ['', ''],
  ['v4 → v5 변경', ''],
  ['  학습 내용 풍부화', '환경장식물 카테고리 + 형식·학습 목적 + 규격 + 설치 위치 + 출처(행사장·L2·행사명) 1문장'],
  ['', ''],
  ['학습 내용 예시', ''],
  ['  통천현수막.jpg', '통천 배너 · 실사 이미지 (설치 사례·시안 참고용) · 설치 위치: 천장 (행잉) · 출처: COEX · 그랜드볼룸,이셈볼룸 일대 · 제33차 아시아광고대회 (231004)'],
  ['  Hall_A-cad-2024년.dwg', 'CAD 도면 · CAD 원본 도면 (평면·치수·구조 분석용) · 출처: COEX'],
  ['  포디움타이틀_600x200.ai', '포디움 타이틀 · 디자인 시안 (Adobe 원본·디자인 표준화 학습용) · 규격: 600×200mm · 설치 위치: 무대·단상 · 출처: [행사명]'],
  ['  발주서_2023웹툰잡페스타.xlsx', '발주·실측 엑셀 · 발주 엑셀 (환경장식물 수량·규격·위치 표준 학습용) · 출처: COEX'],
  ['', ''],
  ['시트 구성', ''],
  ['  시트 1', '행사장 요약 — 행사장 1행 = 카운트·도면 파일명·행사명·학습 카테고리 분포'],
  ['  시트 2', '학습 파일 상세 (long format) — 파일 1건 = 1행 + 풍부한 학습 내용'],
  ['', ''],
  ['상사 요청 매핑', ''],
  ['  ① 행사장', 'B열'],
  ['  ② 기본 도면', '분류 = "기본 도면" 필터'],
  ['  ③ 진행 행사', '분류 = "진행 행사 학습" 필터 + 행사명·L2 컬럼'],
  ['  ④ 어떤 정보 학습됐는지', '학습 내용 컬럼 (환경장식물 카테고리 + 형식·목적 + 규격 + 설치 위치 + 출처)'],
  ['  ⑤ 어디서 가져왔는지', '파일 경로 컬럼 (L1_행사장 이후)'],
  ['', ''],
  ['행사장 총 수', String(venueDirs.length)],
  ['전체 학습 파일 수', String(allFiles.length)],
  ['  • 기본 도면 (행사장 평면·치수·구조)', String(allFiles.filter(f => f.source === '기본 도면').length)],
  ['  • 진행 행사 학습 (시안·실사·발주 엑셀)', String(allFiles.filter(f => f.source === '진행 행사 학습').length)],
  ['  • 안내·시설 가이드 (매뉴얼·규격·연락처)', String(allFiles.filter(f => f.source === '안내·시설 가이드').length)],
  ['', ''],
  ['제외 항목 (학습 X)', '신청·신고 서류·홀매니저 제출서류 등 행정 자료 = 환경장식물 학습 가치 0 (사용자 명시·5/19)'],
]
metaData.forEach(r => wsM.addRow(r))
wsM.getRow(1).font = { bold: true }
wsM.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsM.eachRow((row, num) => {
  row.alignment = { vertical: 'top', wrapText: true }
  if (num === 1) row.alignment = { vertical: 'middle', horizontal: 'center' }
})

// 시트 1: 행사장 요약
const wsSum = wb.addWorksheet('1. 행사장 요약')
wsSum.columns = [
  { header: '#', key: 'no', width: 5 },
  { header: '행사장', key: 'venue', width: 28 },
  { header: '기본 도면 수', key: 'd_count', width: 10 },
  { header: '진행 행사 수', key: 'e_count', width: 10 },
  { header: '학습 파일 수', key: 'l_count', width: 10 },
  { header: '안내·서류 수', key: 'g_count', width: 10 },
  { header: '기본 도면 파일명 (요약)', key: 'd_files', width: 50 },
  { header: '진행 행사명 (코드·면적·L2)', key: 'e_names', width: 55 },
  { header: '학습 카테고리 분포', key: 'cat_dist', width: 50 },
  { header: '설치 위치 분포', key: 'area_dist', width: 50 },
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
  const catDist = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c} ${n}`).join(' · ') || '—'

  const areaCounts = {}
  files.forEach(f => {
    const a = extractArea(f.file_name)
    if (a) areaCounts[a] = (areaCounts[a] ?? 0) + 1
  })
  const areaDist = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])
    .map(([a, n]) => `${a} ${n}`).join(' · ') || '—'

  const drawFiles = files.filter(f => f.source === '기본 도면')
  const dFilesList = drawFiles.length === 0 ? '—'
    : drawFiles.slice(0, 10).map(f => `• ${f.file_name}`).join('\n') +
      (drawFiles.length > 10 ? `\n  …외 ${drawFiles.length - 10}건 (시트 2 참조)` : '')

  const eventMetaMap = new Map()
  for (const f of learnFiles) {
    if (!f.event_name) continue
    if (!eventMetaMap.has(f.event_name)) eventMetaMap.set(f.event_name, { code: f.event_code, area: f.area, hall: f.l2_hall, count: 0 })
    eventMetaMap.get(f.event_name).count++
  }
  const eNamesList = eventMetaMap.size === 0 ? '—'
    : [...eventMetaMap.entries()].map(([name, m]) => {
        const meta = [m.code, m.area].filter(Boolean).join(' · ')
        const hallLine = (m.hall && m.hall !== '(L2 미상)') ? `\n   └ L2: ${m.hall}` : ''
        return `• ${name}${meta ? ` (${meta})` : ''} — ${m.count}건${hallLine}`
      }).join('\n')

  const row = wsSum.addRow({
    no: i, venue,
    d_count: drawCount, e_count: events.size, l_count: learnFiles.length, g_count: guideCount,
    d_files: dFilesList, e_names: eNamesList,
    cat_dist: catDist, area_dist: areaDist,
  })
  row.alignment = { vertical: 'top', wrapText: true }
  ;['no', 'd_count', 'e_count', 'l_count', 'g_count'].forEach(k =>
    row.getCell(k).alignment = { horizontal: 'center', vertical: 'middle' }
  )
  const lines = Math.max(dFilesList.split('\n').length, eNamesList.split('\n').length,
    catDist.split(' · ').length, areaDist.split(' · ').length, 1)
  row.height = Math.min(Math.max(lines * 16, 30), 600)
}

wsSum.getRow(1).font = { bold: true, size: 11 }
wsSum.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsSum.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
wsSum.getRow(1).height = 30
wsSum.autoFilter = { from: 'A1', to: `J${i + 1}` }
wsSum.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

// 시트 2: 학습 파일 상세
const wsDet = wb.addWorksheet('2. 학습 파일 상세')
wsDet.columns = [
  { header: '#', key: 'no', width: 6 },
  { header: '행사장', key: 'venue', width: 26 },
  { header: '분류', key: 'source', width: 16 },
  { header: 'L2 홀', key: 'l2', width: 22 },
  { header: '행사 코드', key: 'code', width: 10 },
  { header: '행사명', key: 'event', width: 35 },
  { header: '면적', key: 'area', width: 10 },
  { header: '파일명', key: 'fname', width: 50 },
  { header: '학습 카테고리', key: 'cat', width: 28 },
  { header: '학습 내용 (환경장식물 정보)', key: 'content', width: 95 },
  { header: '파일 경로 (L1 이후)', key: 'path', width: 80 },
]

allFiles.sort((a, b) => {
  if (a.venue !== b.venue) return a.venue.localeCompare(b.venue)
  if (a.source !== b.source) return a.source.localeCompare(b.source)
  return (a.event_code || '').localeCompare(b.event_code || '')
})

allFiles.forEach((f, idx) => {
  const row = wsDet.addRow({
    no: idx + 1, venue: f.venue, source: f.source, l2: f.l2_hall, code: f.event_code,
    event: f.event_name, area: f.area, fname: f.file_name,
    cat: f.learn_category, content: f.learn_content, path: f.rel_path,
  })
  row.alignment = { vertical: 'middle', wrapText: true }
  row.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('code').alignment = { horizontal: 'center', vertical: 'middle' }
  row.getCell('content').alignment = { vertical: 'middle', wrapText: true }

  const srcCell = row.getCell('source')
  if (f.source === '기본 도면') srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
  else if (f.source === '진행 행사 학습') srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  else if (f.source === '안내·시설 가이드') srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } }
  else if (f.source === '신청·제출 서류') srcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }

  // 학습 내용이 길어서 줄바꿈 발생 시 행 높이 자동
  const contentLines = Math.ceil(f.learn_content.length / 100) || 1
  row.height = Math.min(Math.max(contentLines * 18, 24), 80)
})

wsDet.getRow(1).font = { bold: true, size: 11 }
wsDet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
wsDet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
wsDet.getRow(1).height = 30
wsDet.autoFilter = { from: 'A1', to: `K${allFiles.length + 1}` }
wsDet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
await wb.xlsx.writeFile(OUT_PATH)

console.log('✓ v5 상사 요청 최종본 작성 완료 (학습 내용 = 환경장식물 정보 풍부화)')
console.log('  → ' + OUT_PATH)
console.log('  → 행사장 ' + venueDirs.length + '건 / 전체 파일 ' + allFiles.length + '건')
