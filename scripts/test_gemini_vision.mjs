// Gemini Vision으로 시안 이미지 → 슬롯 bbox 추출 프로토타입
// 명세 6.1.b.ii — "환경장식물 별 공통 양식 (객체 위치 및 크기 조사)"
// 실행: node scripts/test_gemini_vision.mjs

import { readFileSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env.local')
const env = readFileSync(envPath, 'utf-8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 미설정')
  process.exit(1)
}

const SAMPLE_IMAGE = process.argv[2]
  || 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별/코엑스/2018 스마트국토엑스포 183080/엑스배너 (1).png'

console.log(`이미지: ${SAMPLE_IMAGE.split('/').pop()}`)
const imageBuf = readFileSync(SAMPLE_IMAGE)
const imageBase64 = imageBuf.toString('base64')
const mimeType = SAMPLE_IMAGE.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
console.log(`크기: ${(imageBuf.length / 1024).toFixed(1)}KB / MIME: ${mimeType}`)

const SYSTEM = `당신은 MICE 행사 환경장식물 디자인 분석 전문가입니다.
주어진 환경장식물(배너/현수막/포디움/사인) 시안 이미지를 분석해서:
1. 모든 텍스트·이미지 영역의 위치와 크기를 0~1000 정규화 bbox로 추출
2. 각 영역의 역할(헤더·타이틀·서브타이틀·본문·로고·QR·이미지) 분류
3. 전체 레이아웃 패턴 요약

응답은 JSON 한 덩어리:
{
  "slots": [
    {"key": "header_brand", "label": "주최기관", "role": "logo", "box": {"xmin": 100, "ymin": 50, "xmax": 900, "ymax": 150}}
  ],
  "layout_pattern": "중앙 타이포그래피 강조 + 하단 로고 배치 등",
  "dominant_color": "다크네이비",
  "estimated_signage_type": "x_banner / vertical_banner 등",
  "summary": "1~2문장 요약"
}`

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const start = Date.now()
const res = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: '이 환경장식물 시안의 레이아웃 DNA를 분석하세요.' }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  }),
})

const elapsed = Date.now() - start
console.log(`\n--- 응답 (${elapsed}ms) ---`)

if (!res.ok) {
  console.error(`❌ HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}

const data = await res.json()
if (data.error) { console.error('❌', data.error.message); process.exit(1) }

const finishReason = data.candidates?.[0]?.finishReason
console.log(`finishReason: ${finishReason}`)

const text = data.candidates?.[0]?.content?.parts?.[0]?.text
if (!text) { console.error('❌ 응답 비어있음'); process.exit(1) }

const raw = text.replace(/```json|```/g, '').trim()
let parsed
try { parsed = JSON.parse(raw) } catch (e) {
  console.error('❌ JSON 파싱 실패:', e.message)
  console.log('원문:', raw.slice(0, 500))
  process.exit(1)
}

console.log(`\n✓ 추출된 슬롯 ${parsed.slots?.length ?? 0}개`)
console.log(`✓ 레이아웃 패턴: ${parsed.layout_pattern}`)
console.log(`✓ 추정 종류: ${parsed.estimated_signage_type}`)
console.log(`✓ 도미넌트 컬러: ${parsed.dominant_color}`)
console.log(`✓ 요약: ${parsed.summary}`)
console.log(`\n--- 슬롯 상세 ---`)
for (const s of (parsed.slots || []).slice(0, 10)) {
  const w = s.box.xmax - s.box.xmin
  const h = s.box.ymax - s.box.ymin
  console.log(`  [${s.key}] ${s.label} (${s.role}) — ${s.box.xmin},${s.box.ymin} ${w}×${h}`)
}

console.log(`\n✅ Gemini Vision 동작 확인 (총 ${elapsed}ms)`)
