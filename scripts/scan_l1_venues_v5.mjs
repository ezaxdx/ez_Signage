#!/usr/bin/env node
// v5 (2026-05-19) — G드라이브 SOT 기준 정정판
// 변경 (v4 → v5):
//   1. 행사 폴더 패턴 정확 파싱 = (L2_|L3_|환경제작물학습_)?[홀명]_[6자리 코드] [행사명] (면적)
//   2. 도면 폴더 분리 (도면·_기본도면·회의실 도면) → 시트 2
//   3. 행사장 안내·제출 서류 폴더 별도 분류 → 시트 6 (신규)
//   4. "프로젝트 학습" 폴더 안 L2_/L3_/환경제작물학습_ = 진짜 행사 폴더
//   5. 행사명·홀명·행사 코드 컬럼 분리 (가독성 ↑)

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_L1행사장_조사_v6_260519.xlsx'

// 코드 시드 매핑 (v4 유지)
const FOLDER_TO_CODE = {
  'BEXCO':                   { venue: 'BEXCO',                 guide_keys: [],                                                        priority: 1 },
  'CECO':                    { venue: 'CECO',                  guide_keys: [],                                                        priority: 2 },
  'COEX':                    { venue: '코엑스',                guide_keys: ['coex','coex_grandballroom','coex_asembballroom','coex_d_hall','coex_conference_hall'], priority: 0 },
  'DCC':                     { venue: 'DCC',                   guide_keys: [],                                                        priority: 2 },
  'DDP':                     { venue: 'DDP',                   guide_keys: ['ddp_arthall_1'],                                         priority: 0 },
  'EXCO':                    { venue: 'EXCO',                  guide_keys: [],                                                        priority: 1 },
  'GSCO':                    { venue: 'GSCO',                  guide_keys: [],                                                        priority: 1 },
  'GUMICO':                  { venue: 'GUMICO',                guide_keys: [],                                                        priority: 3 },
  'HICO':                    { venue: 'HICO',                  guide_keys: [],                                                        priority: 2 },
  'ICC 제주':                { venue: 'ICC JEJU',              guide_keys: ['icc_jeju'],                                              priority: 0 },
  'KINTEX':                  { venue: '킨텍스',                guide_keys: ['kintex_1_hall_5','kintex_1_hall_1_to_4','kintex_2_hall_6_to_10'], priority: 0 },
  'KSPO DOME':               { venue: 'KSPO DOME',             guide_keys: [],                                                        priority: 2 },
  'SETEC':                   { venue: 'SETEC',                 guide_keys: [],                                                        priority: 2 },
  'THE_SHILLA':              { venue: 'THE_SHILLA',            guide_keys: [],                                                        priority: 1 },
  'UECO':                    { venue: 'UECO',                  guide_keys: [],                                                        priority: 3 },
  '그랜드하얏트서울':        { venue: '그랜드하얏트 서울',     guide_keys: ['grand_hyatt_seoul'],                                     priority: 0 },
  '김대중컨벤션센터':        { venue: '광주 김대중컨벤션센터', guide_keys: [],                                                        priority: 1 },
  '더 플라자 호텔 서울':     { venue: '더플라자 호텔 서울',    guide_keys: ['plaza_hotel_seoul'],                                     priority: 0 },
  '라한호텔  라한셀렉트':    { venue: '라한호텔',              guide_keys: [],                                                        priority: 3 },
  '롯데호텔 서울':           { venue: '롯데호텔 서울',         guide_keys: ['lotte_hotel_seoul'],                                     priority: 0 },
  '소노캄 모음':             { venue: '소노캄',                guide_keys: [],                                                        priority: 3 },
  '송도컨벤시아':            { venue: '송도컨벤시아',          guide_keys: ['songdo_convensia'],                                      priority: 0 },
  '수원컨벤션센터':          { venue: '수원컨벤션센터',        guide_keys: [],                                                        priority: 2 },
  '시그니엘 서울':           { venue: '시그니엘',              guide_keys: [],                                                        priority: 2 },
  '안동국제컨벤션센터':      { venue: '안동컨벤션',            guide_keys: [],                                                        priority: 3 },
  '여수엑스포컨벤션센터':    { venue: '여수엑스포',            guide_keys: [],                                                        priority: 2 },
  '정부세종컨벤션센터':      { venue: '정부세종컨벤션',        guide_keys: [],                                                        priority: 2 },
  '제주신라호텔':            { venue: '제주신라',              guide_keys: [],                                                        priority: 2 },
  '조선팰리스 강남(그랜드인터콘티넨탈 파르나스)': { venue: '조선팰리스', guide_keys: [],                                              priority: 2 },
}

