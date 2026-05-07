-- ============================================================
-- ez_Signage v4 — PM 개념 삭제 + 행사 단계 + 수정 횟수
-- 실행: Supabase Studio → SQL Editor 에서 전체 RUN
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. project_members: owner-only → 모든 멤버가 초대/관리 가능
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_members: owner manage" ON project_members;
DROP POLICY IF EXISTS "project_members: member manage" ON project_members;

CREATE POLICY "project_members: member manage" ON project_members
  FOR ALL TO authenticated
  USING (
    is_project_owner(project_id)
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    is_project_owner(project_id)
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 2. projects.stage — 행사(프로젝트) 단계별 진행 상태
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'stage'
  ) THEN
    ALTER TABLE public.projects
      ADD COLUMN stage text NOT NULL DEFAULT '의뢰서작성'
      CHECK (stage IN ('의뢰서작성', '발주완료', '시안검수', '수정중', '확정', '납품완료'));
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. design_items.revision_count — 수정 횟수 카운터
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'design_items'
      AND column_name = 'revision_count'
  ) THEN
    ALTER TABLE public.design_items
      ADD COLUMN revision_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;
