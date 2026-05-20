// 삭제 리스트 v2 = 학습 미사용 자료만 (단순 3컬럼)
// 학습 사용 정의: 학습 인덱스 등록 7 행사장 폴더 안 비시스템 파일 = 학습 사용
// 학습 미사용 = 시스템 파일 + 학습 인덱스 미등록 24 행사장 = 삭제 후보
import { readFileSync } from 'fs'
import xlsx from 'xlsx'
const { utils, writeFile } = xlsx

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const { result } = data

const wb = utils.book_new()

// 등록 7 행사장 = 학습 사용·삭제 후보 X
const REGISTERED_VENUES = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

// 학습 미사용 = 시스템 + 미등록 행사장
const deleteCandidates = result.filter(r => {
  // 시스템 파일 = 무조건 삭제 후보 (등록 행사장에도 있음)
  if (r.status.startsWith('삭제 후보')) return true
  // 미등록 행사장 = 삭제 후보
  if (!REGISTERED_VENUES.has(r.venue)) return true
  // 등록 행사장 안 비시스템 = 학습 사용 = 제외
  return false
})

// 사유 단순화
function simpleReason(r) {
  if (r.status.startsWith('삭제 후보')) return '시스템 파일 (desktop.ini 등)'
  if (!REGISTERED_VENUES.has(r.venue)) return `학습 인덱스 미등록 행사장 (${r.venue})`
  return r.reason
}

// 정렬 = 시스템 → 행사장명
deleteCandidates.sort((a, b) => {
  const aSys = a.status.startsWith('삭제 후보') ? 0 : 1
  const bSys = b.status.startsWith('삭제 후보') ? 0 : 1
  if (aSys !== bSys) return aSys - bSys
  if (a.venue !== b.venue) return a.venue.localeCompare(b.venue, 'ko')
  return a.name.localeCompare(b.name, 'ko')
})

// Sheet 0 : 요약
const sysCount = deleteCandidates.filter(r => r.status.startsWith('삭제 후보')).length
const unregCount = deleteCandidates.filter(r => !REGISTERED_VENUES.has(r.venue) && !r.status.startsWith('삭제 후보')).length

const s0 = [
  ['G드라이브 AI 학습자료 — 학습 미사용 자료 삭제 리스트 (2026-05-20)'],
  [''],
  ['작성', '조기흠 사원·AXDX팀'],
  [''],
  ['삭제 대상 총계', `${deleteCandidates.length}건`],
  ['  · 시스템 파일 (desktop.ini 등)', `${sysCount}건`],
  ['  · 학습 인덱스 미등록 행사장 24개', `${unregCount}건`],
  [''],
  ['학습 사용 자료 (보존)', '432건 = 등록 7 행사장 폴더 안 비시스템 파일'],
  ['  · 등록 7 행사장', 'COEX·KINTEX·송도컨벤시아·ICC 제주·DDP·그랜드하얏트서울·더 플라자 호텔 서울'],
]
utils.book_append_sheet(wb, utils.aoa_to_sheet(s0), '요약')

// Sheet 1 : 삭제 리스트 본체 (경로·파일명·삭제이유)
const s1 = [['No', '경로', '파일명', '삭제이유']]
deleteCandidates.forEach((r, i) => {
  s1.push([i + 1, r.rel, r.name, simpleReason(r)])
})
utils.book_append_sheet(wb, utils.aoa_to_sheet(s1), '삭제리스트')

const outPath = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/G드라이브_삭제리스트_v2_260520.xlsx'
writeFile(wb, outPath)
console.log(`OK: ${outPath} (${deleteCandidates.length}건 = 시스템 ${sysCount} + 미등록 ${unregCount})`)
