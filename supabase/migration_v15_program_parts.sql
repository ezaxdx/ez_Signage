-- 5/22 사용자 명시 = 프로그램 파트 관리 영역 = DB 영역 정합
-- localStorage 영역 (mice_program_part_overrides·custom·hidden) → DB 영역

CREATE TABLE IF NOT EXISTS public.program_parts_overrides (
  code text PRIMARY KEY,             -- 40.04·40.05·... 또는 custom_xxx
  name text,
  hint text,
  group_name text,                    -- program·attendee·promotion
  hidden boolean DEFAULT false,
  is_custom boolean DEFAULT false,    -- false = 시드 영역 override·true = 신규 추가
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

COMMENT ON TABLE public.program_parts_overrides IS '프로그램 파트 영역 = 시드 영역 (PROGRAM_PARTS) override + 사용자 신규 영역. localStorage 영역 통합.';
