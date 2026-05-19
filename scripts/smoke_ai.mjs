#!/usr/bin/env node
/**
 * AI 연결 스모크 테스트 — Gemini 실제 호출 검증
 *
 * 사용법:
 *   node scripts/smoke_ai.mjs
 *   npm run smoke:ai
 *
 * 검증 항목:
 *   1. .env.local GEMINI_API_KEY 존재
 *   2. Gemini API 실제 호출 응답 (간단한 텍스트 생성)
 *   3. responseSchema 강제 JSON 파싱
 *   4. 한국어 처리 (환경장식물 추천)
 *
 * 5/22 사용자 명시 = "AI 연결 등 기능 완벽?"  →  객관 검증 도구화
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// .env.local 파싱 (dotenv 없이)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()
const KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

const results = []
function report(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
  console.log(`  ${mark}  ${name}${detail ? ' — ' + detail : ''}`)
}

console.log('\n━━ AI 연결 스모크 테스트 (Gemini 2.5 Flash) ━━\n')

// 1) GEMINI_API_KEY 존재
console.log('[1] 환경 변수')
if (KEY && KEY.startsWith('AIzaSy')) {
  report('GEMINI_API_KEY 존재 (AIzaSy 형식)', true, `${KEY.slice(0, 10)}...`)
} else if (KEY) {
  report('GEMINI_API_KEY 존재 (형식 확인 필요)', true, KEY.slice(0, 10))
} else {
  report('GEMINI_API_KEY', false, '.env.local 또는 환경 변수 누락')
  console.log('\n→ .env.local에 GEMINI_API_KEY=AIzaSy... 추가 필요\n')
  process.exit(1)
}

// 2) Gemini API 실제 호출 (간단 응답)
console.log('\n[2] Gemini API 실제 호출')
try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`
  const t0 = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: '한국어로 1+1 결과만 숫자로 답하세요.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 10 },
    }),
  })
  const elapsed = Date.now() - t0
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    report(`HTTP ${res.status}`, false, err.slice(0, 100))
  } else {
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    report(`응답 OK (${elapsed}ms)`, true, `text="${text.trim().slice(0, 30)}"`)
  }
} catch (e) {
  report('Gemini 호출 실패', false, e.message)
}

// 3) responseSchema 강제 JSON 파싱
console.log('\n[3] responseSchema JSON 파싱')
try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: '한국 환경장식물 X배너 표준 규격(mm)을 알려주세요.' }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            width_mm: { type: 'number' },
            height_mm: { type: 'number' },
          },
          required: ['category', 'width_mm', 'height_mm'],
        },
      },
    }),
  })
  if (!res.ok) {
    report(`HTTP ${res.status}`, false)
  } else {
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text)
    if (parsed.category && parsed.width_mm && parsed.height_mm) {
      report('스키마 강제 JSON 응답', true, `${parsed.category} ${parsed.width_mm}×${parsed.height_mm}`)
    } else {
      report('스키마 JSON 필드 누락', false, JSON.stringify(parsed).slice(0, 80))
    }
  }
} catch (e) {
  report('스키마 호출 실패', false, e.message)
}

// 요약
const total = results.length
const passed = results.filter(r => r.ok).length
const failed = total - passed

console.log('\n━━ 요약 ━━')
console.log(`   총 검사: ${total}`)
console.log(`   \x1b[32m✓ 통과:\x1b[0m ${passed}`)
if (failed > 0) console.log(`   \x1b[31m✗ 실패:\x1b[0m ${failed}`)

if (failed === 0) {
  console.log('\n\x1b[32m✓ AI 연결 정상 — Gemini 실제 응답 가능\x1b[0m')
  console.log('  라이브에서 새 프로젝트 → AI 추천 받기 클릭 시 실제 호출됨\n')
  process.exit(0)
} else {
  console.log('\n\x1b[31m✗ AI 연결 문제 — 위 실패 항목 확인\x1b[0m\n')
  process.exit(1)
}
