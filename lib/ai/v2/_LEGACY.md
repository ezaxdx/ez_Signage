# lib/ai/v2/ = LEGACY (사용 안 함)

> 2026-05-19 기점 **dead code**. v3 (`lib/ai/v3/`)가 SOT.

## 사용처

- 실제 코드 import: **0건** (grep 확인 5/18)
- v2 폴더 내부 self-reference만

## v3 마스터 SOT 위치

- `lib/ai/v3/recommendationLogicV3.ts` (3단계 우선순위·matchByPartV3·checkFacilityV3·calculateQuantityV3·4단 안전망)
- `lib/ai/recommendSignage.ts` (Gemini 호출 + SYSTEM_INSTRUCTION + v3 시드 자동 주입)

## 제거 후보 (사용자 결정 영역)

v3 라이브 안정 운영 검증 후·곽 이사 컴펌 시 제거. 상세 = `lib/data/v2/_LEGACY.md` 참조.
