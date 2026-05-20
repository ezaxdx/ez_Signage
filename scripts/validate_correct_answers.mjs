// 정답지 7건 vs Gemini 추천 결과 정확도 정량 측정
// 실행: node scripts/validate_correct_answers.mjs
// 출처: 정답지 13건 (xlsx 7·jpg 5·PDF 1) 중 xlsx 7건 직접 검증
// 비교 = 카테고리 빈도·수량 정합·규격 정확도

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// .env.local 로드
const envPath = join(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch { console.error('❌ .env.local 로드 실패'); process.exit(1) }

if (!process.env.GEMINI_API_KEY) { console.error('❌ GEMINI_API_KEY 미설정'); process.exit(1) }

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM = `당신은 한국 MICE 행사 환경장식물 발주 전문가입니다.

표준 12 카테고리 (반드시 영문 snake_case key 사용·다른 key 금지):
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

응답 = JSON: { "items": [{ "category": "x_banner", "category_label": "X배너", "quantity": N, "rationale": "이유" }], "summary": "1줄" }
주의: category 필드는 반드시 위 12 key 중 1개 영문 snake_case·한국어·다른 변형 금지.`

// 정규화 매핑 = AI 응답이 표준 key 외 변형으로 와도 표준 key로 자동 정정
const KEY_NORMALIZE = {
  // 통천
  '통천_배너': 'chunchen_banner', '통천배너': 'chunchen_banner', '통천': 'chunchen_banner',
  'ceiling_banner': 'chunchen_banner', '천정배너': 'chunchen_banner', '천장배너': 'chunchen_banner',
  // 포디움
  '포디움_타이틀': 'podium', '포디움타이틀': 'podium', '포디움': 'podium', 'podium_title': 'podium',
  // 동선
  '동선_안내_배너': 'route_banner', '동선안내배너': 'route_banner', '동선배너': 'route_banner',
  'wayfinding_banner': 'route_banner', 'directional_banner': 'route_banner',
  // X배너
  'X배너': 'x_banner', 'x배너': 'x_banner', 'x_banner_static': 'x_banner',
  // 폼보드
  '폼보드': 'foam_board', 'form_board': 'foam_board',
  // 가로
  '가로_현수막': 'horizontal_banner', '가로현수막': 'horizontal_banner',
  // 세로
  '세로_현수막': 'vertical_banner', '세로현수막': 'vertical_banner',
  // 가로등
  '가로등_배너': 'streetlight_banner', '가로등배너': 'streetlight_banner',
  // 시상
  '시상보드': 'award_board', '시상_보드': 'award_board',
  // Q방
  'Q방': 'q_room', 'q룸': 'q_room',
  // DID
  '디지털_사이니지': 'digital_signage', '디지털사이니지': 'digital_signage', 'DID': 'digital_signage',
  // 피켓
  '피켓보드': 'picket_board', '피켓_보드': 'picket_board',
}

function normalizeKey(rawKey) {
  if (!rawKey) return ''
  const k = String(rawKey).trim()
  return KEY_NORMALIZE[k] || k.toLowerCase()
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 정답지 7건 = 본 사이클 직접 분석한 발주 데이터
const TEST_CASES = [
  {
    name: 'BCWW 2018 (COEX Hall B)',
    input: `행사명: BCWW 2018 (국제방송영상마켓)\n장소: 코엑스 Hall B + 컨퍼런스룸 201-203\n행사 유형: 전시회·컨퍼런스\n예상 참가자: 5000명\n사용 목적: 메인 홍보·등록·전시·천정 배너 다수`,
    truth: { x_banner: 18, foam_board: 9, chunchen_banner: 30, podium: 1, horizontal_banner: 4, vertical_banner: 3 },
  },
  {
    name: '2018 스마트국토엑스포 (COEX D2홀)',
    input: `행사명: 2018 스마트국토엑스포\n장소: 코엑스 D2홀\n행사 유형: 전시회·박람회\n예상 참가자: 3000명\n사용 목적: 메인 홍보·등록·전시·통천·포디움 다수`,
    truth: { x_banner: 32, foam_board: 10, chunchen_banner: 6, podium: 5 },
  },
  {
    name: 'KME 2018 환영리셉션 (송도)',
    input: `행사명: KOREA MICE EXPO 2018 환영리셉션\n장소: 송도컨벤시아\n행사 유형: 컨퍼런스·환영리셉션\n예상 참가자: 2000명\n사용 목적: 등록·안내·연단·포토존`,
    truth: { x_banner: 26, foam_board: 13, podium: 9, route_banner: 9, chunchen_banner: 4 },
  },
  {
    name: 'KME 2019 (송도)',
    input: `행사명: KOREA MICE EXPO 2019\n장소: 송도컨벤시아\n행사 유형: 전시회·컨퍼런스\n예상 참가자: 3000명\n사용 목적: 다중 세션·포디움 중심`,
    truth: { podium: 9, foam_board: 3, vertical_banner: 3, chunchen_banner: 1 },
  },
  {
    name: 'DDP 정부혁신박람회 2019',
    input: `행사명: 제1회 대한민국 정부혁신박람회\n장소: DDP\n행사 유형: 박람회·체험형\n예상 참가자: 3000명\n사용 목적: 개막식·체험존·동선 안내·포토존`,
    truth: { podium: 2, foam_board: 3, x_banner: 1 },
  },
  {
    name: 'WLCF 2018 (ICC 제주)',
    input: `행사명: 제2회 세계리더스보전포럼 (WLCF 2018)\n장소: ICC 제주 5층·3층\n행사 유형: 국제회의\n예상 참가자: 2000명\n사용 목적: 5층 메인 천정·VIP 오찬·3층 한라·삼다·블로틴 보드 다수`,
    truth: { chunchen_banner: 5, vertical_banner: 5, foam_board: 7, podium: 8 },
  },
  {
    name: 'IUCN 리더스포럼 2018 (ICC 제주)',
    input: `행사명: IUCN 리더스포럼 2018\n장소: ICC 제주\n행사 유형: 국제회의\n예상 참가자: 1500명\n사용 목적: 다중 세션·포디움·폼보드 중심`,
    truth: { foam_board: 9, podium: 9, chunchen_banner: 2 },
  },
]

console.log(`✓ GEMINI_API_KEY 로드됨 (${process.env.GEMINI_API_KEY.slice(0, 10)}...)`)
console.log(`✓ 정답지 ${TEST_CASES.length}건 검증 시작\n`)

const results = []

async function callGeminiWithRetry(input, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: input }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4000, responseMimeType: 'application/json' },
        }),
      })
      if (res.status === 429 || res.status === 503) {
        const backoff = (attempt + 1) * 5000  // 5s · 10s · 15s
        console.log(`  ⏳ HTTP ${res.status} retry ${attempt+1}/${maxRetries} after ${backoff/1000}s`)
        await sleep(backoff)
        continue
      }
      if (!res.ok) return { ok: false, status: res.status, body: await res.text() }
      return { ok: true, data: await res.json() }
    } catch (e) {
      const backoff = (attempt + 1) * 3000
      console.log(`  ⏳ ${e.message} retry ${attempt+1}/${maxRetries} after ${backoff/1000}s`)
      await sleep(backoff)
    }
  }
  return { ok: false, status: 0, body: 'max retries' }
}

