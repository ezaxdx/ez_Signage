// 정리본 안 xlsx 13건 파싱 = 학습용 추출
// 발주리스트 (제작물·환경장식물 발주) vs 양식 (홈페이지 게재 등) 자동 분류
import { readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import xlsx from 'xlsx'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else if (it.name.toLowerCase().endsWith('.xlsx')) files.push(full)
  }
  return files
}

const xlsxFiles = walk(DEST)
console.log(`xlsx 파일 = ${xlsxFiles.length}건\n`)

const KEY = ['환경', '제작물', '발주', '배너', '현수막', '시안', 'X배너', '포디움', '통천', '카테고리']
const result = []

for (const f of xlsxFiles) {
  const rel = f.replace(DEST + '/', '').replace(/\\/g, '/')
  try {
    const wb = xlsx.readFile(f)
    let isOrder = false, sampleText = ''
    for (const name of wb.SheetNames.slice(0, 3)) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false })
      const text = JSON.stringify(data.slice(0, 5))
      if (KEY.some(k => text.includes(k))) isOrder = true
      if (data.length > 0) sampleText += `[${name}]${text.slice(0, 100)}\n`
    }
    result.push({ rel, sheets: wb.SheetNames.length, isOrder, sampleText: sampleText.slice(0, 200) })
  } catch (e) {
    result.push({ rel, error: e.message?.slice(0, 80) })
  }
}

const orderFiles = result.filter(r => r.isOrder)
const otherFiles = result.filter(r => !r.isOrder && !r.error)
const errorFiles = result.filter(r => r.error)

console.log(`발주리스트 (학습 가치 ★) = ${orderFiles.length}건`)
orderFiles.forEach(r => console.log(`  · ${r.rel}`))
console.log(`\n기타 양식 (학습 가치 △) = ${otherFiles.length}건`)
otherFiles.forEach(r => console.log(`  · ${r.rel}`))
if (errorFiles.length > 0) {
  console.log(`\n에러 = ${errorFiles.length}건`)
  errorFiles.forEach(r => console.log(`  · ${r.rel} = ${r.error}`))
}

writeFileSync('scripts/xlsx_learn_result.json', JSON.stringify(result, null, 2), 'utf-8')
console.log(`\n결과 저장 = scripts/xlsx_learn_result.json`)
