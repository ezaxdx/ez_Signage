# AI 학습 데이터 최신본 반영 상태 — 진단 보고서 (2026-05-20)

**분류**: [진척 공유]
**작성**: 회사 PC Claude Code 야간 자율 (v10.4 사이클)
**목적**: 5/20 오전 보고용 — "AI 학습자료 재학습 가능 여부 + 가능 시 진행 방법" 질문에 답

---

## 1. TL;DR

1. **정적 시드 측면 (12파트 × 14종류·30 행사장)**: ✅ 코드 SOT 정합 완료 (v10.3 G드라이브 정합 + v10.4 12파트 마스터)
2. **AI 추천 자동 주입**: ✅ 이미 작동 중 (`recommendSignage.ts` programPartsBlock·v9.31~v10.4)
3. **/admin/learning UI 시각화**: ✅ v10.4 신규 = ProgramPartSignageMatrix 컴포넌트 통합
4. **자동 재학습 파이프라인 (엑셀·PDF → 시드 보강)**: ⚠️ 스켈레톤 작성 = `scripts/relearn_from_perflist.mjs`·실제 호출 시 diff JSON만 출력·시드 자동 갱신은 사용자 컴펌 후
5. **Vision API 도면 학습**: ✅ 기존 v9.6 구현·동작 중 (`lib/ai/visionFloorPlan.ts` + `/api/learning-jobs/run`)

→ **5/20 오전 보고 답변**: "재학습 가능. 단, 의미 4가지로 분리 (시드 정합·AI 주입·UI 가시화·자동 재학습)·앞 3개는 완료·4번째는 스켈레톤만·실제 시드 자동 갱신은 라이브 후 별도 사이클 권장."

---

## 2. "재학습"의 4가지 의미 분리

| 의미 | 정의 | 상태 | 산출물 |
|---|---|---|---|
| ① 정적 시드 데이터 코드화 | 12파트·14종류·30 행사장을 코드 SOT로 정합 | ✅ 완료 | `lib/data/v3/programPartSignageSeed.ts`·`lib/data/v3/eventLearningIndexSeed.ts`·`lib/venueIntel.ts` |
| ② AI 추천 시스템 컨텍스트 주입 | Gemini 프롬프트에 [파트별 권장 환경 제작물] 자동 부착 | ✅ 작동 중 | `lib/ai/recommendSignage.ts` programPartsBlock |
| ③ 학습 관리자 UI 가시화 | /admin/learning에서 시드 read-only 표 노출 | ✅ v10.4 신규 | `ProgramPartSignageMatrix.tsx` |
| ④ 자동 재학습 파이프라인 | 새 발주 엑셀/PDF → 자동 분류·시드 보강 diff 출력 | ⚠️ 스켈레톤만 | `scripts/relearn_from_perflist.mjs` (사용자 영역) |

---

## 3. 의미별 진행 상세

### 3.1. 시드 데이터 정합 (의미 ①)
- **G드라이브 SOT 실측** (PROGRESS.md v10.3, 5/19): 행사장 29·도면 427·학습 파일 345·서류 210
- **12파트 마스터** (v10.4, 5/20): 5/19 엑셀 SOT 61행 직접 추출·11번 영접영송·12번 홍보 완전 확인
- **시설 가이드 골격 시드** 21건 (v10.3): 1순위 5건·2순위 11건·3순위 5건
- **VENUE_HALLS** 47건 (v10.3, ICC JEJU 12 + 그랜드하얏트 4 + 더플라자 1 + BEXCO 6 등)

→ 다음 갱신 트리거: 사용자가 새 발주 자료 추가하거나 노션 §6-2 SOT 변경 시.

### 3.2. AI 추천 자동 주입 (의미 ②)
- **컨텍스트 블록 8종** 자동 부착 (recommendSignage.ts:352):
  - similarEventsBlock · venueSignageBlock · accumulatedBlock · seedHistoryBlock · venueProfileBlock · ceilingBannerBlock · venueSpecsBlock · coverageBlock · adminMasterBlock · **programPartsBlock**(12파트 매핑) · floorPlanBlock
