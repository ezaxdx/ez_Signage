# 야간 자율 작업 지시서 — design_items.no NOT NULL 핫픽스 + 12파트 시드 (v10.4)

작성일: 2026-05-19
대상 리포: ezaxdx/ez_Signage2 (main)
브랜치: `auto/v10.4-design-items-no-fix-260519`
실행 모드: 단일 세션 무중단 (Ralph Loop 인프라는 5/22 라이브 후 도입)
우선순위: P0 → P1 → P2

> 본 지시서는 웹 Claude가 작성한 야간 작업 plan을 Claude Code (회사 PC)가 실행 중. 마이그레이션 번호는 PROGRESS.md v10.3 실측 기준 v10.4로 재할당.

## TL;DR
1. **P0**: design_items.no NOT NULL 위반 = DB 트리거 + 클라이언트 채번 헬퍼 이중 방어
2. **P0**: /admin/learning ErrorBoundary 6섹션 독립 분리
3. **P1**: SEED_PROGRAM_PART_SIGNAGE 12파트 시드 (11번 잘림·12번 누락 BLOCKED 처리)

## 운영 규칙 (모든 iteration 공통)
- 매 iteration 끝나면 PROGRESS.md v10.4 섹션에 한 줄 추가
- 검증 3종 매 iteration 통과 의무: `npx tsc --noEmit` 0 에러 / `npm run build` PASS / `node scripts/harness.mjs` 0 fail
- 변경 5파일+ = 의미 단위로 분할 커밋
- DB 실행 X·git push X·외부 자산 커밋 X
- 자동 정지: 동일 테스트 3회 연속 실패 / 30 파일+ / PROGRESS.md 5회 동일

## Iteration 1~4: P0 design_items.no 핫픽스

### Iteration 1 — 진단 스크립트
- `scripts/diagnose_no_column.mjs` 작성
- Supabase service role로 information_schema 조회 (data_type·is_nullable·column_default)
- 결과 = `docs/reports/diagnose_no_<YYYYMMDD>.md`
- 사용자 영역 = 실제 실행 (DB 접근 필요)

### Iteration 2 — Migration SQL (작성만, 실행 X)
- `supabase/migration_v10_4_fix_design_items_no.sql`
- ① NOT NULL 임시 해제 → ② `set_design_items_no()` trigger 생성 → ③ NOT NULL 재설정
- 트리거 = project_id 단위 max(no) + 1 자동 채번

### Iteration 3 — 클라이언트 헬퍼 + 7곳 INSERT 정합
- `lib/services/designItemNo.ts` 신설
- 7곳 INSERT 위치 모두 helper 호출 통일:
  - ProjectInfoClient.tsx (b979439 fix 이미 적용·헬퍼로 표준화)
  - NewProjectButton.tsx
  - case-a/page.tsx · case-b/page.tsx · case-d/page.tsx
  - EditorLayout.tsx (현재 items.length+1 = 위험·헬퍼로 교체)
  - SeriesGenerator.tsx (현재 currentItemCount+1 = 위험·헬퍼로 교체)
  - ItemSidebar.tsx (확인 후 정합)

### Iteration 4 — Harness 테스트 추가
- scripts/harness.mjs에 4 케이스 추가:
  - design_items.no NOT NULL 확인
  - 채번 헬퍼 동시성 시나리오 (5건 연속)
  - 다른 project_id 독립 채번
  - 트리거 fallback 시뮬레이션

## Iteration 5: P0-1 /admin/learning ErrorBoundary
- 6 섹션을 독립 ErrorBoundary로 분리
- 한 섹션 fail → 다른 5 섹션은 정상 렌더
- `app/components/admin/SectionBoundary.tsx` 신설

## Iteration 6: P0-2 ProjectInfo UX
- 파트 변경 후 자동 INSERT 성공 시 토스트
- 실패 시 사용자 친화 메시지 (SQL 원문 노출 X)
- console.warn으로만 원본 에러 기록

## Iteration 7~9: P1 12파트 시드
- `SEED_PROGRAM_PART_SIGNAGE` 12파트 마스터 시드
- AI 추천 프롬프트 자동 주입
- 동의어 보강 (천장 배너 vs 통천 배너 분리·매핑 금지)
- **BLOCKED**: 11번 영접영송 본문 잘림 + 12번 파트 누락
  - goals/current.md에 질의 등록
  - 부분 시드 PR 머지 X·사용자 컴펌 후 진행

## Iteration 10~11: P1 폴더링 원칙 + 재학습
- `docs/AI_LEARNING_FOLDERING.md` 5원칙 명시
- `docs/AI_LEARNING_SOURCES.md` PM 로컬 경로 인덱스 (절대경로 커밋 X)
- `scripts/relearn_from_perflist.mjs` 스켈레톤

## Iteration 12: 최종 검증
- tsc 0 에러 / build PASS / harness 0 fail
- PROGRESS.md v10.4 정리
- decisions.md 3건 추가 (no 채번 정책·천장 vs 통천 분리·ErrorBoundary)
- learnings.md 1건 추가
- BLOCKED.md = 11/12번 파트 잘림 + DB SQL 실행 대기

## PM 후속 액션 (Claude Code 자율 X)
1. Supabase Studio → SQL Editor에서 `migration_v10_4_*.sql` RUN
2. `goals/current.md`의 11/12번 파트 잘림 항목 답변
3. 로컬 커밋 push (사용자 명시 시·D-2 안정 후)
4. 12파트 종류명 표 최종 확정 → decisions.md "2026-05-19 종류명 표준 확정" 기록

## 위험·미확정
- 11번 영접영송 "피켓보드 (입출국" 본문 잘림 (확정 X)
- 12번 파트 누락 (확정 X)
- 천장 배너 ≠ 통천 배너 분리 강조
- Q방 규격·재질 미수신
- 마이그레이션 번호 = PROGRESS.md v10.3 실측 후 v10.4 재할당
