-- ============================================================
-- v4d — 프로젝트 삭제 후에도 통계 데이터 보존
--
-- 정책: 사용자 결정 2026-05-07
-- "새로운 데이터는 데이터 관리에 입력되며 프로젝트 삭제를 해도 데이터 수치는 남도록 하자"
--
-- 구조: project_archive 테이블에 삭제 직전 스냅샷 저장.
-- fetchLiveStats가 projects + project_archive 모두 읽음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_project_id uuid NOT NULL,
  name text NOT NULL,
  client_name text,
  event_venue text,
  event_date date,
  event_type text,
  event_category text,
  -- 집계 데이터 (denormalized — design_items 삭제 후에도 통계 가능)
  item_count integer NOT NULL DEFAULT 0,
  item_categories text[] NOT NULL DEFAULT '{}',  -- 동의어 정규화된 카테고리 목록
  -- 메타
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id),
  reason text  -- '사용자 삭제' / '자동 만료' 등
);

-- 인덱스 (자주 조회될 venue, client 기준)
CREATE INDEX IF NOT EXISTS idx_project_archive_venue ON public.project_archive(event_venue);
CREATE INDEX IF NOT EXISTS idx_project_archive_client ON public.project_archive(client_name);
CREATE INDEX IF NOT EXISTS idx_project_archive_event_date ON public.project_archive(event_date DESC);

-- RLS
ALTER TABLE public.project_archive ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 모든 사용자 (통계 페이지에서 읽기)
DROP POLICY IF EXISTS "project_archive: authenticated read" ON public.project_archive;
CREATE POLICY "project_archive: authenticated read" ON public.project_archive
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 인증된 사용자 (삭제 프로세스에서 호출)
DROP POLICY IF EXISTS "project_archive: authenticated insert" ON public.project_archive;
CREATE POLICY "project_archive: authenticated insert" ON public.project_archive
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 일반 사용자: UPDATE/DELETE 정책 없음 = 자동 차단 (통계 무결성)
-- 관리자: 오류값 정리 / 데이터 보정 가능

-- DELETE: 관리자만 (오류값 등 완전 삭제용)
DROP POLICY IF EXISTS "project_archive: admin delete" ON public.project_archive;
CREATE POLICY "project_archive: admin delete" ON public.project_archive
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: 관리자만 (데이터 보정용)
DROP POLICY IF EXISTS "project_archive: admin update" ON public.project_archive;
CREATE POLICY "project_archive: admin update" ON public.project_archive
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.project_archive IS '프로젝트 삭제 시 통계 보존용 스냅샷. v4d (2026-05-07) 추가. 일반 사용자 INSERT/SELECT만, 관리자 UPDATE/DELETE 가능.';
