// doc·docx·pptx·xls·xlsx 텍스트 추출 + 환경장식물·시설 키워드 검색
// docx·pptx = zip + xml 파싱·xls·xlsx = SheetJS
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'
import xlsx from 'xlsx'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

const KEYWORDS = [
  '행잉', '천장', '천정', '배너', '현수막', '통천', 'X배너', '엑스배너',
  '게이트', '외벽', '기둥', '폴대', '가로등', '포디움', '포토월',
  '리깅', '하중', '와이어', '바텐',
  '디지털', 'LED', 'DID', '사이니지', '전광판',
  '카테고리', '제작물', '환경장식물', '시안', '카탈로그',
]

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else {
      const ext = it.name.toLowerCase().split('.').pop()
      if (['doc', 'docx', 'pptx', 'xlsx', 'xls'].includes(ext)) files.push({ path: full, ext })
    }
  }
  return files
}

async function extractFromZipXml(filePath, xmlPath) {
  const buf = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buf)
  const file = zip.file(xmlPath)
  if (!file) return ''
  const xml = await file.async('string')
  const texts = []
  const r = /<(?:w|a):t[^>]*>([^<]+)<\/(?:w|a):t>/g
  let m
  while ((m = r.exec(xml)) !== null) texts.push(m[1])
  return texts.join(' ')
}

async function extractDocx(p) { return extractFromZipXml(p, 'word/document.xml') }
async function extractPptx(p) {
  const buf = readFileSync(p)
  const zip = await JSZip.loadAsync(buf)
  const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  const all = []
  for (const s of slides) all.push(await extractFromZipXml(p, s))
  return all.join(' ')
}
function extractXlsx(p) {
  try {
    const wb = xlsx.readFile(p)
    const all = []
    for (const name of wb.SheetNames) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false })
      all.push(JSON.stringify(data.slice(0, 50)))
    }
    return all.join(' ')
  } catch { return '' }
}

const files = walk(DEST)
console.log(`전체 텍스트 추출 가능 파일 = ${files.length}건\n`)

const result = []
for (const f of files) {
  const rel = f.path.replace(DEST + '/', '').replace(/\\/g, '/')
  let text = ''
  try {
    if (f.ext === 'docx') text = await extractDocx(f.path)
    else if (f.ext === 'pptx') text = await extractPptx(f.path)
    else if (f.ext === 'xlsx' || f.ext === 'xls') text = extractXlsx(f.path)
    else text = '' // doc = 별도 도구 필요 (Word COM)
  } catch (e) { result.push({ rel, ext: f.ext, error: e.message?.slice(0, 80) }); continue }
  const matches = KEYWORDS.filter(k => text.includes(k))
  result.push({ rel, ext: f.ext, length: text.length, matches, sample: text.slice(0, 200) })
}

const hi = result.filter(r => r.matches && r.matches.length >= 3)
const lo = result.filter(r => r.matches && r.matches.length > 0 && r.matches.length < 3)
const none = result.filter(r => r.matches && r.matches.length === 0)
const err = result.filter(r => r.error || (!r.matches && !r.error))

console.log(`★ 학습 가치 ≥3 키워드 = ${hi.length}건`)
hi.forEach(r => console.log(`  [${r.ext}] ${r.rel}\n      매칭: ${r.matches.join(', ')}`))

console.log(`\n△ 매칭 1~2 = ${lo.length}건`)
lo.slice(0, 20).forEach(r => console.log(`  [${r.ext}] ${r.rel} (${r.matches.join(', ')})`))

console.log(`\n✗ 매칭 0 = ${none.length}건`)
console.log(`\n? 추출 불가 (doc·에러) = ${err.length}건`)
err.forEach(r => console.log(`  [${r.ext}] ${r.rel}`))

writeFileSync('scripts/all_text_scan_result.json', JSON.stringify(result, null, 2), 'utf-8')
console.log(`\n결과 저장 = scripts/all_text_scan_result.json`)
