// 삭제 리스트 단순 3컬럼 xlsx (경로·파일명·삭제이유 + 분류 보조)
import { readFileSync } from 'fs'
import xlsx from 'xlsx'
const { utils, writeFile } = xlsx

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const { result } = data

const wb = utils.book_new()

// 학습 사용 44건 = 보존·삭제 후보 제외
const deleteCandidates = result.filter(r => !r.status.startsWith('학습 사용'))

// 1순위 sort = 분류 (시스템 → 미등록 → 미명시) + 행사장명
const PRIORITY = { '삭제 후보': 1, '학습 인덱스 미등록': 2, '미명시': 3 }
function getPriority(s) {
  for (const [k, v] of Object.entries(PRIORITY)) if (s.startsWith(k)) return v
  return 99
}
deleteCandidates.sort((a, b) => {
  const pa = getPriority(a.status), pb = getPriority(b.status)
  if (pa !== pb) return pa - pb
  if (a.venue !== b.venue) return a.venue.localeCompare(b.venue, 'ko')
  return a.name.localeCompare(b.name, 'ko')
})

// Sheet 0 : 요약
const s0 = [
  ['[검토 요청] G드라이브 AI 학습자료 삭제 리스트 (2026-05-20·D-2)'],
  [''],
  ['작성', '조기흠 사원·AXDX팀'],
  ['대상', '정호연 팀장·곽은경 이사·김연아 대리'],
  ['SOT 폴더', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장/'],
  ['학습 인덱스 SOT', 'lib/data/v3/eventLearningIndexSeed.ts (5/19·18 행사·총 345 학습 파일·sample_files SOT 명시 = 44건)'],
  [''],
  ['삭제 후보 총계', `${deleteCandidates.length}건`, '(전체 1148건 - 학습 사용 44건)'],
  [''],
  ['분류 (삭제 우선순위)'],
  ['1순위 = 시스템·메타 (desktop.ini 등)', '245건', '객관 삭제 가능·즉시 진행 권장'],
  ['2순위 = 학습 인덱스 미등록 행사장 (24 행사장)', '471건', 'BEXCO·KSPO·GUMICO·CECO·EXCO 등·인덱스 추가 OR 삭제 결정'],
  ['3순위 = 미명시 (등록 행사장 안 sample 외 파일)', '388건', '보수 보존 권장·sample 외 학습 가능성 별도 확인 영역'],
  [''],
  ['상세 시트', '시트 1 = 삭제 리스트 전체 (3컬럼 + 분류)'],
]
utils.book_append_sheet(wb, utils.aoa_to_sheet(s0), '0_요약')

// Sheet 1 : 삭제 리스트 본체 (경로·파일명·삭제이유 + 분류)
const s1 = [['No', '경로', '파일명', '삭제이유', '분류 (우선순위)']]
deleteCandidates.forEach((r, i) => {
  let category
  if (r.status.startsWith('삭제 후보')) category = '1순위 (시스템·즉시 삭제)'
  else if (r.status.startsWith('학습 인덱스 미등록')) category = '2순위 (미등록·결정 영역)'
  else category = '3순위 (미명시·보수 보존)'

  s1.push([i + 1, r.rel, r.name, r.reason, category])
})
utils.book_append_sheet(wb, utils.aoa_to_sheet(s1), '1_삭제리스트')

const outPath = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/G드라이브_삭제리스트_260520.xlsx'
writeFile(wb, outPath)
console.log(`OK: ${outPath} (2 시트·${deleteCandidates.length}건)`)
