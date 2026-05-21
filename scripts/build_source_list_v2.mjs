// 학습 사용 파일 리스트 v2 = 정답지 영역 37건 + eventLearningIndexSeed 18 행사 sample_files + SEED 영역 추가
import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'

const XLSX_SRC = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/정답지_4건'
const PDFJPG_SRC = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/정답지_PDF_jpg_분석'
const GDRIVE_ROOT = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/실제_학습_사용_파일_리스트_260521.xlsx'

const META = {
  '2018 스마트국토엑스포_제작물리스트_0909.xlsx': { l1: '코엑스(COEX)', l2: 'D2홀', code: '183080', event: '2018 스마트국토엑스포', year: 2018, gd: 'COEX/프로젝트 학습/L2_D2홀_183080 2018 스마트국토엑스포/' },
  '2018WLCF_제작물리스트-180929.xlsx': { l1: '제주국제컨벤션센터(ICC)', l2: 'L3 (5층+3층)', code: '183060', event: 'WLCF 2018', year: 2018, gd: 'ICC 제주/_L2미상/L3_제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/' },
  'BCWW 2018_제작물리스트_20180820_Final_VER02 (1).xlsx': { l1: '코엑스(COEX)', l2: 'B홀·컨퍼런스룸', code: '183090', event: 'BCWW 2018', year: 2018, gd: 'COEX/프로젝트 학습/L2_B홀, 컨퍼런스룸(201-203호)_183090 BCWW 2018/' },
  'KME 2019_제작물 리스트_190608_2000.xlsx': { l1: '송도컨벤시아', l2: '(L2 미상)', code: '193100', event: 'KME 2019', year: 2019, gd: '송도컨벤시아/프로젝트 학습/L2_193100 KOREA MICE EXPO 2019/' },
  'KME_환경제작물리스트_0613-환영리셉션.xlsx': { l1: '송도컨벤시아', l2: '(L2 미상)', code: '183000-1', event: 'KME 2018 환영리셉션', year: 2018, gd: '송도컨벤시아/프로젝트 학습/L2_183000-1 KOREA MICE EXPO 2018/' },
  '리더스_제작물 리스트_180911(이즈).xlsx': { l1: '제주국제컨벤션센터(ICC)', l2: 'L3 (5층+3층)', code: '183060', event: 'IUCN 리더스포럼 / WLCF', year: 2018, gd: 'ICC 제주/_L2미상/L3_제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/' },
}
const PDF_JPG_META = {
  'DDP': { l1: '동대문디자인플라자(DDP)', code: '191400', event: '제1회 정부혁신박람회', year: 2019, gd: 'DDP/L2 미상/191400 제1회 대한민국 정부혁신박람회/' },
  'ICC제주': { l1: '제주국제컨벤션센터(ICC)', code: '183060·WGCA 등', event: 'WLCF·WGCA·리더스 시안', year: 2018, gd: 'ICC 제주/_L2미상/' },
  'KINTEX': { l1: '킨텍스(KINTEX)', code: '222020', event: 'WSCE 2022 / 매뉴얼', year: 2022, gd: 'KINTEX/전시장 안내서류/ + 프로젝트 학습/' },
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

// 1. 정답지_4건 (xlsx 6)
for (const f of walk(XLSX_SRC)) {
  const m = META[f.name]
  if (!m) continue
  rows.push({
    no: no++, source: '정답지 폴더 (xlsx)',
    type: '발주리스트 (xlsx)', l1: m.l1, l2: m.l2 || '', code: m.code, event: m.event, year: m.year,
    file: f.name, local: f.path.replace(/\\/g, '/'), gd: GDRIVE_ROOT + '/' + m.gd + f.name,
    size: statSync(f.path).size,
    use: 'SEED_EVENT_HISTORY signage_breakdown SOT·발주 행 232 추출 원본',
  })
}

// 2. 정답지_PDF_jpg_분석
for (const f of walk(PDFJPG_SRC)) {
  const venueFolder = f.path.replace(/\\/g, '/').replace(PDFJPG_SRC + '/', '').split('/')[0]
  const m = PDF_JPG_META[venueFolder]
  if (!m) continue
  const type = f.ext === 'pdf' ? '매뉴얼·도면 (pdf)' : f.ext === 'xlsx' ? '발주리스트·양식 (xlsx)' : '시안 이미지 (' + f.ext + ')'
  rows.push({
    no: no++, source: '정답지 폴더 (PDF/jpg)',
    type, l1: m.l1, l2: '', code: m.code, event: m.event, year: m.year,
    file: f.name, local: f.path.replace(/\\/g, '/'), gd: GDRIVE_ROOT + '/' + m.gd + f.name,
    size: statSync(f.path).size,
    use: f.ext === 'pdf' ? '시설 가이드·매뉴얼 SOT' : f.ext === 'xlsx' ? '발주리스트·신청 양식' : '시안 분석 = 카테고리·규격',
  })
}

// 3. eventLearningIndexSeed.ts 안 18 행사 sample_files
const idxSeed = readFileSync('lib/data/v3/eventLearningIndexSeed.ts', 'utf-8')
const entries = idxSeed.matchAll(/\{"venue_folder":"([^"]+)","venue_key":"[^"]+","l2_hall":"([^"]+)","event_code":"([^"]*)","event_name":"([^"]+)","area":"([^"]*)","learn_count":(\d+),"sample_files":"([^"]+)"/g)
for (const m of entries) {
  const [, venueFolder, l2, code, event, area, count, samples] = m
  const files = samples.split(' / ')
  for (const fname of files) {
    rows.push({
      no: no++, source: 'eventLearningIndexSeed (G드라이브 SOT)',
      type: 'G드라이브 학습 자료',
      l1: venueFolder, l2, code: code || '미상', event, year: code ? `20${code.slice(0, 2)}` : '미상',
      file: fname, local: '미상 (G드라이브 원본)', gd: `${GDRIVE_ROOT}/${venueFolder}/.../`+fname,
      size: '미상',
      use: `학습 인덱스 sample_files (18 행사·총 ${count}건 중 sample 3)·SOT 영역`,
    })
  }
}

