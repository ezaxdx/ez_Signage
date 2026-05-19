-- ══════════════════════════════════════════════════════════════
-- v12 usage_logs 정합 (5/22 사용자 진단·D-2 작성·실행 영역 사용자)
-- ══════════════════════════════════════════════════════════════
-- 적용 시점 = AI 호출수 0건 원인 = silent fail 제거 후 RLS 점검·정합.
-- 기존 migration_v6_v4_1.sql 영역 정의 있음·중복 회피 IF NOT EXISTS.
-- 실행 = Supabase Studio → SQL Editor → 전체 RUN.
-- ══════════════════════════════════════════════════════════════

-- 1. 테이블 정의 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. 인덱스 (호출수 집계 성능)
CREATE INDEX IF NOT EXISTS idx_usage_logs_action_created
  ON public.usage_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs(user_id, created_at DESC);

-- 3. RLS 활성
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- 4. INSERT 정책 = 로그인 사용자 본인 데이터만
DROP POLICY IF EXISTS usage_logs_insert_own ON public.usage_logs;
CREATE POLICY usage_logs_insert_own ON public.usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5. SELECT 정책 = 자기 데이터 + admin 전체 영역
DROP POLICY IF EXISTS usage_logs_select_own ON public.usage_logs;
CREATE POLICY usage_logs_select_own ON public.usage_logs
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. 코멘트
COMMENT ON TABLE public.usage_logs IS '사용량 추적 (AI 추천·엑셀·PPT 다운로드 액션). admin/ai 호출수 집계 SOT.';

-- ══════════════════════════════════════════════════════════════
-- 검증 쿼리 (실행 후 확인 영역)
-- ══════════════════════════════════════════════════════════════
-- SELECT COUNT(*) FROM public.usage_logs WHERE action = 'recommend';
-- SELECT action, COUNT(*) FROM public.usage_logs GROUP BY action;
-- SELECT * FROM public.usage_logs ORDER BY created_at DESC LIMIT 5;
