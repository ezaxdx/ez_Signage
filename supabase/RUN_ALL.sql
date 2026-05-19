-- ══════════════════════════════════════════════════════════════
-- RUN_ALL.sql = 5/22 라이브 D-2 통합 마이그레이션 (v12·v13·v14·v15)
-- ══════════════════════════════════════════════════════════════
-- 실행 = Supabase Studio → SQL Editor → 전체 RUN (3~5초)
-- 모든 영역 IF NOT EXISTS·DROP POLICY IF EXISTS = 재실행 안전 (idempotent)
-- 후속 = seed_event_history.sql 별도 실행 (SEED 44건 INSERT)
-- ══════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────
-- v12. usage_logs (5/22 P4 = AI 호출수 0건 silent fail 정정)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_action_created
  ON public.usage_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs(user_id, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_logs_insert_own ON public.usage_logs;
CREATE POLICY usage_logs_insert_own ON public.usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

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

COMMENT ON TABLE public.usage_logs IS '사용량 추적 (AI 추천·엑셀·PPT 다운로드). admin/ai 호출수 집계 SOT.';


-- ──────────────────────────────────────────────────────────────
-- v13. event_history (5/22 = 행사 관리 SEED + 자동 누적)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text UNIQUE,
  project_name text NOT NULL,
  year int,
  venue text NOT NULL,
  category_tag text DEFAULT '일반',
  program_parts text[] DEFAULT '{}',
  signage_breakdown jsonb DEFAULT '[]',
  analyzed_item_count int,
  is_seed boolean DEFAULT false,
  source text DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  edit_history jsonb DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_event_history_venue ON public.event_history(venue);
CREATE INDEX IF NOT EXISTS idx_event_history_active ON public.event_history(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_history_code ON public.event_history(project_code) WHERE project_code IS NOT NULL;

ALTER TABLE public.event_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_history_select_all ON public.event_history;
CREATE POLICY event_history_select_all ON public.event_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS event_history_insert_authenticated ON public.event_history;
CREATE POLICY event_history_insert_authenticated ON public.event_history
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS event_history_update_authenticated ON public.event_history;
CREATE POLICY event_history_update_authenticated ON public.event_history
  FOR UPDATE TO authenticated USING (true);

COMMENT ON TABLE public.event_history IS '행사 관리 SOT — SEED + 사용자 편집·삭제·추가 + 신규 프로젝트 자동 누적.';


-- ──────────────────────────────────────────────────────────────
-- v14. signage_types 확장 (sample_image_url·layout·hidden)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.signage_types
  ADD COLUMN IF NOT EXISTS sample_image_url text,
  ADD COLUMN IF NOT EXISTS layout text DEFAULT '세로',
  ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_signage_types_hidden ON public.signage_types(hidden) WHERE hidden = false;

COMMENT ON COLUMN public.signage_types.sample_image_url IS '예시 이미지 URL (RightPanel grep).';
COMMENT ON COLUMN public.signage_types.layout IS '세로·가로·정사각.';
COMMENT ON COLUMN public.signage_types.hidden IS 'soft delete.';


-- ──────────────────────────────────────────────────────────────
-- v15. program_parts_overrides (시드 override + 신규)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.program_parts_overrides (
  code text PRIMARY KEY,
  name text,
  hint text,
  group_name text,
  hidden boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.program_parts_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS program_parts_overrides_select_all ON public.program_parts_overrides;
CREATE POLICY program_parts_overrides_select_all ON public.program_parts_overrides
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS program_parts_overrides_write ON public.program_parts_overrides;
CREATE POLICY program_parts_overrides_write ON public.program_parts_overrides
  FOR ALL TO authenticated USING (true);

COMMENT ON TABLE public.program_parts_overrides IS '프로그램 파트 = 시드 (PROGRAM_PARTS) override + 사용자 신규.';


-- ══════════════════════════════════════════════════════════════
-- 검증 쿼리 (실행 직후 확인)
-- ══════════════════════════════════════════════════════════════

-- 4 테이블·확장 컬럼 모두 생성 확인
SELECT
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_logs')) AS v12_usage_logs,
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_history')) AS v13_event_history,
  (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'signage_types' AND column_name = 'sample_image_url')) AS v14_signage_types_extended,
  (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'program_parts_overrides')) AS v15_program_parts;

-- RLS 정책 카운트 (정상 = usage_logs 2건·event_history 3건·program_parts_overrides 2건 = 총 7건)
SELECT tablename, COUNT(*) FROM pg_policies
WHERE tablename IN ('usage_logs', 'event_history', 'program_parts_overrides')
GROUP BY tablename ORDER BY tablename;


-- ══════════════════════════════════════════════════════════════
-- 후속 (별도 RUN)
-- ══════════════════════════════════════════════════════════════
-- 1. SEED 44건 INSERT = supabase/seed_event_history.sql 별도 실행
-- 2. 첫 라이브 호출 후 검증 = SELECT COUNT(*) FROM usage_logs WHERE action = 'recommend';
-- 3. 라이브 검증 = ez-signage2.vercel.app
