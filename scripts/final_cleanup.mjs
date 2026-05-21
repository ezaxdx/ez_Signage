// 최종 정리 = KINTEX·그랜드하얏트 cp 복구 + HWP/ai/dwg/hwpx 삭제 + 빈 폴더 삭제
import { readdirSync, statSync, rmdirSync } from 'fs'
import { cp, rm } from 'fs/promises'
import { join } from 'path'

const SRC = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

// 1. KINTEX·그랜드하얏트 cp 복구
console.log('[1/4] KINTEX·그랜드하얏트 cp 복구...')
for (const venue of ['KINTEX', '그랜드하얏트서울']) {
  const srcPath = join(SRC, venue).replace(/\//g, '\\')
  const destPath = join(DEST, venue).replace(/\//g, '\\')
  try {
    await cp(srcPath, destPath, { recursive: true, force: true })
    console.log(`  ✓ ${venue} cp 완료`)
  } catch (e) {
    console.log(`  ✗ ${venue} fail: ${e.message?.slice(0, 80)}`)
  }
}

// 2. 잔존 안 ai·hwp·hwpx·dwg 일괄 rm
console.log('\n[2/4] 학습 활용 불가 형식 일괄 삭제 (ai·hwp·hwpx·dwg)...')
const KILL_EXT = new Set(['ai', 'hwp', 'hwpx', 'dwg'])
function walkRm(dir, killed = []) {
  try {
    for (const it of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, it.name)
      if (it.isDirectory()) walkRm(f, killed)
      else {
        const ext = it.name.split('.').pop()?.toLowerCase()
        if (KILL_EXT.has(ext)) killed.push(f)
      }
    }
  } catch { }
  return killed
}
const toKill = walkRm(DEST)
let killOk = 0
for (const f of toKill) {
  try { await rm(f, { force: true }); killOk++ } catch { }
}
console.log(`  ✓ ${killOk}/${toKill.length}건 삭제`)

// 3. 빈 폴더 rmdir (재귀)
console.log('\n[3/4] 빈 폴더 정리...')
function removeEmptyDirs(dir, removed = []) {
  try {
    const items = readdirSync(dir, { withFileTypes: true })
    for (const it of items) {
      if (it.isDirectory()) removeEmptyDirs(join(dir, it.name), removed)
    }
    const after = readdirSync(dir)
    if (after.length === 0 && dir !== DEST) {
      try { rmdirSync(dir); removed.push(dir) } catch { }
    }
  } catch { }
  return removed
}
// 2번 반복 = 빈 폴더 안 빈 폴더 재정리
removeEmptyDirs(DEST)
const removed = removeEmptyDirs(DEST)
console.log(`  ✓ 빈 폴더 ${removed.length}개 삭제`)

// 4. 최종 잔존 점검
console.log('\n[4/4] 최종 잔존 점검...')
function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push(f)
  }
  return files
}
const final = walk(DEST)
console.log(`  잔존 파일 = ${final.length}건`)

// 행사장별 카운트
const byVenue = {}
for (const f of final) {
  const rel = f.replace(/\\/g, '/').replace(DEST + '/', '')
  const v = rel.split('/')[0]
  byVenue[v] = (byVenue[v] || 0) + 1
}
console.log('\n행사장별:')
Object.entries(byVenue).sort((a, b) => b[1] - a[1]).forEach(([v, c]) => console.log(`  ${c.toString().padStart(4)}건  ${v}`))
