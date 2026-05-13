-- v9.16 (2026-05-12): 제작 완료 시 정보 취합 + 예외 패턴 학습
-- 사용자 요청: "제작 완료 = 가장 높은 신뢰도. 알랏 무시 완료도 취합."

-- 1) facility_exception_log에 venue_key 컬럼 추가 (검색 효율)
--    기존 venue(text) 컬럼이 행사장 이름이므로 venue_key alias로 사용 가능.
--    그러나 admin SELECT가 제한돼 있어 exception-monitor가 전체 집계를 못 하는 문제 수정.

-- Admin이 모든 예외 로그를 조회할 수 있도록 policy 추가
DROP POLICY IF EXISTS facility_exception_log_admin_select ON facility_exception_log;
CREATE POLICY facility_exception_log_admin_select ON facility_exception_log
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 기존 일반 사용자 select policy는 제거 (위 policy로 통합)
DROP POLICY IF EXISTS facility_exception_log_select ON facility_exception_log;

-- 2) design_items: finalized_at 인덱스 추가 (exception-monitor 쿼리 속도)
CREATE INDEX IF NOT EXISTS design_items_finalized_idx ON design_items (project_id, finalized_at)
  WHERE finalized_at IS NOT NULL;

-- 3) facility_exception_log: 집계용 인덱스
CREATE INDEX IF NOT EXISTS facility_exception_log_venue_rule_idx
  ON facility_exception_log (venue, rule);

-- PM 직접 실행 필요 (production Supabase Studio에서)
-- exception-monitor API (/api/admin/exception-monitor) 는 이 policy에 의존함.
