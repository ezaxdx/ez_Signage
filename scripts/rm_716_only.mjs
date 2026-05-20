// 백업본에서 716건만 rm (cp 생략·이미 cp된 파일에서 삭제 대상만 정확 unlink)
import { readFileSync, readdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'

const REGISTERED = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const deleteFiles = data.result.filter(r =>
  r.status.startsWith('삭제 후보') || !REGISTERED.has(r.venue)
)
console.log(`삭제 대상 = ${deleteFiles.length}건 (시스템 + 미등록 행사장)`)

let sysOk = 0, unregOk = 0, missing = 0
for (const r of deleteFiles) {
  const target = join(DEST, r.rel)
  try {
    await rm(target, { force: true })
    if (r.status.startsWith('삭제 후보')) sysOk++
    else unregOk++
  } catch {
    missing++
  }
}
console.log(`삭제 완료 = 시스템 ${sysOk} + 미등록 ${unregOk} = ${sysOk + unregOk}건·미존재 skip ${missing}건`)

// 잔존 검증
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
console.log(`잔존 파일 = ${walk(DEST)}건 (목표 432건)`)
