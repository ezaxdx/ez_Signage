#!/usr/bin/env node
// v3 (2026-05-19) — 사용자 명시 "보기 어렵다·정합 강화" 개선판
// 변경 사항 (v2 → v3):
//   1. 시트 5건 분리 = 요약 / 기본 도면 / 진행 행사·학습 파일 / 코드 시드 정합 / 갭 우선순위
//   2. 한 행 = 한 의미 (셀 줄바꿈 X·필터 적용 가능)
//   3. 파일 경로 = L1_행사장 이후만 (사용자 명시)
//   4. 코드 시드 (VENUE_LIST·VENUE_HALLS·VENUE_FACILITY_GUIDE_SEED) 정합 매트릭스
//   5. 갭 = 시설 가이드 미등록 행사장 우선순위 표

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_L1행사장_조사_v4_260519.xlsx'

// 코드 등록 행사장 (lib/venueIntel.ts VENUE_LIST 38건 발췌·displayName 기준)
const VENUE_LIST_KEYS = [
  '코엑스', '킨텍스', '송도컨벤시아', 'ICC JEJU', '제주국제컨벤션센터',
  '광주 김대중컨벤션센터', 'aT센터',
  '롯데호텔 서울', '그랜드하얏트 서울', '더플라자 호텔 서울', '웨스틴 조선 서울',
  '국립중앙박물관', '동대문디자인플라자', 'DDP', '광화문 광장', '서울스퀘어',
  '경남도청 대회의실', '경주', '광주비엔날레전시관', '평창올림픽스타디움', '오스코',
  '벡스코', 'BEXCO', 'BPEX 부산', '누리마루 APEC하우스',
  'CECO', 'DCC', 'EXCO', 'GSCO', 'GUMICO', 'HICO',
  'KSPO DOME', 'SETEC', 'THE_SHILLA', '신라호텔', 'UECO',
  '라한호텔', '소노캄', '수원컨벤션센터', '시그니엘', '안동컨벤션',
  '여수엑스포', '정부세종컨벤션', '제주신라', '조선팰리스',
]

// 코드 등록 시설 가이드 (lib/data/venueFacilityGuide.ts VENUE_FACILITY_GUIDE_SEED 19건)
const FACILITY_GUIDE_KEYS = [
  'kintex_1_hall_5', 'kintex_1_hall_1_to_4', 'kintex_2_hall_6_to_10',
  'coex_grandballroom', 'coex_asembballroom', 'coex_d_hall', 'coex_conference_hall', 'coex',
  'songdo_convensia', 'icc_jeju', 'ddp_arthall_1',
  'lotte_hotel_seoul', 'grand_hyatt_seoul', 'westin_chosun_seoul', 'plaza_hotel_seoul',
  'gwanghwamun_square', 'at_center', 'pyeongchang_alpensia',
]

