// Vision Pro 재호출 = Gemini 2.5 Pro·시안 이미지만 (도면·서류 제외)
// 직전 Flash 영역 items 0건 = Pro로 재시도
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {}
if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY 미설정'); process.exit(1) }

const PRO_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const OUT_PATH = 'scripts/vision_pro_result.json'

const SYSTEM = `한국 MICE 행사 환경장식물 전문가. 첨부 이미지를 보고 환경장식물 정보를 추출하세요.

표준 12 카테고리 (영문 snake_case·정확히 1개 선택·다른 key 금지):
x_banner, streetlight_banner, horizontal_banner, vertical_banner, chunchen_banner, podium, route_banner, award_board, q_room, digital_signage, foam_board, picket_board

이미지에 환경장식물이 있으면 적극적으로 카테고리 식별·1개 이상 items 채움.
도면·평면도·일반 사진이면 items=[] + summary에 파일 성격 명시.

응답 JSON: { "items": [{ "category": "x_banner", "quantity": N, "width_mm": N, "height_mm": N, "material": "PET", "location": "위치", "purpose": "용도" }], "summary": "1줄 요약" }`

function getMime(name) {
  const e = name.toLowerCase().split('.').pop()
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  if (e === 'png') return 'image/png'
  return null
}

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, it.name)
    if (it.isDirectory()) walk(f, files)
    else files.push(f)
  }
  return files
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
async function call(filePath, mime) {
  const data = readFileSync(filePath).toString('base64')
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(`${PRO_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data } }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      })
      if (res.status === 429 || res.status === 503) { await sleep((a + 1) * 10000); continue }
      if (!res.ok) return { ok: false, status: res.status }
      const j = await res.json()
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text
      return { ok: true, data: JSON.parse(text || '{"items":[],"summary":""}') }
    } catch (e) { await sleep((a + 1) * 5000) }
  }
  return { ok: false, status: 0 }
}

// 시안 이미지만 (프로젝트 학습 폴더 안)
const allFiles = walk(DEST).filter(f => {
  const rel = f.replace(/\\/g, '/').replace(DEST + '/', '')
  if (!rel.includes('/프로젝트 학습/') && !rel.includes('/L2_') && !rel.includes('/L3_') && !rel.includes('/L2 미상/')) return false
  return getMime(f.split(/[\\/]/).pop())
})

let results = []
if (existsSync(OUT_PATH)) {
  try { results = JSON.parse(readFileSync(OUT_PATH, 'utf-8')) } catch {}
}
const done = new Set(results.map(r => r.path))
const todo = allFiles.filter(f => !done.has(f))
console.log(`Vision Pro 대상 = ${todo.length}건 (이전 ${results.length}건 resume)\n`)

let ok = 0, items = 0, fail = 0
for (let i = 0; i < todo.length; i++) {
  const f = todo[i]
  const name = f.split(/[\\/]/).pop()
  process.stdout.write(`[${i+1}/${todo.length}] ${name.slice(0, 50)} ... `)
  const r = await call(f, getMime(name))
  if (r.ok) {
    results.push({ path: f, items: r.data.items || [], summary: r.data.summary || '' })
    ok++
    const n = (r.data.items || []).length
    if (n > 0) items += n
    console.log(`✓ ${n}개`)
  } else {
    results.push({ path: f, error: r.status })
    fail++
    console.log(`✗ ${r.status}`)
  }
  if ((i + 1) % 5 === 0) writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf-8')
  await sleep(4000) // Pro = 더 느린 rate limit
}
writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf-8')
console.log(`\n완료: 성공 ${ok}·실패 ${fail}·items 추출 ${items}개`)
