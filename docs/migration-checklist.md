# 마이그레이션 체크리스트 (5/22 D-2)

> 라이브 500 에러·기능 부재 원인 = 마이그레이션 v12·v13·v14·v15 누락.
> 본 체크리스트 = Supabase Studio에서 단계별 실행·검증·롤백.

## 0. 사전 점검 (실행 전·1분)

Supabase Studio → SQL Editor → 현재 상태:

```sql
SELECT
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_logs')) AS v12_usage_logs,
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_history')) AS v13_event_history,
  (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'signage_types' AND column_name = 'sample_image_url')) AS v14_signage_types_extended,
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'program_parts_overrides')) AS v15_program_parts;
```

4건 모두 `t` = 마이그레이션 적용 완료·다음 단계 X. 1건이라도 `f` = 본 체크리스트 1번 진행.

## 1. 통합 RUN (가장 빠른 길·3~5초)

Supabase Studio → SQL Editor → `supabase/RUN_ALL.sql` 전체 복사·붙여넣기·RUN.

| 출력 | 의미 |
|------|------|
| `Success. No rows returned` 4개 + 검증 쿼리 결과 | ✅ 정상 |
| 정책 카운트 = 7건 (usage_logs 2·event_history 3·program_parts_overrides 2) | ✅ RLS 정합 |
| ERROR: relation already exists | ✅ idempotent·무시 가능 |
| ERROR: column already exists | ✅ idempotent·무시 가능 |
| ERROR: permission denied | ❌ Supabase 프로젝트 소유자 권한 필요·관리자 확인 |

## 2. SEED 데이터 적재 (선택·44건·5초)

행사 관리 SEED 데이터 = `supabase/seed_event_history.sql` 별도 실행.

```sql
-- 적재 확인
SELECT COUNT(*) FROM public.event_history WHERE is_seed = true;
-- 정상 = 44
```

미실행 시 = 행사 관리 화면 빈 표·신규 프로젝트 자동 누적은 정상 동작.

## 3. 라우트별 동작 검증 (3분)

각 라우트 = 마이그레이션 미적용 시 graceful fallback 적용 (500 에러 X·빈 배열 200).

| 라우트 | 마이그레이션 | 미적용 시 동작 | 적용 후 |
|--------|------------|-------------|--------|
| /api/event-history GET | v13 | `{ items: [], fallback: true }` | `{ items: [...] }` |
| /api/recommend POST | v12 | usage_logs INSERT silent skip | INSERT 정상 |
| /api/admin/signage-types GET | v14 | 기본 컬럼만 응답 + `partial: true` | 전체 컬럼 |
| /api/admin/program-parts GET | v15 | `{ items: [], fallback: true }` | `{ items: [...] }` |

라이브 ez-signage2.vercel.app 검증:
1. 로그인 (admin 계정)
2. /admin/learning → 행사 관리 메뉴 → 표 노출 (SEED 44건)
3. /admin/learning → 프로그램 파트 관리 메뉴 → 12종 시드 + 추가/편집 가능
4. /admin/learning → 환경장식물 관리 메뉴 → 이미지·layout·hidden 컬럼 노출
5. 새 프로젝트 → AI 추천 받기 → /admin/ai 호출수 +1

## 4. 라이브 검증 (1분·실행 후)

```sql
-- v12 = recommend INSERT 확인
SELECT COUNT(*) FROM public.usage_logs WHERE action = 'recommend';
-- 라이브 호출 1회 = 1건·N회 = N건

-- v13 = event_history INSERT 확인
SELECT COUNT(*) FROM public.event_history WHERE deleted_at IS NULL;
-- SEED 적재 = 44+ / 미적재 = 0 / 자동 누적 발생 = 44+N

-- v14 = signage_types 확장 컬럼 NULL 비율
SELECT
  COUNT(*) FILTER (WHERE sample_image_url IS NOT NULL) AS with_image,
  COUNT(*) AS total
FROM public.signage_types;

-- v15 = program_parts_overrides 누적
SELECT COUNT(*) FROM public.program_parts_overrides;
-- 사용자 편집·추가 1회마다 +1
```

## 5. 롤백 (긴급 시·매우 드문 사례)

```sql
-- ⚠️ 운영 데이터 영향 = 신중 영역. 다음 명령 영역은 실행 안 함이 기본.

-- v12 롤백 = usage_logs 테이블 삭제 (데이터 손실)
-- DROP TABLE IF EXISTS public.usage_logs CASCADE;

-- v13 롤백 = event_history 테이블 삭제 (행사 관리 데이터 손실)
-- DROP TABLE IF EXISTS public.event_history CASCADE;

-- v14 롤백 = 컬럼 삭제 (이미지 URL·hidden 상태 손실)
-- ALTER TABLE public.signage_types
--   DROP COLUMN IF EXISTS sample_image_url,
--   DROP COLUMN IF EXISTS layout,
--   DROP COLUMN IF EXISTS hidden,
--   DROP COLUMN IF EXISTS edited_by,
--   DROP COLUMN IF EXISTS updated_at;

-- v15 롤백 = program_parts_overrides 테이블 삭제
-- DROP TABLE IF EXISTS public.program_parts_overrides CASCADE;
```

코드 영역 = 모두 graceful fallback 적용 = 롤백해도 라우트 500 에러 X·빈 배열 200 반환.

## 6. 진단 (이상 시)

### A. 라우트 500 에러 발생
```
1. Vercel Functions Logs → 해당 라우트 → 에러 코드 확인
2. error.code = 42P01 → 테이블 부재 → 1번 RUN_ALL.sql 재실행
3. error.code = 42703 → 컬럼 부재 → v14 또는 v15만 재실행
4. error.code = 42501 → RLS 권한 → 정책 재확인 (SELECT pg_policies)
```

### B. 빈 응답 (fallback: true)
```
정상 동작. 라우트는 살아 있지만 DB 영역 미정합 = 클라이언트 시드로 동작.
RUN_ALL.sql 1회 실행하면 즉시 정합.
```

### C. /admin/ai 호출수 0건
```
1. SELECT COUNT(*) FROM usage_logs WHERE action='recommend'
   → 0건 = 마이그레이션 v12 미적용 OR fetch 미발생
2. Vercel Functions Logs /api/recommend → [usage_logs] 메시지 확인
3. 라이브 case-a 흐름 직접 시도 = 인증 후 호출 발생 확인
```

## 7. 자동화 도구

```bash
# 4단계 정합 점검 (build·tsc·harness·check:v3)
npm run check:all

# Supabase 정합 점검 (테이블·컬럼·RLS)
# - 5/22 시점 미작성·다음 사이클 후보
```
