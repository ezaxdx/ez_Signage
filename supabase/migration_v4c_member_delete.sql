-- ============================================================
-- v4c — 모든 프로젝트 멤버가 프로젝트 삭제 가능 (정책 결정)
--
-- 정책: 사용자가 명시함 — "누구나 들어가서 설정 가능 → 삭제도 동일"
-- 기존: owner만 DELETE/UPDATE 가능 (schema.sql)
-- 신규: project_members에 등록된 멤버 + owner 모두 DELETE/UPDATE
--
-- 안전 장치:
-- 1. 프론트엔드 confirm() 다이얼로그에서 영구 손실 경고
-- 2. RLS는 인증된 멤버만 (외부 공개 X)
-- 3. SELECT 정책은 v3 이후 그대로 (멤버 + 인증 사용자)
-- ============================================================

-- 기존 owner-only 정책 제거
DROP POLICY IF EXISTS "projects: owner full access" ON projects;

-- 새 정책: SELECT는 인증된 모든 사용자 (아카이브 읽기 호환), 변경은 멤버만
DROP POLICY IF EXISTS "projects: member full access" ON projects;

-- INSERT: 인증된 사용자가 owner_id = auth.uid() 로만 만들 수 있음 (스팸 방지)
CREATE POLICY "projects: member insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- SELECT: 인증된 모든 사용자 (아카이브 페이지 호환)
DROP POLICY IF EXISTS "projects: authenticated archive read" ON projects;
CREATE POLICY "projects: authenticated read" ON projects
  FOR SELECT TO authenticated
  USING (true);

-- UPDATE: owner 또는 project_members 등록된 멤버
CREATE POLICY "projects: member update" ON projects
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_project_member(id)
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.is_project_member(id)
  );

-- DELETE: owner 또는 project_members 등록된 멤버
CREATE POLICY "projects: member delete" ON projects
  FOR DELETE TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_project_member(id)
  );
