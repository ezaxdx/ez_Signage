// 한국어 매뉴얼 OCR 자동화 (§11-1 학습 자동화)
// 사용: node scripts/ocr_korean_manual.mjs <pdf-path>
// 의존:
//   1) pdftoppm (poppler-utils) — PDF → 이미지
//   2) tesseract (한국어 traineddata) — 이미지 → 텍스트
// 설치:
//   Windows:
//     - poppler: https://github.com/oschwartz10612/poppler-windows/releases
//     - tesseract: https://github.com/UB-Mannheim/tesseract/wiki + 한국어 traineddata
//   macOS: brew install poppler tesseract tesseract-lang
//   Linux: apt install poppler-utils tesseract-ocr tesseract-ocr-kor

import { spawn } from 'child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from 'fs'
import { basename, join, resolve, dirname } from 'path'

function runCmd(cmd, args, options = {}) {
  return new Promise((resolveP, rejectP) => {
    const p = spawn(cmd, args, { stdio: 'pipe', ...options })
    let stdout = ''
    let stderr = ''
    p.stdout.on('data', d => stdout += d.toString())
    p.stderr.on('data', d => stderr += d.toString())
    p.on('error', rejectP)
    p.on('exit', code => code === 0 ? resolveP({ stdout, stderr }) : rejectP(new Error(`${cmd} exit ${code}: ${stderr}`)))
  })
}

async function checkTool(cmd) {
  try {
    await runCmd(cmd, ['--version'])
    return true
  } catch { return false }
}

async function main() {
  const pdfPath = process.argv[2]
  if (!pdfPath || !existsSync(pdfPath)) {
    console.error('사용: node scripts/ocr_korean_manual.mjs <pdf-path>')
    console.error('예:   node scripts/ocr_korean_manual.mjs "../../참고자료/도면/KINTEX/8.전시주최자매뉴얼.pdf"')
    process.exit(1)
  }

  console.log(`📄 입력 PDF: ${pdfPath}`)

  // 1) 필수 도구 확인
  const hasPdftoppm = await checkTool('pdftoppm')
  const hasTesseract = await checkTool('tesseract')

  if (!hasPdftoppm) {
    console.error('❌ pdftoppm (poppler-utils) 가 설치되어 있지 않습니다.')
    console.error('   Windows: https://github.com/oschwartz10612/poppler-windows/releases')
    console.error('   macOS:   brew install poppler')
    console.error('   Linux:   sudo apt install poppler-utils')
    process.exit(1)
  }
  if (!hasTesseract) {
    console.error('❌ tesseract OCR 가 설치되어 있지 않습니다.')
    console.error('   Windows: https://github.com/UB-Mannheim/tesseract/wiki')
    console.error('   한국어 traineddata 필수 (kor.traineddata)')
    process.exit(1)
  }

  // 2) 임시 작업 폴더
  const baseName = basename(pdfPath, '.pdf')
  const workDir = resolve(dirname(pdfPath), `_ocr_${baseName}`)
  mkdirSync(workDir, { recursive: true })

  // 3) PDF → 이미지 (300dpi)
  console.log('🔄 PDF → 이미지 변환 (pdftoppm, 300dpi)...')
  await runCmd('pdftoppm', ['-r', '300', '-png', pdfPath, join(workDir, 'page')])
  const images = readdirSync(workDir).filter(f => f.endsWith('.png')).sort()
  console.log(`  ${images.length}개 페이지 변환 완료`)

  // 4) 각 페이지 OCR
  console.log('🔄 한국어 OCR (Tesseract)...')
  const fullText = []
  for (const img of images) {
    const imgPath = join(workDir, img)
    const outPath = join(workDir, img.replace('.png', ''))
    await runCmd('tesseract', [imgPath, outPath, '-l', 'kor+eng', '--psm', '6'])
    const text = readFileSync(outPath + '.txt', 'utf-8')
    fullText.push(`\n=== ${img} ===\n${text}`)
    process.stdout.write('.')
  }
  console.log('')

  // 5) 결과 저장
  const outputPath = pdfPath.replace(/\.pdf$/i, '_ocr_korean.txt')
  writeFileSync(outputPath, fullText.join('\n'), 'utf-8')
  console.log(`✅ OCR 결과 저장: ${outputPath}`)

  // 6) 임시 폴더 삭제
  rmSync(workDir, { recursive: true, force: true })
  console.log('🧹 임시 파일 정리 완료')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
