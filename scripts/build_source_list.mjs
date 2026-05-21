// 정답지 원천 정보 파일 list = G드라이브 원본 매칭
// = "★확인\실제_학습_사용_파일_리스트_260521.xlsx"
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'

const XLSX_SRC = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/정답지_4건'
const PDFJPG_SRC = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/정답지_PDF_jpg_분석'
const GDRIVE_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/실제_학습_사용_파일_리스트_260521.xlsx'

// 정답지 영역 → 행사장·행사 메타
const META = {
  '2018 스마트국토엑스포_제작물리스트_0909.xlsx': { l1: '코엑스(COEX)', l2: 'D2홀', code: '183080', event: '2018 스마트국토엑스포', year: 2018, gdrive_path: 'COEX/프로젝트 학습/L2_D2홀_183080 2018 스마트국토엑스포/' },
  '2018WLCF_제작물리스트-180929.xlsx': { l1: '제주국제컨벤션센터(ICC)', l2: 'L3 (5층 + 3층)', code: '183060', event: '제2회 세계리더스보전포럼 (WLCF 2018)', year: 2018, gdrive_path: 'ICC 제주/_L2미상/L3_제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/' },
  'BCWW 2018_제작물리스트_20180820_Final_VER02 (1).xlsx': { l1: '코엑스(COEX)', l2: 'B홀·컨퍼런스룸(201-203)', code: '183090', event: 'BCWW 2018', year: 2018, gdrive_path: 'COEX/프로젝트 학습/L2_B홀, 컨퍼런스룸(201-203호)_183090 BCWW 2018/' },
  'KME 2019_제작물 리스트_190608_2000.xlsx': { l1: '송도컨벤시아', l2: '(L2 미상)', code: '193100', event: 'KOREA MICE EXPO 2019', year: 2019, gdrive_path: '송도컨벤시아/프로젝트 학습/L2_193100 KOREA MICE EXPO 2019/' },
  'KME_환경제작물리스트_0613-환영리셉션.xlsx': { l1: '송도컨벤시아', l2: '(L2 미상)', code: '183000-1', event: 'KOREA MICE EXPO 2018 환영리셉션', year: 2018, gdrive_path: '송도컨벤시아/프로젝트 학습/L2_183000-1 KOREA MICE EXPO 2018/' },
  '리더스_제작물 리스트_180911(이즈).xlsx': { l1: '제주국제컨벤션센터(ICC)', l2: 'L3 (5층 + 3층)', code: '183060', event: 'IUCN 리더스포럼 / WLCF 2018', year: 2018, gdrive_path: 'ICC 제주/_L2미상/L3_제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/' },
}

const PDF_JPG_META = {
  'DDP': { l1: '동대문디자인플라자(DDP)', code: '191400', event: '제1회 대한민국 정부혁신박람회', year: 2019, gdrive_path: 'DDP/L2 미상/191400 제1회 대한민국 정부혁신박람회/' },
  'ICC제주': { l1: '제주국제컨벤션센터(ICC)', code: '183060·(WGCA 등)', event: 'WLCF 2018 / WGCA / 리더스포럼·DID·PDP송출 시안 영역', year: 2018, gdrive_path: 'ICC 제주/_L2미상/' },
  'KINTEX': { l1: '킨텍스(KINTEX)', code: '222020', event: 'WSCE 2022 / 매뉴얼 / 가로등배너 / 컨퍼런스 제작물', year: 2022, gdrive_path: 'KINTEX/전시장 안내서류/ + 프로젝트 학습/L2_..._222020 WSCE 2022/' },
}

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push({ path: f, name: it.name, ext: (it.name.split('.').pop() || '').toLowerCase() })
  }
  return files
}

const rows = []
let no = 1

// 정답지_4건 (xlsx 6건 = 발주리스트)
console.log('[1] 정답지_4건 xlsx (발주리스트)...')
for (const f of walk(XLSX_SRC)) {
  const m = META[f.name]
  if (!m) continue
  const sz = statSync(f.path).size
  rows.push({
    no: no++, type: '발주리스트 (xlsx)',
    l1: m.l1, l2: m.l2 || '', event_code: m.code, event_name: m.event, year: m.year,
    file: f.name, local_path: f.path.replace(/\\/g, '/'),
    gdrive_path: GDRIVE_ROOT + '/' + m.gdrive_path + f.name,
    size: sz,
    use: '학습 풀 진입 = SEED_EVENT_HISTORY signage_breakdown SOT·232 발주 행 추출 원본',
  })
}

