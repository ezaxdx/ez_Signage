// HWP→DOCX 변환본 25건 안 환경장식물·시설 키워드 검색
// docx = zip + word/document.xml → 텍스트 추출 후 키워드 매칭
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

// 환경장식물·시설 키워드 (행잉·천장·게이트·외벽·기둥·배너·리깅 등)
const KEYWORDS = [
  '행잉', '천장', '천정', '배너', '현수막', '통천', 'X배너', '엑스배너',
  '게이트', '외벽', '기둥', '폴대', '가로등', '포디움', '포토월',
  '리깅', 'rigging', '하중', '와이어', '바텐',
  '디지털', 'LED', 'DID', '사이니지', '전광판',
  '설치 가능', '설치 불가', '게재', '부착', '걸이', '시설',
  '카테고리', '제작물', '환경장식물', '시안',
]

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else if (it.name.toLowerCase().endsWith('.docx')) files.push(full)
  }
  return files
}

async function extractDocxText(filePath) {
  const buffer = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buffer)
  const doc = zip.file('word/document.xml')
  if (!doc) return ''
  const xml = await doc.async('string')
  // <w:t> 태그 안 텍스트만 추출
  const texts = []
  const regex = /<w:t[^>]*>([^<]+)<\/w:t>/g
  let m
  while ((m = regex.exec(xml)) !== null) texts.push(m[1])
  return texts.join(' ')
}

const docxFiles = walk(DEST)
console.log(`docx 파일 = ${docxFiles.length}건\n`)

const result = []
for (const f of docxFiles) {
  const rel = f.replace(DEST + '/', '').replace(/\\/g, '/')
  try {
    const text = await extractDocxText(f)
    const matches = KEYWORDS.filter(k => text.includes(k))
    result.push({ rel, length: text.length, matches, sample: text.slice(0, 300) })
  } catch (e) {
    result.push({ rel, error: e.message?.slice(0, 80) })
  }
}

// 키워드 ≥3 매칭 = 학습 가치 ★
const hi = result.filter(r => r.matches && r.matches.length >= 3)
const lo = result.filter(r => r.matches && r.matches.length > 0 && r.matches.length < 3)
const none = result.filter(r => r.matches && r.matches.length === 0)
const err = result.filter(r => r.error)

console.log(`★ 학습 가치 ≥3 키워드 = ${hi.length}건`)
hi.forEach(r => {
  console.log(`  · ${r.rel}`)
  console.log(`     매칭: ${r.matches.join(', ')}`)
})
console.log(`\n△ 학습 가치 1~2 키워드 = ${lo.length}건`)
lo.forEach(r => {
  console.log(`  · ${r.rel} (매칭: ${r.matches.join(', ')})`)
})
console.log(`\n✗ 매칭 0건 = ${none.length}건`)
none.forEach(r => console.log(`  · ${r.rel}`))
if (err.length > 0) {
  console.log(`\n에러 = ${err.length}건`)
  err.forEach(r => console.log(`  · ${r.rel} = ${r.error}`))
}

writeFileSync('scripts/hwp_docx_scan_result.json', JSON.stringify(result, null, 2), 'utf-8')
