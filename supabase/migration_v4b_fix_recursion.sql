-- ============================================================
-- v4b — project_members RLS 재귀 수정 (HOTFIX)
--
-- 문제: migration_v4_pm_removal.sql 의 정책에서
--   EXISTS (SELECT FROM project_members WHERE ...)
-- 가 project_members 정책 평가 중 다시 자기 자신을 호출 → 무한 재귀.
--
-- 해결: SECURITY DEFINER 헬퍼 함수로 RLS 우회.
--
-- 실행: Supabase Studio → SQL Editor 에서 전체 RUN
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. is_project_owner — owner_id 직접 체크 (재귀 없음)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND owner_id = auth.uid()
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 2. is_project_member — RLS 우회로 재귀 방지
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_email = (auth.jwt() ->> 'email')
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. 재귀 정책 교체 — 헬퍼 함수만 호출
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_members: owner manage" ON project_members;
DROP POLICY IF EXISTS "project_members: member manage" ON project_members;

CREATE POLICY "project_members: member manage" ON project_members
  FOR ALL TO authenticated
  USING (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  );

-- ──────────────────────────────────────────────────────────────
-- 4. 함수 권한 부여 (authenticated 사용자가 호출 가능)
-- ──────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