// 정답지_PDF_jpg_분석 (시안·도면)
console.log('[2] 정답지_PDF_jpg_분석 (시안·매뉴얼·도면)...')
for (const f of walk(PDFJPG_SRC)) {
  const venueFolder = f.path.replace(/\\/g, '/').replace(PDFJPG_SRC + '/', '').split('/')[0]
  const m = PDF_JPG_META[venueFolder]
  if (!m) continue
  const sz = statSync(f.path).size
  const type = f.ext === 'pdf' ? '매뉴얼·도면 (pdf)' : f.ext === 'xlsx' ? '발주리스트 (xlsx)' : '시안 이미지 (' + f.ext + ')'
  rows.push({
    no: no++, type,
    l1: m.l1, l2: '', event_code: m.code, event_name: m.event, year: m.year,
    file: f.name, local_path: f.path.replace(/\\/g, '/'),
    gdrive_path: GDRIVE_ROOT + '/' + m.gdrive_path + f.name,
    size: sz,
    use: f.ext === 'pdf' ? '시설 가이드·매뉴얼 SOT (천장고·리깅·하중 영역)' :
         f.ext === 'xlsx' ? '발주리스트·신청 양식' :
         '시안 분석 = 카테고리·규격 영역 (정답지 만든 시각 자료)',
  })
}

console.log(`\n총 ${rows.length}건 = 학습 원천 파일`)

// xlsx 작성
const wb = xlsx.utils.book_new()

// 시트 1 = 학습 사용 파일 리스트
const s1 = [['#', '자료 유형', '행사장(L1)', '홀(L2)', '행사 코드', '행사명', '연도', '파일명', '로컬 경로', 'G드라이브 경로', '파일 크기 (B)', '학습 활용 영역']]
rows.sort((a, b) => a.l1.localeCompare(b.l1, 'ko') || (a.event_code || '').localeCompare(b.event_code || '') || a.file.localeCompare(b.file, 'ko'))
rows.forEach((d, i) => s1.push([i + 1, d.type, d.l1, d.l2, d.event_code, d.event_name, d.year, d.file, d.local_path, d.gdrive_path, d.size, d.use]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '학습_사용_파일')

// 시트 2 = 자료 유형·행사장 통계
const byType = {}, byL1 = {}
for (const r of rows) {
  byType[r.type] = (byType[r.type] || 0) + 1
  byL1[r.l1] = (byL1[r.l1] || 0) + 1
}
const s2 = [
  ['실제 학습에 사용된 파일 = 정답지 원천 정보 (2026-05-21)'],
  [''],
  ['총 파일 수', rows.length + '건'],
  [''],
  ['자료 유형별'],
  ...Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => ['', t, n + '건']),
  [''],
  ['행사장(L1)별'],
  ...Object.entries(byL1).sort((a, b) => b[1] - a[1]).map(([v, n]) => ['', v, n + '건']),
  [''],
  ['G드라이브 원본 위치 SOT'],
  ['', GDRIVE_ROOT],
  [''],
  ['학습 결과 진입 영역'],
  ['', 'SEED_EVENT_HISTORY 8 행사 (lib/data/dashboardSeed.ts)'],
  ['', 'SEED_CEILING_BANNER_PATTERNS 6 entries (COEX BCWW + ICC 5층)'],
  ['', 'SIGNAGE_CATEGORIES_V3 17 카테고리 (블로틴·콘솔·파티션·DID 가로·포디움 가로 신규 5건 = ICC WLCF·리더스 정답지 13건 분석 영역)'],
  ['', 'SEED_SYNONYMS 140건 동의어 매핑'],
  ['', 'PROGRAM_PART_SIGNAGE_HINTS 6 파트 신규 5 카테고리 분배'],
]
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '요약·통계')

xlsx.writeFile(wb, OUT)
console.log(`\n완료: ${OUT}`)
console.log(`자료 유형별:`)
Object.entries(byType).forEach(([t, n]) => console.log(`  ${t}: ${n}건`))
console.log(`행사장별:`)
Object.entries(byL1).forEach(([v, n]) => console.log(`  ${v}: ${n}건`))
