-- ═══════════════════════════════════════════════════════════════
-- v9.3 (2026-05-11) — 회의록 새 발주 양식 컬럼 9개
-- 기존 design_vendor·print_vendor는 DB 유지 (legacy), UI/Export에서 노출 제거
-- 신규 7개 컬럼 추가 (install_time·uninstall_time은 v8에 이미 존재)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE design_items
  -- 회의록 인쇄제작물 시트 양식 매핑 (총 13 신규 컬럼)
  ADD COLUMN IF NOT EXISTS space_type     text,   -- 공간 유형 (회의장/부대시설/전시장/안내시설)
  ADD COLUMN IF NOT EXISTS place_detail   text,   -- 세부 장소 (103+104, 208)
  ADD COLUMN IF NOT EXISTS place_contact  text,   -- 장소 담당자
  ADD COLUMN IF NOT EXISTS unit           text,   -- 단위 (개/세트/식)
  ADD COLUMN IF NOT EXISTS type_kind      text,   -- 유형 (임대/구매/출력+설치/디자인)
  ADD COLUMN IF NOT EXISTS supplier       text,   -- 수급업체
  ADD COLUMN IF NOT EXISTS install_date   text,   -- 설치일자
  ADD COLUMN IF NOT EXISTS usage_period   text,   -- 사용기간
  ADD COLUMN IF NOT EXISTS uninstall_date text,   -- 철거일자
  ADD COLUMN IF NOT EXISTS order_contact  text,   -- 발주 담당자
  ADD COLUMN IF NOT EXISTS order_date     text;   -- 발주일

-- v8 facility_exception_log 테이블 (시설 가이드 ′그래도 진행′ 학습 풀)
-- v8 migration에서 이미 만들어져 있을 수 있으므로 IF NOT EXISTS
CREATE TABLE IF NOT EXISTS facility_exception_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  item_id uuid REFERENCES design_items(id) ON DELETE CASCADE,
  venue text,
  field text,
  rule text,
  standard_value text,
  user_value text,
  message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facility_exception_log ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인이 생성한 예외 로그만 읽기·쓰기, 관리자는 전체
DROP POLICY IF EXISTS facility_exception_log_select ON facility_exception_log;
CREATE POLICY facility_exception_log_select ON facility_exception_log
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS(
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS facility_exception_log_insert ON facility_exception_log;
CREATE POLICY facility_exception_log_insert ON facility_exception_log
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- v9.6 회의록: 도면 분석 → ′텍스트 파일 형태′ 결과 저장
-- venues.specs_text — Gemini Vision 분석 결과. recommendSignage가 venueProfile로 통합해 AI에 주입.
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS specs_text       text,
  ADD COLUMN IF NOT EXISTS specs_updated_at timestamptz;
