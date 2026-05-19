#!/usr/bin/env node
// v7 (2026-05-19) — 폴더 분석 → 학습 시드 자동 생성 + xlsx 시트 추가
// 출력:
//   1. lib/data/v3/eventLearningIndexSeed.ts (자동)
//   2. 동의어 후보 + 누적 카운트 stdout (수동 검토 후 보강)
//   3. 학습데이터_L1행사장_조사_v7_260519.xlsx (시트 9·10·11 추가)

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const L1_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT_XLSX = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/학습데이터_L1행사장_조사_v7_260519.xlsx'
const OUT_SEED = path.resolve('lib/data/v3/eventLearningIndexSeed.ts')

const FOLDER_TO_VENUE = {
  'BEXCO': 'BEXCO', 'CECO': 'CECO', 'COEX': '코엑스', 'DCC': 'DCC',
  'DDP': 'DDP', 'EXCO': 'EXCO', 'GSCO': 'GSCO', 'GUMICO': 'GUMICO',
  'HICO': 'HICO', 'ICC 제주': 'ICC JEJU', 'KINTEX': '킨텍스',
  'KSPO DOME': 'KSPO DOME', 'SETEC': 'SETEC', 'THE_SHILLA': 'THE_SHILLA', 'UECO': 'UECO',
  '그랜드하얏트서울': '그랜드하얏트 서울', '김대중컨벤션센터': '광주 김대중컨벤션센터',
  '더 플라자 호텔 서울': '더플라자 호텔 서울', '라한호텔  라한셀렉트': '라한호텔',
  '롯데호텔 서울': '롯데호텔 서울', '소노캄 모음': '소노캄', '송도컨벤시아': '송도컨벤시아',
  '수원컨벤션센터': '수원컨벤션센터', '시그니엘 서울': '시그니엘', '안동국제컨벤션센터': '안동컨벤션',
  '여수엑스포컨벤션센터': '여수엑스포', '정부세종컨벤션센터': '정부세종컨벤션',
  '제주신라호텔': '제주신라', '조선팰리스 강남(그랜드인터콘티넨탈 파르나스)': '조선팰리스',
}

// 비표준 → 표준 매핑 후보 (시안 파일명 패턴)
const SYNONYM_PATTERNS = [
  { pat: /통천현수막|통천\b/, std: '통천', label: '통천' },
  { pat: /가로등배너|폴배너|폴대배너/, std: 'streetlight_banner', label: '가로등 배너' },
  { pat: /기둥배너|원형기둥배너|사각기둥배너/, std: 'horizontal_banner', label: '가로 현수막 (기둥)' },
  { pat: /아이배너/, std: 'i_banner', label: 'I배너' },
  { pat: /엑스배너|X배너|x배너/, std: 'x_banner', label: 'X배너' },
  { pat: /현수막\(외벽\)|외벽\b/, std: 'horizontal_banner', label: '가로 현수막 (외벽)' },
  { pat: /행잉배너|행잉\b/, std: 'chunchen_banner', label: '통천 (행잉)' },
  { pat: /난간드롭배너|난간배너/, std: 'vertical_banner', label: '세로 현수막 (난간)' },
  { pat: /드롭배너/, std: 'vertical_banner', label: '세로 현수막 (드롭)' },
  { pat: /천장배너|천정배너/, std: 'chunchen_banner', label: '통천 (천장)' },
  { pat: /포디움타이틀|포디움\b/, std: 'podium', label: '포디움 타이틀' },
  { pat: /피켓\b|손피켓/, std: 'a4_landscape', label: 'A4 가로 (피켓)' },
  { pat: /웰컴보드/, std: 'a3_landscape', label: 'A3 가로 (웰컴보드)' },
  { pat: /시상보드/, std: 'a3_landscape', label: 'A3 가로 (시상보드)' },
  { pat: /MOU현수막|MOU 현수막/, std: 'horizontal_banner', label: '가로 현수막 (MOU)' },
  { pat: /큐방|큐방시트/, std: 'a4_landscape', label: 'A4 가로 (큐방)' },
  { pat: /포토월/, std: 'a3_landscape', label: 'A3 가로 (포토월)' },
  { pat: /기념촬영보드/, std: 'a3_landscape', label: 'A3 가로 (기념촬영)' },
  { pat: /웰컴피켓|웰컴 피켓/, std: 'a4_landscape', label: 'A4 가로 (웰컴 피켓)' },
  { pat: /명패\(대\)|명패 \(대\)/, std: 'a3_landscape', label: 'A3 가로 (명패 대)' },
  { pat: /명패\b/, std: 'a4_landscape', label: 'A4 가로 (명패)' },
  { pat: /글자박스/, std: 'horizontal_banner', label: '가로 현수막 (글자박스)' },
  { pat: /에스컬레이터유리벽|유리벽/, std: 'horizontal_banner', label: '가로 현수막 (유리벽)' },
  { pat: /로비기둥배너/, std: 'horizontal_banner', label: '가로 현수막 (로비 기둥)' },
  { pat: /천장포이어|로비천장/, std: 'chunchen_banner', label: '통천 (천장 포이어)' },
  { pat: /바톤|난간바톤/, std: 'vertical_banner', label: '세로 현수막 (바톤)' },
]

function safeReadDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== 'desktop.ini' && !e.name.startsWith('__MACOSX') && !e.name.startsWith('.')) }
  catch { return [] }
}

function classifyFolder(name) {
  if (/^(_기본도면|도면|회의실 도면)$/.test(name)) return 'drawing'
  if (/안내서류|시설가이드|임대자료|매뉴얼/.test(name)) return 'guide'
  if (/제출서류|신청서|신고서/.test(name)) return 'application'
  if (/^(프로젝트 학습|학습자료)$/.test(name)) return 'project_root'
  if (/^(L2_|L3_|환경제작물학습_)/.test(name) || /_\d{6}[_\s]/.test(name) || /\d{6}[_\s]/.test(name)) return 'event'
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

function relPath(absPath) { return path.relative(L1_ROOT, absPath).replace(/\\/g, '/') }

// ─── 1단계: 행사 인덱스·동의어 후보·누적 카운트 추출 ───
const eventIndex = []  // 행사 메타
const synonymCandidates = new Map() // 비표준 명칭 → { 표준 키, 카운트, 예시 파일 }
const venueAccum = {}  // 행사장별 카운트
const allDir = safeReadDir(L1_ROOT).filter(e => e.isDirectory()).map(e => e.name).sort()

for (const venueName of allDir) {
  const venueDir = path.join(L1_ROOT, venueName)
  const venueKey = FOLDER_TO_VENUE[venueName] ?? venueName
  venueAccum[venueName] = { learn: 0, draw: 0, event: 0, files_by_cat: {} }

  function walkEvent(dir, eventName, hall, code, area) {
    const files = []
    const walk = (d) => {
      for (const e of safeReadDir(d)) {
        const fp = path.join(d, e.name)
        if (e.isFile()) files.push({ name: e.name, abs: fp })
        else if (e.isDirectory()) walk(fp)
      }
    }
    walk(dir)
    if (files.length === 0) return

    // 인덱스 등록 (한 행사 = 한 row)
    const existing = eventIndex.find(i => i.code === code && i.venue_key === venueKey)
    if (existing) {
      existing.learn_count += files.length
    } else {
      eventIndex.push({
        venue_folder: venueName,
        venue_key: venueKey,
        l2_hall: hall,
        event_code: code,
        event_name: eventName,
        area,
        learn_count: files.length,
        sample_files: files.slice(0, 3).map(f => f.name).join(' / '),
      })
    }
    venueAccum[venueName].learn += files.length

    // 동의어 후보 추출 (시안 파일명 패턴)
    for (const f of files) {
      const lower = f.name.toLowerCase().replace(/\s/g, '').replace(/_/g, '')
      for (const sp of SYNONYM_PATTERNS) {
        if (sp.pat.test(lower)) {
          if (!synonymCandidates.has(sp.label)) {
            synonymCandidates.set(sp.label, { std_key: sp.std, count: 0, examples: [] })
          }
          const e = synonymCandidates.get(sp.label)
          e.count++
          if (e.examples.length < 3) e.examples.push(f.name)
          break
        }
      }
    }
  }

  function walkVenueDir(dir, ctx = null) {
    for (const e of safeReadDir(dir)) {
      const fp = path.join(dir, e.name)
      if (e.isDirectory()) {
        const cls = classifyFolder(e.name)
        if (cls === 'drawing') {
          // 도면 카운트
          let n = 0
          const walk = (d) => {
            for (const x of safeReadDir(d)) {
              if (x.isFile()) n++
              else if (x.isDirectory()) walk(path.join(d, x.name))
            }
          }
          walk(fp)
          venueAccum[venueName].draw += n
        } else if (cls === 'project_root') {
          for (const sub of safeReadDir(fp)) {
            if (!sub.isDirectory()) continue
            const subPath = path.join(fp, sub.name)
            const subCls = classifyFolder(sub.name)
            if (subCls === 'event') {
              const p = parseEventFolderName(sub.name)
              walkEvent(subPath, p.name, p.hall, p.code, p.area)
              venueAccum[venueName].event++
            } else {
              // L3_ 안에 행사 폴더
              const p1 = parseEventFolderName(sub.name)
              for (const sub2 of safeReadDir(subPath)) {
                if (sub2.isDirectory()) {
                  const sub2Path = path.join(subPath, sub2.name)
                  // 면적 추출
                  const areaM = sub2.name.match(/\s*\(([\d,]+㎡)\)\s*$/)
                  const area = areaM ? areaM[1] : p1.area
                  const evName = sub2.name.replace(/\s*\(([\d,]+㎡)\)\s*$/, '').trim()
                  walkEvent(sub2Path, evName, p1.hall || '(L2 미상)', p1.code, area)
                  venueAccum[venueName].event++
                }
              }
            }
          }
        } else if (cls === 'event') {
          const p = parseEventFolderName(e.name)
          walkEvent(fp, p.name, p.hall, p.code, p.area)
          venueAccum[venueName].event++
        }
      }
    }
  }
  walkVenueDir(venueDir)
}

// ─── 2단계: lib/data/v3/eventLearningIndexSeed.ts 자동 생성 ───
const eventSeedHeader = `// 자동 생성 — 폴더 학습 자료 인덱스 (G드라이브 SOT, 2026-05-19)
// 생성 스크립트: scripts/extract_learning_seeds.mjs
// 출처: G:/내 드라이브/.../05. 제작물 리스트 가이드/AI 학습자료/L1_행사장
// 변경 시 = 폴더 reorganize 후 npm run extract:learning 재실행

export interface EventLearningEntry {
  venue_folder: string    // L1 폴더명 (G드라이브 SOT)
  venue_key: string       // VENUE_LIST 매핑 키 (lib/venueIntel.ts)
  l2_hall: string         // L2 홀명
  event_code: string      // 6자리 행사 코드
  event_name: string      // 행사명
  area: string            // 면적 (㎡)
  learn_count: number     // 학습 파일 수
  sample_files: string    // 예시 파일 (최대 3개)
}

export const EVENT_LEARNING_INDEX: EventLearningEntry[] = [
`
const eventSeedBody = eventIndex
  .sort((a, b) => (a.venue_folder + a.event_code).localeCompare(b.venue_folder + b.event_code))
  .map(e => `  ${JSON.stringify(e)},`)
  .join('\n')
const eventSeedFooter = `\n]\n\nexport const EVENT_LEARNING_TOTAL = ${eventIndex.length}\nexport const EVENT_LEARNING_FILE_TOTAL = ${eventIndex.reduce((s, e) => s + e.learn_count, 0)}\n`
fs.writeFileSync(OUT_SEED, eventSeedHeader + eventSeedBody + eventSeedFooter, 'utf8')

// ─── 3단계: xlsx 시트 추가 (학습 인덱스·동의어 후보·누적 카운트) ───
const wb = XLSX.utils.book_new()

const idxRows = [['#', '행사장 폴더', 'VENUE_LIST 키', 'L2 홀명', '행사 코드', '행사명', '면적', '학습 파일 수', '예시 파일']]
eventIndex.sort((a, b) => (a.venue_folder + a.event_code).localeCompare(b.venue_folder + b.event_code)).forEach((e, i) => {
  idxRows.push([i + 1, e.venue_folder, e.venue_key, e.l2_hall, e.event_code, e.event_name, e.area, e.learn_count, e.sample_files])
})
const wsIdx = XLSX.utils.aoa_to_sheet(idxRows)
wsIdx['!cols'] = [{wch:4},{wch:32},{wch:22},{wch:30},{wch:10},{wch:50},{wch:10},{wch:10},{wch:60}]
wsIdx['!autofilter'] = { ref: `A1:I${idxRows.length}` }
wsIdx['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, wsIdx, '1. 행사 학습 인덱스')

const synRows = [['#', '비표준 명칭 (라벨)', '표준 매핑 키', '발견 횟수', '예시 파일명']]
let sIdx = 1
for (const [label, info] of synonymCandidates.entries()) {
  synRows.push([sIdx++, label, info.std_key, info.count, info.examples.join(' / ')])
}
synRows.sort((a, b) => (a[3] === '#' ? -1 : b[3] - a[3]))
const wsSyn = XLSX.utils.aoa_to_sheet(synRows)
wsSyn['!cols'] = [{wch:4},{wch:35},{wch:25},{wch:12},{wch:70}]
wsSyn['!autofilter'] = { ref: `A1:E${synRows.length}` }
wsSyn['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, wsSyn, '2. 동의어 후보')

const accumRows = [['#', '행사장 (L1 폴더)', 'VENUE_LIST 키', '도면 파일 수', '진행 행사 수', '학습 파일 수']]
let aIdx = 1
for (const [v, c] of Object.entries(venueAccum)) {
  accumRows.push([aIdx++, v, FOLDER_TO_VENUE[v] ?? v, c.draw, c.event, c.learn])
}
const wsAccum = XLSX.utils.aoa_to_sheet(accumRows)
wsAccum['!cols'] = [{wch:4},{wch:32},{wch:22},{wch:10},{wch:10},{wch:10}]
wsAccum['!autofilter'] = { ref: `A1:F${accumRows.length}` }
wsAccum['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, wsAccum, '3. 행사장 누적 카운트')

// 읽는 법 시트
const metaRows = [
  ['항목', '내용'],
  ['조사 일자', '2026-05-19 (v7 자동 시드 생성)'],
  ['소스 (SOT)', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'],
  ['', ''],
  ['시트 1', '행사 학습 인덱스 — 1 행사 = 1 row (행사장 폴더·매핑 키·L2 홀·행사 코드·면적·학습 파일 수)'],
  ['시트 2', '동의어 후보 — 시안 파일명 패턴에서 자동 추출 (비표준 명칭 → 표준 키)'],
  ['시트 3', '행사장 누적 카운트 — 행사장별 도면·행사·학습 파일 자동 집계'],
  ['', ''],
  ['생성 시드 파일', 'lib/data/v3/eventLearningIndexSeed.ts (자동 생성)'],
  ['총 행사 수', `${eventIndex.length}`],
  ['총 학습 파일', `${eventIndex.reduce((s, e) => s + e.learn_count, 0)}`],
]
const wsMeta = XLSX.utils.aoa_to_sheet(metaRows)
wsMeta['!cols'] = [{wch:30},{wch:100}]
XLSX.utils.book_append_sheet(wb, wsMeta, '0. 읽는 법')

wb.SheetNames = ['0. 읽는 법', '1. 행사 학습 인덱스', '2. 동의어 후보', '3. 행사장 누적 카운트']

const outDir = path.dirname(OUT_XLSX)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_XLSX)

console.log('✓ 자동 시드 생성 + xlsx 작성 완료')
console.log('  • lib/data/v3/eventLearningIndexSeed.ts (행사 ' + eventIndex.length + '건)')
console.log('  • ' + OUT_XLSX)
console.log('  • 동의어 후보 ' + synonymCandidates.size + '건')
console.log('  • 행사장 누적 카운트 ' + Object.keys(venueAccum).length + '건')
