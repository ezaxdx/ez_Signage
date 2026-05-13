-- migration_v8_17col_restore.sql
-- 2026-05-11: 1차안 17컬럼 헤더 복원 + 컬럼 가시성 정책
-- 추가 5개 컬럼 (편집 초기 숨김 4개 + 사용목적 분리)
--   1. content_text  : '내용' 자유 텍스트 (기존 purpose가 '사용목적'으로 환원되면서 분리)
--   2. design_vendor : 디자인업체
--   3. print_vendor  : 출력업체
--   4. install_time  : 설치시간
--   5. uninstall_time: 철거시간
-- + project_column_settings 신설 (프로젝트별 컬럼 가시성 토글)
-- + facility_check_mode (project) — verbose | silent_icon | off

BEGIN;

-- 1) design_items에 5개 컬럼 추가
ALTER TABLE design_items
  ADD COLUMN IF NOT EXISTS content_text   text,
  ADD COLUMN IF NOT EXISTS design_vendor  text,
  ADD COLUMN IF NOT EXISTS print_vendor   text,
  ADD COLUMN IF NOT EXISTS install_time   text,
  ADD COLUMN IF NOT EXISTS uninstall_time text;

COMMENT ON COLUMN design_items.content_text   IS '1차안 17컬럼 - 내용 (자유 텍스트)';
COMMENT ON COLUMN design_items.design_vendor  IS '1차안 17컬럼 - 디자인업체 (편집 초기 숨김)';
COMMENT ON COLUMN design_items.print_vendor   IS '1차안 17컬럼 - 출력업체 (편집 초기 숨김)';
COMMENT ON COLUMN design_items.install_time   IS '1차안 17컬럼 - 설치시간 (편집 초기 숨김)';
COMMENT ON COLUMN design_items.uninstall_time IS '1차안 17컬럼 - 철거시간 (편집 초기 숨김)';

-- 2) 프로젝트별 컬럼 가시성 설정
CREATE TABLE IF NOT EXISTS project_column_settings (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  show_in_editor   jsonb NOT NULL DEFAULT '{"design_vendor":false,"print_vendor":false,"install_time":false,"uninstall_time":false}'::jsonb,
  include_in_excel jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_in_ppt   jsonb NOT NULL DEFAULT '{"editor":false,"design_vendor":false,"print_vendor":false}'::jsonb,
  facility_check_mode text NOT NULL DEFAULT 'verbose' CHECK (facility_check_mode IN ('verbose','silent_icon','off')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE project_column_settings IS '프로젝트별 17컬럼 가시성/노출 설정 (§14 정책)';
COMMENT ON COLUMN project_column_settings.show_in_editor IS '편집 그리드 표시 여부 — 4컬럼 기본 false';
COMMENT ON COLUMN project_column_settings.include_in_excel IS '엑셀 출력 포함 — 빈 객체면 모두 true';
COMMENT ON COLUMN project_column_settings.include_in_ppt IS 'PPT 출력 포함 — 담당자·디자인업체·출력업체 기본 false';
COMMENT ON COLUMN project_column_settings.facility_check_mode IS '시설 가이드 알림 강도 (§11-6) verbose|silent_icon|off';

-- RLS
ALTER TABLE project_column_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pcs_select ON project_column_settings;
CREATE POLICY pcs_select ON project_column_settings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

DROP POLICY IF EXISTS pcs_insert ON project_column_settings;
CREATE POLICY pcs_insert ON project_column_settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

DROP POLICY IF EXISTS pcs_update ON project_column_settings;
CREATE POLICY pcs_update ON project_column_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

DROP POLICY IF EXISTS pcs_delete ON project_column_settings;
CREATE POLICY pcs_delete ON project_column_settings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- 3) 행사장별 시설 가이드 (§11-1 + §11-6) — venue_facility_guide
CREATE TABLE IF NOT EXISTS venue_facility_guide (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_key text NOT NULL,                -- 예: 'kintex_1_hall_5'
  venue_name text NOT NULL,               -- 예: '킨텍스 1전시장 5홀'

  -- 6종 정보 (§11-6-2)
  install_allowed   jsonb DEFAULT '[]'::jsonb,   -- 1. 설치 가능 품목 [{category, status: 'allowed'|'conditional'|'denied', note}]
  mount_methods     jsonb DEFAULT '{}'::jsonb,   -- 2. 설치·고정 방법 {taka: 'allowed', magnet: 'allowed', adhesive: 'denied', hanger: 'conditional', note}
  rigging           jsonb DEFAULT '{}'::jsonb,   -- 3. 리깅·하중 {grid_lines: ['D','E','F'], max_load_kg: 50, note}
  safety            jsonb DEFAULT '{}'::jsonb,   -- 4. 안전 기준 {fire, fall, electric, weather, note}
  warnings          jsonb DEFAULT '[]'::jsonb,   -- 5. 주의·금지조건 [{type, description}]
  digital_signage   jsonb DEFAULT '{}'::jsonb,   -- 6. 디지털 사이니지 {allowed_locations, led_size_limit, content_review}

  last_updated date DEFAULT current_date,        -- 학습 시점 (사용자 화면 표시)
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(venue_key)
);

COMMENT ON TABLE venue_facility_guide IS '행사장별 시설 가이드 6종 (§11-6-2)';

ALTER TABLE venue_facility_guide ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vfg_read ON venue_facility_guide;
CREATE POLICY vfg_read ON venue_facility_guide FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vfg_admin_write ON venue_facility_guide;
CREATE POLICY vfg_admin_write ON venue_facility_guide FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4) 시설 가이드 위반 사례 누적 (§11-6-1 '예외 케이스' 학습)
CREATE TABLE IF NOT EXISTS facility_exception_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  item_id uuid,
  venue_key text NOT NULL,
  violated_rule text NOT NULL,     -- 예: 'mount_methods.adhesive_denied'
  user_value text,                 -- 사용자가 입력한 값
  user_choice text NOT NULL CHECK (user_choice IN ('proceed','correct')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facility_exception_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fel_read ON facility_exception_log;
CREATE POLICY fel_read ON facility_exception_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS fel_insert ON facility_exception_log;
CREATE POLICY fel_insert ON facility_exception_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

-- 5) 입력 데이터 단계별 축적 (§11-2)
-- design_items에 컨펌 플래그 + 단계 명시
ALTER TABLE design_items
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

COMMENT ON COLUMN design_items.confirmed IS '§11-2 사용자 컨펌 플래그 (학습 가중치 70%)';
COMMENT ON COLUMN design_items.finalized_at IS '§11-2 발주·다운로드 완료 시점 (학습 가중치 100%)';

CREATE TABLE IF NOT EXISTS item_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES design_items(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamptz DEFAULT now()
);

COMMENT ON TABLE item_edit_log IS '§11-2 중간 수정 로그 (학습 가중치 30%, 패턴 추출용)';

ALTER TABLE item_edit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iel_read ON item_edit_log;
CREATE POLICY iel_read ON item_edit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM design_items di
    JOIN projects p ON p.id = di.project_id
    WHERE di.id = item_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

DROP POLICY IF EXISTS iel_insert ON item_edit_log;
CREATE POLICY iel_insert ON item_edit_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM design_items di
    JOIN projects p ON p.id = di.project_id
    WHERE di.id = item_id AND (p.owner_id = auth.uid() OR auth.email() = ANY(p.allowed_users)))
);

COMMIT;