// 폴더명 → VENUE_LIST·시설 가이드 매핑
const FOLDER_TO_CODE = {
  'BEXCO':                   { venue: 'BEXCO',              guide_keys: [],                                                        priority: 1 },
  'CECO':                    { venue: 'CECO',               guide_keys: [],                                                        priority: 2 },
  'COEX':                    { venue: '코엑스',             guide_keys: ['coex','coex_grandballroom','coex_asembballroom','coex_d_hall','coex_conference_hall'], priority: 0 },
  'DCC':                     { venue: 'DCC',                guide_keys: [],                                                        priority: 2 },
  'DDP':                     { venue: 'DDP',                guide_keys: ['ddp_arthall_1'],                                         priority: 0 },
  'EXCO':                    { venue: 'EXCO',               guide_keys: [],                                                        priority: 1 },
  'GSCO':                    { venue: 'GSCO',               guide_keys: [],                                                        priority: 1 },
  'GUMICO':                  { venue: 'GUMICO',             guide_keys: [],                                                        priority: 3 },
  'HICO':                    { venue: 'HICO',               guide_keys: [],                                                        priority: 2 },
  'ICC 제주':                { venue: 'ICC JEJU',           guide_keys: ['icc_jeju'],                                              priority: 0 },
  'KINTEX':                  { venue: '킨텍스',             guide_keys: ['kintex_1_hall_5','kintex_1_hall_1_to_4','kintex_2_hall_6_to_10'], priority: 0 },
  'KSPO DOME':               { venue: 'KSPO DOME',          guide_keys: [],                                                        priority: 2 },
  'SETEC':                   { venue: 'SETEC',              guide_keys: [],                                                        priority: 2 },
  'THE_SHILLA':              { venue: 'THE_SHILLA',         guide_keys: [],                                                        priority: 1 },
  'UECO':                    { venue: 'UECO',               guide_keys: [],                                                        priority: 3 },
  '그랜드하얏트서울':        { venue: '그랜드하얏트 서울', guide_keys: ['grand_hyatt_seoul'],                                     priority: 0 },
  '김대중컨벤션센터':        { venue: '광주 김대중컨벤션센터', guide_keys: [],                                                  priority: 1 },
  '더 플라자 호텔 서울':     { venue: '더플라자 호텔 서울', guide_keys: ['plaza_hotel_seoul'],                                    priority: 0 },
  '라한호텔  라한셀렉트':    { venue: '라한호텔',           guide_keys: [],                                                        priority: 3 },
  '롯데호텔 서울':           { venue: '롯데호텔 서울',      guide_keys: ['lotte_hotel_seoul'],                                     priority: 0 },
  '소노캄 모음':             { venue: '소노캄',             guide_keys: [],                                                        priority: 3 },
  '송도컨벤시아':            { venue: '송도컨벤시아',       guide_keys: ['songdo_convensia'],                                      priority: 0 },
  '수원컨벤션센터':          { venue: '수원컨벤션센터',     guide_keys: [],                                                        priority: 2 },
  '시그니엘 서울':           { venue: '시그니엘',           guide_keys: [],                                                        priority: 2 },
  '안동국제컨벤션센터':      { venue: '안동컨벤션',         guide_keys: [],                                                        priority: 3 },
  '여수엑스포컨벤션센터':    { venue: '여수엑스포',         guide_keys: [],                                                        priority: 2 },
  '정부세종컨벤션센터':      { venue: '정부세종컨벤션',     guide_keys: [],                                                        priority: 2 },
  '제주신라호텔':            { venue: '제주신라',           guide_keys: [],                                                        priority: 2 },
  '조선팰리스 강남(그랜드인터콘티넨탈 파르나스)': { venue: '조선팰리스', guide_keys: [],                                         priority: 2 },
}

// VENUE_HALLS 코드 등록 (parent_key 기준)
const HALL_REGISTERED = {
  '코엑스': 10, // 그랜드볼룸·아셈볼룸·오디토리움·컨퍼런스룸 북남·A~E홀
  '킨텍스': 10, // 제1전시장 1~10홀·제2전시장 7A·8·9A·9B·10·그랜드볼룸
  'DDP': 5,    // 알림1·알림2·디자인올레·디자인전시관·어울림광장
}

// 파일 분류 헬퍼
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
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== 'desktop.ini' && !e.name.startsWith('__MACOSX')) }
  catch { return [] }
}

// L1_행사장 이후 상대 경로 (사용자 명시)
function relPath(absPath) {
  return path.relative(L1_ROOT, absPath).replace(/\\/g, '/')
}

// 행사장 폴더 전체 walk → 파일 목록 (상대 경로 포함)
function walkAllFiles(venueDir) {
  const out = []
  const walk = (d, depth = 0) => {
    if (depth > 5) return
    for (const e of safeReadDir(d)) {
      const fp = path.join(d, e.name)
      if (e.isDirectory()) walk(fp, depth + 1)
      else if (e.isFile()) out.push({ name: e.name, rel: relPath(fp), abs: fp })
    }
  }
  walk(venueDir)
  return out
}

const venueDirs = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()
const wb = XLSX.utils.book_new()

// ─────────────────────────────────────────────────────
// 시트 1: 30 행사장 요약 (1행 = 1행사장 = 핵심 4 정보)
// 상사 명시 4 정보: 행사장·기본 도면 유무·진행 행사 유무·학습 자료 수
// ─────────────────────────────────────────────────────
const summaryRows = [[
  '#', '행사장 (L1 폴더명)', '도면 보유', '도면 파일 수',
  '진행 행사 보유', '진행 행사 수',
  '학습 파일 총 수', '코드 시설 가이드 등록', '코드 L2 홀 등록 수', '갭 우선순위',
]]

const venueRows = {} // for sheet 2/3
const venueDoneEvents = {} // for sheet 3

