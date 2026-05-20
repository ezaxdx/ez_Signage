// scan_unused_files_result_260520.json → xlsx 6 시트 보고서 변환
import { readFileSync } from 'fs'
import xlsx from 'xlsx'
const { utils, writeFile } = xlsx

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const { totalFiles, venueStats, result } = data

const wb = utils.book_new()

// Sheet 1 : 결론·요청·기한
const s1 = [
  ['[검토 요청] G드라이브 AI 학습자료 미사용 파일 정리 보고 (2026-05-20·D-2)'],
  [''],
  ['작성', '조기흠 사원·AXDX팀'],
  ['대상', '정호연 팀장·곽은경 이사·김연아 대리'],
  ['SOT 폴더', 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장/'],
  ['학습 인덱스 SOT', 'lib/data/v3/eventLearningIndexSeed.ts (5/19·18 행사·sample_files 3개씩·총 345 학습 파일)'],
  [''],
  ['요약'],
  ['총 행사장', '31개 (학습 인덱스 등록 7 + 미등록 24)'],
  ['총 파일', `${totalFiles}건`],
  [''],
  ['4 분류'],
  ['① 학습 사용 (sample_files SOT 명시)', '44건', '보존'],
  ['② 미명시 (인덱스 등록 행사장 안 sample 외)', '388건', '보수 보존 (사용자 결정)'],
  ['③ 삭제 후보 (시스템·메타·desktop.ini)', '245건', '객관 삭제 가능'],
  ['④ 학습 인덱스 미등록 행사장 (24 행사장)', '471건', '인덱스 추가 검토 OR 삭제 결정'],
  [''],
  ['결론·요청·기한'],
  ['결론', '객관 삭제 가능 245건 (desktop.ini 31건 + 기타 시스템) + 미등록 행사장 24개 (471 파일) 정리 결정 영역'],
  ['요청', '4 분류별 사용자 결정 후 일괄 정리 (스크립트 진행)'],
  ['기한', '5/22 라이브 전 정리 완료 권장'],
]
utils.book_append_sheet(wb, utils.aoa_to_sheet(s1), '0_요약')

// Sheet 2 : 행사장별 통계
const s2Header = ['행사장', '총 파일', '학습 명시', '미명시 (보수)', '시스템 (삭제 후보)', '미등록 (인덱스 X)']
const s2Rows = [s2Header]
for (const [v, st] of Object.entries(venueStats)) {
  s2Rows.push([v, st.total, st.learned, st.unmarked, st.sysFile, st.unregistered])
}
s2Rows.push(['', '', '', '', '', ''])
s2Rows.push(['합계', totalFiles,
  Object.values(venueStats).reduce((s, x) => s + x.learned, 0),
  Object.values(venueStats).reduce((s, x) => s + x.unmarked, 0),
  Object.values(venueStats).reduce((s, x) => s + x.sysFile, 0),
  Object.values(venueStats).reduce((s, x) => s + x.unregistered, 0)])
utils.book_append_sheet(wb, utils.aoa_to_sheet(s2Rows), '1_행사장별_통계')

// Sheet 3 : 삭제 후보 (시스템·메타) — 객관
const s3 = [['행사장', '경로', '파일명', '확장자', '크기 (B)', '사유']]
for (const r of result.filter(x => x.status.startsWith('삭제 후보'))) {
  s3.push([r.venue, r.rel, r.name, r.ext, r.size, r.reason])
}
utils.book_append_sheet(wb, utils.aoa_to_sheet(s3), '2_삭제후보_시스템')

// Sheet 4 : 미등록 행사장 (24 행사장)
const s4 = [['행사장', '경로', '파일명', '확장자', '크기 (B)', '사유']]
for (const r of result.filter(x => x.status.startsWith('학습 인덱스 미등록'))) {
  s4.push([r.venue, r.rel, r.name, r.ext, r.size, r.reason])
}
utils.book_append_sheet(wb, utils.aoa_to_sheet(s4), '3_미등록행사장')

// Sheet 5 : 미명시 (보수 보존)
const s5 = [['행사장', '경로', '파일명', '확장자', '크기 (B)', '사유']]
for (const r of result.filter(x => x.status.startsWith('미명시'))) {
  s5.push([r.venue, r.rel, r.name, r.ext, r.size, r.reason])
}
utils.book_append_sheet(wb, utils.aoa_to_sheet(s5), '4_미명시_보수보존')

// Sheet 6 : 학습 사용 (SOT)
const s6 = [['행사장', '경로', '파일명', '확장자', '크기 (B)', '사유']]
for (const r of result.filter(x => x.status.startsWith('학습 사용'))) {
  s6.push([r.venue, r.rel, r.name, r.ext, r.size, r.reason])
}
utils.book_append_sheet(wb, utils.aoa_to_sheet(s6), '5_학습사용_SOT')

const outPath = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무/일반 업무 메모/G드라이브_학습자료_정리_보고_260520.xlsx'
writeFile(wb, outPath)
console.log(`OK: ${outPath} (6 시트)`)
