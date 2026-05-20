// Vision/OCR 학습 = Gemini 2.5 Flash multimodal API·jpg·png·pdf 일괄 분석
// 결과 = scripts/vision_ocr_result.json (행사장별·파일별 환경장식물 카테고리 추출)
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// .env.local 로드
const envPath = join(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {}
if (!process.env.GEMINI_API_KEY) { console.error('❌ GEMINI_API_KEY 미설정'); process.exit(1) }

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const DEST = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/L1_정리본_260520'
const RESUME_PATH = 'scripts/vision_ocr_result.json'

const SYSTEM = `당신은 한국 MICE 행사 환경장식물 전문가입니다. 첨부 이미지·PDF를 분석해 환경장식물 정보를 JSON으로 추출하세요.

표준 12 카테고리 (영문 snake_case·이 외 key 금지):
- x_banner (X배너)
- streetlight_banner (가로등 배너)
- horizontal_banner (가로 현수막)
- vertical_banner (세로 현수막)
- chunchen_banner (통천 배너)
- podium (포디움 타이틀)
- route_banner (동선 안내 배너)
- award_board (시상보드)
- q_room (Q방)
- digital_signage (디지털 사이니지)
- foam_board (폼보드)
- picket_board (피켓보드)

응답 JSON: { "items": [{ "category": "x_banner", "quantity": N, "width_mm": N, "height_mm": N, "material": "PET", "location": "장소" }], "summary": "1줄 요약·시설 정보 (천장·리깅·하중 등 포함)" }

환경장식물이 명확히 보이지 않으면 items=[]·summary에 파일 성격만 한 줄.`

function getMime(name) {
  const e = name.toLowerCase().split('.').pop()
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  if (e === 'png') return 'image/png'
  if (e === 'pdf') return 'application/pdf'
  if (e === 'gif') return 'image/gif'
  return null
}

function walk(dir, files = []) {
  for (const it of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, it.name)
    if (it.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function callGemini(filePath, mime) {
  const data = readFileSync(filePath)
  const base64 = data.toString('base64')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: base64 } }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      })
      if (res.status === 429 || res.status === 503) {
        await sleep((attempt + 1) * 8000)
        continue
      }
      if (!res.ok) return { ok: false, status: res.status }
      const json = await res.json()
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text
      return { ok: true, data: JSON.parse(text || '{"items":[],"summary":""}') }
    } catch (e) {
      await sleep((attempt + 1) * 5000)
    }
  }
  return { ok: false, status: 0 }
}

// 이전 결과 resume
let results = []
if (existsSync(RESUME_PATH)) {
  try { results = JSON.parse(readFileSync(RESUME_PATH, 'utf-8')) } catch {}
}
const done = new Set(results.map(r => r.path))

const allFiles = walk(DEST).filter(f => {
  const m = getMime(f.split('/').pop().split('\\').pop())
  return m && !done.has(f)
})
console.log(`Vision/OCR 대상 = ${allFiles.length}건 (이전 ${results.length}건 완료·resume)\n`)

let ok = 0, fail = 0
for (let i = 0; i < allFiles.length; i++) {
  const f = allFiles[i]
  const name = f.split(/[\\/]/).pop()
  const mime = getMime(name)
  const venue = f.replace(DEST + '/', '').replace(/\\/g, '/').split('/')[0]
  process.stdout.write(`[${i + 1}/${allFiles.length}] ${venue}/${name.slice(0, 40)} ... `)
  const r = await callGemini(f, mime)
  if (r.ok) {
    results.push({ path: f, venue, name, items: r.data.items || [], summary: r.data.summary || '' })
    ok++
    const cats = (r.data.items || []).map(x => x.category).join(',')
    console.log(`✓ ${(r.data.items || []).length}개 [${cats.slice(0, 50)}]`)
  } else {
    results.push({ path: f, venue, name, error: r.status })
    fail++
    console.log(`✗ HTTP ${r.status}`)
  }
  // 진행 중간 저장 (10건마다)
  if ((i + 1) % 10 === 0) writeFileSync(RESUME_PATH, JSON.stringify(results, null, 2), 'utf-8')
  await sleep(2500)
}

writeFileSync(RESUME_PATH, JSON.stringify(results, null, 2), 'utf-8')
console.log(`\n완료: 성공 ${ok}건·실패 ${fail}건·전체 ${results.length}건`)