const HALL_REGISTERED = { '코엑스': 10, '킨텍스': 10, 'DDP': 5 }

// 폴더 분류
function classifyFolder(name) {
  if (/^(_기본도면|도면|회의실 도면)$/.test(name)) return 'drawing'
  if (/안내서류|시설가이드|임대자료|매뉴얼/.test(name)) return 'guide'
  if (/제출서류|신청서|신고서/.test(name)) return 'application'
  if (/^(프로젝트 학습|학습자료)$/.test(name)) return 'project_root'
  // 행사 폴더 패턴: L2_·L3_·환경제작물학습_ 또는 6자리 코드 포함
  if (/^(L2_|L3_|환경제작물학습_)/.test(name) || /_\d{6}[_\s]/.test(name) || /\d{6}[_\s]/.test(name)) return 'event'
  return 'other'
}

// 행사 폴더명 파싱: [접두사]_[홀명]_[6자리 코드][_| ][행사명] [(면적)]
function parseEventFolderName(name) {
  let s = name.replace(/^(L2_|L3_|환경제작물학습_)/, '')
  // 면적 추출
  let area = ''
  const areaM = s.match(/\s*\(([\d,]+㎡)\)\s*$/)
  if (areaM) { area = areaM[1]; s = s.replace(areaM[0], '').trim() }
  // 6자리 코드 위치 (홀명 optional — 환경제작물학습_ 같이 홀명 없는 케이스도 매칭)
  const codeM = s.match(/^(?:(.*?)[_\s]+)?(\d{6})[_\s]+(.+)$/)
  if (codeM) {
    const hall = (codeM[1] ?? '').replace(/_/g, ' ').trim() || '(L2 미상)'
    const code = codeM[2]
    const evName = codeM[3].trim()
    return { hall, code, name: evName, area }
  }
  // 6자리 코드 없는 경우 = 그대로
  return { hall: '(L2 미상)', code: '', name: s, area }
}

function classifyFile(name) {
  if (/\.(dwg|dxf)$/i.test(name)) return 'CAD 도면'
  if (/도면|평면|배치도|layout|floor/i.test(name)) return '도면'
  if (/매뉴얼|manual|가이드|시설|규격|임대/i.test(name)) return '매뉴얼·시설가이드'
  if (/\.(xlsx?|csv)$/i.test(name)) return '발주·실측 엑셀'
  if (/\.(ai|psd)$/i.test(name)) return '시안 (AI/PSD)'
  if (/\.(jpg|jpeg|png|webp)$/i.test(name)) return '이미지·실사'
  if (/결과|보고서|report/i.test(name)) return '결과 보고서'
  if (/\.pdf$/i.test(name)) return 'PDF 문서'
  if (/\.(doc|docx|hwp)$/i.test(name)) return '워드·한글 문서'
  if (/신청|신고|동의서|허가|작업/i.test(name)) return '신청·신고 서류'
  return '기타'
}

function safeReadDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== 'desktop.ini' && !e.name.startsWith('__MACOSX') && !e.name.startsWith('.')) }
  catch { return [] }
}

function relPath(absPath) {
  return path.relative(L1_ROOT, absPath).replace(/\\/g, '/')
}

const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()
const wb = XLSX.utils.book_new()

