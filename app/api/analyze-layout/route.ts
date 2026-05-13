import { NextResponse } from 'next/server'

/**
 * 마스터 시안 이미지 → Gemini Vision으로 슬롯 위치 자동 추출
 * 입력: { imageUrl: string }
 * 출력: { slots: [{ key, label, x, y, w, h, fontSize }] }
 *
 * GEMINI_API_KEY 환경변수가 없으면 휴리스틱 기본값 반환 (Phase 1).
 * 추후 GEMINI_API_KEY 설정 시 실제 Vision API 호출로 전환.
 */
export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // 휴리스틱 기본값 — DEFAULT_SLOTS 7개를 그대로 반환
      return NextResponse.json({
        ai_used: false,
        message: 'GEMINI_API_KEY 미설정 — 기본 슬롯 위치를 반환합니다',
        slots: [
          { key: 'header_brand',    label: '주최기관',    x: 50, y: 4,  fontSize: 13, w: 80 },
          { key: 'hero_title',      label: '행사명',      x: 50, y: 27, fontSize: 38, w: 85 },
          { key: 'sub_title',       label: '부제/슬로건', x: 50, y: 47, fontSize: 20, w: 80 },
          { key: 'body',            label: '본문 정보',   x: 50, y: 61, fontSize: 16, w: 75 },
          { key: 'arrow',           label: '화살표',      x: 50, y: 55, fontSize: 24, w: 50 },
          { key: 'qr_code',         label: 'QR코드',      x: 50, y: 72, fontSize: 13, w: 40 },
          { key: 'footer_credits',  label: '후원사',      x: 50, y: 90, fontSize: 11, w: 90 },
        ],
      })
    }

    // ── Gemini Vision API 호출 ────────────────────────────
    const imgRes = await fetch(imageUrl)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const mimeType = imgRes.headers.get('content-type') ?? 'image/webp'

    const prompt = `Analyze this banner/poster design and extract structural slot positions.
Identify text/content slots like header, title, subtitle, body, arrow, QR, footer.
For each slot provide:
- key (snake_case english id like "hero_title")
- label (Korean display name)
- x, y (center position as percentage 0-100)
- w (width as percentage 0-100)
- fontSize (estimated point size, integer)

Return ONLY valid JSON:
{ "slots": [{ "key":"...", "label":"...", "x":50, "y":27, "w":85, "fontSize":38 }] }`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8000,            // 슬롯 다수 추출 시 4000은 부족
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()
    if (geminiData.error) {
      return NextResponse.json({ error: `Gemini: ${geminiData.error.message}` }, { status: 500 })
    }

    const finishReason = geminiData?.candidates?.[0]?.finishReason
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const cleaned = rawText.replace(/```json|```/gi, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      return NextResponse.json({
        error: 'Gemini 응답 파싱 실패',
        finishReason,
        raw: cleaned.slice(0, 500),
      }, { status: 500 })
    }

    return NextResponse.json({
      ai_used: true,
      finishReason,
      slots: parsed.slots ?? [],
    })
  } catch (err) {
    console.error('analyze-layout failed', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
