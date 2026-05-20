// hwp/hwpx 29건 G드라이브에서 정리본으로 복원 (변환 후 학습 영역)
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { cp } from 'fs/promises'
import { join, dirname } from 'path'

const SRC = 'G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const REGISTERED = new Set(['그랜드하얏트서울', '더 플라자 호텔 서울', '송도컨벤시아', 'COEX', 'DDP', 'ICC 제주', 'KINTEX'])

const data = JSON.parse(readFileSync('scripts/scan_unused.json', 'utf-8'))
const targets = data.result.filter(r =>
  REGISTERED.has(r.venue) && !r.status.startsWith('삭제 후보') && (r.ext === 'hwp' || r.ext === 'hwpx')
)
console.log(`복원 대상 = ${targets.length}건`)

let ok = 0, fail = 0
for (const r of targets) {
  const srcPath = join(SRC, r.rel)
  const destPath = join(DEST, r.rel)
  try {
    mkdirSync(dirname(destPath), { recursive: true })
    await cp(srcPath, destPath, { force: true })
    ok++
  } catch (e) {
    fail++
    console.log(`  FAIL: ${r.rel} = ${e.message?.slice(0, 80)}`)
  }
}
console.log(`복원 완료 = ${ok}건·실패 = ${fail}건`)