let idx = 1
for (const name of venueDirs) {
  const venueDir = path.join(L1_ROOT, name)
  const allFiles = walkAllFiles(venueDir)
  const drawings = allFiles.filter(f => /도면|평면|배치도|\.(dwg|dxf)$/i.test(f.name))

  // 진행 행사 폴더 = depth 3~4 의 leaf 폴더 (L3 하위)
  const eventFolders = new Set()
  const collectEvents = (dir, depth = 0) => {
    for (const e of safeReadDir(dir)) {
      if (!e.isDirectory()) continue
      const fp = path.join(dir, e.name)
      // L2_·_L2미상* 안의 L3_*/[행사명] 패턴
      if (depth === 2 && /^L3_/.test(path.basename(path.dirname(fp))) || depth === 2 && /^L3_/.test(e.name) === false && /^L2/.test(path.basename(path.dirname(fp)).replace(/^_/, '')) === false) {
        // 단순화: L2 → L3 → 행사 폴더 (depth 2 = 행사 폴더)
      }
      if (depth === 2 && /^L3_/.test(path.basename(path.dirname(fp))) ) eventFolders.add(e.name)
      if (depth < 3) collectEvents(fp, depth + 1)
    }
  }
  collectEvents(venueDir, 0)

  // 보조 — _L2미상/L3_*/[행사] 패턴도 포함
  for (const sub of safeReadDir(venueDir)) {
    if (!sub.isDirectory()) continue
    const subPath = path.join(venueDir, sub.name)
    for (const l3 of safeReadDir(subPath)) {
      if (!l3.isDirectory()) continue
      const l3Path = path.join(subPath, l3.name)
      if (/^L3_/.test(l3.name)) {
        for (const ev of safeReadDir(l3Path)) {
          if (ev.isDirectory()) eventFolders.add(ev.name)
        }
      }
    }
  }

  venueDoneEvents[name] = Array.from(eventFolders)

  const code = FOLDER_TO_CODE[name] ?? { venue: '— (미매핑)', guide_keys: [], priority: 9 }
  const hallCount = HALL_REGISTERED[code.venue] ?? 0
  const guideLabel = code.guide_keys.length > 0 ? `O (${code.guide_keys.length}건)` : 'X (미등록)'
  const priorityLabel = code.priority === 0 ? '— (등록 완료)'
                      : code.priority === 1 ? '1순위 (대형)'
                      : code.priority === 2 ? '2순위 (중형)'
                      : code.priority === 3 ? '3순위 (소형·후순위)'
                      : '— (매핑 확인 필요)'

  summaryRows.push([
    idx++,
    name,
    drawings.length > 0 ? 'O' : 'X',
    drawings.length,
    eventFolders.size > 0 ? 'O' : 'X',
    eventFolders.size,
    allFiles.length,
    guideLabel,
    hallCount,
    priorityLabel,
  ])

  venueRows[name] = { allFiles, drawings, eventFolders: Array.from(eventFolders), code, hallCount }
}

