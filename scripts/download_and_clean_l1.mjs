// G드라이브 L1_행사장 → 로컬 백업 + 716건 정확 삭제 (학습 사용 432건만 보존)
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { cp, rm } from 'fs/promises'
import { join } from 'path'

const SRC = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

const REGISTERED = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

console.log('[1/3] G드라이브 → 로컬 백업 복사 시작...')
console.log(`    src = ${SRC}`)
console.log(`    dest = ${DEST}`)

const t1 = Date.now()
await cp(SRC, DEST, { recursive: true, force: true })
console.log(`    ✓ 완료 (${Math.round((Date.now() - t1) / 1000)}초)`)

// 삭제 716건 = 시스템 + 미등록
console.log('\n[2/3] 716건 삭제 진행...')
const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const deleteFiles = data.result.filter(r =>
  r.status.startsWith('삭제 후보') || !REGISTERED.has(r.venue)
)
console.log(`    삭제 대상 = ${deleteFiles.length}건`)

let sysCount = 0, unregCount = 0, skipped = 0
for (const r of deleteFiles) {
  const target = join(DEST, r.rel)
  try {
    await rm(target, { force: true })
    if (r.status.startsWith('삭제 후보')) sysCount++
    else unregCount++
  } catch {
    skipped++
  }
}
console.log(`    ✓ 시스템 ${sysCount}건 + 미등록 ${unregCount}건 = ${sysCount + unregCount}건 삭제·skip ${skipped}건`)

// 검증
console.log('\n[3/3] 잔존 파일 검증...')
function walk(dir) {
  let n = 0
  try {
    for (const it of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, it.name)
      if (it.isDirectory()) n += walk(f)
      else n++
    }
  } catch {}
  return n
}
const remaining = walk(DEST)
console.log(`    잔존 파일 = ${remaining}건 (목표 432건)`)
console.log(`    ${remaining === 432 ? '✓ 정확 일치' : `⚠ 차이 ${remaining - 432}건`}`)

console.log('\n완료: ', DEST)
