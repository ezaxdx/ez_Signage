// 환경장식물 종류별 대표 시안 → Gemini Vision 일괄 분석 → SEED_LAYOUT_DNA
// 명세 6.1.b.ii — "환경장식물 별 공통 양식 (객체 위치 및 크기 조사)"
// 실행: node scripts/batch_vision_analysis.mjs

import { readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env.local')
const env = readFileSync(envPath, 'utf-8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

// 환경장식물 종류별 대표 이미지 (수동 큐레이션)
// 2회차 — 실패 3건 재시도 + 신규 종류 추가
const SAMPLES = [
  // 실패 재시도
  { type_id: 'x_banner_v2',        file: '2035 국가 온실가스 감축목표 대국민 공개 논의 251015/X배너_접수처 (1).jpg' },
  { type_id: 'horizontal_banner_v2', file: '코엑스/2018 스마트국토엑스포 183080/가로배너.png' },
  { type_id: 'i_banner',           file: '코엑스/2018 스마트국토엑스포 183080/무대 아이배너.png' },
  // 신규 종류 추가
  { type_id: 'streetlight_banner', file: 'ICC JEJU 및 인근호텔/APEC 중소기업 장관회의 251004 (15,218㎡)/APEC중기장관회의-롯데호텔가로등배너-01.png' },
  { type_id: 'a4_portrait',        file: 'ICC JEJU 및 인근호텔/APEC 중소기업 장관회의 251004 (15,218㎡)/영접A4.png' },
  { type_id: 'a3_portrait',        file: '[핵심] 높음이상/ICC JEJU 한라홀/2025 APEC 중소기업실무그룹 워크숍 251009 (643㎡)/APEC중기장관회의-A3안내POP-01.png' },
  { type_id: 'backwall',           file: '2020 글로벌 코리아 박람회 LH전시부스 및 LH로드쇼 (LH GBC) 202140-1/★ 2020 글로벌코리아박람회_부대행사(컨설팅)_백월현수막_최종 시안(1204).jpg' },
]

const SYSTEM = `당신은 MICE 행사 환경장식물 디자인 분석 전문가입니다.
시안 이미지의 슬롯(객체) 위치·크기·역할을 추출하세요.

응답 JSON:
{
  "slots": [
    {"key": "header_brand", "label": "주최기관", "role": "logo", "box": {"xmin": 0, "ymin": 0, "xmax": 1000, "ymax": 1000}}
  ],
  "layout_pattern": "한 줄 패턴 설명",
  "estimated_signage_type": "x_banner / vertical_banner / horizontal_banner / i_banner / podium / foamboard / chunchen_banner / backwall / a4 / a3 중 하나",
  "dominant_color": "도미넌트 컬러 한국어",
  "summary": "1줄 요약"
}

box는 0~1000 정규화. role은 logo/title/subtitle/body/footer/image/arrow/qr 중 하나.`

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function analyze(filePath, typeId) {
  const buf = readFileSync(filePath)
  const sizeKB = (buf.length / 1024).toFixed(1)
  const mimeType = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  const base64 = buf.toString('base64')

  const start = Date.now()
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: `이 환경장식물(추정: ${typeId}) 시안의 레이아웃 DNA를 추출하세요.` }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16000,           // 1회차 실패: 토큰 한계 — 16k로 확대
        responseMimeType: 'application/json',
      },
    }),
  })

  const elapsed = Date.now() - start
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, elapsed, sizeKB }
  }
  const data = await res.json()
  if (data.error) return { error: data.error.message, elapsed, sizeKB }

  const finishReason = data.candidates?.[0]?.finishReason
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { error: '응답 비어있음', elapsed, sizeKB, finishReason }

  const raw = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(raw)
    return { ok: true, elapsed, sizeKB, finishReason, ...parsed }
  } catch (e) {
    return { error: 'JSON 파싱 실패: ' + e.message, elapsed, sizeKB, finishReason, raw: raw.slice(0, 200) }
  }
}

const results = []
console.log(`총 ${SAMPLES.length}개 시안 분석 시작\n`)

for (let i = 0; i < SAMPLES.length; i++) {
  const sample = SAMPLES[i]
  const filePath = join(ROOT, sample.file)
  const fileName = sample.file.split('/').pop()
  process.stdout.write(`[${i+1}/${SAMPLES.length}] ${sample.type_id.padEnd(20)} ${fileName.slice(0, 40)} ... `)

  try {
    statSync(filePath)
  } catch {
    console.log('❌ 파일 없음')
    results.push({ type_id: sample.type_id, file: sample.file, error: '파일 없음' })
    continue
  }

  const result = await analyze(filePath, sample.type_id)
  if (result.error) {
    console.log(`❌ ${result.error} (${result.elapsed}ms, ${result.sizeKB}KB)`)
  } else {
    console.log(`✓ ${result.slots?.length ?? 0}슬롯 (${result.elapsed}ms, ${result.sizeKB}KB)`)
  }
  results.push({ type_id: sample.type_id, file: sample.file, ...result })

  // Rate limit 회피 — 1초 대기
  await new Promise(r => setTimeout(r, 1000))
}

const ok = results.filter(r => r.ok)
const fail = results.filter(r => r.error)
console.log(`\n결과: ${ok.length} 성공 / ${fail.length} 실패`)

writeFileSync('lib/data/_layout_dna.json', JSON.stringify(results, null, 2), 'utf-8')
console.log('저장: lib/data/_layout_dna.json')