const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
ws1['!cols'] = [
  {wch: 4}, {wch: 32}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 10}, {wch: 14}, {wch: 12}, {wch: 18}
]
ws1['!autofilter'] = { ref: `A1:J${summaryRows.length}` }
ws1['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws1, '1. 30행사장 요약')

// ─────────────────────────────────────────────────────
// 시트 2: 기본 도면 인덱스 (행사장 × 도면 파일 = 1행)
// ─────────────────────────────────────────────────────
const drawRows = [['#', '행사장', '파일명', '분류', '파일 경로 (L1 이후)']]
let dIdx = 1
for (const name of venueDirs) {
  const v = venueRows[name]
  if (!v) continue
  for (const f of v.drawings) {
    drawRows.push([dIdx++, name, f.name, classifyFile(f.name), f.rel])
  }
}
const ws2 = XLSX.utils.aoa_to_sheet(drawRows)
ws2['!cols'] = [{wch: 4}, {wch: 32}, {wch: 50}, {wch: 18}, {wch: 80}]
ws2['!autofilter'] = { ref: `A1:E${drawRows.length}` }
ws2['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws2, '2. 기본 도면')

// ─────────────────────────────────────────────────────
// 시트 3: 진행 행사 + 학습 파일 (행사장 × 행사 × 파일 = 1행)
// ─────────────────────────────────────────────────────
const evRows = [['#', '행사장', 'L2 (홀·하위 폴더)', '진행 행사명', '학습 파일명', '분류', '파일 경로 (L1 이후)']]
let eIdx = 1
for (const name of venueDirs) {
  const venueDir = path.join(L1_ROOT, name)
  for (const l2 of safeReadDir(venueDir)) {
    if (!l2.isDirectory()) continue
    if (l2.name === '_기본도면') continue
    const l2Path = path.join(venueDir, l2.name)
    for (const l3 of safeReadDir(l2Path)) {
      if (!l3.isDirectory()) continue
      const l3Path = path.join(l2Path, l3.name)
      // L3_ 폴더면 그 안의 행사 폴더 순회, 아니면 l3 자체가 행사 폴더
      if (/^L3_/.test(l3.name)) {
        for (const ev of safeReadDir(l3Path)) {
          if (!ev.isDirectory()) continue
          const evPath = path.join(l3Path, ev.name)
          for (const f of safeReadDir(evPath)) {
            if (!f.isFile()) continue
            evRows.push([
              eIdx++, name, l2.name, ev.name, f.name, classifyFile(f.name),
              relPath(path.join(evPath, f.name))
            ])
          }
        }
      } else {
        // L3_ prefix 없는 경우 (드물게)
        for (const f of safeReadDir(l3Path)) {
          if (!f.isFile()) continue
          evRows.push([
            eIdx++, name, l2.name, l3.name, f.name, classifyFile(f.name),
            relPath(path.join(l3Path, f.name))
          ])
        }
      }
    }
  }
}
const ws3 = XLSX.utils.aoa_to_sheet(evRows)
ws3['!cols'] = [{wch: 4}, {wch: 32}, {wch: 32}, {wch: 50}, {wch: 60}, {wch: 18}, {wch: 100}]
ws3['!autofilter'] = { ref: `A1:G${evRows.length}` }
ws3['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws3, '3. 진행 행사·학습 파일')

// ─────────────────────────────────────────────────────
// 시트 4: 코드 시드 정합 매트릭스 (행사장 × VENUE_LIST·시설가이드·VENUE_HALLS)
// ─────────────────────────────────────────────────────
const matchRows = [[
  '#', '행사장 (L1 폴더명)',
  'VENUE_LIST 등록', '매핑된 VENUE_LIST 키',
  '시설 가이드 등록', '시설 가이드 키 (있는 것만)',
  'L2 홀 등록 수 (코드)',
  '갭 종류', '갭 작업 내용',
]]
let mIdx = 1
for (const name of venueDirs) {
  const v = venueRows[name]
  if (!v) continue
  const c = v.code
  const venueOk = c.venue !== '— (미매핑)' ? 'O' : 'X'
  const guideOk = c.guide_keys.length > 0 ? 'O' : 'X'
  const gapType = []
  const gapWork = []
  if (guideOk === 'X') {
    gapType.push('시설 가이드 누락')
    gapWork.push(`VENUE_FACILITY_GUIDE_SEED에 ${c.venue} 시드 추가 (외벽·내벽·세로·천장·포디움 6 슬롯)`)
  }
  if (v.hallCount === 0 && v.eventFolders.length > 0) {
    gapType.push('L2 홀 등록 없음')
    gapWork.push(`VENUE_HALLS에 ${c.venue} 하위 홀 등록 (폴더 L2_* 기준)`)
  }
  if (gapType.length === 0) gapType.push('— (정합 OK)')
  if (gapWork.length === 0) gapWork.push('—')

  matchRows.push([
    mIdx++, name, venueOk, c.venue, guideOk,
    c.guide_keys.join(', ') || '—',
    v.hallCount,
    gapType.join(' / '),
    gapWork.join(' / '),
  ])
}
const ws4 = XLSX.utils.aoa_to_sheet(matchRows)
ws4['!cols'] = [{wch: 4}, {wch: 32}, {wch: 14}, {wch: 24}, {wch: 14}, {wch: 50}, {wch: 14}, {wch: 24}, {wch: 70}]
ws4['!autofilter'] = { ref: `A1:I${matchRows.length}` }
ws4['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws4, '4. 코드 시드 정합')

// ─────────────────────────────────────────────────────
// 시트 5: 갭 우선순위 (시설 가이드 미등록 16개 — 작업 후보)
// ─────────────────────────────────────────────────────
const gapRows = [['#', '행사장', '우선순위', '도면 보유', '진행 행사 수', '학습 파일 수', '권장 시드 작업']]
let gIdx = 1
for (const name of venueDirs) {
  const v = venueRows[name]; if (!v) continue
  if (v.code.guide_keys.length > 0) continue // 등록된 것 제외
  gapRows.push([
    gIdx++, name,
    v.code.priority === 1 ? '1순위 (대형)' :
    v.code.priority === 2 ? '2순위 (중형)' :
    v.code.priority === 3 ? '3순위 (소형)' : '— 매핑 확인',
    v.drawings.length > 0 ? 'O' : 'X',
    v.eventFolders.length,
    v.allFiles.length,
    `VENUE_FACILITY_GUIDE_SEED에 ${v.code.venue} 시드 추가 (외벽·세로·포디움 기본 + 운영팀 연락처)`
  ])
}
const ws5 = XLSX.utils.aoa_to_sheet(gapRows)
ws5['!cols'] = [{wch: 4}, {wch: 32}, {wch: 18}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 80}]
ws5['!autofilter'] = { ref: `A1:G${gapRows.length}` }
ws5['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws5, '5. 갭 우선순위')

// ─────────────────────────────────────────────────────
// 시트 6: 읽는 법 (메타)
// ─────────────────────────────────────────────────────
const metaRows = [
  ['항목', '내용'],
  ['조사 일자', '2026-05-19'],
  ['조사 폴더', '학습데이터_통합_260514/L1_행사장 (30 행사장)'],
  ['시트 1', '30 행사장 요약 — 한 줄 = 한 행사장 (도면·행사·학습 파일 수 + 코드 등록 여부)'],
  ['시트 2', '기본 도면 인덱스 — 도면 파일 1건 = 1행 (행사장 필터 가능)'],
  ['시트 3', '진행 행사·학습 파일 — 한 행 = 행사 × 학습 파일'],
  ['시트 4', '코드 시드 정합 — VENUE_LIST·시설 가이드·VENUE_HALLS 등록 상태 + 갭'],
  ['시트 5', '갭 우선순위 — 시설 가이드 미등록 행사장만 (작업 후보)'],
  ['파일 경로', 'L1_행사장 이후 상대 경로만 표시 (사용자 명시)'],
  ['우선순위 기준', '1순위 = 대형 컨벤션·전시장 (BEXCO·EXCO·GSCO·김대중)'],
  ['', '2순위 = 중형 컨벤션·호텔 (CECO·DCC·HICO·KSPO DOME·SETEC·여수·정부세종·시그니엘·제주신라·조선팰리스·수원·신라서울)'],
  ['', '3순위 = 소형·후순위 (GUMICO·UECO·라한·소노캄·안동)'],
  ['VENUE_LIST', 'lib/venueIntel.ts — 38개 키 등록됨 (30 행사장 모두 매핑 가능)'],
  ['VENUE_FACILITY_GUIDE_SEED', 'lib/data/venueFacilityGuide.ts — 19건 등록 (킨텍스 3·코엑스 5·송도·ICC·DDP·롯데·그랜드하얏트·웨스틴·플라자·광화문·aT·평창)'],
  ['VENUE_HALLS', 'lib/venueIntel.ts — 25건 등록 (COEX 10·KINTEX 10·DDP 5)'],
  ['', '폴더 L2 보유 행사장 = 그랜드하얏트·더플라자·ICC 제주 (코드 추가 후보)'],
]
const ws6 = XLSX.utils.aoa_to_sheet(metaRows)
ws6['!cols'] = [{wch: 30}, {wch: 100}]
XLSX.utils.book_append_sheet(wb, ws6, '0. 읽는 법')

// 시트 순서 재배치: 0(읽는 법) → 1 → 2 → 3 → 4 → 5
wb.SheetNames = ['0. 읽는 법', '1. 30행사장 요약', '2. 기본 도면', '3. 진행 행사·학습 파일', '4. 코드 시드 정합', '5. 갭 우선순위']

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)

console.log('✓ v3 학습데이터 30 행사장 조사 엑셀 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 시트 ' + wb.SheetNames.length + '건')
console.log('  → 행사장 ' + (summaryRows.length - 1) + ' / 도면 파일 ' + (drawRows.length - 1) + ' / 행사·학습 파일 ' + (evRows.length - 1) + ' / 갭 ' + (gapRows.length - 1))
