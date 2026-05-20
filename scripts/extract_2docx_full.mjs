// 학습 가치 ★ 2건 전체 텍스트 추출 → 시설 정보 확인
import { readFileSync, writeFileSync } from 'fs'
import JSZip from 'jszip'

const FILES = [
  'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520/7.주최자신고서류.docx',
  'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520/DDP 행사신고서(대관일 기준 7일전 제출용)_25.12..docx',
]

async function extract(file) {
  const buf = readFileSync(file)
  const zip = await JSZip.loadAsync(buf)
  const doc = zip.file('word/document.xml')
  if (!doc) return ''
  const xml = await doc.async('string')
  const texts = []
  const r = /<w:t[^>]*>([^<]+)<\/w:t>/g
  let m
  while ((m = r.exec(xml)) !== null) texts.push(m[1])
  return texts.join(' ')
}

for (const f of FILES) {
  console.log('\n=========================')
  console.log(f.split('/').pop())
  console.log('=========================')
  const t = await extract(f)
  console.log(t.slice(0, 3000))
  writeFileSync(`scripts/docx_extract_${f.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}.txt`, t, 'utf-8')
}
