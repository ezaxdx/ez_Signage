// 최종 정리 v2 = root 직접 파일 rm + 빈 폴더 rmdir
import { readdirSync, statSync, rmdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

console.log('[1/3] root 직접 파일 삭제 (잘못된 위치·학습 활용 X)...')
const rootFiles = readdirSync(DEST, { withFileTypes: true })
  .filter(it => it.isFile())
  .map(it => join(DEST, it.name))

let rootRm = 0
for (const f of rootFiles) {
  try { await rm(f, { force: true }); rootRm++ } catch { }
}
console.log(`  ✓ ${rootRm}/${rootFiles.length}건 삭제`)

console.log('\n[2/3] 빈 폴더 정리 (재귀)...')
function removeEmptyDirs(dir, removed = []) {
  try {
    for (const it of readdirSync(dir, { withFileTypes: true })) {
      if (it.isDirectory()) removeEmptyDirs(join(dir, it.name), removed)
    }
    const after = readdirSync(dir)
    if (after.length === 0 && dir !== DEST) {
      try { rmdirSync(dir); removed.push(dir) } catch { }
    }
  } catch { }
  return removed
}
removeEmptyDirs(DEST)
removeEmptyDirs(DEST)
const removed = removeEmptyDirs(DEST)
console.log(`  ✓ 빈 폴더 추가 정리 (재귀 3회)`)

console.log('\n[3/3] 최종 잔존 점검...')
function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push(f)
  }
  return files
}
const final = walk(DEST)
const byVenue = {}
for (const f of final) {
  const rel = f.replace(/\\/g, '/').replace(DEST + '/', '')
  const v = rel.split('/')[0]
  byVenue[v] = (byVenue[v] || 0) + 1
}
console.log(`최종 잔존 = ${final.length}건`)
Object.entries(byVenue).sort((a, b) => b[1] - a[1]).forEach(([v, c]) => console.log(`  ${c.toString().padStart(4)}건  ${v}`))