// 데이터 컨테이너
const drawRows = [['#', '행사장', '소스 폴더', '파일명', '분류', '파일 경로 (L1 이후)']]
const evRows = [['#', '행사장', 'L2 홀명', '행사 코드', '진행 행사명', '면적', '학습 파일명', '분류', '파일 경로 (L1 이후)']]
const guideRows = [['#', '행사장', '카테고리', '파일명', '분류', '파일 경로 (L1 이후)']]
const summaryRows = [[
  '#', '행사장 (L1 폴더명)',
  '도면 파일 수', '진행 행사 수', '학습 파일 수', '안내·서류 파일 수',
  '코드 매핑 키', '시설 가이드 등록', 'L2 홀 등록 수 (코드)',
  '갭 우선순위',
]]
const matchRows = [[
  '#', '행사장 (L1 폴더명)',
  'VENUE_LIST 등록', '매핑된 VENUE_LIST 키',
  '시설 가이드 등록', '시설 가이드 키',
  'L2 홀 등록 (코드)',
  '갭 종류', '갭 작업 내용',
]]
const gapRows = [['#', '행사장', '우선순위', '도면 보유', '진행 행사 수', '학습 파일 수', '권장 시드 작업']]
let dIdx = 1, eIdx = 1, gIdx = 1, sIdx = 1, mIdx = 1, gapIdx = 1

// 폴더 walker — 분류별 누적
function walkAndCollect(dir, venueName, depth, ctx) {
  for (const e of safeReadDir(dir)) {
    const fp = path.join(dir, e.name)
    if (e.isFile()) {
      ctx.lastFiles.push({ name: e.name, abs: fp, rel: relPath(fp) })
      continue
    }
    if (!e.isDirectory()) continue
    const cls = classifyFolder(e.name)
    if (cls === 'drawing') {
      // 도면 폴더 안의 모든 파일 = 시트 2
      walkDrawing(fp, venueName, e.name, ctx)
    } else if (cls === 'guide' || cls === 'application') {
      walkGuide(fp, venueName, e.name, cls === 'guide' ? '안내·시설 가이드' : '신청·제출 서류', ctx)
    } else if (cls === 'project_root') {
      // 프로젝트 학습 폴더 안의 각 폴더 = 행사 폴더 또는 L2_/L3_
      for (const sub of safeReadDir(fp)) {
        if (!sub.isDirectory()) continue
        const subPath = path.join(fp, sub.name)
        const subCls = classifyFolder(sub.name)
        if (subCls === 'event') {
          walkEvent(subPath, venueName, sub.name, ctx)
        } else {
          // 한 단계 더 (L3_ 안에 행사 폴더)
          for (const sub2 of safeReadDir(subPath)) {
            if (!sub2.isDirectory()) continue
            const sub2Path = path.join(subPath, sub2.name)
            walkEvent(sub2Path, venueName, sub2.name, ctx, sub.name)
          }
        }
      }
    } else if (cls === 'event') {
      walkEvent(fp, venueName, e.name, ctx)
    } else {
      // 알 수 없는 폴더 = 도면으로 분류 (안전)
      walkDrawing(fp, venueName, e.name, ctx)
    }
  }
}

function walkDrawing(dir, venueName, sourceFolderName, ctx) {
  const walk = (d) => {
    for (const e of safeReadDir(d)) {
      const fp = path.join(d, e.name)
      if (e.isFile()) {
        drawRows.push([dIdx++, venueName, sourceFolderName, e.name, classifyFile(e.name), relPath(fp)])
        ctx.drawCount++
      } else if (e.isDirectory()) walk(fp)
    }
  }
  walk(dir)
}

function walkGuide(dir, venueName, sourceFolderName, category, ctx) {
  const walk = (d) => {
    for (const e of safeReadDir(d)) {
      const fp = path.join(d, e.name)
      if (e.isFile()) {
        guideRows.push([1, venueName, category + ' (' + sourceFolderName + ')', e.name, classifyFile(e.name), relPath(fp)])
        ctx.guideCount++
      } else if (e.isDirectory()) walk(fp)
    }
  }
  walk(dir)
}