- **검증 통과**: 5/19 v10.3 push 25회 후 정합·5/20 v10.4 builds PASS
- **다음 사이클 후보**: `formatPartSignageForPrompt()` (programPartSignageSeed.ts) helper 활용·기존 PROGRAM_PART_SIGNAGE_DETAILS와 통합 SOT 선택

### 3.3. 학습 관리자 UI 가시화 (의미 ③, 5/20 신규)
- `/admin/learning` → 환경장식물 관리 메뉴 → 신규 매트릭스 표 노출
- 12파트 × 14종류 매트릭스·각 카테고리 카드·subUse·note 표시
- read-only = 편집은 SOT 파일 (programPartSignageSeed.ts) 직접

→ 사용자 시각 검증 가능: `npm run dev` 후 `/admin/learning?section=signage-types` 진입

### 3.4. 자동 재학습 파이프라인 (의미 ④, 스켈레톤만)
- 스크립트: `scripts/relearn_from_perflist.mjs` (다음 섹션 참조)
- 입력: 발주 엑셀 (예: `_원본_보존/` 폴더)·결과 PDF·도면 디렉터리
- 처리: 카테고리 fuzzy 매칭 (`classifyCategory()`)·동의어 보강 후보 추출·SEED_SIGNAGE_ANALYSIS 갱신 diff
- 출력: `docs/reports/relearn_diff_<YYMMDD>.json` (사용자 검토 후 시드 수동 반영)
- **자동 시드 갱신 X**: 정답지 노출 편향 회피 (learnings.md 2026-05-11)·사용자 컴펌 후 시드 PR

### 3.5. Vision API 도면 학습 (기존, 변경 0건)
- 구현: `lib/ai/visionFloorPlan.ts` + `app/api/learning-jobs/run/route.ts` (v9.6)
- 동작: 사용자가 도면 첨부 + 학습 트리거 → Gemini Vision 분석 → `venues.specs_text` 저장
- 활용: AI 추천 시 venueProfile에 자동 포함

---

## 4. 5/20 오전 보고용 1줄 요약

> "환경장식물 학습 데이터 최신본은 정적 시드(12파트·30 행사장) 측면에서 v10.3·v10.4 적용 완료. AI 추천 시스템이 이미 시드를 자동 컨텍스트로 사용 중이며, 학습 관리자 UI에 12파트 매트릭스가 노출됩니다. 자동 재학습 스크립트는 스켈레톤 단계로 작성됐고, 새 발주 자료 추가 시 실행하여 diff 검토 후 시드 갱신 가능합니다."

---

## 5. 다음 사이클 후보 (5/22 라이브 후)

| 우선순위 | 항목 | 작업량 |
|---|---|---|
| P1 | `relearn_from_perflist.mjs` 실 호출 검증 + diff JSON 검토 | 1~2시간 |
| P1 | 신규 발주 자료 분기별 자동 누적 학습 cron | 4시간 |
| P2 | `lib/programParts.ts`의 PROGRAM_PART_SIGNAGE_DETAILS와 `programPartSignageSeed.ts` SOT 통합 (한쪽으로 일원화) | 2시간 |
| P2 | NewProjectButton·case-a 위자드 자동 체크 통합 검증 (이미 작동 가능성 = 검증만) | 30분 |
| P3 | Vision 분석 + 12파트 시드 조합 학습 (도면 + 파트 → 추천 정확도 향상) | 1주일 |

---

## 6. 검증 (객관 exit codes)
- TSC 0 에러
- Next 빌드 PASS
- harness 70/72·0 fail
- ProgramPartSignageMatrix 컴포넌트 신설 + LearningManagerClient import 통합

## 7. Forbidden phrases 자체 점검
- "97%·완벽·거의" 표현 0건
- "큰 변경이라" 0건
- "박제 자제" 0건
- 모든 권장사항 = 사용자 결정으로 명시
