// Gemini Vision으로 행사장 도면(이미지/PDF) → 텍스트 분석
// 회의록 ′학습해 가지고 텍스트 파일 형태로 이거는 어떤 행사장이다가 나올 거예요′ 구현.
// 결과는 venues.specs_text 컬럼에 저장 → 다음 추천 시 venueProfile에 자동 통합.

import type { VenueFacilityGuide } from '@/lib/types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM_PROMPT = `당신은 MICE 행사장(컨벤션센터·호텔·전시장) 도면을 분석하는 전문가입니다.

도면 이미지를 보고 다음을 한국어 텍스트로 정리하세요:
1. 주요 공간 구성 — 전시홀·로비·연단·등록데스크·동선
2. 주출입구 위치와 방향 (예: ″1층 정문 동측″)
3. 추정 면적 (가능하면 ㎡)
4. 환경장식물 부착·설치 가능 영역 — 벽면·천장·기둥·바닥
5. 주의·금지 영역 — 비상구·소화전·소방시설 가림 금지 위치
6. 디지털 사이니지 위치가 도면에 표시되어 있다면 그 위치

응답 형식 — 마크다운·해설 없이 줄바꿈으로 구분된 평문 텍스트 (예시):
주요 공간: 메인 홀 (좌), 로비 (우상단), 등록데스크 (입구 좌측)
주출입구: 1층 정문 — 동측, 부출입구 — 후면
추정 면적: 약 1,800㎡
설치 가능: 외벽·기둥 부착 OK, 천장 행잉은 그리드 라인만
주의: 비상구 4개소 우측 / 소화전 후면벽 가림 금지
디지털 사이니지: 표시 없음

도면에 명시되지 않은 정보는 ′[확인 필요]′로 표기. 추측 금지.`

export interface VisionAnalysisResult {
  text: string                  // venues.specs_text에 저장될 텍스트
  raw?: string                  // 디버깅용 원본 응답
  error?: string                // 실패 시 사유 (호출 측 silent fallback)
}

/**
 * Gemini Vision API로 도면 이미지 분석.
 * imageUrl: public URL (Supabase Storage) 또는 base64 data URL
 *
 * 실패 시 error 필드만 채워 반환 (throw 안 함 — admin 페이지에서 status='failed' 처리).
 */
export async function analyzeFloorPlan(imageUrl: string): Promise<VisionAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { text: '', error: 'GEMINI_API_KEY 미설정' }
  if (!imageUrl) return { text: '', error: '이미지 URL 비어있음' }

  try {
    // 이미지 다운로드 → base64
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return { text: '', error: `이미지 fetch 실패 (${imgRes.status})` }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const mime = imgRes.headers.get('content-type') ?? 'image/jpeg'
    // PDF는 Gemini Vision 직접 지원 안 됨 — 1페이지 이미지 변환 필요. 일단 skip.
    if (mime.includes('pdf')) {
      return { text: '', error: 'PDF는 이미지 변환 후 분석 가능 (다음 사이클)' }
    }
    const base64 = buf.toString('base64')

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { text: '이 행사장 도면을 분석해 텍스트로 정리해 주세요.' },
          { inlineData: { mimeType: mime, data: base64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { text: '', error: `Gemini Vision 실패 (${res.status}): ${errText.slice(0, 150)}` }
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      error?: { message?: string }
    }
    if (data.error) return { text: '', error: `Gemini: ${data.error.message}` }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!text) return { text: '', error: '응답이 비어있음' }

    return { text, raw: text }
  } catch (e) {
    return { text: '', error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}

// ── 구조화 시설 가이드 추출 ───────────────────────────────────────
// specs_text(자유 텍스트) → VenueFacilityGuide JSON 구조로 변환
// 관리자 페이지 "AI 자동 추출" 버튼 및 학습 완료 후 자동 트리거 시 사용.

const EXTRACT_PROMPT = `당신은 MICE 행사장 시설 규정을 구조화 JSON으로 추출하는 전문가입니다.

아래 행사장 분석 텍스트를 보고 시설 가이드 JSON을 출력하세요.

출력 형식 (TypeScript 타입 준수):
{
  "install_allowed": [
    {
      "category": "품목명",
      "status": "allowed",
      "note": "설명",
      "max_width_mm": null,
      "max_height_mm": null,
      "standard_width_mm": null,
      "standard_height_mm": null
    }
  ],
  "mount_methods": { "taka": "denied", "magnet": "denied", "adhesive": "denied", "hanger": "conditional", "rope": "allowed", "note": "..." },
  "rigging": { "available": true, "max_load_kg": null, "note": "..." },
  "safety": { "fire": "...", "fall": "...", "electric": "...", "weather": "..." },
  "warnings": [{ "type": "...", "description": "..." }],
  "special_notes": ["..."]
}

규칙:
- 텍스트에 명시된 수치만 추출 (추측 금지 — 모르면 null)
- mm 단위로 통일 (m → mm 변환)
- status: 텍스트에 "불가"/"금지" → "denied", "조건부"/"사전 승인" → "conditional", 나머지 → "allowed"
- JSON만 출력 (다른 텍스트 없이)`

export async function extractStructuredGuide(
  specsText: string,
  venueName: string
): Promise<{ json: Partial<VenueFacilityGuide> | null; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { json: null, error: 'GEMINI_API_KEY 미설정' }
  if (!specsText.trim()) return { json: null, error: 'specs_text 비어있음' }

  try {
    const body = {
      contents: [{
        role: 'user',
        parts: [{ text: `행사장명: ${venueName}\n\n분석 텍스트:\n${specsText}` }],
      }],
      systemInstruction: { parts: [{ text: EXTRACT_PROMPT }] },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { json: null, error: `Gemini 실패 (${res.status}): ${errText.slice(0, 150)}` }
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      error?: { message?: string }
    }
    if (data.error) return { json: null, error: `Gemini: ${data.error.message}` }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!raw) return { json: null, error: '응답 비어있음' }

    const parsed = JSON.parse(raw.replace(/```json|```/gi, '').trim()) as Partial<VenueFacilityGuide>
    return { json: parsed }
  } catch (e) {
    return { json: null, error: e instanceof Error ? e.message : '파싱 오류' }
  }
}
