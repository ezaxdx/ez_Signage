// v9 = v8 + 시트 5 (시설 가이드 99건·미등록 24 행사장 영역)
import { readFileSync } from 'fs'
import xlsx from 'xlsx'

const OUT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/260520_ez_signage2_training.xlsx'

// 기존 xlsx 4 시트 그대로 읽기
const wb = xlsx.readFile(OUT)

// 시트 5 신규 = 시설 가이드 인덱스
const facilityData = JSON.parse(readFileSync('scripts/facility_guides_260521.json', 'utf-8'))
console.log(`시트 5 영역 = ${facilityData.length}건`)

// L1 표준명 매핑
const L1_MAP = {
  'BEXCO':'벡스코(BEXCO)','EXCO':'대구컨벤션센터(EXCO)','DCC':'대전컨벤션센터(DCC)',
  'HICO':'경주화백컨벤션센터(HICO)','CECO':'창원컨벤션센터(CECO)','SETEC':'서울무역전시컨벤션센터(SETEC)',
  'GSCO':'광주김대중컨벤션센터(GSCO)','김대중컨벤션센터':'광주김대중컨벤션센터(GSCO)',
  'GUMICO':'구미컨벤션센터(GUMICO)','UECO':'울산컨벤션센터(UECO)','KSPO DOME':'올림픽공원체육관(KSPO)',
  'THE_SHILLA':'서울신라호텔','수원컨벤션센터':'수원컨벤션센터','소노캄 모음':'소노캄',
  '정부세종컨벤션센터':'정부세종컨벤션센터','롯데호텔 제주':'롯데호텔 제주',
  '조선팰리스 강남(그랜드인터콘티넨탈 파르나스)':'조선팰리스 강남',
  '안동국제컨벤션센터':'안동국제컨벤션센터','여수엑스포컨벤션센터':'여수엑스포컨벤션센터',
}

const s5 = [['#', '행사장 (PR#3 표준)', '파일명', '경로', '카테고리', '확장자', '활용 영역']]
const usageMap = {
  '시설 가이드·매뉴얼': 'AI 추천 시 행사장 시설 정보 보강 (천장고·리깅·하중)',
  '평면도·도면': 'AI 추천 시 행사장 구조 안내',
  '리깅·하중·천장 정보': '천정배너·디지털 사이니지 추천 시 하중 검증',
  '시설 운영 규정': '시설 가이드 패널 (설치 가능·금지 조건)',
  '환경장식물 발주리스트': '학습 풀 직접 진입 영역 (수량·규격)',
  '대관·임대 양식': '운영 안내 영역',
  '요율·가격표': '예산 추정 영역',
  '기타 (시설 영역 가능성)': '추가 검토',
}
facilityData
  .sort((a, b) => {
    const va = L1_MAP[a.venue_raw] || a.venue_raw
    const vb = L1_MAP[b.venue_raw] || b.venue_raw
    return va.localeCompare(vb, 'ko') || a.file.localeCompare(b.file, 'ko')
  })
  .forEach((d, i) => s5.push([
    i + 1,
    L1_MAP[d.venue_raw] || d.venue_raw,
    d.file,
    d.path,
    d.category,
    d.ext,
    usageMap[d.category] || '기타',
  ]))
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(s5), '시설_가이드')

// 시트 4 (삭제 리스트) 끝에 v9 작업 로그 추가
const s4Sheet = wb.Sheets['삭제_리스트']
const s4Data = xlsx.utils.sheet_to_json(s4Sheet, { header: 1 })
s4Data.push(['', '', '', '', ''])
s4Data.push(['─── v9 보강 (5/21) ───', '', '', '', ''])
s4Data.push(['미등록 24 행사장 안 시설 가이드 자료', facilityData.length + '건 인덱스 추가 (시트 5)', '', '', ''])
s4Data.push(['cp 복구 시도', 'G드라이브 timeout·재시도 영역 (robocopy 필요)', '', '', ''])
const newS4 = xlsx.utils.aoa_to_sheet(s4Data)
wb.Sheets['삭제_리스트'] = newS4

xlsx.writeFile(wb, OUT)
console.log(`완료: ${OUT}`)
console.log(`  시트 5 (시설_가이드): ${facilityData.length}건`)

// 카테고리·행사장별 통계
const byCat = {}
const byVenue = {}
for (const d of facilityData) {
  byCat[d.category] = (byCat[d.category] || 0) + 1
  const v = L1_MAP[d.venue_raw] || d.venue_raw
  byVenue[v] = (byVenue[v] || 0) + 1
}
console.log('\n=== 카테고리 ===')
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(3)}건  ${c}`))
console.log('\n=== 행사장 ===')
Object.entries(byVenue).sort((a, b) => b[1] - a[1]).forEach(([v, n]) => console.log(`  ${String(n).padStart(3)}건  ${v}`))