function walkEvent(dir, venueName, folderName, ctx, parentL3 = null) {
  // folderName 또는 parentL3에서 행사명 파싱
  const parsed = parseEventFolderName(parentL3 || folderName)
  const allFiles = []
  const walk = (d) => {
    for (const e of safeReadDir(d)) {
      const fp = path.join(d, e.name)
      if (e.isFile()) allFiles.push({ name: e.name, abs: fp })
      else if (e.isDirectory()) walk(fp)
    }
  }
  walk(dir)
  ctx.eventSet.add(parsed.name)
  for (const f of allFiles) {
    evRows.push([
      eIdx++, venueName,
      parsed.hall, parsed.code, parsed.name, parsed.area,
      f.name, classifyFile(f.name), relPath(f.abs),
    ])
    ctx.learnCount++
  }
}

// 행사장 순회
for (const venueName of venueDirs) {
  const venueDir = path.join(L1_ROOT, venueName)
  const ctx = {
    lastFiles: [],
    drawCount: 0, learnCount: 0, guideCount: 0,
    eventSet: new Set(),
  }

  // 직속 파일 = 도면으로 처리 (G드라이브 = COEX·KINTEX 등 직속에 도면 다수)
  for (const e of safeReadDir(venueDir)) {
    const fp = path.join(venueDir, e.name)
    if (e.isFile()) {
      drawRows.push([dIdx++, venueName, '(행사장 직속)', e.name, classifyFile(e.name), relPath(fp)])
      ctx.drawCount++
    }
  }

  walkAndCollect(venueDir, venueName, 0, ctx)

  // 요약 1행
  const code = FOLDER_TO_CODE[venueName] ?? { venue: '— (미매핑)', guide_keys: [], priority: 9 }
  const hallCount = HALL_REGISTERED[code.venue] ?? 0
  const guideLabel = code.guide_keys.length > 0 ? `O (${code.guide_keys.length}건)` : 'X (미등록)'
  const priorityLabel = code.priority === 0 ? '— (등록 완료)'
                      : code.priority === 1 ? '1순위 (대형)'
                      : code.priority === 2 ? '2순위 (중형)'
                      : code.priority === 3 ? '3순위 (소형·후순위)'
                      : '— (매핑 확인)'

  summaryRows.push([
    sIdx++, venueName,
    ctx.drawCount, ctx.eventSet.size, ctx.learnCount, ctx.guideCount,
    code.venue, guideLabel, hallCount, priorityLabel,
  ])

  // 정합 매트릭스 1행
  const venueOk = code.venue !== '— (미매핑)' ? 'O' : 'X'
  const guideOk = code.guide_keys.length > 0 ? 'O' : 'X'
  const gapType = []
  const gapWork = []
  if (guideOk === 'X') {
    gapType.push('시설 가이드 누락')
    gapWork.push(`VENUE_FACILITY_GUIDE_SEED에 ${code.venue} 시드 추가`)
  }
  if (hallCount === 0 && ctx.eventSet.size > 0) {
    gapType.push('L2 홀 등록 없음')
    gapWork.push(`VENUE_HALLS에 ${code.venue} 하위 홀 등록`)
  }
  if (gapType.length === 0) gapType.push('— (정합 OK)')
  if (gapWork.length === 0) gapWork.push('—')

  matchRows.push([
    mIdx++, venueName, venueOk, code.venue, guideOk,
    code.guide_keys.join(', ') || '—',
    hallCount,
    gapType.join(' / '),
    gapWork.join(' / '),
  ])

  // 갭 (시설 가이드 미등록만)
  if (code.guide_keys.length === 0) {
    gapRows.push([
      gapIdx++, venueName,
      code.priority === 1 ? '1순위 (대형)' :
      code.priority === 2 ? '2순위 (중형)' :
      code.priority === 3 ? '3순위 (소형)' : '— 매핑 확인',
      ctx.drawCount > 0 ? 'O' : 'X',
      ctx.eventSet.size, ctx.learnCount,
      `VENUE_FACILITY_GUIDE_SEED에 ${code.venue} 시드 추가 (외벽·세로·포디움 기본 + 운영팀 연락처)`
    ])
  }
}

// guideRows의 # 컬럼 다시 번호 매김
for (let i = 1; i < guideRows.length; i++) guideRows[i][0] = i

// ─── 시트 작성 ───
function addSheet(name, rows, colWidths, autoFilterRange) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  if (autoFilterRange) ws['!autofilter'] = { ref: autoFilterRange }
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws, name)
}

