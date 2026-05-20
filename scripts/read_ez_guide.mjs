// EZ 폴더링 가이드 xlsx 읽기
import xlsx from 'xlsx'
const wb = xlsx.readFile('C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무 자동화/계약서 표준 양식 자동 작성/07_사내_데이터허브_샘플/EZ 프로젝트 폴더링 가이드_250110.xlsx')

console.log('시트:', wb.SheetNames)
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name]
  const data = xlsx.utils.sheet_to_json(ws, { header: 1, blankrows: false })
  console.log(`\n=== ${name} (${data.length}행) ===`)
  // 환경장식물·시공·부스·디지털·스티커 키워드 매칭 행만
  const KEYWORDS = ['환경장식', '시공', '부스', '디지털', '스티커', '40.15', '제작물', '발주', '사인']
  data.forEach((row, i) => {
    const text = JSON.stringify(row)
    if (KEYWORDS.some(k => text.includes(k))) {
      console.log(`[${i}]`, row.slice(0, 8).join(' | '))
    }
  })
}
