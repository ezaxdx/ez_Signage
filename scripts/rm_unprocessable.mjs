// 학습 진행 불가 83건 추가 삭제 (ai·hwp·dwg·hwpx)
import { readFileSync, readdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'

const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const REGISTERED = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])
const UNPROCESSABLE = new Set(['ai', 'hwp', 'dwg', 'hwpx'])

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const targets = data.result.filter(r =>
  REGISTERED.has(r.venue) && !r.status.startsWith('삭제 후보') && UNPROCESSABLE.has(r.ext)
)
console.log(`삭제 대상 = ${targets.length}건`)

let ok = 0, missing = 0
for (const r of targets) {
  try {
    await rm(join(DEST, r.rel), { force: true })
    ok++
  } catch {
    missing++
  }
}
console.log(`삭제 완료 = ${ok}건·미존재 skip = ${missing}건`)

function walk(dir) {
  let n = 0
  try { for (const it of readdirSync(dir, { withFileTypes: true })) {
    if (it.isDirectory()) n += walk(join(dir, it.name))
    else n++
  }} catch {}
  return n
}
console.log(`잔존 = ${walk(DEST)}건 (목표 349건 = 학습 진행 가능 자료만)`)
