-- ══════════════════════════════════════════════════════════════
-- v13 event_history (5/22 사용자 명시·D-2 작성·실행 영역 사용자)
-- ══════════════════════════════════════════════════════════════
-- 행사 관리 영역 = SEED + 사용자 편집·삭제·추가 + 신규 프로젝트 자동 누적 통합.
-- AI 영역 = event_history 전체 영역 grep → accumulatedContext 영역 주입.
-- 실행 = Supabase Studio → SQL Editor → 전체 RUN.
-- 후속 = seed_event_history.sql 실행 (SEED 44건 INSERT).
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.event_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text UNIQUE,           -- 행사 고유 코드 (편집 = 같은 코드 영역 덮어쓰기)
  project_name text NOT NULL,
  year int,
  venue text NOT NULL,
  category_tag text DEFAULT '일반',    -- 핵심·일반·미분류·해외
  program_parts text[] DEFAULT '{}',
  signage_breakdown jsonb DEFAULT '[]',
  analyzed_item_count int,
  is_seed boolean DEFAULT false,       -- SEED 영역·사용자 추가 영역 구분
  source text DEFAULT 'manual',         -- 'seed'·'manual'·'auto_project'
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,              -- soft-delete
  edit_history jsonb DEFAULT '[]'      -- 변경 이력 (롤백 영역)
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

COMMENT ON TABLE public.event_history IS '행사 관리 SOT — SEED + 사용자 편집·삭제·추가 + 신규 프로젝트 자동 누적. AI accumulatedContext 영역 grep.';

-- ══════════════════════════════════════════════════════════════
-- 검증 쿼리
-- ══════════════════════════════════════════════════════════════
-- SELECT COUNT(*) FROM public.event_history WHERE deleted_at IS NULL;
-- SELECT COUNT(*) FROM public.event_history WHERE is_seed = true;
-- SELECT venue, COUNT(*) FROM public.event_history WHERE deleted_at IS NULL GROUP BY venue ORDER BY count DESC LIMIT 10;
