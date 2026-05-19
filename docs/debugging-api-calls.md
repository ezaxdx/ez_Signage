# API 호출수 0건 점검 가이드

> 5/22 사용자 진단·D-2 작성. AI 호출수 표시가 0건일 때 4단계 영역.

## 1단계: Vercel Functions Logs

1. https://vercel.com → ez-signage2 → Functions 탭
2. `/api/recommend` POST 항목 클릭
3. 최근 로그 영역 점검:
   - `[usage_logs] ✓ recommend INSERT` = 호출+INSERT 정상
   - `[usage_logs] INSERT failed: ...` = RLS 또는 스키마 영역
   - `[usage_logs] Exception: ...` = 코드 영역
   - 로그 자체 없음 = 클라이언트 호출 안 함 (= 새 프로젝트만 만들고 AI 추천 영역 진입 X)

## 2단계: Supabase Studio SQL Editor

```sql
-- 테이블 존재 확인
SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT 5;
```

- `relation "usage_logs" does not exist` = **테이블 부재** → `supabase/migration_v12_usage_logs.sql` 실행
- 빈 결과 = **INSERT 실패** → RLS 영역 (3단계)
- 데이터 있음 = INSERT 정상 → SELECT 영역 (4단계)

## 3단계: RLS 정책 점검

```sql
-- 정책 목록
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'usage_logs';
```

필수 정책 2건:
- `usage_logs_insert_own` (INSERT) = `auth.uid() = user_id OR user_id IS NULL`
- `usage_logs_select_own` (SELECT) = `auth.uid() = user_id OR admin`

없으면 = `migration_v12_usage_logs.sql` 실행.

## 4단계: action 필드·SELECT 정합

```sql
SELECT action, COUNT(*) FROM usage_logs GROUP BY action;
```

- 'recommend' 0건 = INSERT 흐름 영역 (1단계 로그 재확인)
- 'recommend' N건이지만 admin/ai 0건 = 캐시·dynamic 영역 (페이지 새로고침 Ctrl+Shift+R)

## 검증 절차

1. 라이브 새 프로젝트 → AI 추천 받기 클릭
2. F12 Network → `/api/recommend` POST 200 응답
3. Vercel Functions Logs = `[usage_logs] ✓ recommend INSERT`
4. Supabase Studio = `SELECT COUNT(*) FROM usage_logs WHERE action='recommend'` +1
5. 관리자 AI 관리 = 호출수 +1 (1-2분 후)

## 호출 흐름 정리

```
사용자 클릭 (AI 추천 받기 or 새 프로젝트 만들기)
  ↓
fetch('/api/recommend', body)
  ↓
recommendSignage() → Gemini 2.5 Flash API 호출
  ↓
supabase.from('usage_logs').insert({user_id, action:'recommend', metadata})
  ↓ (RLS 통과 시)
usage_logs row 1건 추가
  ↓
admin/ai/page.tsx 진입 시 = SELECT COUNT(*) = 호출수 표시
```
