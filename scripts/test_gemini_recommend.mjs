// Gemini 추천 엔드투엔드 테스트
// 실행: node scripts/test_gemini_recommend.mjs
// .env.local 의 GEMINI_API_KEY 자동 로드

import { readFileSync } from 'fs'
import { join } from 'path'

// .env.local 수동 로드 (dotenv 의존성 없이)
const envPath = join(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {
  console.error('❌ .env.local 로드 실패')
  process.exit(1)
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 미설정')
  process.exit(1)
}
console.log(`✓ GEMINI_API_KEY 로드됨 (${process.env.GEMINI_API_KEY.slice(0, 10)}...)`)

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM = `당신은 한국 MICE 행사 환경장식물 발주 전문가입니다.
표준 11종 (X배너·I배너·가로등배너·가로현수막·세로현수막·통천·포디움·L보드·폼보드·A4·A3) 중 적절한 항목을 추천하세요.
응답은 JSON: { "items": [{"no":"01","category":"x_banner","category_label":"X배너","width_mm":600,"height_mm":1800,"material":"PET","location":"입구","purpose":"main_promo","quantity":4,"rationale":"이유"}], "summary": "1줄 요약" }`

const TEST_INPUT = `행사명: 2026 K-MICE 테스트 컨퍼런스
행사 유형: 컨퍼런스
장소: 코엑스 그랜드볼룸
행사일: 2026-08-15
예상 참가자: 500명 (자동 분류: medium)
행사 언어: EN/KOR
국제 행사: 예 (영문 표기 필수)
사용 목적: main_promo, registration, wayfinding`

console.log('\n--- 테스트 입력 ---')
console.log(TEST_INPUT)

const start = Date.now()
const res = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: TEST_INPUT }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  }),
})

const elapsed = Date.now() - start
console.log(`\n--- 응답 (${elapsed}ms) ---`)

if (!res.ok) {
  console.error(`❌ HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}

const data = await res.json()
if (data.error) {
  console.error('❌ Gemini 에러:', data.error.message)
  process.exit(1)
}

const finishReason = data.candidates?.[0]?.finishReason
console.log(`finishReason: ${finishReason}`)
if (finishReason === 'MAX_TOKENS') {
  console.warn('⚠️ MAX_TOKENS — 응답이 잘림. maxOutputTokens 더 늘려야 함.')
}

const text = data.candidates?.[0]?.content?.parts?.[0]?.text
if (!text) {
  console.error('❌ 응답 비어있음')
  console.log(JSON.stringify(data, null, 2))
  process.exit(1)
}

const raw = text.replace(/```json|```/g, '').trim()
let parsed
try {
  parsed = JSON.parse(raw)
} catch (e) {
  console.error('❌ JSON 파싱 실패:', e.message)
  console.log('원문:', raw.slice(0, 500))
  process.exit(1)
}

if (!Array.isArray(parsed.items)) {
  console.error('❌ items 배열 없음')
  process.exit(1)
}

console.log(`✓ 추천 ${parsed.items.length}건 + summary`)
console.log(`✓ Summary: ${parsed.summary}`)
console.log(`\n--- 추천 항목 (처음 5개) ---`)
for (const it of parsed.items.slice(0, 5)) {
  console.log(`  [${it.no}] ${it.category_label} ${it.width_mm}×${it.height_mm}mm × ${it.quantity}개 — ${it.location}`)
  console.log(`       이유: ${it.rationale}`)
}

console.log(`\n✅ Gemini API 엔드투엔드 동작 확인 (총 ${elapsed}ms)`)
