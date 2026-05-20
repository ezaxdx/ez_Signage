// L1 행사장 정리 후 학습용 + 보고용 최종 xlsx 작성
// SOT: scan_unused.json (1148건 전수·432건 학습 사용·716건 삭제)
import { readFileSync } from 'fs'
import xlsx from 'xlsx'
const { utils, writeFile } = xlsx

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const { totalFiles, venueStats, result } = data

const REGISTERED_VENUES = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

// 학습 사용 파일 (등록 7 행사장 비시스템 = 432건)
const learnFiles = result.filter(r => REGISTERED_VENUES.has(r.venue) && !r.status.startsWith('삭제 후보'))
// 삭제 = 시스템 + 미등록 행사장 = 716건
const deleteFiles = result.filter(r => !REGISTERED_VENUES.has(r.venue) || r.status.startsWith('삭제 후보'))

const sysDelete = deleteFiles.filter(r => r.status.startsWith('삭제 후보'))
const unregDelete = deleteFiles.filter(r => !r.status.startsWith('삭제 후보') && !REGISTERED_VENUES.has(r.venue))

// 등록 행사장별 학습 사용 카운트
const venueCount = {}
for (const r of learnFiles) {
  venueCount[r.venue] = (venueCount[r.venue] ?? 0) + 1
}

// 미등록 24 행사장 리스트
const unregVenues = new Set(unregDelete.map(r => r.venue))

// ─────────────────────────────────────────────
// xlsx 작성
const wb = utils.book_new()

// Sheet 0 : 요약
const s0 = [
  ['L1 행사장 학습 자료 정리 — 최종 보고 (2026-05-20)'],
  [''],
  ['작성', '조기흠 사원·AXDX팀'],
  ['SOT', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장/'],
  [''],
  ['전체 파일', `${totalFiles}건`],
  ['  · 학습 사용 (보존)', `${learnFiles.length}건 (${Math.round(learnFiles.length / totalFiles * 100)}%)`, '등록 7 행사장 비시스템'],
  ['  · 삭제', `${deleteFiles.length}건 (${Math.round(deleteFiles.length / totalFiles * 100)}%)`, '시스템 + 미등록 행사장'],
  ['     - 필요없는 파일', `${sysDelete.length}건`, 'desktop.ini 등 운영 파일'],
  ['     - 환경장식물 학습 활용 불가 자료', `${unregDelete.length}건`, '미등록 24 행사장 (도면·일반 사진 위주)'],
  [''],
  ['학습 사용 행사장 7개'],
  ...Object.entries(venueCount).sort((a, b) => b[1] - a[1]).map(([v, c]) => ['', v, `${c}건`]),
  [''],
  ['삭제 대상 미등록 행사장 24개'],
  ...Array.from(unregVenues).sort().map(v => ['', v]),
]
utils.book_append_sheet(wb, utils.aoa_to_sheet(s0), '0_요약')

// Sheet 1 : 학습 사용 파일 (432건) — 학습용 최종 SOT
const s1 = [['No', '행사장', '경로', '파일명', '확장자', '크기 (B)']]
learnFiles
  .sort((a, b) => a.venue.localeCompare(b.venue, 'ko') || a.name.localeCompare(b.name, 'ko'))
  .forEach((r, i) => s1.push([i + 1, r.venue, r.rel, r.name, r.ext, r.size]))
utils.book_append_sheet(wb, utils.aoa_to_sheet(s1), '1_학습사용_432건')

// Sheet 2 : 행사장별 학습 사용 통계
const s2 = [['행사장', '학습 사용 파일 수', '비고']]
const venueOrder = ['COEX', 'KINTEX', '그랜드하얏트서울', 'ICC 제주', '송도컨벤시아', 'DDP', '더 플라자 호텔 서울']
for (const v of venueOrder) {
  s2.push([v, venueCount[v] ?? 0, ''])
}
s2.push(['', '', ''])
s2.push(['합계', learnFiles.length, ''])
utils.book_append_sheet(wb, utils.aoa_to_sheet(s2), '2_행사장별_통계')

// Sheet 3 : 삭제 — 필요없는 파일 (시스템·메타·238건)
const s3 = [['No', '행사장', '경로', '파일명', '삭제 이유']]
sysDelete.forEach((r, i) => s3.push([i + 1, r.venue, r.rel, r.name, '운영 파일 (실 자료 X)']))
utils.book_append_sheet(wb, utils.aoa_to_sheet(s3), '3_삭제_필요없는파일')

// Sheet 4 : 삭제 — 환경장식물 학습 활용 불가 (미등록 24 행사장·478건)
const s4 = [['No', '행사장', '경로', '파일명', '삭제 이유']]
unregDelete
  .sort((a, b) => a.venue.localeCompare(b.venue, 'ko') || a.name.localeCompare(b.name, 'ko'))
  .forEach((r, i) => s4.push([i + 1, r.venue, r.rel, r.name, '환경장식물 학습 활용 불가 자료']))
utils.book_append_sheet(wb, utils.aoa_to_sheet(s4), '4_삭제_학습활용불가')

const outPath = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1행사장_학습자료_최종_260520.xlsx'
writeFile(wb, outPath)
console.log(`OK: ${outPath}`)
console.log(`  학습 사용 = ${learnFiles.length}건 / 삭제 = ${deleteFiles.length}건 (시스템 ${sysDelete.length} + 미등록 ${unregDelete.length})`)
