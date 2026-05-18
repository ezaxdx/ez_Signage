# lib/data/v2/ = LEGACY (사용 안 함)

> 2026-05-19 기점 **dead code**. v3 (`lib/data/v3/`)가 SOT.

## 배경

- **v2** = 5/14 회의 결정 24종 카테고리 시드 (5/16 작성)
- **v3** = 5/18 노션 컴펌 본 12 카테고리 SOT (5/18 작성)
- 노션 페이지: 36148589-8ea1-81d7-8b55-d1bd771a40a1

## 사용처

- 실제 코드 import: **0건** (grep 확인 5/18)
- v2 폴더 내부 self-reference만 잔존
- docs/NEW_STRUCTURE_260514.md·docs/v1_v2_교체_PR_시안_260516.md = 문서 참조

## 보존 사유

- 향후 v3 검증 실패 시 rollback 가능성
- CLAUDE.md "orphan 코드 보존 정책" = 완전 삭제 X·진입점만 차단
- git history 추적

## 제거 후보 (사용자 결정 영역)

v3 라이브 운영 안정성 검증 후 (예: 5/22 라이브 + 2주 무사고)·곽 이사 컴펌 시:
1. `lib/data/v2/` 폴더 제거
2. `lib/ai/v2/` 폴더 제거
3. `supabase/migration_v10_new_structure.sql` 제거 (DB 미실행 SQL)
4. `scripts/seed_v2.mjs`·`scripts/test_v2_seeds.mjs` 제거

## v3 마스터 SOT 위치

- `lib/data/v3/signageCategoriesSeedV3.ts` (12 카테고리)
- `lib/ai/v3/recommendationLogicV3.ts` (3단계 우선순위·4단 안전망)
- `lib/data/v3/learningMetaSeed.ts` (노션 §4·§1-2)
- `supabase/migration_v11_notion_12cat_alignment.sql`