const metaRows = [
  ['항목', '내용'],
  ['조사 일자', '2026-05-19 (v5)'],
  ['조사 폴더 (SOT)', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'],
  ['파일 경로 표기', 'L1_행사장 이후 상대 경로 (사용자 명시)'],
  ['', ''],
  ['시트 1', '30 행사장 요약 — 한 줄 = 한 행사장 (도면·행사·학습 파일·서류 수 + 코드 등록 + 갭 우선순위)'],
  ['시트 2', '기본 도면 — 도면·CAD 파일 1건 = 1행 (행사장·소스 폴더 필터 가능)'],
  ['시트 3', '진행 행사·학습 파일 — 행사명 / L2 홀명 / 행사 코드 / 면적 분리 컬럼'],
  ['시트 4', '안내·신청 서류 — 센터·전시장 안내서류·임대자료·신청서·신고서 등'],
  ['시트 5', '코드 시드 정합 — 행사장 × (VENUE_LIST·시설 가이드·VENUE_HALLS) 매핑 + 갭'],
  ['시트 6', '갭 우선순위 — 시설 가이드 미등록 행사장만 (작업 후보 표)'],
  ['', ''],
  ['행사 폴더 파싱 규칙', '(L2_|L3_|환경제작물학습_)?[홀명]_[6자리 코드][_| ][행사명] [(면적)]'],
  ['도면 폴더 식별', '_기본도면 / 도면 / 회의실 도면 / 행사장 직속 이미지'],
  ['안내·서류 폴더 식별', '센터(전시장) 안내서류·임대자료·매뉴얼 / 센터(전시장) 제출서류·신청서·신고서'],
  ['', ''],
  ['우선순위 기준', '1순위 = 대형 컨벤션·전시장 (BEXCO·EXCO·GSCO·김대중·THE_SHILLA)'],
  ['', '2순위 = 중형 컨벤션·호텔 (CECO·DCC·HICO·KSPO DOME·SETEC·여수·정부세종·시그니엘·제주신라·조선팰리스·수원)'],
  ['', '3순위 = 소형·후순위 (GUMICO·UECO·라한·소노캄·안동)'],
  ['', ''],
  ['VENUE_LIST 현재', 'lib/venueIntel.ts 38건 (30 행사장 모두 매핑 가능)'],
  ['VENUE_FACILITY_GUIDE_SEED 현재', 'lib/data/venueFacilityGuide.ts 19건 (킨텍스 3·코엑스 5·송도·ICC·DDP·롯데·하얏트·웨스틴·플라자·광화문·aT·평창)'],
  ['VENUE_HALLS 현재', 'lib/venueIntel.ts 25건 (COEX 10·KINTEX 10·DDP 5)'],
]
addSheet('0. 읽는 법', metaRows, [32, 110])
addSheet('1. 30행사장 요약', summaryRows, [4, 32, 10, 10, 10, 12, 22, 14, 12, 18], `A1:J${summaryRows.length}`)
addSheet('2. 기본 도면', drawRows, [4, 32, 28, 50, 18, 80], `A1:F${drawRows.length}`)
addSheet('3. 진행 행사·학습 파일', evRows, [4, 32, 30, 10, 40, 10, 60, 18, 100], `A1:I${evRows.length}`)
addSheet('4. 안내·신청 서류', guideRows, [4, 32, 35, 50, 18, 80], `A1:F${guideRows.length}`)
addSheet('5. 코드 시드 정합', matchRows, [4, 32, 14, 24, 14, 50, 14, 24, 60], `A1:I${matchRows.length}`)
addSheet('6. 갭 우선순위', gapRows, [4, 32, 18, 10, 12, 12, 80], `A1:G${gapRows.length}`)

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)

console.log('✓ v5 학습데이터 L1 행사장 조사 엑셀 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 시트 ' + wb.SheetNames.length + '건')
console.log('  → 행사장 ' + (summaryRows.length - 1) + ' / 도면 ' + (drawRows.length - 1) + ' / 행사·학습 ' + (evRows.length - 1) + ' / 안내·서류 ' + (guideRows.length - 1) + ' / 갭 ' + (gapRows.length - 1))