for (let i = 0; i < TEST_CASES.length; i++) {
  const tc = TEST_CASES[i]
  console.log(`[${i+1}/${TEST_CASES.length}] ${tc.name}`)
  const start = Date.now()
  try {
    const result = await callGeminiWithRetry(tc.input)
    const elapsed = Date.now() - start
    if (!result.ok) { console.error(`  ❌ HTTP ${result.status}: ${result.body?.slice(0, 100)}`); results.push({ name: tc.name, error: `HTTP ${result.status}` }); await sleep(3000); continue }
    const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) { console.error('  ❌ 응답 없음'); results.push({ name: tc.name, error: '응답 없음' }); await sleep(3000); continue }
    const parsed = JSON.parse(text)
    const items = parsed.items || []

    // 추천 카테고리 빈도 집계 (정규화 적용)
    const recCats = {}
    const rawKeys = []
    for (const item of items) {
      const rawCat = item.category || ''
      const cat = normalizeKey(rawCat)
      const qty = Number(item.quantity) || 0
      recCats[cat] = (recCats[cat] || 0) + qty
      if (rawCat !== cat) rawKeys.push(`${rawCat}→${cat}`)
    }

    // 정답지 vs 추천 비교
    const truth = tc.truth
    const allCats = new Set([...Object.keys(truth), ...Object.keys(recCats)])
    const matrix = []
    let matchScore = 0
    let totalScore = 0
    for (const cat of allCats) {
      const t = truth[cat] || 0
      const r = recCats[cat] || 0
      const diff = Math.abs(t - r)
      const ratio = t > 0 ? Math.max(0, 1 - diff / Math.max(t, r)) : (r === 0 ? 1 : 0)
      matrix.push({ cat, truth: t, recommended: r, diff, ratio: Math.round(ratio * 100) })
      matchScore += ratio
      totalScore += 1
    }
    const accuracy = Math.round((matchScore / totalScore) * 100)
    const normalizedNote = rawKeys.length > 0 ? ` · 정규화 ${rawKeys.length}건` : ''
    console.log(`  → 정확도 ${accuracy}% / ${elapsed}ms / 추천 ${items.length} 항목${normalizedNote}`)

    results.push({ name: tc.name, accuracy, elapsed, itemCount: items.length, matrix, summary: parsed.summary, normalized: rawKeys })
    await sleep(2500)  // API rate limit 회피·다음 호출 전 2.5초 대기
  } catch (e) {
    console.error(`  ❌ ${e.message}`)
    results.push({ name: tc.name, error: e.message })
    await sleep(3000)
  }
}

// 결과 저장
const outDir = join(process.cwd(), 'docs', 'validation')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `validation_260520.json`)
writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8')

// 요약
console.log('\n━━ 정확도 요약 ━━')
const valid = results.filter(r => r.accuracy != null)
const avgAcc = valid.length > 0 ? Math.round(valid.reduce((s, r) => s + r.accuracy, 0) / valid.length) : 0
for (const r of valid) console.log(`  ${r.accuracy.toString().padStart(3)}% · ${r.name}`)
console.log(`\n  평균 정확도 = ${avgAcc}% (${valid.length}/${TEST_CASES.length} 행사)`)
console.log(`  결과 저장 = ${outPath}`)
