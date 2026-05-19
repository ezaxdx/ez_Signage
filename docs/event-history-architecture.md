# event_history 아키텍처 (5/22 사용자 명시·D-2 작성)

## 핵심 영역

학습 관리자 영역 모든 정보 (행사·환경장식물·프로그램 파트) = DB 영역 SOT.
SEED 영역 → 사용자 편집·삭제·추가 → 신규 프로젝트 자동 누적 = 모두 같은 테이블 영역.
AI 영역 = DB SELECT → 프롬프트 주입.

## 데이터 영역 3 경로

1. **SEED 영역** (`source = 'seed'·is_seed = true`)
   - `seed_event_history.sql` 영역 = 44건 INSERT
   - 회사 과거 행사 폴더 영역
2. **사용자 수동 영역** (`source = 'manual'·is_seed = false`)
   - 학습 관리자 → 행사 관리 → + 추가
   - POST `/api/event-history`
3. **자동 누적 영역** (`source = 'auto_project'`)
   - 새 프로젝트 만들기 영역 = background fire-and-forget
   - POST `/api/event-history`·project_code = projects.id

## 편집 영역

- **편집** = PATCH `/api/event-history` (project_code 매칭·UPDATE·edit_history 자동 append)
- **삭제** = DELETE (soft delete·deleted_at = now())

## RLS 정책

- SELECT = 인증 사용자 모두 (학습 공유)
- INSERT·UPDATE·DELETE = 인증 사용자 모두

## AI 영역

- `lib/ai/accumulatedContext.ts` `buildSeedEventHistoryContext(venue, parts)`
- DB SELECT → venue + program_parts 매칭 5건 → 프롬프트 [편집됨]·[SEED]·[자동 누적] 태그

## 마이그레이션 영역

1. `migration_v13_event_history.sql` 실행
2. `seed_event_history.sql` 실행 (44건 INSERT)
3. (선택) `migration_v14_signage_types_extended.sql` 실행 = signage_types 영역 layout·sample 영역 추가
4. (선택) `migration_v15_program_parts.sql` 실행 = 프로그램 파트 영역
5. 라이브 클라이언트 영역 = localStorage 영역 1회 정정 (사용자 영역)

## localStorage → DB 영역 정합 (사용자 영역)

기존 localStorage 키 영역:
- `mice_hidden_seed_aliases`·`mice_hidden_signage_types`·`mice_signage_type_overrides`·`mice_signage_type_samples`
- `mice_hidden_program_parts`·`mice_program_part_overrides`·`mice_custom_program_parts`
- `mice_event_overrides`·`mice_custom_events`·`mice_hidden_events`

= 모두 DB 영역 (event_history·signage_types·program_parts_overrides)으로 통합.

## 검증

```sql
SELECT COUNT(*) FROM event_history WHERE is_seed = true;  -- 44
SELECT venue, COUNT(*) FROM event_history WHERE deleted_at IS NULL GROUP BY venue ORDER BY count DESC LIMIT 10;
SELECT source, COUNT(*) FROM event_history GROUP BY source;
```
