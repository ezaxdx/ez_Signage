---
description: 새 시설 가이드·행사장·동의어·카테고리 시드 표준 추가 워크플로우 (grep 4단계 정합 자동)
---

# /seed-add

새 학습 시드 (시설 가이드·행사장·동의어·카테고리) 추가 표준 워크플로우.
시설 가이드 21건 협의 메일 회신 자료·새 행사장 등록 요청 승인 등 모든 학습 보강 시 사용.

## 실행 절차 (3 단계)

### 1. 사용자에게 시드 종류·자료 확인

| 시드 종류 | 자료 출처 | 입력 형식 |
|---|---|---|
| 시설 가이드 | 행사장 운영팀 매뉴얼 PDF·메일 회신 | venue_key·외벽 표준·설치 가능 항목·연락처 |
| 새 행사장 | 신규 요청 또는 G드라이브 폴더 | 행사장명·권역·hall 수·면적 |
| 동의어 | 발주 엑셀에서 비표준 표기 발견 | 비표준명 → 표준 카테고리 키 |
| 카테고리 | 노션 SOT 갱신 | 키·라벨·기본 규격·재질·매칭 키워드 |

### 2. 시드 파일 정정 (위치별)

| 시드 | 위치 |
|---|---|
| 시설 가이드 | `lib/data/venueFacilityGuide.ts` 안 VENUE_FACILITY_GUIDE_SEED |
| 행사장 마스터 | `lib/venueIntel.ts` 안 VENUE_LIST + VENUE_HALLS |
| 동의어 | `lib/data/dashboardSeed.ts` 안 SEED_SYNONYMS |
| 카테고리 | `lib/data/v3/signageCategoriesSeedV3.ts` 안 SIGNAGE_CATEGORIES_V3 |

### 3. 정합 점검 자동 실행 (grep 4단계 의무)

1. `npm run check:v3` → 24항목 통과 확인
2. `npx tsc --noEmit` → 0 에러 확인
3. `npm run check:harness` → 72항목 통과 확인
4. `git diff --stat` → 변경 파일 1~2건 안 (광범위 변경 시 사용자 확인)

## 실행 후 보고 형식

- 추가된 시드 종류·카운트
- 검증 결과 (TSC·v3·harness exit codes)
- 사용자 추가 결정 영역 (예: AI 추천 프롬프트 자동 주입 통합 필요 시 명시)

## 금지

- 정답지 노출 편향 자료 (코엑스·송도 학습 자료) 임의 시드화 X
- main push 자동 X
- DB SQL 자동 실행 X
- "97%·완벽" 표현 X
