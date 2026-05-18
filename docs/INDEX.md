# 자료 인덱스 — mice-design-guide

> v2 시드·로직·문서 위치 정리 (2026-05-15)
> 신규 추가 시 본 인덱스 갱신.

## 문서

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` | 메인 지침 (200줄 룰) |
| `decisions.md` | 의사결정 로그 |
| `learnings.md` | 학습 로그 |
| `PROGRESS.md` | 작업 이력 (사이클별) |
| `goals/current.md` | 현재 목표 |
| `docs/NEW_STRUCTURE_260514.md` | **5/14 회의 새 구조 설계 SOT** |
| `docs/AI_LEARNING_FLOW_260511.md` | AI 학습 적용 흐름 |
| `docs/IA_v4.md` | IA v4 |
| `docs/ADMIN_REDESIGN_260513.md` | 어드민 재설계 명세 |
| `docs/VENUE_LEARNING_INSIGHTS_260511.md` | 행사장 학습 1차 시험 결과 |

## v2 시드 (5/15 적재 — 컴펌 후 활성화)

| 위치 | 내용 |
|---|---|
| `lib/data/v2/signageCategoriesSeed.ts` | 24종 카테고리 (15 확정 + 9 pending) |
| `lib/data/v2/venueListSeed.ts` | 43개 L1 행사장 (35 외부 보강 완료) |
| `lib/data/v2/eventSeriesSeed.ts` | 24 행사 시리즈 (BCWW·KME·스마트국토 등) |
| `lib/data/v2/eventOrderListSeed.ts` | 7 Excel 발주 리스트 정형화 |
| `lib/data/v2/index.ts` | 통합 export + getV2SeedSummary() |

## v2 AI 로직

| 위치 | 내용 |
|---|---|
| `lib/ai/v2/recommendationLogic.ts` | 3단계 우선순위 + 4단 안전망 |

## v2 DB 스키마

| 위치 | 내용 |
|---|---|
| `supabase/migration_v10_new_structure.sql` | 9 테이블 + RLS + 트리거 (실행 대기) |

## 기존 시드 (v1 — 컴펌 후 v2로 교체)

| 위치 | 내용 |
|---|---|
| `lib/data/dashboardSeed.ts` | 시드 단일 소스 (SEED_SIGNAGE_TYPES·SEED_PERFLIST 등) |
| `lib/data/signageCategoryStandards.ts` | 6대 카테고리 표준 |
| `lib/data/venueFacilityGuide.ts` | 7개 행사장 시설 가이드 |
| `lib/data/dongseonBanner.ts` | 동선배너 룰베이스 |

## 외부 문서 (참고)

| 위치 | 내용 |
|---|---|
| `참고자료/환경장식물_분석결과.md` (§A~§J) | 환경장식물 학습 분석 10 섹션 |
| `참고자료/학습데이터_통합_260514/` | 학습 데이터 통합 폴더 (1,270 파일) |
| `업무/일반 업무 메모/SWAT_6_STAGE_DEEP_ANALYSIS_260515.md` | SWAT 1242 Task 분석 |
| `업무/일반 업무 메모/AXDX_AUTOMATION_RESEARCH_260515.md` | 자동화 리서치 TOP 5 |
| `업무/일반 업무 메모/AXDX_EXTERNAL_RESEARCH_5AREAS_260515.md` | 외부 환경 5영역 |
| `업무/IA장표 제작/이사님_보고_사전준비_260515.md` | 다음 주 보고 사전 준비 |
| `업무/IA장표 제작/이사님_보고_ES_1슬라이드_260515.md` | **5/15 신규** — 1슬라이드 Executive Summary + Action Title 4건 |
| `업무/IA장표 제작/5_14_회의_후속_점검_260515.md` | 5/14 회의 후속 점검 체크리스트 |
| `참고자료/PDF_도면_메타_분석_260515.md` | **5/15 Agent 1** — 700 도면 메타 (CAD 9곳·결락 4곳) |
| `참고자료/AI_시안_카탈로그_260515.md` | **5/15 Agent 2** — 200 .ai 시안 (24종 v2 매핑·9 pending 권고) |
| `업무/일반 업무 메모/USER_UPLOAD_DEEP_RESEARCH_260515.md` | **5/15 Agent 4** — Claude Code 개선 5건 |

## 컴펌 후 활성화 도구 (5/15 야간 신규)

| 위치 | 내용 |
|---|---|
| `scripts/seed_v2.mjs` | Supabase v2 시드 INSERT 자동화 (idempotent) |
| `scripts/test_v2_seeds.mjs` | 시드 정합성 자동 검증 (24·43·매칭 무결성) |

## 적용 절차 (컴펌 후)

1. **카테고리 9 pending 결정** (다음 주 수요일 이사님 보고)
2. **DB 마이그레이션** — `supabase/migration_v10_new_structure.sql` 실행
3. **시드 import** — `lib/data/v2/` 활성화 (기존 dashboardSeed 대체)
4. **추천 로직 교체** — `recommendSignage.ts` → `lib/ai/v2/recommendationLogic.ts`
5. **UI 갱신** — 환경장식물 종류 24종 반영
