-- migration_v6_v4_1_fixed.sql
-- program_parts_legacy 없는 현재 DB 상태에 맞게 수정됨

-- 1. program_parts 컬럼 추가
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS program_parts text[] DEFAULT '{}';
COMMENT ON COLUMN public.projects.program_parts IS 'EZ 폴더링 가이드 40.04~40.20 코드 배열. 다중선택.';

-- 2. design_items.program_part 컬럼 추가
ALTER TABLE public.design_items ADD COLUMN IF NOT EXISTS program_part text;
CREATE INDEX IF NOT EXISTS design_items_program_part_idx ON public.design_items(program_part) WHERE program_part IS NOT NULL;

-- 3. venues 테이블
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  venue_type text CHECK (venue_type IN ('컨벤션센터','호텔','전시장','야외','공공시설','기타')),
  has_hall_split boolean DEFAULT false,
  main_entrance_note text,
  area_sqm integer,
  floor_plan_url text,
  specs_text text,
  specs_updated_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

-- 4. venue_halls 테이블
CREATE TABLE IF NOT EXISTS public.venue_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  hall_name text NOT NULL,
  floor text,
  capacity integer,
  floor_plan_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, hall_name)
);

-- 5. venue_requests 테이블
CREATE TABLE IF NOT EXISTS public.venue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  venue_type text,
  floor_plan_url text,
  hall_split_requested boolean DEFAULT false,
  notes text,
  requested_by uuid REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  approved_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS venue_requests_status_idx ON public.venue_requests(status);

-- 6. learning_jobs 테이블
CREATE TABLE IF NOT EXISTS public.learning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (job_type IN ('floor_plan_analyze','signage_pattern','venue_meta')),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  hall_id uuid REFERENCES public.venue_halls(id) ON DELETE CASCADE,
  source_url text,
  status text DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed','skipped')),
  result jsonb DEFAULT '{}',
  error_message text,
  triggered_by uuid REFERENCES auth.users(id),
  triggered_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS learning_jobs_status_idx ON public.learning_jobs(status);

-- 7. usage_logs 테이블
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('export_excel','export_pptx','recommend','venue_request')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_logs_user_idx ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_logs_action_idx ON public.usage_logs(action, created_at DESC);

-- 8. RLS 활성화
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS 정책
DROP POLICY IF EXISTS venues_select_all ON public.venues;
CREATE POLICY venues_select_all ON public.venues FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS venues_admin_write ON public.venues;
CREATE POLICY venues_admin_write ON public.venues FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS venue_halls_select_all ON public.venue_halls;
CREATE POLICY venue_halls_select_all ON public.venue_halls FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS venue_halls_admin_write ON public.venue_halls;
CREATE POLICY venue_halls_admin_write ON public.venue_halls FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS venue_requests_self_select ON public.venue_requests;
CREATE POLICY venue_requests_self_select ON public.venue_requests FOR SELECT TO authenticated USING (requested_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS venue_requests_self_insert ON public.venue_requests;
CREATE POLICY venue_requests_self_insert ON public.venue_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
DROP POLICY IF EXISTS venue_requests_admin_update ON public.venue_requests;
CREATE POLICY venue_requests_admin_update ON public.venue_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS learning_jobs_admin_all ON public.learning_jobs;
CREATE POLICY learning_jobs_admin_all ON public.learning_jobs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS usage_logs_self_select ON public.usage_logs;
CREATE POLICY usage_logs_self_select ON public.usage_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS usage_logs_self_insert ON public.usage_logs;
CREATE POLICY usage_logs_self_insert ON public.usage_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 10. 인덱스 보강
CREATE INDEX IF NOT EXISTS projects_event_venue_idx ON public.projects(event_venue) WHERE event_venue IS NOT NULL;
CREATE INDEX IF NOT EXISTS projects_program_parts_idx ON public.projects USING gin(program_parts);

SELECT 'migration complete' AS result;
