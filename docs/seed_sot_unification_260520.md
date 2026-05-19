# 시드 SOT 중복 통합 검토 보고서 — 12파트 환경장식물 매핑 (2026-05-20)

**분류**: [검토 요청]
**작성**: 회사 PC Claude Code 자율 (v10.4 후속 정합 검토)
**의도 (Step 0)**: 표면 "시드 SOT 중복" / 진짜 "단일 진실 정합·미래 갱신 충돌 회피"

## 1. 발견 — 12파트 환경장식물 매핑 시드 2개 SOT 분산

| 파일 | 형식 | 키 체계 | 작성 시점 |
|---|---|---|---|
| `lib/programParts.ts::PROGRAM_PART_SIGNAGE_DETAILS` | `Record<string, SignageDetail[]>` | EZ 폴더링 코드 (`'40.04'`·`'40.17'` 등) + signage ID (`'podium'`·`'x_banner'`) | v9.31 (5/13)·이후 누적 갱신 |
| `lib/data/v3/programPartSignageSeed.ts::SEED_PROGRAM_PART_SIGNAGE` | `PartSignageRecommend[]` | 영문 partCode (`'meeting'`·`'promotion'`) + 한국어 category명 (`'X배너'`·`'포디움 타이틀'`) | v10.4 (5/20·야간 신설) |

두 SOT 모두 12파트 전체 정의 + 동일 외연 표현. 차이는 키 체계·매핑 방향.

## 2. 사용처 분석

| 사용처 | 의존 SOT | 비고 |
|---|---|---|
| `lib/ai/recommendSignage.ts` (AI 추천 자동 주입) | PROGRAM_PART_SIGNAGE_DETAILS | v9.31~ 작동 중·실 운영 |
| `lib/programParts.ts::pickPartForFormat`·`partsForFormat` | PROGRAM_PART_SIGNAGE_HINTS (별도 시드) | NewProjectButton·case-a 위자드 |
| `ProgramPartSignageMatrix.tsx` (UI 가시화) | SEED_PROGRAM_PART_SIGNAGE | v10.4 신설·UI만 |
| `app/components/admin/SectionBoundary.tsx` (간접 영향 X) | - | - |

→ 운영 SOT는 `PROGRAM_PART_SIGNAGE_DETAILS`·UI 시각화 SOT는 `SEED_PROGRAM_PART_SIGNAGE`. 같은 정보의 두 표현이 동시 존재.

## 3. 충돌 가능 시나리오

| 시나리오 | 영향 |
|---|---|
| 노션 §6-2 SOT 변경 시 한쪽만 갱신 | AI 추천(운영)과 UI(시각) 불일치·사용자 혼란 |
| 12번 홍보 같은 신규 파트 추가 시 한쪽만 추가 | 한쪽에서 누락·"학습 안 됨" 오해 |
| Q방 같은 미정 카테고리 정의 변경 시 | SOT 정정이 두 파일에서 일관성 깨질 위험 |

## 4. 통합 옵션 (3가지)

### 옵션 A — `PROGRAM_PART_SIGNAGE_DETAILS` 단일화 (운영 SOT 보존)
- `SEED_PROGRAM_PART_SIGNAGE` 폐기 + signage ID → 한국어 매핑 헬퍼만 신설
- 장: 운영 코드 변경 0건·`recommendSignage.ts` 영향 X
- 단: UI 시각화 (ProgramPartSignageMatrix) 재작성 필요·한국어 SOT 가독성 ↓

### 옵션 B — `SEED_PROGRAM_PART_SIGNAGE` 단일화 (한국어 SOT 보존)
- `PROGRAM_PART_SIGNAGE_DETAILS` 폐기 + `recommendSignage.ts` 변경
- 장: 한국어 SOT 가독성·노션 §6-2와 1:1
- 단: 운영 코드 변경 큼·라이브 영향 위험

### 옵션 C — 두 SOT 모두 보존 + 단방향 derive (✅ 권장)
- 한쪽을 master·다른 쪽을 자동 생성 (derived)
- 예: `PROGRAM_PART_SIGNAGE_DETAILS`를 master로 두고 `SEED_PROGRAM_PART_SIGNAGE`는 빌드 시 `lib/programParts.ts`에서 derive
- 장: 양쪽 형식 보존·갱신 한 곳·자동 동기화
- 단: derive 함수 신설·테스트 필요

## 5. 권장 (5/22 라이브 후)

**옵션 C·D-2 후 별도 사이클**.

작업 흐름:
1. `lib/programParts.ts`에 `deriveSeedProgramPartSignage()` 헬퍼 신설
2. `lib/data/v3/programPartSignageSeed.ts`의 `SEED_PROGRAM_PART_SIGNAGE`를 derive 결과로 교체
3. `ProgramPartSignageMatrix.tsx`는 변경 0건 (import 그대로)
4. 회귀 테스트: harness에 "SOT 일관성 검증" 1 케이스 추가
5. `decisions.md` "2026-05-XX 시드 SOT 단일화 = PROGRAM_PART_SIGNAGE_DETAILS master" 기록

## 6. D-1 안전 모드 (5/22 라이브 전)
- 현재 = 두 SOT 모두 12파트 일관 정합 (v10.4 신설 시드 = 노션 §6-2 + 61행 엑셀 SOT·기존 SOT와 동일 외연)
- 충돌 위험 = 향후 갱신 시점·현재 시점 0건
- 조치 권장 = 변경 X·5/22 라이브 후 옵션 C 진행

## 7. 다음 사이클 대기 신호
- 노션 §6-2 변경 발생 시 = 두 SOT 모두 동시 갱신 필요·이를 자동화한 옵션 C 도입 시점
- 사용자 명시 또는 곽 이사 컴펌 시
