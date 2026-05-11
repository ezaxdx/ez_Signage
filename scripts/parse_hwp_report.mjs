// HWP 결과보고서 본문 파싱 자동화 (§11-1 학습 자동화)
// 사용: node scripts/parse_hwp_report.mjs <hwp-path>
// 의존:
//   - hwp5html (hwp5 CLI) — pip install pyhwp
//   - 또는 한컴 오피스 자동화 (Windows only, 별도 라이센스 필요)
//
// 1차 권장: hwp5html (오픈소스, 텍스트 추출 가능)
//   설치:
//     pip install pyhwp
//     # Windows에 Python 3.x 설치 후
//     # PATH에 hwp5html.exe 추가
//
// 출력: <hwp-name>_extracted.html / .txt

import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { basename, dirname, join, resolve } from 'path'

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

async function main() {
  const hwpPath = process.argv[2]
  if (!hwpPath || !existsSync(hwpPath)) {
    console.error('사용: node scripts/parse_hwp_report.mjs <hwp-path>')
    console.error('예:   node scripts/parse_hwp_report.mjs "../../참고자료/.../WSCE 2021 결과보고_홍보.hwp"')
    process.exit(1)
  }

  console.log(`📄 입력 HWP: ${hwpPath}`)

  // hwp5html 도구 확인
  try {
    await runCmd('hwp5html', ['--version'])
  } catch {
    console.error('❌ hwp5html 가 설치되어 있지 않습니다.')
    console.error('   설치: pip install pyhwp')
    console.error('   대안: 한컴 오피스로 직접 .docx/.txt 변환 후 재처리')
    process.exit(1)
  }

  const baseName = basename(hwpPath, '.hwp')
  const outputDir = resolve(dirname(hwpPath), `_hwp_${baseName}`)

  console.log('🔄 HWP → HTML 변환 (hwp5html)...')
  await runCmd('hwp5html', ['--output', outputDir, hwpPath])

  const htmlPath = join(outputDir, 'index.xhtml')
  if (!existsSync(htmlPath)) {
    console.error('❌ 변환 실패 — index.xhtml 미생성')
    process.exit(1)
  }

  // 간단한 HTML → 텍스트 변환 (태그 제거)
  const html = readFileSync(htmlPath, 'utf-8')
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  const outputTxt = hwpPath.replace(/\.hwp$/i, '_extracted.txt')
  writeFileSync(outputTxt, text, 'utf-8')

  console.log(`✅ 텍스트 추출 완료: ${outputTxt}`)
  console.log(`   첫 200자: ${text.slice(0, 200)}`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
