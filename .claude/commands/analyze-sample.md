---
description: 실제 환경장식물 샘플 이미지를 분석해 TEMPLATE_PRESETS에 반영
argument-hint: [샘플 이미지 파일명 또는 경로]
---

다음 샘플을 분석해 레이아웃 DNA를 추출하세요: $ARGUMENTS

1. Read 툴로 이미지 열기 (경로: `C:\Users\EZPMP\Desktop\클로드 코드 활동용\환경장식물 최종 정보 모음\환경장식물\...`)
2. 슬롯별 위치 추출:
   - header_brand: 상단 로고 위치 (y %)
   - hero_title: 대형 행사명 위치·폰트 크기 추정
   - sub_title, body, arrow, qr_code, footer_credits
3. 카테고리 추정 (X배너·L보드·포디움 등)
4. 용도 추정 (main_promo / registration / wayfinding / program_info / experience)
5. 결과를 `lib/constants.ts`의 `TEMPLATE_PRESETS`에 신규 항목으로 추가 제안

포맷:
```ts
{
  id: '제안_id',
  name: '한글 이름',
  categoryIds: ['...'],
  purposeId: '...',
  variantId: '...',
  description: '관찰된 레이아웃 요약',
  slots: { ... }
}
```