// 4. SEED_CEILING_BANNER_PATTERNS + SEED_EVENT_HISTORY 추가 행사
const extraSeeds = [
  { source: 'SEED_CEILING_BANNER_PATTERNS', l1: '코엑스(COEX)', l2: 'Hall B', code: '183090', event: 'BCWW 2018 천정배너 22 슬롯', year: 2018, file: 'B홀-천장-배너걸이-배치도.pdf', gd: 'COEX/B홀-천장-배너걸이-배치도.pdf' },
  { source: 'SEED_CEILING_BANNER_PATTERNS', l1: '제주국제컨벤션센터(ICC)', l2: '5층', code: '183060', event: 'WLCF 2018 천정배너 14m×12m·3m×10m', year: 2018, file: '(도면·실측 영역·정답지 분석)', gd: 'ICC 제주/_L2미상/L3_제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)/제2회 세계리더스보전포럼 183060/' },
  { source: 'SEED_EVENT_HISTORY (정답지 폴더 X)', l1: '평창 알펜시아 리조트', l2: '(L2 미상)', code: '193960', event: '2020 평창평화포럼', year: 2020, file: '(코드 시드만·G드라이브 정답지 폴더 영역 X)', gd: '미상' },
  { source: 'SEED_EVENT_HISTORY (정답지 폴더 X)', l1: '광화문광장·세종로공원', l2: '(L2 미상)', code: '192000', event: '제100주년 3.1절 중앙기념식', year: 2019, file: '(코드 시드만·G드라이브 정답지 폴더 영역 X)', gd: '미상' },
]
for (const s of extraSeeds) {
  rows.push({
    no: no++, source: s.source, type: '시드 영역 (코드 박제)',
    l1: s.l1, l2: s.l2, code: s.code, event: s.event, year: s.year,
    file: s.file, local: '미상 (시드 코드 영역)', gd: s.gd === '미상' ? '미상' : `${GDRIVE_ROOT}/${s.gd}`,
    size: '미상',
    use: 'SEED_CEILING_BANNER_PATTERNS 또는 SEED_EVENT_HISTORY 시드 박제 영역',
  })
}

console.log(`총 ${rows.length}건`)

// xlsx 작성
const wb = xlsx.utils.book_new()

// 시트 1 = 학습 사용 파일 전체
const s1 = [['#', '출처', '자료 유형', '행사장(L1)', '홀(L2)', '행사 코드', '행사명', '연도', '파일명', '로컬 경로', 'G드라이브 원본 경로', '파일 크기', '학습 활용']]
rows.sort((a, b) => {
  const so = { '정답지 폴더 (xlsx)': 1, '정답지 폴더 (PDF/jpg)': 2, 'eventLearningIndexSeed (G드라이브 SOT)': 3, 'SEED_CEILING_BANNER_PATTERNS': 4, 'SEED_EVENT_HISTORY (정답지 폴더 X)': 5 }
  if (so[a.source] !== so[b.source]) return so[a.source] - so[b.source]
  return a.l1.localeCompare(b.l1, 'ko') || a.file.localeCompare(b.file, 'ko')
})
rows.forEach((d, i) => s1.push([i + 1, d.source, d.type, d.l1, d.l2, d.code, d.event, d.year, d.file, d.local, d.gd, d.size, d.use]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s1), '학습_사용_파일')

// 시트 2 = 통계
const bySource = {}, byL1 = {}, byType = {}
for (const r of rows) {
  bySource[r.source] = (bySource[r.source] || 0) + 1
  byL1[r.l1] = (byL1[r.l1] || 0) + 1
  byType[r.type] = (byType[r.type] || 0) + 1
}
const s2 = [
  ['실제 학습 사용 파일 통합 리스트 (2026-05-21·v2)'],
  [''],
  ['총 파일 수', rows.length + '건'],
  [''],
  ['출처별'],
  ...Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([s, n]) => ['', s, n + '건']),
  [''],
  ['자료 유형별'],
  ...Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => ['', t, n + '건']),
  [''],
  ['행사장(L1)별'],
  ...Object.entries(byL1).sort((a, b) => b[1] - a[1]).map(([v, n]) => ['', v, n + '건']),
]
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s2), '요약·통계')

xlsx.writeFile(wb, OUT)
console.log(`완료: ${OUT}`)
console.log('출처별:')
Object.entries(bySource).forEach(([s, n]) => console.log(`  ${n}건  ${s}`))
console.log('행사장별:')
Object.entries(byL1).forEach(([v, n]) => console.log(`  ${n}건  ${v}`))
